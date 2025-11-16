# Project Structure: Sandbox Service

## Overview

This project now includes a complete sandbox service for chatting with GitHub repositories.

## Directory Structure

```
opencode-git/
│
├── packages/
│   └── sandbox-api/              # Backend API for sandbox management
│       ├── src/
│       │   ├── index.ts          # Main server (Hono app)
│       │   ├── types.ts          # TypeScript interfaces
│       │   ├── config.ts         # Environment configuration
│       │   ├── routes/
│       │   │   └── sandbox.ts    # API endpoints
│       │   └── sandbox/
│       │       ├── provider.ts   # Abstract provider interface
│       │       ├── e2b.ts        # E2B implementation
│       │       └── manager.ts    # Singleton manager
│       ├── package.json
│       ├── tsconfig.json
│       ├── .env.example
│       ├── .gitignore
│       └── README.md
│
├── src/                          # Frontend application
│   ├── context/
│   │   ├── sandbox.tsx           # ⭐ NEW: Sandbox state management
│   │   ├── sdk.tsx               # ✏️ UPDATED: Dynamic URL support
│   │   ├── sync.tsx
│   │   └── local.tsx
│   │
│   ├── pages/
│   │   ├── sandbox-layout.tsx    # ⭐ NEW: Sandbox route layout
│   │   ├── sandbox-session.tsx   # ⭐ NEW: Session page for sandboxes
│   │   ├── session-layout.tsx
│   │   └── session.tsx
│   │
│   ├── components/
│   │   ├── sandbox-loader.tsx    # ⭐ NEW: Loading/error states
│   │   ├── prompt-input.tsx
│   │   └── ...
│   │
│   └── index.tsx                 # ✏️ UPDATED: Added /:owner/:repo routing
│
├── scripts/
│   └── sandbox-init.sh           # ⭐ NEW: Sandbox initialization script
│
├── Dockerfile.sandbox            # ⭐ NEW: Docker image for sandboxes
├── .env.example                  # ✏️ UPDATED: Sandbox API URL
│
└── Documentation/
    ├── SANDBOX.md                # ⭐ NEW: Complete sandbox guide
    ├── QUICKSTART_SANDBOX.md     # ⭐ NEW: 5-minute setup guide
    ├── IMPLEMENTATION_SUMMARY.md # ⭐ NEW: What was built
    └── PROJECT_STRUCTURE.md      # ⭐ NEW: This file
```

## Key Components

### Backend (Sandbox API)

| File | Purpose |
|------|---------|
| `src/index.ts` | Hono server with CORS, logging, error handling |
| `src/routes/sandbox.ts` | REST endpoints: create, get, extend, destroy |
| `src/sandbox/provider.ts` | Abstract interface for sandbox providers |
| `src/sandbox/e2b.ts` | E2B implementation (creates VMs, clones repos) |
| `src/sandbox/manager.ts` | Singleton to manage provider instances |
| `src/types.ts` | TypeScript interfaces for API contracts |
| `src/config.ts` | Environment variable validation |

### Frontend Integration

| File | Purpose |
|------|---------|
| `context/sandbox.tsx` | React context for sandbox state (creating, ready, error) |
| `pages/sandbox-layout.tsx` | Layout wrapper for /:owner/:repo routes |
| `pages/sandbox-session.tsx` | Re-exports main session component |
| `components/sandbox-loader.tsx` | Loading spinner and error UI |
| `index.tsx` | Router configuration for sandbox routes |

### DevOps

| File | Purpose |
|------|---------|
| `Dockerfile.sandbox` | Container image for E2B sandboxes |
| `scripts/sandbox-init.sh` | Bash script to clone repo and start server |
| `.env.example` | Environment variable templates |

## Data Flow

```
1. User visits /:owner/:repo
   ↓
2. SandboxProvider creates sandbox
   ↓
3. POST /api/sandbox {owner, repo}
   ↓
4. Sandbox API → E2B SDK
   ↓
5. E2B creates VM
   ↓
6. VM runs sandbox-init.sh
   ↓
7. Git clone + npm install
   ↓
8. OpenCode server starts
   ↓
9. API returns {serverUrl, wsUrl}
   ↓
10. SDKProvider connects to serverUrl
    ↓
11. User chats with repository
```

## API Contracts

### Create Sandbox
```typescript
POST /api/sandbox
Body: { owner: string, repo: string, branch?: string }
Response: { sandbox: SandboxInfo }
```

### SandboxInfo
```typescript
{
  id: string
  owner: string
  repo: string
  branch: string
  status: "initializing" | "ready" | "error" | "terminated"
  createdAt: number
  expiresAt: number
  serverUrl: string  // HTTP endpoint for OpenCode API
  wsUrl: string      // WebSocket endpoint for events
  error?: string
}
```

## State Management

### Sandbox Context State
```typescript
{
  status: "initializing" | "ready" | "error"
  sandbox?: SandboxInfo
  error?: string
}
```

**Lifecycle:**
1. `initializing` - Creating E2B sandbox, cloning repo
2. `ready` - OpenCode server running, can connect
3. `error` - Something failed (repo not found, timeout, etc.)

**Auto-extend:** 5 minutes before expiration, automatically extends TTL

**Cleanup:** On unmount, destroys sandbox to free resources

## Routing

| Route | Component | Description |
|-------|-----------|-------------|
| `/` | SessionLayout → Session | Local OpenCode session |
| `/session/:id?` | SessionLayout → Session | Local session with ID |
| `/:owner/:repo` | SandboxLayout → SandboxSession | GitHub repo sandbox |
| `/:owner/:repo/:branch` | SandboxLayout → SandboxSession | Specific branch |

## Environment Variables

### Frontend (.env)
```bash
VITE_OPENCODE_SERVER_HOST=127.0.0.1      # Local OpenCode server
VITE_OPENCODE_SERVER_PORT=4096           # Local server port
VITE_SANDBOX_API_URL=http://localhost:3001  # Sandbox API endpoint
```

### Backend (packages/sandbox-api/.env)
```bash
E2B_API_KEY=your_key_here                # E2B API key (required)
REDIS_URL=redis://localhost:6379         # Redis for sessions (optional)
PORT=3001                                # API server port
NODE_ENV=development                     # Environment
SANDBOX_TIMEOUT_MS=1800000               # 30 minutes
MAX_SANDBOXES_PER_IP=10                  # Rate limit
```

## Security Features

- ✅ Rate limiting: 10 requests/hour per IP
- ✅ Input validation: GitHub repo name format
- ✅ Isolated environments: E2B sandboxes
- ✅ TTL enforcement: Max 1 hour sessions
- ✅ Auto-cleanup: Destroy on expiration
- ✅ CORS configuration: Allowed origins only

## File Count

| Category | Count |
|----------|-------|
| Backend API | 7 files |
| Frontend | 4 files |
| DevOps | 3 files |
| Documentation | 5 files |
| **Total** | **19 files** |

## Dependencies Added

### Backend
```json
{
  "hono": "^4.6.14",
  "@hono/node-server": "^1.13.7",
  "@e2b/code-interpreter": "^1.0.5",
  "ioredis": "^5.4.2"
}
```

### Frontend
No new dependencies (uses existing SolidJS ecosystem)

## Next Actions

To make this production-ready:

1. **Install Dependencies**
   ```bash
   cd packages/sandbox-api && bun install
   ```

2. **Get E2B Key**
   - Sign up at https://e2b.dev
   - Create API key
   - Add to `.env`

3. **Test Locally**
   ```bash
   # Terminal 1: Start API
   cd packages/sandbox-api && bun run dev
   
   # Terminal 2: Start frontend
   bun run dev
   
   # Browser: Visit http://localhost:3000/colinhacks/zod
   ```

4. **Create E2B Template**
   - Build custom template with OpenCode pre-installed
   - Reduces boot time from 60s to ~10s

5. **Deploy**
   - API: Fly.io or Railway
   - Frontend: Vercel or Netlify

## Performance Targets

- Sandbox creation: < 60s (< 10s with template)
- API latency: < 200ms
- WebSocket: < 100ms
- Uptime: 99.9%

## Cost Projection

**10,000 sessions/month** at 30min average:
- E2B sandboxes: ~$500/month
- API hosting: ~$50/month
- Frontend: $0 (free tier)
- **Total: ~$550/month**

---

**Status:** ✅ Implementation complete, ready for testing
