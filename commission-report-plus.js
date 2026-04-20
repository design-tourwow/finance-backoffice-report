// Commission Report Plus - Main JavaScript
(function () {
  'use strict';

  // ---- State ----
  let currentUser = null;
  let currentData = null;
  let sellers = [];

  // Date picker instances
  let createdDatePickerInstance = null;
  let paidDatePickerInstance = null;

  // Selected values from FilterSortDropdown instances
  let selectedJobPosition = 'admin';
  let selectedSellerId = '';
  let selectedOrderStatus = 'not_canceled';

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
        <div class="time-granularity-control crp-filter-wrap">

          <!-- แถว 1: Date Filters + Ez Search -->
          <div class="crp-filter-row">
            <div class="crp-date-half">
              <span class="time-granularity-label">วันที่สร้าง Order</span>
              <div class="date-picker-wrapper" id="crp-created-picker">
                <div class="date-icon" aria-hidden="true">
                  <svg width="24" height="24" fill="none" viewBox="0 0 24 24"><path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 10h16m-8-3V4M7 7V4m10 3V4M5 20h14a1 1 0 0 0 1-1V7a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1Zm3-7h.01v.01H8V13Zm4 0h.01v.01H12V13Zm4 0h.01v.01H16V13Zm-8 4h.01v.01H8V17Zm4 0h.01v.01H12V17Zm4 0h.01v.01H16V17Z"/></svg>
                </div>
                <input id="crp-created-input" type="text" class="date-input" placeholder="เลือกช่วงเวลา" readonly aria-label="เลือกช่วงวันที่สร้าง Order" />
                <div id="crp-created-dropdown" class="calendar-dropdown" style="display:none;" role="dialog"></div>
              </div>
            </div>

            <div class="crp-date-half">
              <span class="time-granularity-label">วันชำระงวด 1</span>
              <div class="date-picker-wrapper" id="crp-paid-picker">
                <div class="date-icon" aria-hidden="true">
                  <svg width="24" height="24" fill="none" viewBox="0 0 24 24"><path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 10h16m-8-3V4M7 7V4m10 3V4M5 20h14a1 1 0 0 0 1-1V7a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1Zm3-7h.01v.01H8V13Zm4 0h.01v.01H12V13Zm4 0h.01v.01H16V13Zm-8 4h.01v.01H8V17Zm4 0h.01v.01H12V17Zm4 0h.01v.01H16V17Z"/></svg>
                </div>
                <input id="crp-paid-input" type="text" class="date-input" placeholder="เลือกช่วงเวลา" readonly aria-label="เลือกช่วงวันชำระงวด 1" />
                <div id="crp-paid-dropdown" class="calendar-dropdown" style="display:none;" role="dialog"></div>
              </div>
            </div>

            <div class="crp-ez-search">
              <span class="time-granularity-label">ค้นหาเร็ว</span>
              <div class="crp-ez-btns">
                <button class="crp-ez-btn crp-ez-active" id="crp-ez-current">เดือนนี้</button>
                <button class="crp-ez-btn" id="crp-ez-last">เดือนที่แล้ว</button>
              </div>
            </div>
          </div>

          <div class="crp-row-divider"></div>

          <!-- แถว 2: Dropdowns + Search -->
          <div class="crp-filter-row">
            <span class="time-granularity-label">ตำแหน่ง</span>
            <div id="crp-dd-position"></div>

            <div class="filter-separator"></div>

            <span class="time-granularity-label">เซลล์ผู้จอง</span>
            <div id="crp-dd-seller"></div>

            <div class="filter-separator"></div>

            <span class="time-granularity-label">สถานะ Order</span>
            <div id="crp-dd-status"></div>

            <button class="crp-btn-search" id="crp-btn-search">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
              ค้นหา
            </button>
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
    const from = firstDayOfMonth();
    const to   = today();

    // Init date pickers with current-month defaults
    createdDatePickerInstance = DatePickerComponent.initDateRangePicker({
      inputId: 'crp-created-input',
      dropdownId: 'crp-created-dropdown',
      wrapperId: 'crp-created-picker',
      onChange: function (start, end) {}
    });
    createdDatePickerInstance.setDates(DatePickerComponent.parseAPIDate(from), DatePickerComponent.parseAPIDate(to));

    paidDatePickerInstance = DatePickerComponent.initDateRangePicker({
      inputId: 'crp-paid-input',
      dropdownId: 'crp-paid-dropdown',
      wrapperId: 'crp-paid-picker',
      onChange: function (start, end) {}
    });
    const paidTo = addDays(lastDayOfCurrentMonth(), 3);
    paidDatePickerInstance.setDates(DatePickerComponent.parseAPIDate(from), DatePickerComponent.parseAPIDate(paidTo));

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

      initSearchableSellerDropdown({
        containerId: 'crp-dd-seller',
        defaultLabel: 'ทั้งหมด',
        defaultIcon: getAllIcon(),
        options: sellerOptions,
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

    // Ez Search buttons
    initEzSearch();

    // Search button
    document.getElementById('crp-btn-search').addEventListener('click', loadReport);
  }

  function initEzSearch() {
    const btnCurrent = document.getElementById('crp-ez-current');
    const btnLast    = document.getElementById('crp-ez-last');

    function setActive(active) {
      btnCurrent.classList.toggle('crp-ez-active', active === 'current');
      btnLast.classList.toggle('crp-ez-active', active === 'last');
    }

    btnCurrent.addEventListener('click', function () {
      setActive('current');
      const from   = firstDayOfMonth();
      const to     = today();
      const paidTo = addDays(lastDayOfCurrentMonth(), 3);
      createdDatePickerInstance.setDates(DatePickerComponent.parseAPIDate(from), DatePickerComponent.parseAPIDate(to));
      paidDatePickerInstance.setDates(DatePickerComponent.parseAPIDate(from), DatePickerComponent.parseAPIDate(paidTo));
    });

    btnLast.addEventListener('click', function () {
      setActive('last');
      const from   = firstDayOfLastMonth();
      const to     = lastDayOfLastMonth();
      const paidTo = addDays(to, 3);
      createdDatePickerInstance.setDates(DatePickerComponent.parseAPIDate(from), DatePickerComponent.parseAPIDate(to));
      paidDatePickerInstance.setDates(DatePickerComponent.parseAPIDate(from), DatePickerComponent.parseAPIDate(paidTo));
    });
  }

  function labelOfJobPosition(pos) {
    return { ts: 'เซลล์', crm: 'CRM', admin: 'Admin' }[pos] || pos;
  }

  // ---- Searchable Seller Dropdown ----
  function initSearchableSellerDropdown({ containerId, defaultLabel, defaultIcon, options, onChange }) {
    const container = document.getElementById(containerId);
    if (!container) return null;

    const btnId    = `${containerId}Btn`;
    const menuId   = `${containerId}Menu`;
    const inputId  = `${containerId}Search`;
    const listId   = `${containerId}List`;

    container.innerHTML = `
      <div class="crp-search-dd">
        <button type="button" class="filter-sort-btn" id="${btnId}">
          <div class="filter-sort-btn-content">
            ${defaultIcon}
            <span class="filter-sort-btn-text">${defaultLabel}</span>
          </div>
          <svg class="filter-sort-arrow" width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M2 4L6 8L10 4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </button>
        <div class="crp-search-dd-menu" id="${menuId}">
          <div class="crp-search-dd-input-wrap">
            <input type="text" class="crp-search-dd-input" id="${inputId}" placeholder="ค้นหาเซลล์..." autocomplete="off" />
          </div>
          <div class="crp-search-dd-list" id="${listId}"></div>
        </div>
      </div>
    `;

    const btn        = document.getElementById(btnId);
    const menu       = document.getElementById(menuId);
    const searchInput = document.getElementById(inputId);
    const listEl     = document.getElementById(listId);
    const btnContent = btn.querySelector('.filter-sort-btn-content');
    let currentValue = (options.find(o => o.active) || {}).value || '';

    function renderList(query) {
      const q = (query || '').toLowerCase();
      const filtered = q ? options.filter(o => o.label.toLowerCase().includes(q)) : options;

      if (!filtered.length) {
        listEl.innerHTML = `<div class="crp-search-dd-empty">ไม่พบข้อมูล</div>`;
        return;
      }

      listEl.innerHTML = filtered.map(o => `
        <button type="button" class="crp-search-dd-option ${o.value === currentValue ? 'active' : ''}"
          data-value="${escHtml(o.value)}" data-label="${escHtml(o.label)}">
          ${o.icon || ''}
          <span>${escHtml(o.label)}</span>
        </button>
      `).join('');

      listEl.querySelectorAll('.crp-search-dd-option').forEach(opt => {
        opt.addEventListener('click', function (e) {
          e.stopPropagation();
          const val   = this.getAttribute('data-value');
          const label = this.getAttribute('data-label');
          const icon  = (options.find(o => o.value === val) || {}).icon || '';

          currentValue = val;
          btnContent.innerHTML = `${icon}<span class="filter-sort-btn-text">${label}</span>`;
          menu.classList.remove('open');
          btn.classList.remove('open');
          searchInput.value = '';
          renderList('');
          if (onChange) onChange(val, label);
        });
      });
    }

    renderList('');

    btn.addEventListener('click', function (e) {
      e.stopPropagation();
      const isOpen = menu.classList.contains('open');
      // Close other dropdowns
      document.querySelectorAll('.filter-sort-menu.open, .crp-search-dd-menu.open').forEach(m => {
        if (m !== menu) m.classList.remove('open');
      });
      document.querySelectorAll('.filter-sort-btn.open').forEach(b => {
        if (b !== btn) b.classList.remove('open');
      });
      menu.classList.toggle('open', !isOpen);
      btn.classList.toggle('open', !isOpen);
      if (!isOpen) setTimeout(() => searchInput.focus(), 30);
    });

    searchInput.addEventListener('input', function (e) { e.stopPropagation(); renderList(this.value); });
    searchInput.addEventListener('click', function (e) { e.stopPropagation(); });

    document.addEventListener('click', function (e) {
      if (!container.contains(e.target)) {
        menu.classList.remove('open');
        btn.classList.remove('open');
      }
    });

    return { setValue: function (val) {
      const opt = options.find(o => o.value === val);
      if (opt) { currentValue = val; btnContent.innerHTML = `${opt.icon||''}<span class="filter-sort-btn-text">${opt.label}</span>`; renderList(''); }
    }};
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
    const createdStart = createdDatePickerInstance ? createdDatePickerInstance.getStartDate() : null;
    const createdEnd   = createdDatePickerInstance ? createdDatePickerInstance.getEndDate()   : null;
    const paidStart    = paidDatePickerInstance    ? paidDatePickerInstance.getStartDate()    : null;
    const paidEnd      = paidDatePickerInstance    ? paidDatePickerInstance.getEndDate()      : null;
    return {
      created_at_from: DatePickerComponent.formatDateToAPI(createdStart) || '',
      created_at_to:   DatePickerComponent.formatDateToAPI(createdEnd)   || '',
      paid_at_from:    DatePickerComponent.formatDateToAPI(paidStart)    || '',
      paid_at_to:      DatePickerComponent.formatDateToAPI(paidEnd)      || '',
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
    const { orders = [], summary = {} } = data;
    if (!orders.length) { showEmpty(); return; }

    results.innerHTML = renderSummary(summary) + renderTableSection(orders);

    // Sticky header: set col-row top = group-row height
    const groupRow = results.querySelector('.crp-table thead tr.group-row');
    if (groupRow) {
      const h = groupRow.offsetHeight;
      results.querySelectorAll('.crp-table thead tr.col-row th').forEach(th => {
        th.style.top = h + 'px';
      });
    }

    document.getElementById('crp-btn-export').addEventListener('click', () => exportCSV(orders));
    document.getElementById('crp-btn-pdf').addEventListener('click', () => exportPDF(orders, summary));

    // Auto-fit table font to viewport
    const tableScroll = document.querySelector('.crp-table-scroll');
    const crpTable = document.querySelector('.crp-table');

    function fitTableToViewport() {
      if (!tableScroll || !crpTable || tableScroll.classList.contains('crp-zoom-mode')) return;
      crpTable.style.fontSize = '';
      const containerW = tableScroll.clientWidth;
      const tableW = crpTable.scrollWidth;
      if (tableW > containerW) {
        const newSize = Math.max(12 * (containerW / tableW), 8);
        crpTable.style.fontSize = newSize + 'px';
      }
    }

    fitTableToViewport();

    if (window._crpResizeObserver) window._crpResizeObserver.disconnect();
    window._crpResizeObserver = new ResizeObserver(fitTableToViewport);
    window._crpResizeObserver.observe(tableScroll);

    // Zoom toggle
    document.getElementById('crp-btn-zoom').addEventListener('click', function () {
      const isZoom = tableScroll.classList.toggle('crp-zoom-mode');
      this.classList.toggle('crp-zoom-active', isZoom);
      if (isZoom) {
        crpTable.style.fontSize = '';
        this.innerHTML = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="8" y1="11" x2="14" y2="11"/></svg> ย่อ`;
      } else {
        fitTableToViewport();
        this.innerHTML = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/></svg> ขยาย`;
      }
    });

    // Table search
    document.getElementById('crp-table-search').addEventListener('input', function () {
      const q = this.value.toLowerCase().trim();
      const filtered = q
        ? orders.filter(o =>
            (o.order_code || '').toLowerCase().includes(q) ||
            (o.customer_name || '').toLowerCase().includes(q)
          )
        : orders;
      document.getElementById('crp-table-count').textContent = `แสดง ${formatNumber(filtered.length, 0)} รายการ`;
      document.querySelector('.crp-table tbody').innerHTML = filtered.map(o => {
        const netCom = parseFloat(o.supplier_commission || 0) - parseFloat(o.discount || 0);
        return `
          <tr>
            <td><span class="crp-order-code">${escHtml(o.order_code || '-')}</span></td>
            <td>${formatDate(o.created_at)}</td>
            <td>${escHtml(o.customer_name || '-')}</td>
            <td><span class="crp-period-text" title="${escHtml(o.product_period_snapshot || '')}">${escHtml(o.product_period_snapshot || '-')}</span></td>
            <td class="group-start"><span class="crp-seller-badge">${escHtml(o.seller_nick_name || '-')}</span></td>
            <td class="right group-start">฿${formatNumber(o.net_amount)}</td>
            <td class="center">${o.room_quantity || 0}</td>
            <td class="center">${formatDate(o.first_paid_at)}</td>
            <td class="right group-start">฿${formatNumber(o.supplier_commission)}</td>
            <td class="right ${netCom >= 0 ? 'crp-positive' : 'crp-negative'}">฿${formatNumber(netCom)}</td>
            <td class="right group-start">฿${formatNumber(o.discount)}</td>
          </tr>`;
      }).join('') || `<tr><td colspan="11"><div class="dashboard-table-empty"><img src="/assets/images/empty-state.svg" alt="ไม่พบข้อมูล" width="200" height="200" style="margin-bottom:16px;opacity:0.8;"/><h3 style="margin:0 0 8px 0;font-size:18px;color:#374151;">ไม่พบข้อมูล</h3><p style="margin:0;font-size:15px;color:#6b7280;">ลองปรับเงื่อนไขการค้นหาใหม่</p></div></td></tr>`;
    });
  }

  // ---- Summary Cards ----
  function renderSummary(summary) {
    const netCommission = parseFloat(summary.total_commission || 0) - parseFloat(summary.total_discount || 0);
    const netColor = netCommission >= 0 ? '#388e3c' : '#dc2626';
    const adminCards = isAdmin() ? `
        <div class="dashboard-kpi-card kpi-top-country">
          <div class="kpi-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>
          </div>
          <div class="kpi-content">
            <div class="kpi-label">คอมรวม</div>
            <div class="kpi-value">฿${formatNumber(summary.total_commission)}</div>
          </div>
        </div>
        <div class="dashboard-kpi-card kpi-growth">
          <div class="kpi-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>
          </div>
          <div class="kpi-content">
            <div class="kpi-label">คอม (หักส่วนลด)</div>
            <div class="kpi-value" style="color:${netColor}">฿${formatNumber(netCommission)}</div>
          </div>
        </div>
        <div class="dashboard-kpi-card kpi-active">
          <div class="kpi-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="19" y1="5" x2="5" y2="19"/><circle cx="6.5" cy="6.5" r="2.5"/><circle cx="17.5" cy="17.5" r="2.5"/></svg>
          </div>
          <div class="kpi-content">
            <div class="kpi-label">ส่วนลดรวม</div>
            <div class="kpi-value">฿${formatNumber(summary.total_discount)}</div>
          </div>
        </div>` : '';
    return `
      <div class="dashboard-kpi-cards">
        <div class="dashboard-kpi-card kpi-travelers">
          <div class="kpi-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
          </div>
          <div class="kpi-content">
            <div class="kpi-label">ยอดจองรวม</div>
            <div class="kpi-value">฿${formatNumber(summary.total_net_amount)}</div>
            <div class="kpi-subtext">${formatNumber(summary.total_orders, 0)} Orders</div>
          </div>
        </div>
        ${adminCards}
      </div>`;
  }

  // ---- Table ----
  function renderTableSection(orders) {
    const rows = orders.map(o => {
      const netCom = parseFloat(o.supplier_commission || 0) - parseFloat(o.discount || 0);
      return `
        <tr>
          <td><span class="crp-order-code">${escHtml(o.order_code || '-')}</span></td>
          <td>${formatDate(o.created_at)}</td>
          <td>${escHtml(o.customer_name || '-')}</td>
          <td><span class="crp-period-text" title="${escHtml(o.product_period_snapshot || '')}">${escHtml(o.product_period_snapshot || '-')}</span></td>
          <td class="group-start"><span class="crp-seller-badge">${escHtml(o.seller_nick_name || '-')}</span></td>
          <td class="right group-start">฿${formatNumber(o.net_amount)}</td>
          <td class="center">${o.room_quantity || 0}</td>
          <td class="center">${formatDate(o.first_paid_at)}</td>
          <td class="right group-start">฿${formatNumber(o.supplier_commission)}</td>
          <td class="right ${netCom >= 0 ? 'crp-positive' : 'crp-negative'}">฿${formatNumber(netCom)}</td>
          <td class="right group-start">฿${formatNumber(o.discount)}</td>
        </tr>`;
    }).join('');

    return `
      <div class="dashboard-table-header">
        <div class="dashboard-table-title">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2"/><rect x="9" y="3" width="6" height="4" rx="1"/><path d="M9 12h6M9 16h4"/></svg>
          <span id="crp-table-count">แสดง ${formatNumber(orders.length, 0)} รายการ</span>
        </div>
        <div class="dashboard-table-actions">
          <div class="dashboard-search-wrapper">
            <svg class="dashboard-search-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="11" cy="11" r="8"></circle>
              <path d="M21 21l-4.35-4.35"></path>
            </svg>
            <input type="text" class="dashboard-search-input" id="crp-table-search" placeholder="ค้นหารหัส Order หรือชื่อลูกค้า...">
          </div>
          <button class="dashboard-export-btn" id="crp-btn-export">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            Export CSV
          </button>
          <button class="dashboard-export-btn crp-btn-pdf" id="crp-btn-pdf">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
            Download PDF
          </button>
          <button class="crp-zoom-btn" id="crp-btn-zoom">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/></svg>
            ขยาย
          </button>
        </div>
      </div>
      <div class="dashboard-table-wrapper crp-table-scroll">
        <table class="dashboard-table crp-table">
          <thead>
            <tr class="group-row">
              <th colspan="4" class="group-header">Order</th>
              <th class="group-header">เซลล์</th>
              <th colspan="3" class="group-header">ยอดจอง</th>
              <th colspan="2" class="group-header">คอมมิชชั่น</th>
              <th class="group-header">ส่วนลด</th>
            </tr>
            <tr class="col-row">
              <th>รหัส Order</th>
              <th>จองวันที่</th>
              <th>ลูกค้า</th>
              <th>เดินทาง</th>
              <th class="group-start">เซลล์</th>
              <th class="right group-start">ยอดจอง</th>
              <th class="center">ผู้เดินทาง</th>
              <th class="center">วันชำระงวด 1</th>
              <th class="right group-start">คอมรวม</th>
              <th class="right">คอม (หักส่วนลด)</th>
              <th class="right group-start">ส่วนลดรวม</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>`;
  }

  // ---- Export CSV ----
  function exportCSV(orders) {
    const headers = ['รหัส Order','จองวันที่','ลูกค้า','เดินทาง','เซลล์','ยอดจอง','ผู้เดินทาง','วันชำระงวด 1','คอมรวม','คอม (หักส่วนลด)','ส่วนลดรวม'];
    const rows = orders.map(o => {
      const netCom = parseFloat(o.supplier_commission || 0) - parseFloat(o.discount || 0);
      return [
        o.order_code || '', formatDate(o.created_at), o.customer_name || '',
        o.product_period_snapshot || '', o.seller_nick_name || '',
        parseFloat(o.net_amount || 0).toFixed(2), o.room_quantity || 0,
        formatDate(o.first_paid_at), parseFloat(o.supplier_commission || 0).toFixed(2),
        netCom.toFixed(2), parseFloat(o.discount || 0).toFixed(2),
      ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(',');
    });

    const csv = '\uFEFF' + [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'Commission Report.csv'; a.click();
    URL.revokeObjectURL(url);
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
    <title>Commission Report Plus</title>
    <style>
      @page { size: A4 landscape; margin: 10mm; }
      * { box-sizing: border-box; }
      body {
        margin: 0;
        color: #111827;
        font-family: 'Kanit', 'Sarabun', sans-serif;
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
          <h1 class="crp-print-title">Commission Report Plus</h1>
          <p class="crp-print-subtitle">พิมพ์เมื่อ ${escHtml(new Date().toLocaleString('th-TH'))}</p>
        </div>
        <div class="crp-print-count">${escHtml(countText || '')}</div>
      </div>

      <div class="crp-print-summary">
        <div class="crp-print-card">
          <span class="crp-print-card-label">ยอดจองรวม</span>
          <span class="crp-print-card-value">฿${formatNumber(summary.total_net_amount)}</span>
        </div>
        <div class="crp-print-card">
          <span class="crp-print-card-label">คอมรวม</span>
          <span class="crp-print-card-value">฿${formatNumber(summary.total_commission)}</span>
        </div>
        <div class="crp-print-card">
          <span class="crp-print-card-label">คอม (หักส่วนลด)</span>
          <span class="crp-print-card-value">฿${formatNumber(netCommission)}</span>
        </div>
        <div class="crp-print-card">
          <span class="crp-print-card-label">ส่วนลดรวม</span>
          <span class="crp-print-card-value">฿${formatNumber(summary.total_discount)}</span>
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
    return `commission-report-plus-${yyyy}${mm}${dd}.pdf`;
  }

  function getVisibleTableRows() {
    return Array.from(document.querySelectorAll('.crp-table tbody tr'))
      .map(tr => Array.from(tr.querySelectorAll('td')).map(td => td.innerText.replace(/\s+/g, ' ').trim()))
      .filter(row => row.length === 11);
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
    wrapper.style.fontFamily = "'Kanit', sans-serif";
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
        <div style="font-size:22px;font-weight:700;color:#0f172a;line-height:1.2;">Commission Report +</div>
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
        <td style="text-align:right;border-top:2px solid #9fb6cc;">฿${escHtml(formatNumber(currentData?.summary?.total_net_amount || 0))}</td>
        <td style="border-top:2px solid #9fb6cc;"></td>
        <td style="border-top:2px solid #9fb6cc;"></td>
        <td style="text-align:right;border-top:2px solid #9fb6cc;">฿${escHtml(formatNumber(currentData?.summary?.total_commission || 0))}</td>
        <td style="text-align:right;color:#16a34a;border-top:2px solid #9fb6cc;">฿${escHtml(formatNumber(netCommission || 0))}</td>
        <td style="text-align:right;border-top:2px solid #9fb6cc;">฿${escHtml(formatNumber(currentData?.summary?.total_discount || 0))}</td>
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
