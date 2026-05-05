// Canceled Orders - Main JavaScript
// Fork of commission-report-plus.js — reuses the same summary/table/PDF
// rendering but pins order_status='canceled' and filters by canceled_at
// instead of created_at. Backend enforces first-installment-paid via the
// INNER JOIN on v_Xqc7k7_customer_order_installments.
(function () {
  'use strict';

  const APP_FONT = window.AppFont;
  const APP_FONT_CSS_FAMILY = APP_FONT.cssFamily();
  const APP_FONT_STYLESHEET_TAG = APP_FONT.stylesheetTag();

  // ---- State ----
  let currentUser = null;
  let currentData = null;
  // Own-scoped slice of currentData.orders: equals all orders for admin,
  // equals (orders WHERE seller_agency_member_id === effectiveUserId) for
  // ts/crm. Backend returns role-wide rows so the page must filter
  // client-side for non-admins to honour data isolation. Recomputed every
  // renderResults() and consumed by KPI summary, main table, CSV/PDF export.
  let currentOwnOrders = [];
  let currentOwnSummary = null;
  let sellers = [];

  // Period selector state — replaces the canceled_at date-picker. Converts
  // to canceled_at_from/to in buildFilters() via SharedPeriodSelector.toDateRange.
  let availablePeriods = { years: [] };
  let canceledPeriodState = { mode: 'all' };

  // วันที่สร้าง Order relation to the canceled period:
  //   'all'    → no created_at filter (default — show every canceled order in the period)
  //   'before' → created_at strictly before canceled_at_from (old orders canceled now)
  //   'same'   → created_at within [canceled_at_from, canceled_at_to] (created and canceled in same period)
  // Applied as created_at_from/to in buildFilters() only when a canceled range exists.
  let createdRelationState = 'all';

  // Selected values from FilterSortDropdown instances
  let selectedSellerId = '';
  // ตำแหน่ง dropdown — 'ts' / 'crm' / 'admin'. Drives the linked
  // เซลล์ผู้จอง dropdown so admins only see sellers of the chosen role.
  // Sent to the backend as filters.job_position (admin = no role filter).
  let selectedJobPosition = 'admin';
  let mainTableQuery = '';
  // Default-sort the main table by "จองวันที่" (created_at) descending so
  // the newest bookings sit on top. Setting an explicit key (vs. null)
  // also lights up the sort arrow on the header column.
  let mainTableSort = { key: 'created_at', direction: 'desc' };

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
    applyQueryPrefill();
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
  // so identity-driven UI (locked seller dropdown, per-user data filters)
  // shows the impersonated user, not admin id=555.
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
  function formatNumber(val, decimals = 2) {
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

  function getOrderSellerId(order) {
    if (!order || typeof order !== 'object') return '';
    const raw = order.seller_agency_member_id || order.seller_id || order.sellerId || '';
    return String(raw);
  }

  function resolveCanceledAt(order) {
    if (!order || typeof order !== 'object') return '';

    const candidates = [
      order.canceled_at,
      order.cancelled_at,
      order.canceled_date,
      order.cancelled_date,
      order.cancel_at,
      order.cancel_date,
      order.date_canceled,
      order.date_cancelled,
      order.cancelled_on,
      order.canceled_on
    ];

    for (const value of candidates) {
      if (value) return value;
    }

    const status = String(order.order_status || '').toLowerCase();
    if (status === 'canceled' || status === 'cancelled') {
      return order.updated_at || '';
    }

    return '';
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
      case 'canceled_at':
        return new Date(resolveCanceledAt(order) || 0).getTime();
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

  // Client-side summary aggregator — used when ts/crm sees the page so the
  // KPI cards and PDF totals reflect ONLY the user's own canceled orders,
  // not the role-wide rows the backend returned for ranking-context reasons
  // (see architecture-rbac-view-as Section 7 — same pattern as sales-report-by-seller).
  function computeSummary(orders) {
    return (orders || []).reduce(function (acc, o) {
      acc.total_orders += 1;
      acc.total_net_amount += parseFloat(o.net_amount || 0);
      acc.total_commission += parseFloat(o.supplier_commission || 0);
      acc.total_discount += parseFloat(o.discount || 0);
      return acc;
    }, { total_orders: 0, total_net_amount: 0, total_commission: 0, total_discount: 0 });
  }

  function applyQueryPrefill() {
    if (typeof window === 'undefined' || !window.location || !window.location.search) return;
    const params = new URLSearchParams(window.location.search);
    const periodMode = params.get('period_mode');
    if (periodMode === 'yearly' || periodMode === 'quarterly' || periodMode === 'monthly' || periodMode === 'custom') {
      canceledPeriodState = { mode: periodMode };
      const year = parseInt(params.get('period_year') || '', 10);
      const quarter = parseInt(params.get('period_quarter') || '', 10);
      const month = parseInt(params.get('period_month') || '', 10);
      if (Number.isFinite(year)) canceledPeriodState.year = year;
      if (Number.isFinite(quarter)) canceledPeriodState.quarter = quarter;
      if (Number.isFinite(month)) canceledPeriodState.month = month;
      if (periodMode === 'custom') {
        canceledPeriodState.customFrom = params.get('period_custom_from') || '';
        canceledPeriodState.customTo = params.get('period_custom_to') || '';
      }
    }

    const relation = params.get('created_relation');
    if (relation === 'all' || relation === 'before' || relation === 'same') {
      createdRelationState = relation;
    }

    const role = params.get('job_position');
    if (role === 'ts' || role === 'crm' || role === 'admin') {
      selectedJobPosition = role;
    }

    const sellerId = params.get('seller_id');
    if (sellerId) selectedSellerId = String(sellerId);
  }

  function labelOfJobPosition(pos) {
    if (pos === 'ts')    return 'เซลล์';
    if (pos === 'crm')   return 'CRM';
    if (pos === 'admin') return 'Admin';
    return 'ทั้งหมด';
  }

  // The "วันที่สร้าง Order" relation only makes sense when the canceled
  // period is a discrete bucket (รายปี / รายไตรมาส / รายเดือน). For
  // 'all' (no canceled-date filter) and 'custom' (free date range) it is
  // hidden — there is no meaningful boundary to compare created_at against.
  function updateCreatedRelationVisibility() {
    const host = document.getElementById('co-created-relation-host');
    if (!host) return;
    const field = host.closest('.crp-filter-field');
    if (!field) return;
    const mode = (canceledPeriodState && canceledPeriodState.mode) || '';
    const visible = mode === 'yearly' || mode === 'quarterly' || mode === 'monthly';
    field.style.display = visible ? '' : 'none';
  }

  // Render the "วันที่สร้าง Order" relation dropdown. Lets the user split
  // canceled orders into ones created BEFORE the canceled period (old orders
  // canceled now) vs ones created WITHIN the same period as the cancellation
  // (rapid same-period cancellations). Default "ทั้งหมด" applies no
  // created_at filter so the page degrades to all canceled orders in the
  // selected period.
  function renderCreatedRelationDropdown() {
    const options = [
      { value: 'all',    label: 'ทั้งหมด',              icon: getAllIcon(),      active: createdRelationState === 'all'    },
      { value: 'before', label: 'ก่อนช่วงที่ยกเลิก',     icon: getCalendarIcon(), active: createdRelationState === 'before' },
      { value: 'same',   label: 'ตรงกับช่วงที่ยกเลิก',   icon: getCalendarIcon(), active: createdRelationState === 'same'   },
    ];
    const active = options.find(o => o.active) || options[0];

    window.FilterSortDropdownComponent.initDropdown({
      containerId : 'co-created-relation-host',
      defaultLabel: active.label,
      defaultIcon : active.icon,
      options     : options,
      onChange    : function (val) { createdRelationState = val; }
    });
  }

  // Render the "เซลล์ผู้จอง" dropdown filtered by selectedJobPosition.
  // Each ตำแหน่ง option (ts / crm / admin) shows only sellers of that
  // role; admins see role-scoped lists, non-admins see a locked button
  // with their own nick name. Re-runs on every ตำแหน่ง change so the
  // seller list always matches the role pill above it.
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

    const role = (selectedJobPosition || '').toLowerCase();
    const filtered = role
      ? sellers.filter(s => String(s.job_position || '').toLowerCase() === role)
      : sellers;

    // Drop the previous selection if the new role list doesn't include it.
    if (selectedSellerId) {
      const stillThere = filtered.some(s => String(s.id) === String(selectedSellerId));
      if (!stillThere) selectedSellerId = '';
    }

    const sellerOptions = [
      { value: '', label: 'ทั้งหมด', icon: getAllIcon(), active: !selectedSellerId },
      ...filtered.map(s => ({
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

          <!-- แถว 1: วันที่ยกเลิก Order (mode + value, spans 2 cells) +
               วันที่สร้าง Order relation dropdown (1 cell). Total = 3 cells = full row. -->
          <div class="filter-row crp-filter-row">
            <div class="crp-filter-field">
              <span class="time-granularity-label crp-filter-label">วันที่ยกเลิก Order</span>
              <div class="crp-filter-control" id="co-canceled-mode-host"></div>
              <div class="crp-filter-control" id="co-canceled-value-host"></div>
            </div>
            <div class="crp-filter-field">
              <span class="time-granularity-label crp-filter-label">วันที่สร้าง Order</span>
              <div class="crp-filter-control" id="co-created-relation-host"></div>
            </div>
          </div>

          <!-- แถว 2: ตำแหน่ง + เซลล์ผู้จอง paired side-by-side, mirroring
               /sales-report's row-3 dropdown pair. เซลล์ดropdown is linked to
               ตำแหน่ง above. -->
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

          <!-- แถว 2: Action buttons — SharedFilterActions renders the
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
    const sellerId = getEffectiveUserId();
    const hasPrefilledPeriod = canceledPeriodState
      && (canceledPeriodState.mode === 'yearly'
        || canceledPeriodState.mode === 'quarterly'
        || canceledPeriodState.mode === 'monthly'
        || canceledPeriodState.mode === 'custom');
    if (!hasPrefilledPeriod) {
      const nowYear    = new Date().getFullYear();
      const nowMonth   = new Date().getMonth() + 1;
      const nowQuarter = Math.ceil(nowMonth / 3);
      canceledPeriodState = { mode: 'monthly', year: nowYear, quarter: nowQuarter, month: nowMonth };
    }

    window.SharedPeriodSelector.mount({
      modeContainerId : 'co-canceled-mode-host',
      valueContainerId: 'co-canceled-value-host',
      availablePeriods: availablePeriods,
      multiSelect     : false,
      modes           : ['yearly', 'quarterly', 'monthly', 'custom'],
      initialState    : canceledPeriodState,
      onChange        : function (s) {
        canceledPeriodState = s;
        updateCreatedRelationVisibility();
      }
    });

    renderCreatedRelationDropdown();
    updateCreatedRelationVisibility();

    // Non-admin users are locked to their own seller id; admins see the
    // linked ตำแหน่ง + searchable เซลล์ pair (same pattern as /sales-report).
    const jobPos = getEffectiveRole();
    selectedJobPosition = isAdmin() ? (selectedJobPosition || jobPos) : jobPos;
    selectedSellerId    = isAdmin() ? (selectedSellerId || '') : sellerId;

    // ---- ตำแหน่ง dropdown ----
    if (isAdmin()) {
      const jobPositionOptions = [
        { value: 'ts',    label: 'เซลล์', icon: getPersonIcon() },
        { value: 'crm',   label: 'CRM',   icon: getPersonIcon() },
        { value: 'admin', label: 'Admin', icon: getPersonIcon() },
      ].map(o => ({ ...o, active: o.value === selectedJobPosition }));

      window.FilterSortDropdownComponent.initDropdown({
        containerId : 'crp-dd-position',
        defaultLabel: labelOfJobPosition(selectedJobPosition),
        defaultIcon : getPersonIcon(),
        options     : jobPositionOptions,
        onChange    : function (val) {
          selectedJobPosition = val;
          renderSellerDropdown();
        }
      });
    } else {
      document.getElementById('crp-dd-position').innerHTML =
        `<button class="filter-sort-btn" disabled style="opacity:0.6;cursor:not-allowed;min-width:120px">
           <div class="filter-sort-btn-content">${getPersonIcon()}<span class="filter-sort-btn-text">${escHtml(labelOfJobPosition(jobPos))}</span></div>
         </button>`;
    }

    // ---- เซลล์ผู้จอง dropdown ---- linked to ตำแหน่ง above.
    renderSellerDropdown();

    // Action buttons — SharedFilterActions mounts ค้นหา + เริ่มใหม่. Reset
    // clears filter UI back to defaults; the user must press ค้นหา to
    // re-query so current results stay visible until they choose.
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

  // Reset: restore filter inputs to page defaults only. Does NOT refetch.
  function resetFiltersToDefault() {
    const sellerId = getEffectiveUserId();
    const jobPos   = getEffectiveRole();
    const nowYear    = new Date().getFullYear();
    const nowMonth   = new Date().getMonth() + 1;
    const nowQuarter = Math.ceil(nowMonth / 3);

    canceledPeriodState = { mode: 'monthly', year: nowYear, quarter: nowQuarter, month: nowMonth };
    selectedJobPosition = jobPos;
    selectedSellerId    = isAdmin() ? '' : sellerId;
    createdRelationState = 'all';

    window.SharedPeriodSelector.mount({
      modeContainerId : 'co-canceled-mode-host',
      valueContainerId: 'co-canceled-value-host',
      availablePeriods: availablePeriods,
      multiSelect     : false,
      modes           : ['yearly', 'quarterly', 'monthly', 'custom'],
      initialState    : canceledPeriodState,
      onChange        : function (s) {
        canceledPeriodState = s;
        updateCreatedRelationVisibility();
      }
    });

    renderCreatedRelationDropdown();
    updateCreatedRelationVisibility();

    if (isAdmin()) {
      window.FilterSortDropdownComponent.initDropdown({
        containerId : 'crp-dd-position',
        defaultLabel: labelOfJobPosition(jobPos),
        defaultIcon : getPersonIcon(),
        options     : [
          { value: 'ts',    label: 'เซลล์', icon: getPersonIcon(), active: jobPos === 'ts' },
          { value: 'crm',   label: 'CRM',   icon: getPersonIcon(), active: jobPos === 'crm' },
          { value: 'admin', label: 'Admin', icon: getPersonIcon(), active: jobPos === 'admin' },
        ],
        onChange    : function (val) {
          selectedJobPosition = val;
          renderSellerDropdown();
        }
      });
    }

    renderSellerDropdown();
  }

  // Icon helpers — same Lucide set used across all report pages
  function getAllIcon() {
    return `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 12h18M3 6h18M3 18h18"/></svg>`;
  }

  function getPersonIcon() {
    return `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`;
  }

  function getCalendarIcon() {
    return `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>`;
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
    const range = window.SharedPeriodSelector.toDateRange(canceledPeriodState, availablePeriods);
    const filters = {
      canceled_at_from: range.dateFrom || '',
      canceled_at_to:   range.dateTo   || '',
      seller_id:        isAdmin() ? selectedSellerId : getEffectiveUserId(),
      job_position:     isAdmin() ? (selectedJobPosition || 'admin') : getEffectiveRole(),
      // Hardcoded: this page is only about canceled orders.
      order_status:     'canceled',
    };

    // วันที่สร้าง Order relation — applies only when the canceled period
    // is a discrete bucket (รายปี / รายไตรมาส / รายเดือน). Hidden in the
    // UI for 'all' and 'custom' modes, so don't apply the filter there
    // either: 'all' has no boundary, and 'custom' is a free range that
    // doesn't map onto a "before vs same" comparison.
    // Relation state 'all' = no created_at filter regardless of mode.
    const mode = (canceledPeriodState && canceledPeriodState.mode) || '';
    const applyRelation = mode === 'yearly' || mode === 'quarterly' || mode === 'monthly';
    if (applyRelation && range.dateFrom && range.dateTo) {
      if (createdRelationState === 'before') {
        filters.created_at_to = addDays(range.dateFrom, -1);
      } else if (createdRelationState === 'same') {
        filters.created_at_from = range.dateFrom;
        filters.created_at_to   = range.dateTo;
      }
      // 'all' falls through with no created_at_* keys.
    }

    return filters;
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

    // For ts/crm the API returns role-wide rows. Scope to own seller for
    // KPI / table / exports (mirror sales-report-by-seller's pattern).
    const myId = getEffectiveUserId();
    const ownOrders = isAdmin()
      ? rawOrders
      : rawOrders.filter(o => getOrderSellerId(o) === myId);
    const ownSummary = isAdmin() ? (data.summary || {}) : computeSummary(ownOrders);
    currentOwnOrders = ownOrders;
    currentOwnSummary = ownSummary;

    results.innerHTML = renderSummary(ownSummary) + renderTableSection(ownOrders);

    // Sticky header: set col-row top = group-row height
    const groupRow = results.querySelector('.crp-table thead tr.group-row');
    if (groupRow) {
      const h = groupRow.offsetHeight;
      results.querySelectorAll('.crp-table thead tr.col-row th').forEach(th => {
        th.style.top = h + 'px';
      });
    }

    document.getElementById('crp-btn-export').addEventListener('click', () => exportCSV(ownOrders));
    document.getElementById('crp-btn-pdf').addEventListener('click', () => exportPDF(ownOrders, ownSummary));

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
            <div class="kpi-label">ยอดยกเลิกรวม</div>
            <div class="kpi-value">${formatNumber(summary.total_net_amount, 0)}</div>
            <div class="kpi-subtext">${formatNumber(summary.total_orders, 0)} Orders</div>
          </div>
        </div>
        ${adminCards}
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
          <td class="center">${formatDate(resolveCanceledAt(o))}</td>
          <td class="right group-start">${formatNumber(o.supplier_commission, 0)}</td>
          <td class="right ${netCom >= 0 ? 'crp-positive' : 'crp-negative'}">${formatNumber(netCom, 0)}</td>
          <td class="right group-start">${formatNumber(o.discount, 0)}</td>
        </tr>`;
    }).join('') || '<tr><td colspan="13" style="text-align:center;color:#9ca3af;padding:16px">ไม่พบข้อมูล</td></tr>';

    return `
      <div class="dashboard-table-header">
        ${window.SharedTableCount.render({ id: 'crp-table-count', count: visibleOrders.length })}
        <div class="dashboard-table-actions">
          <div id="crp-table-search-host"></div>
          ${window.SharedExportButton.render({ id: 'crp-btn-export' })}
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
              <th colspan="4" class="group-header">ยอดจอง</th>
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
              <th class="center" data-sort="canceled_at" data-type="date">วันที่ยกเลิก</th>
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

  // ---- Export CSV ----
  function exportCSV(orders) {
    const headers = ['เซลล์','รหัส Order','จองวันที่','ลูกค้า','ประเทศ','เดินทาง','ยอดจอง','ผู้เดินทาง','วันชำระงวด 1','วันที่ยกเลิก','คอมรวม','คอม (หักส่วนลด)','ส่วนลดรวม'];
    const rows = orders.map(o => {
      const netCom = parseFloat(o.supplier_commission || 0) - parseFloat(o.discount || 0);
      return [
        o.seller_nick_name || '', o.order_code || '', formatDate(o.created_at), o.customer_name || '',
        o.country_name_th || '', o.product_period_snapshot || '',
        parseFloat(o.net_amount || 0).toFixed(2), o.room_quantity || 0,
        formatDate(o.first_paid_at), formatDate(resolveCanceledAt(o)),
        parseFloat(o.supplier_commission || 0).toFixed(2),
        netCom.toFixed(2), parseFloat(o.discount || 0).toFixed(2),
      ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(',');
    });

    const csv = '\uFEFF' + [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'Canceled Orders Report.csv'; a.click();
    URL.revokeObjectURL(url);
  }

  function getSelectedSellerLabel() {
    if (!isAdmin()) return getEffectiveNickName() || '-';
    const seller = sellers.find(s => String(s.id) === String(selectedSellerId));
    if (!selectedSellerId) return 'ทั้งหมด';
    return seller ? (seller.nick_name || `${seller.first_name || ''} ${seller.last_name || ''}`.trim() || String(seller.id)) : 'ทั้งหมด';
  }

  function buildPrintFilters() {
    const filters = buildFilters();
    const mode = (canceledPeriodState && canceledPeriodState.mode) || '';
    const showRelation = mode === 'yearly' || mode === 'quarterly' || mode === 'monthly';
    const RELATION_LABEL = {
      all:    'ทั้งหมด',
      before: 'ก่อนช่วงที่ยกเลิก',
      same:   'ตรงกับช่วงที่ยกเลิก',
    };
    const createdRelationLabel = RELATION_LABEL[createdRelationState] || 'ทั้งหมด';
    const rows = [
      { label: 'วันที่ยกเลิก Order', value: [formatDate(filters.canceled_at_from), formatDate(filters.canceled_at_to)].join(' - ') }
    ];
    if (showRelation) {
      rows.push({ label: 'วันที่สร้าง Order', value: createdRelationLabel });
    }
    rows.push(
      { label: 'เซลล์ผู้จอง', value: getSelectedSellerLabel() },
      { label: 'สถานะ Order', value: 'ยกเลิก' }
    );
    return rows;
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
    <title>Canceled Orders Report</title>
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
          <h1 class="crp-print-title">Canceled Orders Report</h1>
          <p class="crp-print-subtitle">พิมพ์เมื่อ ${escHtml(new Date().toLocaleString('th-TH'))}</p>
        </div>
        <div class="crp-print-count">${escHtml(countText || '')}</div>
      </div>

      <div class="crp-print-summary">
        <div class="crp-print-card">
          <span class="crp-print-card-label">ยอดยกเลิกรวม</span>
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
    return `canceled-orders-report-${yyyy}${mm}${dd}.pdf`;
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

    const title = document.createElement('div');
    title.style.display = 'flex';
    title.style.justifyContent = 'space-between';
    title.style.alignItems = 'center';
    title.style.marginBottom = '10px';
    title.style.paddingBottom = '8px';
    title.style.borderBottom = '2px solid #335f8a';
    title.innerHTML = `
      <div>
        <div style="font-size:22px;font-weight:700;color:#0f172a;line-height:1.2;">Canceled Orders Report</div>
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
      <span>ยอดยกเลิกรวม: ${escHtml(formatNumber(currentOwnSummary?.total_net_amount || 0))} บาท</span>
      <span>คอมรวม: ${escHtml(formatNumber(currentOwnSummary?.total_commission || 0))} บาท</span>
      <span>ส่วนลด: ${escHtml(formatNumber(currentOwnSummary?.total_discount || 0))} บาท</span>
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
        <td colspan="5" style="text-align:center;color:#243b53;border-top:2px solid #9fb6cc;">รวม ${escHtml(countText || '')}</td>
        <td style="border-top:2px solid #9fb6cc;"></td>
        <td style="text-align:right;border-top:2px solid #9fb6cc;">${escHtml(formatNumber(currentOwnSummary?.total_net_amount || 0))}</td>
        <td style="border-top:2px solid #9fb6cc;"></td>
        <td style="border-top:2px solid #9fb6cc;"></td>
        <td style="border-top:2px solid #9fb6cc;"></td>
        <td style="text-align:right;border-top:2px solid #9fb6cc;">${escHtml(formatNumber(currentOwnSummary?.total_commission || 0))}</td>
        <td style="text-align:right;color:#16a34a;border-top:2px solid #9fb6cc;">${escHtml(formatNumber(netCommission || 0))}</td>
        <td style="text-align:right;border-top:2px solid #9fb6cc;">${escHtml(formatNumber(currentOwnSummary?.total_discount || 0))}</td>
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

    const footerRow = sourceRows[sourceRows.length - 1] && sourceRows[sourceRows.length - 1].querySelector('td[colspan="5"]')
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
