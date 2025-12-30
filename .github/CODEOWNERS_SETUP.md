# CODEOWNERS Setup Guide

## 📋 Quick Start

### Step 1: Update CODEOWNERS File

Replace the placeholder usernames in `.github/CODEOWNERS` with actual GitHub usernames:

```bash
# Open the file
nano .github/CODEOWNERS

# Replace these placeholders:
@team-lead              → Your team lead's GitHub username
@current-maintainer     → Tour Image Manager owner
@vibe-payment-dev       → Payment module owner
@vibe-inventory-dev     → Inventory module owner
@vibe-analytics-dev     → Analytics module owner
```

### Step 2: Enable Branch Protection

1. Go to your GitHub repository
2. Click **Settings** → **Branches**
3. Click **Add rule** or edit existing rule
4. Configure for `staging` branch:

```
Branch name pattern: staging

☑️ Require a pull request before merging
   ├─ ☑️ Require approvals: 1
   ├─ ☑️ Dismiss stale pull request approvals when new commits are pushed
   └─ ☑️ Require review from Code Owners ← IMPORTANT!

☑️ Require status checks to pass before merging

☑️ Require conversation resolution before merging

☑️ Include administrators

☐ Allow force pushes (keep unchecked)
☐ Allow deletions (keep unchecked)
```

5. Click **Create** or **Save changes**

### Step 3: Test It

Create a test Pull Request:

```bash
# Create a test branch
git checkout -b test/codeowners

# Modify a file
echo "test" >> test.txt

# Commit and push
git add test.txt
git commit -m "test: verify CODEOWNERS works"
git push origin test/codeowners
```

Then create a PR on GitHub and verify:
- ✅ Correct reviewers are auto-assigned
- ✅ PR shows "Review required from Code Owners"
- ✅ Cannot merge without approval

## 📚 How It Works

### When You Create a PR

1. **GitHub analyzes changed files**
   - Checks which files were modified
   - Matches files against CODEOWNERS patterns

2. **Auto-assigns reviewers**
   - Adds code owners as required reviewers
   - Sends notifications to owners

3. **Blocks merge until approved**
   - PR cannot be merged without owner approval
   - Shows clear status in PR

### Example Scenarios

#### Scenario 1: Member 2 modifies Payment module

```bash
# Member 2 creates branch
git checkout -b feature/fix-payment

# Modifies payment file
nano modules/payment/payment.js

# Commits and pushes
git commit -am "fix: payment bug"
git push origin feature/fix-payment
```

**Result:**
- ✅ @vibe-payment-dev auto-assigned as reviewer
- ✅ @team-lead also assigned (default owner)
- ⚠️ Cannot merge until @vibe-payment-dev approves

#### Scenario 2: Anyone modifies shared code

```bash
# Modifies shared file
nano shared/auth.js
git commit -am "feat: update auth"
git push origin feature/update-auth
```

**Result:**
- ✅ @team-lead auto-assigned (shared code owner)
- ⚠️ Cannot merge until @team-lead approves

## 🎯 Best Practices

### 1. Keep CODEOWNERS Updated

When adding new modules:

```bash
# Edit CODEOWNERS
nano .github/CODEOWNERS

# Add new module
/modules/new-module/ @new-module-owner

# Commit
git add .github/CODEOWNERS
git commit -m "docs: add new module to CODEOWNERS"
```

### 2. Use Specific Patterns

```
# ❌ Too broad
*.js @team-lead

# ✅ Specific
/modules/payment/*.js @payment-dev
```

### 3. Document Ownership

Add comments explaining why certain files need specific owners:

```
# Payment processing - requires security review
/modules/payment/payment-processor.js @payment-dev @security-team
```

### 4. Review Quarterly

Schedule quarterly reviews to ensure CODEOWNERS is still accurate:
- Remove owners who left the team
- Add new team members
- Update module ownership

## 🔧 Troubleshooting

### CODEOWNERS not working?

**Check:**
1. ✅ File is at `.github/CODEOWNERS` (not `github/CODEOWNERS`)
2. ✅ Branch Protection is enabled
3. ✅ "Require review from Code Owners" is checked
4. ✅ Usernames have `@` prefix
5. ✅ Users are collaborators in the repo

### Not receiving notifications?

**Check:**
1. ✅ GitHub notification settings
2. ✅ Email preferences
3. ✅ Watch settings for the repository

### Wrong reviewers assigned?

**Check:**
1. ✅ Pattern matching order (last match wins)
2. ✅ File paths are correct
3. ✅ Usernames are correct

## 📖 Pattern Examples

```bash
# Specific file
/tour-image-manager.js @owner

# All files in folder (recursive)
/modules/payment/ @owner

# All files in folder (non-recursive)
/modules/payment/* @owner

# All files with extension
*.config.js @owner

# Files matching pattern
/payment-*.js @owner

# Multiple owners (any one can approve)
/shared/* @owner1 @owner2 @owner3

# Nested folders
/modules/**/api/ @api-team
```

## 🚀 Advanced Usage

### Multiple Owners

Require approval from ANY of the listed owners:

```
/shared/* @team-lead @senior-dev @architect
```

### Team-based Ownership

Use GitHub teams instead of individuals:

```
/modules/payment/ @tourwow/payment-team
/modules/inventory/ @tourwow/inventory-team
```

### Granular Control

Different owners for different file types:

```
/modules/payment/*.js @payment-dev
/modules/payment/*.css @designer
/modules/payment/*.test.js @qa-team
```

## 📞 Support

If you have questions about CODEOWNERS:
1. Check this guide
2. Ask in team chat
3. Contact @team-lead

## 🔗 Resources

- [GitHub CODEOWNERS Documentation](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/about-code-owners)
- [Branch Protection Rules](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/defining-the-mergeability-of-pull-requests/about-protected-branches)
