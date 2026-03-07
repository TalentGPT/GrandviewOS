interface CachedData<T> {
  data: T
  timestamp: number
}

export class OpenClawConnector {
  private url: string
  private token: string
  private cache = new Map<string, CachedData<any>>()
  private cacheTTL = 10000 // 10 seconds

  constructor(url: string, token: string) {
    this.url = url.replace(/\/$/, '')
    this.token = token
  }

  private getCached<T>(key: string): T | null {
    const cached = this.cache.get(key)
    if (cached && Date.now() - cached.timestamp < this.cacheTTL) return cached.data
    return null
  }

  private setCache(key: string, data: any): void {
    this.cache.set(key, { data, timestamp: Date.now() })
  }

  async fetch<T>(path: string): Promise<T | null> {
    if (!this.url) return null
    const cached = this.getCached<T>(path)
    if (cached) return cached

    try {
      const res = await fetch(`${this.url}${path}`, {
        headers: {
          'Authorization': `Bearer ${this.token}`,
          'X-Bridge-Token': this.token,
        },
        signal: AbortSignal.timeout(10000),
      })
      if (!res.ok) return null
      const data = await res.json() as T
      this.setCache(path, data)
      return data
    } catch {
      return null
    }
  }

  async post<T>(path: string, body: any): Promise<T | null> {
    if (!this.url) return null
    try {
      const res = await fetch(`${this.url}${path}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.token}`,
          'X-Bridge-Token': this.token,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(30000),
      })
      if (!res.ok) return null
      return await res.json() as T
    } catch {
      return null
    }
  }

  async getHealth(): Promise<any> {
    return this.fetch('/api/system/health') ?? { gatewayRunning: false }
  }

  async getSessions(): Promise<any[]> {
    const result = await this.fetch<{ sessions: any[] }>('/api/sessions')
    return result?.sessions || []
  }

  async getTranscript(id: string): Promise<any> {
    return this.fetch(`/api/sessions/${encodeURIComponent(id)}/transcript`)
  }

  async killSession(id: string): Promise<any> {
    if (!this.url) return { ok: false }
    try {
      const res = await fetch(`${this.url}/api/sessions/${encodeURIComponent(id)}/kill`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${this.token}`, 'X-Bridge-Token': this.token },
        signal: AbortSignal.timeout(10000),
      })
      return await res.json()
    } catch {
      return { ok: false }
    }
  }

  async getCronJobs(): Promise<any[]> {
    return (await this.fetch<any[]>('/api/cron-jobs')) || []
  }

  async getAgents(): Promise<any[]> {
    return (await this.fetch<any[]>('/api/agents')) || []
  }
}
