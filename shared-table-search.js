// shared-table-search.js
// Standalone search-input textbox for table client-filter — replaces the
// hand-rolled .dashboard-search-input / .table-search-input blocks that
// used to live in each report page's JS. Exposes window.SharedTableSearch.
//
// Usage:
//   SharedTableSearch.init({
//     containerId: 'myHost',               // required — empty element
//     placeholder: 'ค้นหาข้อมูล...',
//     value      : '',                     // optional initial value
//     debounceMs : 200,                    // default 200
//     clearable  : true,                   // default true — show × when has value
//     onInput    : function (value) {},    // debounced fire during typing
//     onChange   : function (value) {}     // on blur / clear
//   });
// Returns { getValue, setValue, clear, destroy }.

(function () {
  'use strict';

  function escapeAttr(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
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

  function init(cfg) {
    cfg = cfg || {};
    var container = document.getElementById(cfg.containerId);
    if (!container) {
      console.error('[SharedTableSearch] container not found:', cfg.containerId);
      return null;
    }

    var placeholder = cfg.placeholder || 'ค้นหา...';
    var debounceMs  = typeof cfg.debounceMs === 'number' ? cfg.debounceMs : 200;
    var clearable   = cfg.clearable !== false;
    var initialVal  = cfg.value || '';

    container.innerHTML =
      '<div class="shared-search-wrap">' +
        '<svg class="shared-search-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
          '<circle cx="11" cy="11" r="8"/>' +
          '<line x1="21" y1="21" x2="16.65" y2="16.65"/>' +
        '</svg>' +
        '<input type="text" class="shared-search-input" placeholder="' + escapeAttr(placeholder) + '" value="' + escapeAttr(initialVal) + '" autocomplete="off" />' +
        (clearable
          ? '<button type="button" class="shared-search-clear" aria-label="ล้างการค้นหา"' + (initialVal ? '' : ' hidden') + '>' +
              '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
                '<line x1="18" y1="6" x2="6" y2="18"/>' +
                '<line x1="6" y1="6" x2="18" y2="18"/>' +
              '</svg>' +
            '</button>'
          : '') +
      '</div>';

    var inputEl = container.querySelector('.shared-search-input');
    var clearEl = container.querySelector('.shared-search-clear');

    function emitInput(val) {
      if (typeof cfg.onInput === 'function') {
        try { cfg.onInput(val); }
        catch (e) { console.warn('[SharedTableSearch] onInput threw:', e); }
      }
    }
    function emitChange(val) {
      if (typeof cfg.onChange === 'function') {
        try { cfg.onChange(val); }
        catch (e) { console.warn('[SharedTableSearch] onChange threw:', e); }
      }
    }

    var debouncedInput = debounce(emitInput, debounceMs);

    function updateClearButton() {
      if (!clearEl) return;
      if (inputEl.value) clearEl.removeAttribute('hidden');
      else clearEl.setAttribute('hidden', '');
    }

    inputEl.addEventListener('input', function () {
      updateClearButton();
      debouncedInput(inputEl.value);
    });
    inputEl.addEventListener('blur', function () { emitChange(inputEl.value); });

    if (clearEl) {
      clearEl.addEventListener('click', function () {
        inputEl.value = '';
        updateClearButton();
        emitInput('');
        emitChange('');
        inputEl.focus();
      });
    }

    return {
      getValue: function () { return inputEl.value; },
      setValue: function (v) { inputEl.value = v == null ? '' : String(v); updateClearButton(); },
      clear   : function () { inputEl.value = ''; updateClearButton(); emitInput(''); emitChange(''); },
      destroy : function () { container.innerHTML = ''; }
    };
  }

  window.SharedTableSearch = { init: init };

})();
