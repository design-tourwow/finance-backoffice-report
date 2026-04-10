// Work List - Main JavaScript
(function () {
  'use strict';

  let activeRoleGroup = 'general';
  let currentData = null;

  document.addEventListener('DOMContentLoaded', function () {
    init();
  });

  async function init() {
    if (!validateToken()) return;
    renderShell();
    bindEvents();
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
          <div class="work-list-control-left">
            <span class="time-granularity-label">กลุ่มงาน</span>
            <div class="work-list-segment">
              <button class="time-btn active work-list-tab" type="button" data-role-group="general">ทั่วไป</button>
              <button class="time-btn work-list-tab" type="button" data-role-group="finance">เฉพาะ Finance</button>
            </div>
          </div>
        </div>

        <div id="workListResults"></div>
      </div>
    `;
  }

  function bindEvents() {
    document.querySelectorAll('.work-list-tab').forEach(btn => {
      btn.addEventListener('click', async function () {
        const nextRoleGroup = this.getAttribute('data-role-group') || 'general';
        if (nextRoleGroup === activeRoleGroup) return;
        activeRoleGroup = nextRoleGroup;
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

  function showEmpty() {
    const results = document.getElementById('workListResults');
    if (!results) return;
    results.innerHTML = `
      <div class="dashboard-table-empty">
        <img src="/assets/images/empty-state.svg" alt="ไม่พบข้อมูล" width="200" height="200" style="margin-bottom: 16px; opacity: 0.8;" />
        <h3 style="margin: 0 0 8px 0; font-size: 18px; color: #374151;">ไม่พบรายการงาน</h3>
        <p style="margin: 0; font-size: 15px; color: #6b7280;">ไม่มีงานที่เข้าเงื่อนไขในกลุ่มนี้</p>
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
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M9 11l3 3L22 4"></path>
              <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path>
            </svg>
          </div>
          <div class="kpi-content">
            <div class="kpi-label">จำนวนงาน</div>
            <div class="kpi-value" id="workListTotal">${total}</div>
            <div class="kpi-subtext">สถานะ to_do</div>
          </div>
        </div>
        <div class="dashboard-kpi-card kpi-travelers">
          <div class="kpi-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
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

  function renderTable(tasks) {
    return `
      ${renderSummary(tasks.length)}
      <div class="dashboard-table-container">
        <div class="dashboard-table-header">
          <div class="dashboard-table-title">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M9 11l3 3L22 4"></path>
              <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path>
            </svg>
            <span>แสดง ${tasks.length} รายการ</span>
          </div>
        </div>

        <div class="work-list-table-wrap">
          <table class="dashboard-table work-list-table">
            <thead>
              <tr>
                <th>ลำดับ</th>
                <th>วันที่ต้องทำ</th>
                <th>งานที่ต้องทำ</th>
                <th>รายละเอียด Order</th>
                <th>วันที่จอง</th>
                <th>ผู้ดูแล</th>
              </tr>
            </thead>
            <tbody>
              ${tasks.map(task => `
                <tr>
                  <td>${task.seq}</td>
                  <td>${escHtml(task.task_date)}</td>
                  <td>
                    <div class="work-list-task-name">${escHtml(task.task_type_name)}</div>
                  </td>
                  <td>
                    <div class="work-list-order-main">
                      <div class="work-list-order-title"><span class="work-list-order-code">${escHtml(task.order_code)}</span> ลูกค้า : ${escHtml(task.customer_name)} โทร. ${escHtml(task.customer_phone_number)}</div>
                      <div class="work-list-order-meta">${escHtml(task.travel_period_text)} ผู้เดินทาง ${escHtml(task.traveler_count)}</div>
                      <div class="work-list-links">
                        <a class="work-list-link" href="${buildOrderSaleUrl(task.order_code)}" target="_blank" rel="noopener noreferrer">ข้อมูล Order(sale)</a>
                        <a class="work-list-link" href="${buildOrderFinanceUrl(task.order_code)}" target="_blank" rel="noopener noreferrer">ข้อมูล Order(Finance)</a>
                      </div>
                    </div>
                  </td>
                  <td>${escHtml(task.order_created_at)}</td>
                  <td>
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

  async function loadWorkList() {
    showLoading();
    try {
      const res = await WorkListAPI.getWorkList(activeRoleGroup);
      if (!res || !res.success || !res.data) {
        showEmpty();
        return;
      }

      currentData = res.data;
      const tasks = Array.isArray(res.data.tasks) ? res.data.tasks : [];
      updateSummary(tasks.length);
      if (!tasks.length) {
        showEmpty();
        return;
      }

      const results = document.getElementById('workListResults');
      if (!results) return;
      results.innerHTML = renderTable(tasks);
    } catch (error) {
      console.error('[WorkList] Failed to load work list:', error);
      showError(error && error.message ? error.message : 'กรุณาลองใหม่อีกครั้ง');
    }
  }
})();
