# GitHub Configuration

This folder contains GitHub-specific configuration files for the Finance Backoffice Report project.

## 📁 Files

### `CODEOWNERS`
Defines code ownership for automatic review requests.

**Purpose:**
- Automatically assigns reviewers when PRs are created
- Ensures code changes are reviewed by the right people
- Prevents unauthorized changes to critical files

**Setup Required:**
1. Replace placeholder usernames with actual GitHub usernames
2. Enable Branch Protection with "Require review from Code Owners"
3. See `CODEOWNERS_SETUP.md` for detailed instructions

### `CODEOWNERS_SETUP.md`
Complete setup guide for CODEOWNERS functionality.

**Includes:**
- Step-by-step setup instructions
- How it works
- Example scenarios
- Troubleshooting guide
- Best practices

### `pull_request_template.md`
Template for Pull Requests.

**Purpose:**
- Ensures PRs have consistent format
- Prompts for important information
- Helps reviewers understand changes
- Improves code review quality

**Features:**
- Description section
- Type of change checklist
- Module/feature selection
- Breaking changes warning
- Testing checklist
- Screenshots section

## 🚀 Quick Start

### 1. Setup CODEOWNERS

```bash
# Edit CODEOWNERS file
nano .github/CODEOWNERS

# Replace placeholders with actual usernames:
# @team-lead → @actual-team-lead-username
# @current-maintainer → @actual-maintainer-username
# etc.
```

### 2. Enable Branch Protection

Go to: **Settings** → **Branches** → **Add rule**

Configure for `staging` branch:
- ☑️ Require pull request reviews
- ☑️ Require review from Code Owners ← **Important!**
- ☑️ Require approvals: 1

### 3. Test It

```bash
# Create test PR
git checkout -b test/codeowners
echo "test" >> test.txt
git add test.txt
git commit -m "test: verify CODEOWNERS"
git push origin test/codeowners

# Create PR on GitHub and verify reviewers are auto-assigned
```

## 📚 Documentation

- [CODEOWNERS Setup Guide](./CODEOWNERS_SETUP.md) - Complete setup instructions
- [GitHub CODEOWNERS Docs](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/about-code-owners)
- [Branch Protection Docs](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/defining-the-mergeability-of-pull-requests/about-protected-branches)

## 🎯 Ownership Structure

```
├── Shared Code → @team-lead
├── Tour Image Manager → @current-maintainer
├── Payment Module → @vibe-payment-dev
├── Inventory Module → @vibe-inventory-dev
├── Analytics Module → @vibe-analytics-dev
└── Config Files → @team-lead
```

## 🔧 Maintenance

### Adding New Modules

When adding a new module, update CODEOWNERS:

```bash
# Edit CODEOWNERS
nano .github/CODEOWNERS

# Add new module section
# New Module
/modules/new-module/ @new-module-owner
/new-module* @new-module-owner

# Commit
git add .github/CODEOWNERS
git commit -m "docs: add new module to CODEOWNERS"
git push origin staging
```

### Updating Ownership

When team members change:

```bash
# Edit CODEOWNERS
nano .github/CODEOWNERS

# Update usernames
# Old: /modules/payment/ @old-owner
# New: /modules/payment/ @new-owner

# Commit
git add .github/CODEOWNERS
git commit -m "docs: update module ownership"
git push origin staging
```

## 🐛 Troubleshooting

### CODEOWNERS not working?

1. Check file location: `.github/CODEOWNERS` (not `github/CODEOWNERS`)
2. Verify Branch Protection is enabled
3. Ensure "Require review from Code Owners" is checked
4. Confirm usernames have `@` prefix
5. Verify users are collaborators

### Not receiving notifications?

1. Check GitHub notification settings
2. Verify email preferences
3. Check repository watch settings

## 📞 Support

For questions or issues:
1. Read `CODEOWNERS_SETUP.md`
2. Check troubleshooting section
3. Ask in team chat
4. Contact @team-lead

## 🔗 Related Files

- `/DEPLOYMENT_WORKFLOW.md` - Deployment process
- `/DEVELOPER_GUIDE.md` - Development guidelines
- `/TESTING.md` - Testing guidelines
