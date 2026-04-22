// supplier-commission.js
// Supplier Commission report page — vanilla JS
// Depends on: shared-utils.js, shared-filter-service.js, supplier-commission-api.js,
//             shared-ui.js, shared-chart.js, shared-table.js, shared-csv.js,
//             filter-sort-dropdown-component.js, searchable-dropdown-component.js,
//             Chart.js (CDN)

(function () {
  'use strict';

  var SORT_FIELDS = [
    { key: 'total_commission',           label: 'Total Comm.',          align: 'right'  },
    { key: 'total_net_commission',       label: 'Net Comm.',            align: 'right'  },
    { key: 'total_pax',                  label: 'จำนวนผู้เดินทาง',      align: 'center' },
    { key: 'avg_commission_per_pax',     label: 'Avg Comm.(ต่อคน)',     align: 'right'  },
    { key: 'avg_net_commission_per_pax', label: 'Avg Net(สุทธิต่อคน)',  align: 'right'  }
  ];

  var reportData    = [];
  var sortField     = 'total_commission';
  var sortDir       = 'desc';
  var chartInstance = null;

  var filterState = {
    mode         : 'quarterly',
    year         : null,
    quarter      : null,
    month        : new Date().getMonth() + 1,
    country_id   : null,
    team_number  : null,
    job_position : null,
    user_id      : null
  };

  // Dropdown option caches populated once from SharedFilterService.
  var filterOptions = {
    countries    : [],
    teams        : [],
    jobPositions : [],
    users        : []
  };

  document.addEventListener('DOMContentLoaded', function () {
    filterState.year    = window.SharedUtils.getCurrentYear();
    filterState.quarter = window.SharedUtils.getCurrentQuarter();

    renderShell();
    loadFilterOptions().then(function () {
      renderFilterPanel();
      applyFilters();
    });
  });

  function renderShell() {
    var pc = document.getElementById('page-content');
    if (!pc) return;
    pc.innerHTML =
      '<div id="sc-filter-container"></div>' +
      '<div id="sc-results"></div>';
  }

  async function loadFilterOptions() {
    try {
      var results = await Promise.all([
        window.SharedFilterService.getCountries(),
        window.SharedFilterService.getTeams(),
        window.SharedFilterService.getJobPositions(),
        window.SharedFilterService.getUsers()
      ]);
      filterOptions.countries    = results[0] || [];
      filterOptions.teams        = results[1] || [];
      filterOptions.jobPositions = results[2] || [];
      filterOptions.users        = results[3] || [];
    } catch (err) {
      console.warn('[SupplierCommission] loadFilterOptions error:', err);
    }
  }

  // ── Filter panel ──────────────────────────────────────────────────────────

  function renderFilterPanel() {
    var container = document.getElementById('sc-filter-container');
    if (!container) return;

    container.innerHTML =
      '<div class="filter-wrap filter-wrap-stacked">' +
        '<div class="filter-row">' +
          '<span class="filter-label">รูปแบบ</span>' +
          '<div id="sc-dd-mode"></div>' +
          '<div class="filter-separator"></div>' +
          '<span class="filter-label" id="sc-period-label">ช่วงเวลา</span>' +
          '<div id="sc-period-controls" style="display:flex;gap:8px;align-items:center;"></div>' +
          '<div class="filter-separator"></div>' +
          '<span class="filter-label">ประเทศ</span>' +
          '<div id="sc-dd-country"></div>' +
        '</div>' +
        '<div class="filter-row-divider"></div>' +
        '<div class="filter-row">' +
          '<span class="filter-label">ทีม</span>' +
          '<div id="sc-dd-team"></div>' +
          '<div class="filter-separator"></div>' +
          '<span class="filter-label">ตำแหน่ง</span>' +
          '<div id="sc-dd-jobpos"></div>' +
          '<div class="filter-separator"></div>' +
          '<span class="filter-label">ผู้ใช้</span>' +
          '<div id="sc-dd-user"></div>' +
          '<button type="button" class="filter-btn-search" id="sc-btn-apply">' +
            svgSearch() + 'ค้นหา' +
          '</button>' +
          '<button type="button" class="filter-btn-reset" id="sc-btn-reset">' +
            svgReset() + 'เริ่มใหม่' +
          '</button>' +
        '</div>' +
      '</div>';

    initModeDropdown();
    initPeriodControls();
    initCountryDropdown();
    initTeamDropdown();
    initJobPosDropdown();
    initUserDropdown();

    document.getElementById('sc-btn-apply').addEventListener('click', applyFilters);
    document.getElementById('sc-btn-reset').addEventListener('click', resetFilters);
  }

  function initModeDropdown() {
    var opts = [
      { value: 'all',       label: 'ทั้งหมด',    icon: svgAll() },
      { value: 'quarterly', label: 'รายไตรมาส',  icon: svgCalendar() },
      { value: 'monthly',   label: 'รายเดือน',   icon: svgCalendar() },
      { value: 'yearly',    label: 'รายปี',       icon: svgCalendar() }
    ].map(function (o) { return Object.assign({}, o, { active: o.value === filterState.mode }); });

    var current = findOption(opts, filterState.mode);
    window.FilterSortDropdownComponent.initDropdown({
      containerId : 'sc-dd-mode',
      defaultLabel: current.label,
      defaultIcon : current.icon,
      options     : opts,
      onChange    : function (val) {
        filterState.mode = val;
        // Re-sync period defaults when switching mode.
        filterState.year    = window.SharedUtils.getCurrentYear();
        filterState.quarter = window.SharedUtils.getCurrentQuarter();
        filterState.month   = new Date().getMonth() + 1;
        initPeriodControls();
      }
    });
  }

  function initPeriodControls() {
    var host = document.getElementById('sc-period-controls');
    var label = document.getElementById('sc-period-label');
    if (!host || !label) return;

    if (filterState.mode === 'all') {
      host.innerHTML = '';
      label.style.display = 'none';
      host.style.display = 'none';
      return;
    }

    label.style.display = '';
    host.style.display = 'flex';

    if (filterState.mode === 'quarterly') {
      host.innerHTML = '<div id="sc-dd-quarter"></div>';
      var quarters = (window.SharedUtils.getQuarterOptions() || []).map(function (q) {
        return {
          value : q.year + '-' + q.quarter,
          label : q.label,
          active: Number(q.year) === Number(filterState.year) &&
                  Number(q.quarter) === Number(filterState.quarter)
        };
      });
      var activeQ = findActive(quarters) || quarters[0];
      window.FilterSortDropdownComponent.initDropdown({
        containerId : 'sc-dd-quarter',
        defaultLabel: activeQ ? activeQ.label : 'เลือกไตรมาส',
        defaultIcon : svgCalendar(),
        options     : quarters,
        onChange    : function (val) {
          var parts = String(val).split('-');
          if (parts.length === 2) {
            filterState.year    = parseInt(parts[0], 10);
            filterState.quarter = parseInt(parts[1], 10);
          }
        }
      });
    } else if (filterState.mode === 'monthly') {
      host.innerHTML = '<div id="sc-dd-month"></div><div id="sc-dd-year"></div>';
      var months = (window.SharedUtils.getMonthOptions() || []).map(function (m) {
        return { value: String(m.value), label: m.label, active: Number(m.value) === Number(filterState.month) };
      });
      var activeM = findActive(months) || months[0];
      window.FilterSortDropdownComponent.initDropdown({
        containerId : 'sc-dd-month',
        defaultLabel: activeM ? activeM.label : 'เลือกเดือน',
        defaultIcon : svgCalendar(),
        options     : months,
        onChange    : function (val) {
          filterState.month = parseInt(val, 10);
        }
      });
      initYearDropdown();
    } else if (filterState.mode === 'yearly') {
      host.innerHTML = '<div id="sc-dd-year"></div>';
      initYearDropdown();
    }
  }

  function initYearDropdown() {
    var years = (window.SharedUtils.getYearOptions() || []).map(function (y) {
      var val = (y && typeof y === 'object') ? y.value : y;
      var lbl = (y && typeof y === 'object') ? (y.label || String(y.value)) : String(y);
      return { value: String(val), label: lbl, active: Number(val) === Number(filterState.year) };
    });
    var activeY = findActive(years) || years[0];
    window.FilterSortDropdownComponent.initDropdown({
      containerId : 'sc-dd-year',
      defaultLabel: activeY ? activeY.label : 'เลือกปี',
      defaultIcon : svgCalendar(),
      options     : years,
      onChange    : function (val) {
        filterState.year = parseInt(val, 10);
      }
    });
  }

  function initCountryDropdown() {
    var countries = filterOptions.countries.slice();
    if (window.SharedUtils.sortCountriesByThai) {
      try { countries = window.SharedUtils.sortCountriesByThai(countries); } catch (e) { /* ignore */ }
    }
    var opts = [{ value: '', label: 'ทุกประเทศ', icon: svgGlobe(), active: filterState.country_id == null }]
      .concat(countries.map(function (c) {
        return {
          value : String(c.id),
          label : c.name_th || c.name_en || ('#' + c.id),
          icon  : svgGlobe(),
          active: filterState.country_id != null && Number(c.id) === Number(filterState.country_id)
        };
      }));
    var current = findActive(opts) || opts[0];
    initSearchableDropdown({
      containerId : 'sc-dd-country',
      defaultLabel: current.label,
      defaultIcon : current.icon,
      options     : opts,
      placeholder : 'ค้นหาประเทศ...',
      onChange    : function (val) {
        filterState.country_id = val ? parseInt(val, 10) : null;
      }
    });
  }

  function initTeamDropdown() {
    var opts = [{ value: '', label: 'ทุกทีม', icon: svgTeam(), active: filterState.team_number == null }]
      .concat((filterOptions.teams || []).map(function (t) {
        return {
          value : String(t.team_number),
          label : 'Team ' + t.team_number,
          icon  : svgTeam(),
          active: filterState.team_number != null && Number(t.team_number) === Number(filterState.team_number)
        };
      }));
    var current = findActive(opts) || opts[0];
    window.FilterSortDropdownComponent.initDropdown({
      containerId : 'sc-dd-team',
      defaultLabel: current.label,
      defaultIcon : current.icon,
      options     : opts,
      onChange    : function (val) {
        filterState.team_number  = val ? parseInt(val, 10) : null;
        filterState.job_position = null;  // cascade reset
        filterState.user_id      = null;
        initJobPosDropdown();
        initUserDropdown();
      }
    });
  }

  function initJobPosDropdown() {
    var raw = filterOptions.jobPositions || [];
    var jobs = window.SharedUtils.filterAndDisplayJobPositions
      ? window.SharedUtils.filterAndDisplayJobPositions(raw, filterState.team_number || undefined)
      : raw;
    var opts = [{ value: '', label: 'ทุกตำแหน่ง', icon: svgRole(), active: filterState.job_position == null }]
      .concat(jobs.map(function (p) {
        return {
          value : String(p.job_position),
          label : p.display_name || p.job_position,
          icon  : svgRole(),
          active: filterState.job_position != null &&
                  String(filterState.job_position).toLowerCase() === String(p.job_position).toLowerCase()
        };
      }));
    var current = findActive(opts) || opts[0];
    window.FilterSortDropdownComponent.initDropdown({
      containerId : 'sc-dd-jobpos',
      defaultLabel: current.label,
      defaultIcon : current.icon,
      options     : opts,
      onChange    : function (val) {
        filterState.job_position = val || null;
        filterState.user_id      = null;  // cascade reset
        initUserDropdown();
      }
    });
  }

  function initUserDropdown() {
    var all = filterOptions.users || [];
    var filtered = all.filter(function (u) {
      if (filterState.team_number && u.team_number !== filterState.team_number) return false;
      if (filterState.job_position && (!u.job_position ||
          u.job_position.toLowerCase() !== String(filterState.job_position).toLowerCase())) return false;
      return true;
    });
    var opts = [{ value: '', label: 'ทุกคน', icon: svgPerson(), active: filterState.user_id == null }]
      .concat(filtered.map(function (u) {
        return {
          value : String(u.ID),
          label : userDisplayName(u),
          icon  : svgPerson(),
          active: filterState.user_id != null && Number(u.ID) === Number(filterState.user_id)
        };
      }));
    var current = findActive(opts) || opts[0];
    initSearchableDropdown({
      containerId : 'sc-dd-user',
      defaultLabel: current.label,
      defaultIcon : current.icon,
      options     : opts,
      placeholder : 'ค้นหาผู้ใช้...',
      onChange    : function (val) {
        filterState.user_id = val ? parseInt(val, 10) : null;
      }
    });
  }

  function userDisplayName(u) {
    if (!u) return '';
    if (u.nickname) return u.nickname;
    var first = u.first_name || '';
    var last  = u.last_name || '';
    var full  = (first + ' ' + last).trim();
    return full || ('User ' + (u.ID != null ? u.ID : ''));
  }

  function findActive(opts) {
    for (var i = 0; i < opts.length; i++) if (opts[i].active) return opts[i];
    return null;
  }

  function findOption(opts, value) {
    for (var i = 0; i < opts.length; i++) if (String(opts[i].value) === String(value)) return opts[i];
    return opts[0] || { value: '', label: '' };
  }

  // Searchable dropdown that visually matches .filter-sort-btn — local to this
  // page for now (will be promoted to a shared helper when the other 3 pages
  // migrate).
  function initSearchableDropdown(cfg) {
    var container = document.getElementById(cfg.containerId);
    if (!container) return null;

    var btnId = cfg.containerId + 'Btn';
    var menuId = cfg.containerId + 'Menu';
    var inputId = cfg.containerId + 'Search';
    var listId = cfg.containerId + 'List';
    var currentValue = '';
    var activeOpt = null;
    for (var i = 0; i < cfg.options.length; i++) {
      if (cfg.options[i].active) { activeOpt = cfg.options[i]; currentValue = String(cfg.options[i].value || ''); break; }
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
            '<input type="text" class="filter-search-dd-input" id="' + inputId + '" placeholder="' + escHtml(cfg.placeholder || 'ค้นหา...') + '" autocomplete="off" />' +
          '</div>' +
          '<div class="filter-search-dd-list" id="' + listId + '"></div>' +
        '</div>' +
      '</div>';

    var btn = document.getElementById(btnId);
    var menu = document.getElementById(menuId);
    var searchInput = document.getElementById(inputId);
    var listEl = document.getElementById(listId);
    var btnContent = btn.querySelector('.filter-sort-btn-content');

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
        return '<button type="button" class="filter-search-dd-option' +
          (String(o.value) === String(currentValue) ? ' active' : '') +
          '" data-value="' + escHtml(o.value) + '" data-label="' + escHtml(o.label) + '">' +
          (o.icon || '') +
          '<span>' + escHtml(o.label) + '</span>' +
          '</button>';
      }).join('');

      Array.prototype.forEach.call(listEl.querySelectorAll('.filter-search-dd-option'), function (opt) {
        opt.addEventListener('click', function (e) {
          e.stopPropagation();
          var val = this.getAttribute('data-value');
          var lbl = this.getAttribute('data-label');
          var foundIcon = '';
          for (var i = 0; i < cfg.options.length; i++) {
            if (String(cfg.options[i].value) === String(val)) { foundIcon = cfg.options[i].icon || ''; break; }
          }
          currentValue = val;
          btnContent.innerHTML = foundIcon + '<span class="filter-sort-btn-text">' + escHtml(lbl) + '</span>';
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

    searchInput.addEventListener('input', function (e) { e.stopPropagation(); renderList(this.value); });
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

  function resetFilters() {
    filterState.mode         = 'quarterly';
    filterState.year         = window.SharedUtils.getCurrentYear();
    filterState.quarter      = window.SharedUtils.getCurrentQuarter();
    filterState.month        = new Date().getMonth() + 1;
    filterState.country_id   = null;
    filterState.team_number  = null;
    filterState.job_position = null;
    filterState.user_id      = null;
    renderFilterPanel();
    applyFilters();
  }

  // ── Data ──────────────────────────────────────────────────────────────────

  async function applyFilters() {
    var params = {};
    if (filterState.mode !== 'all') params.year = filterState.year;
    if (filterState.mode === 'quarterly') params.quarter = filterState.quarter;
    else if (filterState.mode === 'monthly') params.month = filterState.month;
    if (filterState.country_id)   params.country_id   = filterState.country_id;
    if (filterState.team_number)  params.team_number  = filterState.team_number;
    if (filterState.job_position) params.job_position = filterState.job_position;
    if (filterState.user_id)      params.user_id      = filterState.user_id;

    var resultsEl = getResultsEl();
    if (!resultsEl) return;
    resultsEl.innerHTML = '';
    window.SharedUI.showLoading(resultsEl, 'กำลังโหลดข้อมูล Supplier Commission...');

    try {
      var data = await window.SupplierCommissionAPI.fetchReport(params);
      reportData = Array.isArray(data) ? data.slice() : [];
      sortField = 'total_commission';
      sortDir   = 'desc';
      sortReportData();
      renderResults();
    } catch (err) {
      console.error('[SupplierCommission] applyFilters error:', err);
      window.SharedUI.hideLoading(resultsEl);
      window.SharedUI.showError(
        resultsEl,
        'เกิดข้อผิดพลาดในการโหลดข้อมูล: ' + (err.message || 'กรุณาลองใหม่อีกครั้ง'),
        { retryFn: applyFilters }
      );
    }
  }

  function getResultsEl() {
    return document.getElementById('sc-results');
  }

  function sortReportData() {
    reportData.sort(function (a, b) {
      var av = a.metrics ? a.metrics[sortField] : 0;
      var bv = b.metrics ? b.metrics[sortField] : 0;
      return sortDir === 'desc' ? bv - av : av - bv;
    });
  }

  function renderResults() {
    var el = getResultsEl();
    if (!el) return;

    if (!reportData.length) {
      el.innerHTML =
        '<div class="sc-empty-state">' +
          '<svg fill="none" viewBox="0 0 24 24" stroke="#d1d5db" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>' +
          '<p>ไม่พบข้อมูลตามเงื่อนไขที่เลือก</p>' +
        '</div>';
      return;
    }

    el.innerHTML =
      '<div class="sc-chart-card">' +
        '<h2>Top 10 Supplier Commission</h2>' +
        '<div class="sc-chart-wrapper"><canvas id="sc-chart"></canvas></div>' +
      '</div>' +
      '<div class="sc-table-card">' +
        '<div class="sc-table-header">' +
          '<h2>รายละเอียด Supplier</h2>' +
          '<button class="sc-btn-export" id="sc-export-btn">' +
            '<svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>' +
            'Export CSV' +
          '</button>' +
        '</div>' +
        '<div id="sc-table-container"></div>' +
      '</div>';

    renderChart();
    renderTable();
    document.getElementById('sc-export-btn').addEventListener('click', exportCSV);
  }

  function renderChart() {
    var canvas = document.getElementById('sc-chart');
    if (!canvas) return;

    var top10 = reportData.slice()
      .sort(function (a, b) { return b.metrics.total_commission - a.metrics.total_commission; })
      .slice(0, 10);

    var labels = top10.map(function (item) {
      var name = item.supplier_name_th || item.supplier_name_en || 'N/A';
      return name.length > 15 ? name.substring(0, 15) + '...' : name;
    });
    var fullNames = top10.map(function (item) {
      return (item.supplier_name_th || '') +
        (item.supplier_name_en ? ' (' + item.supplier_name_en + ')' : '');
    });

    chartInstance = window.SharedChart.createBarChart({
      canvasEl: canvas,
      previous: chartInstance,
      labels  : labels,
      datasets: [
        {
          label: 'Total Commission',
          data : top10.map(function (i) { return i.metrics.total_commission; }),
          backgroundColor: 'rgba(59, 130, 246, 0.7)',
          borderColor    : 'rgba(59, 130, 246, 1)',
          borderWidth    : 1
        },
        {
          label: 'Net Commission',
          data : top10.map(function (i) { return i.metrics.total_net_commission; }),
          backgroundColor: 'rgba(16, 185, 129, 0.7)',
          borderColor    : 'rgba(16, 185, 129, 1)',
          borderWidth    : 1
        }
      ],
      options: {
        plugins: {
          tooltip: {
            callbacks: {
              title: function (items) { return fullNames[items[0].dataIndex] || labels[items[0].dataIndex]; },
              label: function (item)  { return item.dataset.label + ': ฿' + window.SharedUtils.formatCurrency(item.parsed.y); }
            }
          }
        }
      }
    });
  }

  function renderTable() {
    var container = document.getElementById('sc-table-container');
    if (!container) return;

    var columns = [
      {
        key: 'supplier',
        label: 'Supplier Name',
        sortable: false,
        align: 'left',
        format: function (_v, row) {
          return '<div class="sc-supplier-name-th">' + escHtml(row.supplier_name_th || '') + '</div>' +
                 '<div class="sc-supplier-name-en">' + escHtml(row.supplier_name_en || '') + '</div>';
        }
      }
    ].concat(SORT_FIELDS.map(function (f) {
      return {
        key     : f.key,
        label   : f.label,
        align   : f.align,
        sortable: true,
        format  : buildMetricFormatter(f.key)
      };
    }));

    window.SharedTable.render({
      containerEl: container,
      columns    : columns,
      rows       : reportData,
      sortKey    : sortField,
      sortDir    : sortDir,
      onSort     : function (key) {
        if (sortField === key) {
          sortDir = sortDir === 'desc' ? 'asc' : 'desc';
        } else {
          sortField = key;
          sortDir   = 'desc';
        }
        sortReportData();
        renderTable();
      }
    });
  }

  function buildMetricFormatter(key) {
    if (key === 'total_pax') {
      return function (_v, row) {
        return '<span class="sc-pax-badge">' + Number(row.metrics.total_pax).toLocaleString() + '</span>';
      };
    }
    var cellClass = key === 'total_net_commission' ? ' sc-net-value'
                  : key === 'avg_commission_per_pax' ? ' sc-avg-value'
                  : '';
    return function (_v, row) {
      return '<span class="' + cellClass.trim() + '">฿' +
        window.SharedUtils.formatCurrency(row.metrics[key]) + '</span>';
    };
  }

  function exportCSV() {
    var headers = [
      'Supplier Name (TH)',
      'Supplier Name (EN)',
      'Total Commission',
      'Net Commission',
      'Total PAX',
      'Avg Commission Per PAX',
      'Avg Net Commission Per PAX'
    ];
    var rows = reportData.map(function (item) {
      var m = item.metrics || {};
      return [
        item.supplier_name_th || '',
        item.supplier_name_en || '',
        m.total_commission,
        m.total_net_commission,
        m.total_pax,
        m.avg_commission_per_pax,
        m.avg_net_commission_per_pax
      ];
    });
    var dateStr = new Date().toISOString().split('T')[0].replace(/-/g, '');
    window.SharedCSV.export({
      filename: 'supplier-commission-' + dateStr + '.csv',
      headers : headers,
      rows    : rows
    });
  }

  // ── Utilities ─────────────────────────────────────────────────────────────

  function escHtml(str) {
    return String(str == null ? '' : str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  // ── Icons ─────────────────────────────────────────────────────────────────

  function svgCalendar() {
    return '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>';
  }
  function svgAll() {
    return '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>';
  }
  function svgGlobe() {
    return '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>';
  }
  function svgTeam() {
    return '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>';
  }
  function svgRole() {
    return '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 7h-3V5a2 2 0 0 0-2-2H9a2 2 0 0 0-2 2v2H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2z"/></svg>';
  }
  function svgPerson() {
    return '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>';
  }
  function svgSearch() {
    return '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>';
  }
  function svgReset() {
    return '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-4.5"/></svg>';
  }

})();
