# E2B Setup Guide

This guide walks you through setting up E2B integration for the OpenCode sandbox feature.

**No Docker Required!** E2B builds templates in the cloud.

## What You'll Need

- **E2B Account**: Sign up at https://e2b.dev (free tier available)
- **E2B API Key**: Get from https://e2b.dev/dashboard
- **E2B CLI**: Installed via npm (no Docker needed)

## Quick Setup (5 minutes)

### Automated Setup Script

The easiest way to get started:

```bash
cd packages/sandbox-api
./setup-e2b.sh
```

This script will:
1. Install E2B CLI (if not already installed)
2. Login to E2B (opens browser)
3. Build the OpenCode template using E2B's cloud builder (no Docker!)
4. Create `.env` with your template ID
5. Show you what to do next

After running the script, just add your E2B API key to `.env` and you're ready!

### Manual Setup (Step-by-Step)

If you prefer to run each step manually:

#### 1. Install E2B CLI

```bash
npm install -g @e2b/cli
```

#### 2. Login to E2B

```bash
e2b auth login
```

This opens your browser for authentication.

#### 3. Build OpenCode Template (No Docker Required!)

```bash
cd packages/sandbox-api
e2b template build --name opencode-sandbox --dockerfile e2b.Dockerfile
```

**E2B builds this in the cloud** - you don't need Docker installed!

This creates a custom template with:
- Ubuntu 22.04
- Bun runtime
- OpenCode CLI pre-installed
- Git for cloning repositories

**Save the template ID** from the output (e.g., `tpl_abc123def456`)

#### 4. Get API Key

Visit https://e2b.dev/dashboard and copy your API key.

#### 5. Configure Environment

Create `packages/sandbox-api/.env`:

```bash
E2B_API_KEY=e2b_your_actual_api_key_here
E2B_TEMPLATE_ID=tpl_abc123def456
PORT=3001
NODE_ENV=development
SANDBOX_TIMEOUT_MS=1800000
```

#### 6. Install Dependencies

```bash
bun install
```

#### 7. Start the Sandbox API

```bash
bun run dev
```

You should see:
```
✅ Using E2B sandbox provider
   Template: tpl_abc123def456
🚀 Sandbox API server starting on port 3001
```

#### 8. Start Frontend

In another terminal:

```bash
cd ../..
bun run dev
```

#### 9. Test It

Visit http://localhost:3000/colinhacks/zod in your browser.

The app will:
1. Call the sandbox API to create a new E2B VM
2. Clone the Zod repository
3. Install dependencies with Bun
4. Start OpenCode server in the VM
5. Connect your chat to the live repository

## How It Works

### Architecture

```
User visits /:owner/:repo
         ↓
Frontend calls POST /api/sandbox
         ↓
Sandbox API creates E2B VM
         ↓
E2B VM executes:
  - git clone https://github.com/:owner/:repo
  - cd repo && bun install
  - opencode serve --port 4096
         ↓
Returns sandbox URL (https://sb-xyz.e2b.dev)
         ↓
Frontend connects to OpenCode in VM
         ↓
User chats with the actual GitHub repo
```

### Template Details

The `e2b.Dockerfile` defines what's pre-installed in each sandbox:

```dockerfile
FROM ubuntu:22.04
RUN curl -fsSL https://bun.sh/install | bash
RUN curl -fsSL https://opencode.sh/install.sh | bash
WORKDIR /workspace
```

When you build this template, E2B creates a snapshot that can be cloned in ~2-3 seconds.

### Sandbox Lifecycle

1. **Create**: POST /api/sandbox (30-40 seconds)
   - Spin up VM from template
   - Clone GitHub repo
   - Install dependencies
   - Start OpenCode server

2. **Active**: User chats with repo (30 minutes default)
   - All code analysis happens in the VM
   - Full access to repo files
   - Can run tests, build, etc.

3. **Extend**: POST /api/sandbox/:id/extend
   - Resets the 30-minute timer
   - Frontend auto-extends during active use

4. **Destroy**: DELETE /api/sandbox/:id
   - Kills the VM
   - Cleanup happens automatically on timeout

## Mock Mode (No E2B Required)

## Important: No Mock Mode

This implementation **always uses real E2B sandboxes**. There is no mock mode.

Every sandbox request creates a real E2B VM that:
- Clones the actual GitHub repository  
- Installs real dependencies
- Runs OpenCode in an isolated environment

This ensures you're always testing the real functionality, even during development.

## Troubleshooting

### "E2B_API_KEY is required"

Get your API key from https://e2b.dev/dashboard and add it to `packages/sandbox-api/.env`

### "E2B_TEMPLATE_ID is required"

Run the build command or use the setup script:
```bash
./setup-e2b.sh
```

### Template build fails

E2B builds templates in the cloud by default - you don't need Docker! The build happens on E2B's servers.

### Sandbox creation timeout

Increase timeout in config:

```bash
SANDBOX_TIMEOUT_MS=3600000  # 60 minutes
```

### Port conflicts

Change the sandbox API port:

```bash
# packages/sandbox-api/.env
PORT=3002

# Root .env
VITE_SANDBOX_API_URL=http://localhost:3002
```

## Cost Considerations

E2B pricing (as of 2024):
- **Free tier**: 10 hours/month of sandbox time
- **Pro**: $20/month for 100 hours
- **Enterprise**: Custom pricing

Each sandbox costs ~$0.20/hour. With 30-minute sessions, that's ~$0.10 per user session.

**Optimization tips**:
- Use mock mode during development
- Set shorter timeouts (15 minutes vs 30)
- Auto-destroy inactive sandboxes
- Cache popular repositories

## Production Deployment

### Deploy Sandbox API

**Option 1: Fly.io**
```bash
cd packages/sandbox-api
fly launch
fly secrets set E2B_API_KEY=your_key E2B_TEMPLATE_ID=your_template
fly deploy
```

**Option 2: Railway**
1. Connect GitHub repo
2. Set root directory: `packages/sandbox-api`
3. Add environment variables
4. Deploy

### Update Frontend

```bash
# Root .env
VITE_SANDBOX_API_URL=https://sandbox-api.fly.dev
```

Build and deploy frontend:
```bash
bun run build
# Deploy to Vercel/Netlify
```

## Security Notes

- E2B sandboxes are **fully isolated** VMs (Firecracker)
- Each user gets a separate VM
- VMs are destroyed after timeout
- No persistent storage between sessions
- API keys are never exposed to frontend

## Next Steps

- Add authentication to sandbox API
- Implement rate limiting (Redis)
- Add webhook for E2B events
- Cache popular repositories
- Add metrics/monitoring

## Support

- E2B Docs: https://e2b.dev/docs
- E2B Discord: https://discord.gg/35NF4Y8WSm
- OpenCode Issues: https://github.com/sst/opencode/issues
