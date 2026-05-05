// Sales Report by Seller - Main JavaScript
(function () {
  'use strict';

  const APP_FONT = window.AppFont;
  const APP_FONT_CSS_FAMILY = APP_FONT.cssFamily();
  const APP_FONT_STYLESHEET_TAG = APP_FONT.stylesheetTag();

  // ---- State ----
  let currentUser = null;
  let currentData = null;
  // Subset of currentData filtered to the current user's own orders. For
  // admins this equals currentData.orders; for ts/crm it's just their rows.
  // Used by the main table, KPI cards, and exports so non-admins only ever
  // see their own raw data — even though the API returns role-wide rows
  // so the ranking summary can show their position.
  let currentOwnOrders = [];
  let currentOwnSummary = null;
  let sellers = [];
  let availablePeriods = { years: [] };

  // Period selector state for "วันที่สร้าง Order" (created_at).
  // SharedPeriodSelector single-select mode; buildFilters() converts it to a
  // date range via SharedPeriodSelector.toDateRange.
  let createdPeriodState = { mode: 'all' };

  // Selected values from FilterSortDropdown instances
  let selectedSellerId = '';
  let selectedOrderStatus = 'not_canceled';
  let mainTableQuery = '';
  // Toggle for the "นับ Order ที่มีผู้เดินทางเท่านั้น" checkbox above the
  // main table. Default checked → only count orders with room_quantity > 0.
  // Unchecking removes the filter entirely so every order (including the
  // 0-traveler ones) flows through. Affects every downstream consumer
  // (KPI / ranking / table / exports) since the filter is applied at the
  // renderResults entry.
  let countWithTravelers = true;
  let mainTableSort = { key: 'order_code', direction: 'asc' };
  let sellerSummarySort = {
    ts: { key: 'net_amount', direction: 'desc' },
    crm: { key: 'net_amount', direction: 'desc' }
  };

  document.addEventListener('DOMContentLoaded', function () {
    init();
  });

  // ---- Init ----
  async function init() {
    if (!validateToken()) return;
    currentUser = getUserFromToken();
    renderShell();
    // SharedFilterService.getAvailablePeriods already returns { years: [] }
    // on error so we can call it inline without a try/catch wrapper.
    const [_, periods] = await Promise.all([
      loadSellers(),
      window.SharedFilterService ? window.SharedFilterService.getAvailablePeriods() : null
    ]);
    if (periods && Array.isArray(periods.years)) availablePeriods = periods;
    await initFilters();
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

  // getEffectiveRole() — single source of truth for all role-aware UI guards.
  // Priority: (1) view-as sessionStorage when impersonation is confirmed active
  //           (via MenuComponent.isImpersonating, which reads sessionStorage and
  //           validates the real JWT directly — not subject to token-patch issues),
  //           (2) currentUser.job_position from the (possibly-patched) token,
  //           (3) 'admin' as safe default when no user is loaded.
  //
  // All callers that previously read currentUser.job_position directly for role
  // decisions have been migrated to this function so view-as fidelity is
  // preserved even when TokenUtils.decodeToken patch fails.
  function getEffectiveRole() {
    if (typeof window !== 'undefined' &&
        window.MenuComponent &&
        typeof window.MenuComponent.isImpersonating === 'function' &&
        window.MenuComponent.isImpersonating()) {
      // sessionStorage is authoritative when view-as is confirmed active
      try {
        var vaRole = sessionStorage.getItem('viewAsRole');
        if (vaRole === 'ts' || vaRole === 'crm') return vaRole;
      } catch (e) { /* ignore */ }
    }
    return (currentUser && currentUser.job_position) || 'admin';
  }

  // isAdmin() — true only when effective role is not ts or crm.
  // Uses getEffectiveRole() so it is view-as aware as a hard guarantee:
  // during impersonation this always returns false regardless of whether
  // the TokenUtils.decodeToken patch successfully rewrote currentUser.
  function isAdmin() {
    const role = getEffectiveRole();
    return role !== 'ts' && role !== 'crm';
  }

  // Effective user id — prefer view-as sessionStorage during impersonation
  // so identity-driven UI (locked seller dropdown, self-row highlight,
  // per-user data filters) shows the impersonated user, not admin id=555.
  function getEffectiveUserId() {
    if (typeof window !== 'undefined' &&
        window.MenuComponent &&
        typeof window.MenuComponent.isImpersonating === 'function' &&
        window.MenuComponent.isImpersonating()) {
      try {
        var vaUid = sessionStorage.getItem('viewAsUserId');
        var n = parseInt(vaUid, 10);
        if (Number.isFinite(n) && n > 0) return String(n);
      } catch (e) { /* ignore */ }
    }
    return String((currentUser && currentUser.id) || '');
  }

  // Effective nick — same logic. Used by the disabled seller dropdown
  // and any other label that prints "your name" while impersonating.
  function getEffectiveNickName() {
    if (typeof window !== 'undefined' &&
        window.MenuComponent &&
        typeof window.MenuComponent.isImpersonating === 'function' &&
        window.MenuComponent.isImpersonating()) {
      try {
        var vaNick = sessionStorage.getItem('viewAsUserNick');
        if (vaNick) return vaNick;
      } catch (e) { /* ignore */ }
    }
    return (currentUser && currentUser.nick_name) || '';
  }

  // ---- Helpers ----
  function formatNumber(val, decimals = 0) {
    return (parseFloat(val) || 0).toLocaleString('th-TH', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
  }

  // Fixed-length placeholder for redacted seller names — uniform across
  // every peer row so individual name lengths can't be inferred.
  const MASKED_NAME = '******';

  // Aggregate KPI totals from a subset of orders. Used to recompute the
  // KPI cards from a non-admin's own subset since the API summary spans
  // every row in the response (which for non-admins now includes the
  // whole role's orders so the ranking can show their position).
  function computeSummary(orders) {
    return (orders || []).reduce(function (acc, o) {
      acc.total_orders += 1;
      acc.total_net_amount += parseFloat(o.net_amount || 0);
      acc.total_commission += parseFloat(o.supplier_commission || 0);
      acc.total_discount += parseFloat(o.discount || 0);
      return acc;
    }, { total_orders: 0, total_net_amount: 0, total_commission: 0, total_discount: 0 });
  }

  function getDiscountPercentValue(discountValue, netAmountValue) {
    const netAmount = parseFloat(netAmountValue || 0);
    if (!(netAmount > 0)) return null;
    return (parseFloat(discountValue || 0) / netAmount) * 100;
  }

  function formatPercentValue(percentValue, decimals = 2) {
    return percentValue == null ? '-' : `${formatNumber(percentValue, decimals)}%`;
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

  function clonePeriodState(state) {
    const source = state && typeof state === 'object' ? state : {};
    return {
      mode: source.mode || 'all',
      allValues: !!source.allValues,
      year: source.year != null ? Number(source.year) : undefined,
      quarter: source.quarter != null ? Number(source.quarter) : undefined,
      month: source.month != null ? Number(source.month) : undefined,
      periods: Array.isArray(source.periods)
        ? source.periods.map(function (period) { return Object.assign({}, period); })
        : undefined,
      customFrom: source.customFrom || '',
      customTo: source.customTo || ''
    };
  }

  function monthName(month) {
    return [
      '',
      'มกราคม',
      'กุมภาพันธ์',
      'มีนาคม',
      'เมษายน',
      'พฤษภาคม',
      'มิถุนายน',
      'กรกฎาคม',
      'สิงหาคม',
      'กันยายน',
      'ตุลาคม',
      'พฤศจิกายน',
      'ธันวาคม'
    ][Number(month)] || String(month || '');
  }

  function getDefaultMonthlyPeriodState() {
    const now = new Date();
    return {
      mode: 'monthly',
      year: now.getFullYear(),
      quarter: Math.ceil((now.getMonth() + 1) / 3),
      month: now.getMonth() + 1
    };
  }

  function mountPeriodSelectors() {
    window.SharedPeriodSelector.mount({
      modeContainerId : 'crp-created-mode-host',
      valueContainerId: 'crp-created-value-host',
      availablePeriods: availablePeriods,
      multiSelect     : false,
      modes           : ['yearly', 'quarterly', 'monthly', 'custom'],
      initialState    : createdPeriodState,
      onChange        : function (state) {
        createdPeriodState = clonePeriodState(state);
        mountPeriodSelectors();
      }
    });
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
      case 'discount_percent':
        return getDiscountPercentValue(order.discount, order.net_amount);
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
      const sid = String(o.seller_agency_member_id || '');
      const key = sid || (o.seller_nick_name || '-');
      if (!map.has(key)) map.set(key, {
        seller_id: sid,
        seller: o.seller_nick_name || '-',
        // team_number is per-seller in agency_members, so any order from this
        // seller carries it — capture once on first hit. Falls back to 0 when
        // the agency-members JOIN didn't resolve (no team assigned).
        team_number: parseInt(o.seller_team_number, 10) || 0,
        orders: 0, net_amount: 0, discount: 0, net_commission: 0
      });
      const s = map.get(key);
      s.orders += 1;
      s.net_amount += parseFloat(o.net_amount || 0);
      s.discount += parseFloat(o.discount || 0);
      s.net_commission += (parseFloat(o.supplier_commission || 0) - parseFloat(o.discount || 0));
    });
    return Array.from(map.values());
  }

  function sortSellerAggregate(rows, groupClass) {
    const state = sellerSummarySort[groupClass] || { key: 'net_amount', direction: 'desc' };
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

  // Render the "เซลล์ผู้จอง" dropdown. Admins see every seller; non-admins
  // see a locked button showing their own nick name.
  function renderSellerDropdown() {
    const sellerHost = document.getElementById('crp-dd-seller');
    if (!sellerHost) return;

    if (!isAdmin()) {
      const sellerId = getEffectiveUserId();
      const me = sellers.find(s => String(s.id) === sellerId);
      const name = (me && me.nick_name) || getEffectiveNickName() || '-';
      sellerHost.innerHTML =
        `<button class="filter-sort-btn" disabled style="opacity:0.6;cursor:not-allowed;min-width:120px">
           <div class="filter-sort-btn-content">${getPersonIcon()}<span class="filter-sort-btn-text">${escHtml(name)}</span></div>
         </button>`;
      return;
    }

    const sellerOptions = [
      { value: '', label: 'ทั้งหมด', icon: getAllIcon(), active: !selectedSellerId },
      ...sellers.map(s => ({
        value : String(s.id),
        label : s.nick_name || `${s.first_name} ${s.last_name}`.trim() || String(s.id),
        icon  : getPersonIcon(),
        active: String(s.id) === String(selectedSellerId)
      }))
    ];

    window.FilterSearchDropdown.init({
      containerId : 'crp-dd-seller',
      defaultLabel: 'ทั้งหมด',
      defaultIcon : getAllIcon(),
      options     : sellerOptions,
      placeholder : 'ค้นหาเซลล์...',
      onChange    : function (val) {
        selectedSellerId = val || '';
      }
    });
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

          <div class="filter-row-divider"></div>

          <!-- แถว 2: Dropdown Pair -->
          <div class="filter-row crp-filter-row">
            <div class="crp-filter-field">
              <span class="time-granularity-label crp-filter-label">ชื่อผู้จอง</span>
              <div class="crp-filter-control" id="crp-dd-seller"></div>
            </div>

            <div class="crp-filter-field">
              <span class="time-granularity-label crp-filter-label">สถานะ Order</span>
              <div class="crp-filter-control" id="crp-dd-status"></div>
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
  async function initFilters() {
    const sellerId = getEffectiveUserId();

    // Default created-period to current month so the report loads with the
    // usual monthly view on first paint.
    createdPeriodState = getDefaultMonthlyPeriodState();
    mountPeriodSelectors();

    // Set state defaults
    selectedSellerId     = isAdmin() ? '' : sellerId;
    selectedOrderStatus  = 'not_canceled';

    // ---- เซลล์ผู้จอง dropdown ----
    renderSellerDropdown();

    // ---- สถานะ Order dropdown ----
    const defaultStatus = 'not_canceled';
    const statusOptions = [
      { value: 'all',          label: 'ทั้งหมด',   icon: getStatusIcon('all') },
      { value: 'not_canceled', label: 'ไม่ยกเลิก', icon: getStatusIcon('not_canceled') },
      { value: 'canceled',     label: 'ยกเลิก',    icon: getStatusIcon('canceled') },
    ].map(o => ({ ...o, active: o.value === defaultStatus }));

    FilterSortDropdownComponent.initDropdown({
      containerId: 'crp-dd-status',
      defaultLabel: defaultStatus === 'not_canceled' ? 'ไม่ยกเลิก' : 'ทั้งหมด',
      defaultIcon: getStatusIcon(defaultStatus),
      options: statusOptions,
      onChange: function (val) {
        selectedOrderStatus = val;
      }
    });

    // Action buttons — SharedFilterActions mounts ค้นหา + เริ่มใหม่ into
    // the host. Reset clears filter UI back to defaults only; the user
    // still has to press ค้นหา to re-query, so we never overwrite the
    // currently-visible results silently.
    if (window.SharedFilterActions) {
      window.SharedFilterActions.mount({
        containerId: 'crp-filter-actions-host',
        searchId   : 'crp-btn-search',
        resetId    : 'crp-btn-reset',
        onSearch   : loadReport,
        onReset    : resetFiltersToDefault
      });
    }

  }

  // Reset contract: restore every filter input/UI widget to the page default
  // (current month, admin defaults, etc.) WITHOUT refetching the report.
  function resetFiltersToDefault() {
    const sellerId = getEffectiveUserId();
    createdPeriodState = getDefaultMonthlyPeriodState();
    selectedSellerId     = isAdmin() ? '' : sellerId;
    selectedOrderStatus  = 'not_canceled';

    mountPeriodSelectors();

    // Linked seller dropdown — re-renders inside renderSellerDropdown.
    renderSellerDropdown();

    FilterSortDropdownComponent.initDropdown({
      containerId: 'crp-dd-status',
      defaultLabel: selectedOrderStatus === 'not_canceled' ? 'ไม่ยกเลิก' : 'ทั้งหมด',
      defaultIcon: getStatusIcon(selectedOrderStatus),
      options: [
        { value: 'all',          label: 'ทั้งหมด',   icon: getStatusIcon('all'),          active: selectedOrderStatus === 'all'          },
        { value: 'not_canceled', label: 'ไม่ยกเลิก', icon: getStatusIcon('not_canceled'), active: selectedOrderStatus === 'not_canceled' },
        { value: 'canceled',     label: 'ยกเลิก',    icon: getStatusIcon('canceled'),     active: selectedOrderStatus === 'canceled'     },
      ],
      onChange: function (val) { selectedOrderStatus = val; }
    });

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
    // Guard against custom-mode period with unselected dates. toDateRange()
    // silently returns empty strings in that case, which would otherwise hit
    // the API with blank created_at_from / paid_at_to and return junk or 500.
    const missing = getMissingCustomRangeLabel();
    if (missing) {
      alert('กรุณาเลือกช่วงวันที่ของ "' + missing + '" ก่อนค้นหา');
      return;
    }
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

  // Returns the Thai label of whichever period selector is in custom mode
  // but missing from/to — '' if both states are valid.
  function getMissingCustomRangeLabel() {
    if (createdPeriodState && createdPeriodState.mode === 'custom'
        && (!createdPeriodState.customFrom || !createdPeriodState.customTo)) {
      return 'วันที่สร้าง';
    }
    return '';
  }

  function buildFilters() {
    const created = window.SharedPeriodSelector.toDateRange(createdPeriodState, availablePeriods);
    return {
      created_at_from: created.dateFrom || '',
      created_at_to:   created.dateTo   || '',
      // Send the effective role so the API hint matches the view-as state.
      // Admins get "all orders"; the backend enforces ts/crm scoping via
      // X-View-As-* headers, so this is an advisory hint only.
      job_position:    getEffectiveRole(),
      // Non-admins intentionally omit seller_id so the response covers
      // every seller in their role — the ranking summary needs this to
      // show their position; the main table and KPI cards filter back
      // down to their own rows in renderResults.
      seller_id:       isAdmin() ? selectedSellerId : '',
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
    const rawOrders = (data && data.orders) || [];
    if (!rawOrders.length) { showEmpty(); return; }
    // Toggle-driven traveler filter — checkbox in the table toolbar gates
    // whether 0-traveler orders are included. Checked → only room_quantity
    // > 0; unchecked → every order. Applied at the top so every downstream
    // consumer (KPI summary, seller ranking, main table, exports) sees the
    // same set. Empty result post-filter is allowed to flow through so the
    // toolbar stays visible and the user can toggle back without re-querying.
    const orders = countWithTravelers
      ? rawOrders.filter(o => parseFloat(o.room_quantity || 0) > 0)
      : rawOrders;

    // For non-admins the API returns role-wide rows so the ranking summary
    // can show their position. The main table, KPI cards, and exports
    // however should still reflect only the user's own data.
    const myId = getEffectiveUserId();
    const ownOrders = isAdmin()
      ? orders
      : orders.filter(o => String(o.seller_agency_member_id || '') === myId);
    // Always derive the summary from the (filtered) orders array — the
    // backend's `summary` was computed before the room_quantity filter
    // and would over-count by including 0-traveler orders.
    const ownSummary = computeSummary(ownOrders);
    currentOwnOrders = ownOrders;
    currentOwnSummary = ownSummary;

    results.innerHTML = renderSummary(ownSummary) + renderSellerSummary(orders) + renderTableSection(ownOrders);

    // Sticky header: set col-row top = group-row height
    const groupRow = results.querySelector('.crp-table thead tr.group-row');
    if (groupRow) {
      const h = groupRow.offsetHeight;
      results.querySelectorAll('.crp-table thead tr.col-row th').forEach(th => {
        th.style.top = h + 'px';
      });
    }

    const exportBtn = document.getElementById('crp-btn-export');
    if (exportBtn) exportBtn.addEventListener('click', () => exportExcelWorkbook(orders));
    document.getElementById('crp-btn-pdf').addEventListener('click', () => exportPDF(orders, ownSummary));

    const travelerToggle = document.getElementById('crp-traveler-toggle');
    if (travelerToggle) {
      travelerToggle.addEventListener('change', function () {
        countWithTravelers = !!travelerToggle.checked;
        renderResults(currentData);
      });
    }

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
        const state = sellerSummarySort[group] || { key: 'net_amount', direction: 'desc' };
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

  // ---- Seller Summary ----
  // Admin: see both Telesales + CRM groups with full data.
  // ts: sees the Telesales group with peer rows redacted (name → ******,
  //     numbers visible so the user can still see their rank).
  // crm: sees the CRM group with no redaction — full team visibility per
  //     business rule (CRM is a smaller, collaborative team).
  function renderSellerSummary(orders) {
    // myId: prefer viewAsUserId from sessionStorage when impersonating so the
    // self-row highlight works even when the token patch fails to rewrite
    // currentUser.id (which would otherwise still hold admin id=555).
    const myId = (function () {
      if (typeof window !== 'undefined' &&
          window.MenuComponent &&
          typeof window.MenuComponent.isImpersonating === 'function' &&
          window.MenuComponent.isImpersonating()) {
        try {
          var vaUid = sessionStorage.getItem('viewAsUserId');
          if (vaUid) return String(parseInt(vaUid, 10) || '');
        } catch (e) { /* ignore */ }
      }
      return String(currentUser?.id || '');
    }());
    // Use getEffectiveRole() so view-as crm/ts is correctly identified even
    // when the token patch fails and currentUser.job_position is still 'admin'.
    const myRole = getEffectiveRole();

    // For CRM viewers, find their own team_number from their own row in the
    // data so we can render "CRM ทีม X" as the group title. Falls back to 0
    // (no suffix) when the CRM user has no orders in the current period —
    // the title still says "CRM" plain.
    const myTeamNumber = (function () {
      if (myRole !== 'crm') return 0;
      for (let i = 0; i < orders.length; i++) {
        const o = orders[i];
        if (String(o.seller_agency_member_id || '') === myId) {
          const t = parseInt(o.seller_team_number, 10);
          if (t > 0) return t;
        }
      }
      return 0;
    }());

    function buildGroupTable(title, groupClass, groupOrders) {
      const aggregateRows = buildSellerAggregate(groupOrders);
      const sorted = sortSellerAggregate(aggregateRows, groupClass);
      // Trophies everywhere EXCEPT when a CRM user views their own CRM
      // group — there we use plain numbering. Admin therefore sees trophies
      // on both Telesales and CRM groups; ts sees trophies on Telesales;
      // crm sees plain numbering on CRM.
      const useTrophies = !(myRole === 'crm' && groupClass === 'crm');
      // Append the viewer's team number to the CRM group title only when a
      // CRM user is the one viewing — admin and ts don't see this suffix.
      const titleSuffix = (myRole === 'crm' && groupClass === 'crm' && myTeamNumber)
        ? ` ทีม ${myTeamNumber}`
        : '';
      const rows = sorted.map((s, i) => {
        const rank = i + 1;
        const trophyIcon = (useTrophies && window.SharedTrophyRank)
          ? window.SharedTrophyRank.getTrophySvg(rank)
          : '';
        const showRankNumber = !useTrophies || rank > 3;
        const isSelf = isAdmin() || (s.seller_id && s.seller_id === myId);
        // Only ts redacts peers — name → ****** with numbers still visible
        // so the user can read their rank. crm and admin see everyone in
        // the team unredacted.
        const shouldMask  = !isSelf && myRole === 'ts';
        const sellerCell  = shouldMask ? MASKED_NAME : escHtml(s.seller);
        const netComClass = s.net_commission >= 0 ? 'crp-positive' : 'crp-negative';
        const rowClass    = shouldMask ? 'crp-summary-row--masked' : '';
        return `
          <tr class="${rowClass}">
            <td>
              <div class="crp-summary-seller-cell">
                ${trophyIcon}${showRankNumber ? `<span class="crp-summary-rank">${rank}</span>` : ''}
                <span class="crp-seller-badge">${sellerCell}</span>
              </div>
            </td>
            <td class="right">${formatNumber(s.orders, 0)}</td>
            <td class="right">${formatNumber(s.net_amount, 0)}</td>
            <td class="right">${formatNumber(s.discount, 0)}</td>
            <td class="right ${netComClass}">${formatNumber(s.net_commission, 0)}</td>
          </tr>`;
      }).join('');
      return `
        <div class="crp-summary-group crp-summary-group--${groupClass}">
          <div class="crp-summary-group-header">
            <span class="crp-summary-group-title">${escHtml(title + titleSuffix)}</span>
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

    let groupsHtml = '';
    if (isAdmin()) {
      groupsHtml = buildGroupTable('Telesales', 'ts', tsOrders) + buildGroupTable('CRM', 'crm', crmOrders);
    } else if (myRole === 'ts' && tsOrders.length) {
      // ts: own row + peer rows redacted (****** names, real numbers).
      groupsHtml = buildGroupTable('Telesales', 'ts', tsOrders);
    } else if (myRole === 'crm' && crmOrders.length) {
      // crm: full team visibility — no redaction (handled inside buildGroupTable).
      groupsHtml = buildGroupTable('CRM', 'crm', crmOrders);
    }

    if (!groupsHtml) return '';

    return `
      <div class="crp-seller-summary">
        <div class="crp-summary-title">สรุป</div>
        <div class="crp-summary-groups">
          ${groupsHtml}
        </div>
      </div>`;
  }

  // ---- Table ----
  function renderTableSection(orders) {
    const visibleOrders = getVisibleOrders(orders);
    const rows = visibleOrders.map(o => {
      const netCom = parseFloat(o.supplier_commission || 0) - parseFloat(o.discount || 0);
      const discountPercent = getDiscountPercentValue(o.discount, o.net_amount);
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
          <td class="right">${formatPercentValue(discountPercent)}</td>
        </tr>`;
    }).join('') || '<tr><td colspan="13" style="text-align:center;color:#9ca3af;padding:16px">ไม่พบข้อมูล</td></tr>';

    return `
      <div class="dashboard-table-header">
        ${window.SharedTableCount.render({ id: 'crp-table-count', count: visibleOrders.length })}
        <div class="dashboard-table-actions">
          <label class="banner1-filter-checkbox crp-traveler-checkbox">
            <input type="checkbox" id="crp-traveler-toggle" ${countWithTravelers ? 'checked' : ''}>
            <span class="banner1-filter-text">นับ Order ที่มีผู้เดินทางเท่านั้น</span>
          </label>
          <div id="crp-table-search-host"></div>
          ${isAdmin() ? window.SharedExportButton.render({ id: 'crp-btn-export', variant: 'excel' }) : ''}
          <button class="dashboard-export-btn crp-btn-pdf" id="crp-btn-pdf">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
            Export PDF
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
              <th colspan="2" class="group-header">ส่วนลด</th>
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
              <th class="right" data-sort="discount_percent" data-type="number">เปอร์เซ็นต์</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
      </div>`;
  }

  // ---- Export Excel Workbook ----
  // `orders` is the role-wide set used for the ranking sheets so non-admins
  // still see their position; the main sheet uses currentOwnOrders so it
  // mirrors what the user can see in the table.
  function exportExcelWorkbook(orders) {
    if (!window.XLSX || !window.XLSX.utils) {
      console.error('[CRP] XLSX library is not available');
      alert('ไม่สามารถสร้างไฟล์ Excel ได้ในขณะนี้');
      return;
    }

    const myRole = getEffectiveRole();
    const workbook = window.XLSX.utils.book_new();
    const worksheets = [
      {
        name: 'sales-report',
        headers: ['เซลล์', 'รหัส Order', 'จองวันที่', 'ลูกค้า', 'ประเทศ', 'เดินทาง', 'ยอดจอง', 'ผู้เดินทาง', 'วันชำระงวด 1', 'คอมรวม', 'คอม (หักส่วนลด)', 'ส่วนลดรวม', 'เปอร์เซ็นต์'],
        rows: getVisibleOrders(currentOwnOrders).map(function (o) {
          const commission = parseFloat(o.supplier_commission || 0);
          const discount = parseFloat(o.discount || 0);
          const discountPercent = getDiscountPercentValue(discount, o.net_amount);
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
            discount,
            formatPercentValue(discountPercent)
          ];
        })
      }
    ];

    if (isAdmin() || myRole === 'ts') {
      worksheets.push({
        name: 'sales-report-by-telesales',
        headers: ['อันดับ', 'เซลล์', 'ออเดอร์', 'ยอดจอง', 'ส่วนลด', 'คอมสุทธิ'],
        rows: getSellerSummaryExportRows(orders, 'ts')
      });
    }
    if (isAdmin()) {
      worksheets.push({
        name: 'sales-report-by-crm',
        headers: ['อันดับ', 'เซลล์', 'ออเดอร์', 'ยอดจอง', 'ส่วนลด', 'คอมสุทธิ'],
        rows: getSellerSummaryExportRows(orders, 'crm')
      });
    }

    worksheets.forEach(function (sheet) {
      const worksheet = window.XLSX.utils.aoa_to_sheet([sheet.headers].concat(sheet.rows));
      worksheet['!cols'] = buildWorksheetColumnWidths(sheet.headers, sheet.rows);
      window.XLSX.utils.book_append_sheet(workbook, worksheet, sheet.name);
    });

    window.XLSX.writeFile(workbook, getExcelFileName(), { compression: true });
  }

  function getSellerSummaryExportRows(orders, groupClass) {
    // Same viewAsUserId fallback used in renderSellerSummary so the self-row
    // is identified correctly even when the token patch fails.
    const myId = (function () {
      if (typeof window !== 'undefined' &&
          window.MenuComponent &&
          typeof window.MenuComponent.isImpersonating === 'function' &&
          window.MenuComponent.isImpersonating()) {
        try {
          var vaUid = sessionStorage.getItem('viewAsUserId');
          if (vaUid) return String(parseInt(vaUid, 10) || '');
        } catch (e) { /* ignore */ }
      }
      return String(currentUser?.id || '');
    }());
    const groupOrders = orders.filter(function (order) {
      return String(order.seller_job_position || '').toLowerCase() === groupClass;
    });
    return sortSellerAggregate(buildSellerAggregate(groupOrders), groupClass).map(function (row, index) {
      const isSelf = isAdmin() || (row.seller_id && row.seller_id === myId);
      const sellerName = isSelf ? row.seller : MASKED_NAME;
      return [index + 1, sellerName, row.orders, row.net_amount, row.discount, row.net_commission];
    });
  }

  function buildWorksheetColumnWidths(headers, rows) {
    const widths = [];
    const allRows = [headers || []].concat(rows || []);

    allRows.forEach(function (row) {
      (row || []).forEach(function (value, index) {
        const text = value == null ? '' : String(value);
        const current = widths[index] || 0;
        widths[index] = Math.max(current, text.length + 2);
      });
    });

    return widths.map(function (width) {
      return { wch: Math.min(Math.max(width, 10), 40) };
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
    if (!isAdmin()) return getEffectiveNickName() || '-';
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

  function getThaiYearLabel(yearCe) {
    const yearNum = Number(yearCe);
    if (!yearNum) return '-';
    const years = (availablePeriods && Array.isArray(availablePeriods.years)) ? availablePeriods.years : [];
    const match = years.find(function (entry) { return Number(entry.year_ce) === yearNum; });
    return String((match && match.label) || (yearNum + 543));
  }

  function getThaiMonthLabel(yearCe, monthNum) {
    const fallback = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];
    const years = (availablePeriods && Array.isArray(availablePeriods.years)) ? availablePeriods.years : [];
    const yearMatch = years.find(function (entry) { return Number(entry.year_ce) === Number(yearCe); });
    const monthMatch = yearMatch && Array.isArray(yearMatch.months)
      ? yearMatch.months.find(function (entry) { return Number(entry.month) === Number(monthNum); })
      : null;
    return (monthMatch && monthMatch.label) || fallback[Number(monthNum) - 1] || '-';
  }

  function getQuarterLabel(yearCe, quarterNum) {
    const years = (availablePeriods && Array.isArray(availablePeriods.years)) ? availablePeriods.years : [];
    const yearMatch = years.find(function (entry) { return Number(entry.year_ce) === Number(yearCe); });
    const quarterMatch = yearMatch && Array.isArray(yearMatch.quarters)
      ? yearMatch.quarters.find(function (entry) { return Number(entry.quarter) === Number(quarterNum); })
      : null;
    return (quarterMatch && quarterMatch.label) || ('Q' + Number(quarterNum));
  }

  // Render the active period as a print-friendly value. The card label
  // ("วันที่สร้าง Order") already implies "this is a date filter", so we
  // drop the รายปี/รายไตรมาส/รายเดือน prefixes and show just the resolved
  // date — same shape that appears in the dropdown trigger so the printed
  // report mirrors what the user picked.
  function formatPeriodStateForPrint(state) {
    if (!state || !state.mode || state.mode === 'all') return 'ทั้งหมด';
    if (state.mode === 'monthly') {
      return getThaiMonthLabel(state.year, state.month) + ' ' + getThaiYearLabel(state.year);
    }
    if (state.mode === 'quarterly') {
      return getQuarterLabel(state.year, state.quarter) + ' / ' + getThaiYearLabel(state.year);
    }
    if (state.mode === 'yearly') {
      return getThaiYearLabel(state.year);
    }
    if (state.mode === 'custom') {
      if (!state.customFrom || !state.customTo) return 'ทั้งหมด';
      return formatDate(state.customFrom) + ' - ' + formatDate(state.customTo);
    }
    return 'ทั้งหมด';
  }

  function buildPrintHighlights() {
    return [
      { label: 'วันที่สร้าง Order', value: formatPeriodStateForPrint(createdPeriodState) },
    ];
  }

  function buildPrintFilters() {
    return [
      { label: 'ชื่อผู้จอง', value: getSelectedSellerLabel() },
      { label: 'สถานะ Order', value: getSelectedStatusLabel() },
    ];
  }

  function getPrintDocumentHtml(tableHtml, summary, countText) {
    const netCommission = parseFloat(summary.total_commission || 0) - parseFloat(summary.total_discount || 0);
    const highlightsHtml = buildPrintHighlights().map(item => `
      <div class="crp-print-highlight">
        <span class="crp-print-highlight-label">${escHtml(item.label)}</span>
        <span class="crp-print-highlight-value">${escHtml(item.value || '-')}</span>
      </div>
    `).join('');
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
    <title>Sales Report by Seller</title>
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
      .crp-print-highlights {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 10px;
        margin-bottom: 12px;
      }
      .crp-print-highlight {
        border: 1px solid #dbe2ea;
        border-radius: 12px;
        padding: 12px 14px;
        background: linear-gradient(180deg, #f8fbff 0%, #eef4fb 100%);
      }
      .crp-print-highlight-label {
        display: block;
        color: #64748b;
        font-size: 11px;
        margin-bottom: 6px;
      }
      .crp-print-highlight-value {
        display: block;
        color: #0f172a;
        font-size: 21px;
        line-height: 1.25;
        font-weight: 700;
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
        grid-template-columns: repeat(2, minmax(0, 1fr));
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
          <h1 class="crp-print-title">Sales Report by Seller</h1>
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

      <div class="crp-print-highlights">${highlightsHtml}</div>
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
      .filter(row => row.length === 13);
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

    const netCommission = parseFloat(currentOwnSummary?.total_commission || 0) - parseFloat(currentOwnSummary?.total_discount || 0);
    const totalDiscountPercent = getDiscountPercentValue(currentOwnSummary?.total_discount, currentOwnSummary?.total_net_amount);

    const title = document.createElement('div');
    title.style.display = 'flex';
    title.style.justifyContent = 'space-between';
    title.style.alignItems = 'center';
    title.style.marginBottom = '10px';
    title.style.paddingBottom = '8px';
    title.style.borderBottom = '2px solid #335f8a';
    title.innerHTML = `
      <div>
        <div style="font-size:22px;font-weight:700;color:#0f172a;line-height:1.2;">Sales Report by Seller</div>
      </div>
    `;

    // Top-of-page totals line removed by request — totals now appear only
    // on the main commission table's footer row, no need to duplicate at
    // the top of every page.
    const sellerLabel = getSelectedSellerLabel();
    const createdLabel = formatPeriodStateForPrint(createdPeriodState);
    const statusLabel = getSelectedStatusLabel();
    const isAllSeller = !sellerLabel || sellerLabel === 'ทั้งหมด';
    // For non-admins viewing their own role's report, prefix the "ทั้งหมด"
    // seller label with their role ("Telesales ทั้งหมด" / "CRM ทั้งหมด")
    // so the PDF says what scope the report covers.
    const roleScopeName = ({ ts: 'Telesales', crm: 'CRM' })[getEffectiveRole()] || '';
    const sellerDisplay = isAllSeller && roleScopeName
      ? `${roleScopeName} ทั้งหมด`
      : sellerLabel;
    const compactCountText = String(countText || '').replace(/แสดง\s*/g, '').trim();

    const HEADLINE_LABEL_STYLE = 'font-size:11px;font-weight:700;color:#64748b;letter-spacing:0.04em;text-transform:uppercase;margin-bottom:8px;';
    const HEADLINE_VALUE_STYLE = 'font-size:36px;line-height:1.08;font-weight:800;color:#0f172a;letter-spacing:-0.03em;word-break:break-word;';

    const highlightGrid = document.createElement('div');
    highlightGrid.style.display = 'flex';
    highlightGrid.style.alignItems = 'flex-start';
    highlightGrid.style.justifyContent = 'flex-start';
    highlightGrid.style.gap = '72px';
    highlightGrid.style.marginBottom = '10px';
    highlightGrid.style.padding = '4px 0 12px';
    highlightGrid.style.borderBottom = '1px solid #dbe2ea';
    highlightGrid.innerHTML = `
      <div style="min-width:0;">
        <div style="${HEADLINE_LABEL_STYLE}">ชื่อผู้จอง</div>
        <div style="${HEADLINE_VALUE_STYLE}">${escHtml(sellerDisplay || '-')}</div>
      </div>
      <div style="min-width:0;">
        <div style="${HEADLINE_LABEL_STYLE}">วันที่สร้าง Order</div>
        <div style="${HEADLINE_VALUE_STYLE}">${escHtml(createdLabel || '-')}</div>
      </div>
    `;

    const filterLine = document.createElement('div');
    filterLine.style.display = 'flex';
    filterLine.style.justifyContent = 'space-between';
    filterLine.style.alignItems = 'flex-start';
    filterLine.style.gap = '16px';
    filterLine.style.marginBottom = '16px';
    filterLine.innerHTML = `
      <div style="display:flex;flex-wrap:wrap;gap:18px 28px;align-items:baseline;min-width:0;">
        <div style="display:flex;align-items:baseline;gap:9px;">
          <span style="font-size:13px;font-weight:700;color:#64748b;letter-spacing:0.03em;text-transform:uppercase;">สถานะ Order</span>
          <span style="font-size:23px;line-height:1.2;font-weight:700;color:#334e68;">${escHtml(statusLabel || '-')}</span>
        </div>
        <div style="display:flex;align-items:baseline;gap:9px;">
          <span style="font-size:13px;font-weight:700;color:#64748b;letter-spacing:0.03em;text-transform:uppercase;">จำนวนรายการ</span>
          <span style="font-size:23px;line-height:1.2;font-weight:700;color:#334e68;">${escHtml(compactCountText || '-')}</span>
        </div>
      </div>
      <div style="font-size:11px;font-weight:500;color:#64748b;white-space:nowrap;">พิมพ์วันที่ ${escHtml(new Date().toLocaleString('th-TH'))}</div>
    `;

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
      // 13-column main table — cols 1–6 (เซลล์/รหัส/จองวันที่/ลูกค้า/ประเทศ/
      // เดินทาง) carry no numeric totals so we colspan them under the "รวม
      // X รายการ" label, then place each summed value directly under its
      // own column header (7,10,11,12,13) with cols 8,9 left blank.
      const cellBorder = 'border-top:2px solid #9fb6cc;';
      footer.innerHTML = `
        <td colspan="6" style="text-align:center;color:#243b53;${cellBorder}">รวม ${escHtml(countText || '')}</td>
        <td style="text-align:right;${cellBorder}">${escHtml(formatNumber(currentOwnSummary?.total_net_amount || 0))}</td>
        <td style="${cellBorder}"></td>
        <td style="${cellBorder}"></td>
        <td style="text-align:right;${cellBorder}">${escHtml(formatNumber(currentOwnSummary?.total_commission || 0))}</td>
        <td style="text-align:right;color:#16a34a;${cellBorder}">${escHtml(formatNumber(netCommission || 0))}</td>
        <td style="text-align:right;${cellBorder}">${escHtml(formatNumber(currentOwnSummary?.total_discount || 0))}</td>
        <td style="text-align:right;${cellBorder}">${escHtml(formatPercentValue(totalDiscountPercent))}</td>
      `;
      tbody.appendChild(footer);
    }

    // Source-node child layout (used by clonePdfHeader):
    //   children[0] = title
    //   children[1] = highlightGrid (filter context cards)
    //   children[2] = filterLine (job position / order status)
    //   children[3] = tableWrapperClone (main commission table)
    wrapper.appendChild(title);
    wrapper.appendChild(highlightGrid);
    wrapper.appendChild(filterLine);
    wrapper.appendChild(tableWrapperClone);
    document.body.appendChild(wrapper);
    return wrapper;
  }

  // Clone a single Telesales / CRM ranking group from the live DOM, restyled
  // for full-page PDF rendering. Returns null when the group's tbody is
  // empty (e.g. admin filtered to the other role) so the caller can skip
  // building a page for it.
  function clonePdfSellerGroup(groupClass) {
    const live = document.querySelector('.crp-summary-group--' + groupClass);
    if (!live) return null;
    const hasRows = live.querySelector('.crp-summary-table tbody tr td');
    if (!hasRows) return null;

    const wrapper = document.createElement('div');
    wrapper.className = 'crp-pdf-seller-page';
    // No flex: 1 — let each group take its natural content height so the
    // two ranking tables stack tightly together. If a group ever grows it
    // pushes the next one down naturally; we don't reserve empty space.
    wrapper.style.display = 'flex';
    wrapper.style.flexDirection = 'column';

    const groupClone = live.cloneNode(true);
    // Width is controlled by the parent .groupsRow flex container in
    // buildSellerSummaryPage (TS + CRM side-by-side, each flex:1). Strip
    // any inherited margin from the live grid layout.
    groupClone.style.margin = '0';

    // Two groups now share one page (TS stacked over CRM), so each table
    // gets ~half the vertical real estate. Sizes are tuned to read well on
    // an A4-landscape page (1520px wide) — the live web sizes (14px) feel
    // tiny when scaled into a printout, so we bump everything ~30% larger.
    groupClone.querySelectorAll('.crp-summary-group-header').forEach(el => {
      el.style.padding = '14px 20px';
    });
    groupClone.querySelectorAll('.crp-summary-group-title').forEach(el => {
      el.style.fontSize = '22px';
    });
    groupClone.querySelectorAll('.crp-summary-group-count').forEach(el => {
      el.style.fontSize = '16px';
    });
    groupClone.querySelectorAll('.crp-summary-table thead th').forEach(th => {
      th.style.position = 'static';
      th.style.fontSize = '15px';
      th.style.padding = '12px 16px';
    });
    groupClone.querySelectorAll('.crp-summary-table tbody td').forEach(td => {
      td.style.fontSize = '15px';
      td.style.padding = '10px 16px';
    });
    // Strip interactivity — PDF is a static snapshot of the current sort.
    groupClone.querySelectorAll('.crp-summary-table thead th .sort-icon').forEach(el => el.remove());
    groupClone.querySelectorAll('.crp-summary-table thead th[data-sort]').forEach(th => {
      th.style.cursor = 'default';
      th.removeAttribute('tabindex');
      th.removeAttribute('role');
    });

    wrapper.appendChild(groupClone);
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
    // Source-node child layout after the totals line was dropped:
    //   children[0] = title
    //   children[1] = highlightGrid (filter context cards)
    //   children[2] = filterLine    (job position / order status)
    const title       = sourceNode.children[0].cloneNode(true);
    const highlights  = sourceNode.children[1].cloneNode(true);
    const filters     = sourceNode.children[2].cloneNode(true);
    return { title, highlights, filters };
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

  // Combined summary page: Telesales + CRM stacked vertically on a single
  // dedicated page (admin view). Empty groups are silently skipped so the
  // same builder handles all four scenarios:
  //   - both filled     → 1 page with both groups stacked
  //   - only TS filled  → 1 page with just TS
  //   - only CRM filled → 1 page with just CRM
  //   - none filled     → null (no summary page in the PDF)
  function buildSellerSummaryPage(sourceNode) {
    const groups = ['ts', 'crm']
      .map(clonePdfSellerGroup)
      .filter(Boolean);
    if (!groups.length) return null;

    const page = document.createElement('div');
    page.style.width = '1520px';
    page.style.minHeight = '1040px';
    page.style.background = '#ffffff';
    page.style.padding = '22px 24px 18px';
    page.style.boxSizing = 'border-box';
    page.style.display = 'flex';
    page.style.flexDirection = 'column';
    page.style.gap = '14px';

    // Title + filter highlights mirror the main table pages so the summary
    // doesn't read as a context-less first page. The totals line is still
    // omitted — each ranking group's header already shows its own counts
    // ("5 คน · 78 orders"), so a page-level totals line would just repeat
    // information.
    const clones = clonePdfHeader(sourceNode);
    page.appendChild(clones.title);
    page.appendChild(clones.highlights);
    page.appendChild(clones.filters);

    // Side-by-side row container so TS sits on the left, CRM on the right
    // (mirrors the live dashboard). When only one group has data, that
    // group simply takes the full row width via flex:1.
    const groupsRow = document.createElement('div');
    groupsRow.style.display = 'flex';
    groupsRow.style.gap = '16px';
    groupsRow.style.alignItems = 'flex-start';
    groups.forEach(function (g) {
      g.style.flex = '1';
      g.style.minWidth = '0';
      groupsRow.appendChild(g);
    });
    page.appendChild(groupsRow);

    const footer = document.createElement('div');
    footer.className = 'crp-pdf-page-footer';
    footer.style.marginTop = 'auto';
    footer.style.textAlign = 'right';
    footer.style.fontSize = '12px';
    footer.style.fontWeight = '600';
    footer.style.color = '#334155';
    page.appendChild(footer);
    return page;
  }

  function buildPaginatedPdfPages(sourceNode) {
    const countText = sourceNode.dataset.countText || '';
    const sourceTableWrapper = sourceNode.querySelector('.dashboard-table-wrapper.crp-table-scroll');
    const sourceRows = Array.from(sourceNode.querySelectorAll('.crp-table tbody tr'));
    if (!sourceTableWrapper || !sourceRows.length) return [sourceNode];

    // Combined Telesales + CRM ranking page (admin only). ts/crm don't
    // get a ranking page in the PDF — they still see the redacted
    // ranking on screen, but the PDF stays focused on their own orders.
    const summaryPages = [];
    if (isAdmin()) {
      const combinedSummaryPage = buildSellerSummaryPage(sourceNode);
      if (combinedSummaryPage) summaryPages.push(combinedSummaryPage);
    }

    const footerRow = sourceRows[sourceRows.length - 1] && sourceRows[sourceRows.length - 1].querySelector('td[colspan="6"]')
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
        page.appendChild(clones.highlights);
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
    const totalPages = summaryPages.length + pagesRows.length;
    // Summary pages come first; their footer text is patched once we know
    // both counts (so we can show "หน้า 1/5" etc. consistently).
    summaryPages.forEach(function (page, idx) {
      const footer = page.querySelector('.crp-pdf-page-footer');
      if (footer) footer.textContent = 'หน้า ' + (idx + 1) + '/' + totalPages;
      builtPages.push(page);
    });

    pagesRows.forEach((rowIndexes, pageIdx) => {
      const overallPageNumber = summaryPages.length + pageIdx + 1;
      const { page, footer } = createPageShell(overallPageNumber, totalPages);
      const clones = clonePdfHeader(sourceNode);
      if (pageIdx === 0) {
        page.appendChild(clones.title);
        page.appendChild(clones.highlights);
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
      // Append the totals footer row only on the FINAL main-table page —
      // compare against `pagesRows.length - 1` (last main-table index),
      // not `totalPages - 1` which now includes the leading summary
      // page(s) and would never match (footer row got dropped pre-fix).
      if (pageIdx === pagesRows.length - 1 && footerRow) {
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
      const countText = `${formatNumber(rows.length, 0)} รายการ`;
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
        // Park each page offscreen while html2canvas reads it. createPageShell
        // and buildSellerSummaryPage produce 1520×1040px boxes that would
        // otherwise flash visibly below the report (looks like a screenshot
        // taking place). position:fixed + far-negative-left + z-index:-1
        // keeps the layout intact for canvas measurement but invisible.
        pages[i].style.position = 'fixed';
        pages[i].style.left = '-20000px';
        pages[i].style.top = '0';
        pages[i].style.zIndex = '-1';
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
