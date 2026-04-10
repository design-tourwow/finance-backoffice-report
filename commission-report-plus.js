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

    document.getElementById('crp-btn-export').addEventListener('click', () => exportCSV(orders));

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
      }).join('') || `<tr><td colspan="11" style="text-align:center;padding:32px;color:#9ca3af;">ไม่พบข้อมูลที่ค้นหา</td></tr>`;
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
        </div>
      </div>
      <div class="dashboard-table-wrapper" style="overflow-x: auto;">
        <table class="crp-table">
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

})();
