// Work List - Main JavaScript
(function () {
  'use strict';

  const CLOSE_OVERLAY_EVENT = 'app:close-dropdown-overlays';

  let activeRoleGroup = 'general';
  let currentData = null;
  let selectedTaskTypeId = '';
  let selectedSellerId = '';
  let tableQuery = '';
  let tableSortState = { key: null, direction: 'desc' };
  let tableSortInstance = null;

  document.addEventListener('DOMContentLoaded', function () {
    init();
  });

  async function init() {
    if (!validateToken()) return;
    renderShell();
    bindRoleTabs();
    bindStaticEvents();
    await loadWorkList();
  }

  function checkAuth() {
    if (typeof TourImageAPI !== 'undefined' && TourImageAPI.hasToken) return TourImageAPI.hasToken();
    return !!(sessionStorage.getItem('authToken') || localStorage.getItem('authToken'));
  }

  function validateToken() {
    if (!checkAuth()) {
      showAuthModal();
      return false;
    }
    if (typeof TokenUtils !== 'undefined' && TokenUtils.isTokenExpired()) {
      showAuthModal();
      return false;
    }
    return true;
  }

  function showAuthModal() {
    if (typeof MenuComponent !== 'undefined' && MenuComponent.showAuthModal) MenuComponent.showAuthModal();
    else alert('กรุณาเข้าสู่ระบบใหม่');
  }

  function escHtml(str) {
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function renderShell() {
    const root = document.getElementById('workListSection');
    if (!root) return;

    root.innerHTML = `
      <div class="work-list-shell">
        <div class="time-granularity-control work-list-control">
          <div class="filter-inline-field work-list-role-field">
            <span class="time-granularity-label">กลุ่มงาน</span>
            <div class="work-list-segment">
              <button class="time-btn work-list-tab active" type="button" data-role-group="general">ทั่วไป</button>
              <button class="time-btn work-list-tab" type="button" data-role-group="finance">เฉพาะ Finance</button>
            </div>
          </div>
          <div class="filter-inline-field work-list-filter-field">
            <span class="time-granularity-label">ประเภทงาน</span>
            <div class="filter-sort-dropdown work-list-filter" id="workListTaskTypeFilter"></div>
          </div>
          <div class="filter-inline-field work-list-filter-field">
            <span class="time-granularity-label">เซลล์ดูแล</span>
            <div class="filter-sort-dropdown work-list-filter" id="workListSellerFilter"></div>
          </div>
          <!-- ค้นหา + เริ่มใหม่ button pair — filter changes only update
               state; results refresh on ค้นหา click. เริ่มใหม่ resets state
               to default without touching the currently-rendered list. -->
          <div class="wl-filter-actions" id="wlFilterActionsHost"></div>
        </div>

        <div id="workListResults"></div>
      </div>
    `;
  }

  function bindStaticEvents() {
    document.addEventListener('click', handleGlobalClick);
  }

  function handleGlobalClick(event) {
    document.querySelectorAll('.filter-sort-menu.open').forEach(menu => {
      if (!menu.closest('.filter-sort-dropdown')?.contains(event.target)) {
        menu.classList.remove('open');
        const btn = menu.parentElement ? menu.parentElement.querySelector('.filter-sort-btn') : null;
        if (btn) btn.classList.remove('open');
      }
    });
  }

  function closeWorkListDropdowns() {
    document.querySelectorAll('.filter-sort-menu.open').forEach(menu => {
      menu.classList.remove('open');
      const btn = menu.parentElement ? menu.parentElement.querySelector('.filter-sort-btn') : null;
      if (btn) btn.classList.remove('open');
    });
  }

  function getFilterOptions() {
    const tasks = Array.isArray(currentData && currentData.tasks) ? currentData.tasks : [];
    const taskTypeMap = new Map();
    const sellerMap = new Map();

    tasks.forEach(task => {
      const taskTypeId = task.task_type_id != null ? String(task.task_type_id) : '';
      if (taskTypeId && !taskTypeMap.has(taskTypeId)) {
        taskTypeMap.set(taskTypeId, {
          value: taskTypeId,
          label: task.task_type_name || '-'
        });
      }

      const sellerId = task.seller_agency_member_id != null ? String(task.seller_agency_member_id) : '';
      if (sellerId && !sellerMap.has(sellerId)) {
        sellerMap.set(sellerId, {
          value: sellerId,
          label: task.seller_nick_name || sellerId
        });
      }
    });

    return {
      taskTypes: Array.from(taskTypeMap.values()).sort((a, b) => a.label.localeCompare(b.label, 'th')),
      sellers: Array.from(sellerMap.values()).sort((a, b) => a.label.localeCompare(b.label, 'th'))
    };
  }

  function renderDropdown(containerId, config) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const buttonId = `${containerId}Button`;
    const menuId = `${containerId}Menu`;
    const selected = config.options.find(option => option.value === config.value);
    const selectedLabel = selected ? selected.label : config.placeholder;

    container.innerHTML = `
      <button type="button" class="filter-sort-btn" id="${buttonId}">
        <span class="filter-sort-btn-content">
          <span class="filter-sort-btn-text">${escHtml(selectedLabel)}</span>
        </span>
        <svg class="filter-sort-arrow" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="6 9 12 15 18 9"></polyline>
        </svg>
      </button>
      <div class="filter-sort-menu" id="${menuId}">
        ${config.options.map(option => `
          <button type="button" class="filter-sort-option ${option.value === config.value ? 'active' : ''}" data-value="${escHtml(option.value)}">
            <span class="filter-sort-option-label">${escHtml(option.label)}</span>
          </button>
        `).join('')}
      </div>
    `;

    const button = document.getElementById(buttonId);
    const menu = document.getElementById(menuId);
    if (!button || !menu) return;

    button.addEventListener('click', function (event) {
      event.stopPropagation();
      const isOpen = menu.classList.contains('open');
      if (!isOpen) {
        document.dispatchEvent(new CustomEvent(CLOSE_OVERLAY_EVENT));
      }
      document.querySelectorAll('.filter-sort-menu.open').forEach(openMenu => {
        if (openMenu !== menu) {
          openMenu.classList.remove('open');
          const openBtn = openMenu.parentElement ? openMenu.parentElement.querySelector('.filter-sort-btn') : null;
          if (openBtn) openBtn.classList.remove('open');
        }
      });
      menu.classList.toggle('open', !isOpen);
      button.classList.toggle('open', !isOpen);
    });

    menu.querySelectorAll('.filter-sort-option').forEach(option => {
      option.addEventListener('click', function () {
        const nextValue = this.getAttribute('data-value') || '';
        config.onChange(nextValue);
        menu.classList.remove('open');
        button.classList.remove('open');
      });
    });
  }

  document.addEventListener(CLOSE_OVERLAY_EVENT, closeWorkListDropdowns);

  function renderFilters() {
    const { taskTypes, sellers } = getFilterOptions();
    renderDropdown('workListTaskTypeFilter', {
      label: 'ประเภทงาน',
      placeholder: 'ทั้งหมด',
      value: selectedTaskTypeId,
      options: [{ value: '', label: 'ทั้งหมด' }].concat(taskTypes),
      onChange: function (nextValue) {
        // Defer apply: update state only. User presses ค้นหา to refresh.
        selectedTaskTypeId = nextValue;
      }
    });

    renderDropdown('workListSellerFilter', {
      label: 'เซลล์ดูแล',
      placeholder: 'ทั้งหมด',
      value: selectedSellerId,
      options: [{ value: '', label: 'ทั้งหมด' }].concat(sellers),
      onChange: function (nextValue) {
        // Defer apply: update state only. User presses ค้นหา to refresh.
        selectedSellerId = nextValue;
      }
    });

    initWorkListFilterActions();
  }

  // Mount ค้นหา + เริ่มใหม่ buttons. Filter changes (taskType, seller) just
  // update state; results refresh on ค้นหา. Role tab clicks already trigger
  // a full reload so they stay as immediate-apply — they're a view switcher,
  // not a filter.
  function initWorkListFilterActions() {
    if (!window.SharedFilterActions || !window.SharedFilterActions.mount) return;
    if (!document.getElementById('wlFilterActionsHost')) return;
    window.SharedFilterActions.mount({
      containerId: 'wlFilterActionsHost',
      searchType : 'button',
      resetType  : 'button',
      onSearch   : function () { renderResults(); },
      onReset    : function () {
        selectedTaskTypeId = '';
        selectedSellerId = '';
        renderFilters(); // Re-mount the dropdowns with defaults
        // NOTE: skip renderResults — per spec, เริ่มใหม่ only resets the
        // filter UI; current results stay visible until ค้นหา.
      }
    });
  }

  function bindRoleTabs() {
    document.querySelectorAll('.work-list-tab').forEach(btn => {
      btn.addEventListener('click', async function () {
        const nextRoleGroup = this.getAttribute('data-role-group') || 'general';
        if (nextRoleGroup === activeRoleGroup) return;
        activeRoleGroup = nextRoleGroup;
        selectedTaskTypeId = '';
        selectedSellerId = '';
        document.querySelectorAll('.work-list-tab').forEach(tab => {
          tab.classList.toggle('active', tab === this);
        });
        await loadWorkList();
      });
    });
  }

  function showLoading() {
    const results = document.getElementById('workListResults');
    if (!results) return;
    results.innerHTML = `
      <div class="dashboard-table-loading">
        <div class="spinner"></div>
        <span>กำลังโหลดรายการงาน...</span>
      </div>
    `;
  }

  function showEmpty(message) {
    const results = document.getElementById('workListResults');
    if (!results) return;
    results.innerHTML = `
      <div class="dashboard-table-empty">
        <img src="/assets/images/empty-state.svg" alt="ไม่พบข้อมูล" width="200" height="200" style="margin-bottom: 16px; opacity: 0.8;" />
        <h3 style="margin: 0 0 8px 0; font-size: 18px; color: #374151;">ไม่พบรายการงาน</h3>
        <p style="margin: 0; font-size: 15px; color: #6b7280;">${escHtml(message || 'ไม่มีงานที่เข้าเงื่อนไขในกลุ่มนี้')}</p>
      </div>
    `;
    updateSummary(0);
  }

  function showError(message) {
    const results = document.getElementById('workListResults');
    if (!results) return;
    results.innerHTML = `
      <div class="dashboard-table-empty">
        <h3 style="margin: 0 0 8px 0; font-size: 18px; color: #dc2626;">โหลดข้อมูลไม่สำเร็จ</h3>
        <p style="margin: 0; font-size: 15px; color: #6b7280;">${escHtml(message || 'กรุณาลองใหม่อีกครั้ง')}</p>
      </div>
    `;
    updateSummary(0);
  }

  function updateSummary(total) {
    const totalEl = document.getElementById('workListTotal');
    if (totalEl) totalEl.textContent = String(total || 0);
  }

  function renderSummary(total) {
    return `
      <div class="dashboard-kpi-cards work-list-kpis">
        <div class="dashboard-kpi-card kpi-active">
          <div class="kpi-icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M9 11l3 3L22 4"></path>
              <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path>
            </svg>
          </div>
          <div class="kpi-content">
            <div class="kpi-label">จำนวนงาน</div>
            <div class="kpi-value" id="workListTotal">${total}</div>
            <div class="kpi-subtext">เฉพาะ Order ที่ไม่ถูกยกเลิก</div>
          </div>
        </div>
        <div class="dashboard-kpi-card kpi-travelers">
          <div class="kpi-icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M12 20h9"></path>
              <path d="M12 4h9"></path>
              <path d="M4 9h16"></path>
              <path d="M4 15h16"></path>
            </svg>
          </div>
          <div class="kpi-content">
            <div class="kpi-label">การเรียงลำดับ</div>
            <div class="kpi-value">Date ASC</div>
            <div class="kpi-subtext">เก่าสุดไปใหม่สุด</div>
          </div>
        </div>
      </div>
    `;
  }

  function buildOrderSaleUrl(orderCode) {
    return `https://financebackoffice.tourwow.com/order/list?search=${encodeURIComponent(orderCode)}`;
  }

  function buildOrderFinanceUrl(orderCode) {
    return `https://financebackoffice.tourwow.com/tw-booking/list?search_string=${encodeURIComponent(orderCode)}`;
  }

  function getFilteredTasks() {
    const tasks = Array.isArray(currentData && currentData.tasks) ? currentData.tasks : [];
    const q = (tableQuery || '').toLowerCase();
    const filtered = tasks.filter(task => {
      const taskTypeId = task.task_type_id != null ? String(task.task_type_id) : '';
      const sellerId = task.seller_agency_member_id != null ? String(task.seller_agency_member_id) : '';

      if (selectedTaskTypeId && taskTypeId !== selectedTaskTypeId) return false;
      if (selectedSellerId && sellerId !== selectedSellerId) return false;
      if (q) {
        const hay = [
          task.order_code, task.customer_name, task.customer_phone_number,
          task.seller_nick_name, task.crm_nick_name, task.task_type_name
        ].map(v => String(v == null ? '' : v).toLowerCase()).join(' ');
        if (hay.indexOf(q) === -1) return false;
      }
      return true;
    });

    return filtered.map((task, index) => Object.assign({}, task, { seq: index + 1 }));
  }

  function renderTable(tasks) {
    return `
      ${renderSummary(tasks.length)}
      <div class="dashboard-table-container">
        <div class="dashboard-table-header">
          <div class="dashboard-table-title">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M9 11l3 3L22 4"></path>
              <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path>
            </svg>
            <span>แสดง ${tasks.length} รายการ</span>
          </div>
          <div class="dashboard-table-actions">
            <div id="wl-table-search-host"></div>
          </div>
        </div>

        <div class="work-list-table-wrap">
          <table class="dashboard-table work-list-table">
            <thead>
              <tr>
                <th data-sort="seq" data-type="number">ลำดับ</th>
                <th data-sort="task_date" data-type="date">วันที่ต้องทำ</th>
                <th data-sort="task_type_name" data-type="string">งานที่ต้องทำ</th>
                <th data-sort="order_details" data-type="string">รายละเอียด Order</th>
                <th data-sort="order_created_at" data-type="date">วันที่จอง</th>
                <th data-sort="owner" data-type="string">ผู้ดูแล</th>
              </tr>
            </thead>
            <tbody>
              ${tasks.map(task => `
                <tr>
                  <td data-sort-value="${escHtml(task.seq)}">${task.seq}</td>
                  <td data-sort-value="${escHtml(task.task_date)}">${escHtml(task.task_date)}</td>
                  <td data-sort-value="${escHtml(task.task_type_name)}"><div class="work-list-task-name">${escHtml(task.task_type_name)}</div></td>
                  <td data-sort-value="${escHtml([task.order_code, task.customer_name, task.customer_phone_number, task.travel_period_text, task.traveler_count].join(' '))}">
                    <div class="work-list-order-main">
                      <div class="work-list-order-title"><span class="work-list-order-code">${escHtml(task.order_code)}</span> ลูกค้า : ${escHtml(task.customer_name)} โทร. ${escHtml(task.customer_phone_number)}</div>
                      <div class="work-list-order-meta">${escHtml(task.travel_period_text)} ผู้เดินทาง ${escHtml(task.traveler_count)}</div>
                      <div class="work-list-links">
                        <a class="work-list-link" href="${buildOrderSaleUrl(task.order_code)}" target="_blank" rel="noopener noreferrer">ข้อมูล Order(sale)</a>
                        <a class="work-list-link" href="${buildOrderFinanceUrl(task.order_code)}" target="_blank" rel="noopener noreferrer">ข้อมูล Order(Finance)</a>
                      </div>
                    </div>
                  </td>
                  <td data-sort-value="${escHtml(task.order_created_at)}">${escHtml(task.order_created_at)}</td>
                  <td data-sort-value="${escHtml([task.seller_nick_name, task.crm_nick_name].join(' '))}">
                    <div class="work-list-owner">
                      <div class="work-list-owner-line"><strong>เซลล์</strong><span class="work-list-owner-badge">${escHtml(task.seller_nick_name)}</span></div>
                      <div class="work-list-owner-line"><strong>crm</strong><span class="work-list-owner-badge work-list-owner-badge-muted">${escHtml(task.crm_nick_name)}</span></div>
                    </div>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  function renderResults() {
    const tasks = getFilteredTasks();
    const results = document.getElementById('workListResults');
    if (!results) return;

    if (!tasks.length) {
      showEmpty('ไม่มีงานที่เข้าเงื่อนไขจาก filter ที่เลือก');
      return;
    }

    results.innerHTML = renderTable(tasks);
    updateSummary(tasks.length);
    if (window.SharedSortableHeader) {
      const tableEl = results.querySelector('.work-list-table');
      if (tableSortInstance && tableSortInstance.destroy) tableSortInstance.destroy();
      if (tableEl) {
        tableSortInstance = window.SharedSortableHeader.bindTable(tableEl, {
          headerSelector  : 'thead th[data-sort]',
          sortKey         : tableSortState.key,
          sortDir         : tableSortState.direction,
          defaultDirection: 'desc',
          onSort: function (sortState) {
            tableSortState = { key: sortState.key, direction: sortState.direction };
          }
        });
      }
    }
    if (window.SharedTableSearch && document.getElementById('wl-table-search-host')) {
      window.SharedTableSearch.init({
        containerId: 'wl-table-search-host',
        value      : tableQuery,
        placeholder: 'ค้นหางาน / Order / ลูกค้า...',
        onInput: function (raw) { tableQuery = String(raw || '').toLowerCase().trim(); renderResults(); }
      });
    }
  }

  async function loadWorkList() {
    showLoading();
    try {
      const res = await WorkListAPI.getWorkList(activeRoleGroup);
      if (!res || !res.success || !res.data) {
        currentData = { tasks: [] };
        renderFilters();
        showEmpty();
        return;
      }

      currentData = res.data;
      renderFilters();
      renderResults();
    } catch (error) {
      console.error('[WorkList] Failed to load work list:', error);
      showError(error && error.message ? error.message : 'กรุณาลองใหม่อีกครั้ง');
    }
  }
})();
