// order-external-summary.js — Order External Summary page (shared-lib refactor)
// Depends on: shared-utils.js, shared-filter-service.js, shared-ui.js, shared-table.js,
//             shared-csv.js, filter-sort-dropdown-component.js, filter-search-dropdown-component.js,
//             report-filter-panel-component.js, order-external-summary-api.js

(function () {
  'use strict';

  // ── State ──────────────────────────────────────────────────────────────────
  var state = {
    mode         : 'monthly',
    year         : new Date().getFullYear(),
    month        : new Date().getMonth() + 1,
    country_id   : null,
    job_position : null,
    team_number  : null,
    user_id      : null
  };

  var filterOptions = {
    countries    : [],
    teams        : [],
    jobPositions : [],
    users        : []
  };

  var lastData   = [];
  var lastTotals = { orders: 0, net: 0, commission: 0, discount: 0 };

  var sortKey = null;
  var sortDir = 'desc';

  // ── DOM refs (set after render) ────────────────────────────────────────────
  var elRoot, elFilterHost, elSummaryHost, elTableHost, elStatusHost;

  // ── Bootstrap ─────────────────────────────────────────────────────────────
  function init() {
    elRoot = document.getElementById('page-content');
    if (!elRoot) return;

    renderShell();
    loadDropdownData().then(function () {
      renderFilterPanel();
      loadReport();
    });
  }

  // ── Shell ─────────────────────────────────────────────────────────────────
  function renderShell() {
    elRoot.innerHTML =
      '<div id="oes-filter-host"></div>' +
      '<div id="oes-status-host"></div>' +
      '<div id="oes-summary-host"></div>' +
      '<div id="oes-table-host"></div>';

    elFilterHost  = document.getElementById('oes-filter-host');
    elStatusHost  = document.getElementById('oes-status-host');
    elSummaryHost = document.getElementById('oes-summary-host');
    elTableHost   = document.getElementById('oes-table-host');
  }

  // ── Dropdown data ─────────────────────────────────────────────────────────
  async function loadDropdownData() {
    try {
      var results = await Promise.all([
        SharedFilterService.getCountries(),
        SharedFilterService.getTeams(),
        SharedFilterService.getJobPositions(),
        SharedFilterService.getUsers()
      ]);
      filterOptions.countries    = results[0] || [];
      filterOptions.teams        = results[1] || [];
      filterOptions.jobPositions = results[2] || [];
      filterOptions.users        = results[3] || [];
    } catch (err) {
      console.error('[OrderExternalSummary] loadDropdownData failed:', err);
    }
  }

  // ── Filter panel ──────────────────────────────────────────────────────────
  function renderFilterPanel() {
    window.ReportFilterPanel.init({
      containerId: elFilterHost.id,
      state      : state,
      options    : filterOptions,
      prefix     : 'oes',
      layout     : 'paired-grid',
      onApply    : loadReport
    });
  }

  // ── Report loading ────────────────────────────────────────────────────────
  async function loadReport() {
    SharedUI.hideError(elStatusHost);
    elSummaryHost.innerHTML = '';
    elTableHost.innerHTML   = '';
    SharedUI.showLoading(elStatusHost, 'กำลังโหลดข้อมูล Order แก้ย้อนหลัง...');

    try {
      var data = await OrderExternalAPI.fetch({
        year         : state.year,
        month        : state.month,
        country_id   : state.country_id,
        job_position : state.job_position,
        team_number  : state.team_number,
        user_id      : state.user_id
      });
      SharedUI.hideLoading(elStatusHost);
      renderResults(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('[OrderExternalSummary] API error:', err);
      SharedUI.hideLoading(elStatusHost);
      SharedUI.showError(elStatusHost, 'เกิดข้อผิดพลาดในการโหลดข้อมูล กรุณาลองใหม่อีกครั้ง', {
        retryFn: loadReport
      });
    }
  }

  // ── Results render ────────────────────────────────────────────────────────
  function renderResults(data) {
    lastData = data;
    lastTotals = computeTotals(data);

    renderSummaryCards(lastTotals);
    renderTable();
  }

  function computeTotals(data) {
    var totals = { orders: data.length, net: 0, commission: 0, discount: 0 };
    for (var i = 0; i < data.length; i++) {
      var item = data[i];
      totals.net        += (item.net_amount || 0);
      totals.commission += (item.supplier_commission || 0);
      totals.discount   += (item.discount || 0);
    }
    return totals;
  }

  function renderSummaryCards(totals) {
    var fmt = SharedUtils.formatCurrency;

    elSummaryHost.innerHTML = [
      '<div class="oes-summary-cards">',

      '<div class="oes-card">',
      '  <div class="oes-card-icon blue">',
      '    <svg width="18" height="18" fill="none" stroke="#2563eb" stroke-width="2" viewBox="0 0 24 24" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>',
      '  </div>',
      '  <div class="oes-card-body"><p class="label">จำนวน Orders</p><p class="value">' + totals.orders.toLocaleString() + '</p></div>',
      '</div>',

      '<div class="oes-card">',
      '  <div class="oes-card-icon green">',
      '    <svg width="18" height="18" fill="none" stroke="#16a34a" stroke-width="2" viewBox="0 0 24 24" aria-hidden="true"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>',
      '  </div>',
      '  <div class="oes-card-body"><p class="label">ยอดสุทธิรวม</p><p class="value">฿' + fmt(totals.net) + '</p></div>',
      '</div>',

      '<div class="oes-card">',
      '  <div class="oes-card-icon purple">',
      '    <svg width="18" height="18" fill="none" stroke="#7c3aed" stroke-width="2" viewBox="0 0 24 24" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"/></svg>',
      '  </div>',
      '  <div class="oes-card-body"><p class="label">ค่าคอมมิชชั่นรวม</p><p class="value">฿' + fmt(totals.commission) + '</p></div>',
      '</div>',

      '<div class="oes-card">',
      '  <div class="oes-card-icon red">',
      '    <svg width="18" height="18" fill="none" stroke="#dc2626" stroke-width="2" viewBox="0 0 24 24" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"/></svg>',
      '  </div>',
      '  <div class="oes-card-body"><p class="label">ส่วนลดรวม</p><p class="value">฿' + fmt(totals.discount) + '</p></div>',
      '</div>',

      '</div>'
    ].join('');
  }

  // ── Table ─────────────────────────────────────────────────────────────────
  var COLUMNS = [
    { key: 'order_code',          label: 'รหัส Order',          align: 'left',  format: fmtOrderCode },
    { key: 'created_at',          label: 'วันที่สร้าง Order',    align: 'left',  format: fmtDate },
    { key: 'customer_name',       label: 'ชื่อลูกค้า',            align: 'left' },
    { key: 'net_amount',          label: 'ยอดสุทธิ',             align: 'right', format: fmtBaht },
    { key: 'supplier_commission', label: 'ค่าคอมมิชชั่น',        align: 'right', format: fmtBahtCommission },
    { key: 'discount',            label: 'ส่วนลด',               align: 'right', format: fmtBahtDiscount },
    { key: 'paid_at',             label: 'วันที่ชำระเงิน',        align: 'left',  format: fmtDate },
    { key: 'seller_nickname',     label: 'เซลล์ที่ทำ Order',     align: 'left',  format: fmtSeller }
  ];

  function escapeHtml(str) {
    return String(str == null ? '' : str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function fmtOrderCode(val) {
    return '<span class="oes-order-code">' + escapeHtml(val || '') + '</span>';
  }
  function fmtDate(val) {
    return val ? escapeHtml(SharedUtils.formatDateTH(val)) : '';
  }
  function fmtBaht(val) {
    return '฿' + SharedUtils.formatCurrency(val || 0);
  }
  function fmtBahtCommission(val) {
    return '<span class="oes-commission">฿' + SharedUtils.formatCurrency(val || 0) + '</span>';
  }
  function fmtBahtDiscount(val) {
    return '<span class="oes-discount">฿' + SharedUtils.formatCurrency(val || 0) + '</span>';
  }
  function fmtSeller(val) {
    return escapeHtml(val || '-');
  }

  function sortRows(rows) {
    if (!sortKey) return rows;
    var dir = sortDir === 'asc' ? 1 : -1;
    return rows.slice().sort(function (a, b) {
      var av = a[sortKey];
      var bv = b[sortKey];
      if (av == null && bv == null) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;
      if (typeof av === 'number' && typeof bv === 'number') {
        return (av - bv) * dir;
      }
      return String(av).localeCompare(String(bv), 'th-TH') * dir;
    });
  }

  function renderTable() {
    elTableHost.innerHTML =
      '<div class="oes-table-section">' +
      '  <div class="oes-table-header">' +
      '    <h2>รายละเอียด Orders</h2>' +
      '    <button class="oes-btn-export" id="oes-export-btn" type="button">' +
      '      <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>' +
      '      Export CSV' +
      '    </button>' +
      '  </div>' +
      '  <div id="oes-table-body"></div>' +
      '</div>';

    SharedTable.render({
      containerEl: document.getElementById('oes-table-body'),
      columns    : COLUMNS,
      rows       : sortRows(lastData),
      sortKey    : sortKey,
      sortDir    : sortDir,
      onSort     : function (key) {
        if (sortKey === key) {
          sortDir = sortDir === 'asc' ? 'desc' : 'asc';
        } else {
          sortKey = key;
          sortDir = 'desc';
        }
        renderTable();
      }
    });

    var btn = document.getElementById('oes-export-btn');
    if (btn) btn.addEventListener('click', exportCSV);
  }

  // ── CSV Export ────────────────────────────────────────────────────────────
  function exportCSV() {
    var fmt = SharedUtils.formatCurrency;

    var headers = [
      'รหัส Order',
      'วันที่สร้าง Order',
      'ชื่อลูกค้า',
      'ยอดสุทธิ (฿)',
      'ค่าคอมมิชชั่น (฿)',
      'ส่วนลด (฿)',
      'วันที่ชำระเงิน',
      'เซลล์ที่ทำ Order'
    ];

    var rows = lastData.map(function (item) {
      return [
        item.order_code || '',
        item.created_at ? SharedUtils.formatDateTH(item.created_at) : '',
        item.customer_name || '',
        fmt(item.net_amount || 0),
        fmt(item.supplier_commission || 0),
        fmt(item.discount || 0),
        item.paid_at ? SharedUtils.formatDateTH(item.paid_at) : '',
        item.seller_nickname || '-'
      ];
    });

    rows.push([]);
    rows.push(['สรุปรวม']);
    rows.push([
      'จำนวน ' + lastTotals.orders + ' Orders',
      '',
      '',
      fmt(lastTotals.net),
      fmt(lastTotals.commission),
      fmt(lastTotals.discount),
      '',
      ''
    ]);

    var d = new Date();
    var yyyy = d.getFullYear();
    var mm = String(d.getMonth() + 1).padStart(2, '0');
    var dd = String(d.getDate()).padStart(2, '0');

    SharedCSV.export({
      filename: 'order-external-summary-' + yyyy + mm + dd + '.csv',
      headers : headers,
      rows    : rows
    });
  }

  // ── Entry point ────────────────────────────────────────────────────────────
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
