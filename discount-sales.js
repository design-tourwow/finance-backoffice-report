// discount-sales.js — Discount Sales Report page
// Depends on shared libs: shared-utils.js, shared-filter-service.js, shared-ui.js,
// shared-chart.js, shared-table.js, shared-csv.js,
// filter-sort-dropdown-component.js, filter-search-dropdown-component.js,
// report-filter-panel-component.js, discount-sales-api.js, Chart.js CDN.

(function () {
  'use strict';

  var utils = window.SharedUtils;
  var svc   = window.SharedFilterService;

  // ── State ──────────────────────────────────────────────────────────────────
  var allData       = [];
  var sortField     = null;   // 'total_commission' | 'total_discount' | 'discount_percentage' | 'order_count' | 'net_commission'
  var sortDirection = 'desc';

  var filterState = {
    mode        : 'quarterly',
    year        : utils.getCurrentYear(),
    quarter     : utils.getCurrentQuarter(),
    month       : new Date().getMonth() + 1,
    country_id  : null,
    team_number : null,
    job_position: null,
    user_id     : null
  };

  var filterOptions = {
    countries    : [],
    teams        : [],
    jobPositions : [],
    users        : [],
    availablePeriods: { years: [] }
  };

  var chartAmount  = null;
  var chartPercent = null;

  // ── Bootstrap ──────────────────────────────────────────────────────────────
  document.addEventListener('DOMContentLoaded', function () {
    renderShell();
    loadInitialData();
  });

  function renderShell() {
    var el = document.getElementById('page-content');
    if (!el) return;
    el.innerHTML =
      '<div id="ds-filter-area"></div>' +
      '<div id="ds-error-area"></div>' +
      '<div id="ds-loading-area"></div>' +
      '<div id="ds-results-area"></div>';
    renderFilterPanel();
  }

  function renderFilterPanel() {
    window.ReportFilterPanel.init({
      containerId: 'ds-filter-area',
      state      : filterState,
      options    : filterOptions,
      prefix     : 'ds',
      layout     : 'paired-grid',
      onApply    : loadReportData
    });
  }

  // ── Load dropdown lookups ──────────────────────────────────────────────────
  async function loadInitialData() {
    var results = await Promise.all([
      svc.getAvailablePeriods(),
      svc.getCountries(),
      svc.getTeams(),
      svc.getJobPositions(),
      svc.getUsers()
    ]);
    filterOptions = {
      availablePeriods: results[0] || { years: [] },
      countries   : results[1] || [],
      teams       : results[2] || [],
      jobPositions: results[3] || [],
      users       : results[4] || []
    };
    renderFilterPanel();
    loadReportData();
  }

  // ── Load report data ───────────────────────────────────────────────────────
  async function loadReportData() {
    var errorArea   = document.getElementById('ds-error-area');
    var loadingArea = document.getElementById('ds-loading-area');
    var resultsArea = document.getElementById('ds-results-area');

    window.SharedUI.hideError(errorArea);
    window.SharedUI.showLoading(loadingArea);
    if (resultsArea) resultsArea.innerHTML = '';

    var filters = { filterMode: filterState.mode };
    if (filterState.mode !== 'all')       filters.year    = filterState.year;
    if (filterState.mode === 'quarterly') filters.quarter = filterState.quarter;
    if (filterState.mode === 'monthly')   filters.month   = filterState.month;
    if (filterState.country_id)   filters.country_id   = filterState.country_id;
    if (filterState.job_position) filters.job_position = filterState.job_position;
    if (filterState.team_number)  filters.team_number  = parseInt(filterState.team_number, 10);
    if (filterState.user_id)      filters.user_id      = parseInt(filterState.user_id, 10);

    try {
      var data = await window.DiscountSalesAPI.fetch(filters);
      window.SharedUI.hideLoading(loadingArea);

      if (!Array.isArray(data)) data = [];

      data.sort(function (a, b) {
        return b.metrics.total_commission - a.metrics.total_commission;
      });
      allData       = data;
      sortField     = null;
      sortDirection = 'desc';

      renderResults();
    } catch (err) {
      window.SharedUI.hideLoading(loadingArea);
      window.SharedUI.showError(errorArea, 'เกิดข้อผิดพลาดในการโหลดข้อมูล: ' + err.message, {
        retryFn: loadReportData
      });
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
      '<div class="ds-table-card">' +
        '<div class="ds-table-header">' +
          '<h2>รายละเอียดส่วนลด</h2>' +
          window.SharedExportButton.render({ id: 'ds-export-btn' }) +
        '</div>' +
        '<div id="ds-table-host"></div>' +
      '</div>';

    renderTable();
    renderCharts();

    var exportBtn = document.getElementById('ds-export-btn');
    if (exportBtn) exportBtn.addEventListener('click', exportToCSV);
  }

  // ── Summary Cards ──────────────────────────────────────────────────────────
  function computeTotals() {
    var totals = { sales: 0, discount: 0, net: 0, orders: 0, pct: 0 };
    allData.forEach(function (item) {
      totals.sales    += item.metrics.total_commission;
      totals.discount += item.metrics.total_discount;
      totals.net      += item.metrics.net_commission;
      totals.orders   += item.metrics.order_count;
      totals.pct      += item.metrics.discount_percentage;
    });
    totals.avgPct = allData.length > 0 ? totals.pct / allData.length : 0;
    return totals;
  }

  function buildSummaryCardsHTML() {
    var t  = computeTotals();
    var fc = utils.formatCurrency;
    return [
      '<div class="ds-summary-grid">',
        card('blue',   iconMoney(), 'ค่าคอมรวม',       '฿' + fc(t.sales)),
        card('red',    iconTag(),   'ส่วนลดรวม',        '฿' + fc(t.discount)),
        card('green',  iconCalc(),  'ยอดสุทธิ',         '฿' + fc(t.net)),
        card('purple', iconChart(), '% ส่วนลดเฉลี่ย',  Math.round(t.avgPct) + '%'),
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
  function truncate(str, n) {
    return str && str.length > n ? str.substring(0, n) + '...' : str;
  }

  function tooltipCallbacks(primary, rawData) {
    var fc = utils.formatCurrency;
    return {
      label: function (ctx) {
        var item = rawData[ctx.dataIndex];
        if (!item) return '';
        if (primary === 'amount') {
          return [
            'ส่วนลด: ฿' + fc(item.metrics.total_discount),
            'คอมมิชชั่น: ฿' + fc(item.metrics.total_commission),
            'เปอร์เซ็นต์: ' + Math.round(item.metrics.discount_percentage) + '%'
          ];
        }
        return [
          'ส่วนลด: ' + Math.round(item.metrics.discount_percentage) + '%',
          'จำนวนเงิน: ฿' + fc(item.metrics.total_discount),
          'คอมมิชชั่น: ฿' + fc(item.metrics.total_commission)
        ];
      }
    };
  }

  function renderCharts() {
    var amountData = allData.slice()
      .sort(function (a, b) { return b.metrics.total_discount - a.metrics.total_discount; })
      .slice(0, 8);

    chartAmount = window.SharedChart.createBarChart({
      canvasEl: document.getElementById('ds-chart-amount'),
      previous: chartAmount,
      labels  : amountData.map(function (d) { return truncate(d.nickname || d.sales_name, 15); }),
      datasets: [{
        label: 'ส่วนลด (฿)',
        data : amountData.map(function (d) { return d.metrics.total_discount; }),
        backgroundColor: '#EF4444',
        borderWidth: 0
      }],
      options: {
        plugins: { tooltip: { callbacks: tooltipCallbacks('amount', amountData) } }
      }
    });

    var pctData = allData.slice()
      .sort(function (a, b) { return b.metrics.discount_percentage - a.metrics.discount_percentage; })
      .slice(0, 10);

    chartPercent = window.SharedChart.createBarChart({
      canvasEl: document.getElementById('ds-chart-percent'),
      previous: chartPercent,
      labels  : pctData.map(function (d) { return truncate(d.nickname || d.sales_name, 15); }),
      datasets: [{
        label: 'ส่วนลด (%)',
        data : pctData.map(function (d) { return Math.round(d.metrics.discount_percentage); }),
        backgroundColor: '#FF8042',
        borderWidth: 0
      }],
      options: {
        plugins: { tooltip: { callbacks: tooltipCallbacks('percent', pctData) } },
        scales : { y: { ticks: { callback: function (v) { return v + '%'; } } } }
      }
    });
  }

  // ── Table ──────────────────────────────────────────────────────────────────
  var TABLE_COLUMNS = (function () {
    var fc = utils.formatCurrency;
    return [
      {
        key: 'nickname', label: 'ชื่อเล่น', align: 'left', sortable: false,
        format: function (_v, row) { return escHtml(row.nickname || row.sales_name); }
      },
      {
        key: 'total_commission', label: 'Total Commission', align: 'right',
        format: function (_v, row) { return '฿' + fc(row.metrics.total_commission); }
      },
      {
        key: 'total_discount', label: 'Total Discount', align: 'right',
        format: function (_v, row) { return '<span class="ds-cell-red">฿' + fc(row.metrics.total_discount) + '</span>'; }
      },
      {
        key: 'discount_percentage', label: 'Discount %', align: 'right',
        format: function (_v, row) { return '<span class="ds-cell-orange">' + Math.round(row.metrics.discount_percentage) + '%</span>'; }
      },
      {
        key: 'order_count', label: 'Orders', align: 'center',
        format: function (_v, row) { return '<span class="ds-badge">' + row.metrics.order_count.toLocaleString() + '</span>'; }
      },
      {
        key: 'net_commission', label: 'Net Commission', align: 'right',
        format: function (_v, row) { return '<span class="ds-cell-green">฿' + fc(row.metrics.net_commission) + '</span>'; }
      }
    ];
  })();

  function renderTable() {
    var host = document.getElementById('ds-table-host');
    if (!host) return;
    window.SharedTable.render({
      containerEl: host,
      columns    : TABLE_COLUMNS,
      rows       : allData,
      sortKey    : sortField,
      sortDir    : sortDirection,
      onSort     : handleSort
    });
  }

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
    renderTable();
  }

  // ── Export CSV ─────────────────────────────────────────────────────────────
  function exportToCSV() {
    var fc = utils.formatCurrency;
    var headers = ['ชื่อเล่น', 'ค่าคอมรวม (฿)', 'ส่วนลดรวม (฿)', 'เปอร์เซ็นต์ส่วนลด (%)', 'จำนวน Orders', 'ยอดสุทธิ (฿)'];

    var rows = allData.map(function (item) {
      return [
        item.nickname || item.sales_name,
        fc(item.metrics.total_commission),
        fc(item.metrics.total_discount),
        Math.round(item.metrics.discount_percentage),
        item.metrics.order_count,
        fc(item.metrics.net_commission)
      ];
    });

    var t = computeTotals();
    rows.push([]);
    rows.push(['สรุปรวม']);
    rows.push(['รวมทั้งหมด', fc(t.sales), fc(t.discount), Math.round(t.avgPct), t.orders, fc(t.net)]);

    var dateStr = new Date().toISOString().split('T')[0].replace(/-/g, '');
    window.SharedCSV.export({
      filename: 'discount-sales-' + dateStr + '.csv',
      headers : headers,
      rows    : rows
    });
  }

  // ── Helpers ────────────────────────────────────────────────────────────────
  function buildEmptyHTML() {
    return [
      '<div class="ds-empty">',
        '<svg fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>',
        '<h3>ไม่พบข้อมูล</h3>',
        '<p>ไม่พบข้อมูลตามเงื่อนไขที่เลือก</p>',
      '</div>'
    ].join('');
  }

  function escHtml(str) {
    return String(str == null ? '' : str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  // ── Inline SVG icons ───────────────────────────────────────────────────────
  function iconMoney() {
    return '<svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="18" height="18"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1"/></svg>';
  }
  function iconTag() {
    return '<svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="18" height="18"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"/></svg>';
  }
  function iconCalc() {
    // Banknote — canonical "net amount" icon from sales-by-country. The
    // rectangle fills the viewBox so it reads clearly at 18×18 where the
    // thin clipboard/calculator path looked tiny.
    return '<svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="18" height="18"><rect x="1" y="4" width="22" height="16" rx="2" ry="2" stroke-width="2"/><line x1="1" y1="10" x2="23" y2="10" stroke-width="2"/></svg>';
  }
  function iconChart() {
    return '<svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="18" height="18"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 8v8m-4-5v5m-4-2v2m-2 4h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>';
  }
  function iconDownload() {
    return '<svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="14" height="14" style="vertical-align:middle"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>';
  }

})();
