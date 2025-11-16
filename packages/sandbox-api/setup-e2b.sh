#!/bin/bash

# Setup script for E2B sandbox (no Docker required)
set -e

echo "🚀 E2B Sandbox Setup (No Docker Required)"
echo "=========================================="
echo ""

# Check if E2B CLI is installed
if ! command -v e2b &> /dev/null; then
    echo "❌ E2B CLI not found. Installing..."
    npm install -g @e2b/cli
    echo "✅ E2B CLI installed"
else
    echo "✅ E2B CLI found: $(e2b --version)"
fi

echo ""
echo "📝 Step 1: Login to E2B"
echo "This will open your browser for authentication..."
e2b auth login

echo ""
echo "🏗️  Step 2: Building OpenCode template (using E2B cloud builder)"
echo "This may take 2-3 minutes..."
echo ""

# Generate unique template name with timestamp
TEMPLATE_NAME="opencode-$(date +%s)"
echo "   Template name: $TEMPLATE_NAME"
echo ""

# Build template using E2B's cloud builder (no Docker needed)
TEMPLATE_OUTPUT=$(e2b template build \
    --name "$TEMPLATE_NAME" \
    --dockerfile e2b.Dockerfile \
    2>&1)

echo "$TEMPLATE_OUTPUT"

# Extract template ID from output (handles both old and new E2B CLI output formats)
TEMPLATE_ID=$(echo "$TEMPLATE_OUTPUT" | grep -oE '(tpl_[a-z0-9]+|[a-z0-9]{20})' | head -1)

# If we got a 20-char alphanumeric ID, that's the new format
if [ ${#TEMPLATE_ID} -eq 20 ]; then
    echo "   Detected new template ID format: $TEMPLATE_ID"
fi

if [ -z "$TEMPLATE_ID" ]; then
    echo ""
    echo "❌ Failed to get template ID from output"
    echo "Please check the output above and manually set E2B_TEMPLATE_ID in .env"
    exit 1
fi

echo ""
echo "✅ Template built successfully!"
echo "   Template ID: $TEMPLATE_ID"

# Update .env file
echo ""
echo "📝 Step 3: Configuring environment"

# Read existing API key if .env exists
EXISTING_API_KEY=""
if [ -f .env ]; then
    # Backup existing .env
    cp .env .env.backup
    echo "   Backed up existing .env to .env.backup"
    
    # Extract existing API key
    EXISTING_API_KEY=$(grep -E '^E2B_API_KEY=' .env | cut -d'=' -f2)
fi

# Use existing API key or environment variable or placeholder
FINAL_API_KEY="${EXISTING_API_KEY:-${E2B_API_KEY:-your_e2b_api_key_here}}"

# Create or update .env
cat > .env << EOF
# E2B Configuration
E2B_API_KEY=$FINAL_API_KEY
E2B_TEMPLATE_ID=$TEMPLATE_ID

# Server configuration
PORT=3001
NODE_ENV=development

# Sandbox configuration
SANDBOX_TIMEOUT_MS=1800000
MAX_SANDBOXES_PER_IP=10

# Redis (optional)
REDIS_URL=redis://localhost:6379
EOF

echo "   Updated .env file with template ID: $TEMPLATE_ID"
echo "   Preserved API key: ${FINAL_API_KEY:0:10}..."

# Check if E2B_API_KEY needs to be set manually
if [ "$FINAL_API_KEY" = "your_e2b_api_key_here" ]; then
    echo ""
    echo "⚠️  IMPORTANT: You need to set your E2B_API_KEY"
    echo "   1. Get your API key from: https://e2b.dev/dashboard"
    echo "   2. Edit .env and replace 'your_e2b_api_key_here' with your actual key"
    echo ""
else
    echo ""
    echo "✅ Setup complete!"
    echo ""
    echo "🎯 Next steps:"
    echo "   1. Start the sandbox API: bun run dev"
    echo "   2. In another terminal, start the frontend: cd ../.. && bun run dev"
    echo "   3. Visit: http://localhost:3000/:owner/:repo"
    echo ""
    echo "   Example: http://localhost:3000/colinhacks/zod"
fi

echo ""
echo "📚 For more info, see E2B_SETUP_GUIDE.md"
