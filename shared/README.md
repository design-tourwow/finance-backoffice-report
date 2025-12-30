# Shared Code

This folder contains code that is shared across multiple modules.

## ⚠️ Important

**Changes to files in this folder affect ALL modules!**

- Always notify the team before making changes
- Get approval from @team-lead before merging
- Test changes with all modules
- Document breaking changes clearly

## 📁 Structure

```
shared/
├── auth.js           # Authentication utilities
├── api-base.js       # Base API configuration
├── utils.js          # Common utilities
├── constants.js      # Shared constants
├── error-handler.js  # Error handling
└── components/       # Shared UI components
```

## 🔐 Code Ownership

All files in this folder are owned by **@team-lead** (defined in `.github/CODEOWNERS`).

Any PR that modifies files here will automatically:
- Request review from @team-lead
- Require approval before merging
- Send notifications to the team

## 📝 Guidelines

### Before Making Changes

1. **Discuss with team** - Ensure changes won't break other modules
2. **Create feature branch** - Never commit directly to staging
3. **Write tests** - Ensure changes don't break existing functionality
4. **Document changes** - Update this README if needed

### When Adding New Shared Code

1. **Check if it's truly shared** - Used by 2+ modules?
2. **Keep it generic** - Don't add module-specific logic
3. **Document well** - Add JSDoc comments
4. **Add to this README** - List the new file

### Example: Adding New Shared Function

```javascript
// shared/utils.js

/**
 * Format currency in Thai Baht
 * @param {number} amount - Amount to format
 * @returns {string} Formatted currency string
 * @example
 * formatCurrency(1000) // "฿1,000.00"
 */
function formatCurrency(amount) {
  return new Intl.NumberFormat('th-TH', {
    style: 'currency',
    currency: 'THB'
  }).format(amount);
}
```

## 🧪 Testing

Before merging changes to shared code:

```bash
# Test with Tour Image Manager
# Test with Payment Module
# Test with Inventory Module
# Test with Analytics Module
```

## 📚 Files

### `auth.js`
Authentication and authorization utilities.

**Used by:** All modules

**Functions:**
- `getToken()` - Get auth token
- `setToken()` - Set auth token
- `hasToken()` - Check if token exists
- `removeToken()` - Remove auth token

### `api-base.js`
Base API configuration and utilities.

**Used by:** All modules

**Functions:**
- `baseURL` - Get API base URL
- `request()` - Make API request
- `handleResponse()` - Handle API response

### `utils.js`
Common utility functions.

**Used by:** All modules

**Functions:**
- `formatDateThai()` - Format date in Thai format
- `debounce()` - Debounce function
- `formatCurrency()` - Format currency

### `constants.js`
Shared constants and enums.

**Used by:** All modules

**Constants:**
- `HTTP_STATUS` - HTTP status codes
- `STORAGE_KEYS` - LocalStorage keys
- `ENVIRONMENTS` - Environment names

## 🚫 What NOT to Put Here

- Module-specific business logic
- Module-specific API endpoints
- Module-specific UI components
- Module-specific configurations

These should go in the respective module folders.

## 📞 Questions?

Contact @team-lead or ask in team chat.
