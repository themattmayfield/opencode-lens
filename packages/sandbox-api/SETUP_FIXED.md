# Setup Issues Fixed ✅

## Issues Resolved

### 1. ✅ Template Name Conflict
**Error**: `Alias 'opencode-sandbox' already used`

**Fix**: Setup script now generates unique template names with timestamps
- Example: `opencode-1731703456`
- No more global naming conflicts

### 2. ✅ Wrong Login Command
**Error**: `login is an unknown command`

**Fix**: Updated all documentation and scripts to use `e2b auth login`
- Before: `e2b login` ❌
- After: `e2b auth login` ✅

## Ready to Go!

Run the setup script now:

```bash
cd packages/sandbox-api
./setup-e2b.sh
```

This will:
1. Install E2B CLI (if needed)
2. Run `e2b auth login` (opens browser)
3. Build unique template: `opencode-<timestamp>`
4. Extract template ID (e.g., `tpl_abc123`)
5. Create `.env` with template ID

Then:
1. Get API key from https://e2b.dev/dashboard
2. Add to `.env`: `E2B_API_KEY=e2b_xxx`
3. Run `bun run dev`

## Files Updated

- `setup-e2b.sh` - Fixed login command
- `E2B_SETUP_GUIDE.md` - All commands updated
- `SANDBOX_QUICK_START.md` - All commands updated
- `packages/sandbox-api/README.md` - All commands updated
- All other documentation files

## Quick Reference

```bash
# Correct E2B commands:
e2b auth login                    # Login (not "e2b login")
e2b template build                # Build template
e2b template list                 # List your templates
e2b auth logout                   # Logout
```

Everything should work now! 🎉
