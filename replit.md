# GrandviewOS

An AI-powered OS dashboard built with React, Vite, TypeScript, and TailwindCSS v4.

## Architecture

- **Frontend**: React 19 + TypeScript + TailwindCSS v4 + Framer Motion
- **Build Tool**: Vite 7 with `@vitejs/plugin-react`
- **Routing**: React Router DOM v7
- **Backend API**: Custom Vite plugin (`src/server/api.ts`) that adds server middleware during dev
- **Auth**: API key-based auth via `X-Muddy-Key` header or query param

## Project Structure

```
src/
  App.tsx              - Main app with router and auth
  main.tsx             - Entry point
  index.css            - Global styles
  api/client.ts        - API client (sets auth headers)
  components/          - Shared UI components
  pages/               - Route-level page components
  data/                - Mock data for fallback
  server/api.ts        - Vite plugin providing API endpoints
  types/api.ts         - TypeScript types for API

public/                - Static assets
data/cost-logs/        - Cost log JSON files
```

## Key Features

- Task Manager
- Org Chart viewer
- Documentation viewer (generated docs)
- Daily Standup system (with TTS via edge-tts if available)
- Model Fleet Grid (AI agent overview)
- Workspaces viewer
- Cost Breakdown / Operator Chat

## Configuration

- Dev server runs on port 5000 (0.0.0.0)
- API key auto-generated on first run, stored at `~/.grandviewos/config.json`
- Optionally set `MUDDY_API_KEY` env var
- Reads OpenClaw sessions from `~/.openclaw/agents/main/sessions/`

## Running

```bash
npm run dev    # Start dev server on port 5000
npm run build  # Production build to dist/
```

## Deployment

Configured as a static site deployment:
- Build: `npm run build`
- Public dir: `dist`
