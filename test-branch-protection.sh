#!/bin/bash

echo "🧪 Testing Branch Protection..."
echo ""

# Create test branch
git checkout -b test/branch-protection-$(date +%s)

# Make a change
echo "# Test Branch Protection" > test-protection.txt
git add test-protection.txt
git commit -m "test: verify branch protection works"

# Push
git push origin HEAD

echo ""
echo "✅ Branch pushed successfully!"
echo ""
echo "📝 Next steps:"
echo "1. Go to GitHub"
echo "2. Create a Pull Request to 'staging'"
echo "3. Check if reviewers are auto-assigned"
echo "4. Try to merge without approval (should fail)"
echo ""
echo "Expected result:"
echo "- ✅ Code owners are automatically assigned as reviewers"
echo "- ⚠️  'Review required from Code Owners' message appears"
echo "- ❌ Merge button is disabled until approval"
echo ""
