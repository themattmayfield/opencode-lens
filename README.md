# OpenCode App

Web-based UI for OpenCode with sandbox support for exploring GitHub repositories.

## Features

### Local Mode
Connect to a local OpenCode server for interactive AI-powered coding sessions with your local projects.

### Sandbox Mode - Chat with Any GitHub Repo
Visit `/:owner/:repo` to create an isolated sandbox and chat with any public GitHub repository:

- **URL Format:** `http://localhost:3000/:owner/:repo/:branch?`
- **Example:** `http://localhost:3000/facebook/react`
- **How it works:**
  1. Creates an isolated E2B VM
  2. Clones the GitHub repository
  3. Installs dependencies (if `package.json` exists)
  4. Starts OpenCode server in the VM
  5. Connects your browser to the sandboxed environment
- **Timeout:** Sandboxes auto-destroy after 30 minutes of inactivity
- **Cost:** Uses your E2B credits (~$0.01-0.05 per sandbox)

**Supported repositories:**
- ✅ Public GitHub repositories
- ✅ Repositories with `package.json` (auto-installs dependencies)
- ✅ Any branch (defaults to `main`)
- ❌ Private repositories (not supported yet)

## Prerequisites

- [Bun](https://bun.sh/) (recommended) or Node.js 18+
- For sandbox mode: [E2B account](https://e2b.dev) and API key

## Environment Setup

### Frontend Environment Variables

Create a `.env` file in the project root (optional, defaults shown):

```bash
# OpenCode Server Configuration (for local development)
VITE_OPENCODE_SERVER_HOST=127.0.0.1
VITE_OPENCODE_SERVER_PORT=4096

# Sandbox API URL (for /:owner/:repo routes)
VITE_SANDBOX_API_URL=http://localhost:3001
```

See `.env.example` for all options.

### Sandbox API Environment Variables

The sandbox API requires E2B configuration. See [packages/sandbox-api/README.md](packages/sandbox-api/README.md) for detailed setup.

**Quick setup:**

1. Get an E2B API key from https://e2b.dev
2. Create `packages/sandbox-api/.env`:

```bash
# Required
E2B_API_KEY=your_api_key_here
E2B_TEMPLATE_ID=0b5m4ijc6tsskrud8dvh

# Optional
PORT=3001
SANDBOX_TIMEOUT_MS=1800000  # 30 minutes
```

See `packages/sandbox-api/.env.example` for all options.

### Building the E2B Template

The E2B template needs to be built once (or when you update the Dockerfile):

```bash
cd packages/sandbox-api
bun run build-template
# Note the template ID from the output and update E2B_TEMPLATE_ID in .env
```

## Development

### Install Dependencies

```bash
bun install
```

### Start Development Server

```bash
# Start frontend only (local mode)
bun run dev

# Start with sandbox support
# Terminal 1 - Start sandbox API
cd packages/sandbox-api
bun run dev

# Terminal 2 - Start frontend
bun run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the app.

### Available Scripts

- `bun run dev` - Start Vite dev server on port 3000
- `bun run build` - Production build
- `bun run serve` - Preview production build
- `bun run typecheck` - Run TypeScript type checking (validation only)

## Project Structure

```
.
├── src/
│   ├── components/     # UI components
│   ├── context/        # SolidJS contexts (SDK, sync, sandbox, etc.)
│   ├── pages/          # Page components and layouts
│   ├── ui-lib/         # Reusable UI library components
│   └── utils/          # Utility functions
├── packages/
│   └── sandbox-api/    # E2B sandbox API server
└── scripts/            # Build and deployment scripts
```

## Dockerfile Structure

- **`packages/sandbox-api/e2b.Dockerfile`** - E2B VM template (actively used)
  - Installs Bun + OpenCode CLI
  - Used when creating sandboxes for `/:owner/:repo` routes
  - Template ID: `0b5m4ijc6tsskrud8dvh`

Note: There is no Dockerfile in the root directory. The E2B-specific Dockerfile is in the sandbox-api package.

## Code Style

- **Framework:** SolidJS with TypeScript
- **Imports:** Use `@/` alias for src/ directory (e.g., `import Button from "@/ui/button"`)
- **Formatting:** Prettier configured with semicolons disabled, 120 character line width
- **CSS:** TailwindCSS 4.x with custom CSS variables theme system
- **Naming:** PascalCase for components, camelCase for variables/functions

See [AGENTS.md](AGENTS.md) for detailed coding guidelines.

## Deployment

### Frontend

Deploy the `dist` folder to any static host provider (Vercel, Netlify, Cloudflare Pages, etc.):

```bash
bun run build
# Upload the dist/ folder
```

### Sandbox API

See [packages/sandbox-api/README.md](packages/sandbox-api/README.md) for deployment instructions.

**Recommended:**
- Deploy to Fly.io, Railway, or any Node.js hosting
- Use Redis for session storage in production
- Set up monitoring for sandbox creation/destruction
- Configure rate limiting per IP

## Troubleshooting

### Sandbox Mode Issues

**"Sandbox takes forever to load"**
- Check E2B dashboard for service status
- Verify template ID is correct in `.env`
- Check network connectivity
- Try a different repository

**"Messages not showing"**
- Check browser console for errors
- Verify WebSocket connection
- Try refreshing the page

**"Rate limit exceeded"**
- Default: 10 sandboxes per hour per IP
- Wait for rate limit to reset
- Or increase `MAX_SANDBOXES_PER_IP` in production

### Development Issues

**"Cannot build E2B template"**
- Verify E2B CLI is installed
- Check E2B API key is valid
- Review Dockerfile for errors

**"Sandbox API won't start"**
- Verify `.env` file exists in `packages/sandbox-api/`
- Check `E2B_API_KEY` is set
- Ensure port 3001 is available

## Learn More

- [SolidJS Documentation](https://solidjs.com)
- [E2B Documentation](https://e2b.dev/docs)
- [OpenCode Documentation](https://opencode.ai/docs)

## License

MIT
