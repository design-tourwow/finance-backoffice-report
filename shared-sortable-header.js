(function () {
  'use strict';

  function getSortIconHTML() {
    return '<span class="sort-icon" aria-hidden="true"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M19 12l-7 7-7-7"/></svg></span>';
  }

  function getSortKey(header) {
    return header.getAttribute('data-sort') || header.getAttribute('data-sort-key') || '';
  }

  function getSortType(header) {
    return header.getAttribute('data-type') || header.getAttribute('data-sort-type') || 'string';
  }

  function normalizeDirection(direction) {
    return direction === 'asc' ? 'asc' : 'desc';
  }

  function getNextDirection(currentKey, currentDir, nextKey, defaultDirection) {
    if (currentKey === nextKey) {
      return currentDir === 'asc' ? 'desc' : 'asc';
    }
    return normalizeDirection(defaultDirection);
  }

  function applyState(headers, sortKey, sortDir) {
    Array.prototype.forEach.call(headers || [], function (header) {
      var key = getSortKey(header);
      var isActive = !!key && key === sortKey;
      header.classList.remove('sorted', 'sort-asc', 'sort-desc');
      header.setAttribute('aria-sort', 'none');
      if (!isActive) return;
      header.classList.add('sorted', sortDir === 'asc' ? 'sort-asc' : 'sort-desc');
      header.setAttribute('aria-sort', sortDir === 'asc' ? 'ascending' : 'descending');
    });
  }

  function ensureHeaderIcon(header) {
    if (!header || header.querySelector('.sort-icon')) return;
    if (header.querySelector('.shared-sort-btn, .sortable-header-btn')) return;
    header.insertAdjacentHTML('beforeend', getSortIconHTML());
  }

  function coerceValue(value, type) {
    if (type === 'number' || type === 'currency') {
      var num = Number(String(value == null ? '' : value).replace(/,/g, ''));
      return Number.isFinite(num) ? num : 0;
    }
    if (type === 'date') {
      var time = new Date(value).getTime();
      return Number.isFinite(time) ? time : 0;
    }
    return String(value == null ? '' : value).toLowerCase();
  }

  function defaultRowValue(row, header, columnIndex) {
    if (!row || !row.children) return '';
    var cell = row.children[columnIndex];
    if (!cell) return '';
    return cell.getAttribute('data-sort-value') || cell.textContent || '';
  }

  function sortTableRows(table, header, direction, opts) {
    var tbody = table.querySelector('tbody');
    if (!tbody) return;
    var rows = Array.prototype.slice.call(tbody.querySelectorAll('tr'));
    var headerRow = header.parentElement;
    var columnIndex = Array.prototype.indexOf.call(headerRow.children, header);
    var type = getSortType(header);
    var getValue = typeof opts.getSortValue === 'function'
      ? opts.getSortValue
      : function (row) { return defaultRowValue(row, header, columnIndex); };

    rows.sort(function (a, b) {
      var av = coerceValue(getValue(a, header, columnIndex), type);
      var bv = coerceValue(getValue(b, header, columnIndex), type);
      if (av < bv) return direction === 'asc' ? -1 : 1;
      if (av > bv) return direction === 'asc' ? 1 : -1;
      return 0;
    });

    rows.forEach(function (row) { tbody.appendChild(row); });
  }

  function bindTable(table, options) {
    options = options || {};
    if (!table || typeof table.querySelectorAll !== 'function') return null;

    var headerSelector = options.headerSelector || 'th[data-sort], th[data-sort-key]';
    var headers = Array.prototype.slice.call(table.querySelectorAll(headerSelector));
    if (!headers.length) return null;

    var state = {
      key: options.sortKey || null,
      direction: normalizeDirection(options.sortDir || options.defaultDirection || 'desc')
    };

    headers.forEach(function (header) {
      header.setAttribute('tabindex', header.getAttribute('tabindex') || '0');
      header.setAttribute('role', header.getAttribute('role') || 'button');
      if (options.injectIcon !== false) ensureHeaderIcon(header);
    });

    function sync() {
      applyState(headers, state.key, state.direction);
    }

    function activate(header) {
      var key = getSortKey(header);
      if (!key) return;
      state.direction = getNextDirection(
        state.key,
        state.direction,
        key,
        header.getAttribute('data-default-sort-dir') || options.defaultDirection || 'desc'
      );
      state.key = key;
      sync();

      var shouldSortInDom = options.sortInDom !== false;
      if (typeof options.onSort === 'function') {
        var result = options.onSort({
          key: state.key,
          direction: state.direction,
          type: getSortType(header),
          header: header,
          headers: headers,
          table: table
        });
        if (result === false) {
          shouldSortInDom = false;
        }
      }

      if (shouldSortInDom) {
        sortTableRows(table, header, state.direction, options);
      }
    }

    function onClick(event) {
      var header = event.currentTarget;
      if (event.target.closest && event.target.closest('a, button, input, select, textarea')) {
        var trigger = event.target.closest('a, button, input, select, textarea');
        if (trigger && trigger !== header) return;
      }
      activate(header);
    }

    function onKeyDown(event) {
      if (event.key !== 'Enter' && event.key !== ' ') return;
      event.preventDefault();
      activate(event.currentTarget);
    }

    headers.forEach(function (header) {
      header.addEventListener('click', onClick);
      header.addEventListener('keydown', onKeyDown);
    });

    sync();

    if (state.key && options.sortInDom !== false) {
      var activeHeader = headers.find(function (header) { return getSortKey(header) === state.key; });
      if (activeHeader) sortTableRows(table, activeHeader, state.direction, options);
    }

    return {
      destroy: function () {
        headers.forEach(function (header) {
          header.removeEventListener('click', onClick);
          header.removeEventListener('keydown', onKeyDown);
        });
      },
      getState: function () {
        return { key: state.key, direction: state.direction };
      },
      setState: function (next) {
        state.key = next && next.key ? next.key : null;
        state.direction = normalizeDirection(next && next.direction ? next.direction : 'desc');
        sync();
      }
    };
  }

  window.SharedSortableHeader = {
    applyState: applyState,
    bindTable: bindTable,
    getSortIconHTML: getSortIconHTML,
    getNextDirection: getNextDirection
  };
})();
