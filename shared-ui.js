// shared-ui.js — Shared loading spinner + error banner utilities.
// Consumed by all 4 report pages for consistent feedback UX.
//
// Exposes window.SharedUI (IIFE — no build tools, no ES modules).
// Assumes styles from shared-ui.css are loaded on the page.

(function () {
  'use strict';

  // ---------------------------------------------------------------------------
  // Internal helpers
  // ---------------------------------------------------------------------------

  function escapeHtml(str) {
    return String(str == null ? '' : str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function isEl(containerEl) {
    return containerEl && typeof containerEl === 'object' && typeof containerEl.appendChild === 'function';
  }

  // Always clear any existing SharedUI-owned child (loading or error) before injecting a new one.
  function clearOwn(containerEl) {
    if (!isEl(containerEl)) return;
    var nodes = containerEl.querySelectorAll('.shared-loading, .shared-error-banner');
    for (var i = 0; i < nodes.length; i++) {
      if (nodes[i].parentNode === containerEl) {
        containerEl.removeChild(nodes[i]);
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Loading spinner
  // ---------------------------------------------------------------------------

  function showLoading(containerEl, message) {
    if (!isEl(containerEl)) {
      console.warn('[SharedUI] showLoading: invalid containerEl');
      return;
    }
    var msg = (message == null || message === '') ? 'กำลังโหลดข้อมูล...' : String(message);

    clearOwn(containerEl);

    var wrap = document.createElement('div');
    wrap.className = 'shared-loading';
    wrap.setAttribute('role', 'status');
    wrap.setAttribute('aria-live', 'polite');
    wrap.innerHTML =
      '<div class="shared-spinner" aria-hidden="true"></div>' +
      '<span class="shared-loading-text">' + escapeHtml(msg) + '</span>';

    containerEl.appendChild(wrap);
  }

  function hideLoading(containerEl) {
    if (!isEl(containerEl)) {
      console.warn('[SharedUI] hideLoading: invalid containerEl');
      return;
    }
    var nodes = containerEl.querySelectorAll('.shared-loading');
    for (var i = 0; i < nodes.length; i++) {
      if (nodes[i].parentNode === containerEl) {
        containerEl.removeChild(nodes[i]);
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Error banner
  // ---------------------------------------------------------------------------

  function showError(containerEl, message, opts) {
    if (!isEl(containerEl)) {
      console.warn('[SharedUI] showError: invalid containerEl');
      return;
    }
    var msg = (message == null || message === '')
      ? 'เกิดข้อผิดพลาดในการโหลดข้อมูล กรุณาลองใหม่อีกครั้ง'
      : String(message);

    clearOwn(containerEl);

    var retryFn = opts && typeof opts.retryFn === 'function' ? opts.retryFn : null;

    var banner = document.createElement('div');
    banner.className = 'shared-error-banner';
    banner.setAttribute('role', 'alert');

    var iconSvg =
      '<svg class="shared-error-icon" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">' +
        '<path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd"/>' +
      '</svg>';

    var html = iconSvg + '<span class="shared-error-message">' + escapeHtml(msg) + '</span>';
    if (retryFn) {
      html += '<button type="button" class="shared-error-retry">ลองใหม่</button>';
    }
    banner.innerHTML = html;

    if (retryFn) {
      var btn = banner.querySelector('.shared-error-retry');
      if (btn) {
        btn.addEventListener('click', function () {
          try { retryFn(); }
          catch (e) { console.warn('[SharedUI] retryFn threw:', e); }
        });
      }
    }

    containerEl.appendChild(banner);
  }

  function hideError(containerEl) {
    if (!isEl(containerEl)) {
      console.warn('[SharedUI] hideError: invalid containerEl');
      return;
    }
    var nodes = containerEl.querySelectorAll('.shared-error-banner');
    for (var i = 0; i < nodes.length; i++) {
      if (nodes[i].parentNode === containerEl) {
        containerEl.removeChild(nodes[i]);
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Expose
  // ---------------------------------------------------------------------------

  window.SharedUI = {
    showLoading: showLoading,
    hideLoading: hideLoading,
    showError  : showError,
    hideError  : hideError
  };

})();
