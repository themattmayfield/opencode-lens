# OpenCode Sandbox Feature - Optimization & Cleanup Plan

## Executive Summary

This document provides detailed implementation plans for optimizing and cleaning up the E2B sandbox integration feature. The sandbox feature allows users to chat with any GitHub repository by visiting `/:owner/:repo` URLs.

**Current Status:** ✅ Fully functional - sandboxes are created, messages display correctly
**Main Issue Resolved:** Messages now display even when `summary.body` is empty (E2B sandbox behavior)

---

## 🧹 HIGH PRIORITY: Production Cleanup

### 1. Remove Unused Dockerfile and Scripts

**Problem:**
- `Dockerfile.sandbox` in the root directory is an unused draft/placeholder
- It was created during initial planning but never actually used
- Causes confusion about which Dockerfile is actually used for E2B
- May reference unused scripts like `sandbox-init.sh`

**Current State:**
- **`Dockerfile.sandbox`** (root): Placeholder with commented-out options, not referenced anywhere
- **`packages/sandbox-api/e2b.Dockerfile`**: ✅ Actually used by E2B (the correct one)
- **`scripts/sandbox-init.sh`**: May exist but unused

**Verification:**

```bash
# Check if Dockerfile.sandbox is referenced anywhere
cd /Users/mattmayfield/Documents/builds/opencode-git
grep -r "Dockerfile.sandbox" . --exclude-dir=node_modules --exclude-dir=.git

# Check if sandbox-init.sh is referenced anywhere
grep -r "sandbox-init" . --exclude-dir=node_modules --exclude-dir=.git

# If no results (except in this plan file), safe to delete
```

**Files to Remove:**

1. **`/Dockerfile.sandbox`**
   - Contains placeholder comments
   - Never completed
   - Not used by E2B (which uses `packages/sandbox-api/e2b.Dockerfile`)

2. **`/scripts/sandbox-init.sh`** (if exists and unused)
   - Only remove if verification shows it's not referenced

**The Correct Dockerfile (Keep This!):**

`packages/sandbox-api/e2b.Dockerfile` is the **actively used** Dockerfile that:
- Builds the E2B VM template (ID: `0b5m4ijc6tsskrud8dvh`)
- Installs Ubuntu 22.04 + Bun + OpenCode CLI
- Used when users visit `/:owner/:repo` URLs

**Implementation Steps:**

1. Verify files are unused:
   ```bash
   cd /Users/mattmayfield/Documents/builds/opencode-git
   
   # Should return no results (except this plan)
   grep -r "Dockerfile.sandbox" . --exclude-dir=node_modules --exclude-dir=.git
   grep -r "sandbox-init" . --exclude-dir=node_modules --exclude-dir=.git
   ```

2. Remove unused files:
   ```bash
   # Remove unused Dockerfile
   rm Dockerfile.sandbox
   
   # Remove unused script (only if exists)
   [ -f scripts/sandbox-init.sh ] && rm scripts/sandbox-init.sh
   ```

3. Verify E2B still works:
   ```bash
   cd packages/sandbox-api
   
   # Should still show the correct Dockerfile
   ls -la e2b.Dockerfile
   
   # Should still work
   cat e2b.toml  # Verify it points to e2b.Dockerfile
   ```

4. Test sandbox creation:
   ```bash
   # Visit a test repo
   http://localhost:3000/facebook/react
   
   # Should still create sandbox successfully
   # E2B uses packages/sandbox-api/e2b.Dockerfile
   ```

5. Commit changes:
   ```bash
   git add -A
   git commit -m "Remove unused Dockerfile.sandbox and placeholder files"
   ```

**Why This is Safe:**
- E2B specifically looks for `e2b.Dockerfile` in the sandbox-api directory
- The `e2b.toml` configuration file specifies which Dockerfile to use
- No build scripts reference `Dockerfile.sandbox`
- The root Dockerfile was never completed or used

**Documentation Update:**

Add to README.md to prevent confusion:

```markdown
## Dockerfile Structure

- **`packages/sandbox-api/e2b.Dockerfile`** - E2B VM template (actively used)
  - Installs Bun + OpenCode CLI
  - Used when creating sandboxes for `/:owner/:repo` routes
  - Template ID: `0b5m4ijc6tsskrud8dvh`

Note: There is no Dockerfile in the root directory. The E2B-specific Dockerfile is in the sandbox-api package.
```

**Estimated Time:** 5 minutes

**Testing:**
1. Remove files as described
2. Visit `http://localhost:3000/facebook/react`
3. Verify sandbox still creates successfully
4. Check E2B template still builds: `cd packages/sandbox-api && e2b template build`

---

### 2. Remove Debug Console Logging

**Problem:**
- Debug logs are cluttering the browser console in production
- Performance impact from logging every event
- Exposing internal implementation details to users

**Files to Modify:**

#### 1.1 `src/pages/sandbox-layout.tsx`

**Line 64:** Remove session change log
```typescript
// REMOVE THIS:
console.log("🔄 Session changed:", newId);
```

**Lines 72-76:** Remove user message debug log
```typescript
// REMOVE THIS ENTIRE BLOCK:
if (
  event.type === "message.updated" &&
  event.properties.info.role === "user"
) {
  console.log("👤 User message updated:", {
    id: event.properties.info.id,
    hasSummary: !!event.properties.info.summary,
    summary: event.properties.info.summary,
  });
}
```

**After cleanup, the event listener should look like:**
```typescript
const unsubscribe = sdk.event.listen((e) => {
  const event = e.details;
  if (event.type === "session.updated") {
    const newId = event.properties.info.id;
    // Only update if we don't have a sessionId yet, or if it actually changed
    if (!sessionId() || sessionId() !== newId) {
      setSessionId(newId);
    }
  }
});
```

#### 1.2 `src/pages/session.tsx`

**Lines 69-77:** Remove session debug log
```typescript
// REMOVE THIS ENTIRE BLOCK:
// Debug logging
createEffect(() => {
  const active = session.messages.active();
  console.log("📊 Session Debug:", {
    sessionId: session.id,
    userMessages: session.messages.user().length,
    activeMessage: active,
    activeMessageSummary: active?.summary,
    allMessages: session.messages.all().length,
  });
});
```

**Implementation Steps:**
1. Open `src/pages/sandbox-layout.tsx`
2. Delete lines 64 and 68-77
3. Open `src/pages/session.tsx`
4. Delete lines 69-77
5. Test that sandbox still works without console noise
6. Commit: `"Remove debug console logs from sandbox feature"`

**Testing:**
- Visit `http://localhost:3000/colinhacks/zod`
- Submit a message
- Check browser console - should only see SDK events, no custom logs
- Verify messages still display correctly

**Estimated Time:** 5 minutes

---

### 3. Handle 404 Diff Endpoint Error Gracefully

**Problem:**
When a new session is created in sandbox mode, `sync.session.sync()` makes these API calls:
1. `GET /session/:id` ✅ Works
2. `GET /session/:id/messages` ✅ Works  
3. `GET /session/:id/todo` ✅ Works
4. `GET /session/:id/diff` ❌ Returns 404 (endpoint doesn't exist yet)

The 404 causes an unhandled error in the console, even though the feature works fine.

**Root Cause Analysis:**
- `sync.tsx` line 236-246 uses `Promise.all()` for all 4 requests
- The diff endpoint returns 404 for newly created sessions
- No error handling around individual promise failures

**Files to Modify:**

#### 2.1 `src/context/sync.tsx`

**Current code (lines 234-270):**
```typescript
async sync(sessionID: string, _isRetry = false) {
  const [session, messages, todo, diff] = await Promise.all([
    sdk.client.session.get({
      path: { id: sessionID },
      throwOnError: true,
    }),
    sdk.client.session.messages({
      path: { id: sessionID },
      query: { limit: 100 },
    }),
    sdk.client.session.todo({ path: { id: sessionID } }),
    sdk.client.session.diff({ path: { id: sessionID } }),
  ]);
  // ... rest of the function
}
```

**Solution Option A: Catch individual errors (Recommended)**
```typescript
async sync(sessionID: string, _isRetry = false) {
  // Fetch all data, with graceful fallbacks for endpoints that might not exist yet
  const [session, messages, todo, diff] = await Promise.all([
    sdk.client.session.get({
      path: { id: sessionID },
      throwOnError: true,
    }),
    sdk.client.session.messages({
      path: { id: sessionID },
      query: { limit: 100 },
    }),
    sdk.client.session.todo({ path: { id: sessionID } }),
    // Gracefully handle 404 for diff endpoint (might not exist for new sessions)
    sdk.client.session.diff({ path: { id: sessionID } })
      .catch((error) => {
        // Only log if it's not a 404
        if (error?.status !== 404) {
          console.warn(`Failed to fetch session diff: ${error?.message}`);
        }
        return { data: [] }; // Return empty array on failure
      }),
  ]);
  
  setStore(
    produce((draft) => {
      const match = Binary.search(
        draft.session,
        sessionID,
        (s) => s.id,
      );
      if (match.found) draft.session[match.index] = session.data!;
      if (!match.found)
        draft.session.splice(match.index, 0, session.data!);
      draft.todo[sessionID] = todo.data ?? [];
      draft.message[sessionID] = messages
        .data!.map((x) => x.info)
        .slice()
        .sort((a, b) => a.id.localeCompare(b.id));
      for (const message of messages.data!) {
        draft.part[message.info.id] = message.parts
          .slice()
          .map(sanitizePart)
          .sort((a, b) => a.id.localeCompare(b.id));
      }
      // Safely handle diff data
      draft.session_diff[sessionID] = diff.data ?? [];
    }),
  );
}
```

**Solution Option B: Promise.allSettled (More robust)**
```typescript
async sync(sessionID: string, _isRetry = false) {
  const results = await Promise.allSettled([
    sdk.client.session.get({
      path: { id: sessionID },
      throwOnError: true,
    }),
    sdk.client.session.messages({
      path: { id: sessionID },
      query: { limit: 100 },
    }),
    sdk.client.session.todo({ path: { id: sessionID } }),
    sdk.client.session.diff({ path: { id: sessionID } }),
  ]);

  // Extract successful results
  const session = results[0].status === 'fulfilled' ? results[0].value : null;
  const messages = results[1].status === 'fulfilled' ? results[1].value : { data: [] };
  const todo = results[2].status === 'fulfilled' ? results[2].value : { data: [] };
  const diff = results[3].status === 'fulfilled' ? results[3].value : { data: [] };

  if (!session) {
    throw new Error('Failed to fetch session info');
  }

  // ... rest of the function (same as before)
}
```

**Recommendation:** Use Option A (individual catch) because:
- More explicit about which endpoint is failing
- Better error reporting
- Smaller code change

**Implementation Steps:**
1. Open `src/context/sync.tsx`
2. Find the `async sync(sessionID: string)` function around line 234
3. Add `.catch()` handler to the diff promise in the `Promise.all()` array
4. Test with a new sandbox session
5. Check console - 404 error should be gone
6. Commit: `"Handle 404 gracefully when fetching session diff for new sessions"`

**Testing:**
1. Clear browser cache/storage
2. Visit `http://localhost:3000/facebook/react` (fresh repo)
3. Submit a message
4. Check console - should NOT see 404 error for `/diff` endpoint
5. Verify messages still display correctly
6. Check that diff data still works when it's available (after session completes)

**Estimated Time:** 15 minutes

---

### 4. Document Environment Variables

**Problem:**
- `VITE_SANDBOX_API_URL` is used but not documented
- E2B configuration is in `.env` but not in `.env.example`
- No documentation for developers setting up the sandbox feature

**Files to Create/Modify:**

#### 3.1 Create `.env.example` in project root

**Location:** `/Users/mattmayfield/Documents/builds/opencode-git/.env.example`

```bash
# OpenCode Frontend Environment Variables

# Sandbox API Configuration
# URL of the sandbox API server (defaults to http://localhost:3001)
VITE_SANDBOX_API_URL=http://localhost:3001

# OpenCode Server Configuration (for local development)
# Host and port where the local OpenCode server runs
VITE_OPENCODE_SERVER_HOST=127.0.0.1
VITE_OPENCODE_SERVER_PORT=4096
```

#### 3.2 Create `.env.example` for sandbox API

**Location:** `/Users/mattmayfield/Documents/builds/opencode-git/packages/sandbox-api/.env.example`

```bash
# E2B Sandbox API Environment Variables

# E2B Configuration
# Get your API key from https://e2b.dev/docs
E2B_API_KEY=your_e2b_api_key_here

# E2B Template ID (created via `bun run build-template`)
# Template: opencode-final with OpenCode pre-installed
E2B_TEMPLATE_ID=your_template_id_here

# Redis Configuration (optional, for production)
# Leave commented out for in-memory storage (development)
# REDIS_URL=redis://localhost:6379

# Server Configuration
PORT=3001
NODE_ENV=development

# Sandbox Configuration
# How long sandboxes stay alive (30 minutes = 1800000ms)
SANDBOX_TIMEOUT_MS=1800000

# Maximum sandboxes per IP (rate limiting)
MAX_SANDBOXES_PER_IP=10
```

#### 3.3 Update main README.md

**Location:** `/Users/mattmayfield/Documents/builds/opencode-git/README.md`

**Add this section before "Development" section:**

```markdown
## Environment Setup

### Frontend Environment Variables

Create a `.env` file in the project root (or use the defaults):

```bash
# Optional: URL of the sandbox API (defaults to http://localhost:3001)
VITE_SANDBOX_API_URL=http://localhost:3001
```

### Sandbox API Environment Variables

The sandbox API requires E2B configuration:

1. Get an E2B API key from https://e2b.dev
2. Create `packages/sandbox-api/.env`:

```bash
# Required
E2B_API_KEY=your_api_key_here
E2B_TEMPLATE_ID=0b5m4ijc6tsskrud8dvh  # Or your custom template

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
# Note the template ID from the output and update E2B_TEMPLATE_ID
```

## Features

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
```

#### 3.4 Update sandbox API README

**Location:** `/Users/mattmayfield/Documents/builds/opencode-git/packages/sandbox-api/README.md`

**Create this file:**

```markdown
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

## E2B Template

The template is defined in `e2b.Dockerfile` and installs:
- Bun runtime
- OpenCode CLI (`opencode-ai` package)
- Git and development tools

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

**Template build time:** ~3-5 minutes

### Current Template

- **Name:** `opencode-final`
- **ID:** `0b5m4ijc6tsskrud8dvh`
- **OpenCode Version:** Latest from npm
- **Status:** ✅ Production ready

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

### `POST /api/sandbox/:id/extend`

Extend sandbox lifetime.

**Request:**
```json
{
  "ttlMs": 1800000  // 30 minutes (max: 1 hour)
}
```

### `DELETE /api/sandbox/:id`

Destroy a sandbox.

### `GET /api/sandbox`

List all active sandboxes (admin only in production).

## Development

```bash
# Install dependencies
bun install

# Start API server
bun run dev

# The API will be available at http://localhost:3001
```

## Production Deployment

See `DEPLOYMENT.md` for production deployment instructions.

**Recommended:**
- Deploy to Fly.io, Railway, or any Node.js hosting
- Use Redis for session storage
- Set up monitoring for sandbox creation/destruction
- Configure rate limiting per IP
- Set resource limits (max sandboxes, timeout, etc.)

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
```

**Implementation Steps:**
1. Create `.env.example` in project root
2. Create `.env.example` in `packages/sandbox-api/`
3. Update main `README.md` with sandbox feature documentation
4. Create `packages/sandbox-api/README.md`
5. Test that all instructions work for a new developer
6. Commit: `"Add comprehensive documentation for sandbox feature"`

**Testing:**
1. Delete your `.env` files
2. Follow the documentation to set up from scratch
3. Verify all steps work
4. Check that defaults are sensible

**Estimated Time:** 45 minutes

---

## ⚡ MEDIUM PRIORITY: Code Quality Improvements

### 5. Remove Unused Mock Sandbox Provider

**Problem:**
- `packages/sandbox-api/src/sandbox/mock.ts` exists but is never used
- Project requirements state "No mock mode"
- Dead code in the codebase

**Analysis:**

Check current usage:
```bash
cd packages/sandbox-api
grep -r "mock" src/
```

**Current imports in `manager.ts`:**
```typescript
import { E2BSandboxProvider } from "./e2b";
import { MockSandboxProvider } from "./mock";  // <- Unused?
import type { BaseSandboxProvider } from "./provider";
import { config } from "../config";

export function getSandboxManager(): BaseSandboxProvider {
  // Always returns E2B provider
  return new E2BSandboxProvider();
}
```

**Decision Tree:**

**Option A: Remove completely (Recommended)**
- If mock is never used → Remove `mock.ts` and import
- Simplifies codebase
- Reduces confusion

**Option B: Keep for future testing**
- If you might need it for unit tests → Keep but document
- Add `// @deprecated - kept for future testing` comment

**Implementation Steps (Option A):**

1. Verify mock.ts is not imported anywhere:
   ```bash
   cd packages/sandbox-api
   grep -r "MockSandboxProvider" src/
   ```

2. Delete the file:
   ```bash
   rm src/sandbox/mock.ts
   ```

3. Update `manager.ts`:
   ```typescript
   // Remove this import:
   import { MockSandboxProvider } from "./mock";
   ```

4. Test that API still works:
   ```bash
   bun run dev
   # Create a test sandbox
   curl -X POST http://localhost:3001/api/sandbox \
     -H "Content-Type: application/json" \
     -d '{"owner":"facebook","repo":"react"}'
   ```

5. Commit: `"Remove unused mock sandbox provider"`

**Implementation Steps (Option B):**

1. Add deprecation comment to `mock.ts`:
   ```typescript
   /**
    * @deprecated Mock sandbox provider kept for potential future testing.
    * Not used in production. Always use E2BSandboxProvider.
    */
   export class MockSandboxProvider extends BaseSandboxProvider {
     // ... existing code
   }
   ```

2. Update `manager.ts`:
   ```typescript
   // Remove import but keep file
   import { E2BSandboxProvider } from "./e2b";
   // import { MockSandboxProvider } from "./mock"; // Available but unused
   ```

3. Commit: `"Mark mock sandbox provider as deprecated"`

**Recommendation:** Option A (remove completely) because:
- The real E2B integration is working perfectly
- No tests currently use it
- Can always restore from git history if needed later
- Reduces cognitive load when reading code

**Estimated Time:** 10 minutes

---

### 6. Add Retry Mechanism for Failed Sandboxes

**Problem:**
When sandbox creation fails, users see an error message but have no way to retry without refreshing the page.

**Current Behavior:**
```typescript
// In sandbox.tsx
catch (error) {
  console.error("Failed to create sandbox:", error);
  setState({
    status: "error",
    error: error instanceof Error ? error.message : "Unknown error",
  });
}
```

**User Experience Issue:**
- Network hiccup → Error state
- No recovery option
- User must refresh entire page
- Loses any context or state

**Solution: Add Retry Function**

#### 5.1 Update `src/context/sandbox.tsx`

**Add retry function to the context:**

```typescript
export const { use: useSandbox, provider: SandboxProvider } =
  createSimpleContext({
    name: "Sandbox",
    init: (props: { owner: string; repo: string; branch?: string }) => {
      const [state, setState] = createStore<SandboxState>({
        status: "initializing",
      });

      const sandboxApiUrl =
        import.meta.env.VITE_SANDBOX_API_URL || "http://localhost:3001";

      // Create sandbox on mount
      const createSandbox = async () => {
        try {
          setState("status", "initializing");

          const response = await fetch(`${sandboxApiUrl}/api/sandbox`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              owner: props.owner,
              repo: props.repo,
              branch: props.branch,
            }),
          });

          if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || "Failed to create sandbox");
          }

          const data = await response.json();
          setState({
            status: "ready",
            sandbox: data.sandbox,
          });
        } catch (error) {
          console.error("Failed to create sandbox:", error);
          setState({
            status: "error",
            error: error instanceof Error ? error.message : "Unknown error",
          });
        }
      };

      // NEW: Add retry function
      const retry = () => {
        console.log("Retrying sandbox creation...");
        createSandbox();
      };

      // ... rest of existing code (extend, destroy, etc.)

      // Initialize
      createSandbox();

      return {
        get state() {
          return state;
        },
        extend,
        destroy,
        retry, // NEW: Expose retry function
      };
    },
  });
```

#### 5.2 Update `src/components/sandbox-loader.tsx`

**Add retry button to error state:**

```typescript
import { Show, Match, Switch } from "solid-js";
import { Spinner } from "./spinner";
import { Button, Icon } from "@ui-lib";

export function SandboxLoader(props: {
  status: "initializing" | "ready" | "error";
  owner: string;
  repo: string;
  error?: string;
  onRetry?: () => void; // NEW: Add retry callback
}) {
  return (
    <div class="flex items-center justify-center h-screen">
      <div class="flex flex-col items-center gap-4 max-w-md">
        <Switch>
          <Match when={props.status === "initializing"}>
            <Spinner class="w-8 h-8" />
            <div class="text-center">
              <h2 class="text-18-medium mb-2">Creating Sandbox</h2>
              <p class="text-14-regular text-text-weak">
                Setting up isolated environment for{" "}
                <span class="text-text-strong">
                  {props.owner}/{props.repo}
                </span>
              </p>
              <p class="text-12-regular text-text-weaker mt-4">
                This usually takes 15-30 seconds...
              </p>
            </div>
          </Match>

          <Match when={props.status === "error"}>
            <Icon name="alert-circle" size="large" class="text-error" />
            <div class="text-center">
              <h2 class="text-18-medium mb-2 text-error">
                Failed to Create Sandbox
              </h2>
              <p class="text-14-regular text-text-weak mb-4">
                {props.error || "Unknown error occurred"}
              </p>
              
              {/* NEW: Retry button */}
              <Show when={props.onRetry}>
                <div class="flex flex-col gap-2 items-center">
                  <Button onClick={props.onRetry} variant="primary">
                    <Icon name="refresh" size="small" />
                    Retry
                  </Button>
                  <p class="text-12-regular text-text-weaker">
                    or refresh the page to try again
                  </p>
                </div>
              </Show>

              {/* Common error solutions */}
              <div class="mt-6 text-left bg-surface-raised p-4 rounded">
                <h3 class="text-14-medium mb-2">Common solutions:</h3>
                <ul class="text-12-regular text-text-weak list-disc list-inside space-y-1">
                  <li>Check your internet connection</li>
                  <li>Verify the repository exists and is public</li>
                  <li>Try a different repository</li>
                  <li>Contact support if the issue persists</li>
                </ul>
              </div>
            </div>
          </Match>
        </Switch>
      </div>
    </div>
  );
}
```

#### 5.3 Update `src/pages/sandbox-layout.tsx`

**Pass retry function to loader:**

```typescript
function SandboxContent(props: { children?: any }) {
  const sandbox = useSandbox();

  return (
    <Show
      when={sandbox.state.status === "ready" && sandbox.state.sandbox}
      fallback={
        <SandboxLoader
          status={sandbox.state.status}
          owner={sandbox.state.sandbox?.owner ?? ""}
          repo={sandbox.state.sandbox?.repo ?? ""}
          error={sandbox.state.error}
          onRetry={sandbox.retry} // NEW: Pass retry function
        />
      }
    >
      {(sandboxInfo) => (
        <SDKProvider url={sandboxInfo().serverUrl}>
          <SyncProvider>
            <LocalProvider>
              <SandboxSessionManager>{props.children}</SandboxSessionManager>
            </LocalProvider>
          </SyncProvider>
        </SDKProvider>
      )}
    </Show>
  );
}
```

**Implementation Steps:**
1. Update `src/context/sandbox.tsx` - add `retry` function
2. Update `src/components/sandbox-loader.tsx` - add retry button and error guidance
3. Update `src/pages/sandbox-layout.tsx` - pass `retry` to loader
4. Test error scenarios:
   - Disconnect internet → should show error
   - Click retry → should attempt to reconnect
   - Invalid repo name → should show helpful error
5. Commit: `"Add retry mechanism for failed sandbox creation"`

**Testing Scenarios:**

1. **Network Failure Test:**
   ```bash
   # Disable network temporarily
   # Visit localhost:3000/facebook/react
   # Should show error with retry button
   # Re-enable network
   # Click retry
   # Should successfully create sandbox
   ```

2. **Invalid Repo Test:**
   ```bash
   # Visit localhost:3000/invalid/nonexistent
   # Should show error with helpful message
   # Retry won't help but button should still work
   ```

3. **E2B API Down Test:**
   ```bash
   # Stop sandbox API
   # Visit localhost:3000/facebook/react
   # Should show error
   # Start sandbox API
   # Click retry
   # Should work
   ```

**Estimated Time:** 30 minutes

---

### 7. Fix TypeScript `use:sortable` Error

**Problem:**
TypeScript complains about the `use:sortable` directive used in SolidJS drag-and-drop:

```
ERROR [257:5] Type '{ children: Element; "use:sortable": true; ... }' is not assignable to type 'HTMLAttributes<HTMLDivElement>'.
Property 'use:sortable' does not exist on type 'HTMLAttributes<HTMLDivElement>'.
```

**Root Cause:**
- SolidJS directives (like `use:sortable`) are custom attributes
- TypeScript doesn't know about them by default
- Need to extend the JSX types

**Solution: Add Custom Type Declarations**

#### 6.1 Create `src/types/jsx.d.ts`

**Location:** `/Users/mattmayfield/Documents/builds/opencode-git/src/types/jsx.d.ts`

```typescript
import "solid-js";

declare module "solid-js" {
  namespace JSX {
    interface Directives {
      sortable: boolean;
    }
    interface CustomAttributes<T> {
      "use:sortable"?: boolean;
    }
  }
}

// This is required to make the file a module
export {};
```

#### 6.2 Update `tsconfig.json`

**Ensure the types directory is included:**

```json
{
  "compilerOptions": {
    // ... existing config
    "typeRoots": ["./node_modules/@types", "./src/types"]
  },
  "include": [
    "src/**/*",
    "src/types/**/*"  // Add this if not already present
  ]
}
```

#### 6.3 Alternative: Use Type Assertion (Quick Fix)

**In `src/pages/session.tsx` line 257:**

```typescript
// Before:
<div use:sortable classList={{ "h-full": true, "opacity-0": sortable.isActiveDraggable }}>

// After (with type assertion):
<div 
  {...({ "use:sortable": true } as any)}
  classList={{ "h-full": true, "opacity-0": sortable.isActiveDraggable }}
>
```

**Recommendation:** Use the proper type declaration (Option 6.1) rather than `as any` because:
- Type-safe
- Self-documenting
- Works for all SolidJS directives
- Follows best practices

**Implementation Steps:**
1. Create `src/types/jsx.d.ts` with directive declarations
2. Update `tsconfig.json` if needed
3. Run `bun run typecheck` - error should be gone
4. Test that drag-and-drop still works
5. Commit: `"Add TypeScript declarations for SolidJS directives"`

**Testing:**
```bash
# Should have no errors
bun run typecheck

# Test drag-and-drop functionality
# 1. Visit localhost:3000/facebook/react
# 2. Open multiple file tabs
# 3. Drag tabs to reorder
# 4. Should work without issues
```

**Estimated Time:** 10 minutes

---

## 🔮 LOW PRIORITY: Future Enhancements

### 8. Performance: Optimize Text Content Extraction

**Current Implementation:**

```typescript
// In session.tsx
const assistantTextContent = createMemo(() => {
  return assistantMessages()
    .flatMap((m) => sync.data.part[m.id] || [])
    .filter((p) => p?.type === "text")
    .map((p) => p.text)
    .join("");
});
```

**Performance Characteristics:**
- Runs on every part update (many times per second during streaming)
- Creates new arrays with `flatMap`, `filter`, `map`
- Joins all text on every update
- Could cause frame drops during heavy streaming

**Optimization Strategies:**

#### 7.1 Use Batched Updates

```typescript
import { batch } from "solid-js";

// In the event listener
sdk.event.listen((e) => {
  batch(() => {
    // Group multiple updates together
    if (event.type === "message.part.updated") {
      // Updates will only trigger one re-render
    }
  });
});
```

#### 7.2 Memoize Intermediate Steps

```typescript
// Memoize the parts lookup separately
const allParts = createMemo(() => 
  assistantMessages().flatMap((m) => sync.data.part[m.id] || [])
);

// Then filter and map
const assistantTextContent = createMemo(() => {
  return allParts()
    .filter((p) => p?.type === "text")
    .map((p) => p.text)
    .join("");
});
```

#### 7.3 Use String Builder Pattern

```typescript
const assistantTextContent = createMemo(() => {
  const parts = assistantMessages().flatMap((m) => sync.data.part[m.id] || []);
  let result = "";
  for (const part of parts) {
    if (part?.type === "text") {
      result += part.text;
    }
  }
  return result;
});
```

**Measurement Before Optimization:**

Add performance monitoring:

```typescript
const assistantTextContent = createMemo(() => {
  const start = performance.now();
  
  const result = assistantMessages()
    .flatMap((m) => sync.data.part[m.id] || [])
    .filter((p) => p?.type === "text")
    .map((p) => p.text)
    .join("");
  
  const duration = performance.now() - start;
  if (duration > 5) {
    console.warn(`Text extraction took ${duration.toFixed(2)}ms`);
  }
  
  return result;
});
```

**Decision Criteria:**

Only optimize if:
- Measurement shows > 16ms (one frame)
- User reports sluggish UI during streaming
- Profiling shows this as a bottleneck

**Current Assessment:**
- Likely not a problem for normal usage
- Most repos have reasonable message sizes
- SolidJS memos are already quite efficient

**Recommendation:** 
- Add performance monitoring first
- Only optimize if measurements show issues
- Document baseline performance metrics

**Implementation Steps (if needed):**
1. Add performance monitoring
2. Test with large repository (e.g., react, vue)
3. Stream a long response (ask for detailed explanation)
4. Check console for slow text extractions
5. If slow, apply string builder pattern
6. Re-measure to confirm improvement
7. Commit: `"Optimize assistant text content extraction"`

**Estimated Time:** 1-2 hours (including measurement and validation)

---

### 9. Investigate Why E2B Creates Empty Summaries

**Problem:**
In sandbox mode (E2B), the OpenCode server creates `summary` objects but leaves `title` and `body` as `undefined`. In regular mode (local), summaries are properly populated.

**Symptoms:**
```javascript
// Regular mode (local OpenCode):
message.summary = {
  title: "Add dark mode feature",
  body: "This implements a dark mode toggle...",
  diffs: [...]
}

// Sandbox mode (E2B):
message.summary = {
  // title and body are undefined
  diffs: [...]
}
```

**Hypothesis:**

1. **Model Access Issue:**
   - Summarization might require a specific model
   - E2B sandbox might not have access to that model
   - Check if API keys are properly passed to sandbox

2. **Resource Constraints:**
   - E2B VMs have limited resources
   - Summarization might be timing out
   - Check E2B logs for errors

3. **Configuration Difference:**
   - Local OpenCode might have different config
   - E2B template might be missing configuration
   - Compare config files

**Investigation Steps:**

#### 8.1 Check E2B Logs

```bash
# Get sandbox ID from the API
SANDBOX_ID="sb_xxx"

# Check logs (if E2B provides this)
e2b sandbox logs $SANDBOX_ID
```

#### 8.2 Compare OpenCode Versions

```bash
# Local version
opencode --version

# E2B version (check in Dockerfile)
grep "opencode" packages/sandbox-api/e2b.Dockerfile
```

#### 8.3 Check Model Configuration

**In the E2B sandbox, check what models are available:**

Add debugging to `src/pages/sandbox-layout.tsx`:

```typescript
sdk.event.listen((e) => {
  if (e.details.type === "server.connected") {
    // Log available providers and models
    console.log("Server connected, checking models...");
    sdk.client.config.providers().then((res) => {
      console.log("Available providers:", res.data);
    });
  }
});
```

#### 8.4 Test Hypothesis: Run Summarization Manually

Connect to an E2B sandbox and try to run summarization:

```bash
# SSH into E2B sandbox (if possible)
# Or use the execute API

# Try to run OpenCode CLI
opencode --help

# Check if summarization works
# This would require implementing a test endpoint
```

#### 8.5 Compare API Responses

Add logging to compare:

```typescript
// In sandbox context
sdk.event.listen((e) => {
  if (e.details.type === "message.updated" && e.details.properties.info.role === "user") {
    const msg = e.details.properties.info;
    console.log("User message summary structure:", {
      hasSummary: !!msg.summary,
      hasTitle: !!msg.summary?.title,
      hasBody: !!msg.summary?.body,
      hasDiffs: !!msg.summary?.diffs,
      summaryKeys: msg.summary ? Object.keys(msg.summary) : []
    });
  }
});
```

**Potential Fixes:**

#### Fix A: Pass Model Configuration to E2B

If the issue is missing model config:

```typescript
// In e2b.ts
await sandbox.commands.run(
  `cd /home/user/repo && sudo -E /root/.bun/bin/opencode serve --port ${port} --hostname 0.0.0.0 --model ${MODEL_ID}`,
  { background: true },
);
```

#### Fix B: Increase Timeout for Summarization

If it's timing out:

```typescript
// In E2B config
const sandbox = await Sandbox.create(config.e2bTemplateId, {
  apiKey: config.e2bApiKey,
  timeoutMs: config.sandbox.timeoutMs * 2, // Increase timeout
  // ...
});
```

#### Fix C: Use Alternative Summarization

If E2B can't access the summarization model:

```typescript
// In session.tsx - already implemented!
// We already show assistant text content when summary.body is missing
// So this is already "fixed" from UX perspective
```

**Current Status:**
- ✅ UI works without summaries (shows assistant text)
- ❓ Root cause unknown (needs investigation)
- 🔍 Requires access to E2B sandbox logs

**Recommendation:**
- **Short term:** Leave as-is (UI already handles it)
- **Long term:** Investigate when you have time/need
- **Priority:** Low (not blocking users)

**Implementation Steps (when ready):**
1. Add detailed logging to both local and sandbox modes
2. Compare provider/model availability
3. Check E2B sandbox logs for errors
4. Test with different OpenCode versions
5. Document findings in GitHub issue
6. Implement fix if root cause is found

**Estimated Time:** 3-4 hours (investigation heavy)

---

## 📋 Implementation Checklist

Use this checklist to track progress:

### High Priority (Do First)
- [ ] 1. Remove unused Dockerfile.sandbox (5 min)
  - [ ] Verify files are not referenced
  - [ ] Delete `Dockerfile.sandbox`
  - [ ] Delete `scripts/sandbox-init.sh` if exists
  - [ ] Test E2B still works
  - [ ] Commit changes

- [ ] 2. Remove debug console logs (5 min)
  - [ ] Remove from `sandbox-layout.tsx` (line 64)
  - [ ] Remove from `sandbox-layout.tsx` (lines 68-77)
  - [ ] Remove from `session.tsx` (lines 69-77)
  - [ ] Test sandbox still works
  - [ ] Commit changes

- [ ] 3. Handle 404 diff errors (15 min)
  - [ ] Update `sync.tsx` line 236-246
  - [ ] Add `.catch()` to diff promise
  - [ ] Test with new sandbox
  - [ ] Verify 404 gone from console
  - [ ] Commit changes

- [ ] 4. Document environment variables (45 min)
  - [ ] Create `.env.example` in root
  - [ ] Create `.env.example` in `packages/sandbox-api/`
  - [ ] Update main `README.md`
  - [ ] Create `packages/sandbox-api/README.md`
  - [ ] Test documentation by following it
  - [ ] Commit changes

### Medium Priority (Do Second)
- [ ] 5. Remove unused mock provider (10 min)
  - [ ] Verify mock.ts is unused
  - [ ] Delete `src/sandbox/mock.ts`
  - [ ] Remove import from `manager.ts`
  - [ ] Test API still works
  - [ ] Commit changes

- [ ] 6. Add retry mechanism (30 min)
  - [ ] Add `retry` function to `sandbox.tsx`
  - [ ] Update `sandbox-loader.tsx` with retry button
  - [ ] Update `sandbox-layout.tsx` to pass retry
  - [ ] Test various error scenarios
  - [ ] Commit changes

- [ ] 7. Fix TypeScript error (10 min)
  - [ ] Create `src/types/jsx.d.ts`
  - [ ] Add sortable directive declaration
  - [ ] Update `tsconfig.json` if needed
  - [ ] Run `bun run typecheck`
  - [ ] Test drag-and-drop still works
  - [ ] Commit changes

### Low Priority (Future)
- [ ] 8. Performance optimization (1-2 hrs)
  - [ ] Add performance monitoring
  - [ ] Measure text extraction performance
  - [ ] Only optimize if > 16ms
  - [ ] Document baseline metrics
  - [ ] Commit if changes made

- [ ] 9. Investigate empty summaries (3-4 hrs)
  - [ ] Add detailed logging
  - [ ] Compare local vs sandbox
  - [ ] Check E2B logs
  - [ ] Test different OpenCode versions
  - [ ] Document findings
  - [ ] Implement fix if found

---

## 🧪 Testing Strategy

### Regression Testing

After each change, verify:

1. **Sandbox Creation Flow:**
   ```bash
   # Visit fresh repo
   http://localhost:3000/facebook/react
   
   # Should:
   # ✓ Show loading state
   # ✓ Create E2B sandbox
   # ✓ Display chat interface
   # ✓ Allow sending messages
   # ✓ Show assistant responses
   ```

2. **Message Display:**
   ```bash
   # Submit message
   "What is this repository about?"
   
   # Should:
   # ✓ Show "Gathering thoughts..."
   # ✓ Stream assistant response
   # ✓ Display text in Response section (not just in details)
   # ✓ Mark as completed when done
   ```

3. **Error Handling:**
   ```bash
   # Test invalid repo
   http://localhost:3000/invalid/nonexistent
   
   # Should:
   # ✓ Show error message
   # ✓ Offer helpful guidance
   # ✓ Show retry button (after #5)
   ```

4. **Console Cleanliness:**
   ```bash
   # After changes, console should show:
   # ✓ SDK events (normal)
   # ✓ Server connected (normal)
   # ✗ NO custom debug logs
   # ✗ NO 404 errors for /diff
   # ✗ NO unhandled promise rejections
   ```

### Performance Testing

```bash
# Large repository test
http://localhost:3000/facebook/react

# Ask for detailed explanation
"Explain the entire React codebase architecture in detail"

# Monitor:
# - Console for performance warnings
# - UI responsiveness during streaming
# - Memory usage (DevTools)
# - No frame drops
```

### Edge Cases

1. **Network Issues:**
   - Disconnect/reconnect during creation
   - Slow 3G simulation
   - Timeout scenarios

2. **Repository Edge Cases:**
   - Very large repos (chromium)
   - Repos without package.json
   - Repos with monorepo structure
   - Different branches
   - Non-JavaScript repos

3. **Session Edge Cases:**
   - Multiple tabs to same repo
   - Multiple different repos
   - Browser refresh during creation
   - Closing tab during active session

---

## 🚀 Deployment Considerations

Before deploying to production:

1. **Environment Variables:**
   - [ ] Set `VITE_SANDBOX_API_URL` to production URL
   - [ ] Set `E2B_API_KEY` with production key
   - [ ] Configure `REDIS_URL` for production
   - [ ] Set appropriate `SANDBOX_TIMEOUT_MS`
   - [ ] Configure `MAX_SANDBOXES_PER_IP`

2. **Security:**
   - [ ] Implement rate limiting at reverse proxy level
   - [ ] Add authentication for sandbox API
   - [ ] Validate repo owner/name server-side
   - [ ] Set up CORS properly
   - [ ] Use HTTPS for all endpoints

3. **Monitoring:**
   - [ ] Track sandbox creation success/failure rate
   - [ ] Monitor E2B costs
   - [ ] Alert on high error rates
   - [ ] Track average sandbox lifetime
   - [ ] Monitor API response times

4. **Documentation:**
   - [ ] Update production URLs in docs
   - [ ] Document deployment process
   - [ ] Create runbook for common issues
   - [ ] Document E2B template rebuild process

---

## 📊 Success Metrics

Track these metrics after implementing changes:

### User Experience Metrics
- **Time to First Message:** < 30 seconds from URL visit to first message
- **Error Rate:** < 5% of sandbox creations fail
- **Retry Success Rate:** > 80% of retries succeed
- **Console Errors:** 0 unhandled errors in production

### Developer Experience Metrics
- **Setup Time:** < 10 minutes for new developer to run locally
- **Documentation Completeness:** All env vars documented
- **Type Safety:** 0 TypeScript errors
- **Code Coverage:** All critical paths have error handling

### Performance Metrics
- **Sandbox Creation Time:** 15-30 seconds average
- **Message Display Time:** < 100ms from event to UI update
- **Text Extraction Time:** < 5ms per update
- **Memory Usage:** < 100MB increase per active sandbox

---

## 🐛 Known Issues & Workarounds

### Issue 1: Empty Summaries in Sandbox Mode
**Status:** Known limitation
**Impact:** Medium (UI handles it gracefully)
**Workaround:** Display assistant text content directly
**Fix:** Investigation needed (see section 8)

### Issue 2: 404 for /diff Endpoint
**Status:** Will be fixed in section 2
**Impact:** Low (cosmetic console error)
**Workaround:** Ignore error
**Fix:** Add error handling to diff request

### Issue 3: No Retry on Failure
**Status:** Will be fixed in section 5
**Impact:** Medium (poor UX on transient failures)
**Workaround:** User must refresh page
**Fix:** Add retry button

---

## 📞 Support & Troubleshooting

### Common User Issues

**"Sandbox takes forever to load"**
- Check E2B dashboard for service status
- Verify template ID is correct
- Check network connectivity
- Try different repository

**"Messages not showing"**
- This should be fixed after all changes
- Check browser console for errors
- Verify WebSocket connection
- Try refreshing the page

**"Rate limit exceeded"**
- User hit 10 sandboxes/hour limit
- Wait for rate limit to reset
- Or increase `MAX_SANDBOXES_PER_IP` in production

### Developer Issues

**"Cannot build E2B template"**
- Verify E2B CLI is installed
- Check E2B API key is valid
- Review Dockerfile for errors
- Check E2B dashboard for build logs

**"Sandbox API won't start"**
- Verify `.env` file exists
- Check `E2B_API_KEY` is set
- Ensure port 3001 is available
- Check for syntax errors in code

---

## 🎯 Summary

**Total Estimated Time:**
- High Priority: ~1 hour 10 minutes
- Medium Priority: ~50 minutes
- Low Priority: ~5 hours
- **Total:** ~7 hours 10 minutes of focused work

**Biggest Wins:**
1. Clean console (better dev/user experience)
2. Complete documentation (easier onboarding)
3. Retry mechanism (better UX on failures)

**Can Skip:**
- Performance optimization (not a current bottleneck)
- Summary investigation (UI already handles it)

**Recommended Order:**
1. Remove unused Dockerfile (prevent confusion)
2. Remove debug logs (quick win)
3. Handle 404 errors (clean console)
4. Add documentation (help future developers)
5. Add retry mechanism (better UX)
6. Fix TypeScript error (code quality)
7. Remove mock provider (cleanup)
8. Performance/investigation (if time permits)

---

*This document will serve as your reference for improving the OpenCode sandbox feature after session compaction.*
