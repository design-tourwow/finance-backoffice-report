// order-external-summary.js — Order External Summary page
// Depends on: fe2-utils.js, fe2-filter-service.js, order-external-summary-api.js

(function () {
  'use strict';

  // ── State ──────────────────────────────────────────────────────────────────
  var allUsers = [];
  var allJobPositions = [];

  var filters = {
    year: new Date().getFullYear(),
    month: new Date().getMonth() + 1,
    country_id: null,
    job_position: null,
    team_number: null,
    user_id: null
  };

  // ── DOM refs (set after render) ────────────────────────────────────────────
  var elYear, elMonth, elCountry, elJobPosition, elTeam, elUser;
  var elContent;

  // ── Bootstrap ─────────────────────────────────────────────────────────────
  function init() {
    elContent = document.getElementById('page-content');
    if (!elContent) return;

    renderShell();
    bindDOMRefs();
    loadDropdownData().then(function () {
      loadReport();
    });
  }

  // ── Shell HTML ─────────────────────────────────────────────────────────────
  function renderShell() {
    elContent.innerHTML = [
      '<div class="oes-filter-panel">',
      '  <h2>ตัวกรอง</h2>',
      '  <div class="oes-filter-grid">',
      '    <div class="oes-filter-group">',
      '      <label for="oes-month">เดือน</label>',
      '      <select id="oes-month"></select>',
      '    </div>',
      '    <div class="oes-filter-group">',
      '      <label for="oes-year">ปี</label>',
      '      <select id="oes-year"></select>',
      '    </div>',
      '    <div class="oes-filter-group">',
      '      <label for="oes-country">ประเทศ</label>',
      '      <select id="oes-country"><option value="">ทุกประเทศ</option></select>',
      '    </div>',
      '    <div class="oes-filter-group">',
      '      <label for="oes-job-position">ตำแหน่งงาน</label>',
      '      <select id="oes-job-position"><option value="">ทุกตำแหน่ง</option></select>',
      '    </div>',
      '    <div class="oes-filter-group">',
      '      <label for="oes-team">ทีม</label>',
      '      <select id="oes-team"><option value="">ทุกทีม</option></select>',
      '    </div>',
      '    <div class="oes-filter-group">',
      '      <label for="oes-user">ผู้ใช้</label>',
      '      <select id="oes-user"><option value="">ทุกคน</option></select>',
      '    </div>',
      '  </div>',
      '  <div class="oes-filter-actions">',
      '    <button class="oes-btn-apply" id="oes-apply-btn">ค้นหา</button>',
      '  </div>',
      '</div>',
      '<div id="oes-results"></div>'
    ].join('\n');
  }

  // ── Bind element refs & events ─────────────────────────────────────────────
  function bindDOMRefs() {
    elYear        = document.getElementById('oes-year');
    elMonth       = document.getElementById('oes-month');
    elCountry     = document.getElementById('oes-country');
    elJobPosition = document.getElementById('oes-job-position');
    elTeam        = document.getElementById('oes-team');
    elUser        = document.getElementById('oes-user');

    // Year options
    var years = FE2Utils.getYearOptions();
    years.forEach(function (y) {
      var opt = document.createElement('option');
      opt.value = y;
      opt.textContent = y;
      if (y === filters.year) opt.selected = true;
      elYear.appendChild(opt);
    });

    // Month options
    var months = FE2Utils.getMonthOptions();
    months.forEach(function (m) {
      var opt = document.createElement('option');
      opt.value = m.value;
      opt.textContent = m.label;
      if (m.value === filters.month) opt.selected = true;
      elMonth.appendChild(opt);
    });

    // Team change → cascade job-position + user
    elTeam.addEventListener('change', function () {
      filters.team_number = elTeam.value ? parseInt(elTeam.value) : null;
      filters.user_id = null;
      updateJobPositionOptions();
      updateUserOptions();
    });

    // Job-position change → cascade user
    elJobPosition.addEventListener('change', function () {
      filters.job_position = elJobPosition.value || null;
      filters.user_id = null;
      updateUserOptions();
    });

    // Apply button
    document.getElementById('oes-apply-btn').addEventListener('click', function () {
      filters.year        = parseInt(elYear.value);
      filters.month       = parseInt(elMonth.value);
      filters.country_id  = elCountry.value ? parseInt(elCountry.value) : null;
      filters.job_position = elJobPosition.value || null;
      filters.team_number = elTeam.value ? parseInt(elTeam.value) : null;
      filters.user_id     = elUser.value ? parseInt(elUser.value) : null;
      loadReport();
    });
  }

  // ── Load dropdown data ─────────────────────────────────────────────────────
  async function loadDropdownData() {
    try {
      var results = await Promise.all([
        FE2FilterService.getCountries(),
        FE2FilterService.getTeams(),
        FE2FilterService.getJobPositions(),
        FE2FilterService.getUsers()
      ]);

      var countries     = results[0];
      var teams         = results[1];
      allJobPositions   = results[2];
      allUsers          = results[3];

      // Countries (Thai-sorted)
      FE2Utils.sortCountriesByThai(countries).forEach(function (c) {
        var opt = document.createElement('option');
        opt.value = c.id;
        opt.textContent = c.name_th;
        elCountry.appendChild(opt);
      });

      // Teams
      teams.forEach(function (t) {
        var opt = document.createElement('option');
        opt.value = t.team_number;
        opt.textContent = 'Team ' + t.team_number;
        elTeam.appendChild(opt);
      });

      updateJobPositionOptions();
      updateUserOptions();
    } catch (err) {
      console.error('[OrderExternalSummary] loadDropdownData failed:', err);
    }
  }

  function updateJobPositionOptions() {
    var current = elJobPosition.value;
    // Clear all except first "ทุกตำแหน่ง"
    while (elJobPosition.options.length > 1) {
      elJobPosition.remove(1);
    }

    var positions = FE2Utils.filterAndDisplayJobPositions(
      allJobPositions,
      filters.team_number
    );

    positions.forEach(function (p) {
      var opt = document.createElement('option');
      opt.value = p.job_position;
      opt.textContent = p.display_name;
      if (p.job_position === current) opt.selected = true;
      elJobPosition.appendChild(opt);
    });

    // If current selection no longer valid, reset filter
    if (current && elJobPosition.value !== current) {
      filters.job_position = null;
    }
  }

  function updateUserOptions() {
    var teamId   = filters.team_number;
    var jobPos   = filters.job_position;

    var filtered = allUsers.filter(function (u) {
      if (teamId && u.team_number !== teamId) return false;
      if (jobPos && (!u.job_position || u.job_position.toLowerCase() !== jobPos.toLowerCase())) return false;
      return true;
    });

    while (elUser.options.length > 1) {
      elUser.remove(1);
    }

    filtered.forEach(function (u) {
      var opt = document.createElement('option');
      opt.value = u.ID;
      opt.textContent = u.nickname || (u.first_name + ' ' + u.last_name).trim();
      elUser.appendChild(opt);
    });

    // If previously selected user no longer in list, clear
    if (filters.user_id) {
      var still = filtered.find(function (u) { return u.ID === filters.user_id; });
      if (!still) {
        filters.user_id = null;
        elUser.value = '';
      }
    }
  }

  // ── Load report ────────────────────────────────────────────────────────────
  async function loadReport() {
    var elResults = document.getElementById('oes-results');
    elResults.innerHTML = renderLoading();

    try {
      var data = await OrderExternalAPI.fetch(filters);
      renderResults(data);
    } catch (err) {
      console.error('[OrderExternalSummary] API error:', err);
      elResults.innerHTML = renderError('เกิดข้อผิดพลาดในการโหลดข้อมูล กรุณาลองใหม่อีกครั้ง');
    }
  }

  // ── Render helpers ─────────────────────────────────────────────────────────
  function renderLoading() {
    return '<div class="oes-loading"><div class="oes-spinner"></div><span>กำลังโหลดข้อมูล Order แก้ย้อนหลัง...</span></div>';
  }

  function renderError(message) {
    return [
      '<div class="oes-error">',
      '  <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">',
      '    <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd"/>',
      '  </svg>',
      '  <p>' + escapeHtml(message) + '</p>',
      '</div>'
    ].join('\n');
  }

  function renderEmpty() {
    return [
      '<div class="oes-empty">',
      '  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">',
      '    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>',
      '  </svg>',
      '  <h3>ไม่พบข้อมูล</h3>',
      '  <p>ไม่พบข้อมูลตามเงื่อนไขที่เลือก</p>',
      '</div>'
    ].join('\n');
  }

  function renderResults(data) {
    var elResults = document.getElementById('oes-results');

    if (!data || data.length === 0) {
      elResults.innerHTML = renderEmpty();
      return;
    }

    // Summary metrics
    var totalOrders = data.length;
    var totalNet = 0, totalCommission = 0, totalDiscount = 0;
    data.forEach(function (item) {
      totalNet        += (item.net_amount || 0);
      totalCommission += (item.supplier_commission || 0);
      totalDiscount   += (item.discount || 0);
    });

    var fmt = FE2Utils.formatCurrency;

    var cards = [
      '<div class="oes-summary-cards">',

      // Orders count
      '<div class="oes-card">',
      '  <div class="oes-card-icon blue">',
      '    <svg width="22" height="22" fill="none" stroke="#2563eb" stroke-width="2" viewBox="0 0 24 24" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>',
      '  </div>',
      '  <div class="oes-card-body"><p class="label">จำนวน Orders</p><p class="value">' + totalOrders.toLocaleString() + '</p></div>',
      '</div>',

      // Net amount
      '<div class="oes-card">',
      '  <div class="oes-card-icon green">',
      '    <svg width="22" height="22" fill="none" stroke="#16a34a" stroke-width="2" viewBox="0 0 24 24" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1"/></svg>',
      '  </div>',
      '  <div class="oes-card-body"><p class="label">ยอดสุทธิรวม</p><p class="value">฿' + fmt(totalNet) + '</p></div>',
      '</div>',

      // Commission
      '<div class="oes-card">',
      '  <div class="oes-card-icon purple">',
      '    <svg width="22" height="22" fill="none" stroke="#7c3aed" stroke-width="2" viewBox="0 0 24 24" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"/></svg>',
      '  </div>',
      '  <div class="oes-card-body"><p class="label">ค่าคอมมิชชั่นรวม</p><p class="value">฿' + fmt(totalCommission) + '</p></div>',
      '</div>',

      // Discount
      '<div class="oes-card">',
      '  <div class="oes-card-icon red">',
      '    <svg width="22" height="22" fill="none" stroke="#dc2626" stroke-width="2" viewBox="0 0 24 24" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"/></svg>',
      '  </div>',
      '  <div class="oes-card-body"><p class="label">ส่วนลดรวม</p><p class="value">฿' + fmt(totalDiscount) + '</p></div>',
      '</div>',

      '</div>'
    ].join('\n');

    var rows = data.map(function (item) {
      return [
        '<tr>',
        '  <td><span class="oes-order-code">' + escapeHtml(item.order_code || '') + '</span></td>',
        '  <td>' + FE2Utils.formatDateTH(item.created_at) + '</td>',
        '  <td>' + escapeHtml(item.customer_name || '') + '</td>',
        '  <td class="text-right">฿' + fmt(item.net_amount || 0) + '</td>',
        '  <td class="text-right oes-commission">฿' + fmt(item.supplier_commission || 0) + '</td>',
        '  <td class="text-right oes-discount">฿' + fmt(item.discount || 0) + '</td>',
        '  <td>' + FE2Utils.formatDateTH(item.paid_at) + '</td>',
        '  <td>' + escapeHtml(item.seller_nickname || '-') + '</td>',
        '</tr>'
      ].join('\n');
    }).join('\n');

    var table = [
      '<div class="oes-table-section">',
      '  <div class="oes-table-header">',
      '    <h2>รายละเอียด Orders</h2>',
      '    <button class="oes-btn-export" id="oes-export-btn">',
      '      <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>',
      '      Export CSV',
      '    </button>',
      '  </div>',
      '  <div class="oes-table-scroll">',
      '    <table class="oes-table">',
      '      <thead>',
      '        <tr>',
      '          <th>รหัส Order</th>',
      '          <th>วันที่สร้าง Order</th>',
      '          <th>ชื่อลูกค้า</th>',
      '          <th class="text-right">ยอดสุทธิ</th>',
      '          <th class="text-right">ค่าคอมมิชชั่น</th>',
      '          <th class="text-right">ส่วนลด</th>',
      '          <th>วันที่ชำระเงิน</th>',
      '          <th>เซลล์ที่ทำ Order</th>',
      '        </tr>',
      '      </thead>',
      '      <tbody>',
      rows,
      '      </tbody>',
      '    </table>',
      '  </div>',
      '</div>'
    ].join('\n');

    elResults.innerHTML = cards + table;

    // Bind export
    document.getElementById('oes-export-btn').addEventListener('click', function () {
      exportCSV(data, { totalOrders: totalOrders, totalNet: totalNet, totalCommission: totalCommission, totalDiscount: totalDiscount });
    });
  }

  // ── CSV Export ─────────────────────────────────────────────────────────────
  function exportCSV(data, summary) {
    var fmt = FE2Utils.formatCurrency;
    var headers = [
      'รหัส Order',
      'วันที่สร้าง Order',
      'ชื่อลูกค้า',
      'ยอดสุทธิ (฿)',
      'ค่าคอมมิชชั่น (฿)',
      'ส่วนลด (฿)',
      'วันที่ชำระเงิน',
      'เซลล์ที่ทำ Order'
    ];

    var rows = data.map(function (item) {
      return [
        '"' + (item.order_code || '') + '"',
        FE2Utils.formatDateTH(item.created_at),
        '"' + (item.customer_name || '').replace(/"/g, '""') + '"',
        fmt(item.net_amount || 0),
        fmt(item.supplier_commission || 0),
        fmt(item.discount || 0),
        FE2Utils.formatDateTH(item.paid_at),
        '"' + (item.seller_nickname || '-') + '"'
      ].join(',');
    });

    var summaryRows = [
      '',
      'สรุปรวม',
      [
        '"จำนวน ' + summary.totalOrders + ' Orders"',
        '',
        '',
        fmt(summary.totalNet),
        fmt(summary.totalCommission),
        fmt(summary.totalDiscount),
        '',
        ''
      ].join(',')
    ];

    var csv = '﻿' + [headers.join(',')].concat(rows).concat(summaryRows).join('\n');
    var blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    var link = document.createElement('a');
    var now = new Date();
    var dateStr = now.toISOString().split('T')[0];
    var timeStr = now.toTimeString().split(' ')[0].replace(/:/g, '-');
    link.href = URL.createObjectURL(blob);
    link.download = 'order-external-summary-' + dateStr + '-' + timeStr + '.csv';
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  // ── Utility ────────────────────────────────────────────────────────────────
  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  // ── Entry point ────────────────────────────────────────────────────────────
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
