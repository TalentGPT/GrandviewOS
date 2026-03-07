import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET || 'grandviewos-dev-secret'

export interface JwtPayload {
  userId: string
  tenantId: string
  email: string
  role: string
}

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload
      tenantId?: string
    }
  }
}

export function signToken(payload: JwtPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' })
}

export function authMiddleware(req: Request, res: Response, next: NextFunction): void {
  // Skip auth for auth routes
  if (req.path.startsWith('/api/auth/') && req.path !== '/api/auth/me') {
    next()
    return
  }

  // Support both JWT Bearer and legacy X-Muddy-Key
  const authHeader = req.headers.authorization
  const muddyKey = req.headers['x-muddy-key'] as string | undefined
  const queryKey = req.query.key as string | undefined

  let token = ''
  if (authHeader?.startsWith('Bearer ')) {
    token = authHeader.slice(7)
  } else if (muddyKey) {
    token = muddyKey
  } else if (queryKey) {
    token = queryKey
  }

  if (!token) {
    res.status(401).json({ error: 'No authentication token provided' })
    return
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload
    req.user = decoded
    req.tenantId = decoded.tenantId
    next()
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' })
  }
}
