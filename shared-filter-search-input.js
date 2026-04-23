// shared-filter-search-input.js
// Filter-box variant of the SharedTableSearch textbox. In plain mode it's
// identical to SharedTableSearch (the user types, onInput debounced fires).
// Supplying an async fetchFn upgrades it to type-ahead/autocomplete:
// suggestions render below the input with keyboard nav, query-match
// highlight, spinner on the right, and AbortController-cancelled fetches so
// rapid typing can't race an old response onto the screen.
//
// Exposes window.SharedFilterSearchInput.
//
// Plain textbox usage:
//   SharedFilterSearchInput.init({
//     containerId: 'xxx',
//     placeholder: 'ค้นหา...',
//     onInput    : function (value) {},
//   });
//
// Autocomplete usage:
//   SharedFilterSearchInput.init({
//     containerId   : 'xxx',
//     placeholder   : 'กรอกรหัสทัวร์',
//     minChars      : 3,
//     fetchFn       : async function (q) { return [...] },  // strings or {value,label,raw}
//     formatLabel   : function (item) { return string },
//     onSelect      : function (value, label, raw) {},
//     showSpinner   : true,
//     highlightMatch: true,
//     maxItems      : 20,
//     noResultsText : 'ไม่พบผลลัพธ์'
//   });
// Returns { getValue, setValue, clear, destroy }.

(function () {
  'use strict';

  function escapeHtml(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function escapeRegex(s) {
    return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  function debounce(fn, wait) {
    var timer = null;
    return function () {
      var args = arguments;
      var self = this;
      clearTimeout(timer);
      timer = setTimeout(function () { fn.apply(self, args); }, wait);
    };
  }

  function normaliseItem(raw) {
    if (raw == null) return null;
    if (typeof raw === 'string' || typeof raw === 'number') {
      var s = String(raw);
      return { value: s, label: s, raw: raw };
    }
    var value = raw.value != null ? String(raw.value) : (raw.label != null ? String(raw.label) : '');
    var label = raw.label != null ? String(raw.label) : value;
    return { value: value, label: label, raw: raw };
  }

  function init(cfg) {
    cfg = cfg || {};
    var container = document.getElementById(cfg.containerId);
    if (!container) {
      console.error('[SharedFilterSearchInput] container not found:', cfg.containerId);
      return null;
    }

    var placeholder    = cfg.placeholder || 'ค้นหา...';
    var debounceMs     = typeof cfg.debounceMs === 'number' ? cfg.debounceMs : 300;
    var clearable      = cfg.clearable !== false;
    var initialVal     = cfg.value || '';
    var autocompleteOn = typeof cfg.fetchFn === 'function';
    var minChars       = typeof cfg.minChars === 'number' ? cfg.minChars : 3;
    var showSpinner    = cfg.showSpinner !== false;
    var highlightMatch = cfg.highlightMatch !== false;
    var maxItems       = typeof cfg.maxItems === 'number' ? cfg.maxItems : 20;
    var noResultsText  = cfg.noResultsText || 'ไม่พบผลลัพธ์';

    container.innerHTML =
      '<div class="shared-search-wrap shared-filter-search">' +
        '<svg class="shared-search-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
          '<circle cx="11" cy="11" r="8"/>' +
          '<line x1="21" y1="21" x2="16.65" y2="16.65"/>' +
        '</svg>' +
        '<input type="text" class="shared-search-input" placeholder="' + escapeHtml(placeholder) + '" value="' + escapeHtml(initialVal) + '" autocomplete="off" />' +
        (autocompleteOn && showSpinner
          ? '<span class="shared-search-spinner" hidden><span class="shared-search-spinner-ring"></span></span>'
          : '') +
        (clearable
          ? '<button type="button" class="shared-search-clear" aria-label="ล้างการค้นหา"' + (initialVal ? '' : ' hidden') + '>' +
              '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
                '<line x1="18" y1="6" x2="6" y2="18"/>' +
                '<line x1="6" y1="6" x2="18" y2="18"/>' +
              '</svg>' +
            '</button>'
          : '') +
        (autocompleteOn
          ? '<div class="shared-search-dropdown" hidden></div>'
          : '') +
      '</div>';

    var inputEl    = container.querySelector('.shared-search-input');
    var clearEl    = container.querySelector('.shared-search-clear');
    var spinnerEl  = container.querySelector('.shared-search-spinner');
    var dropdownEl = container.querySelector('.shared-search-dropdown');

    var currentController = null;
    var activeIndex = -1;
    var currentItems = [];

    function emit(name, val, extra1, extra2) {
      var fn = cfg[name];
      if (typeof fn !== 'function') return;
      try { fn(val, extra1, extra2); }
      catch (e) { console.warn('[SharedFilterSearchInput] ' + name + ' threw:', e); }
    }

    function updateClearButton() {
      if (!clearEl) return;
      if (inputEl.value) clearEl.removeAttribute('hidden');
      else clearEl.setAttribute('hidden', '');
    }

    function toggleSpinner(on) {
      if (!spinnerEl) return;
      if (on) spinnerEl.removeAttribute('hidden');
      else spinnerEl.setAttribute('hidden', '');
    }

    function closeDropdown() {
      if (!dropdownEl) return;
      dropdownEl.setAttribute('hidden', '');
      dropdownEl.innerHTML = '';
      currentItems = [];
      activeIndex = -1;
    }

    function renderDropdown(items, query) {
      if (!dropdownEl) return;
      currentItems = items.slice(0, maxItems);
      activeIndex = -1;
      if (!currentItems.length) {
        dropdownEl.innerHTML = '<div class="shared-search-empty">' + escapeHtml(noResultsText) + '</div>';
        dropdownEl.removeAttribute('hidden');
        return;
      }

      var qPattern = query && highlightMatch
        ? new RegExp('(' + escapeRegex(query) + ')', 'ig')
        : null;

      dropdownEl.innerHTML = currentItems.map(function (item, idx) {
        var rawLabel = typeof cfg.formatLabel === 'function' ? cfg.formatLabel(item.raw) : item.label;
        var labelStr = rawLabel == null ? '' : String(rawLabel);
        var labelHTML = escapeHtml(labelStr);
        if (qPattern) {
          labelHTML = labelHTML.replace(qPattern, '<mark class="shared-search-highlight">$1</mark>');
        }
        return '<button type="button" class="shared-search-item" data-index="' + idx + '">' + labelHTML + '</button>';
      }).join('');
      dropdownEl.removeAttribute('hidden');

      Array.prototype.forEach.call(dropdownEl.querySelectorAll('.shared-search-item'), function (el) {
        el.addEventListener('mousedown', function (e) { e.preventDefault(); }); // keep focus on input
        el.addEventListener('click', function () {
          var idx = parseInt(el.getAttribute('data-index'), 10);
          commitItem(idx);
        });
      });
    }

    function setActive(idx) {
      if (!dropdownEl) return;
      var nodes = dropdownEl.querySelectorAll('.shared-search-item');
      if (!nodes.length) { activeIndex = -1; return; }
      if (idx < 0) idx = nodes.length - 1;
      if (idx >= nodes.length) idx = 0;
      activeIndex = idx;
      nodes.forEach(function (n, i) { n.classList.toggle('active', i === idx); });
      var activeEl = nodes[idx];
      if (activeEl && activeEl.scrollIntoView) {
        activeEl.scrollIntoView({ block: 'nearest' });
      }
    }

    function commitItem(idx) {
      var item = currentItems[idx];
      if (!item) return;
      inputEl.value = item.label;
      updateClearButton();
      closeDropdown();
      emit('onSelect', item.value, item.label, item.raw);
      emit('onChange', inputEl.value);
    }

    async function runFetch(query) {
      if (!autocompleteOn) return;
      if (currentController) currentController.abort();
      currentController = typeof AbortController === 'function' ? new AbortController() : null;
      toggleSpinner(true);
      try {
        var raw = await cfg.fetchFn(query, currentController ? currentController.signal : undefined);
        if (!Array.isArray(raw)) raw = [];
        var items = raw.map(normaliseItem).filter(Boolean);
        // Only render if the input value still matches the query that kicked
        // off this fetch — otherwise an older response could overwrite newer.
        if (inputEl.value !== query) return;
        renderDropdown(items, query);
      } catch (err) {
        if (err && err.name === 'AbortError') return;
        console.warn('[SharedFilterSearchInput] fetchFn threw:', err);
        renderDropdown([], query);
      } finally {
        toggleSpinner(false);
      }
    }

    var debouncedInput = debounce(function (value) {
      emit('onInput', value);
      if (!autocompleteOn) return;
      if (!value || value.length < minChars) { closeDropdown(); toggleSpinner(false); return; }
      runFetch(value);
    }, debounceMs);

    inputEl.addEventListener('input', function () {
      updateClearButton();
      debouncedInput(inputEl.value);
    });

    inputEl.addEventListener('focus', function () {
      if (autocompleteOn && inputEl.value && inputEl.value.length >= minChars && currentItems.length) {
        dropdownEl.removeAttribute('hidden');
      }
    });

    inputEl.addEventListener('blur', function () {
      emit('onChange', inputEl.value);
    });

    inputEl.addEventListener('keydown', function (e) {
      if (!autocompleteOn || !dropdownEl || dropdownEl.hasAttribute('hidden')) return;
      if (e.key === 'ArrowDown') { e.preventDefault(); setActive(activeIndex + 1); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); setActive(activeIndex - 1); }
      else if (e.key === 'Enter') {
        if (activeIndex >= 0) { e.preventDefault(); commitItem(activeIndex); }
      } else if (e.key === 'Escape') {
        closeDropdown();
      }
    });

    if (clearEl) {
      clearEl.addEventListener('click', function () {
        inputEl.value = '';
        updateClearButton();
        closeDropdown();
        emit('onInput', '');
        emit('onChange', '');
        inputEl.focus();
      });
    }

    if (autocompleteOn) {
      document.addEventListener('click', function (e) {
        if (!container.contains(e.target)) closeDropdown();
      });
    }

    return {
      getValue: function () { return inputEl.value; },
      setValue: function (v) { inputEl.value = v == null ? '' : String(v); updateClearButton(); },
      clear   : function () {
        inputEl.value = '';
        updateClearButton();
        closeDropdown();
        emit('onInput', '');
        emit('onChange', '');
      },
      destroy : function () {
        if (currentController) currentController.abort();
        container.innerHTML = '';
      }
    };
  }

  window.SharedFilterSearchInput = { init: init };

})();
