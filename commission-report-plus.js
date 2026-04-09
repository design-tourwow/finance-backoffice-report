// Commission Report Plus - Main JavaScript
(function () {
  'use strict';

  // ---- State ----
  let currentUser = null; // decoded from JWT: { id, nick_name, job_position, ... }
  let currentFilters = {};
  let currentData = null;
  let sellers = [];

  document.addEventListener('DOMContentLoaded', function () {
    init();
  });

  // ---- Init ----
  async function init() {
    if (!validateToken()) return;

    // Decode user info from JWT
    currentUser = getUserFromToken();

    // Render dashboard shell
    renderShell();

    // Load sellers list (for admin dropdown)
    await loadSellers();

    // Set default filters
    setDefaultFilters();

    // Initial search
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
    if (typeof MenuComponent !== 'undefined' && MenuComponent.showAuthModal) {
      MenuComponent.showAuthModal();
    } else {
      alert('กรุณาเข้าสู่ระบบใหม่');
    }
  }

  function getUserFromToken() {
    try {
      const token = (typeof TokenUtils !== 'undefined') ? TokenUtils.getToken() : (sessionStorage.getItem('authToken') || localStorage.getItem('authToken'));
      if (!token) return null;
      const payload = (typeof TokenUtils !== 'undefined') ? TokenUtils.decodeToken(token) : JSON.parse(atob(token.split('.')[1]));
      if (!payload) return null;
      const member = payload.agency_member || {};
      return {
        id:           member.id || null,
        nick_name:    member.nick_name || '',
        job_position: member.job_position || 'admin',
      };
    } catch (e) {
      console.error('[CRP] Failed to decode token:', e);
      return null;
    }
  }

  // ---- Helpers ----
  function isAdmin() {
    return !currentUser || currentUser.job_position === 'admin';
  }

  function formatNumber(val, decimals = 2) {
    const num = parseFloat(val) || 0;
    return num.toLocaleString('th-TH', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
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

  // ---- Sellers ----
  async function loadSellers() {
    try {
      const res = await CommissionReportPlusAPI.getSellers();
      if (res && res.success && res.data) {
        sellers = res.data;
      }
    } catch (e) {
      console.error('[CRP] Failed to load sellers:', e);
    }
  }

  // ---- Default Filters ----
  function setDefaultFilters() {
    const jobPos = currentUser ? currentUser.job_position : 'admin';
    const sellerId = currentUser ? String(currentUser.id || '') : '';

    // date defaults: current month
    const from = firstDayOfMonth();
    const to   = today();

    document.getElementById('crp-created-from').value   = from;
    document.getElementById('crp-created-to').value     = to;
    document.getElementById('crp-paid-from').value       = from;
    document.getElementById('crp-paid-to').value         = to;
    document.getElementById('crp-paid-to-note').textContent = `(สิ้นสุดจริง: ${formatDate(addDays(to, 3))})`;

    // job_position
    const jpSelect = document.getElementById('crp-job-position');
    jpSelect.value = jobPos;
    if (!isAdmin()) jpSelect.disabled = true;

    // order_status default
    const osSelect = document.getElementById('crp-order-status');
    osSelect.value = isAdmin() ? 'all' : 'not_canceled';
    if (!isAdmin()) osSelect.disabled = true;

    // seller
    renderSellerDropdown(sellerId, jobPos);
  }

  function renderSellerDropdown(defaultSellerId, jobPos) {
    const wrap = document.getElementById('crp-seller-wrap');
    if (!wrap) return;

    if (!isAdmin()) {
      // Non-admin: show their own name, disabled
      const me = sellers.find(s => String(s.id) === String(defaultSellerId));
      const name = me ? me.nick_name : (currentUser ? currentUser.nick_name : '-');
      wrap.innerHTML = `<input type="text" class="crp-date-input" value="${escHtml(name)}" disabled style="width:90px" />`;
      return;
    }

    // Admin: plain select with all sellers
    const select = document.createElement('select');
    select.className = 'crp-select';
    select.id = 'crp-seller-select';

    const allOpt = document.createElement('option');
    allOpt.value = '';
    allOpt.textContent = 'ทั้งหมด';
    select.appendChild(allOpt);

    sellers.forEach(s => {
      const opt = document.createElement('option');
      opt.value = String(s.id);
      opt.textContent = s.nick_name || `${s.first_name} ${s.last_name}`.trim() || String(s.id);
      select.appendChild(opt);
    });

    select.value = defaultSellerId || '';
    wrap.appendChild(select);
  }

  function getSelectedSellerId() {
    if (!isAdmin()) return currentUser ? String(currentUser.id || '') : '';
    const sel = document.getElementById('crp-seller-select');
    return sel ? sel.value : '';
  }

  // ---- Load Report ----
  async function loadReport() {
    showLoading();

    const filters = buildFilters();
    currentFilters = filters;

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
    return {
      created_at_from: document.getElementById('crp-created-from').value || '',
      created_at_to:   document.getElementById('crp-created-to').value   || '',
      paid_at_from:    document.getElementById('crp-paid-from').value    || '',
      paid_at_to:      document.getElementById('crp-paid-to').value      || '',
      job_position:    document.getElementById('crp-job-position').value  || 'admin',
      seller_id:       isAdmin() ? getSelectedSellerId() : (currentUser ? String(currentUser.id || '') : ''),
      order_status:    document.getElementById('crp-order-status').value  || 'all',
    };
  }

  // ---- Render Shell ----
  function renderShell() {
    const section = document.getElementById('reportContentSection');
    if (!section) return;

    section.innerHTML = `
      <div class="crp-wrapper">

        <!-- Filter Section: 2 rows -->
        <div class="crp-filter-section">

          <!-- แถว 1: Date Filters -->
          <div class="crp-filter-row1">
            <span class="crp-filter-label">วันที่สร้าง Order</span>
            <div class="crp-date-group">
              <input type="date" class="crp-date-input" id="crp-created-from" />
              <span>–</span>
              <input type="date" class="crp-date-input" id="crp-created-to" />
            </div>

            <div class="crp-filter-separator"></div>

            <span class="crp-filter-label">วันชำระงวด 1</span>
            <div class="crp-date-group">
              <input type="date" class="crp-date-input" id="crp-paid-from" />
              <span>–</span>
              <input type="date" class="crp-date-input" id="crp-paid-to" />
              <span class="crp-paid-note" id="crp-paid-to-note"></span>
            </div>
          </div>

          <!-- แถว 2: Dropdowns + Search -->
          <div class="crp-filter-row2">
            <span class="crp-filter-label">ตำแหน่ง</span>
            <select class="crp-select" id="crp-job-position">
              <option value="ts">เซลล์</option>
              <option value="crm">CRM</option>
              <option value="admin">Admin</option>
            </select>

            <div class="crp-filter-separator"></div>

            <span class="crp-filter-label">เซลล์ผู้จอง</span>
            <div id="crp-seller-wrap"></div>

            <div class="crp-filter-separator"></div>

            <span class="crp-filter-label">สถานะ Order</span>
            <select class="crp-select" id="crp-order-status">
              <option value="all">ทั้งหมด</option>
              <option value="not_canceled">ไม่ยกเลิก</option>
              <option value="canceled">ยกเลิก</option>
            </select>

            <button class="crp-btn-search" id="crp-btn-search">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
              ค้นหา
            </button>
          </div>

        </div>

        <!-- Results Container -->
        <div id="crp-results"></div>
      </div>
    `;

    // Event listeners
    document.getElementById('crp-btn-search').addEventListener('click', loadReport);

    // Update paid-to note when date changes
    document.getElementById('crp-paid-to').addEventListener('change', function () {
      const note = document.getElementById('crp-paid-to-note');
      if (note && this.value) {
        note.textContent = `(สิ้นสุดจริง: ${formatDate(addDays(this.value, 3))})`;
      }
    });
  }

  // ---- Loading ----
  function showLoading() {
    const results = document.getElementById('crp-results');
    if (results) {
      results.innerHTML = `<div class="crp-loading"><div class="spinner"></div><p>กำลังโหลดข้อมูล...</p></div>`;
    }
  }

  // ---- Empty State ----
  function showEmpty() {
    const results = document.getElementById('crp-results');
    if (results) {
      results.innerHTML = `
        <div class="crp-empty">
          <img src="/assets/images/empty-state.svg" alt="ไม่พบข้อมูล" width="180" height="180" />
          <h3>ไม่พบข้อมูล</h3>
          <p>ลองปรับเงื่อนไขการค้นหาใหม่</p>
        </div>
      `;
    }
  }

  // ---- Render Results ----
  function renderResults(data) {
    const results = document.getElementById('crp-results');
    if (!results) return;

    const { orders = [], summary = {} } = data;

    if (!orders.length) { showEmpty(); return; }

    results.innerHTML = `
      ${renderSummary(summary)}
      ${renderTableHeader(orders.length)}
      ${renderTable(orders)}
    `;

    // Export button
    document.getElementById('crp-btn-export').addEventListener('click', function () {
      exportCSV(orders);
    });
  }

  // ---- Summary ----
  function renderSummary(summary) {
    const netCommission = (parseFloat(summary.total_commission || 0) - parseFloat(summary.total_discount || 0));
    return `
      <div class="crp-summary">
        <div class="crp-summary-card highlight">
          <div class="label">ยอดจองรวม (net_amount)</div>
          <div class="value">฿${formatNumber(summary.total_net_amount)}</div>
          <div class="sub">${formatNumber(summary.total_orders, 0)} Orders</div>
        </div>
        <div class="crp-summary-card">
          <div class="label">คอมรวม</div>
          <div class="value">฿${formatNumber(summary.total_commission)}</div>
        </div>
        <div class="crp-summary-card">
          <div class="label">คอมหลังหักส่วนลด</div>
          <div class="value ${netCommission >= 0 ? 'crp-positive' : 'crp-negative'}">฿${formatNumber(netCommission)}</div>
        </div>
        <div class="crp-summary-card">
          <div class="label">ส่วนลดรวม</div>
          <div class="value">฿${formatNumber(summary.total_discount)}</div>
        </div>
      </div>
    `;
  }

  // ---- Table Header ----
  function renderTableHeader(count) {
    return `
      <div class="crp-table-header">
        <span class="crp-table-count">แสดง ${formatNumber(count, 0)} รายการ</span>
        <button class="crp-btn-export" id="crp-btn-export">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
          ดาวน์โหลด Excel
        </button>
      </div>
    `;
  }

  // ---- Table ----
  function renderTable(orders) {
    const rows = orders.map(o => {
      const netCom = parseFloat(o.supplier_commission || 0) - parseFloat(o.discount || 0);
      return `
        <tr>
          <td class="mono"><span class="order-code">${o.order_code || '-'}</span></td>
          <td>${formatDate(o.created_at)}</td>
          <td>${escHtml(o.customer_name || '-')}</td>
          <td><span class="period-text" title="${escHtml(o.product_period_snapshot || '')}">${escHtml(o.product_period_snapshot || '-')}</span></td>
          <td><span class="seller-badge">${escHtml(o.seller_nick_name || '-')}</span></td>
          <td class="right">฿${formatNumber(o.net_amount)}</td>
          <td class="center">${o.room_quantity || 0}</td>
          <td class="center">${formatDate(o.first_paid_at)}</td>
          <td class="right">฿${formatNumber(o.supplier_commission)}</td>
          <td class="right ${netCom >= 0 ? 'crp-positive' : 'crp-negative'}">฿${formatNumber(netCom)}</td>
          <td class="right">฿${formatNumber(o.discount)}</td>
        </tr>
      `;
    }).join('');

    return `
      <div class="crp-table-wrapper">
        <table class="crp-table">
          <thead>
            <tr>
              <th colspan="4" class="group-header">Order</th>
              <th class="group-header">เซลล์</th>
              <th colspan="3" class="group-header">ยอดจอง</th>
              <th colspan="2" class="group-header">คอมรวม</th>
              <th class="group-header">ส่วนลด</th>
            </tr>
            <tr>
              <th>รหัส Order</th>
              <th>จองวันที่</th>
              <th>ลูกค้า</th>
              <th>เดินทาง</th>
              <th>เซลล์</th>
              <th class="right">ยอดจอง</th>
              <th class="center">ห้อง</th>
              <th class="center">วันชำระงวด 1</th>
              <th class="right">คอมรวม</th>
              <th class="right">คอม (หักส่วนลด)</th>
              <th class="right">ส่วนลดรวม</th>
            </tr>
          </thead>
          <tbody>
            ${rows}
          </tbody>
        </table>
      </div>
    `;
  }

  // ---- Export CSV ----
  function exportCSV(orders) {
    const headers = [
      'รหัส Order', 'จองวันที่', 'ลูกค้า', 'เดินทาง', 'เซลล์',
      'ยอดจอง', 'ห้อง', 'วันชำระงวด 1',
      'คอมรวม', 'คอม (หักส่วนลด)', 'ส่วนลดรวม'
    ];

    const rows = orders.map(o => {
      const netCom = parseFloat(o.supplier_commission || 0) - parseFloat(o.discount || 0);
      return [
        o.order_code || '',
        formatDate(o.created_at),
        o.customer_name || '',
        o.product_period_snapshot || '',
        o.seller_nick_name || '',
        parseFloat(o.net_amount || 0).toFixed(2),
        o.room_quantity || 0,
        formatDate(o.first_paid_at),
        parseFloat(o.supplier_commission || 0).toFixed(2),
        netCom.toFixed(2),
        parseFloat(o.discount || 0).toFixed(2),
      ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(',');
    });

    const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'Commission Report.csv';
    link.click();
    URL.revokeObjectURL(url);
  }

  // ---- Escape HTML ----
  function escHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

})();
