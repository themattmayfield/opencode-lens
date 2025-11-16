# OpenCode Server in E2B - TODO

## Current Issue

The sandbox implementation currently **cannot** run OpenCode server inside E2B sandboxes because:

1. **OpenCode is not an installable package** - There's no `npm install -g opencode` or `bun install -g opencode`
2. **OpenCode is a desktop application** - It's designed to run locally, not as a server binary
3. **No standalone server binary** - OpenCode doesn't have a headless server mode we can deploy

## Current Workaround

The E2B provider now:
- ✅ Creates E2B VM
- ✅ Clones GitHub repository  
- ✅ Installs dependencies with Bun
- ⚠️  Returns local OpenCode server URL (`http://127.0.0.1:4096`)

This means:
- E2B clones the repo successfully
- But you still chat with your **local** OpenCode instance
- The cloned repo in E2B is not accessible to OpenCode

## Solutions

### Option 1: Build OpenCode Server Binary (Recommended)

**What's needed**:
1. Create a standalone OpenCode server binary
2. Include it in the E2B template
3. Start it in the sandbox:
   ```bash
   cd /workspace/repo && opencode-server --port 4096 --host 0.0.0.0
   ```

**Implementation**:
- Build OpenCode as a standalone binary (using pkg, bun build, or similar)
- Add to `e2b.Dockerfile`:
  ```dockerfile
  COPY opencode-server /usr/local/bin/
  RUN chmod +x /usr/local/bin/opencode-server
  ```

### Option 2: Use OpenCode LSP Server

If OpenCode has an LSP server component:
1. Run LSP server in E2B sandbox
2. Connect frontend to LSP over WebSocket
3. LSP provides code intelligence for the cloned repo

### Option 3: Hybrid Approach

1. E2B clones repo and installs dependencies
2. Use E2B's file system API to expose repo files
3. OpenCode runs locally but reads files from E2B via API
4. More complex but keeps OpenCode local

### Option 4: Different Architecture

Instead of running OpenCode in E2B:
1. Use E2B just for isolated code execution
2. Keep OpenCode running locally
3. OpenCode sends code execution requests to E2B
4. E2B returns results

This is how some coding assistants work (e.g., Cursor, Copilot Workspace).

## Current State

**File**: `packages/sandbox-api/src/sandbox/e2b.ts:71-80`

```typescript
// TODO: For now, just return the local OpenCode server URL
// In a full implementation, we'd need to:
// 1. Build OpenCode server as a standalone binary
// 2. Include it in the E2B template  
// 3. Start it in the sandbox pointing at /workspace/repo

// For now, fall back to local development server
const serverUrl = "http://127.0.0.1:4096";
const wsUrl = "ws://127.0.0.1:4096";
```

## What Works Now

- ✅ E2B template builds successfully
- ✅ Sandbox API starts without errors
- ✅ Can create E2B sandboxes
- ✅ Repos are cloned in E2B
- ✅ Dependencies installed
- ⚠️  But OpenCode connects to local server, not E2B

## What Doesn't Work

- ❌ Chatting with remote GitHub repos
- ❌ OpenCode can't access E2B cloned repos
- ❌ Users still need local repo open

## Next Steps

1. **Investigate OpenCode architecture**:
   - Check if there's a server mode
   - Look for LSP server component
   - See if it can be built as standalone binary

2. **Choose solution** based on OpenCode's architecture

3. **Implement** chosen solution

4. **Test** end-to-end with real GitHub repo

## Testing Current State

You can test what works now:

```bash
# Start sandbox API
cd packages/sandbox-api
bun run dev

# In another terminal, test sandbox creation
curl -X POST http://localhost:3001/api/sandbox \
  -H "Content-Type: application/json" \
  -d '{"owner": "colinhacks", "repo": "zod"}'
```

This will:
- Create E2B VM
- Clone Zod repo
- Install dependencies  
- Return local OpenCode URL (temporary workaround)

But the frontend will still connect to your local OpenCode, not the E2B sandbox.

## Questions to Answer

1. Does OpenCode have a server/daemon mode?
2. Can OpenCode be built as a standalone binary?
3. Does OpenCode use LSP (Language Server Protocol)?
4. What's the minimal OpenCode setup needed to provide code intelligence?

Once we answer these, we can implement the proper solution.
