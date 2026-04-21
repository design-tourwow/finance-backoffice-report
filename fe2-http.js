// fe2-http.js — Central HTTP client with auth header injection,
// 401 redirect handling, and error normalisation.
// Exposes window.FE2Http (IIFE).
// Depends on: window.TokenUtils (token-utils.js), browser fetch.

(function () {
  'use strict';

  // ---------------------------------------------------------------------------
  // Internal helpers
  // ---------------------------------------------------------------------------

  /**
   * Build a query string from a plain object.
   * Skips keys whose value is undefined, null, or empty string.
   * Uses encodeURIComponent on both keys and values.
   * Returns '' when no valid pairs exist, otherwise a string starting with '?'.
   * @param {Object} obj
   * @returns {string}
   */
  function buildQuery(obj) {
    if (!obj || typeof obj !== 'object') return '';

    var parts = [];
    var keys = Object.keys(obj);
    for (var i = 0; i < keys.length; i++) {
      var key = keys[i];
      var value = obj[key];
      if (value === undefined || value === null || value === '') continue;
      parts.push(encodeURIComponent(key) + '=' + encodeURIComponent(value));
    }

    return parts.length > 0 ? '?' + parts.join('&') : '';
  }

  /**
   * Return the Authorization header value for the current token.
   * Returns undefined if no token so fetch omits the header.
   * @returns {string|undefined}
   */
  function getAuthHeader() {
    var token = window.TokenUtils && typeof window.TokenUtils.getToken === 'function'
      ? window.TokenUtils.getToken()
      : null;
    return token ? 'Bearer ' + token : undefined;
  }

  /**
   * Resolve a request URL from a path + optional baseUrl override.
   * Absolute http(s) paths are returned as-is.
   * @param {string} path
   * @param {string} [baseUrl]
   * @returns {string}
   */
  function resolveUrl(path, baseUrl) {
    if (typeof path === 'string' && /^https?:\/\//i.test(path)) {
      return path;
    }
    var base = baseUrl || window.FE2_API_BASE_URL || '';
    return base + path;
  }

  /**
   * Build the headers object for a request, merging caller-supplied headers
   * on top of defaults. Authorization is added only if a token exists.
   * @param {Object} [extraHeaders]
   * @param {boolean} [includeContentType]
   * @returns {Object}
   */
  function buildHeaders(extraHeaders, includeContentType) {
    var headers = {};
    if (includeContentType) {
      headers['Content-Type'] = 'application/json';
    }
    var auth = getAuthHeader();
    if (auth) {
      headers['Authorization'] = auth;
    }
    if (extraHeaders && typeof extraHeaders === 'object') {
      var keys = Object.keys(extraHeaders);
      for (var i = 0; i < keys.length; i++) {
        headers[keys[i]] = extraHeaders[keys[i]];
      }
    }
    return headers;
  }

  /**
   * Safely read a response body as text for diagnostics.
   * Never throws — returns '' if the body can't be read.
   * @param {Response} response
   * @returns {Promise<string>}
   */
  async function safeReadText(response) {
    try {
      return await response.text();
    } catch (err) {
      return '';
    }
  }

  /**
   * Handle a 401 Unauthorized response by redirecting to login and
   * returning a never-resolving promise so callers don't continue
   * rendering stale state.
   * @returns {Promise<never>}
   */
  function handleUnauthorized() {
    console.warn('[FE2Http] 401 Unauthorized — redirecting to login');
    if (window.TokenUtils && typeof window.TokenUtils.redirectToLogin === 'function') {
      window.TokenUtils.redirectToLogin('Session หมดอายุ กรุณา login อีกครั้ง');
    }
    return new Promise(function () {});
  }

  /**
   * Core request runner used by both get() and post().
   * @param {string} method
   * @param {string} url
   * @param {Object} fetchOptions
   * @returns {Promise<any>}
   */
  async function runRequest(method, url, fetchOptions) {
    var response;
    try {
      response = await fetch(url, fetchOptions);
    } catch (networkErr) {
      var netMsg = 'FE2Http ' + method + ' ' + url + ' network error: ' + (networkErr && networkErr.message ? networkErr.message : String(networkErr));
      console.error('[FE2Http] ' + netMsg);
      throw new Error(netMsg);
    }

    if (response.status === 401) {
      return handleUnauthorized();
    }

    if (!response.ok) {
      var bodyText = await safeReadText(response);
      var errMsg = 'FE2Http ' + method + ' ' + url + ' failed: ' + response.status + ' ' + response.statusText + (bodyText ? ' — ' + bodyText : '');
      console.error('[FE2Http] ' + errMsg);
      throw new Error(errMsg);
    }

    try {
      return await response.json();
    } catch (parseErr) {
      // Empty or non-JSON body — treat as null so callers don't blow up.
      return null;
    }
  }

  // ---------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------

  /**
   * GET request with optional query params and baseUrl override.
   * @param {string} path
   * @param {Object} [opts]
   * @param {Object} [opts.params]  - query params (skip null/undefined/empty)
   * @param {string} [opts.baseUrl] - base URL override
   * @param {Object} [opts.headers] - extra headers merged on top
   * @returns {Promise<any>}
   */
  async function get(path, opts) {
    opts = opts || {};
    var qs = opts.params ? buildQuery(opts.params) : '';
    var url = resolveUrl(path, opts.baseUrl) + qs;
    var fetchOptions = {
      method: 'GET',
      headers: buildHeaders(opts.headers, false)
    };
    return runRequest('GET', url, fetchOptions);
  }

  /**
   * POST request with JSON body.
   * @param {string} path
   * @param {*} body               - serialized with JSON.stringify
   * @param {Object} [opts]
   * @param {string} [opts.baseUrl]
   * @param {Object} [opts.headers]
   * @returns {Promise<any>}
   */
  async function post(path, body, opts) {
    opts = opts || {};
    var url = resolveUrl(path, opts.baseUrl);
    var fetchOptions = {
      method: 'POST',
      headers: buildHeaders(opts.headers, true),
      body: body !== undefined ? JSON.stringify(body) : undefined
    };
    return runRequest('POST', url, fetchOptions);
  }

  // ---------------------------------------------------------------------------
  // Expose
  // ---------------------------------------------------------------------------

  window.FE2Http = {
    get: get,
    post: post,
    buildQuery: buildQuery,
    getAuthHeader: getAuthHeader
  };

})();
