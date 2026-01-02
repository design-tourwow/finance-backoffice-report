#!/bin/bash

# Check GitHub Repository Permissions
# Usage: ./scripts/check-permissions.sh

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}🔍 GitHub Repository Permissions${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Check if gh is installed
if ! command -v gh &> /dev/null; then
    echo -e "${RED}❌ GitHub CLI (gh) is not installed${NC}"
    echo ""
    echo "Install with:"
    echo "  brew install gh"
    echo ""
    exit 1
fi

# Get repository info
REPO=$(gh repo view --json nameWithOwner -q .nameWithOwner)

if [ -z "$REPO" ]; then
    echo -e "${RED}❌ Not in a GitHub repository${NC}"
    exit 1
fi

echo -e "${GREEN}Repository:${NC} $REPO"
echo ""

# Get collaborators
echo -e "${YELLOW}👥 Collaborators:${NC}"
echo ""

gh api "repos/$REPO/collaborators" --jq '.[] | {login: .login, permissions: .permissions}' | \
while IFS= read -r line; do
    if [[ $line == "{"* ]]; then
        # Start of new user
        user_data="$line"
        while IFS= read -r next_line; do
            user_data="$user_data$next_line"
            if [[ $next_line == "}" ]]; then
                break
            fi
        done
        
        # Parse user data
        username=$(echo "$user_data" | grep -o '"login": "[^"]*"' | cut -d'"' -f4)
        admin=$(echo "$user_data" | grep -o '"admin": [^,}]*' | cut -d' ' -f2)
        push=$(echo "$user_data" | grep -o '"push": [^,}]*' | cut -d' ' -f2)
        
        # Determine role
        if [ "$admin" = "true" ]; then
            role="Admin"
            color=$RED
        elif [ "$push" = "true" ]; then
            role="Write"
            color=$GREEN
        else
            role="Read"
            color=$YELLOW
        fi
        
        echo -e "  ${color}●${NC} ${BLUE}@$username${NC} - $role"
        
        # Show permissions
        echo "$user_data" | grep -o '"[a-z]*": [^,}]*' | while read perm; do
            perm_name=$(echo "$perm" | cut -d'"' -f2)
            perm_value=$(echo "$perm" | awk '{print $2}')
            
            if [ "$perm_name" != "login" ]; then
                if [ "$perm_value" = "true" ]; then
                    echo -e "    ✅ $perm_name"
                else
                    echo -e "    ❌ $perm_name"
                fi
            fi
        done
        echo ""
    fi
done

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "${YELLOW}💡 Permission Levels:${NC}"
echo -e "  ${RED}●${NC} Admin    - Full control (settings, delete repo)"
echo -e "  ${GREEN}●${NC} Write    - Push code, merge PRs"
echo -e "  ${YELLOW}●${NC} Read     - View only"
echo ""
