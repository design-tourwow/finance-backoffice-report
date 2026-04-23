// shared-auth-guard.js — JWT auth guard, self-running IIFE
// Must load AFTER token-utils.js, BEFORE any page-specific JS.
// Depends on: window.TokenUtils (token-utils.js)

(function () {
  'use strict';

  // 1. Check for ?token=xxx in the URL
  var urlParams = new URLSearchParams(window.location.search);
  var urlToken = urlParams.get('token');

  if (urlToken) {
    // Save to both storages so TokenUtils.getToken() finds it
    sessionStorage.setItem('authToken', urlToken);
    localStorage.setItem('authToken', urlToken);
    console.log('[SharedAuthGuard] Token saved from URL query param');

    // Remove ?token from the visible URL without reloading
    urlParams.delete('token');
    var newSearch = urlParams.toString();
    var newUrl = window.location.pathname + (newSearch ? '?' + newSearch : '') + window.location.hash;
    history.replaceState(null, '', newUrl);
  }

  // 2. After saving (or skipping) URL token, verify storage has a valid token
  var token = TokenUtils.getToken();

  if (!token) {
    console.warn('[SharedAuthGuard] No token found — redirecting to /401');
    TokenUtils.redirectToUnauthorizedPage();
    return; // stop execution; redirect is in-flight
  }

  if (TokenUtils.isTokenExpired(token)) {
    console.warn('[SharedAuthGuard] Token expired — redirecting to /401');
    TokenUtils.redirectToUnauthorizedPage();
    return; // stop execution; redirect is in-flight
  }

  // Token exists — page load continues normally.
  console.log('[SharedAuthGuard] Token present, continuing page load');

})();
