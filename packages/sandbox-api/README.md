# OpenCode Sandbox API

Backend service for managing ephemeral sandboxes that run OpenCode with GitHub repositories.

## Setup

1. Install dependencies:
```bash
cd packages/sandbox-api
bun install
```

2. Configure environment:
```bash
cp .env.example .env
# Edit .env and add your E2B_API_KEY
```

3. Run development server:
```bash
bun run dev
```

## API Endpoints

### `POST /api/sandbox`
Create a new sandbox with a GitHub repository.

**Request:**
```json
{
  "owner": "colinhacks",
  "repo": "zod",
  "branch": "main"  // optional
}
```

**Response:**
```json
{
  "sandbox": {
    "id": "sb_1234567890_abc123",
    "owner": "colinhacks",
    "repo": "zod",
    "branch": "main",
    "status": "ready",
    "createdAt": 1234567890000,
    "expiresAt": 1234569690000,
    "serverUrl": "https://sb-1234.e2b.dev",
    "wsUrl": "wss://sb-1234.e2b.dev"
  }
}
```

### `GET /api/sandbox/:id`
Get sandbox status.

### `POST /api/sandbox/:id/extend`
Extend sandbox lifetime.

**Request:**
```json
{
  "ttlMs": 1800000  // optional, defaults to 30 minutes
}
```

### `DELETE /api/sandbox/:id`
Destroy a sandbox.

## Deployment

The sandbox API can be deployed to:
- Fly.io: `fly launch` and `fly deploy`
- Railway: Connect GitHub repo
- Vercel/Netlify: As serverless functions

## Architecture

- **Hono**: Lightweight web framework
- **E2B**: Sandbox provider (can be swapped with others)
- **Redis**: Session/rate limiting storage (optional)
