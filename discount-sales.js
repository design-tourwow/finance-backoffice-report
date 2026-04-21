// discount-sales.js — Discount Sales Report page
// Depends on: fe2-utils.js, fe2-filter-service.js, discount-sales-api.js, Chart.js CDN

(function () {
  'use strict';

  // ── State ──────────────────────────────────────────────────────────────────
  var allData       = [];
  var sortField     = null;   // 'total_commission' | 'total_discount' | 'discount_percentage' | 'order_count' | 'net_commission'
  var sortDirection = 'desc';

  // Filter state
  var filterMode    = 'quarterly';
  var selectedYear, selectedQuarter, selectedMonth;
  var selectedCountry = '';
  var selectedJobPosition = '';
  var selectedTeam  = '';
  var selectedUser  = '';

  // Raw lookup data
  var allUsers      = [];

  // Chart instances
  var chartAmount   = null;
  var chartPercent  = null;

  var utils  = window.FE2Utils;
  var svc    = window.FE2FilterService;

  // ── Bootstrap ──────────────────────────────────────────────────────────────
  document.addEventListener('DOMContentLoaded', function () {
    // Set initial filter defaults
    selectedYear    = utils.getCurrentYear();
    selectedQuarter = utils.getCurrentQuarter();
    selectedMonth   = new Date().getMonth() + 1;

    renderShell();
    loadInitialData();
  });

  // ── Shell HTML ─────────────────────────────────────────────────────────────
  function renderShell() {
    var el = document.getElementById('page-content');
    if (!el) return;
    el.innerHTML = buildFilterPanelHTML() +
      '<div id="ds-error-area"></div>' +
      '<div id="ds-loading-area"></div>' +
      '<div id="ds-results-area"></div>';

    bindFilterEvents();
  }

  // ── Filter Panel ───────────────────────────────────────────────────────────
  function buildFilterPanelHTML() {
    var quarterOpts = utils.getQuarterOptions().map(function (o) {
      var val = o.year + '-' + o.quarter;
      var sel = (o.year === selectedYear && o.quarter === selectedQuarter) ? ' selected' : '';
      return '<option value="' + val + '"' + sel + '>' + o.label + '</option>';
    }).join('');

    var monthOpts = utils.getMonthOptions().map(function (o) {
      var sel = o.value === selectedMonth ? ' selected' : '';
      return '<option value="' + o.value + '"' + sel + '>' + o.label + '</option>';
    }).join('');

    var yearOpts = utils.getYearOptions().map(function (y) {
      var sel = y === selectedYear ? ' selected' : '';
      return '<option value="' + y + '"' + sel + '>' + y + '</option>';
    }).join('');

    return [
      '<div class="ds-filter-panel">',
        '<h2>ตัวกรอง</h2>',
        '<div class="ds-filter-grid" id="ds-filter-grid">',
          '<div class="ds-filter-group">',
            '<label>รูปแบบรายงาน</label>',
            '<select id="ds-filter-mode">',
              '<option value="all">ทั้งหมด</option>',
              '<option value="quarterly" selected>รายไตรมาส</option>',
              '<option value="monthly">รายเดือน</option>',
              '<option value="yearly">รายปี</option>',
            '</select>',
          '</div>',
          '<div class="ds-filter-group" id="ds-period-wrap">',
            '<label id="ds-period-label">ไตรมาส</label>',
            '<select id="ds-quarter-select">' + quarterOpts + '</select>',
            '<select id="ds-month-select" style="display:none">' + monthOpts + '</select>',
            '<select id="ds-year-select" style="display:none">' + yearOpts + '</select>',
          '</div>',
          '<div class="ds-filter-group">',
            '<label>ประเทศ</label>',
            '<select id="ds-country"><option value="">ทุกประเทศ</option></select>',
          '</div>',
          '<div class="ds-filter-group">',
            '<label>ตำแหน่งงาน</label>',
            '<select id="ds-job-position"><option value="">ทุกตำแหน่ง</option></select>',
          '</div>',
          '<div class="ds-filter-group">',
            '<label>ทีม</label>',
            '<select id="ds-team"><option value="">ทุกทีม</option></select>',
          '</div>',
          '<div class="ds-filter-group">',
            '<label>ผู้ใช้</label>',
            '<select id="ds-user"><option value="">ทุกคน</option></select>',
          '</div>',
          '<div class="ds-filter-actions">',
            '<button class="ds-btn-apply" id="ds-apply-btn">Apply</button>',
          '</div>',
        '</div>',
      '</div>'
    ].join('');
  }

  function bindFilterEvents() {
    document.getElementById('ds-filter-mode').addEventListener('change', onFilterModeChange);
    document.getElementById('ds-quarter-select').addEventListener('change', function () {
      var parts = this.value.split('-');
      selectedYear    = parseInt(parts[0]);
      selectedQuarter = parseInt(parts[1]);
    });
    document.getElementById('ds-month-select').addEventListener('change', function () {
      selectedMonth = parseInt(this.value);
    });
    document.getElementById('ds-year-select').addEventListener('change', function () {
      selectedYear = parseInt(this.value);
    });
    document.getElementById('ds-country').addEventListener('change', function () {
      selectedCountry = this.value;
    });
    document.getElementById('ds-job-position').addEventListener('change', function () {
      selectedJobPosition = this.value;
      refreshUserDropdown();
    });
    document.getElementById('ds-team').addEventListener('change', function () {
      selectedTeam = this.value;
      refreshUserDropdown();
    });
    document.getElementById('ds-user').addEventListener('change', function () {
      selectedUser = this.value;
    });
    document.getElementById('ds-apply-btn').addEventListener('click', loadReportData);
  }

  function onFilterModeChange(e) {
    filterMode = e.target.value;
    var qSel = document.getElementById('ds-quarter-select');
    var mSel = document.getElementById('ds-month-select');
    var ySel = document.getElementById('ds-year-select');
    var wrap = document.getElementById('ds-period-wrap');
    var label = document.getElementById('ds-period-label');

    // Reset defaults
    if (filterMode === 'quarterly') {
      selectedQuarter = utils.getCurrentQuarter();
      selectedYear    = utils.getCurrentYear();
    } else if (filterMode === 'monthly') {
      selectedMonth = new Date().getMonth() + 1;
      selectedYear  = utils.getCurrentYear();
    }

    qSel.style.display = (filterMode === 'quarterly') ? '' : 'none';
    mSel.style.display = (filterMode === 'monthly')   ? '' : 'none';
    ySel.style.display = (filterMode === 'monthly' || filterMode === 'yearly') ? '' : 'none';
    wrap.style.display = (filterMode === 'all')       ? 'none' : '';

    if (filterMode === 'quarterly') label.textContent = 'ไตรมาส';
    else if (filterMode === 'monthly') label.textContent = 'เดือน / ปี';
    else if (filterMode === 'yearly') label.textContent = 'ปี';
  }

  // ── Populate Dropdowns ─────────────────────────────────────────────────────
  async function loadInitialData() {
    var results = await Promise.all([
      svc.getCountries(),
      svc.getTeams(),
      svc.getJobPositions(),
      svc.getUsers()
    ]);

    var countries    = utils.sortCountriesByThai(results[0]);
    var teams        = results[1];
    var jobPositions = results[2];
    allUsers         = results[3];

    populateSelect('ds-country', countries, function (c) {
      return { value: c.id, label: c.name_th };
    });

    populateSelect('ds-team', teams, function (t) {
      return { value: t.team_number, label: 'Team ' + t.team_number };
    });

    var filteredJP = utils.filterAndDisplayJobPositions(jobPositions);
    populateSelect('ds-job-position', filteredJP, function (jp) {
      return { value: jp.job_position, label: jp.display_name };
    });

    populateUsers(allUsers);

    // Auto-load on mount
    loadReportData();
  }

  function populateSelect(id, items, mapFn) {
    var sel = document.getElementById(id);
    if (!sel) return;
    var current = sel.value;
    // Remove all options except first placeholder
    while (sel.options.length > 1) sel.remove(1);
    items.forEach(function (item) {
      var mapped = mapFn(item);
      var opt = document.createElement('option');
      opt.value  = mapped.value;
      opt.text   = mapped.label;
      if (String(mapped.value) === String(current)) opt.selected = true;
      sel.appendChild(opt);
    });
  }

  function populateUsers(users) {
    var sel = document.getElementById('ds-user');
    if (!sel) return;
    while (sel.options.length > 1) sel.remove(1);
    users.forEach(function (u) {
      var opt = document.createElement('option');
      opt.value = u.ID;
      opt.text  = u.nickname || (u.first_name + ' ' + u.last_name).trim();
      sel.appendChild(opt);
    });
    // If previously selected user is gone, reset
    if (selectedUser && !users.find(function (u) { return String(u.ID) === String(selectedUser); })) {
      selectedUser = '';
      sel.value = '';
    }
  }

  function refreshUserDropdown() {
    var filtered = allUsers.slice();
    if (selectedTeam) {
      filtered = filtered.filter(function (u) {
        return String(u.team_number) === String(selectedTeam);
      });
    }
    if (selectedJobPosition) {
      filtered = filtered.filter(function (u) {
        return u.job_position && u.job_position.toLowerCase() === selectedJobPosition.toLowerCase();
      });
    }
    populateUsers(filtered);
  }

  // ── Load Report Data ───────────────────────────────────────────────────────
  async function loadReportData() {
    setError(null);
    setLoading(true);
    clearResults();

    var filters = { filterMode: filterMode };
    if (filterMode !== 'all') filters.year = selectedYear;
    if (filterMode === 'quarterly') filters.quarter = selectedQuarter;
    if (filterMode === 'monthly')   filters.month   = selectedMonth;
    if (selectedCountry)     filters.country_id    = parseInt(selectedCountry);
    if (selectedJobPosition) filters.job_position  = selectedJobPosition;
    if (selectedTeam)        filters.team_number   = parseInt(selectedTeam);
    if (selectedUser)        filters.user_id       = parseInt(selectedUser);

    try {
      var data = await window.DiscountSalesAPI.fetch(filters);
      setLoading(false);

      if (!Array.isArray(data)) data = [];

      // Default sort: total_commission desc
      data.sort(function (a, b) {
        return b.metrics.total_commission - a.metrics.total_commission;
      });
      allData       = data;
      sortField     = null;
      sortDirection = 'desc';

      renderResults();
    } catch (err) {
      setLoading(false);
      setError('เกิดข้อผิดพลาดในการโหลดข้อมูล: ' + err.message);
      console.error('[discount-sales] loadReportData error:', err);
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  function renderResults() {
    var area = document.getElementById('ds-results-area');
    if (!area) return;

    if (allData.length === 0) {
      area.innerHTML = buildEmptyHTML();
      return;
    }

    area.innerHTML =
      buildSummaryCardsHTML() +
      '<div class="ds-charts-grid">' +
        '<div class="ds-chart-card"><h2>Top 8 ส่วนลด (จำนวนเงิน)</h2><div class="ds-chart-wrapper"><canvas id="ds-chart-amount"></canvas></div></div>' +
        '<div class="ds-chart-card"><h2>Top 10 ส่วนลด (เปอร์เซ็นต์)</h2><div class="ds-chart-wrapper"><canvas id="ds-chart-percent"></canvas></div></div>' +
      '</div>' +
      buildTableHTML();

    // Bind sort buttons
    document.querySelectorAll('.ds-sort-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        handleSort(btn.dataset.field);
      });
    });

    // Export button
    var exportBtn = document.getElementById('ds-export-btn');
    if (exportBtn) exportBtn.addEventListener('click', exportToCSV);

    renderCharts();
  }

  // ── Summary Cards ──────────────────────────────────────────────────────────
  function buildSummaryCardsHTML() {
    var totalSales    = 0;
    var totalDiscount = 0;
    var totalNet      = 0;
    var totalOrders   = 0;
    var totalPct      = 0;

    allData.forEach(function (item) {
      totalSales    += item.metrics.total_commission;
      totalDiscount += item.metrics.total_discount;
      totalNet      += item.metrics.net_commission;
      totalOrders   += item.metrics.order_count;
      totalPct      += item.metrics.discount_percentage;
    });

    var avgPct = allData.length > 0 ? totalPct / allData.length : 0;
    var fc = utils.formatCurrency;

    return [
      '<div class="ds-summary-grid">',
        card('blue',   iconMoney(),   'ค่าคอมรวม',         '฿' + fc(totalSales)),
        card('red',    iconTag(),     'ส่วนลดรวม',          '฿' + fc(totalDiscount)),
        card('green',  iconCalc(),    'ยอดสุทธิ',           '฿' + fc(totalNet)),
        card('purple', iconChart(),   '% ส่วนลดเฉลี่ย',    Math.round(avgPct) + '%'),
      '</div>'
    ].join('');
  }

  function card(color, iconSvg, label, value) {
    return [
      '<div class="ds-card">',
        '<div class="ds-card-icon ds-card-icon--' + color + '">' + iconSvg + '</div>',
        '<div class="ds-card-body">',
          '<p>' + label + '</p>',
          '<p class="ds-card-value">' + value + '</p>',
        '</div>',
      '</div>'
    ].join('');
  }

  // ── Charts ─────────────────────────────────────────────────────────────────
  function renderCharts() {
    if (typeof Chart === 'undefined') {
      console.warn('[discount-sales] Chart.js not loaded');
      return;
    }

    // Destroy previous instances
    if (chartAmount)  { chartAmount.destroy();  chartAmount  = null; }
    if (chartPercent) { chartPercent.destroy(); chartPercent = null; }

    // Left chart: top 8 by discount amount
    var amountData = allData.slice()
      .sort(function (a, b) { return b.metrics.total_discount - a.metrics.total_discount; })
      .slice(0, 8);

    chartAmount = new Chart(document.getElementById('ds-chart-amount'), {
      type: 'bar',
      data: {
        labels: amountData.map(function (d) { return truncate(d.nickname || d.sales_name, 15); }),
        datasets: [{
          label: 'ส่วนลด (฿)',
          data: amountData.map(function (d) { return d.metrics.total_discount; }),
          backgroundColor: '#EF4444'
        }]
      },
      options: chartOptions('฿', amountData)
    });

    // Right chart: top 10 by discount percentage
    var pctData = allData.slice()
      .sort(function (a, b) { return b.metrics.discount_percentage - a.metrics.discount_percentage; })
      .slice(0, 10);

    chartPercent = new Chart(document.getElementById('ds-chart-percent'), {
      type: 'bar',
      data: {
        labels: pctData.map(function (d) { return truncate(d.nickname || d.sales_name, 15); }),
        datasets: [{
          label: 'ส่วนลด (%)',
          data: pctData.map(function (d) { return Math.round(d.metrics.discount_percentage); }),
          backgroundColor: '#FF8042'
        }]
      },
      options: chartOptions('%', pctData)
    });
  }

  function chartOptions(suffix, rawData) {
    var fc = utils.formatCurrency;
    return {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: 'top' },
        tooltip: {
          callbacks: {
            label: function (ctx) {
              var idx  = ctx.dataIndex;
              var item = rawData[idx];
              if (!item) return '';
              var lines = [];
              if (suffix === '฿') {
                lines.push('ส่วนลด: ฿' + fc(item.metrics.total_discount));
                lines.push('คอมมิชชั่น: ฿' + fc(item.metrics.total_commission));
                lines.push('เปอร์เซ็นต์: ' + Math.round(item.metrics.discount_percentage) + '%');
              } else {
                lines.push('ส่วนลด: ' + Math.round(item.metrics.discount_percentage) + '%');
                lines.push('จำนวนเงิน: ฿' + fc(item.metrics.total_discount));
                lines.push('คอมมิชชั่น: ฿' + fc(item.metrics.total_commission));
              }
              return lines;
            }
          }
        }
      },
      scales: {
        x: {
          ticks: {
            maxRotation: 45,
            minRotation: 30,
            font: { size: 11 }
          }
        },
        y: { beginAtZero: true }
      }
    };
  }

  // ── Table ──────────────────────────────────────────────────────────────────
  function buildTableHTML() {
    var rows = allData.map(function (item) {
      var fc = utils.formatCurrency;
      var name = item.nickname || item.sales_name;
      return [
        '<tr>',
          '<td>' + escHtml(name) + '</td>',
          '<td class="text-right">฿' + fc(item.metrics.total_commission) + '</td>',
          '<td class="text-right ds-cell-red">฿' + fc(item.metrics.total_discount) + '</td>',
          '<td class="text-right ds-cell-orange">' + Math.round(item.metrics.discount_percentage) + '%</td>',
          '<td class="text-center"><span class="ds-badge">' + item.metrics.order_count.toLocaleString() + '</span></td>',
          '<td class="text-right ds-cell-green">฿' + fc(item.metrics.net_commission) + '</td>',
        '</tr>'
      ].join('');
    }).join('');

    var fields = [
      { key: 'total_commission',    label: 'Total Commission', align: 'right' },
      { key: 'total_discount',      label: 'Total Discount',   align: 'right' },
      { key: 'discount_percentage', label: 'Discount %',       align: 'right' },
      { key: 'order_count',         label: 'Orders',           align: 'center' },
      { key: 'net_commission',      label: 'Net Commission',   align: 'right' }
    ];

    var ths = fields.map(function (f) {
      var active  = sortField === f.key ? ' active' : '';
      var iconSvg = sortIconSVG(f.key);
      return [
        '<th class="text-' + f.align + '">',
          '<button class="ds-sort-btn' + active + '" data-field="' + f.key + '">',
            f.label, iconSvg,
          '</button>',
        '</th>'
      ].join('');
    }).join('');

    return [
      '<div class="ds-table-card">',
        '<div class="ds-table-header">',
          '<h2>รายละเอียดส่วนลด</h2>',
          '<button class="ds-btn-export" id="ds-export-btn">',
            iconDownload(), ' Export CSV',
          '</button>',
        '</div>',
        '<div class="ds-table-scroll">',
          '<table class="ds-table">',
            '<thead><tr>',
              '<th>ชื่อเล่น</th>',
              ths,
            '</tr></thead>',
            '<tbody>' + rows + '</tbody>',
          '</table>',
        '</div>',
      '</div>'
    ].join('');
  }

  // ── Sort ───────────────────────────────────────────────────────────────────
  function handleSort(field) {
    if (sortField === field) {
      sortDirection = sortDirection === 'desc' ? 'asc' : 'desc';
    } else {
      sortField     = field;
      sortDirection = 'desc';
    }

    var dir = sortDirection;
    allData.sort(function (a, b) {
      var av = a.metrics[field];
      var bv = b.metrics[field];
      return dir === 'desc' ? bv - av : av - bv;
    });

    // Re-render only table section
    var tableArea = document.querySelector('.ds-table-card');
    if (tableArea) {
      var newTable = document.createElement('div');
      newTable.innerHTML = buildTableHTML();
      tableArea.replaceWith(newTable.firstChild);

      document.querySelectorAll('.ds-sort-btn').forEach(function (btn) {
        btn.addEventListener('click', function () { handleSort(btn.dataset.field); });
      });
      var exportBtn = document.getElementById('ds-export-btn');
      if (exportBtn) exportBtn.addEventListener('click', exportToCSV);
    }
  }

  // ── Sort Icon SVG ──────────────────────────────────────────────────────────
  function sortIconSVG(field) {
    if (sortField !== field) {
      return '<svg class="ds-sort-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4"/></svg>';
    }
    if (sortDirection === 'desc') {
      return '<svg class="ds-sort-icon" viewBox="0 0 24 24" fill="none" stroke="#2563eb" stroke-width="2"><path d="M19 14l-7 7m0 0l-7-7m7 7V3"/></svg>';
    }
    return '<svg class="ds-sort-icon" viewBox="0 0 24 24" fill="none" stroke="#2563eb" stroke-width="2"><path d="M5 10l7-7m0 0l7 7m-7-7v18"/></svg>';
  }

  // ── Export CSV ─────────────────────────────────────────────────────────────
  function exportToCSV() {
    var fc = utils.formatCurrency;
    var headers = ['ชื่อเล่น', 'ค่าคอมรวม (฿)', 'ส่วนลดรวม (฿)', 'เปอร์เซ็นต์ส่วนลด (%)', 'จำนวน Orders', 'ยอดสุทธิ (฿)'];

    var totalSales = 0, totalDiscount = 0, totalNet = 0, totalOrders = 0, totalPct = 0;
    allData.forEach(function (item) {
      totalSales    += item.metrics.total_commission;
      totalDiscount += item.metrics.total_discount;
      totalNet      += item.metrics.net_commission;
      totalOrders   += item.metrics.order_count;
      totalPct      += item.metrics.discount_percentage;
    });
    var avgPct = allData.length > 0 ? totalPct / allData.length : 0;

    var rows = allData.map(function (item) {
      return [
        '"' + (item.nickname || item.sales_name) + '"',
        fc(item.metrics.total_commission),
        fc(item.metrics.total_discount),
        Math.round(item.metrics.discount_percentage),
        item.metrics.order_count,
        fc(item.metrics.net_commission)
      ].join(',');
    });

    rows.unshift(headers.join(','));
    rows.push('');
    rows.push('สรุปรวม');
    rows.push(['รวมทั้งหมด', fc(totalSales), fc(totalDiscount), Math.round(avgPct), totalOrders, fc(totalNet)].join(','));

    var csv  = '﻿' + rows.join('\n');
    var blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    var now  = new Date();
    var dateStr = now.toISOString().split('T')[0];
    var timeStr = now.toTimeString().split(' ')[0].replace(/:/g, '-');
    var link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', 'discount-sales-report-' + dateStr + '-' + timeStr + '.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  // ── UI helpers ─────────────────────────────────────────────────────────────
  function setLoading(on) {
    var el = document.getElementById('ds-loading-area');
    if (!el) return;
    el.innerHTML = on
      ? '<div class="ds-loading"><div class="ds-spinner"></div><span>กำลังโหลดข้อมูล...</span></div>'
      : '';
  }

  function setError(msg) {
    var el = document.getElementById('ds-error-area');
    if (!el) return;
    el.innerHTML = msg
      ? '<div class="ds-error"><svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd"/></svg><span>' + escHtml(msg) + '</span></div>'
      : '';
  }

  function clearResults() {
    var el = document.getElementById('ds-results-area');
    if (el) el.innerHTML = '';
  }

  function buildEmptyHTML() {
    return [
      '<div class="ds-empty">',
        '<svg fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>',
        '<h3>ไม่พบข้อมูล</h3>',
        '<p>ไม่พบข้อมูลตามเงื่อนไขที่เลือก</p>',
      '</div>'
    ].join('');
  }

  function truncate(str, n) {
    return str && str.length > n ? str.substring(0, n) + '...' : str;
  }

  function escHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  // ── Inline SVG icons ───────────────────────────────────────────────────────
  function iconMoney() {
    return '<svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="22" height="22"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1"/></svg>';
  }
  function iconTag() {
    return '<svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="22" height="22"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"/></svg>';
  }
  function iconCalc() {
    return '<svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="22" height="22"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"/></svg>';
  }
  function iconChart() {
    return '<svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="22" height="22"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 8v8m-4-5v5m-4-2v2m-2 4h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>';
  }
  function iconDownload() {
    return '<svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="14" height="14" style="vertical-align:middle"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>';
  }

})();
