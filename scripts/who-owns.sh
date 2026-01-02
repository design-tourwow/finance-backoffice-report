#!/bin/bash

# Quick ownership checker
# Usage: ./scripts/who-owns.sh <file-path>

FILE="$1"

if [ -z "$FILE" ]; then
    echo "Usage: ./scripts/who-owns.sh <file-path>"
    echo ""
    echo "Examples:"
    echo "  ./scripts/who-owns.sh tour-image-manager.js"
    echo "  ./scripts/who-owns.sh shared/auth.js"
    echo "  ./scripts/who-owns.sh modules/payment/payment.js"
    exit 1
fi

echo "🔍 Checking ownership for: $FILE"
echo ""

# Use GitHub's CODEOWNERS syntax checker if available
if command -v gh &> /dev/null; then
    # GitHub CLI is installed
    gh api repos/:owner/:repo/codeowners/errors 2>/dev/null || true
fi

# Simple pattern matching
FOUND=false

while IFS= read -r line; do
    # Skip comments and empty lines
    [[ "$line" =~ ^#.*$ ]] && continue
    [[ -z "$line" ]] && continue
    
    PATTERN=$(echo "$line" | awk '{print $1}')
    OWNERS=$(echo "$line" | cut -d' ' -f2-)
    
    # Remove leading slash
    PATTERN_CLEAN="${PATTERN#/}"
    
    # Convert glob to regex
    PATTERN_REGEX="${PATTERN_CLEAN//\*/.*}"
    
    # Check match
    if [[ "$FILE" =~ ^$PATTERN_REGEX ]]; then
        FOUND=true
        echo "✅ Owner found!"
        echo "   Pattern: $PATTERN"
        echo "   Owners: $OWNERS"
        echo ""
    fi
done < .github/CODEOWNERS

if [ "$FOUND" = false ]; then
    echo "⚠️  No specific owner found"
    echo "   Using default owner from CODEOWNERS"
fi
