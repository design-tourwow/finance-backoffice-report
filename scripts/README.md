# Scripts

Utility scripts for the Finance Backoffice Report project.

## 📁 Available Scripts

### `check-ownership.sh`
Complete ownership checker with multiple viewing modes.

**Usage:**
```bash
# Check specific file
./scripts/check-ownership.sh tour-image-manager.js

# Show all rules
./scripts/check-ownership.sh

# Show by owner
./scripts/check-ownership.sh --by-owner

# Show summary
./scripts/check-ownership.sh --summary

# Show help
./scripts/check-ownership.sh --help
```

**Examples:**
```bash
# Check who owns tour-image-manager.js
./scripts/check-ownership.sh tour-image-manager.js

# Check who owns shared/auth.js
./scripts/check-ownership.sh shared/auth.js

# Check who owns payment module
./scripts/check-ownership.sh modules/payment/payment.js
```

### `who-owns.sh`
Quick ownership checker (simplified version).

**Usage:**
```bash
./scripts/who-owns.sh <file-path>
```

**Examples:**
```bash
./scripts/who-owns.sh tour-image-manager.js
./scripts/who-owns.sh shared/auth.js
./scripts/who-owns.sh modules/payment/payment.js
```

## 🌐 Web-based Viewer

### `codeowners-viewer.html`
Visual ownership viewer in your browser.

**Usage:**
```bash
# Open in browser
open codeowners-viewer.html

# Or on Linux
xdg-open codeowners-viewer.html

# Or just double-click the file
```

**Features:**
- 🔍 Search by file or owner
- 📊 View all rules
- 👥 Group by owner
- 📈 Statistics view
- 📱 Mobile responsive

## 🚀 Quick Start

### Method 1: Command Line (Fast)

```bash
# Make scripts executable (first time only)
chmod +x scripts/*.sh

# Check a file
./scripts/who-owns.sh tour-image-manager.js
```

### Method 2: Web Viewer (Visual)

```bash
# Open in browser
open codeowners-viewer.html
```

### Method 3: GitHub (Online)

```bash
# View on GitHub
# Go to: https://github.com/your-org/your-repo/blob/staging/.github/CODEOWNERS
```

## 📖 Examples

### Example 1: Check your own files

```bash
$ ./scripts/who-owns.sh tour-image-manager.js

🔍 Checking ownership for: tour-image-manager.js

✅ Owner found!
   Pattern: /tour-image-manager*
   Owners: @current-maintainer
```

### Example 2: Check shared files

```bash
$ ./scripts/who-owns.sh shared/auth.js

🔍 Checking ownership for: shared/auth.js

✅ Owner found!
   Pattern: /shared/*
   Owners: @team-lead
```

### Example 3: Check module files

```bash
$ ./scripts/who-owns.sh modules/payment/payment.js

🔍 Checking ownership for: modules/payment/payment.js

✅ Owner found!
   Pattern: /modules/payment/
   Owners: @vibe-payment-dev
```

### Example 4: View all rules

```bash
$ ./scripts/check-ownership.sh

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
All Ownership Rules
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

DEFAULT OWNERS
  * → @team-lead

SHARED CODE
  /shared/ → @team-lead
  /shared/* → @team-lead

TOUR IMAGE MANAGER MODULE
  /tour-image-manager* → @current-maintainer

...
```

### Example 5: View by owner

```bash
$ ./scripts/check-ownership.sh --by-owner

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Ownership by Owner
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

@team-lead
  *
  /shared/
  /shared/*
  /config/
  *.config.js
  /vercel.json

@current-maintainer
  /tour-image-manager*

@vibe-payment-dev
  /modules/payment/
  /payment*

...
```

## 🔧 Troubleshooting

### Scripts not executable?

```bash
chmod +x scripts/*.sh
```

### Permission denied?

```bash
# Run with bash explicitly
bash scripts/who-owns.sh tour-image-manager.js
```

### CODEOWNERS file not found?

```bash
# Check if file exists
ls -la .github/CODEOWNERS

# If not, create it first
# See .github/CODEOWNERS_SETUP.md
```

## 📚 Related Documentation

- `.github/CODEOWNERS` - Main ownership file
- `.github/CODEOWNERS_SETUP.md` - Setup guide
- `CODEOWNERS_QUICKSTART.md` - Quick start guide

## 💡 Tips

### Tip 1: Add to your workflow

```bash
# Before creating a PR, check ownership
./scripts/who-owns.sh path/to/file.js

# This tells you who will review your PR
```

### Tip 2: Use in Git hooks

```bash
# Add to .git/hooks/pre-commit
#!/bin/bash
./scripts/check-ownership.sh --summary
```

### Tip 3: Bookmark the viewer

```bash
# Add to browser bookmarks
file:///path/to/project/codeowners-viewer.html
```

## 🆘 Need Help?

1. Check `.github/CODEOWNERS_SETUP.md`
2. Run `./scripts/check-ownership.sh --help`
3. Ask in team chat
4. Contact @team-lead
