// fe2-table.js — Shared sortable table renderer.
// Structurally extracted from request-discount.js (most complete impl) and
// supplier-commission.js / discount-sales.js table-sort patterns.
//
// Exposes window.FE2Table (IIFE).

(function () {
  'use strict';

  function escapeHtml(str) {
    return String(str == null ? '' : str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function isEl(el) {
    return el && typeof el === 'object' && typeof el.appendChild === 'function';
  }

  // Sort-icon SVG reuses the same three-state design from supplier-commission.js /
  // discount-sales.js: neutral double-arrow, active-desc down-arrow, active-asc up-arrow.
  function sortIconSVG(columnKey, sortKey, sortDir) {
    if (sortKey !== columnKey) {
      return '<svg class="fe2-sort-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4"/></svg>';
    }
    if (sortDir === 'desc') {
      return '<svg class="fe2-sort-icon fe2-sort-icon--active" viewBox="0 0 24 24" fill="none" stroke="#2563eb" stroke-width="2" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M19 14l-7 7m0 0l-7-7m7 7V3"/></svg>';
    }
    return '<svg class="fe2-sort-icon fe2-sort-icon--active" viewBox="0 0 24 24" fill="none" stroke="#2563eb" stroke-width="2" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M5 10l7-7m0 0l7 7m-7-7v18"/></svg>';
  }

  function alignClass(align) {
    if (align === 'right')  return 'fe2-cell-right';
    if (align === 'center') return 'fe2-cell-center';
    return 'fe2-cell-left';
  }

  function ariaSort(columnKey, sortKey, sortDir) {
    if (sortKey !== columnKey) return 'none';
    return sortDir === 'asc' ? 'ascending' : 'descending';
  }

  function renderHeadHTML(columns, sortKey, sortDir) {
    return '<tr>' + columns.map(function (col) {
      var cls = 'fe2-th ' + alignClass(col.align);
      var sortable = col.sortable !== false; // default sortable unless explicitly false
      if (sortable) {
        var active = sortKey === col.key ? ' fe2-th--sort-active' : '';
        return '<th class="' + cls + active + '" data-sort-key="' + escapeHtml(col.key) + '" aria-sort="' + ariaSort(col.key, sortKey, sortDir) + '">'
          + '<button type="button" class="fe2-sort-btn" data-sort-key="' + escapeHtml(col.key) + '">'
          + '<span class="fe2-th-label">' + escapeHtml(col.label) + '</span>'
          + sortIconSVG(col.key, sortKey, sortDir)
          + '</button>'
          + '</th>';
      }
      return '<th class="' + cls + '">' + escapeHtml(col.label) + '</th>';
    }).join('') + '</tr>';
  }

  function renderBodyHTML(columns, rows) {
    if (!rows || rows.length === 0) {
      return '<tr><td class="fe2-empty-row" colspan="' + columns.length + '">ไม่พบข้อมูล</td></tr>';
    }
    return rows.map(function (row) {
      return '<tr>' + columns.map(function (col) {
        var raw = row ? row[col.key] : undefined;
        var cellHtml;
        if (typeof col.format === 'function') {
          // Caller-provided format() is trusted to return an HTML-safe string.
          try { cellHtml = col.format(raw, row); }
          catch (e) {
            console.warn('[FE2Table] format() threw for column "' + col.key + '":', e);
            cellHtml = escapeHtml(raw);
          }
          if (cellHtml == null) cellHtml = '';
        } else {
          cellHtml = escapeHtml(raw);
        }
        return '<td class="fe2-td ' + alignClass(col.align) + '">' + cellHtml + '</td>';
      }).join('') + '</tr>';
    }).join('');
  }

  /**
   * Render a sortable table into containerEl.
   *
   * @param {Object} cfg
   * @param {HTMLElement} cfg.containerEl - parent to receive the <table>
   * @param {Array<{key, label, sortable?, align?, format?}>} cfg.columns
   * @param {Array<Object>} cfg.rows
   * @param {string|null} [cfg.sortKey]
   * @param {'asc'|'desc'} [cfg.sortDir]
   * @param {function(key:string):void} [cfg.onSort]
   */
  function render(cfg) {
    cfg = cfg || {};
    if (!isEl(cfg.containerEl)) {
      console.warn('[FE2Table] render: invalid containerEl');
      return;
    }
    if (!Array.isArray(cfg.columns) || cfg.columns.length === 0) {
      console.warn('[FE2Table] render: columns must be a non-empty array');
      return;
    }

    var columns  = cfg.columns;
    var rows     = Array.isArray(cfg.rows) ? cfg.rows : [];
    var sortKey  = cfg.sortKey || null;
    var sortDir  = cfg.sortDir === 'asc' ? 'asc' : 'desc';
    var onSort   = typeof cfg.onSort === 'function' ? cfg.onSort : null;

    var html =
      '<div class="fe2-table-wrap">' +
        '<table class="fe2-table">' +
          '<thead>' + renderHeadHTML(columns, sortKey, sortDir) + '</thead>' +
          '<tbody>' + renderBodyHTML(columns, rows) + '</tbody>' +
        '</table>' +
      '</div>';

    cfg.containerEl.innerHTML = html;

    if (onSort) {
      var thead = cfg.containerEl.querySelector('thead');
      if (thead) {
        thead.addEventListener('click', function (e) {
          var btn = e.target.closest ? e.target.closest('[data-sort-key]') : null;
          if (!btn) return;
          var key = btn.getAttribute('data-sort-key');
          if (key) {
            try { onSort(key); }
            catch (err) { console.warn('[FE2Table] onSort threw:', err); }
          }
        });
      }
    }
  }

  window.FE2Table = {
    render: render
  };

})();
