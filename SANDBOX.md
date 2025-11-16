# OpenCode Sandbox Service

This document describes the sandbox service that allows users to chat with any GitHub repository through OpenCode.

## Architecture

```
User Browser
    ↓
Frontend (SolidJS App)
    ↓ (REST API)
Sandbox API (Hono + Bun)
    ↓ (E2B SDK)
E2B Sandboxes (Isolated VMs)
    ├── Git Clone Repo
    ├── Install Dependencies
    └── OpenCode Server
```

## Quick Start

### 1. Set up Sandbox API

```bash
# Navigate to sandbox API
cd packages/sandbox-api

# Install dependencies
bun install

# Configure environment
cp .env.example .env
# Edit .env and add your E2B_API_KEY from https://e2b.dev

# Run development server
bun run dev
```

The API will be available at `http://localhost:3001`

### 2. Configure Frontend

```bash
# In the root directory
cp .env.example .env

# Edit .env and set:
VITE_SANDBOX_API_URL=http://localhost:3001
```

### 3. Run the App

```bash
# Start the frontend
bun run dev
```

Visit `http://localhost:3000/colinhacks/zod` to chat with the Zod repository!

## How It Works

### User Flow

1. User visits `https://opencode.ai/colinhacks/zod`
2. Frontend extracts `owner` and `repo` from URL
3. Frontend calls Sandbox API to create a new sandbox
4. Sandbox API:
   - Creates an E2B sandbox (isolated VM)
   - Clones the GitHub repository
   - Installs dependencies
   - Starts OpenCode server
   - Returns connection URL
5. Frontend connects to OpenCode server in sandbox
6. User chats with the repository

### Sandbox Lifecycle

- **Creation**: 30-60 seconds (includes git clone + npm install)
- **Active Time**: 30 minutes (auto-extends if user is active)
- **Maximum Lifetime**: 1 hour
- **Auto-Cleanup**: Sandboxes are destroyed after expiration

## API Reference

See `packages/sandbox-api/README.md` for complete API documentation.

## Deployment

### Prerequisites

1. **E2B Account**: Sign up at https://e2b.dev
2. **E2B Template**: Create a custom template with OpenCode pre-installed
3. **Hosting**: Fly.io, Railway, or any Node.js host

### Deploy Sandbox API

#### Option 1: Fly.io

```bash
cd packages/sandbox-api

# Install flyctl
curl -L https://fly.io/install.sh | sh

# Launch app
fly launch

# Set secrets
fly secrets set E2B_API_KEY=your_key_here

# Deploy
fly deploy
```

#### Option 2: Railway

1. Connect GitHub repository
2. Select `packages/sandbox-api` as root directory
3. Add environment variable: `E2B_API_KEY`
4. Deploy

### Deploy Frontend

```bash
# Build the app
bun run build

# Deploy to Vercel
vercel deploy --prod

# Or Netlify
netlify deploy --prod --dir=dist
```

Set environment variable:
```
VITE_SANDBOX_API_URL=https://your-sandbox-api.fly.dev
```

## E2B Template Setup

To optimize sandbox boot times, create a custom E2B template with OpenCode pre-installed:

1. Create `e2b.Dockerfile`:

```dockerfile
FROM e2b/code-interpreter:latest

# Install OpenCode
RUN npm install -g @opencode-ai/cli

# Pre-warm common dependencies
RUN mkdir /tmp/warmup && cd /tmp/warmup && \
    npm init -y && \
    npm install react typescript && \
    rm -rf /tmp/warmup
```

2. Build and push template:

```bash
e2b template build --name opencode-sandbox
```

3. Update `packages/sandbox-api/src/sandbox/e2b.ts`:

```typescript
const sandbox = await Sandbox.create({
  template: "opencode-sandbox", // Your template name
  // ...
})
```

## Cost Estimation

### E2B Pricing (as of 2024)

- **Free Tier**: 100 hours/month
- **Paid**: ~$0.10/hour per sandbox

### Example Costs

**10,000 sessions/month** (30min avg):
- Sandbox hours: 5,000 hours
- E2B cost: ~$500/month
- Sandbox API hosting: ~$50/month
- **Total: ~$550/month**

**Optimization strategies**:
- Cache popular repos in pre-warmed snapshots
- Implement usage limits per IP
- Offer paid tiers for extended sessions

## Security

### Current Safeguards

- ✅ Rate limiting: 10 sandboxes per IP per hour
- ✅ Isolated environments (E2B sandboxes)
- ✅ No access to user secrets
- ✅ 1-hour maximum session time
- ✅ Repository validation (GitHub URL format)

### Recommended Additions

- [ ] GitHub repo allowlist/blocklist
- [ ] User authentication for longer sessions
- [ ] Resource usage monitoring
- [ ] DDoS protection (Cloudflare)

## Troubleshooting

### Sandbox creation times out

- Check E2B dashboard for status
- Verify API key is correct
- Try with a smaller repository

### Dependencies fail to install

- Large repos may exceed timeout
- Consider increasing `SANDBOX_TIMEOUT_MS`
- Pre-install common dependencies in E2B template

### WebSocket connection fails

- Check CORS configuration in sandbox API
- Verify E2B sandbox exposes correct port
- Check browser console for errors

## Development

### Running Locally Without E2B

For local testing without E2B:

1. Start OpenCode server manually:
```bash
cd /path/to/test/repo
opencode serve --port 4096
```

2. Connect frontend directly:
```bash
VITE_OPENCODE_SERVER_HOST=localhost \
VITE_OPENCODE_SERVER_PORT=4096 \
bun run dev
```

Visit `http://localhost:3000/session` for local mode.

## Future Enhancements

- [ ] Support for private GitHub repositories
- [ ] Session persistence and sharing
- [ ] Branch and PR support
- [ ] Collaborative sessions
- [ ] VS Code integration
- [ ] Custom environment configurations
