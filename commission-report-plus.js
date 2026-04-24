// Commission Report Plus - Main JavaScript
(function () {
  'use strict';

  const APP_FONT = window.AppFont;
  const APP_FONT_CSS_FAMILY = APP_FONT.cssFamily();
  const APP_FONT_STYLESHEET_TAG = APP_FONT.stylesheetTag();

  // ---- State ----
  let currentUser = null;
  let currentData = null;
  let sellers = [];
  let availablePeriods = { years: [] };

  // Period selector state (mode + year/quarter/month). One for "วันที่สร้าง
  // Order" (created_at), one for "วันชำระงวด 1" (paid_at). Both use
  // SharedPeriodSelector single-select mode; buildFilters() converts them to
  // date ranges via SharedPeriodSelector.toDateRange.
  let createdPeriodState = { mode: 'all' };
  let paidPeriodState    = { mode: 'all' };

  // Selected values from FilterSortDropdown instances
  let selectedJobPosition = 'admin';
  let selectedSellerId = '';
  let selectedOrderStatus = 'not_canceled';
  let selectedTravelerFilter = 'all';
  let mainTableQuery = '';
  let mainTableSort = { key: null, direction: 'desc' };
  let sellerSummarySort = {
    ts: { key: 'net_commission', direction: 'desc' },
    crm: { key: 'net_commission', direction: 'desc' }
  };

  document.addEventListener('DOMContentLoaded', function () {
    init();
  });

  // ---- Init ----
  async function init() {
    if (!validateToken()) return;
    currentUser = getUserFromToken();
    renderShell();
    await loadSellers();
    initFilters();
    await loadReport();
  }

  // ---- Auth ----
  function checkAuth() {
    if (typeof TourImageAPI !== 'undefined' && TourImageAPI.hasToken) return TourImageAPI.hasToken();
    return !!(sessionStorage.getItem('authToken') || localStorage.getItem('authToken'));
  }

  function validateToken() {
    if (!checkAuth()) { showAuthModal(); return false; }
    if (typeof TokenUtils !== 'undefined' && TokenUtils.isTokenExpired()) { showAuthModal(); return false; }
    return true;
  }

  function showAuthModal() {
    if (typeof MenuComponent !== 'undefined' && MenuComponent.showAuthModal) MenuComponent.showAuthModal();
    else alert('กรุณาเข้าสู่ระบบใหม่');
  }

  function getUserFromToken() {
    try {
      const token = (typeof TokenUtils !== 'undefined') ? TokenUtils.getToken() : (sessionStorage.getItem('authToken') || localStorage.getItem('authToken'));
      if (!token) return null;
      const payload = (typeof TokenUtils !== 'undefined') ? TokenUtils.decodeToken(token) : JSON.parse(atob(token.split('.')[1]));
      const member = (payload && payload.user && payload.user.agency_member) || {};
      return {
        id:           member.id || null,
        nick_name:    member.nick_name || '',
        job_position: member.job_position || 'admin',
      };
    } catch (e) { return null; }
  }

  function isAdmin() {
    return !currentUser || currentUser.job_position === 'admin';
  }

  // ---- Helpers ----
  function formatNumber(val, decimals = 0) {
    return (parseFloat(val) || 0).toLocaleString('th-TH', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
  }

  function formatDate(dateStr) {
    if (!dateStr) return '-';
    try {
      const d = new Date(dateStr);
      const year = d.getFullYear() + 543;
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${day}/${month}/${year}`;
    } catch (e) { return dateStr; }
  }

  function firstDayOfMonth() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
  }

  function today() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  function addDays(dateStr, days) {
    const d = new Date(dateStr);
    d.setDate(d.getDate() + days);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  function lastDayOfCurrentMonth() {
    const d = new Date();
    const last = new Date(d.getFullYear(), d.getMonth() + 1, 0);
    return `${last.getFullYear()}-${String(last.getMonth()+1).padStart(2,'0')}-${String(last.getDate()).padStart(2,'0')}`;
  }

  function firstDayOfLastMonth() {
    const d = new Date();
    const first = new Date(d.getFullYear(), d.getMonth() - 1, 1);
    return `${first.getFullYear()}-${String(first.getMonth()+1).padStart(2,'0')}-01`;
  }

  function lastDayOfLastMonth() {
    const d = new Date();
    const last = new Date(d.getFullYear(), d.getMonth(), 0);
    return `${last.getFullYear()}-${String(last.getMonth()+1).padStart(2,'0')}-${String(last.getDate()).padStart(2,'0')}`;
  }

  function escHtml(str) {
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
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

  function resolveOrderSortValue(order, key) {
    switch (key) {
      case 'seller':
        return String(order.seller_nick_name || '').toLowerCase();
      case 'order_code':
        return String(order.order_code || '').toLowerCase();
      case 'created_at':
        return new Date(order.created_at || 0).getTime();
      case 'customer_name':
        return String(order.customer_name || '').toLowerCase();
      case 'country_name':
        return String(order.country_name_th || '').toLowerCase();
      case 'travel_period':
        return String(order.product_period_snapshot || '').toLowerCase();
      case 'net_amount':
        return parseFloat(order.net_amount || 0);
      case 'room_quantity':
        return parseFloat(order.room_quantity || 0);
      case 'first_paid_at':
        return new Date(order.first_paid_at || 0).getTime();
      case 'supplier_commission':
        return parseFloat(order.supplier_commission || 0);
      case 'net_commission':
        return parseFloat(order.supplier_commission || 0) - parseFloat(order.discount || 0);
      case 'discount':
        return parseFloat(order.discount || 0);
      default:
        return null;
    }
  }

  function getVisibleOrders(orders) {
    const q = mainTableQuery;
    const filtered = q
      ? orders.filter(o =>
          (o.order_code || '').toLowerCase().includes(q) ||
          (o.customer_name || '').toLowerCase().includes(q)
        )
      : orders.slice();

    if (!mainTableSort.key) return filtered;

    return filtered.slice().sort((a, b) => {
      return compareSortValues(
        resolveOrderSortValue(a, mainTableSort.key),
        resolveOrderSortValue(b, mainTableSort.key),
        mainTableSort.direction
      );
    });
  }

  function buildSellerAggregate(orders) {
    const map = new Map();
    orders.forEach(o => {
      const name = o.seller_nick_name || '-';
      if (!map.has(name)) map.set(name, { seller: name, orders: 0, net_amount: 0, discount: 0, net_commission: 0 });
      const s = map.get(name);
      s.orders += 1;
      s.net_amount += parseFloat(o.net_amount || 0);
      s.discount += parseFloat(o.discount || 0);
      s.net_commission += (parseFloat(o.supplier_commission || 0) - parseFloat(o.discount || 0));
    });
    return Array.from(map.values());
  }

  function sortSellerAggregate(rows, groupClass) {
    const state = sellerSummarySort[groupClass] || { key: 'net_commission', direction: 'desc' };
    return rows.slice().sort((a, b) => compareSortValues(a[state.key], b[state.key], state.direction));
  }

  // ---- Sellers ----
  async function loadSellers() {
    try {
      const res = await CommissionReportPlusAPI.getSellers();
      if (res && res.success && res.data) sellers = res.data;
    } catch (e) {
      console.error('[CRP] Failed to load sellers:', e);
    }
  }

  // ---- Render Shell ----
  function renderShell() {
    const section = document.getElementById('reportContentSection');
    if (!section) return;

    section.innerHTML = `
      <div class="crp-wrapper">

        <!-- Filter Bar -->
        <div class="filter-wrap filter-wrap-stacked">

          <!-- แถว 1: วันที่สร้าง Order (period selector) -->
          <div class="filter-row crp-filter-row">
            <div class="crp-filter-field">
              <span class="time-granularity-label crp-filter-label">วันที่สร้าง Order</span>
              <div class="crp-filter-control" id="crp-created-mode-host"></div>
              <div class="crp-filter-control" id="crp-created-value-host"></div>
            </div>
          </div>

          <!-- แถว 2: วันชำระงวด 1 (period selector) -->
          <div class="filter-row crp-filter-row">
            <div class="crp-filter-field">
              <span class="time-granularity-label crp-filter-label">วันชำระงวด 1</span>
              <div class="crp-filter-control" id="crp-paid-mode-host"></div>
              <div class="crp-filter-control" id="crp-paid-value-host"></div>
            </div>
          </div>

          <div class="filter-row-divider"></div>

          <!-- แถว 2: Dropdown Pair 1 -->
          <div class="filter-row crp-filter-row">
            <div class="crp-filter-field">
              <span class="time-granularity-label crp-filter-label">ตำแหน่ง</span>
              <div class="crp-filter-control" id="crp-dd-position"></div>
            </div>

            <div class="crp-filter-field">
              <span class="time-granularity-label crp-filter-label">เซลล์ผู้จอง</span>
              <div class="crp-filter-control" id="crp-dd-seller"></div>
            </div>
          </div>

          <!-- แถว 3: Dropdown Pair 2 -->
          <div class="filter-row crp-filter-row">
            <div class="crp-filter-field">
              <span class="time-granularity-label crp-filter-label">สถานะ Order</span>
              <div class="crp-filter-control" id="crp-dd-status"></div>
            </div>

            <div class="crp-filter-field">
              <span class="time-granularity-label crp-filter-label">จำนวนผู้เดินทาง</span>
              <div class="crp-filter-control" id="crp-dd-travelers"></div>
            </div>
          </div>

          <!-- แถว 4: Action buttons — SharedFilterActions renders the
               ค้นหา + เริ่มใหม่ pair into #crp-filter-actions-host. -->
          <div class="filter-row crp-filter-actions-row">
            <div id="crp-filter-actions-host"></div>
          </div>

        </div>

        <!-- Results -->
        <div id="crp-results"></div>
      </div>
    `;
  }

  // ---- Init Filters ----
  function initFilters() {
    const jobPos  = currentUser ? currentUser.job_position : 'admin';
    const sellerId = currentUser ? String(currentUser.id || '') : '';

    // Init two period selectors — one per date field. Default to current
    // month so the report loads with the usual monthly view on first paint.
    const nowYear    = new Date().getFullYear();
    const nowMonth   = new Date().getMonth() + 1;
    const nowQuarter = Math.ceil(nowMonth / 3);

    createdPeriodState = { mode: 'monthly', year: nowYear, quarter: nowQuarter, month: nowMonth };
    paidPeriodState    = { mode: 'monthly', year: nowYear, quarter: nowQuarter, month: nowMonth };

    window.SharedPeriodSelector.mount({
      modeContainerId : 'crp-created-mode-host',
      valueContainerId: 'crp-created-value-host',
      availablePeriods: availablePeriods,
      multiSelect     : false,
      modes           : ['yearly', 'quarterly', 'monthly', 'custom'],
      initialState    : createdPeriodState,
      onChange        : function (s) { createdPeriodState = s; }
    });

    window.SharedPeriodSelector.mount({
      modeContainerId : 'crp-paid-mode-host',
      valueContainerId: 'crp-paid-value-host',
      availablePeriods: availablePeriods,
      multiSelect     : false,
      modes           : ['yearly', 'quarterly', 'monthly', 'custom'],
      initialState    : paidPeriodState,
      onChange        : function (s) { paidPeriodState = s; }
    });

    // Set state defaults
    selectedJobPosition  = jobPos;
    selectedSellerId     = isAdmin() ? '' : sellerId;
    selectedOrderStatus  = isAdmin() ? 'all' : 'not_canceled';

    // ---- ตำแหน่ง dropdown ----
    const jobPositionOptions = [
      { value: 'ts',    label: 'เซลล์', icon: getPersonIcon() },
      { value: 'crm',   label: 'CRM',   icon: getPersonIcon() },
      { value: 'admin', label: 'Admin', icon: getPersonIcon() },
    ].map(o => ({ ...o, active: o.value === jobPos }));

    if (isAdmin()) {
      FilterSortDropdownComponent.initDropdown({
        containerId: 'crp-dd-position',
        defaultLabel: labelOfJobPosition(jobPos),
        defaultIcon: getPersonIcon(),
        options: jobPositionOptions,
        onChange: function (val, label) {
          selectedJobPosition = val;
        }
      });
    } else {
      document.getElementById('crp-dd-position').innerHTML =
        `<button class="filter-sort-btn" disabled style="opacity:0.6;cursor:not-allowed;min-width:120px">
           <div class="filter-sort-btn-content">${getPersonIcon()}<span class="filter-sort-btn-text">${labelOfJobPosition(jobPos)}</span></div>
         </button>`;
    }

    // ---- เซลล์ผู้จอง dropdown ----
    if (isAdmin()) {
      const sellerOptions = [
        { value: '', label: 'ทั้งหมด', icon: getAllIcon(), active: true },
        ...sellers.map(s => ({
          value: String(s.id),
          label: s.nick_name || `${s.first_name} ${s.last_name}`.trim() || String(s.id),
          icon: getPersonIcon(),
          active: false
        }))
      ];

      window.FilterSearchDropdown.init({
        containerId: 'crp-dd-seller',
        defaultLabel: 'ทั้งหมด',
        defaultIcon: getAllIcon(),
        options: sellerOptions,
        placeholder: 'ค้นหาเซลล์...',
        onChange: function (val) {
          selectedSellerId = val;
        }
      });
    } else {
      const me = sellers.find(s => String(s.id) === sellerId);
      const name = me ? me.nick_name : (currentUser ? currentUser.nick_name : '-');
      document.getElementById('crp-dd-seller').innerHTML =
        `<button class="filter-sort-btn" disabled style="opacity:0.6;cursor:not-allowed;min-width:120px">
           <div class="filter-sort-btn-content">${getPersonIcon()}<span class="filter-sort-btn-text">${escHtml(name)}</span></div>
         </button>`;
    }

    // ---- สถานะ Order dropdown ----
    const defaultStatus = isAdmin() ? 'all' : 'not_canceled';
    const statusOptions = [
      { value: 'all',          label: 'ทั้งหมด',   icon: getStatusIcon('all') },
      { value: 'not_canceled', label: 'ไม่ยกเลิก', icon: getStatusIcon('not_canceled') },
      { value: 'canceled',     label: 'ยกเลิก',    icon: getStatusIcon('canceled') },
    ].map(o => ({ ...o, active: o.value === defaultStatus }));

    if (isAdmin()) {
      FilterSortDropdownComponent.initDropdown({
        containerId: 'crp-dd-status',
        defaultLabel: 'ทั้งหมด',
        defaultIcon: getStatusIcon('all'),
        options: statusOptions,
        onChange: function (val, label) {
          selectedOrderStatus = val;
        }
      });
    } else {
      document.getElementById('crp-dd-status').innerHTML =
        `<button class="filter-sort-btn" disabled style="opacity:0.6;cursor:not-allowed;min-width:120px">
           <div class="filter-sort-btn-content">${getStatusIcon('not_canceled')}<span class="filter-sort-btn-text">ไม่ยกเลิก</span></div>
         </button>`;
    }

    // ---- จำนวนผู้เดินทาง dropdown ----
    const travelerOptions = [
      { value: 'all',          label: 'ทั้งหมด',   icon: getAllIcon(),              active: true },
      { value: 'exclude_zero', label: 'ยกเว้น 0',  icon: getPersonIcon(),           active: false },
    ];
    FilterSortDropdownComponent.initDropdown({
      containerId: 'crp-dd-travelers',
      defaultLabel: 'ทั้งหมด',
      defaultIcon: getAllIcon(),
      options: travelerOptions,
      onChange: function (val) {
        selectedTravelerFilter = val;
      }
    });

    // Action buttons — SharedFilterActions mounts ค้นหา + เริ่มใหม่ into
    // the host, wiring click handlers to the existing loadReport / reload
    // flow. The rendered buttons keep id="crp-btn-search" / "crp-btn-reset"
    // for continuity with any other code that still queries them.
    if (window.SharedFilterActions) {
      window.SharedFilterActions.mount({
        containerId: 'crp-filter-actions-host',
        searchId   : 'crp-btn-search',
        resetId    : 'crp-btn-reset',
        onSearch   : loadReport,
        onReset    : function () { window.location.reload(); }
      });
    }
  }

  function labelOfJobPosition(pos) {
    return { ts: 'เซลล์', crm: 'CRM', admin: 'Admin' }[pos] || pos;
  }


  // Icon helpers — same Lucide set used across all report pages
  function getAllIcon() {
    return `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 12h18M3 6h18M3 18h18"/></svg>`;
  }

  function getPersonIcon() {
    return `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`;
  }

  function getStatusIcon(status) {
    if (status === 'canceled') return `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>`;
    if (status === 'not_canceled') return `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>`;
    return getAllIcon();
  }

  // ---- Load Report ----
  async function loadReport() {
    showLoading();
    const filters = buildFilters();
    currentData = null;
    mainTableQuery = '';
    try {
      const res = await CommissionReportPlusAPI.getReport(filters);
      if (res && res.success && res.data) {
        currentData = res.data;
        renderResults(res.data);
      } else {
        showEmpty();
      }
    } catch (e) {
      console.error('[CRP] Failed to load report:', e);
      showEmpty();
    }
  }

  function buildFilters() {
    const created = window.SharedPeriodSelector.toDateRange(createdPeriodState, availablePeriods);
    const paid    = window.SharedPeriodSelector.toDateRange(paidPeriodState,    availablePeriods);
    // Business rule: for non-custom paid-period modes, extend paid_at_to by
    // +3 days to cover the late-payment grace window that finance accepts
    // after the nominal period end.
    const paidTo = (paidPeriodState && paidPeriodState.mode !== 'custom')
      ? addDays(paid.dateTo, 3)
      : paid.dateTo;
    return {
      created_at_from: created.dateFrom || '',
      created_at_to:   created.dateTo   || '',
      paid_at_from:    paid.dateFrom    || '',
      paid_at_to:      paidTo           || '',
      job_position:    selectedJobPosition,
      seller_id:       isAdmin() ? selectedSellerId : (currentUser ? String(currentUser.id || '') : ''),
      order_status:    selectedOrderStatus,
    };
  }

  // ---- Loading ----
  function showLoading() {
    const results = document.getElementById('crp-results');
    if (results) results.innerHTML = `
      <div class="dashboard-table-loading">
        <div class="spinner"></div>
        <span>กำลังโหลดข้อมูล...</span>
      </div>`;
  }

  // ---- Empty State ----
  function showEmpty() {
    const results = document.getElementById('crp-results');
    if (results) results.innerHTML = `
      <div class="dashboard-table-empty">
        <img src="/assets/images/empty-state.svg" alt="ไม่พบข้อมูล" width="200" height="200" style="margin-bottom: 16px; opacity: 0.8;" />
        <h3 style="margin: 0 0 8px 0; font-size: 18px; color: #374151;">ไม่พบข้อมูล</h3>
        <p style="margin: 0; font-size: 15px; color: #6b7280;">ลองปรับเงื่อนไขการค้นหาใหม่</p>
      </div>`;
  }

  // ---- Render Results ----
  function renderResults(data) {
    const results = document.getElementById('crp-results');
    if (!results) return;
    const { orders: rawOrders = [], summary = {} } = data;
    const orders = selectedTravelerFilter === 'exclude_zero'
      ? rawOrders.filter(o => parseInt(o.room_quantity || 0) >= 1)
      : rawOrders;
    if (!orders.length) { showEmpty(); return; }

    results.innerHTML = renderSummary(summary) + renderSellerSummary(orders) + renderTableSection(orders);

    // Sticky header: set col-row top = group-row height
    const groupRow = results.querySelector('.crp-table thead tr.group-row');
    if (groupRow) {
      const h = groupRow.offsetHeight;
      results.querySelectorAll('.crp-table thead tr.col-row th').forEach(th => {
        th.style.top = h + 'px';
      });
    }

    document.getElementById('crp-btn-export').addEventListener('click', () => exportExcelWorkbook(orders));
    document.getElementById('crp-btn-pdf').addEventListener('click', () => exportPDF(orders, summary));

    if (window.SharedSortableHeader) {
      const mainTable = results.querySelector('.crp-table');
      if (mainTable) {
        window.SharedSortableHeader.bindTable(mainTable, {
          headerSelector  : '.col-row th[data-sort]',
          sortKey         : mainTableSort.key,
          sortDir         : mainTableSort.direction,
          defaultDirection: 'desc',
          sortInDom       : false,
          onSort: function (sortState) {
            mainTableSort = { key: sortState.key, direction: sortState.direction };
            renderResults(currentData);
            return false;
          }
        });
      }

      results.querySelectorAll('.crp-summary-table').forEach(table => {
        const group = table.getAttribute('data-group');
        const state = sellerSummarySort[group] || { key: 'net_commission', direction: 'desc' };
        window.SharedSortableHeader.bindTable(table, {
          headerSelector  : 'thead th[data-sort]',
          sortKey         : state.key,
          sortDir         : state.direction,
          defaultDirection: 'desc',
          sortInDom       : false,
          onSort: function (sortState) {
            sellerSummarySort[group] = { key: sortState.key, direction: sortState.direction };
            renderResults(currentData);
            return false;
          }
        });
      });
    }

    // Scroll hint: gradient fades when scrolled to end
    const tableScroll = document.querySelector('.crp-table-scroll');
    const hintWrapper = document.querySelector('.crp-scroll-hint-wrapper');
    function updateScrollHint() {
      if (!hintWrapper || !tableScroll) return;
      const atEnd = tableScroll.scrollLeft + tableScroll.clientWidth >= tableScroll.scrollWidth - 2;
      const noScroll = tableScroll.scrollWidth <= tableScroll.clientWidth;
      hintWrapper.classList.toggle('crp-hint-hidden', atEnd || noScroll);
    }
    tableScroll.addEventListener('scroll', updateScrollHint);
    updateScrollHint();

    // Table search — shared SharedTableSearch component renders the input
    // into #crp-table-search-host and calls onInput on debounced typing.
    window.SharedTableSearch.init({
      containerId: 'crp-table-search-host',
      value: mainTableQuery,
      placeholder: 'ค้นหารหัส Order หรือชื่อลูกค้า...',
      onInput: function (raw) {
        mainTableQuery = String(raw || '').toLowerCase().trim();
        renderResults(currentData);
      }
    });
  }

  // ---- Summary Cards ----
  function renderSummary(summary) {
    const netCommission = parseFloat(summary.total_commission || 0) - parseFloat(summary.total_discount || 0);
    const netColor = netCommission >= 0 ? '#388e3c' : '#dc2626';
    const discountCard = `
        <div class="dashboard-kpi-card kpi-active">
          <div class="kpi-icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="19" y1="5" x2="5" y2="19"/><circle cx="6.5" cy="6.5" r="2.5"/><circle cx="17.5" cy="17.5" r="2.5"/></svg>
          </div>
          <div class="kpi-content">
            <div class="kpi-label">ส่วนลดรวม</div>
            <div class="kpi-value">${formatNumber(summary.total_discount, 0)}</div>
          </div>
        </div>`;
    const adminCards = isAdmin() ? `
        <div class="dashboard-kpi-card kpi-top-country">
          <div class="kpi-icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>
          </div>
          <div class="kpi-content">
            <div class="kpi-label">คอมรวม</div>
            <div class="kpi-value">${formatNumber(summary.total_commission, 0)}</div>
          </div>
        </div>
        <div class="dashboard-kpi-card kpi-growth">
          <div class="kpi-icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>
          </div>
          <div class="kpi-content">
            <div class="kpi-label">คอม (หักส่วนลด)</div>
            <div class="kpi-value" style="color:${netColor}">${formatNumber(netCommission, 0)}</div>
          </div>
        </div>
        ${discountCard}` : discountCard;
    return `
      <div class="dashboard-kpi-cards">
        <div class="dashboard-kpi-card kpi-travelers">
          <div class="kpi-icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
          </div>
          <div class="kpi-content">
            <div class="kpi-label">ยอดจองรวม</div>
            <div class="kpi-value">${formatNumber(summary.total_net_amount, 0)}</div>
            <div class="kpi-subtext">${formatNumber(summary.total_orders, 0)} Orders</div>
          </div>
        </div>
        ${adminCards}
      </div>`;
  }

  // ---- Seller Summary (Admin only) ----
  function renderSellerSummary(orders) {
    if (!isAdmin()) return '';

    function buildGroupTable(title, groupClass, groupOrders) {
      const sorted = sortSellerAggregate(buildSellerAggregate(groupOrders), groupClass);
      const rows = sorted.map((s, i) => {
        const name = s.seller;
        const rank = i + 1;
        const rankClass = rank <= 3 ? ` crp-summary-rank--${rank}` : '';
        const trophyPalette = {
          1: { c0: '#FFC54D', c1: '#C19D72', c2: '#A88763' },
          2: { c0: '#D4D4D4', c1: '#A8A8A8', c2: '#8C8C8C' },
          3: { c0: '#CD7F32', c1: '#A0622A', c2: '#8B4513' },
        };
        const p = trophyPalette[rank];
        const trophyIcon = rank <= 3
          ? `<svg width="20" height="20" viewBox="0 0 120 120" style="flex-shrink:0;margin-right:4px" xmlns="http://www.w3.org/2000/svg"><g><path fill="${p.c0}" d="M101,34l-0.2-1.7h-10c0.5-3.4,0.8-6.9,1-10.5c0.1-1.9-1.4-3.5-3.1-3.5H31.4c-1.8,0-3.2,1.6-3.1,3.5c0.1,3.6,0.5,7.1,1,10.5h-10L19,34c-0.1,0.4-1.2,10.6,5.4,19.8c4.3,6,11,10.1,19.7,12.2c2.8,2.8,5.9,4.9,9.2,6.2c-0.4,4.1-0.9,8.1-1.4,11.8h16.3c-0.6-3.8-1.1-7.7-1.5-11.8c3.3-1.2,6.4-3.3,9.2-6.2c8.7-2.1,15.4-6.2,19.7-12.2C102.2,44.6,101,34.4,101,34z M27.3,51.3c-4.2-5.8-4.7-12.1-4.7-15.1h7.3c1.9,9.5,5.3,17.9,9.6,24.2C34.3,58.4,30.2,55.3,27.3,51.3z M92.7,51.3c-2.9,4-7,7.1-12.2,9.1c4.4-6.4,7.7-14.7,9.6-24.2h7.3C97.4,39.2,96.8,45.5,92.7,51.3z"/><path fill="${p.c1}" d="M77,98.1H43c-1,0-1.8-0.8-1.8-1.8V83.5c0-1,0.8-1.8,1.8-1.8h34c1,0,1.8,0.8,1.8,1.8v12.8C78.8,97.3,78,98.1,77,98.1z"/><path fill="${p.c2}" d="M37.9,101.9h44.2c1,0,1.8-0.8,1.8-1.8v-3.8c0-1-0.8-1.8-1.8-1.8H37.9c-1,0-1.8,0.8-1.8,1.8v3.8C36.1,101,36.9,101.9,37.9,101.9z"/><path fill="${p.c0}" d="M68,91H52c-0.7,0-1.2-0.5-1.2-1.2v-2.5c0-0.7,0.5-1.2,1.2-1.2h16c0.7,0,1.2,0.5,1.2,1.2v2.5C69.2,90.5,68.6,91,68,91z"/></g></svg>`
          : '';
        return `
          <tr>
            <td>
              <div class="crp-summary-seller-cell">
                ${trophyIcon}${rank > 3 ? `<span class="crp-summary-rank">${rank}</span>` : ''}
                <span class="crp-seller-badge">${escHtml(name)}</span>
              </div>
            </td>
            <td class="right">${formatNumber(s.orders, 0)}</td>
            <td class="right">${formatNumber(s.net_amount, 0)}</td>
            <td class="right">${formatNumber(s.discount, 0)}</td>
            <td class="right ${s.net_commission >= 0 ? 'crp-positive' : 'crp-negative'}">${formatNumber(s.net_commission, 0)}</td>
          </tr>`;
      }).join('');
      return `
        <div class="crp-summary-group crp-summary-group--${groupClass}">
          <div class="crp-summary-group-header">
            <span class="crp-summary-group-title">${escHtml(title)}</span>
            <span class="crp-summary-group-count">${sorted.length} คน · ${formatNumber(groupOrders.length, 0)} orders</span>
          </div>
          <table class="crp-summary-table" data-group="${groupClass}">
            <thead>
              <tr>
                <th data-sort="seller" data-type="string">เซลล์</th>
                <th class="right" data-sort="orders" data-type="number">ออเดอร์</th>
                <th class="right" data-sort="net_amount" data-type="number">ยอดจอง</th>
                <th class="right" data-sort="discount" data-type="number">ส่วนลด</th>
                <th class="right" data-sort="net_commission" data-type="number">คอมสุทธิ</th>
              </tr>
            </thead>
            <tbody>${rows || '<tr><td colspan="5" style="text-align:center;color:#9ca3af;padding:16px">ไม่มีข้อมูล</td></tr>'}</tbody>
          </table>
        </div>`;
    }

    const tsOrders  = orders.filter(o => (o.seller_job_position || '').toLowerCase() === 'ts');
    const crmOrders = orders.filter(o => (o.seller_job_position || '').toLowerCase() === 'crm');

    return `
      <div class="crp-seller-summary">
        <div class="crp-summary-title">สรุป</div>
        <div class="crp-summary-groups">
          ${buildGroupTable('Telesales', 'ts', tsOrders)}
          ${buildGroupTable('CRM', 'crm', crmOrders)}
        </div>
      </div>`;
  }

  // ---- Table ----
  function renderTableSection(orders) {
    const visibleOrders = getVisibleOrders(orders);
    const rows = visibleOrders.map(o => {
      const netCom = parseFloat(o.supplier_commission || 0) - parseFloat(o.discount || 0);
      return `
        <tr>
          <td><span class="crp-seller-badge">${escHtml(o.seller_nick_name || '-')}</span></td>
          <td class="group-start"><span class="crp-order-code">${escHtml(o.order_code || '-')}</span></td>
          <td>${formatDate(o.created_at)}</td>
          <td>${escHtml(o.customer_name || '-')}</td>
          <td>${escHtml(o.country_name_th || '-')}</td>
          <td><span class="crp-period-text" title="${escHtml(o.product_period_snapshot || '')}">${escHtml(o.product_period_snapshot || '-')}</span></td>
          <td class="right group-start">${formatNumber(o.net_amount, 0)}</td>
          <td class="center">${o.room_quantity || 0}</td>
          <td class="center">${formatDate(o.first_paid_at)}</td>
          <td class="right group-start">${formatNumber(o.supplier_commission, 0)}</td>
          <td class="right ${netCom >= 0 ? 'crp-positive' : 'crp-negative'}">${formatNumber(netCom, 0)}</td>
          <td class="right group-start">${formatNumber(o.discount, 0)}</td>
        </tr>`;
    }).join('') || '<tr><td colspan="12" style="text-align:center;color:#9ca3af;padding:16px">ไม่พบข้อมูล</td></tr>';

    return `
      <div class="dashboard-table-header">
        <div class="dashboard-table-title">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2"/><rect x="9" y="3" width="6" height="4" rx="1"/><path d="M9 12h6M9 16h4"/></svg>
          <span id="crp-table-count">แสดง ${formatNumber(visibleOrders.length, 0)} รายการ</span>
        </div>
        <div class="dashboard-table-actions">
          <div id="crp-table-search-host"></div>
          ${window.SharedExportButton.render({ id: 'crp-btn-export', label: 'Export' })}
          <button class="dashboard-export-btn crp-btn-pdf" id="crp-btn-pdf">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
            Download PDF
          </button>
        </div>
      </div>
      <div class="crp-scroll-hint-wrapper">
      <div class="dashboard-table-wrapper crp-table-scroll">
        <table class="dashboard-table crp-table">
          <thead>
            <tr class="group-row">
              <th class="group-header">เซลล์</th>
              <th colspan="5" class="group-header">Order</th>
              <th colspan="3" class="group-header">ยอดจอง</th>
              <th colspan="2" class="group-header">คอมมิชชั่น</th>
              <th class="group-header">ส่วนลด</th>
            </tr>
            <tr class="col-row">
              <th data-sort="seller" data-type="string">เซลล์</th>
              <th class="group-start" data-sort="order_code" data-type="string">รหัส Order</th>
              <th data-sort="created_at" data-type="date">จองวันที่</th>
              <th data-sort="customer_name" data-type="string">ลูกค้า</th>
              <th data-sort="country_name" data-type="string">ประเทศ</th>
              <th data-sort="travel_period" data-type="string">เดินทาง</th>
              <th class="right group-start" data-sort="net_amount" data-type="number">ยอดจอง</th>
              <th class="center" data-sort="room_quantity" data-type="number">ผู้เดินทาง</th>
              <th class="center" data-sort="first_paid_at" data-type="date">วันชำระงวด 1</th>
              <th class="right group-start" data-sort="supplier_commission" data-type="number">คอมรวม</th>
              <th class="right" data-sort="net_commission" data-type="number">คอม (หักส่วนลด)</th>
              <th class="right group-start" data-sort="discount" data-type="number">ส่วนลดรวม</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
      </div>`;
  }

  // ---- Export Excel Workbook ----
  function exportExcelWorkbook(orders) {
    if (!window.XLSX || !window.XLSX.utils) {
      console.error('[CRP] XLSX library is not available');
      alert('ไม่สามารถสร้างไฟล์ Excel ได้ในขณะนี้');
      return;
    }

    const workbook = window.XLSX.utils.book_new();
    const worksheets = [
      {
        name: 'sales-report',
        headers: ['เซลล์', 'รหัส Order', 'จองวันที่', 'ลูกค้า', 'ประเทศ', 'เดินทาง', 'ยอดจอง', 'ผู้เดินทาง', 'วันชำระงวด 1', 'คอมรวม', 'คอม (หักส่วนลด)', 'ส่วนลดรวม'],
        rows: getVisibleOrders(orders).map(function (o) {
          const commission = parseFloat(o.supplier_commission || 0);
          const discount = parseFloat(o.discount || 0);
          return [
            o.seller_nick_name || '',
            o.order_code || '',
            formatDate(o.created_at),
            o.customer_name || '',
            o.country_name_th || '',
            o.product_period_snapshot || '',
            parseFloat(o.net_amount || 0),
            parseInt(o.room_quantity || 0, 10) || 0,
            formatDate(o.first_paid_at),
            commission,
            commission - discount,
            discount
          ];
        })
      },
      {
        name: 'sales-report-by-telesales',
        headers: ['อันดับ', 'เซลล์', 'ออเดอร์', 'ยอดจอง', 'ส่วนลด', 'คอมสุทธิ'],
        rows: getSellerSummaryExportRows(orders, 'ts')
      },
      {
        name: 'sales-report-by-crm',
        headers: ['อันดับ', 'เซลล์', 'ออเดอร์', 'ยอดจอง', 'ส่วนลด', 'คอมสุทธิ'],
        rows: getSellerSummaryExportRows(orders, 'crm')
      }
    ];

    worksheets.forEach(function (sheet) {
      const worksheet = window.XLSX.utils.aoa_to_sheet([sheet.headers].concat(sheet.rows));
      window.XLSX.utils.book_append_sheet(workbook, worksheet, sheet.name);
    });

    window.XLSX.writeFile(workbook, getExcelFileName(), { compression: true });
  }

  function getSellerSummaryExportRows(orders, groupClass) {
    const groupOrders = orders.filter(function (order) {
      return String(order.seller_job_position || '').toLowerCase() === groupClass;
    });

    return sortSellerAggregate(buildSellerAggregate(groupOrders), groupClass).map(function (row, index) {
      return [
        index + 1,
        row.seller,
        row.orders,
        row.net_amount,
        row.discount,
        row.net_commission
      ];
    });
  }

  function getExcelFileName() {
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    return `sales-report-${yyyy}${mm}${dd}.xlsx`;
  }

  function getSelectedSellerLabel() {
    if (!isAdmin()) return currentUser ? currentUser.nick_name || '-' : '-';
    const seller = sellers.find(s => String(s.id) === String(selectedSellerId));
    if (!selectedSellerId) return 'ทั้งหมด';
    return seller ? (seller.nick_name || `${seller.first_name || ''} ${seller.last_name || ''}`.trim() || String(seller.id)) : 'ทั้งหมด';
  }

  function getSelectedStatusLabel() {
    return {
      all: 'ทั้งหมด',
      not_canceled: 'ไม่ยกเลิก',
      canceled: 'ยกเลิก',
    }[selectedOrderStatus] || selectedOrderStatus;
  }

  function buildPrintFilters() {
    const filters = buildFilters();
    return [
      { label: 'วันที่สร้าง Order', value: [formatDate(filters.created_at_from), formatDate(filters.created_at_to)].join(' - ') },
      { label: 'วันชำระงวด 1', value: [formatDate(filters.paid_at_from), formatDate(filters.paid_at_to)].join(' - ') },
      { label: 'ตำแหน่ง', value: labelOfJobPosition(selectedJobPosition) },
      { label: 'เซลล์ผู้จอง', value: getSelectedSellerLabel() },
      { label: 'สถานะ Order', value: getSelectedStatusLabel() },
    ];
  }

  function getPrintDocumentHtml(tableHtml, summary, countText) {
    const netCommission = parseFloat(summary.total_commission || 0) - parseFloat(summary.total_discount || 0);
    const filtersHtml = buildPrintFilters().map(item => `
      <div class="crp-print-filter">
        <span class="crp-print-filter-label">${escHtml(item.label)}</span>
        <span class="crp-print-filter-value">${escHtml(item.value || '-')}</span>
      </div>
    `).join('');

    return `<!DOCTYPE html>
<html lang="th">
  <head>
    <meta charset="UTF-8" />
    <title>Sales Report</title>
    ${APP_FONT_STYLESHEET_TAG}
    <style>
      @page { size: A4 landscape; margin: 10mm; }
      * { box-sizing: border-box; }
      body {
        margin: 0;
        color: #111827;
        font-family: ${APP_FONT_CSS_FAMILY};
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
      .crp-print-shell {
        padding: 8px 0 0;
      }
      .crp-print-header {
        display: flex;
        justify-content: space-between;
        gap: 16px;
        align-items: flex-start;
        margin-bottom: 12px;
      }
      .crp-print-title {
        margin: 0;
        font-size: 22px;
        line-height: 1.2;
        color: #0f172a;
      }
      .crp-print-subtitle {
        margin: 4px 0 0;
        color: #475569;
        font-size: 12px;
      }
      .crp-print-count {
        padding: 8px 12px;
        border: 1px solid #cbd5e1;
        border-radius: 10px;
        background: #f8fafc;
        font-size: 12px;
        white-space: nowrap;
      }
      .crp-print-summary {
        display: grid;
        grid-template-columns: repeat(4, minmax(0, 1fr));
        gap: 8px;
        margin-bottom: 12px;
      }
      .crp-print-card {
        border: 1px solid #dbe2ea;
        border-radius: 10px;
        padding: 10px 12px;
        background: #f8fafc;
      }
      .crp-print-card-label {
        display: block;
        color: #64748b;
        font-size: 11px;
        margin-bottom: 4px;
      }
      .crp-print-card-value {
        display: block;
        color: #0f172a;
        font-size: 16px;
        font-weight: 600;
      }
      .crp-print-filters {
        display: grid;
        grid-template-columns: repeat(5, minmax(0, 1fr));
        gap: 8px;
        margin-bottom: 14px;
      }
      .crp-print-filter {
        border: 1px solid #e5e7eb;
        border-radius: 8px;
        padding: 8px 10px;
        background: #fff;
      }
      .crp-print-filter-label {
        display: block;
        color: #64748b;
        font-size: 10px;
        margin-bottom: 2px;
      }
      .crp-print-filter-value {
        display: block;
        color: #0f172a;
        font-size: 11px;
        font-weight: 500;
      }
      .crp-print-table .dashboard-table-wrapper,
      .crp-print-table .crp-table-scroll {
        overflow: visible !important;
        max-height: none !important;
      }
      .crp-print-table table {
        width: 100%;
        border-collapse: collapse;
        font-size: 10px;
      }
      .crp-print-table thead th,
      .crp-print-table tbody td {
        border: 1px solid #dbe2ea;
        padding: 5px 6px;
        vertical-align: middle;
      }
      .crp-print-table thead tr.group-row th {
        background: #e0e7ef !important;
        color: #1e3a5f;
        text-align: center;
        font-size: 10px;
        font-weight: 600;
        letter-spacing: 0.02em;
        text-transform: uppercase;
      }
      .crp-print-table thead tr.col-row th {
        background: #f8fafc !important;
        color: #0f172a;
        font-weight: 600;
      }
      .crp-print-table .right { text-align: right; font-variant-numeric: tabular-nums; }
      .crp-print-table .center { text-align: center; }
      .crp-print-table .group-start { border-left-width: 2px !important; }
      .crp-print-table .crp-order-code { color: #1d4ed8; font-weight: 600; }
      .crp-print-table .crp-seller-badge {
        display: inline-block;
        padding: 2px 6px;
        border-radius: 999px;
        background: #eff6ff !important;
        color: #1d4ed8;
        font-weight: 500;
      }
      .crp-print-table .crp-period-text {
        white-space: normal;
        overflow: visible;
        text-overflow: clip;
        max-width: none;
      }
      .crp-print-table .crp-positive { color: #15803d; font-weight: 600; }
      .crp-print-table .crp-negative { color: #b91c1c; font-weight: 600; }
    </style>
  </head>
  <body>
    <div class="crp-print-shell">
      <div class="crp-print-header">
        <div>
          <h1 class="crp-print-title">Sales Report</h1>
          <p class="crp-print-subtitle">พิมพ์เมื่อ ${escHtml(new Date().toLocaleString('th-TH'))}</p>
        </div>
        <div class="crp-print-count">${escHtml(countText || '')}</div>
      </div>

      <div class="crp-print-summary">
        <div class="crp-print-card">
          <span class="crp-print-card-label">ยอดจองรวม</span>
          <span class="crp-print-card-value">${formatNumber(summary.total_net_amount)}</span>
        </div>
        <div class="crp-print-card">
          <span class="crp-print-card-label">คอมรวม</span>
          <span class="crp-print-card-value">${formatNumber(summary.total_commission)}</span>
        </div>
        <div class="crp-print-card">
          <span class="crp-print-card-label">คอม (หักส่วนลด)</span>
          <span class="crp-print-card-value">${formatNumber(netCommission)}</span>
        </div>
        <div class="crp-print-card">
          <span class="crp-print-card-label">ส่วนลดรวม</span>
          <span class="crp-print-card-value">${formatNumber(summary.total_discount)}</span>
        </div>
      </div>

      <div class="crp-print-filters">${filtersHtml}</div>
      <div class="crp-print-table">${tableHtml}</div>
    </div>
  </body>
</html>`;
  }

  function getPdfFileName() {
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    return `sales-report-${yyyy}${mm}${dd}.pdf`;
  }

  function getVisibleTableRows() {
    return Array.from(document.querySelectorAll('.crp-table tbody tr'))
      .map(tr => Array.from(tr.querySelectorAll('td')).map(td => td.innerText.replace(/\s+/g, ' ').trim()))
      .filter(row => row.length === 12);
  }

  function createPdfSourceNode(countText) {
    const tableWrapperEl = document.querySelector('.dashboard-table-wrapper.crp-table-scroll');
    if (!tableWrapperEl) return null;

    const wrapper = document.createElement('div');
    wrapper.style.position = 'fixed';
    wrapper.style.left = '-10000px';
    wrapper.style.top = '0';
    wrapper.style.width = '1520px';
    wrapper.style.background = '#ffffff';
    wrapper.style.padding = '22px 24px 18px';
    wrapper.style.zIndex = '-1';
    wrapper.style.fontFamily = APP_FONT_CSS_FAMILY;
    wrapper.className = 'crp-pdf-source';
    wrapper.dataset.countText = countText || '';

    const netCommission = parseFloat(currentData?.summary?.total_commission || 0) - parseFloat(currentData?.summary?.total_discount || 0);

    const title = document.createElement('div');
    title.style.display = 'flex';
    title.style.justifyContent = 'space-between';
    title.style.alignItems = 'center';
    title.style.marginBottom = '10px';
    title.style.paddingBottom = '8px';
    title.style.borderBottom = '2px solid #335f8a';
    title.innerHTML = `
      <div>
        <div style="font-size:22px;font-weight:700;color:#0f172a;line-height:1.2;">Sales Report</div>
      </div>
      <div style="font-size:14px;color:#1f2937;font-weight:600;">พิมพ์วันที่: ${escHtml(new Date().toLocaleString('th-TH'))}</div>
    `;

    const summaryLine = document.createElement('div');
    summaryLine.style.display = 'flex';
    summaryLine.style.flexWrap = 'wrap';
    summaryLine.style.gap = '18px';
    summaryLine.style.alignItems = 'center';
    summaryLine.style.marginBottom = '10px';
    summaryLine.style.color = '#243b53';
    summaryLine.style.fontSize = '13px';
    summaryLine.style.fontWeight = '600';
    summaryLine.innerHTML = `
      <span>ยอดจองรวม: ${escHtml(formatNumber(currentData?.summary?.total_net_amount || 0))} บาท</span>
      <span>คอมรวม: ${escHtml(formatNumber(currentData?.summary?.total_commission || 0))} บาท</span>
      <span>ส่วนลด: ${escHtml(formatNumber(currentData?.summary?.total_discount || 0))} บาท</span>
      <span>คอมสุทธิ: ${escHtml(formatNumber(netCommission || 0))} บาท</span>
    `;

    const filterLine = document.createElement('div');
    filterLine.style.display = 'flex';
    filterLine.style.flexWrap = 'wrap';
    filterLine.style.gap = '12px';
    filterLine.style.marginBottom = '12px';
    filterLine.style.fontSize = '11px';
    filterLine.style.color = '#5b6b7c';
    filterLine.innerHTML = buildPrintFilters().map(item => `
      <span><strong style="color:#334e68;">${escHtml(item.label)}:</strong> ${escHtml(item.value || '-')}</span>
    `).join('');

    const tableWrapperClone = tableWrapperEl.cloneNode(true);
    tableWrapperClone.style.maxHeight = 'none';
    tableWrapperClone.style.overflow = 'visible';
    tableWrapperClone.style.border = '1px solid #b7c8d8';
    tableWrapperClone.style.borderRadius = '0';

    const stickyHeaders = tableWrapperClone.querySelectorAll('.crp-table thead tr.group-row th, .crp-table thead tr.col-row th');
    stickyHeaders.forEach(th => {
      th.style.position = 'static';
      th.style.top = 'auto';
    });

    const table = tableWrapperClone.querySelector('table');
    if (table) {
      table.style.width = '100%';
      table.style.fontSize = '11px';
    }

    tableWrapperClone.querySelectorAll('.crp-table thead tr.group-row th').forEach(th => {
      th.style.background = '#4f79a4';
      th.style.color = '#ffffff';
      th.style.fontSize = '10px';
      th.style.padding = '6px 5px';
      th.style.borderColor = '#b7c8d8';
    });

    tableWrapperClone.querySelectorAll('.crp-table thead tr.col-row th').forEach(th => {
      th.style.background = '#d7e4f1';
      th.style.color = '#243b53';
      th.style.fontSize = '10px';
      th.style.padding = '6px 5px';
      th.style.borderColor = '#b7c8d8';
    });

    tableWrapperClone.querySelectorAll('.crp-table tbody td').forEach(td => {
      td.style.fontSize = '10px';
      td.style.padding = '5px 5px';
      td.style.borderColor = '#d4dee8';
      td.style.color = '#243b53';
    });

    tableWrapperClone.querySelectorAll('.crp-table tbody tr:nth-child(even)').forEach(tr => {
      tr.style.background = '#f7fafc';
    });

    const tbody = tableWrapperClone.querySelector('.crp-table tbody');
    if (tbody) {
      const footer = document.createElement('tr');
      footer.style.background = '#d7e4f1';
      footer.style.fontWeight = '700';
      footer.innerHTML = `
        <td colspan="4" style="text-align:center;color:#243b53;border-top:2px solid #9fb6cc;">รวม ${escHtml(countText || '')}</td>
        <td style="border-top:2px solid #9fb6cc;"></td>
        <td style="text-align:right;border-top:2px solid #9fb6cc;">${escHtml(formatNumber(currentData?.summary?.total_net_amount || 0))}</td>
        <td style="border-top:2px solid #9fb6cc;"></td>
        <td style="border-top:2px solid #9fb6cc;"></td>
        <td style="text-align:right;border-top:2px solid #9fb6cc;">${escHtml(formatNumber(currentData?.summary?.total_commission || 0))}</td>
        <td style="text-align:right;color:#16a34a;border-top:2px solid #9fb6cc;">${escHtml(formatNumber(netCommission || 0))}</td>
        <td style="text-align:right;border-top:2px solid #9fb6cc;">${escHtml(formatNumber(currentData?.summary?.total_discount || 0))}</td>
      `;
      tbody.appendChild(footer);
    }

    wrapper.appendChild(title);
    wrapper.appendChild(summaryLine);
    wrapper.appendChild(filterLine);
    wrapper.appendChild(tableWrapperClone);
    document.body.appendChild(wrapper);
    return wrapper;
  }

  function createPageShell(pageNumber, totalPages) {
    const page = document.createElement('div');
    page.style.width = '1520px';
    page.style.minHeight = '1040px';
    page.style.background = '#ffffff';
    page.style.padding = '22px 24px 18px';
    page.style.boxSizing = 'border-box';
    page.style.display = 'flex';
    page.style.flexDirection = 'column';
    page.style.gap = '10px';

    const footer = document.createElement('div');
    footer.className = 'crp-pdf-page-footer';
    footer.style.marginTop = 'auto';
    footer.style.textAlign = 'right';
    footer.style.fontSize = '12px';
    footer.style.fontWeight = '600';
    footer.style.color = '#334155';
    footer.textContent = `หน้า ${pageNumber}/${totalPages}`;

    return { page, footer };
  }

  function clonePdfHeader(sourceNode) {
    const title = sourceNode.children[0].cloneNode(true);
    const summary = sourceNode.children[1].cloneNode(true);
    const filters = sourceNode.children[2].cloneNode(true);
    return { title, summary, filters };
  }

  function clonePdfTableShell(sourceTableWrapper) {
    const tableWrapper = sourceTableWrapper.cloneNode(false);
    tableWrapper.style.maxHeight = 'none';
    tableWrapper.style.overflow = 'visible';
    const sourceTable = sourceTableWrapper.querySelector('table');
    const sourceThead = sourceTable.querySelector('thead');
    const table = sourceTable.cloneNode(false);
    const thead = sourceThead.cloneNode(true);
    const tbody = document.createElement('tbody');
    table.appendChild(thead);
    table.appendChild(tbody);
    tableWrapper.appendChild(table);
    return { tableWrapper, table, tbody };
  }

  function buildPaginatedPdfPages(sourceNode) {
    const countText = sourceNode.dataset.countText || '';
    const sourceTableWrapper = sourceNode.querySelector('.dashboard-table-wrapper.crp-table-scroll');
    const sourceRows = Array.from(sourceNode.querySelectorAll('.crp-table tbody tr'));
    if (!sourceTableWrapper || !sourceRows.length) return [sourceNode];

    const footerRow = sourceRows[sourceRows.length - 1] && sourceRows[sourceRows.length - 1].querySelector('td[colspan="4"]')
      ? sourceRows[sourceRows.length - 1]
      : null;
    const bodyRows = footerRow ? sourceRows.slice(0, -1) : sourceRows.slice();
    if (!bodyRows.length) return [sourceNode];

    function createMeasurePage(includeFullHeader) {
      const page = document.createElement('div');
      page.style.position = 'fixed';
      page.style.left = '-20000px';
      page.style.top = '0';
      page.style.width = '1520px';
      page.style.minHeight = '1040px';
      page.style.background = '#ffffff';
      page.style.padding = '22px 24px 18px';
      page.style.boxSizing = 'border-box';
      page.style.display = 'flex';
      page.style.flexDirection = 'column';
      page.style.gap = '10px';
      document.body.appendChild(page);

      const clones = clonePdfHeader(sourceNode);
      if (includeFullHeader) {
        page.appendChild(clones.title);
        page.appendChild(clones.summary);
        page.appendChild(clones.filters);
      } else {
        const miniHeader = clones.title.cloneNode(true);
        const rightNode = miniHeader.children[1];
        if (rightNode) rightNode.textContent = countText;
        miniHeader.style.marginBottom = '4px';
        page.appendChild(miniHeader);
      }

      const parts = clonePdfTableShell(sourceTableWrapper);
      page.appendChild(parts.tableWrapper);
      const footer = document.createElement('div');
      footer.style.marginTop = 'auto';
      footer.style.height = '26px';
      page.appendChild(footer);
      return { page, parts };
    }

    function measureMaxBodyHeight(includeFullHeader) {
      const measured = createMeasurePage(includeFullHeader);
      const availableHeight = 1040 - 22 - 18 - 26 - 24
        - Array.from(measured.page.children)
          .filter(node => node !== measured.parts.tableWrapper)
          .reduce((sum, node) => sum + node.offsetHeight, 0);
      const theadHeight = measured.parts.table.querySelector('thead').offsetHeight;
      const maxBodyHeight = Math.max(availableHeight - theadHeight, 120);
      document.body.removeChild(measured.page);
      return maxBodyHeight;
    }

    const firstPageMaxBodyHeight = measureMaxBodyHeight(true);
    const nextPageMaxBodyHeight = measureMaxBodyHeight(false);

    const rowHeights = [];
    const rowMeasure = createMeasurePage(true);
    bodyRows.forEach(row => {
      const clone = row.cloneNode(true);
      rowMeasure.parts.tbody.appendChild(clone);
      rowHeights.push(clone.offsetHeight);
      rowMeasure.parts.tbody.removeChild(clone);
    });
    document.body.removeChild(rowMeasure.page);

    const pagesRows = [];
    let currentPageRows = [];
    let currentHeight = 0;
    let currentLimit = firstPageMaxBodyHeight;

    rowHeights.forEach((rowHeight, index) => {
      if (currentPageRows.length && currentHeight + rowHeight > currentLimit) {
        pagesRows.push(currentPageRows);
        currentPageRows = [];
        currentHeight = 0;
        currentLimit = nextPageMaxBodyHeight;
      }

      currentPageRows.push(index);
      currentHeight += rowHeight;
    });

    if (currentPageRows.length) pagesRows.push(currentPageRows);

    const builtPages = [];
    const totalPages = pagesRows.length;

    pagesRows.forEach((rowIndexes, pageIdx) => {
      const { page, footer } = createPageShell(pageIdx + 1, totalPages);
      const clones = clonePdfHeader(sourceNode);
      if (pageIdx === 0) {
        page.appendChild(clones.title);
        page.appendChild(clones.summary);
        page.appendChild(clones.filters);
      } else {
        const miniHeader = clones.title.cloneNode(true);
        const rightNode = miniHeader.children[1];
        if (rightNode) rightNode.textContent = countText;
        miniHeader.style.marginBottom = '4px';
        page.appendChild(miniHeader);
      }

      const parts = clonePdfTableShell(sourceTableWrapper);
      rowIndexes.forEach(idx => {
        parts.tbody.appendChild(bodyRows[idx].cloneNode(true));
      });
      if (pageIdx === totalPages - 1 && footerRow) {
        parts.tbody.appendChild(footerRow.cloneNode(true));
      }
      page.appendChild(parts.tableWrapper);
      page.appendChild(footer);
      builtPages.push(page);
    });

    return builtPages;
  }

  function appendCanvasSlicesToPdf(doc, canvas) {
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 8;
    const usableWidth = pageWidth - (margin * 2);
    const renderHeight = canvas.height * usableWidth / canvas.width;
    const imgData = canvas.toDataURL('image/png');
    doc.addImage(imgData, 'PNG', margin, margin, usableWidth, renderHeight, undefined, 'FAST');
  }

  // ---- Export PDF (generate file from current table view) ----
  async function exportPDF(orders, summary = {}) {
    const tableCount = document.getElementById('crp-table-count');
    const btn = document.getElementById('crp-btn-pdf');
    const originalText = btn ? btn.innerHTML : '';
    const rows = getVisibleTableRows();
    if (!rows.length) {
      alert('ไม่พบข้อมูลสำหรับสร้าง PDF');
      return;
    }

    if (!window.jspdf || !window.jspdf.jsPDF || !window.html2canvas) {
      alert('ไม่สามารถโหลดเครื่องมือสร้าง PDF ได้ กรุณาลองใหม่อีกครั้ง');
      return;
    }

    if (btn) {
      btn.disabled = true;
      btn.innerHTML = 'กำลังสร้าง PDF...';
    }

    try {
      const jsPDF = window.jspdf.jsPDF;
      const countText = tableCount ? tableCount.textContent : `แสดง ${formatNumber(rows.length, 0)} รายการ`;
      const sourceNode = createPdfSourceNode(countText);
      if (!sourceNode) throw new Error('PDF source node not found');
      const pages = buildPaginatedPdfPages(sourceNode);
      sourceNode.remove();
      if (document.fonts && document.fonts.ready) {
        await document.fonts.ready;
      }

      const doc = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4'
      });

      for (let i = 0; i < pages.length; i += 1) {
        if (i > 0) doc.addPage();
        document.body.appendChild(pages[i]);
        const canvas = await window.html2canvas(pages[i], {
          scale: 2,
          useCORS: true,
          backgroundColor: '#ffffff',
          logging: false
        });
        appendCanvasSlicesToPdf(doc, canvas);
        pages[i].remove();
      }

      doc.save(getPdfFileName());
    } catch (error) {
      console.error('[CRP] Failed to export PDF:', error);
      alert('สร้าง PDF ไม่สำเร็จ กรุณาลองใหม่อีกครั้ง');
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = originalText;
      }
    }
  }

})();
