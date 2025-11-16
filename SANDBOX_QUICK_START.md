# Sandbox Quick Start

Get the GitHub repo sandbox feature running in 5 minutes.

**No Docker Required** - E2B builds templates in the cloud!

## Automated Setup (Recommended)

```bash
cd packages/sandbox-api

# Run the setup script (installs CLI, builds template, configures .env)
./setup-e2b.sh

# After setup, get your API key from https://e2b.dev/dashboard
# and add it to .env

# Start sandbox API
bun install
bun run dev

# In another terminal, start frontend
cd ../..
bun run dev

# Visit http://localhost:3000/colinhacks/zod
```

## Manual Setup

If you prefer to run each step manually:

```bash
# 1. Install E2B CLI
npm install -g @e2b/cli

# 2. Login to E2B
e2b auth login

# 3. Build template (uses E2B cloud builder - no Docker needed!)
cd packages/sandbox-api
# Use a unique name to avoid conflicts
e2b template build --name opencode-$(date +%s) --dockerfile e2b.Dockerfile

# 4. Get your API key from https://e2b.dev/dashboard

# 5. Configure (use template ID from step 3)
cat > .env << EOF
E2B_API_KEY=e2b_your_actual_key_here
E2B_TEMPLATE_ID=tpl_abc123def456
PORT=3001
NODE_ENV=development
SANDBOX_TIMEOUT_MS=1800000
EOF

# 6. Start sandbox API
bun install
bun run dev

# 7. Start frontend (in another terminal)
cd ../..
bun run dev

# 8. Visit http://localhost:3000/colinhacks/zod
```

## What Happens

1. You visit `/:owner/:repo` (e.g., `/colinhacks/zod`)
2. Frontend calls `POST /api/sandbox` with `{owner: "colinhacks", repo: "zod"}`
3. Sandbox API creates E2B VM (or returns mock URL)
4. E2B VM clones repo, installs deps, starts OpenCode
5. Frontend connects to OpenCode WebSocket
6. You chat with the actual GitHub repository!

## Verify It's Working

```bash
curl http://localhost:3001/api/sandbox \
  -H "Content-Type: application/json" \
  -d '{"owner": "colinhacks", "repo": "zod"}'
```

Expected response:
```json
{
  "sandbox": {
    "serverUrl": "https://sb-abc123.e2b.dev",
    "status": "ready"
  }
}
```

## Troubleshooting

**"E2B_API_KEY is required"**
- Get your API key from https://e2b.dev/dashboard
- Add it to `packages/sandbox-api/.env`

**"E2B_TEMPLATE_ID is required"**
- Run the build command: `e2b template build --name opencode-sandbox --dockerfile e2b.Dockerfile`
- Copy the template ID (e.g., `tpl_abc123`) to `.env`

**"Connection refused" from frontend**
- Is sandbox API running on port 3001?
- Check `VITE_SANDBOX_API_URL=http://localhost:3001` in root `.env`

**Sandbox takes forever to load**
- First E2B sandbox creation takes 30-40 seconds (cloning repo + installing deps)
- Subsequent uses of same template are faster (~10 seconds)

## Next Steps

- Read [E2B_SETUP_GUIDE.md](./E2B_SETUP_GUIDE.md) for detailed setup
- Read [SANDBOX.md](./SANDBOX.md) for architecture details
- Read [packages/sandbox-api/README.md](./packages/sandbox-api/README.md) for API docs

## Quick Commands

```bash
# Start both servers
cd packages/sandbox-api && bun run dev &
cd ../.. && bun run dev

# Check sandbox API health
curl http://localhost:3001/health

# Create sandbox
curl -X POST http://localhost:3001/api/sandbox \
  -H "Content-Type: application/json" \
  -d '{"owner": "colinhacks", "repo": "zod"}'

# Get sandbox status
curl http://localhost:3001/api/sandbox/sb_1234567890_abc123

# Destroy sandbox
curl -X DELETE http://localhost:3001/api/sandbox/sb_1234567890_abc123
```
