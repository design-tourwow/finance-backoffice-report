#!/bin/bash

# Check Before Commit - ตรวจสอบว่าแก้ไฟล์ของใครบ้าง
# Usage: ./scripts/check-before-commit.sh

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

CODEOWNERS_FILE=".github/CODEOWNERS"

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}🔍 Check Before Commit${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Check if there are changes
if ! git diff --cached --name-only | grep -q .; then
    echo -e "${YELLOW}⚠️  No staged files${NC}"
    echo ""
    echo "Run: git add <files> first"
    exit 0
fi

# Get current user
CURRENT_USER=$(git config user.name)
echo -e "${GREEN}Current user:${NC} $CURRENT_USER"
echo ""

# Get staged files
echo -e "${YELLOW}📝 Files you're about to commit:${NC}"
echo ""

STAGED_FILES=$(git diff --cached --name-only)
HAS_WARNING=false
MY_FILES=()
OTHER_FILES=()
SHARED_FILES=()

while IFS= read -r file; do
    if [ -z "$file" ]; then
        continue
    fi
    
    # Find owner
    owner=""
    if [ -f "$CODEOWNERS_FILE" ]; then
        while IFS= read -r line; do
            # Skip comments and empty lines
            [[ "$line" =~ ^#.*$ ]] && continue
            [[ -z "$line" ]] && continue
            
            pattern=$(echo "$line" | awk '{print $1}')
            owners=$(echo "$line" | cut -d' ' -f2-)
            
            # Convert pattern to regex
            pattern_regex="${pattern#/}"
            pattern_regex="${pattern_regex//\*/.*}"
            
            # Check match
            if [[ "$file" =~ ^$pattern_regex ]]; then
                owner="$owners"
            fi
        done < "$CODEOWNERS_FILE"
    fi
    
    # Categorize files
    if [[ "$file" == shared/* ]]; then
        SHARED_FILES+=("$file|$owner")
        echo -e "  ${RED}🚨${NC} $file ${RED}(SHARED CODE!)${NC}"
        echo -e "     ${RED}Owner: $owner${NC}"
        echo -e "     ${YELLOW}⚠️  Affects ALL modules!${NC}"
        HAS_WARNING=true
    elif [[ "$owner" == *"@$CURRENT_USER"* ]]; then
        MY_FILES+=("$file|$owner")
        echo -e "  ${GREEN}✅${NC} $file"
        echo -e "     ${GREEN}Owner: $owner${NC}"
    elif [[ "$file" == shared/* ]] || [[ "$owner" == *"@team-lead"* ]]; then
        SHARED_FILES+=("$file|$owner")
        echo -e "  ${YELLOW}⚠️${NC}  $file ${YELLOW}(Shared code)${NC}"
        echo -e "     ${YELLOW}Owner: $owner${NC}"
        HAS_WARNING=true
    else
        OTHER_FILES+=("$file|$owner")
        echo -e "  ${RED}❌${NC} $file ${RED}(Not your file!)${NC}"
        echo -e "     ${RED}Owner: $owner${NC}"
        HAS_WARNING=true
    fi
    echo ""
done <<< "$STAGED_FILES"

# Summary
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}📊 Summary${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "${GREEN}✅ Your files:${NC} ${#MY_FILES[@]}"
echo -e "${RED}🚨 Shared files:${NC} ${#SHARED_FILES[@]}"
echo -e "${YELLOW}⚠️  Other's files:${NC} ${#OTHER_FILES[@]}"
echo ""

# Warnings
if [ "$HAS_WARNING" = true ]; then
    echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${YELLOW}⚠️  WARNING${NC}"
    echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
    
    if [ ${#SHARED_FILES[@]} -gt 0 ]; then
        echo -e "${RED}🚨 You're modifying SHARED CODE:${NC}"
        for item in "${SHARED_FILES[@]}"; do
            file=$(echo "$item" | cut -d'|' -f1)
            owner=$(echo "$item" | cut -d'|' -f2)
            echo -e "   - $file (Owner: $owner)"
        done
        echo ""
        echo -e "${RED}⚠️  CRITICAL: Shared code affects ALL modules!${NC}"
        echo ""
        echo -e "${YELLOW}💡 Required Actions:${NC}"
        echo -e "   1. ✅ Did you notify team lead?"
        echo -e "   2. ✅ Did you get approval?"
        echo -e "   3. ✅ Did you test ALL modules?"
        echo -e "   4. ✅ Did you update shared/README.md?"
        echo -e "   5. ✅ Is it backward compatible?"
        echo ""
        echo -e "${YELLOW}📖 See: SHARED_CODE_WORKFLOW.md${NC}"
        echo ""
    fi
    
    if [ ${#OTHER_FILES[@]} -gt 0 ]; then
        echo -e "${RED}❌ You're modifying files owned by others:${NC}"
        for item in "${OTHER_FILES[@]}"; do
            file=$(echo "$item" | cut -d'|' -f1)
            owner=$(echo "$item" | cut -d'|' -f2)
            echo -e "   - $file (Owner: $owner)"
        done
        echo ""
        echo -e "${YELLOW}💡 Actions:${NC}"
        echo -e "   1. Make sure you have permission to modify these files"
        echo -e "   2. Coordinate with the file owners"
        echo -e "   3. They will be auto-assigned as reviewers in PR"
        echo ""
    fi
    
    if [ ${#SHARED_FILES[@]} -gt 0 ]; then
        echo -e "${YELLOW}⚠️  You're modifying shared code:${NC}"
        for item in "${SHARED_FILES[@]}"; do
            file=$(echo "$item" | cut -d'|' -f1)
            owner=$(echo "$item" | cut -d'|' -f2)
            echo -e "   - $file (Owner: $owner)"
        done
        echo ""
        echo -e "${YELLOW}💡 Actions:${NC}"
        echo -e "   1. Make sure changes don't break other modules"
        echo -e "   2. Coordinate with team lead"
        echo -e "   3. Test thoroughly"
        echo ""
    fi
    
    echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
    
    # Ask for confirmation
    read -p "Do you want to continue with commit? (y/N): " -n 1 -r
    echo ""
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo -e "${RED}❌ Commit cancelled${NC}"
        exit 1
    fi
else
    echo -e "${GREEN}✅ All files are yours. Safe to commit!${NC}"
fi

echo ""
echo -e "${GREEN}✅ Ready to commit${NC}"
echo ""
