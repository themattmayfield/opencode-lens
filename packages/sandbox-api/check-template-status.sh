#!/bin/bash

# Check E2B template build status
set -e

echo "🔍 Checking template build status..."
echo ""

# Get the template ID from .env
TEMPLATE_ID=$(grep -E '^E2B_TEMPLATE_ID=' .env 2>/dev/null | cut -d'=' -f2)

if [ -z "$TEMPLATE_ID" ]; then
    echo "❌ No E2B_TEMPLATE_ID found in .env"
    echo "Run ./setup-e2b.sh first"
    exit 1
fi

echo "Template ID: $TEMPLATE_ID"
echo ""

# Check status
e2b template list | grep "$TEMPLATE_ID" || echo "Template not found"

echo ""
echo "📝 Template build can take 2-5 minutes."
echo "   Status should change from 'waiting' → 'building' → 'ready'"
echo ""
echo "💡 Once status is 'ready', you can start the server:"
echo "   bun run dev"
