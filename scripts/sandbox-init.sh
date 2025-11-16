#!/bin/bash
set -e

# Sandbox initialization script
# This script runs when a new sandbox is created

echo "🚀 OpenCode Sandbox Initializing..."

# Environment variables expected:
# - REPO_URL: GitHub repository URL
# - REPO_BRANCH: Branch to clone (default: main)
# - OPENCODE_PORT: Port for OpenCode server (default: 4096)

REPO_URL=${REPO_URL:-""}
REPO_BRANCH=${REPO_BRANCH:-"main"}
OPENCODE_PORT=${OPENCODE_PORT:-4096}

if [ -z "$REPO_URL" ]; then
  echo "❌ REPO_URL environment variable is required"
  exit 1
fi

echo "📦 Cloning repository: $REPO_URL (branch: $REPO_BRANCH)"
cd /home/user/repo

# Clone with fallback for branch
git clone --depth 1 --branch "$REPO_BRANCH" "$REPO_URL" . || \
  git clone --depth 1 "$REPO_URL" .

echo "✅ Repository cloned successfully"

# Auto-detect and install dependencies
if [ -f "package.json" ]; then
  echo "📦 Installing Node.js dependencies..."
  bun install
elif [ -f "requirements.txt" ]; then
  echo "📦 Installing Python dependencies..."
  pip install -r requirements.txt
elif [ -f "Cargo.toml" ]; then
  echo "📦 Building Rust project..."
  cargo build
fi

echo "🔌 Starting OpenCode server on port $OPENCODE_PORT..."

# Start OpenCode server
# Replace with actual OpenCode CLI command
opencode serve --port "$OPENCODE_PORT" --host 0.0.0.0
