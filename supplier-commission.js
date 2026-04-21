// supplier-commission.js
// Supplier Commission report page — vanilla JS
// Depends on: fe2-utils.js, fe2-filter-service.js, supplier-commission-api.js, Chart.js (CDN)

(function () {
  'use strict';

  // ------------------------------------------------------------------ //
  // State                                                               //
  // ------------------------------------------------------------------ //
  var reportData   = [];    // current dataset
  var sortField    = null;  // active sort column key
  var sortDir      = 'desc';
  var chartInstance = null;

  // Filter values
  var filterMode       = 'quarterly';  // 'all' | 'quarterly' | 'monthly' | 'yearly'
  var selectedYear     = FE2Utils().getCurrentYear();
  var selectedQuarter  = FE2Utils().getCurrentQuarter();
  var selectedMonth    = new Date().getMonth() + 1;
  var selectedCountry  = null;
  var selectedTeam     = null;
  var selectedJobPos   = null;
  var selectedUser     = null;

  // Short alias helpers — resolved after DOM ready
  var utils, filterSvc, api;

  // ------------------------------------------------------------------ //
  // Bootstrap                                                           //
  // ------------------------------------------------------------------ //
  document.addEventListener('DOMContentLoaded', function () {
    utils     = window.FE2Utils;
    filterSvc = window.FE2FilterService;
    api       = window.SupplierCommissionAPI;

    // Sync initial state from utils
    selectedYear    = utils.getCurrentYear();
    selectedQuarter = utils.getCurrentQuarter();

    renderShell();
    initFilterEvents();
    loadFilterOptions().then(function () {
      applyFilters();
    });
  });

  // ------------------------------------------------------------------ //
  // Render page shell (filter panel + result area)                     //
  // ------------------------------------------------------------------ //
  function renderShell() {
    var pc = document.getElementById('page-content');
    if (!pc) return;

    pc.innerHTML = [
      '<div class="sc-filter-panel">',
      '  <h2>ตัวกรอง</h2>',
      '  <div class="sc-filter-grid" id="sc-filter-grid">',
      '    <!-- populated by renderFilterGrid() -->',
      '  </div>',
      '</div>',
      '<div id="sc-results">',
      '  <!-- chart + table rendered here -->',
      '</div>'
    ].join('\n');

    renderFilterGrid();
  }

  // ------------------------------------------------------------------ //
  // Filter grid HTML                                                    //
  // ------------------------------------------------------------------ //
  function renderFilterGrid() {
    var grid = document.getElementById('sc-filter-grid');
    if (!grid) return;

    var quarterOpts  = utils.getQuarterOptions();
    var yearOpts     = utils.getYearOptions();
    var monthOpts    = utils.getMonthOptions();

    // Build quarter select options
    var quarterOptHTML = quarterOpts.map(function (o) {
      var val = o.year + '-' + o.quarter;
      var sel = (o.year === selectedYear && o.quarter === selectedQuarter) ? ' selected' : '';
      return '<option value="' + val + '"' + sel + '>' + o.label + '</option>';
    }).join('');

    // Build year options
    var yearOptHTML = yearOpts.map(function (y) {
      return '<option value="' + y + '"' + (y === selectedYear ? ' selected' : '') + '>' + y + '</option>';
    }).join('');

    // Build month options
    var monthOptHTML = monthOpts.map(function (m) {
      return '<option value="' + m.value + '"' + (m.value === selectedMonth ? ' selected' : '') + '>' + m.label + '</option>';
    }).join('');

    // Period secondary select — depends on filterMode
    var periodHTML = '';
    if (filterMode === 'quarterly') {
      periodHTML = '<div class="sc-filter-group" id="sc-period-group">'
        + '<label>ไตรมาส</label>'
        + '<select id="sc-quarter-select">' + quarterOptHTML + '</select>'
        + '</div>';
    } else if (filterMode === 'monthly') {
      periodHTML = '<div class="sc-filter-group" id="sc-period-group">'
        + '<label>เดือน</label>'
        + '<select id="sc-month-select">' + monthOptHTML + '</select>'
        + '</div>'
        + '<div class="sc-filter-group" id="sc-year-group">'
        + '<label>ปี</label>'
        + '<select id="sc-year-select">' + yearOptHTML + '</select>'
        + '</div>';
    } else if (filterMode === 'yearly') {
      periodHTML = '<div class="sc-filter-group" id="sc-period-group">'
        + '<label>ปี</label>'
        + '<select id="sc-year-select">' + yearOptHTML + '</select>'
        + '</div>';
    }

    grid.innerHTML = [
      '<!-- Report mode -->',
      '<div class="sc-filter-group">',
      '  <label>รูปแบบรายงาน</label>',
      '  <select id="sc-mode-select">',
      '    <option value="all"'       + (filterMode === 'all'       ? ' selected' : '') + '>ทั้งหมด</option>',
      '    <option value="quarterly"' + (filterMode === 'quarterly' ? ' selected' : '') + '>รายไตรมาส</option>',
      '    <option value="monthly"'   + (filterMode === 'monthly'   ? ' selected' : '') + '>รายเดือน</option>',
      '    <option value="yearly"'    + (filterMode === 'yearly'    ? ' selected' : '') + '>รายปี</option>',
      '  </select>',
      '</div>',
      periodHTML,
      '<!-- Country -->',
      '<div class="sc-filter-group">',
      '  <label>ประเทศ</label>',
      '  <select id="sc-country-select">',
      '    <option value="">ทุกประเทศ</option>',
      '  </select>',
      '</div>',
      '<!-- Team -->',
      '<div class="sc-filter-group">',
      '  <label>ทีม</label>',
      '  <select id="sc-team-select">',
      '    <option value="">ทุกทีม</option>',
      '  </select>',
      '</div>',
      '<!-- Job Position -->',
      '<div class="sc-filter-group">',
      '  <label>ตำแหน่งงาน</label>',
      '  <select id="sc-jobpos-select">',
      '    <option value="">ทุกตำแหน่ง</option>',
      '  </select>',
      '</div>',
      '<!-- User -->',
      '<div class="sc-filter-group">',
      '  <label>ผู้ใช้</label>',
      '  <select id="sc-user-select">',
      '    <option value="">ทุกคน</option>',
      '  </select>',
      '</div>',
      '<!-- Apply -->',
      '<div class="sc-filter-actions">',
      '  <button class="sc-btn-apply" id="sc-apply-btn">แสดงผล</button>',
      '</div>'
    ].join('\n');
  }

  // ------------------------------------------------------------------ //
  // Load dropdown options from API                                     //
  // ------------------------------------------------------------------ //
  async function loadFilterOptions() {
    try {
      var results = await Promise.all([
        filterSvc.getCountries(),
        filterSvc.getTeams()
      ]);
      populateCountries(results[0]);
      populateTeams(results[1]);
    } catch (err) {
      console.warn('[SupplierCommission] loadFilterOptions error:', err);
    }
  }

  function populateCountries(countries) {
    var sel = document.getElementById('sc-country-select');
    if (!sel) return;
    var sorted = utils.sortCountriesByThai(countries || []);
    sorted.forEach(function (c) {
      var opt = document.createElement('option');
      opt.value = c.id;
      opt.textContent = c.name_th;
      if (selectedCountry && Number(selectedCountry) === c.id) opt.selected = true;
      sel.appendChild(opt);
    });
  }

  function populateTeams(teams) {
    var sel = document.getElementById('sc-team-select');
    if (!sel) return;
    (teams || []).forEach(function (t) {
      var opt = document.createElement('option');
      opt.value = t.team_number;
      opt.textContent = 'Team ' + t.team_number;
      if (selectedTeam && Number(selectedTeam) === t.team_number) opt.selected = true;
      sel.appendChild(opt);
    });
  }

  async function refreshJobPositions() {
    var sel = document.getElementById('sc-jobpos-select');
    if (!sel) return;
    sel.innerHTML = '<option value="">ทุกตำแหน่ง</option>';
    try {
      var positions = await filterSvc.getJobPositions(selectedTeam || undefined);
      var filtered = utils.filterAndDisplayJobPositions(positions, selectedTeam || undefined);
      filtered.forEach(function (p) {
        var opt = document.createElement('option');
        opt.value = p.job_position;
        opt.textContent = p.display_name;
        if (selectedJobPos === p.job_position) opt.selected = true;
        sel.appendChild(opt);
      });
    } catch (err) {
      console.warn('[SupplierCommission] refreshJobPositions error:', err);
    }
  }

  async function refreshUsers() {
    var sel = document.getElementById('sc-user-select');
    if (!sel) return;
    sel.innerHTML = '<option value="">ทุกคน</option>';
    try {
      var users = await filterSvc.getUsers(selectedTeam || undefined, selectedJobPos || undefined);
      users.forEach(function (u) {
        var opt = document.createElement('option');
        opt.value = u.ID;
        opt.textContent = u.nickname || ((u.first_name || '') + ' ' + (u.last_name || '')).trim() || ('User ' + u.ID);
        if (selectedUser && Number(selectedUser) === u.ID) opt.selected = true;
        sel.appendChild(opt);
      });
    } catch (err) {
      console.warn('[SupplierCommission] refreshUsers error:', err);
    }
  }

  // ------------------------------------------------------------------ //
  // Event wiring                                                        //
  // ------------------------------------------------------------------ //
  function initFilterEvents() {
    var grid = document.getElementById('sc-filter-grid');
    if (!grid) return;

    // Use event delegation since inner HTML is re-rendered on mode change
    grid.addEventListener('change', function (e) {
      var id = e.target.id;

      if (id === 'sc-mode-select') {
        filterMode = e.target.value;
        // Reset period to current
        if (filterMode === 'quarterly') {
          selectedQuarter = utils.getCurrentQuarter();
          selectedYear    = utils.getCurrentYear();
        } else if (filterMode === 'monthly') {
          selectedMonth = new Date().getMonth() + 1;
          selectedYear  = utils.getCurrentYear();
        } else if (filterMode === 'yearly') {
          selectedYear = utils.getCurrentYear();
        }
        renderFilterGrid();
        // Re-populate dropdowns (countries/teams were already loaded — just re-attach)
        loadFilterOptions();
        return;
      }

      if (id === 'sc-quarter-select') {
        var parts = e.target.value.split('-');
        selectedYear    = Number(parts[0]);
        selectedQuarter = Number(parts[1]);
        return;
      }

      if (id === 'sc-month-select') {
        selectedMonth = Number(e.target.value);
        return;
      }

      if (id === 'sc-year-select') {
        selectedYear = Number(e.target.value);
        return;
      }

      if (id === 'sc-country-select') {
        selectedCountry = e.target.value ? Number(e.target.value) : null;
        return;
      }

      if (id === 'sc-team-select') {
        selectedTeam   = e.target.value ? Number(e.target.value) : null;
        selectedJobPos = null;
        selectedUser   = null;
        refreshJobPositions();
        refreshUsers();
        return;
      }

      if (id === 'sc-jobpos-select') {
        selectedJobPos = e.target.value || null;
        selectedUser   = null;
        refreshUsers();
        return;
      }

      if (id === 'sc-user-select') {
        selectedUser = e.target.value ? Number(e.target.value) : null;
        return;
      }
    });

    grid.addEventListener('click', function (e) {
      if (e.target && e.target.id === 'sc-apply-btn') {
        applyFilters();
      }
    });
  }

  // ------------------------------------------------------------------ //
  // Build filter params & fetch                                        //
  // ------------------------------------------------------------------ //
  async function applyFilters() {
    var params = {};

    if (filterMode !== 'all') {
      params.year = selectedYear;
    }
    if (filterMode === 'quarterly') {
      params.quarter = selectedQuarter;
    } else if (filterMode === 'monthly') {
      params.month = selectedMonth;
    }
    if (selectedCountry && selectedCountry > 0) {
      params.country_id = selectedCountry;
    }
    if (selectedTeam)   params.team_number  = selectedTeam;
    if (selectedJobPos) params.job_position = selectedJobPos;
    if (selectedUser)   params.user_id      = selectedUser;

    showLoading();

    try {
      var data = await api.fetchReport(params);
      if (data && Array.isArray(data)) {
        // Default sort: total_commission desc
        reportData = data.slice().sort(function (a, b) {
          return b.metrics.total_commission - a.metrics.total_commission;
        });
      } else {
        reportData = [];
      }
      sortField = null;
      sortDir   = 'desc';
      renderResults();
    } catch (err) {
      console.error('[SupplierCommission] applyFilters error:', err);
      showError('เกิดข้อผิดพลาดในการโหลดข้อมูล: ' + (err.message || 'กรุณาลองใหม่อีกครั้ง'));
    }
  }

  // ------------------------------------------------------------------ //
  // Results area helpers                                               //
  // ------------------------------------------------------------------ //
  function getResultsEl() {
    return document.getElementById('sc-results');
  }

  function showLoading() {
    var el = getResultsEl();
    if (!el) return;
    el.innerHTML = '<div class="sc-loading"><div class="sc-spinner"></div><span>กำลังโหลดข้อมูล Supplier Commission...</span></div>';
  }

  function showError(msg) {
    var el = getResultsEl();
    if (!el) return;
    el.innerHTML = '<div class="sc-error-banner">'
      + '<svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd"/></svg>'
      + '<span>' + escHtml(msg) + '</span>'
      + '</div>';
  }

  function showEmpty() {
    var el = getResultsEl();
    if (!el) return;
    el.innerHTML = '<div class="sc-empty-state">'
      + '<svg fill="none" viewBox="0 0 24 24" stroke="#d1d5db" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>'
      + '<p>ไม่พบข้อมูลตามเงื่อนไขที่เลือก</p>'
      + '</div>';
  }

  // ------------------------------------------------------------------ //
  // Render chart + table                                               //
  // ------------------------------------------------------------------ //
  function renderResults() {
    if (!reportData.length) {
      showEmpty();
      return;
    }

    var el = getResultsEl();
    if (!el) return;

    el.innerHTML = [
      '<!-- Chart -->',
      '<div class="sc-chart-card">',
      '  <h2>Top 10 Supplier Commission</h2>',
      '  <div class="sc-chart-wrapper"><canvas id="sc-chart"></canvas></div>',
      '</div>',
      '<!-- Table -->',
      '<div class="sc-table-card">',
      '  <div class="sc-table-header">',
      '    <h2>รายละเอียด Supplier</h2>',
      '    <button class="sc-btn-export" id="sc-export-btn">',
      '      <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>',
      '      Export CSV',
      '    </button>',
      '  </div>',
      '  <div class="sc-table-wrapper">',
      '    <table class="sc-table" id="sc-data-table">',
      '      <thead>' + renderTableHead() + '</thead>',
      '      <tbody>' + renderTableBody() + '</tbody>',
      '    </table>',
      '  </div>',
      '</div>'
    ].join('\n');

    renderChart();
    bindTableSort();
    document.getElementById('sc-export-btn').addEventListener('click', exportCSV);
  }

  // ------------------------------------------------------------------ //
  // Chart (Chart.js grouped bar — top 10)                             //
  // ------------------------------------------------------------------ //
  function renderChart() {
    var canvas = document.getElementById('sc-chart');
    if (!canvas) return;

    if (chartInstance) {
      chartInstance.destroy();
      chartInstance = null;
    }

    var top10 = reportData.slice(0, 10);
    var labels = top10.map(function (item) {
      var name = item.supplier_name_th || item.supplier_name_en || 'N/A';
      return name.length > 15 ? name.substring(0, 15) + '...' : name;
    });
    var fullNames = top10.map(function (item) {
      return (item.supplier_name_th || '') + (item.supplier_name_en ? ' (' + item.supplier_name_en + ')' : '');
    });

    var totalCommData = top10.map(function (item) { return item.metrics.total_commission; });
    var netCommData   = top10.map(function (item) { return item.metrics.total_net_commission; });

    chartInstance = new Chart(canvas, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [
          {
            label: 'Total Commission',
            data: totalCommData,
            backgroundColor: 'rgba(59, 130, 246, 0.7)',
            borderColor: 'rgba(59, 130, 246, 1)',
            borderWidth: 1
          },
          {
            label: 'Net Commission',
            data: netCommData,
            backgroundColor: 'rgba(16, 185, 129, 0.7)',
            borderColor: 'rgba(16, 185, 129, 1)',
            borderWidth: 1
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'top' },
          tooltip: {
            callbacks: {
              title: function (items) {
                var idx = items[0].dataIndex;
                return fullNames[idx] || labels[idx];
              },
              label: function (item) {
                return item.dataset.label + ': ฿' + utils.formatCurrency(item.parsed.y);
              }
            }
          }
        },
        scales: {
          x: {
            ticks: {
              maxRotation: 45,
              minRotation: 30,
              font: { family: 'Kanit, sans-serif', size: 11 }
            }
          },
          y: {
            ticks: {
              callback: function (val) { return '฿' + utils.formatCurrency(val); },
              font: { family: 'Kanit, sans-serif', size: 11 }
            }
          }
        }
      }
    });
  }

  // ------------------------------------------------------------------ //
  // Table                                                              //
  // ------------------------------------------------------------------ //
  var SORT_FIELDS = [
    { key: 'total_commission',          label: 'Total Comm.',        align: 'right' },
    { key: 'total_net_commission',      label: 'Net Comm.',          align: 'right' },
    { key: 'total_pax',                 label: 'จำนวนผู้เดินทาง',   align: 'center' },
    { key: 'avg_commission_per_pax',    label: 'Avg Comm.(ต่อคน)',   align: 'right' },
    { key: 'avg_net_commission_per_pax',label: 'Avg Net(สุทธิต่อคน)', align: 'right' }
  ];

  function sortIconHTML(key) {
    if (sortField !== key) {
      return '<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4"/></svg>';
    }
    if (sortDir === 'desc') {
      return '<svg fill="none" stroke="#4a7ba7" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 14l-7 7m0 0l-7-7m7 7V3"/></svg>';
    }
    return '<svg fill="none" stroke="#4a7ba7" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 10l7-7m0 0l7 7m-7-7v18"/></svg>';
  }

  function renderTableHead() {
    var th = '<tr>';
    th += '<th>Supplier Name</th>';
    SORT_FIELDS.forEach(function (f) {
      var alignClass = f.align === 'right' ? 'sc-th-right' : (f.align === 'center' ? 'sc-th-center' : '');
      var activeClass = sortField === f.key ? ' sc-sort-active' : '';
      th += '<th class="' + alignClass + '">'
          + '<button class="sc-sort-btn' + activeClass + '" data-sort="' + f.key + '">'
          + escHtml(f.label) + sortIconHTML(f.key)
          + '</button></th>';
    });
    th += '</tr>';
    return th;
  }

  function renderTableBody() {
    return reportData.map(function (item) {
      var m = item.metrics;
      return '<tr>'
        + '<td><div class="sc-supplier-name-th">' + escHtml(item.supplier_name_th || '') + '</div>'
        + '<div class="sc-supplier-name-en">' + escHtml(item.supplier_name_en || '') + '</div></td>'
        + '<td class="sc-td-right">฿' + utils.formatCurrency(m.total_commission) + '</td>'
        + '<td class="sc-td-right sc-net-value">฿' + utils.formatCurrency(m.total_net_commission) + '</td>'
        + '<td class="sc-td-center"><span class="sc-pax-badge">' + Number(m.total_pax).toLocaleString() + '</span></td>'
        + '<td class="sc-td-right sc-avg-value">฿' + utils.formatCurrency(m.avg_commission_per_pax) + '</td>'
        + '<td class="sc-td-right">฿' + utils.formatCurrency(m.avg_net_commission_per_pax) + '</td>'
        + '</tr>';
    }).join('');
  }

  function bindTableSort() {
    var table = document.getElementById('sc-data-table');
    if (!table) return;
    table.querySelector('thead').addEventListener('click', function (e) {
      var btn = e.target.closest('[data-sort]');
      if (!btn) return;
      var field = btn.getAttribute('data-sort');
      if (sortField === field) {
        sortDir = sortDir === 'desc' ? 'asc' : 'desc';
      } else {
        sortField = field;
        sortDir   = 'desc';
      }
      reportData.sort(function (a, b) {
        var av = a.metrics[field];
        var bv = b.metrics[field];
        return sortDir === 'desc' ? bv - av : av - bv;
      });
      // Re-render only thead + tbody (keep chart alive)
      table.querySelector('thead').innerHTML = renderTableHead();
      table.querySelector('tbody').innerHTML = renderTableBody();
      // Re-bind since thead was replaced
      bindTableSort();
    });
  }

  // ------------------------------------------------------------------ //
  // Export CSV                                                         //
  // ------------------------------------------------------------------ //
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
      var m = item.metrics;
      return [
        '"' + (item.supplier_name_th || '').replace(/"/g, '""') + '"',
        '"' + (item.supplier_name_en || '').replace(/"/g, '""') + '"',
        m.total_commission,
        m.total_net_commission,
        m.total_pax,
        m.avg_commission_per_pax,
        m.avg_net_commission_per_pax
      ].join(',');
    });

    var csv = '﻿' + [headers.join(',')].concat(rows).join('\n');
    var blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    var url  = URL.createObjectURL(blob);
    var link = document.createElement('a');
    link.href = url;
    link.download = 'supplier-commission-' + new Date().toISOString().split('T')[0] + '.csv';
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  // ------------------------------------------------------------------ //
  // Utility                                                            //
  // ------------------------------------------------------------------ //
  function escHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  // Lazy accessor so it can be called before DOMContentLoaded
  function FE2Utils() {
    return window.FE2Utils || {};
  }

})();
