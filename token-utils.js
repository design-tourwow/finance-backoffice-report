// Token Utility - Check JWT token expiry and manage authentication
const TokenUtils = {
  /**
   * Get token from storage
   * @returns {string|null}
   */
  getToken() {
    return sessionStorage.getItem('authToken') || localStorage.getItem('authToken');
  },

  /**
   * Decode JWT token payload (without verification)
   * @param {string} token - JWT token
   * @returns {Object|null} - Decoded payload or null if invalid
   */
  decodeToken(token) {
    if (!token) return null;

    try {
      const parts = token.split('.');
      if (parts.length !== 3) {
        console.warn('[TokenUtils] Invalid token format');
        return null;
      }

      const payload = JSON.parse(atob(parts[1]));
      return payload;
    } catch (error) {
      console.error('[TokenUtils] Failed to decode token:', error.message);
      return null;
    }
  },

  /**
   * Check if token is expired
   * @param {string} token - JWT token (optional, will get from storage if not provided)
   * @returns {boolean} - true if expired or invalid, false if still valid
   */
  isTokenExpired(token = null) {
    const tokenToCheck = token || this.getToken();

    if (!tokenToCheck) {
      console.warn('[TokenUtils] No token found');
      return true;
    }

    const payload = this.decodeToken(tokenToCheck);

    if (!payload) {
      console.warn('[TokenUtils] Could not decode token');
      return true;
    }

    // Check exp claim
    if (!payload.exp) {
      console.warn('[TokenUtils] Token has no expiry claim');
      return false; // No expiry = assume valid
    }

    const now = Math.floor(Date.now() / 1000);
    const isExpired = payload.exp < now;

    if (isExpired) {
      console.warn('[TokenUtils] Token expired at:', new Date(payload.exp * 1000).toLocaleString('th-TH'));
    }

    return isExpired;
  },

  /**
   * Get token expiry date
   * @returns {Date|null}
   */
  getTokenExpiry() {
    const token = this.getToken();
    const payload = this.decodeToken(token);

    if (payload && payload.exp) {
      return new Date(payload.exp * 1000);
    }
    return null;
  },

  /**
   * Get time remaining until token expires (in seconds)
   * @returns {number} - Seconds remaining, 0 if expired, -1 if no token
   */
  getTimeRemaining() {
    const token = this.getToken();
    const payload = this.decodeToken(token);

    if (!payload || !payload.exp) {
      return -1;
    }

    const now = Math.floor(Date.now() / 1000);
    const remaining = payload.exp - now;

    return remaining > 0 ? remaining : 0;
  },

  /**
   * Clear token from storage
   */
  clearToken() {
    sessionStorage.removeItem('authToken');
    localStorage.removeItem('authToken');
    console.log('[TokenUtils] Token cleared from storage');
  },

  /**
   * Get login URL based on current environment
   * @returns {string}
   */
  getLoginUrl() {
    const hostname = window.location.hostname;

    if (hostname.includes('staging')) {
      return 'https://financebackoffice-staging2.tourwow.com/login';
    }
    return 'https://financebackoffice.tourwow.com/login';
  },

  /**
   * Redirect to login page
   * @param {string} message - Optional message to show before redirect
   */
  redirectToLogin(message = null) {
    if (message) {
      alert(message);
    }

    this.clearToken();

    const loginUrl = this.getLoginUrl();
    console.log('[TokenUtils] Redirecting to login:', loginUrl);
    window.location.href = loginUrl;
  },

  /**
   * Check token and redirect to login if expired
   * Call this before any action (load data, page change, etc.)
   * @param {boolean} showAlert - Whether to show alert message
   * @returns {boolean} - true if token is valid, false if expired (will redirect)
   */
  validateTokenOrRedirect(showAlert = true) {
    if (this.isTokenExpired()) {
      console.error('[TokenUtils] Token expired or invalid - redirecting to login');

      const message = showAlert
        ? 'Token หมดอายุหรือไม่ถูกต้อง\nกรุณาเข้าสู่ระบบใหม่อีกครั้ง'
        : null;

      this.redirectToLogin(message);
      return false;
    }

    return true;
  },

  /**
   * Wrap an async function with token validation
   * Use this to wrap any function that requires authentication
   * @param {Function} fn - Async function to wrap
   * @returns {Function} - Wrapped function that checks token first
   */
  withTokenValidation(fn) {
    return async (...args) => {
      if (!this.validateTokenOrRedirect()) {
        return null;
      }
      return await fn(...args);
    };
  }
};

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
  module.exports = TokenUtils;
}
