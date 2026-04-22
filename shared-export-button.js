// shared-export-button.js — Centralized Export CSV button component.
// Reuses the legacy dashboard export button look from commission-report-plus.
//
// Exposes window.SharedExportButton (IIFE).

(function () {
  'use strict';

  function escapeHtml(str) {
    return String(str == null ? '' : str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function buttonIcon() {
    return '' +
      '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">' +
        '<path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>' +
        '<polyline points="7 10 12 15 17 10"/>' +
        '<line x1="12" y1="15" x2="12" y2="3"/>' +
      '</svg>';
  }

  function render(cfg) {
    cfg = cfg || {};
    var id = cfg.id ? ' id="' + escapeHtml(cfg.id) + '"' : '';
    var title = cfg.title ? ' title="' + escapeHtml(cfg.title) + '"' : '';
    var className = cfg.className ? ' ' + String(cfg.className).trim() : '';
    var label = cfg.label == null || cfg.label === '' ? 'Export CSV' : String(cfg.label);

    return '' +
      '<button type="button" class="shared-export-btn' + className + '"' + id + title + '>' +
        buttonIcon() +
        '<span class="shared-export-btn-label">' + escapeHtml(label) + '</span>' +
      '</button>';
  }

  function mount(containerOrId, cfg) {
    var container = typeof containerOrId === 'string'
      ? document.getElementById(containerOrId)
      : containerOrId;

    if (!container) {
      console.warn('[SharedExportButton] mount: container not found');
      return null;
    }

    container.innerHTML = render(cfg);
    return container.querySelector('.shared-export-btn');
  }

  window.SharedExportButton = {
    render: render,
    mount : mount
  };
})();
