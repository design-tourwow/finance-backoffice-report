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
  let currentData = null;
  // Distinct repeat counts present in the current filter set — returned by
  // the API so the จำนวนซื้อซ้ำ dropdown only lists counts that actually
  // exist. Starts empty; populated after the first loadReport().
  let availableRepeats = [];

  let customerNameQuery    = '';
  let selectedRepeatBucket = 'all';
  let onlyPositiveCommission = true;
  // Selected seller agency_member_ids (multi-select). [] = no filter.
  // Sent to the backend as comma-separated CSV (`seller_id=12,34,56`)
  // which the API already parses into an `IN (?, ?, …)` predicate.
  let selectedSellerIds    = [];
  // Page-local role-pill state — controls which job_position is *visible*
  // in the dropdown menu (not the selection). 'all' shows TS + CRM.
  // The "เลือกทั้งหมด" row at the top of the visible list lets the user
  // bulk-toggle every currently-visible option in one click.
  let sellerRoleFilter     = 'all';
  // Cached options for the seller dropdown (loaded once on init from
  // /api/agency-members?roles=ts,crm). Each option carries job_position
  // so the role pills can filter visible options client-side.
  let sellerOptionsCache   = [];
  // "ซื้อซ้ำภายใน N" is the ONLY date filter on this page (the generic
  // ช่วงเวลา selector was removed). 'all' = no date constraint.
  let repeatWithin = 'all';

  let tableQuery = '';
  let tableSort  = { key: 'l1_orders', direction: 'desc' };

  document.addEventListener('DOMContentLoaded', function () { init(); });

  // ---- Init ----
  // shared-auth-guard.js has already validated the token before this file
  // runs, so we can proceed straight to rendering.
  async function init() {
    renderShell();
    await loadSellerOptions();   // populate cache before mounting the dropdown
    initFilters();
    await loadReport();
  }

  // Load TS + CRM agency members for the "เซลล์ผู้ขาย" filter. Server-side
  // filter via ?roles=ts,crm avoids over-fetching admins / inactive roles.
  // Each option label is "Nickname [TS]" / "Nickname [CRM]" so users see the
  // role at a glance.
  async function loadSellerOptions() {
    try {
      const rows = await window.SharedHttp.get('/api/agency-members', {
        params: { roles: 'ts,crm' }
      });
      const list = Array.isArray(rows) ? rows : [];
      sellerOptionsCache = list
        .filter(m => m && m.ID != null)
        .map(m => {
          const name = (m.nickname && String(m.nickname).trim())
                    || ((m.first_name || '') + ' ' + (m.last_name || '')).trim()
                    || ('#' + m.ID);
          // Keep job_position on the option so the page-local role pills
          // (ทั้งหมด / Telesales / CRM) can filter without re-fetching. The
          // [TS]/[CRM] suffix on the label is dropped — pills make the
          // role explicit without doubling up the visual cue.
          return {
            value       : String(m.ID),
            label       : name,
            job_position: String(m.job_position || '').toLowerCase(),
            active      : false
          };
        });
    } catch (e) {
      console.warn('[RCR] Failed to load sellers, dropdown will be empty:', e);
      sellerOptionsCache = [];
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

          <!-- แถว 1: ชื่อลูกค้า + เซลล์ผู้ขาย (TS / CRM) -->
          <div class="filter-row rcr-filter-row">
            <div class="rcr-filter-field">
              <span class="time-granularity-label rcr-filter-label">ชื่อลูกค้า</span>
              <div class="rcr-filter-control" id="rcr-customer-name-host"></div>
            </div>
            <div class="rcr-filter-field">
              <span class="time-granularity-label rcr-filter-label">เซลล์ผู้ขาย</span>
              <div class="rcr-filter-control" id="rcr-seller-host"></div>
            </div>
          </div>

          <!-- แถว 2: จำนวนซื้อซ้ำ + ซื้อซ้ำภายใน — repeat-bucket ใน cell แรก,
               ตามด้วย mode + value ของ ซื้อซ้ำภายใน เต็ม 3 col ของ grid -->
          <div class="filter-row rcr-filter-row">
            <div class="rcr-filter-field">
              <span class="time-granularity-label rcr-filter-label">จำนวนซื้อซ้ำ</span>
              <div class="rcr-filter-control" id="rcr-repeat-bucket-host"></div>
            </div>

            <div class="rcr-filter-field">
              <span class="time-granularity-label rcr-filter-label">ซื้อซ้ำภายใน</span>
              <div class="rcr-filter-control" id="rcr-repeat-within-mode-host"></div>
              <div class="rcr-filter-control" id="rcr-repeat-within-value-host"></div>
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

  // Mount the "เซลล์ผู้ขาย" dropdown using the central FilterSearchDropdown
  // in multi-select mode. The visible options are filtered by
  // `sellerRoleFilter` (page-local pill state); the user-selected ids
  // themselves live in `selectedSellerIds` and persist across pill changes.
  //
  // After mount we DOM-inject two helpers between the in-menu search box
  // and the option list:
  //   1. Role pills (ทั้งหมด · Telesales · CRM) — change visibility
  //   2. "เลือกทั้งหมด" row — bulk-toggles every currently-visible option
  // Both are page-local; the central component is untouched.
  //
  // `keepOpen` re-clicks the trigger after re-mount so a pill click
  // doesn't collapse the menu the user is reading.
  function mountSellerDropdown(activeIds, keepOpen) {
    const idSet = new Set((activeIds || []).map(String));
    const filtered = sellerOptionsCache.filter(o =>
      sellerRoleFilter === 'all' || o.job_position === sellerRoleFilter
    );
    const opts = filtered.map(o => Object.assign({}, o, {
      active: idSet.has(String(o.value))
    }));
    window.FilterSearchDropdown.init({
      containerId : 'rcr-seller-host',
      defaultLabel: 'ทั้งหมด',
      groupLabel  : 'เซลล์ผู้ขาย',
      options     : opts,
      multiSelect : true,
      placeholder : 'ค้นหาเซลล์...',
      onChange    : function (_csv, arr) {
        // Confirm fires with only the currently-visible role's selection.
        // Merge with selections from hidden roles so the user doesn't
        // lose cross-role picks when they confirm a role-filtered view.
        const confirmed = new Set((arr || []).map(String));
        const visibleIds = new Set(filtered.map(o => String(o.value)));
        const hiddenKept = selectedSellerIds.filter(id => !visibleIds.has(String(id)));
        selectedSellerIds = hiddenKept.concat(Array.from(confirmed));
        updateSellerTriggerLabel();
      }
    });
    injectRoleLinksIntoSellerMenu();
    injectSelectAllRow();
    updateSellerTriggerLabel();
    if (keepOpen) reopenSellerMenu();
  }

  // Override the multi-select trigger label so a pure-role selection reads
  // "Telesales (N)" / "CRM (N)" instead of the generic "เซลล์ผู้ขาย (N)".
  // The central component sets the generic label first; we patch it after
  // because the trigger DOM is stable across re-renders.
  function updateSellerTriggerLabel() {
    const host = document.getElementById('rcr-seller-host');
    if (!host) return;
    const textEl = host.querySelector('.filter-sort-btn-text');
    if (!textEl) return;
    const count = selectedSellerIds.length;
    if (count <= 1) return; // single / empty already render correctly

    const selSet = new Set(selectedSellerIds.map(String));
    const tsIds  = sellerOptionsCache.filter(o => o.job_position === 'ts').map(o => String(o.value));
    const crmIds = sellerOptionsCache.filter(o => o.job_position === 'crm').map(o => String(o.value));
    const matches = (ids) => ids.length === count && ids.every(id => selSet.has(id));

    if (matches(tsIds))       textEl.textContent = 'Telesales (' + count + ')';
    else if (matches(crmIds)) textEl.textContent = 'CRM (' + count + ')';
    // else: leave as-is (component already showed "เซลล์ผู้ขาย (N)")
  }

  // DOM-level patch: drop a `.rcr-role-links` row into the existing
  // FilterSearchDropdown menu, right after the search input wrap. This
  // keeps the central component untouched (no API change) — only this
  // page knows about the extra row.
  function injectRoleLinksIntoSellerMenu() {
    const host = document.getElementById('rcr-seller-host');
    if (!host) return;
    const menu = host.querySelector('.filter-search-dd-menu');
    const inputWrap = menu && menu.querySelector('.filter-search-dd-input-wrap');
    if (!menu || !inputWrap) return;

    const links = [
      { value: 'all', label: 'ทั้งหมด' },
      { value: 'ts',  label: 'Telesales' },
      { value: 'crm', label: 'CRM' }
    ];
    const html = '<div class="rcr-role-links">' +
      links.map((l, i) =>
        (i > 0 ? '<span class="rcr-role-link-sep">·</span>' : '') +
        '<button type="button" class="rcr-role-link' +
          (l.value === sellerRoleFilter ? ' rcr-role-link--active' : '') +
        '" data-role="' + l.value + '">' + escHtml(l.label) + '</button>'
      ).join('') +
    '</div>';

    inputWrap.insertAdjacentHTML('afterend', html);

    menu.querySelectorAll('.rcr-role-link').forEach(btn => {
      btn.addEventListener('click', function (e) {
        // Stop propagation so the dropdown's outside-click handler doesn't
        // misread this as a "clicked away from menu" event.
        e.preventDefault();
        e.stopPropagation();
        setSellerRole(btn.getAttribute('data-role'));
      });
    });
  }

  // Inject a checkbox-styled "เลือกทั้งหมด" row above the option list. Its
  // click toggles every visible option (via simulated clicks on the
  // component's own option buttons, so the component's internal `selected`
  // Set stays in sync). A MutationObserver on the list keeps the row's
  // checked state mirrored to the visible options as they change.
  let _selectAllObserver = null;
  function injectSelectAllRow() {
    if (_selectAllObserver) {
      _selectAllObserver.disconnect();
      _selectAllObserver = null;
    }

    const host = document.getElementById('rcr-seller-host');
    if (!host) return;
    const menu = host.querySelector('.filter-search-dd-menu');
    const list = menu && menu.querySelector('.filter-search-dd-list');
    if (!menu || !list) return;

    const html =
      '<button type="button" class="filter-search-dd-option rcr-select-all-row" data-rcr-select-all="1">' +
        '<span class="filter-search-dd-check rcr-select-all-check" aria-hidden="true"></span>' +
        '<span class="rcr-select-all-label">เลือกทั้งหมด</span>' +
      '</button>';
    list.insertAdjacentHTML('beforebegin', html);

    const row = menu.querySelector('.rcr-select-all-row');
    const checkSpan = row.querySelector('.rcr-select-all-check');

    function visibleOptions() {
      return Array.prototype.slice.call(list.querySelectorAll('.filter-search-dd-option'));
    }

    function updateCheck() {
      const opts = visibleOptions();
      if (!opts.length) {
        row.classList.remove('active');
        checkSpan.innerHTML = '';
        return;
      }
      const allActive = opts.every(o => o.classList.contains('active'));
      row.classList.toggle('active', allActive);
      checkSpan.innerHTML = allActive
        ? '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>'
        : '';
    }

    row.addEventListener('click', function (e) {
      e.preventDefault();
      e.stopPropagation();
      const opts = visibleOptions();
      if (!opts.length) return;
      const allActive = opts.every(o => o.classList.contains('active'));
      // Snapshot data-values needing a state change. We must re-query the
      // button each iteration because each click triggers a list re-render
      // inside the component (so the original DOM nodes are stale).
      const valuesToClick = opts
        .filter(o => allActive ? o.classList.contains('active') : !o.classList.contains('active'))
        .map(o => o.getAttribute('data-value'));
      valuesToClick.forEach(val => {
        const btn = list.querySelector(
          '.filter-search-dd-option[data-value="' + cssEscape(val) + '"]'
        );
        if (btn) btn.click();
      });
      updateCheck();
    });

    // Watch for option state changes (individual clicks, search filter)
    // so the row's checkbox stays in sync.
    _selectAllObserver = new MutationObserver(updateCheck);
    _selectAllObserver.observe(list, {
      childList: true,
      subtree  : true,
      attributes: true,
      attributeFilter: ['class']
    });
    updateCheck();
  }

  // Lightweight CSS.escape polyfill — escapes a value for use inside a
  // [data-value="..."] attribute selector. Modern browsers ship the real
  // CSS.escape; fall back to a regex for safety.
  function cssEscape(s) {
    if (window.CSS && typeof window.CSS.escape === 'function') return window.CSS.escape(s);
    return String(s).replace(/[^a-zA-Z0-9_-]/g, '\\$&');
  }

  function reopenSellerMenu() {
    const host = document.getElementById('rcr-seller-host');
    if (!host) return;
    // Defer one tick so the freshly-mounted DOM is ready for the click.
    setTimeout(function () {
      const trigger = host.querySelector('.filter-sort-btn');
      if (trigger) trigger.click();
    }, 0);
  }

  // Pill click → narrow visible options to that role. Selection across
  // hidden roles is preserved (mountSellerDropdown re-applies active flags
  // for IDs that fall in the visible set).
  function setSellerRole(role) {
    if (role !== 'all' && role !== 'ts' && role !== 'crm') role = 'all';
    if (sellerRoleFilter === role) return;
    sellerRoleFilter = role;
    mountSellerDropdown(selectedSellerIds, /* keepOpen */ true);
  }

  // ---- Init Filters ----
  function initFilters() {
    // 1) ชื่อลูกค้า — autocomplete input (SharedFilterSearchInput with fetchFn).
    // Suggestions appear after 3 characters; picking one fills the textbox
    // and sets the filter value. Typing without picking still filters by
    // the raw substring on search.
    mountCustomerNameInput(customerNameQuery);

    // 1b) เซลล์ผู้ขาย — searchable multi-select dropdown with in-menu
    // role pills (ทั้งหมด · Telesales · CRM). Pills bulk-select every
    // member of the chosen role so the user can pick "all TS" or "all
    // CRM" with a single click.
    mountSellerDropdown(selectedSellerIds);

    // 2) จำนวนซื้อซ้ำ — "ทั้งหมด" + exact counts 10, 9, ..., 1.
    // The backend honours repeat_bucket='N' as an exact HAVING l1_orders = N.
    window.FilterSortDropdownComponent.initDropdown({
      containerId : 'rcr-repeat-bucket-host',
      defaultLabel: 'ทั้งหมด',
      defaultIcon : getAllIcon(),
      options     : buildRepeatOptions(selectedRepeatBucket),
      onChange    : function (val) { selectedRepeatBucket = val; }
    });

    // 3) ซื้อซ้ำภายใน — page-local selector that looks like a period picker
    // but picks a rolling date window. Right side is a disabled display of
    // the computed range, hidden when mode === 'all'.
    mountRepeatWithin(repeatWithin);

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
    customerNameQuery    = '';
    selectedSellerIds    = [];
    sellerRoleFilter     = 'all';
    selectedRepeatBucket = 'all';
    onlyPositiveCommission = true;
    repeatWithin = 'all';

    // Re-init each filter widget with default state. Mount calls overwrite
    // the host innerHTML so the displayed value resets cleanly.
    mountCustomerNameInput('');
    mountSellerDropdown([]);

    window.FilterSortDropdownComponent.initDropdown({
      containerId : 'rcr-repeat-bucket-host',
      defaultLabel: 'ทั้งหมด',
      defaultIcon : getAllIcon(),
      options     : buildRepeatOptions('all'),
      onChange    : function (val) { selectedRepeatBucket = val; }
    });

    mountRepeatWithin('all');
  }

  // Re-mount the จำนวนซื้อซ้ำ dropdown with the current availableRepeats
  // list (called after every successful loadReport). Preserves the user's
  // current selection by passing it in as activeValue.
  function rebuildRepeatBucketDropdown() {
    window.FilterSortDropdownComponent.initDropdown({
      containerId : 'rcr-repeat-bucket-host',
      defaultLabel: selectedRepeatBucket === 'all' ? 'ทั้งหมด' : (selectedRepeatBucket + ' ครั้ง'),
      defaultIcon : selectedRepeatBucket === 'all' ? getAllIcon() : getRepeatIcon(),
      options     : buildRepeatOptions(selectedRepeatBucket),
      onChange    : function (val) { selectedRepeatBucket = val; }
    });
  }

  // ---- ซื้อซ้ำภายใน (page-local) ----
  // Mode dropdown options mapped to a rolling months-back window. The right
  // host is a disabled button whose label shows the resolved date range so
  // the user can eyeball exactly what will be queried.
  const REPEAT_WITHIN_OPTIONS = [
    { value: 'all', label: 'ทั้งหมด',             monthsBack: 0  },
    { value: '3m',  label: 'ซื้อซ้ำภายใน 3 เดือน',  monthsBack: 3  },
    { value: '6m',  label: 'ซื้อซ้ำภายใน 6 เดือน',  monthsBack: 6  },
    { value: '9m',  label: 'ซื้อซ้ำภายใน 9 เดือน',  monthsBack: 9  },
    { value: '1y',  label: 'ซื้อซ้ำภายใน 1 ปี',    monthsBack: 12 },
    { value: '2y',  label: 'ซื้อซ้ำภายใน 2 ปี',    monthsBack: 24 }
  ];

  function mountRepeatWithin(initialValue) {
    const active = initialValue || 'all';
    const opts = REPEAT_WITHIN_OPTIONS.map(function (o) {
      return {
        value : o.value,
        label : o.label,
        icon  : o.value === 'all' ? getAllIcon() : getCalendarIcon(),
        active: o.value === active
      };
    });
    window.FilterSortDropdownComponent.initDropdown({
      containerId : 'rcr-repeat-within-mode-host',
      defaultLabel: REPEAT_WITHIN_OPTIONS.find(function (o) { return o.value === active; }).label,
      defaultIcon : active === 'all' ? getAllIcon() : getCalendarIcon(),
      options     : opts,
      onChange    : function (val) {
        repeatWithin = val;
        renderRepeatWithinValue();
      }
    });
    renderRepeatWithinValue();
  }

  // Disabled-looking button that shows the resolved date range. Hidden when
  // mode === 'all'. Uses the same .filter-sort-btn chrome as the left side
  // so it reads as part of the same composite control.
  function renderRepeatWithinValue() {
    const host = document.getElementById('rcr-repeat-within-value-host');
    if (!host) return;
    const range = computeRepeatWithinRange(repeatWithin);
    if (!range) {
      host.innerHTML = '';
      host.style.display = 'none';
      return;
    }
    host.style.display = '';
    const label = formatDateCE(range.start) + ' - ' + formatDateCE(range.end);
    host.innerHTML =
      '<button type="button" class="filter-sort-btn rcr-disabled-display" disabled aria-disabled="true">' +
        '<div class="filter-sort-btn-content">' +
          getCalendarIcon() +
          '<span class="filter-sort-btn-text">' + escHtml(label) + '</span>' +
        '</div>' +
      '</button>';
  }

  // Compute [start, end] for "ซื้อซ้ำภายใน N เดือน/ปี":
  //   start = first day of (currentMonth - (monthsBack - 1))
  //   end   = today
  // A 3-month window on 2026-03-31 therefore resolves to 2026-01-01 – 2026-03-31.
  function computeRepeatWithinRange(mode) {
    const opt = REPEAT_WITHIN_OPTIONS.find(function (o) { return o.value === mode; });
    if (!opt || !opt.monthsBack) return null;
    const today = new Date();
    const start = new Date(today.getFullYear(), today.getMonth() - (opt.monthsBack - 1), 1);
    return { start: start, end: today };
  }

  function formatDateCE(d) {
    const day   = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    return day + '/' + month + '/' + d.getFullYear();
  }

  function toISO(d) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return y + '-' + m + '-' + dd;
  }

  // ---- Build Filters ----
  // Date range comes solely from the ซื้อซ้ำภายใน selector (the only date
  // filter on this page). 'all' emits no range and the backend treats
  // unspecified booking_date_* as "no filter".
  function buildFilters() {
    const repeatRange = computeRepeatWithinRange(repeatWithin);
    const filters = {};
    if (customerNameQuery)        filters.customer_name = customerNameQuery;
    if (selectedSellerIds.length) filters.seller_id     = selectedSellerIds.join(',');
    if (selectedRepeatBucket && selectedRepeatBucket !== 'all') {
      filters.repeat_bucket = selectedRepeatBucket;
    }
    if (repeatRange) {
      filters.booking_date_from = toISO(repeatRange.start);
      filters.booking_date_to   = toISO(repeatRange.end);
    }
    return filters;
  }

  // ---- Load Report ----
  async function loadReport() {
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
        availableRepeats = Array.isArray(res.data.available_repeats) ? res.data.available_repeats : [];
        rebuildRepeatBucketDropdown();
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
      renderSellerRanking(customers) +
      renderToolbar() +
      '<div id="rcr-table-host"></div>';

    renderTable();
    bindRankingSortHandlers(customers);

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
                <text x="12" y="18" text-anchor="middle" font-family="system-ui,-apple-system,sans-serif" font-size="18" font-weight="700" stroke="none" fill="currentColor">฿</text>
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

  // ---- Ranking Summary (Telesales / CRM) ----
  // Aggregates the current customer list by each customer's latest-order
  // handler (latest_seller_nick_name + latest_seller_job_position). One
  // customer contributes its L1 metrics to exactly one bucket — the bucket
  // is decided by the handler's job_position ('ts' → Telesales, 'crm' → CRM).
  // Customers whose latest handler has another role (or none) are skipped.
  //
  // Reuses commission-report-plus.css `.crp-summary-*` classes so the look
  // matches /sales-report without shipping duplicate CSS; the HTML attaches
  // crp-summary-table's data-group to drive click-to-sort via bindRankingSortHandlers.
  // Default ranking sort = total repeats desc. "Top seller" on this page is
  // the person whose customers repeated the most (ลูกค้าซื้อซ้ำเยอะที่สุด).
  let rankingSortState = {
    ts : { key: 'repeats', direction: 'desc' },
    crm: { key: 'repeats', direction: 'desc' }
  };

  function buildSellerAggregate(customers, jobPosition) {
    const map = new Map();
    customers.forEach(function (c) {
      if (!c || !c.latest_seller_nick_name) return;
      if ((c.latest_seller_job_position || '').toLowerCase() !== jobPosition) return;
      const name = c.latest_seller_nick_name;
      if (!map.has(name)) {
        map.set(name, {
          seller: name,
          customers: 0,   // unique repeat-customer count under this seller
          orders: 0,      // total L1 orders across this seller's customers
          repeats: 0,     // total repeat purchases (l1_orders - 1) summed
          net_amount: 0,
          discount: 0,
          net_commission: 0
        });
      }
      const agg = map.get(name);
      const l1 = c.l1 || {};
      const ord = parseInt(l1.orders, 10) || 0;
      // Backend HAVING l1_orders >= 2 guarantees every customer row here is
      // a repeat customer, so each iteration contributes one unique customer.
      agg.customers      += 1;
      agg.orders         += ord;
      agg.repeats        += Math.max(ord - 1, 0);
      agg.net_amount     += parseFloat(l1.net_amount) || 0;
      agg.discount       += parseFloat(l1.discount)   || 0;
      agg.net_commission += parseFloat(l1.net_commission) || 0;
    });
    return Array.from(map.values());
  }

  function sortSellerAggregate(rows, groupClass) {
    const state = rankingSortState[groupClass] || { key: 'net_commission', direction: 'desc' };
    return rows.slice().sort(function (a, b) {
      return compareSortValues(a[state.key], b[state.key], state.direction);
    });
  }

  // Trophy SVG comes from window.SharedTrophyRank (shared-trophy-rank.js).
  // Local pass-through keeps the existing call sites unchanged.
  function trophySvg(rank) {
    return window.SharedTrophyRank
      ? window.SharedTrophyRank.getTrophySvg(rank)
      : '';
  }

  function renderRankingGroup(title, groupClass, rows) {
    const sorted = sortSellerAggregate(rows, groupClass);
    const totalRepeats = sorted.reduce(function (s, r) { return s + r.repeats; }, 0);
    const body = sorted.map(function (r, i) {
      const rank = i + 1;
      const trophy = trophySvg(rank);
      return '<tr>' +
        '<td><div class="crp-summary-seller-cell">' +
          (rank <= 3 ? trophy : '<span class="crp-summary-rank">' + rank + '</span>') +
          '<span class="crp-seller-badge">' + escHtml(r.seller) + '</span>' +
        '</div></td>' +
        '<td class="right">' + formatNumber(r.customers, 0) + '</td>' +
        '<td class="right">' + formatNumber(r.orders, 0) + '</td>' +
        '<td class="right">' + formatNumber(r.repeats, 0) + '</td>' +
        '<td class="right">' + formatNumber(r.net_amount, 0) + '</td>' +
        '<td class="right">' + formatNumber(r.discount, 0) + '</td>' +
        '<td class="right ' + (r.net_commission >= 0 ? 'crp-positive' : 'crp-negative') + '">' +
          formatNumber(r.net_commission, 0) +
        '</td>' +
      '</tr>';
    }).join('');
    // Column 1 label matches the group (Telesales / CRM) so each table
    // clearly labels the "who" column with the role it contains.
    const sellerColLabel = groupClass === 'ts' ? 'Telesales' : 'CRM';
    return '<div class="crp-summary-group crp-summary-group--' + groupClass + '">' +
      '<div class="crp-summary-group-header">' +
        '<span class="crp-summary-group-title">' + escHtml(title) + '</span>' +
        '<span class="crp-summary-group-count">' + sorted.length + ' คน · ' + formatNumber(totalRepeats, 0) + ' ครั้งซื้อซ้ำ</span>' +
      '</div>' +
      // Wrap the 7-column table in its own horizontally-scrollable div —
      // the parent .crp-summary-group has overflow:hidden for the border-
      // radius, which would otherwise clip wide tables without letting the
      // user scroll to see all columns.
      '<div class="rcr-summary-table-scroll">' +
        '<table class="crp-summary-table" data-group="' + groupClass + '">' +
          '<thead><tr>' +
            '<th data-sort="seller" data-type="string">' + escHtml(sellerColLabel) + '</th>' +
            '<th class="right" data-sort="customers" data-type="number">ลูกค้า</th>' +
            '<th class="right" data-sort="orders" data-type="number">ออเดอร์</th>' +
            '<th class="right" data-sort="repeats" data-type="number">ซื้อซ้ำ</th>' +
            '<th class="right" data-sort="net_amount" data-type="number">ยอดจอง</th>' +
            '<th class="right" data-sort="discount" data-type="number">ส่วนลด</th>' +
            '<th class="right" data-sort="net_commission" data-type="number">คอมสุทธิ</th>' +
          '</tr></thead>' +
          '<tbody>' + (body || '<tr><td colspan="7" style="text-align:center;color:#9ca3af;padding:16px">ไม่มีข้อมูล</td></tr>') + '</tbody>' +
        '</table>' +
      '</div>' +
    '</div>';
  }

  function renderSellerRanking(customers) {
    const tsRows  = buildSellerAggregate(customers, 'ts');
    const crmRows = buildSellerAggregate(customers, 'crm');
    if (!tsRows.length && !crmRows.length) return '';
    return '<div class="crp-seller-summary">' +
      '<div class="crp-summary-title">สรุป · Telesales / CRM ที่ลูกค้าซื้อซ้ำเยอะที่สุด</div>' +
      '<div class="crp-summary-groups">' +
        renderRankingGroup('Telesales', 'ts',  tsRows) +
        renderRankingGroup('CRM',       'crm', crmRows) +
      '</div>' +
    '</div>';
  }

  // Click-to-sort on ranking tables. Uses SharedSortableHeader if available
  // (applies the same sort-icon + aria-sort chrome as other report tables).
  // Also wires a scroll listener on each summary-scroll wrapper that toggles
  // .rcr-hint-hidden so the right-edge fade disappears at the end of scroll.
  function bindRankingSortHandlers(customers) {
    if (window.SharedSortableHeader) {
      document.querySelectorAll('.crp-summary-table').forEach(function (table) {
        const group = table.getAttribute('data-group');
        const state = rankingSortState[group] || { key: 'net_commission', direction: 'desc' };
        window.SharedSortableHeader.bindTable(table, {
          headerSelector  : 'thead th[data-sort]',
          sortKey         : state.key,
          sortDir         : state.direction,
          defaultDirection: 'desc',
          sortInDom       : false,
          onSort: function (s) {
            rankingSortState[group] = { key: s.key, direction: s.direction };
            renderResults(currentData);
            return false;
          }
        });
      });
    }
    document.querySelectorAll('.rcr-summary-table-scroll').forEach(function (el) {
      function update() {
        const atEnd = el.scrollLeft + el.clientWidth >= el.scrollWidth - 2;
        const noScroll = el.scrollWidth <= el.clientWidth;
        el.classList.toggle('rcr-hint-hidden', atEnd || noScroll);
      }
      el.addEventListener('scroll', update);
      window.addEventListener('resize', update);
      setTimeout(update, 0);
    });
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
    const totalOrders = parseInt(l1.orders, 10) || 0;
    const handler     = c.latest_seller_nick_name || '';
    const role        = (c.latest_seller_job_position || '').toLowerCase();
    return {
      _raw: c,
      // Split the handler into two role-scoped fields so each column sorts
      // cleanly and an empty string rendered in the other column.
      seller_telesales: role === 'ts'  ? handler : '',
      seller_crm:       role === 'crm' ? handler : '',
      customer_code:  c.customer_code || '-',
      customer_name:  c.customer_name || '-',
      phone_number:   c.phone_number  || '-',
      l1_orders:                totalOrders,
      // "ซื้อซ้ำ" excludes the first purchase; never goes below 0.
      l1_repeats:               Math.max(totalOrders - 1, 0),
      // Windowed repeats: orders within last N months minus 1 if (and only
      // if) the customer's very first paid order falls inside that window.
      // Backend supplies orders_Nm + first_order_at; computeRepeatsInWindow
      // does the per-row arithmetic so the table can sort/format like any
      // other numeric column.
      l1_repeats_3m:            computeRepeatsInWindow(c, 'orders_3m',  3),
      l1_repeats_12m:           computeRepeatsInWindow(c, 'orders_12m', 12),
      l1_repeats_24m:           computeRepeatsInWindow(c, 'orders_24m', 24),
      l1_travelers:             l1.travelers,
      l1_net_amount:            l1.net_amount,
      l1_discount:              l1.discount,
      l1_supplier_commission:   l1.supplier_commission,
      l1_net_commission:        l1.net_commission
    };
  }

  // Compute "ซื้อซ้ำใน N เดือน" for a single customer:
  //   orders_in_window − (1 if customer's first-ever paid order falls in window else 0)
  // Bounded at 0. Uses Asia/Bangkok dates (the backend already converts
  // first_order_at to that zone) so the cutoff matches what the backend
  // counted with.
  function computeRepeatsInWindow(customer, ordersField, monthsBack) {
    const orders = parseInt((customer.l1 && customer.l1[ordersField]) || 0, 10) || 0;
    if (orders <= 0) return 0;
    const firstOrderAt = customer.first_order_at;
    if (!firstOrderAt) return Math.max(orders - 1, 0);
    const cutoff = new Date();
    cutoff.setMonth(cutoff.getMonth() - monthsBack);
    const firstDate = new Date(firstOrderAt);
    if (Number.isNaN(firstDate.getTime())) return Math.max(orders - 1, 0);
    return firstDate >= cutoff ? Math.max(orders - 1, 0) : orders;
  }

  // "นับเฉพาะ Order ที่ค่าคอมมากกว่า 0" checkbox filters rows whose
  // "คอมรวม" (l1.supplier_commission) is > 0 — matching the column label
  // the user sees in the table.
  function hasPositiveCommission(customer) {
    const commission = parseFloat((customer && customer.l1 && customer.l1.supplier_commission) || 0);
    return commission > 0;
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
  // Two role-scoped columns — whichever role matches the customer's latest
  // order handler shows the name inside .crp-seller-badge; the other is
  // rendered empty. Empty strings sort to the bottom in asc / top in desc.
  function sellerBadgeFormat(v) {
    if (!v) return '';
    return '<span class="crp-seller-badge">' + escHtml(v) + '</span>';
  }

  const TABLE_COLUMNS = [
    { key: 'seller_telesales', label: 'Telesales', format: sellerBadgeFormat },
    { key: 'seller_crm',       label: 'CRM',       format: sellerBadgeFormat },
    { key: 'customer_code',    label: 'รหัสลูกค้า' },
    { key: 'customer_name',  label: 'ชื่อลูกค้า' },
    { key: 'phone_number',   label: 'เบอร์โทรศัพท์', sortable: false },

    { key: 'l1_orders',              label: 'Order ทั้งหมด',     align: 'right', format: numberFormatter, className: 'rcr-divider' },
    { key: 'l1_repeats',             label: 'ซื้อซ้ำรวม',        align: 'right', format: numberFormatter },
    { key: 'l1_repeats_3m',          label: 'ซื้อซ้ำใน 3 เดือน',  align: 'right', format: numberFormatter },
    { key: 'l1_repeats_12m',         label: 'ซื้อซ้ำใน 12 เดือน', align: 'right', format: numberFormatter },
    { key: 'l1_repeats_24m',         label: 'ซื้อซ้ำใน 24 เดือน', align: 'right', format: numberFormatter },
    { key: 'l1_travelers',           label: 'ผู้เดินทาง',        align: 'right', format: numberFormatter },
    { key: 'l1_net_amount',          label: 'ยอดจอง',            align: 'right', format: numberFormatter },
    { key: 'l1_supplier_commission', label: 'คอมรวม',            align: 'right', format: numberFormatter },
    { key: 'l1_net_commission',      label: 'คอม (หักส่วนลด)',   align: 'right', format: commissionFormatter },
    { key: 'l1_discount',            label: 'ส่วนลดรวม',          align: 'right', format: numberFormatter }
  ];

  function renderTable() {
    const host = document.getElementById('rcr-table-host');
    if (!host || !currentData) return;
    const rows = getVisibleRows(currentData.customers || []);
    window.SharedTable.render({
      containerEl: host,
      columns    : TABLE_COLUMNS,
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
        title: 'Export ข้อมูลเป็น CSV'
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
      'Telesales', 'CRM', 'รหัสลูกค้า', 'ชื่อลูกค้า', 'เบอร์โทรศัพท์',
      'Order ทั้งหมด', 'ซื้อซ้ำรวม', 'ซื้อซ้ำใน 3 เดือน', 'ซื้อซ้ำใน 12 เดือน', 'ซื้อซ้ำใน 24 เดือน',
      'ผู้เดินทาง', 'ยอดจอง', 'คอมรวม', 'คอม (หักส่วนลด)', 'ส่วนลดรวม'
    ];
    const rows = getVisibleCustomers(customers).map(c => {
      const total = parseInt((c.l1 && c.l1.orders) || 0, 10) || 0;
      const role  = (c.latest_seller_job_position || '').toLowerCase();
      const name  = c.latest_seller_nick_name || '';
      return [
        role === 'ts'  ? name : '',
        role === 'crm' ? name : '',
        c.customer_code || '', c.customer_name || '', c.phone_number || '',
        total, Math.max(total - 1, 0),
        computeRepeatsInWindow(c, 'orders_3m',  3),
        computeRepeatsInWindow(c, 'orders_12m', 12),
        computeRepeatsInWindow(c, 'orders_24m', 24),
        c.l1.travelers, c.l1.net_amount, c.l1.supplier_commission, c.l1.net_commission, c.l1.discount
      ];
    });
    const stamp = new Date().toISOString().slice(0, 10);
    window.SharedCSV.export({
      filename: `repeated-customer-report-${stamp}.csv`,
      headers : headers,
      rows    : rows
    });
  }

  // "ทั้งหมด" + exact repeat counts sourced from the API response (descending).
  // Backend returns available_repeats = distinct (l1_orders - 1) values found
  // in the current filter set, so the dropdown only offers counts that will
  // actually yield results. Falls back to an empty list (only "ทั้งหมด") on
  // the very first render before the API has replied.
  function buildRepeatOptions(activeValue) {
    const options = [{
      value : 'all',
      label : 'ทั้งหมด',
      icon  : getAllIcon(),
      active: activeValue === 'all'
    }];
    const repeats = Array.isArray(availableRepeats) ? availableRepeats.slice() : [];
    repeats.sort(function (a, b) { return b - a; });
    // Ensure the user's current selection is present even if it's not in the
    // latest available list (keeps the displayed selection consistent).
    if (activeValue && activeValue !== 'all' && /^\d+$/.test(activeValue)) {
      const n = parseInt(activeValue, 10);
      if (!repeats.includes(n)) repeats.unshift(n);
      repeats.sort(function (a, b) { return b - a; });
    }
    repeats.forEach(function (n) {
      options.push({
        value : String(n),
        label : n + ' ครั้ง',
        icon  : getRepeatIcon(),
        active: activeValue === String(n)
      });
    });
    return options;
  }

  // ---- Icons ----
  function getAllIcon() {
    return `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 12h18M3 6h18M3 18h18"/></svg>`;
  }
  function getRepeatIcon() {
    return `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg>`;
  }
  function getCalendarIcon() {
    return `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>`;
  }
})();
