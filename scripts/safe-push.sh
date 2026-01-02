#!/bin/bash

# Safe Push - Pull staging ก่อน push อัตโนมัติ
# Usage: ./scripts/safe-push.sh

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}🚀 Safe Push - Sync with staging before push${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Get current branch
CURRENT_BRANCH=$(git branch --show-current)

if [ "$CURRENT_BRANCH" = "staging" ] || [ "$CURRENT_BRANCH" = "main" ]; then
    echo -e "${RED}❌ Error: You're on $CURRENT_BRANCH branch${NC}"
    echo -e "${YELLOW}This script is for feature branches only${NC}"
    echo ""
    echo "Please switch to your feature branch:"
    echo "  git checkout feature/your-feature"
    exit 1
fi

echo -e "${GREEN}Current branch:${NC} $CURRENT_BRANCH"
echo ""

# Check if there are uncommitted changes
if ! git diff-index --quiet HEAD --; then
    echo -e "${RED}❌ Error: You have uncommitted changes${NC}"
    echo ""
    echo "Please commit your changes first:"
    echo "  git add ."
    echo "  git commit -m 'your message'"
    exit 1
fi

# Step 1: Fetch latest from origin
echo -e "${YELLOW}📡 Fetching latest from origin...${NC}"
git fetch origin
echo -e "${GREEN}✅ Fetch complete${NC}"
echo ""

# Step 2: Switch to staging
echo -e "${YELLOW}🔄 Switching to staging branch...${NC}"
git checkout staging
echo -e "${GREEN}✅ Switched to staging${NC}"
echo ""

# Step 3: Pull staging
echo -e "${YELLOW}📥 Pulling latest staging...${NC}"
BEFORE_PULL=$(git rev-parse HEAD)
git pull origin staging
AFTER_PULL=$(git rev-parse HEAD)

if [ "$BEFORE_PULL" = "$AFTER_PULL" ]; then
    echo -e "${GREEN}✅ Staging is already up to date${NC}"
else
    echo -e "${GREEN}✅ Staging updated with new changes${NC}"
    echo ""
    echo -e "${BLUE}New commits in staging:${NC}"
    git log --oneline $BEFORE_PULL..$AFTER_PULL
fi
echo ""

# Step 4: Switch back to feature branch
echo -e "${YELLOW}🔄 Switching back to $CURRENT_BRANCH...${NC}"
git checkout $CURRENT_BRANCH
echo -e "${GREEN}✅ Switched back to $CURRENT_BRANCH${NC}"
echo ""

# Step 5: Merge staging into feature branch
echo -e "${YELLOW}🔀 Merging staging into $CURRENT_BRANCH...${NC}"

if git merge staging --no-edit; then
    echo -e "${GREEN}✅ Merge successful!${NC}"
    echo ""
    
    # Step 6: Push to origin
    echo -e "${YELLOW}📤 Pushing $CURRENT_BRANCH to GitHub...${NC}"
    git push origin $CURRENT_BRANCH
    echo -e "${GREEN}✅ Push successful!${NC}"
    echo ""
    
    # Success message
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${GREEN}🎉 Success!${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
    echo -e "${GREEN}Your branch is now synced with staging and pushed to GitHub${NC}"
    echo ""
    echo -e "${YELLOW}Next steps:${NC}"
    echo "1. Go to GitHub"
    echo "2. Create a Pull Request"
    echo "3. Wait for review"
    echo ""
    
else
    # Merge conflict
    echo -e "${RED}❌ Merge conflict detected!${NC}"
    echo ""
    echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${YELLOW}⚠️  Action Required${NC}"
    echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
    echo -e "${YELLOW}Conflicts found in:${NC}"
    git diff --name-only --diff-filter=U
    echo ""
    echo -e "${YELLOW}How to resolve:${NC}"
    echo "1. Open the conflicted files"
    echo "2. Look for conflict markers:"
    echo "   <<<<<<< HEAD"
    echo "   your changes"
    echo "   ======="
    echo "   their changes"
    echo "   >>>>>>> staging"
    echo ""
    echo "3. Edit the files to resolve conflicts"
    echo "4. Remove the conflict markers"
    echo "5. Save the files"
    echo ""
    echo "6. Then run:"
    echo "   git add ."
    echo "   git commit -m 'merge: resolve conflicts with staging'"
    echo "   git push origin $CURRENT_BRANCH"
    echo ""
    exit 1
fi
