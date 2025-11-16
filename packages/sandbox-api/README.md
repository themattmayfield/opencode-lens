# OpenCode Sandbox API

HTTP API for creating isolated E2B sandboxes to run OpenCode server instances for any GitHub repository.

## Architecture

```
User Browser → Sandbox API → E2B Cloud
                               ↓
                          OpenCode VM
                               ├─ Clone GitHub repo
                               ├─ Install dependencies
                               └─ Start OpenCode server
                               ↓
User Browser ← WebSocket ← Public URL (e2b.app)
```

## Environment Variables

See `.env.example` for all configuration options.

**Required:**
- `E2B_API_KEY` - Your E2B API key
- `E2B_TEMPLATE_ID` - The E2B template ID with OpenCode installed

**Optional:**
- `PORT` - API server port (default: 3001)
- `NODE_ENV` - Environment (development/production)
- `REDIS_URL` - Redis connection for production (uses in-memory if not set)
- `SANDBOX_TIMEOUT_MS` - Sandbox lifetime (default: 30 minutes)
- `MAX_SANDBOXES_PER_IP` - Rate limit per IP (default: 10)

## Setup

### 1. Install Dependencies

```bash
cd packages/sandbox-api
bun install
```

### 2. Get E2B API Key

1. Sign up at https://e2b.dev
2. Get your API key from the dashboard
3. Copy it for the next step

### 3. Configure Environment

```bash
cp .env.example .env
# Edit .env and add your E2B API key:
# E2B_API_KEY=your_api_key_here
# E2B_TEMPLATE_ID=0b5m4ijc6tsskrud8dvh
```

### 4. Build E2B Template (Optional)

The current template ID (`0b5m4ijc6tsskrud8dvh`) is already built and ready to use. Only rebuild if you need to update the template:

```bash
# Install E2B CLI
npm install -g @e2b/cli

# Login to E2B
e2b auth login

# Build the template
bun run build-template

# The script will output a template ID - update E2B_TEMPLATE_ID in .env
```

**Template build time:** ~3-5 minutes

### 5. Start Development Server

```bash
bun run dev
```

The API will be available at http://localhost:3001

## E2B Template

The template is defined in `e2b.Dockerfile` and installs:
- Ubuntu 22.04
- Bun runtime
- OpenCode CLI (`opencode-ai` package)
- Git and development tools

### Current Template

- **Name:** `opencode-final`
- **ID:** `0b5m4ijc6tsskrud8dvh`
- **OpenCode Version:** Latest from npm
- **Status:** ✅ Production ready

### Building the Template

```bash
# Build a new template
bun run build-template

# This will:
# 1. Upload the Dockerfile to E2B
# 2. Build the VM image in E2B cloud
# 3. Output a template ID (e.g., "0b5m4ijc6tsskrud8dvh")
# 4. Update E2B_TEMPLATE_ID in your .env
```

## API Endpoints

### `POST /api/sandbox`

Create a new sandbox for a GitHub repository.

**Request:**
```json
{
  "owner": "facebook",
  "repo": "react",
  "branch": "main"  // optional, defaults to "main"
}
```

**Response:**
```json
{
  "sandbox": {
    "id": "sb_abc123",
    "owner": "facebook",
    "repo": "react",
    "branch": "main",
    "status": "ready",
    "createdAt": 1700000000000,
    "expiresAt": 1700001800000,
    "serverUrl": "https://4096-xyz.e2b.app",
    "wsUrl": "wss://4096-xyz.e2b.app"
  }
}
```

**Errors:**
- `400` - Invalid owner/repo name
- `429` - Rate limit exceeded
- `500` - Sandbox creation failed

### `GET /api/sandbox/:id`

Get sandbox status.

**Response:**
```json
{
  "sandbox": {
    "id": "sb_abc123",
    "owner": "facebook",
    "repo": "react",
    "status": "ready",
    "createdAt": 1700000000000,
    "expiresAt": 1700001800000,
    "serverUrl": "https://4096-xyz.e2b.app"
  }
}
```

### `POST /api/sandbox/:id/extend`

Extend sandbox lifetime.

**Request:**
```json
{
  "ttlMs": 1800000  // 30 minutes (max: 1 hour)
}
```

**Response:**
```json
{
  "sandbox": {
    "id": "sb_abc123",
    "expiresAt": 1700003600000  // new expiration time
  }
}
```

### `DELETE /api/sandbox/:id`

Destroy a sandbox.

**Response:**
```json
{
  "success": true
}
```

### `GET /api/sandbox`

List all active sandboxes (admin only in production).

**Response:**
```json
{
  "sandboxes": [
    {
      "id": "sb_abc123",
      "owner": "facebook",
      "repo": "react",
      "status": "ready"
    }
  ]
}
```

## Development

```bash
# Install dependencies
bun install

# Start API server
bun run dev

# The API will be available at http://localhost:3001
```

## Production Deployment

**Recommended hosting:**
- Deploy to Fly.io, Railway, or any Node.js hosting
- Use Redis for session storage
- Set up monitoring for sandbox creation/destruction
- Configure rate limiting per IP
- Set resource limits (max sandboxes, timeout, etc.)

### Environment Variables for Production

```bash
E2B_API_KEY=your_production_key
E2B_TEMPLATE_ID=0b5m4ijc6tsskrud8dvh
REDIS_URL=redis://your-redis-instance:6379
PORT=3001
NODE_ENV=production
SANDBOX_TIMEOUT_MS=1800000
MAX_SANDBOXES_PER_IP=10
```

## Troubleshooting

### Sandbox creation hangs

**Symptoms:** Request to `/api/sandbox` never completes

**Causes:**
- E2B API key invalid or expired
- Template ID doesn't exist
- E2B service outage

**Fix:**
1. Check E2B dashboard: https://e2b.dev/dashboard
2. Verify API key is valid
3. Rebuild template if needed

### "Command not found" errors in sandbox

**Symptoms:** OpenCode server fails to start with exit code 127

**Causes:**
- OpenCode not installed in template
- Wrong path to `opencode` binary

**Fix:**
1. Rebuild E2B template with latest Dockerfile
2. Verify OpenCode installation in template:
   ```bash
   # In e2b.Dockerfile
   RUN bun install -g opencode-ai
   ```

### 404 errors for session endpoints

**Symptoms:** Console shows 404 for `/session/:id/diff`

**Causes:**
- Session endpoints not yet created
- Normal behavior for new sessions

**Fix:**
- This is handled gracefully in the frontend (see sync.tsx)
- Not an actual error, just missing data initially

## Known Limitations

1. **Empty Summaries:** E2B sandboxes currently create empty `summary` objects (missing `title` and `body` fields). The UI handles this by displaying assistant text content directly.

2. **Public Repos Only:** Private repositories require GitHub authentication (not implemented yet).

3. **Rate Limiting:** Default 10 sandboxes per IP per hour to prevent abuse.

4. **Cost:** Each sandbox costs ~$0.01-0.05 in E2B credits (varies by usage time).

## Future Enhancements

- [ ] Support for private repositories via GitHub OAuth
- [ ] Persistent sandboxes (save state between sessions)
- [ ] Custom Dockerfile per repository (detect from repo)
- [ ] Real-time sandbox logs streaming
- [ ] Sandbox resource monitoring (CPU, memory)
- [ ] Automatic cleanup of idle sandboxes

## License

MIT
