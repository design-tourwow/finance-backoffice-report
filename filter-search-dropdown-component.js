// filter-search-dropdown-component.js
// Single-select dropdown with in-menu search.
// Visually matches .filter-sort-btn so it can sit beside FilterSortDropdowns
// in the same filter row. Styles come from filter-panel.css (.filter-search-dd-*).
//
// Exposes window.FilterSearchDropdown (IIFE).
//
// Usage:
//   FilterSearchDropdown.init({
//     containerId: 'my-container',
//     defaultLabel: 'ทุกคน',
//     defaultIcon : '<svg>...</svg>',        // optional
//     options     : [{value, label, icon, active}],
//     placeholder : 'ค้นหา...',              // optional, default 'ค้นหา...'
//     onChange    : function (value, label) { ... }
//   });

(function () {
  'use strict';

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

    var btnId = cfg.containerId + 'Btn';
    var menuId = cfg.containerId + 'Menu';
    var inputId = cfg.containerId + 'Search';
    var listId = cfg.containerId + 'List';
    var currentValue = '';
    for (var i = 0; i < cfg.options.length; i++) {
      if (cfg.options[i].active) {
        currentValue = String(cfg.options[i].value || '');
        break;
      }
    }

    container.innerHTML =
      '<div class="filter-search-dd">' +
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
        '</div>' +
      '</div>';

    var btn = document.getElementById(btnId);
    var menu = document.getElementById(menuId);
    var searchInput = document.getElementById(inputId);
    var listEl = document.getElementById(listId);
    var btnContent = btn.querySelector('.filter-sort-btn-content');

    function findOptionByValue(value) {
      for (var i = 0; i < cfg.options.length; i++) {
        if (String(cfg.options[i].value) === String(value)) return cfg.options[i];
      }
      return null;
    }

    function getTriggerIconHTML(value) {
      var selected = findOptionByValue(value);
      if (selected && selected.icon) return selected.icon;
      return cfg.defaultIcon || '';
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
        return '<button type="button" class="filter-search-dd-option' +
          (String(o.value) === String(currentValue) ? ' active' : '') +
          '" data-value="' + escHtml(o.value) + '" data-label="' + escHtml(o.label) + '">' +
          optIcon +
          '<span>' + escHtml(o.label) + '</span>' +
          '</button>';
      }).join('');

      Array.prototype.forEach.call(listEl.querySelectorAll('.filter-search-dd-option'), function (opt) {
        opt.addEventListener('click', function (e) {
          e.stopPropagation();
          var val = this.getAttribute('data-value');
          var lbl = this.getAttribute('data-label');
          currentValue = val;
          btnContent.innerHTML = getTriggerIconHTML(val) +
            '<span class="filter-sort-btn-text">' + escHtml(lbl) + '</span>';
          menu.classList.remove('open');
          btn.classList.remove('open');
          searchInput.value = '';
          renderList('');
          if (typeof cfg.onChange === 'function') cfg.onChange(val, lbl);
        });
      });
    }

    renderList('');

    btn.addEventListener('click', function (e) {
      e.stopPropagation();
      var isOpen = menu.classList.contains('open');
      document.querySelectorAll('.filter-sort-menu.open, .filter-search-dd-menu.open').forEach(function (m) {
        if (m !== menu) m.classList.remove('open');
      });
      document.querySelectorAll('.filter-sort-btn.open').forEach(function (b) {
        if (b !== btn) b.classList.remove('open');
      });
      menu.classList.toggle('open', !isOpen);
      btn.classList.toggle('open', !isOpen);
      if (!isOpen) setTimeout(function () { searchInput.focus(); }, 30);
    });

    searchInput.addEventListener('input', function (e) {
      e.stopPropagation();
      renderList(this.value);
    });
    searchInput.addEventListener('click', function (e) { e.stopPropagation(); });

    document.addEventListener('click', function (e) {
      if (!container.contains(e.target)) {
        menu.classList.remove('open');
        btn.classList.remove('open');
      }
    });

    return {
      destroy: function () { container.innerHTML = ''; }
    };
  }

  window.FilterSearchDropdown = { init: init };

})();
