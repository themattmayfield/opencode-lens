# Dockerfile Improvements - Why Templates May Fail

## Common E2B Template Build Failures

### 1. **Installation Script Issues**
**Problem**: `curl -fsSL https://opencode.sh/install.sh | bash` may:
- Not exist (404 error)
- Require interactive input
- Have network timeouts
- Fail silently

**Original Dockerfile Issue**:
```dockerfile
RUN curl -fsSL https://opencode.sh/install.sh | bash
RUN opencode --version  # ❌ Fails if install failed
```

### 2. **PATH Issues**
**Problem**: Installed binaries not in PATH during build
- Bun installs to `/root/.bun/bin`
- OpenCode may install to `/root/.local/bin`
- ENV directives may not persist correctly

### 3. **Build Timeouts**
**Problem**: E2B has build time limits
- Too many large installs can timeout
- Network issues during downloads

## The Fix

### Improved Dockerfile

**Key Changes**:

1. **Removed OpenCode from template build**
   - Install it dynamically on first sandbox boot
   - Reduces template build complexity
   - Avoids installation script issues

2. **Simplified to essentials**
   - Only install: Git + Bun
   - Everything else at runtime

3. **Better environment setup**
   ```dockerfile
   ENV DEBIAN_FRONTEND=noninteractive  # No prompts
   ENV BUN_INSTALL="/root/.bun"        # Explicit Bun path
   ENV PATH="${BUN_INSTALL}/bin:${PATH}"
   ```

### Updated E2B Provider

Now installs OpenCode at runtime:

```typescript
// Install OpenCode CLI if not present
await sandbox.commands.run(
  "which opencode || bun install -g opencode || npm install -g opencode"
);
```

**Benefits**:
- Template builds faster
- More reliable (fewer failure points)
- OpenCode always gets latest version
- Falls back to npm if bun fails

## Current Template Status

Your template is building with the OLD Dockerfile. If it fails again, the next build will use the improved version.

## What to Do

### If Current Template Fails

1. The improved Dockerfile is already in place
2. Just run `./setup-e2b.sh` again
3. New template will use the simpler, more reliable build

### If Current Template Succeeds

Great! Use it as-is. The runtime OpenCode installation will happen automatically.

## Debugging Template Builds

### Check E2B Dashboard
Visit: https://e2b.dev/dashboard

Look for:
- Build logs
- Error messages
- Timeout indicators

### Common Error Messages

**"failed to solve: process ... exited with 1"**
- One of the RUN commands failed
- Check which layer failed in logs

**"context deadline exceeded"**
- Build timed out
- Template is too large or slow to build

**"curl: (7) Failed to connect"**
- Network issue downloading dependencies
- Retry the build

### Test Template Locally (Optional)

If you have Docker:
```bash
docker build -t test-opencode -f e2b.Dockerfile .
docker run -it test-opencode bash
# Inside container:
bun --version
git --version
```

## Next Steps

1. **Wait for current template** (~2-5 mins)
2. **If it fails**: Run `./setup-e2b.sh` again (uses improved Dockerfile)
3. **If it succeeds**: Test with `bun run dev`

The improved Dockerfile is more reliable and should have fewer build failures!
