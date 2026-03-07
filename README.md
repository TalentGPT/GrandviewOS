# GrandviewOS v2.0

AI-powered operating system for managing agent teams. Now with PostgreSQL + Express + Prisma backend.

## Stack

- **Frontend:** React 19 + TypeScript + Tailwind CSS 4 + Vite
- **Backend:** Express.js + TypeScript
- **Database:** PostgreSQL via Prisma ORM
- **Auth:** JWT + bcrypt (multi-tenant)
- **Remote:** OpenClaw API connector

## Quick Start

### 1. Install dependencies
```bash
npm install
```

### 2. Set up PostgreSQL
Create a `.env` file (see `.env.example`):
```
DATABASE_URL=postgresql://user:pass@localhost:5432/grandviewos
JWT_SECRET=your-secret-key
ENCRYPTION_KEY=0000000000000000000000000000000000000000000000000000000000000000
PORT=3000
```

### 3. Push schema & seed
```bash
npx prisma db push
npm run db:seed
```

### 4. Run
```bash
# Backend (serves API + static frontend)
npm run dev

# Frontend dev server (optional, for HMR)
npm run dev:frontend
```

### 5. Login
- **Email:** admin@grandview.com
- **Password:** admin123

## Architecture

```
server/
  index.ts           # Express entry point
  db.ts              # Prisma client
  seed.ts            # Database seeder
  middleware/
    auth.ts          # JWT auth middleware
  routes/
    auth.ts          # Login/Register
    agents.ts        # Agent CRUD
    sessions.ts      # Session management
    standups.ts      # Voice standups
    integrations.ts  # Integration management
    secrets.ts       # Encrypted secrets vault
    mcp.ts           # MCP server management
    llm.ts           # LLM provider config
    permissions.ts   # Agent permissions
    system.ts        # Health, config, cost, briefs, projects, ideas, reviews, docs
    workspace.ts     # Agent file read/write
    openclaw.ts      # Remote OpenClaw connector routes
  services/
    openclaw-connector.ts  # HTTP client for remote OpenClaw
prisma/
  schema.prisma      # Database schema
src/                 # React frontend
```

## Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start Express server (watches for changes) |
| `npm run dev:frontend` | Start Vite dev server with HMR |
| `npm run build` | Build frontend for production |
| `npm start` | Start production server |
| `npm run db:push` | Push Prisma schema to database |
| `npm run db:seed` | Seed database with sample data |
| `npm run db:studio` | Open Prisma Studio |
