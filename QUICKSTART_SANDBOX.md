# Quick Start: GitHub Sandbox Service

Get the sandbox service running in 5 minutes!

## Prerequisites

- Bun installed
- E2B account (sign up at https://e2b.dev - free tier available)

## Step 1: Install Sandbox API Dependencies

```bash
cd packages/sandbox-api
bun install
```

## Step 2: Configure E2B

1. Get your API key from https://e2b.dev/dashboard
2. Create `.env` file:

```bash
cp .env.example .env
```

3. Edit `.env` and add your key:

```env
E2B_API_KEY=your_e2b_api_key_here
```

## Step 3: Start Sandbox API

```bash
bun run dev
```

You should see:
```
🚀 Sandbox API server starting on port 3001
📦 Environment: development
⏱️  Sandbox timeout: 1800000ms
```

## Step 4: Configure Frontend

In a new terminal, from the root directory:

```bash
cp .env.example .env
```

The default settings should work:
```env
VITE_SANDBOX_API_URL=http://localhost:3001
```

## Step 5: Start Frontend

```bash
bun run dev
```

## Step 6: Test!

Open your browser to:

```
http://localhost:3000/colinhacks/zod
```

You should see:
1. Loading screen: "Initializing Sandbox... Cloning repository..."
2. After 30-60 seconds: OpenCode chat interface
3. You can now chat with the Zod repository!

## Try More Repos

```
http://localhost:3000/facebook/react
http://localhost:3000/vercel/next.js
http://localhost:3000/vuejs/core
```

## Troubleshooting

### "Rate limit exceeded"
- Default: 10 sandboxes per hour per IP
- Wait 1 hour or increase `MAX_SANDBOXES_PER_IP` in `.env`

### "Sandbox creation failed"
- Check E2B API key is correct
- Check E2B dashboard for quota/errors
- Try a smaller repository first

### "Cannot find module 'hono'"
- Run `cd packages/sandbox-api && bun install`

### Dependencies take too long
- Large repos (like React) may take 2-3 minutes
- Consider creating an E2B template (see SANDBOX.md)

## What's Happening Behind the Scenes

1. Frontend sends request to Sandbox API
2. Sandbox API creates E2B sandbox (isolated VM)
3. E2B clones GitHub repo
4. Runs `bun install` if package.json exists
5. Starts OpenCode server
6. Frontend connects via WebSocket
7. You chat with the repo!

## Next Steps

- Read SANDBOX.md for production deployment
- Create custom E2B template for faster boots
- Configure rate limiting and security
- Deploy to production (Fly.io, Railway, Vercel)

## Estimated Costs

Development (free tier):
- E2B: 100 hours/month free
- Everything else: $0

That's it! You're running a live sandbox service for any GitHub repo!
