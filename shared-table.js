// shared-table.js — Shared sortable table renderer.
// Structurally extracted from request-discount.js (most complete impl) and
// supplier-commission.js / discount-sales.js table-sort patterns.
//
// Exposes window.SharedTable (IIFE).

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

  function sortIconHTML() {
    if (window.SharedSortableHeader && typeof window.SharedSortableHeader.getSortIconHTML === 'function') {
      return window.SharedSortableHeader.getSortIconHTML();
    }
    return '<span class="sort-icon" aria-hidden="true"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M19 12l-7 7-7-7"/></svg></span>';
  }

  function alignClass(align) {
    if (align === 'right')  return 'shared-cell-right';
    if (align === 'center') return 'shared-cell-center';
    return 'shared-cell-left';
  }

  function ariaSort(columnKey, sortKey, sortDir) {
    if (sortKey !== columnKey) return 'none';
    return sortDir === 'asc' ? 'ascending' : 'descending';
  }

  // Optional group-header row: renders above the main column header row
  // with colspan grouping. Each group is { label, span, className? } and
  // `span` must sum to columns.length. Invalid groupings fall back to
  // omitting the group row rather than breaking the table.
  function renderGroupRowHTML(groupColumns, totalCols) {
    if (!Array.isArray(groupColumns) || groupColumns.length === 0) return '';
    var sum = 0;
    for (var i = 0; i < groupColumns.length; i++) {
      var span = Number(groupColumns[i].span) || 0;
      if (span <= 0) {
        console.warn('[SharedTable] groupColumns[' + i + '].span must be >= 1');
        return '';
      }
      sum += span;
    }
    if (sum !== totalCols) {
      console.warn('[SharedTable] groupColumns spans (' + sum + ') do not match columns.length (' + totalCols + ')');
      return '';
    }
    return '<tr class="shared-group-row">' + groupColumns.map(function (g) {
      var cls = 'shared-group-th' + (g.className ? ' ' + String(g.className) : '');
      return '<th class="' + cls + '" colspan="' + g.span + '">' + escapeHtml(g.label || '') + '</th>';
    }).join('') + '</tr>';
  }

  function renderHeadHTML(columns, sortKey, sortDir, groupColumns) {
    var group = renderGroupRowHTML(groupColumns, columns.length);
    var cols = '<tr class="shared-col-row">' + columns.map(function (col) {
      var cls = 'shared-th ' + alignClass(col.align);
      if (col.className) cls += ' ' + String(col.className);
      var sortable = col.sortable !== false; // default sortable unless explicitly false
      if (sortable) {
        var active = sortKey === col.key ? (' ' + (sortDir === 'asc' ? 'sort-asc' : 'sort-desc')) : '';
        return '<th class="' + cls + active + '" data-sort-key="' + escapeHtml(col.key) + '" aria-sort="' + ariaSort(col.key, sortKey, sortDir) + '">'
          + '<button type="button" class="shared-sort-btn" data-sort-key="' + escapeHtml(col.key) + '">'
          + '<span class="shared-th-label">' + escapeHtml(col.label) + '</span>'
          + sortIconHTML()
          + '</button>'
          + '</th>';
      }
      return '<th class="' + cls + '">' + escapeHtml(col.label) + '</th>';
    }).join('') + '</tr>';
    return group + cols;
  }

  function renderBodyHTML(columns, rows) {
    if (!rows || rows.length === 0) {
      return '<tr><td class="shared-empty-row" colspan="' + columns.length + '">ไม่พบข้อมูล</td></tr>';
    }
    return rows.map(function (row) {
      return '<tr>' + columns.map(function (col) {
        var raw = row ? row[col.key] : undefined;
        var cellHtml;
        if (typeof col.format === 'function') {
          // Caller-provided format() is trusted to return an HTML-safe string.
          try { cellHtml = col.format(raw, row); }
          catch (e) {
            console.warn('[SharedTable] format() threw for column "' + col.key + '":', e);
            cellHtml = escapeHtml(raw);
          }
          if (cellHtml == null) cellHtml = '';
        } else {
          cellHtml = escapeHtml(raw);
        }
        var cellCls = 'shared-td ' + alignClass(col.align);
        if (col.cellClassName) cellCls += ' ' + String(col.cellClassName);
        return '<td class="' + cellCls + '">' + cellHtml + '</td>';
      }).join('') + '</tr>';
    }).join('');
  }

  /**
   * Render a sortable table into containerEl.
   *
   * @param {Object} cfg
   * @param {HTMLElement} cfg.containerEl - parent to receive the <table>
   * @param {Array<{key, label, sortable?, align?, format?, className?, cellClassName?}>} cfg.columns
   * @param {Array<Object>} cfg.rows
   * @param {string|null} [cfg.sortKey]
   * @param {'asc'|'desc'} [cfg.sortDir]
   * @param {function(key:string):void} [cfg.onSort]
   * @param {string} [cfg.tableClassName] - extra class appended to <table>
   * @param {Array<{label, span, className?}>} [cfg.groupColumns] - optional
   *   grouped header row. `span` values must sum to columns.length; invalid
   *   configs skip the group row and log a warning.
   */
  function render(cfg) {
    cfg = cfg || {};
    if (!isEl(cfg.containerEl)) {
      console.warn('[SharedTable] render: invalid containerEl');
      return;
    }
    if (!Array.isArray(cfg.columns) || cfg.columns.length === 0) {
      console.warn('[SharedTable] render: columns must be a non-empty array');
      return;
    }

    var columns       = cfg.columns;
    var rows          = Array.isArray(cfg.rows) ? cfg.rows : [];
    var sortKey       = cfg.sortKey || null;
    var sortDir       = cfg.sortDir === 'asc' ? 'asc' : 'desc';
    var onSort        = typeof cfg.onSort === 'function' ? cfg.onSort : null;
    var groupColumns  = Array.isArray(cfg.groupColumns) ? cfg.groupColumns : null;
    var extraTblClass = cfg.tableClassName ? ' ' + String(cfg.tableClassName) : '';

    var html =
      '<div class="shared-table-wrap">' +
        '<table class="shared-table' + extraTblClass + '">' +
          '<thead>' + renderHeadHTML(columns, sortKey, sortDir, groupColumns) + '</thead>' +
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
            catch (err) { console.warn('[SharedTable] onSort threw:', err); }
          }
        });
      }
    }

    // Scroll-hint fade: toggle .shared-hint-hidden on the wrap when the
    // table fits horizontally or the user has scrolled to the end. The
    // gradient overlay itself is styled in dashboard-table.css.
    var wrap = cfg.containerEl.querySelector('.shared-table-wrap');
    if (wrap) {
      var updateHint = function () {
        var atEnd = wrap.scrollLeft + wrap.clientWidth >= wrap.scrollWidth - 2;
        var noScroll = wrap.scrollWidth <= wrap.clientWidth;
        wrap.classList.toggle('shared-hint-hidden', atEnd || noScroll);
      };
      wrap.addEventListener('scroll', updateHint);
      window.addEventListener('resize', updateHint);
      // Defer initial check so the browser has laid out the table.
      setTimeout(updateHint, 0);
    }
  }

  window.SharedTable = {
    render: render
  };

})();
