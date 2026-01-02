#!/bin/bash

# CODEOWNERS Ownership Checker
# Usage: ./scripts/check-ownership.sh [file-path]
# Example: ./scripts/check-ownership.sh tour-image-manager.js

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

CODEOWNERS_FILE=".github/CODEOWNERS"

# Function to print colored output
print_header() {
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
}

print_success() {
    echo -e "${GREEN}✓${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

# Check if CODEOWNERS file exists
if [ ! -f "$CODEOWNERS_FILE" ]; then
    print_error "CODEOWNERS file not found at $CODEOWNERS_FILE"
    exit 1
fi

# Function to check ownership of a specific file
check_file_ownership() {
    local file_path="$1"
    
    print_header "Checking ownership for: $file_path"
    
    # Read CODEOWNERS and find matching patterns
    local found=false
    local owners=""
    
    while IFS= read -r line; do
        # Skip comments and empty lines
        [[ "$line" =~ ^#.*$ ]] && continue
        [[ -z "$line" ]] && continue
        
        # Extract pattern and owners
        local pattern=$(echo "$line" | awk '{print $1}')
        local line_owners=$(echo "$line" | cut -d' ' -f2-)
        
        # Convert CODEOWNERS pattern to regex
        # Remove leading slash for matching
        local pattern_regex="${pattern#/}"
        pattern_regex="${pattern_regex//\*/.*}"
        
        # Check if file matches pattern
        if [[ "$file_path" =~ ^$pattern_regex ]]; then
            found=true
            owners="$line_owners"
            echo ""
            print_success "Match found!"
            echo -e "  ${YELLOW}Pattern:${NC} $pattern"
            echo -e "  ${GREEN}Owners:${NC} $owners"
        fi
    done < "$CODEOWNERS_FILE"
    
    if [ "$found" = false ]; then
        echo ""
        print_warning "No specific owner found. Using default owner."
    fi
    
    echo ""
}

# Function to show all ownership rules
show_all_rules() {
    print_header "All Ownership Rules"
    echo ""
    
    local section=""
    
    while IFS= read -r line; do
        # Detect section headers
        if [[ "$line" =~ ^#\ ={40,} ]]; then
            continue
        elif [[ "$line" =~ ^#\ [A-Z] ]]; then
            section=$(echo "$line" | sed 's/^# //')
            echo -e "${BLUE}${section}${NC}"
            continue
        fi
        
        # Skip other comments and empty lines
        [[ "$line" =~ ^#.*$ ]] && continue
        [[ -z "$line" ]] && continue
        
        # Extract pattern and owners
        local pattern=$(echo "$line" | awk '{print $1}')
        local owners=$(echo "$line" | cut -d' ' -f2-)
        
        echo -e "  ${YELLOW}${pattern}${NC} → ${GREEN}${owners}${NC}"
    done < "$CODEOWNERS_FILE"
    
    echo ""
}

# Function to show ownership by owner
show_by_owner() {
    print_header "Ownership by Owner"
    echo ""
    
    # Extract unique owners
    local owners=$(grep -v '^#' "$CODEOWNERS_FILE" | grep -v '^$' | awk '{for(i=2;i<=NF;i++) print $i}' | sort -u)
    
    for owner in $owners; do
        echo -e "${GREEN}${owner}${NC}"
        grep -v '^#' "$CODEOWNERS_FILE" | grep -v '^$' | grep "$owner" | awk '{print "  " $1}' | while read pattern; do
            echo -e "  ${YELLOW}${pattern}${NC}"
        done
        echo ""
    done
}

# Function to show ownership summary
show_summary() {
    print_header "Ownership Summary"
    echo ""
    
    # Count rules per owner
    local owners=$(grep -v '^#' "$CODEOWNERS_FILE" | grep -v '^$' | awk '{for(i=2;i<=NF;i++) print $i}' | sort | uniq -c | sort -rn)
    
    echo "$owners" | while read count owner; do
        echo -e "${GREEN}${owner}${NC}: ${YELLOW}${count}${NC} rules"
    done
    
    echo ""
    
    # Total rules
    local total=$(grep -v '^#' "$CODEOWNERS_FILE" | grep -v '^$' | wc -l | tr -d ' ')
    echo -e "Total rules: ${YELLOW}${total}${NC}"
    echo ""
}

# Main script
case "${1:-}" in
    "")
        # No argument - show all rules
        show_all_rules
        show_summary
        ;;
    "--by-owner"|"-o")
        # Show by owner
        show_by_owner
        ;;
    "--summary"|"-s")
        # Show summary only
        show_summary
        ;;
    "--help"|"-h")
        # Show help
        print_header "CODEOWNERS Ownership Checker"
        echo ""
        echo "Usage:"
        echo "  ./scripts/check-ownership.sh [file-path]     Check ownership of specific file"
        echo "  ./scripts/check-ownership.sh                 Show all ownership rules"
        echo "  ./scripts/check-ownership.sh --by-owner      Show ownership grouped by owner"
        echo "  ./scripts/check-ownership.sh --summary       Show ownership summary"
        echo "  ./scripts/check-ownership.sh --help          Show this help"
        echo ""
        echo "Examples:"
        echo "  ./scripts/check-ownership.sh tour-image-manager.js"
        echo "  ./scripts/check-ownership.sh modules/payment/payment.js"
        echo "  ./scripts/check-ownership.sh shared/auth.js"
        echo ""
        ;;
    *)
        # Check specific file
        check_file_ownership "$1"
        ;;
esac
