// Repeated Customer Report — Commission Co'Auay
// Uses shared/central components only:
//   shared-auth-guard.js  (auto-runs before this file)
//   SharedHttp            (via RepeatedCustomerReportAPI)
//   SharedUI              (loading / error states)
//   SharedFilterService   (available periods)
//   SharedPeriodSelector  (all 4 modes incl. custom)
//   SharedFilterSearchInput (customer name text input)
//   FilterSortDropdownComponent (repeat-bucket)
//   SharedFilterActions   (ค้นหา + เริ่มใหม่)
//   SharedTableSearch     (in-table search)
//   SharedSortableHeader  (column sort)
//   SharedExportButton + SharedCSV (download CSV)
//
// KPI cards follow the sales-report pattern: .dashboard-kpi-cards grid +
// .dashboard-kpi-card modifier + .kpi-icon / .kpi-content (kpi-card.css).
// The results table is hand-rolled because it uses a 2-row grouped thead
// (L1 / L2 bands) which SharedTable.render() does not support — same reason
// commission-report-plus.js keeps a hand-rolled table.
(function () {
  'use strict';

  // ---- State ----
  let currentData      = null;
  let availablePeriods = { years: [] };

  let customerNameQuery    = '';
  let selectedRepeatBucket = 'all';
  let onlyPositiveCommission = false;
  let periodState = (function () {
    const now = new Date();
    return {
      mode   : 'monthly',
      year   : now.getFullYear(),
      quarter: Math.ceil((now.getMonth() + 1) / 3),
      month  : now.getMonth() + 1
    };
  })();

  let tableQuery = '';
  let tableSort  = { key: 'l1_orders', direction: 'desc' };

  document.addEventListener('DOMContentLoaded', function () { init(); });

  // ---- Init ----
  // shared-auth-guard.js has already validated the token before this file
  // runs, so we can proceed straight to rendering.
  async function init() {
    renderShell();
    await loadAvailablePeriods();
    initFilters();
    await loadReport();
  }

  // ---- Load available periods (populates the period selector UI) ----
  async function loadAvailablePeriods() {
    try {
      const periods = await window.SharedFilterService.getAvailablePeriods();
      if (periods && Array.isArray(periods.years)) availablePeriods = periods;
    } catch (e) {
      console.warn('[RCR] Failed to load available periods, using fallback:', e);
    }
  }

  // ---- Helpers ----
  function formatNumber(val, decimals = 0) {
    return (parseFloat(val) || 0).toLocaleString('th-TH', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    });
  }

  function escHtml(str) {
    return String(str == null ? '' : str)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function compareSortValues(a, b, direction) {
    const dir = direction === 'asc' ? 1 : -1;
    if (a == null && b == null) return 0;
    if (a == null) return 1;
    if (b == null) return -1;
    if (a < b) return -1 * dir;
    if (a > b) return 1 * dir;
    return 0;
  }

  // ---- Render Shell (filter bar + results slot) ----
  function renderShell() {
    const section = document.getElementById('reportContentSection');
    if (!section) return;
    section.innerHTML = `
      <div class="rcr-wrapper">

        <div class="filter-wrap filter-wrap-stacked">

          <!-- แถว 1: ชื่อลูกค้า + จำนวนซื้อซ้ำ -->
          <div class="filter-row rcr-filter-row">
            <div class="rcr-filter-field">
              <span class="time-granularity-label rcr-filter-label">ชื่อลูกค้า</span>
              <div class="rcr-filter-control" id="rcr-customer-name-host"></div>
            </div>

            <div class="rcr-filter-field">
              <span class="time-granularity-label rcr-filter-label">จำนวนซื้อซ้ำ</span>
              <div class="rcr-filter-control" id="rcr-repeat-bucket-host"></div>
            </div>
          </div>

          <!-- แถว 2: ช่วงเวลา (รายปี / รายไตรมาส / รายเดือน / กำหนดเอง) -->
          <div class="filter-row rcr-filter-row">
            <div class="rcr-filter-field">
              <span class="time-granularity-label rcr-filter-label">ช่วงเวลา (วันที่จอง)</span>
              <div class="rcr-filter-control" id="rcr-period-mode-host"></div>
              <div class="rcr-filter-control" id="rcr-period-value-host"></div>
            </div>
          </div>

          <!-- แถว 3: Action buttons (ค้นหา + เริ่มใหม่) -->
          <div class="filter-row rcr-filter-actions-row">
            <div id="rcr-filter-actions-host"></div>
          </div>
        </div>

        <!-- SharedUI loading/error hosts -->
        <div id="rcr-error-area"></div>
        <div id="rcr-loading-area"></div>

        <!-- Results -->
        <div id="rcr-results"></div>
      </div>
    `;
  }

  // Mount the customer-name filter input with autocomplete wired to the
  // backend /api/customers/search endpoint. Called on first init AND on
  // reset so both paths share one mount config. Typing < 3 chars keeps
  // the dropdown closed; typing 3+ triggers a debounced fetch and shows
  // up to 20 matches for the user to pick from.
  function mountCustomerNameInput(initialValue) {
    window.SharedFilterSearchInput.init({
      containerId   : 'rcr-customer-name-host',
      placeholder   : 'พิมพ์ชื่อลูกค้า (อย่างน้อย 3 ตัวอักษร)...',
      value         : initialValue || '',
      minChars      : 3,
      debounceMs    : 300,
      showSpinner   : true,
      highlightMatch: true,
      maxItems      : 20,
      fetchFn       : async function (q) {
        const rows = await RepeatedCustomerReportAPI.searchCustomers(q);
        return rows.map(function (r) {
          const subtitle = [r.code, r.phone].filter(Boolean).join(' · ');
          return {
            value: r.name,
            label: subtitle ? (r.name + ' (' + subtitle + ')') : r.name,
            raw  : r
          };
        });
      },
      onInput : function (val) { customerNameQuery = String(val || '').trim(); },
      onSelect: function (val) { customerNameQuery = String(val || '').trim(); }
    });
  }

  // ---- Init Filters ----
  function initFilters() {
    // 1) ชื่อลูกค้า — autocomplete input (SharedFilterSearchInput with fetchFn).
    // Suggestions appear after 3 characters; picking one fills the textbox
    // and sets the filter value. Typing without picking still filters by
    // the raw substring on search.
    mountCustomerNameInput(customerNameQuery);

    // 2) จำนวนซื้อซ้ำ — 3-option single-select dropdown.
    const repeatOptions = [
      { value: 'all', label: 'ทั้งหมด',      icon: getAllIcon(),    active: true  },
      { value: '1-5', label: '1 – 5 ครั้ง',  icon: getRepeatIcon(), active: false },
      { value: '6+',  label: '6 ครั้งขึ้นไป', icon: getRepeatIcon(), active: false },
    ];
    window.FilterSortDropdownComponent.initDropdown({
      containerId : 'rcr-repeat-bucket-host',
      defaultLabel: 'ทั้งหมด',
      defaultIcon : getAllIcon(),
      options     : repeatOptions,
      onChange    : function (val) { selectedRepeatBucket = val; }
    });

    // 3) ช่วงเวลา — shared period selector, single-select, all four modes.
    window.SharedPeriodSelector.mount({
      modeContainerId : 'rcr-period-mode-host',
      valueContainerId: 'rcr-period-value-host',
      availablePeriods: availablePeriods,
      multiSelect     : false,
      modes           : ['yearly', 'quarterly', 'monthly', 'custom'],
      initialState    : periodState,
      onChange        : function (s) { periodState = s; }
    });

    // 4) ค้นหา + เริ่มใหม่ buttons. Reset clears filter UI back to defaults
    // only — it must NOT re-query or wipe the currently-visible results.
    if (window.SharedFilterActions) {
      window.SharedFilterActions.mount({
        containerId: 'rcr-filter-actions-host',
        searchId   : 'rcr-btn-search',
        resetId    : 'rcr-btn-reset',
        onSearch   : loadReport,
        onReset    : resetFiltersToDefault
      });
    }
  }

  // Reset: restore every filter input back to the page default. The results
  // table, summary cards, and KPI band are left alone — the user presses
  // ค้นหา when they are ready to re-query.
  function resetFiltersToDefault() {
    const now = new Date();
    customerNameQuery    = '';
    selectedRepeatBucket = 'all';
    onlyPositiveCommission = false;
    periodState = {
      mode   : 'monthly',
      year   : now.getFullYear(),
      quarter: Math.ceil((now.getMonth() + 1) / 3),
      month  : now.getMonth() + 1
    };

    // Re-init each filter widget with default state. Mount calls overwrite
    // the host innerHTML so the displayed value resets cleanly.
    mountCustomerNameInput('');

    window.FilterSortDropdownComponent.initDropdown({
      containerId : 'rcr-repeat-bucket-host',
      defaultLabel: 'ทั้งหมด',
      defaultIcon : getAllIcon(),
      options     : [
        { value: 'all', label: 'ทั้งหมด',      icon: getAllIcon(),    active: true  },
        { value: '1-5', label: '1 – 5 ครั้ง',  icon: getRepeatIcon(), active: false },
        { value: '6+',  label: '6 ครั้งขึ้นไป', icon: getRepeatIcon(), active: false },
      ],
      onChange    : function (val) { selectedRepeatBucket = val; }
    });

    window.SharedPeriodSelector.mount({
      modeContainerId : 'rcr-period-mode-host',
      valueContainerId: 'rcr-period-value-host',
      availablePeriods: availablePeriods,
      multiSelect     : false,
      modes           : ['yearly', 'quarterly', 'monthly', 'custom'],
      initialState    : periodState,
      onChange        : function (s) { periodState = s; }
    });
  }

  // ---- Build Filters ----
  function buildFilters() {
    const range = window.SharedPeriodSelector.toDateRange(periodState, availablePeriods);
    const filters = {};
    if (customerNameQuery) filters.customer_name = customerNameQuery;
    if (selectedRepeatBucket && selectedRepeatBucket !== 'all') {
      filters.repeat_bucket = selectedRepeatBucket;
    }
    if (range.dateFrom) filters.booking_date_from = range.dateFrom;
    if (range.dateTo)   filters.booking_date_to   = range.dateTo;
    return filters;
  }

  // Guard: don't fire API when custom mode has unselected dates.
  function getMissingCustomRangeLabel() {
    if (periodState && periodState.mode === 'custom'
        && (!periodState.customFrom || !periodState.customTo)) {
      return 'ช่วงเวลา';
    }
    return '';
  }

  // ---- Load Report ----
  async function loadReport() {
    const missing = getMissingCustomRangeLabel();
    if (missing) {
      alert('กรุณาเลือกช่วงวันที่ของ "' + missing + '" ก่อนค้นหา');
      return;
    }

    const errorArea   = document.getElementById('rcr-error-area');
    const loadingArea = document.getElementById('rcr-loading-area');
    const results     = document.getElementById('rcr-results');

    window.SharedUI.hideError(errorArea);
    window.SharedUI.showLoading(loadingArea, 'กำลังโหลดข้อมูล...');
    if (results) results.innerHTML = '';

    currentData = null;
    try {
      const res = await RepeatedCustomerReportAPI.getReport(buildFilters());
      window.SharedUI.hideLoading(loadingArea);
      if (res && res.success && res.data) {
        currentData = res.data;
        renderResults(res.data);
      } else {
        renderEmpty();
      }
    } catch (e) {
      window.SharedUI.hideLoading(loadingArea);
      window.SharedUI.showError(errorArea, 'เกิดข้อผิดพลาดในการโหลดข้อมูล: ' + (e && e.message ? e.message : String(e)), {
        retryFn: loadReport
      });
      console.error('[RCR] Failed to load report:', e);
    }
  }

  function renderEmpty() {
    const results = document.getElementById('rcr-results');
    if (!results) return;
    results.innerHTML = `
      <div class="rcr-empty">
        <img src="/assets/images/empty-state.svg" alt="ไม่พบข้อมูล" />
        <h3>ไม่พบข้อมูล</h3>
        <p>ลองปรับเงื่อนไขการค้นหาใหม่</p>
      </div>`;
  }

  // ---- Render Results ----
  function renderResults(data) {
    const results = document.getElementById('rcr-results');
    if (!results) return;
    const customers = Array.isArray(data.customers) ? data.customers : [];
    const summary   = data.summary || { l1: {}, l2: {} };

    if (!customers.length) { renderEmpty(); return; }

    results.innerHTML =
      renderLevelSummary('l1', summary.l1) +
      renderToolbar() +
      '<div id="rcr-table-host"></div>';

    renderTable();

    // Table client-side search.
    window.SharedTableSearch.init({
      containerId: 'rcr-table-search-host',
      value      : tableQuery,
      placeholder: 'ค้นหาในตาราง (ชื่อลูกค้า / เบอร์ / รหัส)...',
      onInput    : function (raw) {
        tableQuery = String(raw || '').toLowerCase().trim();
        renderTable();
      }
    });

    bindToolbarInteractions(customers);
  }

  // ---- Level Summary (KPI cards) ----
  // Each level renders a .dashboard-kpi-cards grid. Colours map semantically
  // to the metric — no repeated modifier within a band — using the expanded
  // kpi-* variants defined in kpi-card.css. Structure mirrors sales-report.
  function renderLevelSummary(levelKey, s) {
    const isL2 = levelKey === 'l2';
    s = s || {};
    const netCommission = parseFloat(s.total_net_commission || 0);
    const netColor = netCommission >= 0 ? '#16a34a' : '#dc2626';

    return `
      <div class="rcr-level-band">
        <div class="dashboard-kpi-cards">
          <div class="dashboard-kpi-card kpi-top-country">
            <div class="kpi-icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                <circle cx="9" cy="7" r="4"/>
                <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>
              </svg>
            </div>
            <div class="kpi-content">
              <div class="kpi-label">จำนวนลูกค้า</div>
              <div class="kpi-value">${formatNumber(s.total_customers, 0)}</div>
            </div>
          </div>

          <div class="dashboard-kpi-card kpi-info">
            <div class="kpi-icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14 2 14 8 20 8"/>
                <line x1="16" y1="13" x2="8" y2="13"/>
                <line x1="16" y1="17" x2="8" y2="17"/>
              </svg>
            </div>
            <div class="kpi-content">
              <div class="kpi-label">จำนวน Order</div>
              <div class="kpi-value">${formatNumber(s.total_orders, 0)}</div>
            </div>
          </div>

          <div class="dashboard-kpi-card kpi-travelers">
            <div class="kpi-icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
                <polyline points="3.27 6.96 12 12.01 20.73 6.96"/>
                <line x1="12" y1="22.08" x2="12" y2="12"/>
              </svg>
            </div>
            <div class="kpi-content">
              <div class="kpi-label">ผู้เดินทาง</div>
              <div class="kpi-value">${formatNumber(s.total_travelers, 0)}</div>
            </div>
          </div>

          <div class="dashboard-kpi-card kpi-growth">
            <div class="kpi-icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="12" y1="1" x2="12" y2="23"/>
                <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
              </svg>
            </div>
            <div class="kpi-content">
              <div class="kpi-label">ยอดจองรวม</div>
              <div class="kpi-value">${formatNumber(s.total_net_amount, 0)}</div>
            </div>
          </div>

          <div class="dashboard-kpi-card kpi-discount">
            <div class="kpi-icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="19" y1="5" x2="5" y2="19"/>
                <circle cx="6.5" cy="6.5" r="2.5"/>
                <circle cx="17.5" cy="17.5" r="2.5"/>
              </svg>
            </div>
            <div class="kpi-content">
              <div class="kpi-label">ส่วนลดรวม</div>
              <div class="kpi-value">${formatNumber(s.total_discount, 0)}</div>
            </div>
          </div>

          <div class="dashboard-kpi-card kpi-commission">
            <div class="kpi-icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="2" y="7" width="20" height="14" rx="2"/>
                <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>
              </svg>
            </div>
            <div class="kpi-content">
              <div class="kpi-label">Supplier Commission</div>
              <div class="kpi-value">${formatNumber(s.total_supplier_commission, 0)}</div>
              <div class="kpi-subtext">ยังไม่หักส่วนลด</div>
            </div>
          </div>

          <div class="dashboard-kpi-card kpi-net-commission">
            <div class="kpi-icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/>
                <polyline points="17 6 23 6 23 12"/>
              </svg>
            </div>
            <div class="kpi-content">
              <div class="kpi-label">คอมสุทธิ (หักส่วนลด)</div>
              <div class="kpi-value" style="color:${netColor}">${formatNumber(netCommission, 0)}</div>
            </div>
          </div>
        </div>
      </div>`;
  }

  // ---- Toolbar (table search + export) ----
  function renderToolbar() {
    return `
      <div class="rcr-toolbar">
        <div class="rcr-toolbar-left">
          <div id="rcr-table-search-host"></div>
        </div>
        <div class="rcr-toolbar-right">
          <label class="banner1-filter-checkbox rcr-commission-checkbox">
            <input type="checkbox" id="rcr-positive-commission-toggle" ${onlyPositiveCommission ? 'checked' : ''}>
            <span class="banner1-filter-text">นับเฉพาะ Order ที่ค่าคอมมากกว่า 0</span>
          </label>
          <div id="rcr-export-btn-host"></div>
        </div>
      </div>`;
  }

  // ---- Table (via shared SharedTable.render + groupColumns) ----
  // Rows are flattened once per render to a shape SharedTable understands:
  // each key maps to a flat column key. L2 aggregates still appear in the
  // KPI summary band above the table, but are deliberately omitted from
  // this row shape — the table shows only Level 1 metrics per customer.
  function flattenCustomer(c) {
    const l1 = c.l1 || {};
    return {
      _raw: c,
      customer_name:  c.customer_name || '-',
      customer_code:  c.customer_code || '-',
      phone_number:   c.phone_number  || '-',
      l1_orders:                l1.orders,
      l1_travelers:             l1.travelers,
      l1_net_amount:            l1.net_amount,
      l1_discount:              l1.discount,
      l1_supplier_commission:   l1.supplier_commission,
      l1_net_commission:        l1.net_commission
    };
  }

  function hasPositiveCommission(customer) {
    const l1Commission = parseFloat((customer && customer.l1 && customer.l1.supplier_commission) || 0);
    const l2Commission = parseFloat((customer && customer.l2 && customer.l2.supplier_commission) || 0);
    return l1Commission > 0 || l2Commission > 0;
  }

  function getVisibleCustomers(customers) {
    const baseRows = onlyPositiveCommission
      ? customers.filter(hasPositiveCommission)
      : customers.slice();
    const q = tableQuery;
    return q
      ? baseRows.filter(c =>
          (c.customer_name || '').toLowerCase().includes(q) ||
          (c.customer_code || '').toLowerCase().includes(q) ||
          (c.phone_number  || '').toLowerCase().includes(q))
      : baseRows;
  }

  function getVisibleRows(customers) {
    const rows = getVisibleCustomers(customers).map(flattenCustomer);
    if (!tableSort.key) return rows;
    return rows.slice().sort((a, b) => compareSortValues(
      a[tableSort.key], b[tableSort.key], tableSort.direction
    ));
  }

  function numberFormatter(val) { return formatNumber(val, 0); }
  function commissionFormatter(val) {
    const n = parseFloat(val || 0);
    const cls = n >= 0 ? 'rcr-positive' : 'rcr-negative';
    return `<span class="${cls}">${formatNumber(n, 0)}</span>`;
  }

  // Columns config consumed by SharedTable.render. Only Level 1 metrics
  // are shown in the table; Level 2 roll-ups live in the KPI summary band
  // above it, so we don't duplicate them per row.
  const TABLE_COLUMNS = [
    { key: 'customer_name',  label: 'ชื่อลูกค้า' },
    { key: 'customer_code',  label: 'รหัส' },
    { key: 'phone_number',   label: 'เบอร์โทร', sortable: false },

    { key: 'l1_orders',              label: 'Orders',      align: 'right', format: numberFormatter, className: 'rcr-divider' },
    { key: 'l1_travelers',           label: 'ผู้เดินทาง',  align: 'right', format: numberFormatter },
    { key: 'l1_net_amount',          label: 'ยอดจอง',      align: 'right', format: numberFormatter },
    { key: 'l1_discount',            label: 'ส่วนลด',      align: 'right', format: numberFormatter },
    { key: 'l1_supplier_commission', label: 'คอม (raw)',   align: 'right', format: numberFormatter },
    { key: 'l1_net_commission',      label: 'คอมสุทธิ',    align: 'right', format: commissionFormatter }
  ];

  const TABLE_GROUPS = [
    { label: 'ลูกค้า',                              span: 3, className: 'group-neutral' },
    { label: 'ระดับ 1 · งวด 1 ชำระ + ไม่ยกเลิก',    span: 6 }
  ];

  function renderTable() {
    const host = document.getElementById('rcr-table-host');
    if (!host || !currentData) return;
    const rows = getVisibleRows(currentData.customers || []);
    window.SharedTable.render({
      containerEl: host,
      columns    : TABLE_COLUMNS,
      groupColumns: TABLE_GROUPS,
      rows       : rows,
      sortKey    : tableSort.key,
      sortDir    : tableSort.direction,
      tableClassName: 'rcr-table',
      onSort     : function (key) {
        if (tableSort.key === key) {
          tableSort.direction = tableSort.direction === 'asc' ? 'desc' : 'asc';
        } else {
          tableSort.key = key;
          tableSort.direction = 'desc';
        }
        renderTable();
      }
    });

    // Sync column-header sticky offset with the group-row's actual height.
    const groupRow = host.querySelector('thead tr.shared-group-row');
    if (groupRow) {
      host.querySelector('.shared-table').style.setProperty('--shared-group-h', groupRow.offsetHeight + 'px');
    }
  }

  function bindToolbarInteractions(customers) {
    const positiveToggle = document.getElementById('rcr-positive-commission-toggle');
    if (positiveToggle) {
      positiveToggle.checked = !!onlyPositiveCommission;
      positiveToggle.addEventListener('change', function () {
        onlyPositiveCommission = !!positiveToggle.checked;
        renderTable();
      });
    }

    if (window.SharedExportButton) {
      const exportBtn = window.SharedExportButton.mount('rcr-export-btn-host', {
        id   : 'rcr-btn-export',
        label: 'ดาวน์โหลด CSV',
        title: 'ดาวน์โหลดเป็น CSV'
      });
      if (exportBtn) exportBtn.addEventListener('click', function () { exportCSV(customers); });
    }
  }

  // ---- Export CSV ----
  // CSV mirrors the table — Level 1 only. (L2 roll-ups are visible in the
  // KPI summary cards above the table and are not per-customer breakdowns.)
  function exportCSV(customers) {
    if (!window.SharedCSV || !window.SharedCSV.export) return;
    const headers = [
      'ชื่อลูกค้า', 'รหัสลูกค้า', 'เบอร์โทร',
      'Orders', 'ผู้เดินทาง', 'ยอดจอง', 'ส่วนลด', 'คอม(raw)', 'คอมสุทธิ'
    ];
    const rows = getVisibleCustomers(customers).map(c => [
      c.customer_name || '', c.customer_code || '', c.phone_number || '',
      c.l1.orders, c.l1.travelers, c.l1.net_amount, c.l1.discount, c.l1.supplier_commission, c.l1.net_commission
    ]);
    const stamp = new Date().toISOString().slice(0, 10);
    window.SharedCSV.export({
      filename: `repeated-customer-report-${stamp}.csv`,
      headers : headers,
      rows    : rows
    });
  }

  // ---- Icons ----
  function getAllIcon() {
    return `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 12h18M3 6h18M3 18h18"/></svg>`;
  }
  function getRepeatIcon() {
    return `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg>`;
  }
})();
