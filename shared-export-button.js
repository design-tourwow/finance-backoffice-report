// shared-export-button.js — Centralized Export button component for the
// dashboards. Supports three variants:
//   - 'csv'   → green button, "Export CSV"   label, table icon
//   - 'excel' → green button, "Export Excel" label, table icon
//   - 'pdf'   → red   button, "Export PDF"   label, document icon
//
// Action-button vocabulary: red = PDF, green = spreadsheet.
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

  // Table-style icon — generic spreadsheet/grid glyph used for csv / excel.
  // Renders as a clean white outline on the green button so the icon doesn't
  // fight the background colour. Variant differentiation lives in the label.
  function tableIcon() {
    return '<svg class="shared-export-btn-icon" width="18" height="18" viewBox="0 0 24 24"' +
      ' fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"' +
      ' stroke-linejoin="round" aria-hidden="true">' +
        '<rect x="3" y="3" width="18" height="18" rx="2"/>' +
        '<line x1="3"  y1="9"  x2="21" y2="9"/>' +
        '<line x1="3"  y1="15" x2="21" y2="15"/>' +
        '<line x1="9"  y1="3"  x2="9"  y2="21"/>' +
        '<line x1="15" y1="3"  x2="15" y2="21"/>' +
      '</svg>';
  }

  // Document icon for the PDF variant — same outline-on-red treatment as
  // the existing inline `.crp-btn-pdf` markup, just rendered through the
  // shared component so callers don't have to duplicate the SVG.
  function documentIcon() {
    return '<svg class="shared-export-btn-icon" width="18" height="18" viewBox="0 0 24 24"' +
      ' fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"' +
      ' stroke-linejoin="round" aria-hidden="true">' +
        '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>' +
        '<polyline points="14 2 14 8 20 8"/>' +
        '<line x1="16" y1="13" x2="8"  y2="13"/>' +
        '<line x1="16" y1="17" x2="8"  y2="17"/>' +
        '<polyline points="10 9 9 9 8 9"/>' +
      '</svg>';
  }

  function iconFor(variant) {
    return variant === 'pdf' ? documentIcon() : tableIcon();
  }

  function defaultLabelFor(variant) {
    if (variant === 'excel') return 'Export Excel';
    if (variant === 'pdf')   return 'Export PDF';
    return 'Export CSV';
  }

  function normalizeVariant(v) {
    if (v === 'excel' || v === 'pdf') return v;
    return 'csv';
  }

  function render(cfg) {
    cfg = cfg || {};
    var variant = normalizeVariant(cfg.variant);
    var id = cfg.id ? ' id="' + escapeHtml(cfg.id) + '"' : '';
    var title = cfg.title ? ' title="' + escapeHtml(cfg.title) + '"' : '';
    var className = cfg.className ? ' ' + String(cfg.className).trim() : '';
    var label = cfg.label == null || cfg.label === ''
      ? defaultLabelFor(variant)
      : String(cfg.label);

    return '' +
      '<button type="button" class="shared-export-btn shared-export-btn--' + variant + className + '"' + id + title + '>' +
        iconFor(variant) +
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
