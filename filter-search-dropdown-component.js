// filter-search-dropdown-component.js
// Single- or multi-select dropdown with in-menu search. Visually matches
// .filter-sort-btn so it sits beside FilterSortDropdowns in the same filter
// row. Styles come from filter-panel.css (.filter-search-dd-*).
//
// Exposes window.FilterSearchDropdown (IIFE).
//
// Single-select usage:
//   FilterSearchDropdown.init({
//     containerId : 'my-container',
//     defaultLabel: 'ทุกคน',
//     defaultIcon : '<svg>...</svg>',
//     options     : [{value, label, icon, active}],
//     placeholder : 'ค้นหา...',
//     onChange    : function (value, label) { ... }
//   });
//
// Multi-select usage — each option gets a checkbox; trigger label shows
// a count badge ("ทุกประเทศ (3)"). onChange fires once the user confirms
// with "ยืนยัน" (not on every checkbox toggle) and receives the selected
// values as a comma-separated string + an array:
//   FilterSearchDropdown.init({
//     ...
//     multiSelect    : true,
//     groupLabel     : 'ประเทศ',      // "{label} (N)" when any selected
//     confirmLabel   : 'ยืนยัน',      // optional
//     clearLabel     : 'ล้าง',         // optional
//     onChange       : function (csvValue, valuesArray) { ... }
//   });

(function () {
  'use strict';
  var CLOSE_OVERLAY_EVENT = 'app:close-dropdown-overlays';

  function escHtml(str) {
    return String(str == null ? '' : str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function init(cfg) {
    var container = document.getElementById(cfg.containerId);
    if (!container) {
      console.error('[FilterSearchDropdown] container not found:', cfg.containerId);
      return null;
    }

    var multi = !!cfg.multiSelect;
    var btnId   = cfg.containerId + 'Btn';
    var menuId  = cfg.containerId + 'Menu';
    var inputId = cfg.containerId + 'Search';
    var listId  = cfg.containerId + 'List';

    // Single: currentValue is a scalar string. Multi: selected is a Set.
    var currentValue = '';
    var selected = Object.create(null); // used in multi mode: { [value]: true }
    for (var i = 0; i < cfg.options.length; i++) {
      if (cfg.options[i].active) {
        var v = String(cfg.options[i].value || '');
        if (multi && v) selected[v] = true;
        else if (!multi) { currentValue = v; break; }
      }
    }

    var actionsHTML = '';
    if (multi) {
      actionsHTML =
        '<div class="filter-search-dd-actions">' +
          '<button type="button" class="filter-search-dd-clear">' + escHtml(cfg.clearLabel || 'ล้าง') + '</button>' +
          '<button type="button" class="filter-search-dd-confirm">' + escHtml(cfg.confirmLabel || 'ยืนยัน') + '</button>' +
        '</div>';
    }

    container.innerHTML =
      '<div class="filter-search-dd' + (multi ? ' filter-search-dd--multi' : '') + '">' +
        '<button type="button" class="filter-sort-btn" id="' + btnId + '">' +
          '<div class="filter-sort-btn-content">' +
            (cfg.defaultIcon || '') +
            '<span class="filter-sort-btn-text">' + escHtml(cfg.defaultLabel) + '</span>' +
          '</div>' +
          '<svg class="filter-sort-arrow" width="12" height="12" viewBox="0 0 12 12" fill="none">' +
            '<path d="M2 4L6 8L10 4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>' +
          '</svg>' +
        '</button>' +
        '<div class="filter-search-dd-menu" id="' + menuId + '">' +
          '<div class="filter-search-dd-input-wrap">' +
            '<input type="text" class="filter-search-dd-input" id="' + inputId +
              '" placeholder="' + escHtml(cfg.placeholder || 'ค้นหา...') + '" autocomplete="off" />' +
          '</div>' +
          '<div class="filter-search-dd-list" id="' + listId + '"></div>' +
          actionsHTML +
        '</div>' +
      '</div>';

    var btn = document.getElementById(btnId);
    var menu = document.getElementById(menuId);
    var searchInput = document.getElementById(inputId);
    var listEl = document.getElementById(listId);
    var btnContent = btn.querySelector('.filter-sort-btn-content');

    function closeMenu() {
      menu.classList.remove('open');
      btn.classList.remove('open');
    }

    function findOptionByValue(value) {
      for (var i = 0; i < cfg.options.length; i++) {
        if (String(cfg.options[i].value) === String(value)) return cfg.options[i];
      }
      return null;
    }

    function getSelectedValues() {
      var arr = [];
      for (var k in selected) if (selected[k]) arr.push(k);
      return arr;
    }

    function updateTriggerSingle(value, label) {
      var selOpt = findOptionByValue(value);
      var iconHTML = (selOpt && selOpt.icon) ? selOpt.icon : (cfg.defaultIcon || '');
      btnContent.innerHTML = iconHTML +
        '<span class="filter-sort-btn-text">' + escHtml(label) + '</span>';
    }

    function updateTriggerMulti() {
      var values = getSelectedValues();
      var count = values.length;
      if (count === 0) {
        btnContent.innerHTML = (cfg.defaultIcon || '') +
          '<span class="filter-sort-btn-text">' + escHtml(cfg.defaultLabel) + '</span>';
      } else if (count === 1) {
        var opt = findOptionByValue(values[0]);
        var iconHTML = (opt && opt.icon) ? opt.icon : (cfg.defaultIcon || '');
        var label = opt ? opt.label : values[0];
        btnContent.innerHTML = iconHTML +
          '<span class="filter-sort-btn-text">' + escHtml(label) + '</span>';
      } else {
        var group = cfg.groupLabel || cfg.defaultLabel || '';
        btnContent.innerHTML = (cfg.defaultIcon || '') +
          '<span class="filter-sort-btn-text">' + escHtml(group) + ' (' + count + ')</span>';
      }
    }

    function renderList(query) {
      var q = (query || '').toLowerCase();
      var filtered = q
        ? cfg.options.filter(function (o) { return String(o.label).toLowerCase().indexOf(q) !== -1; })
        : cfg.options;

      if (!filtered.length) {
        listEl.innerHTML = '<div class="filter-search-dd-empty">ไม่พบข้อมูล</div>';
        return;
      }

      listEl.innerHTML = filtered.map(function (o) {
        var optIcon = o.icon ? o.icon : '';
        var val = String(o.value);
        var isActive = multi
          ? !!selected[val]
          : (val === String(currentValue));
        var cls = 'filter-search-dd-option' + (isActive ? ' active' : '');
        var checkbox = multi
          ? '<span class="filter-search-dd-check" aria-hidden="true">' +
              (isActive
                ? '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>'
                : '') +
            '</span>'
          : '';
        return '<button type="button" class="' + cls +
          '" data-value="' + escHtml(o.value) + '" data-label="' + escHtml(o.label) + '">' +
          checkbox + optIcon +
          '<span>' + escHtml(o.label) + '</span>' +
          '</button>';
      }).join('');

      Array.prototype.forEach.call(listEl.querySelectorAll('.filter-search-dd-option'), function (opt) {
        opt.addEventListener('click', function (e) {
          e.stopPropagation();
          var val = this.getAttribute('data-value');
          var lbl = this.getAttribute('data-label');

          if (multi) {
            if (!val) { // the "all" option clears selection
              selected = Object.create(null);
            } else if (selected[val]) {
              delete selected[val];
            } else {
              selected[val] = true;
            }
            renderList(searchInput.value);
          } else {
            currentValue = val;
            updateTriggerSingle(val, lbl);
            closeMenu();
            searchInput.value = '';
            renderList('');
            if (typeof cfg.onChange === 'function') cfg.onChange(val, lbl);
          }
        });
      });
    }

    renderList('');
    if (multi) updateTriggerMulti();

    btn.addEventListener('click', function (e) {
      e.stopPropagation();
      var isOpen = menu.classList.contains('open');
      if (!isOpen) {
        document.dispatchEvent(new CustomEvent(CLOSE_OVERLAY_EVENT));
      }
      menu.classList.toggle('open', !isOpen);
      btn.classList.toggle('open', !isOpen);
      if (!isOpen) setTimeout(function () { searchInput.focus(); }, 30);
    });

    searchInput.addEventListener('input', function (e) {
      e.stopPropagation();
      renderList(this.value);
    });
    searchInput.addEventListener('click', function (e) { e.stopPropagation(); });

    if (multi) {
      menu.querySelector('.filter-search-dd-clear').addEventListener('click', function (e) {
        e.stopPropagation();
        selected = Object.create(null);
        renderList(searchInput.value);
        updateTriggerMulti();
        if (typeof cfg.onChange === 'function') cfg.onChange('', []);
      });
      menu.querySelector('.filter-search-dd-confirm').addEventListener('click', function (e) {
        e.stopPropagation();
        var arr = getSelectedValues();
        closeMenu();
        searchInput.value = '';
        renderList('');
        updateTriggerMulti();
        if (typeof cfg.onChange === 'function') cfg.onChange(arr.join(','), arr);
      });
    }

    document.addEventListener(CLOSE_OVERLAY_EVENT, closeMenu);

    document.addEventListener('click', function (e) {
      if (!container.contains(e.target)) {
        closeMenu();
      }
    });

    return {
      destroy: function () {
        document.removeEventListener(CLOSE_OVERLAY_EVENT, closeMenu);
        container.innerHTML = '';
      }
    };
  }

  window.FilterSearchDropdown = { init: init };

})();
