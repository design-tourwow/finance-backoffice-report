// request-discount.js — Request Discount Report Page
// Depends on: token-utils.js, fe2-auth-guard.js, fe2-utils.js, fe2-filter-service.js,
//             request-discount-api.js, Chart.js (CDN)

(function () {
  'use strict';

  // ---------------------------------------------------------------------------
  // State
  // ---------------------------------------------------------------------------

  var allOrdersData = [];      // raw API response, sorted by created_at desc
  var displayData   = [];      // after checkbox filters (showDiscountOnly / showUnpaidOnly)

  var filterState = {
    filterMode    : 'quarterly',
    year          : FE2Utils.getCurrentYear(),
    quarter       : FE2Utils.getCurrentQuarter(),
    month         : new Date().getMonth() + 1,
    country_id    : null,
    job_position  : null,
    team_number   : null,
    user_id       : null
  };

  var showDiscountOnly = true;
  var showUnpaidOnly   = false;

  var sortKey = null;
  var sortDir = 'asc';

  var currentPage  = 1;
  var ITEMS_PER_PAGE = 50;

  // Reference data
  var allCountries     = [];
  var allTeams         = [];
  var allJobPositions  = [];
  var allUsers         = [];
  var filteredUsers    = [];

  // Chart instances
  var chartAmount     = null;
  var chartPercent    = null;

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  var fmt = FE2Utils.formatCurrency;

  function formatDate(dateString) {
    return new Date(dateString).toLocaleDateString('th-TH', {
      year : 'numeric',
      month: 'short',
      day  : 'numeric'
    });
  }

  function escapeHtml(str) {
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function paymentStatusClass(statusList) {
    if (!statusList) return 'default';
    var s = String(statusList).toLowerCase();
    if (s.includes('pending')) return 'pending';
    if (s.includes('paid'))    return 'paid';
    return 'default';
  }

  // ---------------------------------------------------------------------------
  // In-memory filter (checkboxes only — no new API call)
  // ---------------------------------------------------------------------------

  function applyCheckboxFilters() {
    displayData = allOrdersData.filter(function (order) {
      if (showDiscountOnly && order.financial_metrics.discount < 1) return false;
      if (showUnpaidOnly && order.payment_details.status_list.toLowerCase().includes('paid')) return false;
      return true;
    });
    currentPage = 1;
  }

  // ---------------------------------------------------------------------------
  // Sales summary (computed from allOrdersData, matching React useMemo)
  // ---------------------------------------------------------------------------

  function buildSalesSummary() {
    var map = {};

    allOrdersData.forEach(function (order) {
      var name = order.sales_crm.seller_name;
      if (!map[name]) {
        map[name] = {
          seller_name       : name,
          orders_with_discount: 0,
          total_orders      : 0,
          total_discount    : 0,
          total_discount_pct: 0,
          total_net_amount  : 0,
          no_discount       : 0,
          discount_1_15     : 0,
          discount_15_20    : 0,
          discount_over_20  : 0
        };
      }

      var m   = map[name];
      var pct = order.financial_metrics.discount_percent;
      var has = order.financial_metrics.discount >= 1;

      m.total_orders++;
      if (has) m.orders_with_discount++;
      m.total_discount    += order.financial_metrics.discount;
      m.total_discount_pct += pct;
      m.total_net_amount  += order.financial_metrics.net_amount;

      if (pct === 0)               m.no_discount++;
      else if (pct <= 15)          m.discount_1_15++;
      else if (pct <= 20)          m.discount_15_20++;
      else                         m.discount_over_20++;
    });

    return Object.values(map).map(function (m) {
      return {
        seller_name        : m.seller_name,
        order_count        : m.orders_with_discount,
        total_orders       : m.total_orders,
        total_discount     : m.total_discount,
        avg_discount_percent: m.orders_with_discount > 0
          ? m.total_discount_pct / m.orders_with_discount
          : 0,
        total_net_amount   : m.total_net_amount,
        discount_breakdown : {
          no_discount    : m.no_discount,
          discount_1_15  : m.discount_1_15,
          discount_15_20 : m.discount_15_20,
          discount_over_20: m.discount_over_20
        }
      };
    }).sort(function (a, b) { return b.total_discount - a.total_discount; });
  }

  // ---------------------------------------------------------------------------
  // Overall metrics (computed from displayData)
  // ---------------------------------------------------------------------------

  function buildMetrics() {
    var totals = { orders: 0, discount: 0, netAmount: 0, commission: 0, discountPctSum: 0 };
    displayData.forEach(function (o) {
      totals.orders++;
      totals.discount      += o.financial_metrics.discount;
      totals.netAmount     += o.financial_metrics.net_amount;
      totals.commission    += o.financial_metrics.supplier_commission;
      totals.discountPctSum += o.financial_metrics.discount_percent;
    });
    totals.avgDiscountPct = totals.orders > 0 ? totals.discountPctSum / totals.orders : 0;
    return totals;
  }

  // ---------------------------------------------------------------------------
  // Sort displayData
  // ---------------------------------------------------------------------------

  function sortedData() {
    if (!sortKey) return displayData.slice();
    return displayData.slice().sort(function (a, b) {
      var va = resolveSort(a, sortKey);
      var vb = resolveSort(b, sortKey);
      if (va < vb) return sortDir === 'asc' ? -1 : 1;
      if (va > vb) return sortDir === 'asc' ?  1 : -1;
      return 0;
    });
  }

  function resolveSort(order, key) {
    switch (key) {
      case 'order_code':  return order.order_info.order_code;
      case 'created_at':  return new Date(order.order_info.created_at).getTime();
      case 'customer':    return order.customer_info.customer_name;
      case 'seller':      return order.sales_crm.seller_name;
      case 'crm':         return order.sales_crm.crm_name;
      case 'net_amount':  return order.financial_metrics.net_amount;
      case 'commission':  return order.financial_metrics.supplier_commission;
      case 'discount':    return order.financial_metrics.discount;
      case 'discount_pct': return order.financial_metrics.discount_percent;
      default: return 0;
    }
  }

  // ---------------------------------------------------------------------------
  // Render helpers
  // ---------------------------------------------------------------------------

  function el(id) { return document.getElementById(id); }

  function setHTML(id, html) {
    var node = el(id);
    if (node) node.innerHTML = html;
  }

  // ---------------------------------------------------------------------------
  // Render: filter panel
  // ---------------------------------------------------------------------------

  function renderFilterPanel() {
    var quarterOpts = FE2Utils.getQuarterOptions().map(function (o) {
      var val = o.year + '-' + o.quarter;
      var sel = (filterState.year === o.year && filterState.quarter === o.quarter) ? ' selected' : '';
      return '<option value="' + val + '"' + sel + '>' + escapeHtml(o.label) + '</option>';
    }).join('');

    var monthOpts = FE2Utils.getMonthOptions().map(function (o) {
      var sel = filterState.month === o.value ? ' selected' : '';
      return '<option value="' + o.value + '"' + sel + '>' + escapeHtml(o.label) + '</option>';
    }).join('');

    var yearOpts = FE2Utils.getYearOptions().map(function (y) {
      var sel = filterState.year === y ? ' selected' : '';
      return '<option value="' + y + '"' + sel + '>' + y + '</option>';
    }).join('');

    var countryOpts = '<option value="">ทุกประเทศ</option>' +
      FE2Utils.sortCountriesByThai(allCountries).map(function (c) {
        var sel = filterState.country_id === c.id ? ' selected' : '';
        return '<option value="' + c.id + '"' + sel + '>' + escapeHtml(c.name_th) + '</option>';
      }).join('');

    var jobOpts = '<option value="">ทุกตำแหน่ง</option>' +
      FE2Utils.filterAndDisplayJobPositions(allJobPositions).map(function (p) {
        var sel = filterState.job_position === p.job_position ? ' selected' : '';
        return '<option value="' + escapeHtml(p.job_position) + '"' + sel + '>' + escapeHtml(p.display_name) + '</option>';
      }).join('');

    var teamOpts = '<option value="">ทุกทีม</option>' +
      allTeams.map(function (t) {
        var sel = filterState.team_number === t.team_number ? ' selected' : '';
        return '<option value="' + t.team_number + '"' + sel + '>Team ' + t.team_number + '</option>';
      }).join('');

    var userOpts = '<option value="">ทุกคน</option>' +
      filteredUsers.map(function (u) {
        var name = u.nickname || ((u.first_name || '') + ' ' + (u.last_name || '')).trim();
        var sel  = filterState.user_id === u.ID ? ' selected' : '';
        return '<option value="' + u.ID + '"' + sel + '>' + escapeHtml(name) + '</option>';
      }).join('');

    var periodEl = '';
    if (filterState.filterMode === 'quarterly') {
      periodEl = '<div class="rd-filter-group">' +
        '<label>ไตรมาส</label>' +
        '<select id="rd-quarter-sel">' + quarterOpts + '</select>' +
        '</div>';
    } else if (filterState.filterMode === 'monthly') {
      periodEl = '<div class="rd-filter-group">' +
          '<label>เดือน</label>' +
          '<select id="rd-month-sel">' + monthOpts + '</select>' +
        '</div>' +
        '<div class="rd-filter-group">' +
          '<label>ปี</label>' +
          '<select id="rd-year-sel">' + yearOpts + '</select>' +
        '</div>';
    } else if (filterState.filterMode === 'yearly') {
      periodEl = '<div class="rd-filter-group">' +
        '<label>ปี</label>' +
        '<select id="rd-year-sel">' + yearOpts + '</select>' +
        '</div>';
    }

    var modeOpts = ['all', 'quarterly', 'monthly', 'yearly'].map(function (m) {
      var labels = { all: 'ทั้งหมด', quarterly: 'รายไตรมาส', monthly: 'รายเดือน', yearly: 'รายปี' };
      var sel = filterState.filterMode === m ? ' selected' : '';
      return '<option value="' + m + '"' + sel + '>' + labels[m] + '</option>';
    }).join('');

    var html = '<div class="rd-filter-panel">' +
      '<h2>ตัวกรอง</h2>' +
      '<div class="rd-filter-grid">' +
        '<div class="rd-filter-group">' +
          '<label>รูปแบบรายงาน</label>' +
          '<select id="rd-mode-sel">' + modeOpts + '</select>' +
        '</div>' +
        periodEl +
        '<div class="rd-filter-group">' +
          '<label>ประเทศ</label>' +
          '<select id="rd-country-sel">' + countryOpts + '</select>' +
        '</div>' +
        '<div class="rd-filter-group">' +
          '<label>ตำแหน่งงาน</label>' +
          '<select id="rd-job-sel">' + jobOpts + '</select>' +
        '</div>' +
        '<div class="rd-filter-group">' +
          '<label>ทีม</label>' +
          '<select id="rd-team-sel">' + teamOpts + '</select>' +
        '</div>' +
        '<div class="rd-filter-group">' +
          '<label>ผู้ใช้</label>' +
          '<select id="rd-user-sel">' + userOpts + '</select>' +
        '</div>' +
      '</div>' +
      '</div>';

    setHTML('rd-filter-container', html);
    bindFilterEvents();
  }

  // ---------------------------------------------------------------------------
  // Bind filter events
  // ---------------------------------------------------------------------------

  function bindFilterEvents() {
    var modeSel    = el('rd-mode-sel');
    var countrySel = el('rd-country-sel');
    var jobSel     = el('rd-job-sel');
    var teamSel    = el('rd-team-sel');
    var userSel    = el('rd-user-sel');
    var quarterSel = el('rd-quarter-sel');
    var monthSel   = el('rd-month-sel');
    var yearSel    = el('rd-year-sel');

    if (modeSel) modeSel.addEventListener('change', function () {
      filterState.filterMode = this.value;
      if (this.value === 'quarterly') {
        filterState.quarter = FE2Utils.getCurrentQuarter();
        filterState.year    = FE2Utils.getCurrentYear();
      } else if (this.value === 'monthly') {
        filterState.month = new Date().getMonth() + 1;
      }
      loadData();
    });

    if (quarterSel) quarterSel.addEventListener('change', function () {
      var parts = this.value.split('-');
      filterState.year    = parseInt(parts[0], 10);
      filterState.quarter = parseInt(parts[1], 10);
      loadData();
    });

    if (monthSel) monthSel.addEventListener('change', function () {
      filterState.month = parseInt(this.value, 10);
      loadData();
    });

    if (yearSel) yearSel.addEventListener('change', function () {
      filterState.year = parseInt(this.value, 10);
      loadData();
    });

    if (countrySel) countrySel.addEventListener('change', function () {
      filterState.country_id = this.value ? parseInt(this.value, 10) : null;
      loadData();
    });

    if (jobSel) jobSel.addEventListener('change', function () {
      filterState.job_position = this.value || null;
      filterState.user_id = null;
      updateFilteredUsers();
      renderFilterPanel();
      loadData();
    });

    if (teamSel) teamSel.addEventListener('change', function () {
      filterState.team_number = this.value ? parseInt(this.value, 10) : null;
      filterState.user_id = null;
      updateFilteredUsers();
      renderFilterPanel();
      loadData();
    });

    if (userSel) userSel.addEventListener('change', function () {
      filterState.user_id = this.value ? parseInt(this.value, 10) : null;
      loadData();
    });
  }

  function updateFilteredUsers() {
    filteredUsers = allUsers.filter(function (u) {
      if (filterState.team_number && u.team_number !== filterState.team_number) return false;
      if (filterState.job_position && u.job_position &&
          u.job_position.toLowerCase() !== filterState.job_position.toLowerCase()) return false;
      return true;
    });

    if (filterState.user_id && !filteredUsers.find(function (u) { return u.ID === filterState.user_id; })) {
      filterState.user_id = null;
    }
  }

  // ---------------------------------------------------------------------------
  // Render: loading / error
  // ---------------------------------------------------------------------------

  function showLoading() {
    setHTML('rd-content', '');
    setHTML('rd-error-container', '');
    setHTML('rd-loading-container',
      '<div class="rd-loading">' +
        '<div class="rd-spinner"></div>' +
        '<span>กำลังโหลดข้อมูล Order Discount...</span>' +
      '</div>');
  }

  function hideLoading() {
    setHTML('rd-loading-container', '');
  }

  function showError(msg) {
    setHTML('rd-error-container',
      '<div class="rd-error">' +
        '<svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">' +
          '<path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd"/>' +
        '</svg>' +
        '<span>' + escapeHtml(msg) + '</span>' +
      '</div>');
  }

  function clearError() {
    setHTML('rd-error-container', '');
  }

  // ---------------------------------------------------------------------------
  // Render: KPI cards
  // ---------------------------------------------------------------------------

  function renderKPI(metrics) {
    return '<div class="rd-kpi-grid">' +
      kpiCard('blue',
        '<svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>',
        'Total Orders', metrics.orders.toLocaleString()) +
      kpiCard('red',
        '<svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"/></svg>',
        'ส่วนลดรวม', '฿' + fmt(metrics.discount)) +
      kpiCard('green',
        '<svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1"/></svg>',
        'ยอดสุทธิ', '฿' + fmt(metrics.netAmount)) +
      kpiCard('purple',
        '<svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 8v8m-4-5v5m-4-2v2m-2 4h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>',
        '% ส่วนลดเฉลี่ย', Math.round(metrics.avgDiscountPct) + '%') +
    '</div>';
  }

  function kpiCard(color, icon, label, value) {
    return '<div class="rd-kpi-card">' +
      '<div class="rd-kpi-icon ' + color + '">' + icon + '</div>' +
      '<div><div class="rd-kpi-label">' + escapeHtml(label) + '</div>' +
           '<div class="rd-kpi-value">' + escapeHtml(value) + '</div></div>' +
    '</div>';
  }

  // ---------------------------------------------------------------------------
  // Render: Top Sales summary table
  // ---------------------------------------------------------------------------

  function renderSalesSummary(summary) {
    if (summary.length === 0) return '';

    var rows = summary.map(function (s, i) {
      var rowClass = i === 0 ? 'rd-rank-1' : i === 1 ? 'rd-rank-2' : i === 2 ? 'rd-rank-3' : '';
      var badgeClass = i < 3 ? 'rd-rank-badge top' : 'rd-rank-badge';
      var flame = i === 0 ? ' <span style="color:#dc2626">&#128162;</span>' : '';
      var discRatio = s.total_orders > 0 ? Math.round((s.order_count / s.total_orders) * 100) : 0;

      var bd = s.discount_breakdown || {};
      return '<tr class="' + rowClass + '">' +
        '<td><span class="' + badgeClass + '">' + (i + 1) + '</span></td>' +
        '<td><span style="font-weight:600;color:#111827">' + escapeHtml(s.seller_name) + '</span>' + flame + '</td>' +
        '<td class="center">' +
          '<div class="rd-breakdown">' +
            '<div class="rd-breakdown-row"><span style="color:#6b7280">ไม่ขอส่วนลด:</span><span>' + (bd.no_discount||0) + ' Order</span></div>' +
            '<div class="rd-breakdown-row"><span style="color:#2563eb">1-15%:</span><span style="color:#2563eb">' + (bd.discount_1_15||0) + ' Orders</span></div>' +
            '<div class="rd-breakdown-row"><span style="color:#ea580c">15-20%:</span><span style="color:#ea580c">' + (bd.discount_15_20||0) + ' Orders</span></div>' +
            '<div class="rd-breakdown-row"><span style="color:#dc2626">20%+:</span><span style="color:#dc2626">' + (bd.discount_over_20||0) + ' Orders</span></div>' +
          '</div>' +
        '</td>' +
        '<td class="center">' +
          '<span style="font-weight:600;color:#2563eb">' + s.order_count + '</span>' +
          '<span style="color:#9ca3af"> / </span>' +
          '<span>' + s.total_orders + '</span>' +
          '<div style="font-size:.72rem;color:#6b7280">(' + discRatio + '% มีส่วนลด)</div>' +
        '</td>' +
        '<td class="right" style="color:#ea580c;font-weight:600">' + Math.round(s.avg_discount_percent) + '%</td>' +
        '<td class="right" style="color:#dc2626;font-weight:600">฿' + fmt(s.total_discount) + '</td>' +
      '</tr>';
    }).join('');

    return '<div class="rd-card">' +
      '<div class="rd-card-header">' +
        '<h2>Top Sales ที่ให้ส่วนลดมากที่สุด</h2>' +
        '<p>เรียงตามจำนวนเงินส่วนลดรวมสูงสุด</p>' +
      '</div>' +
      '<div class="rd-table-wrap">' +
        '<table class="rd-table">' +
          '<thead><tr>' +
            '<th>อันดับ</th>' +
            '<th>เซลล์</th>' +
            '<th class="center">สัดส่วน % ส่วนลด</th>' +
            '<th class="center">Order มีส่วนลด / ทั้งหมด</th>' +
            '<th class="right">% เฉลี่ยส่วนลด</th>' +
            '<th class="right">ส่วนลดรวม</th>' +
          '</tr></thead>' +
          '<tbody>' + rows + '</tbody>' +
        '</table>' +
      '</div>' +
    '</div>';
  }

  // ---------------------------------------------------------------------------
  // Render: Charts
  // ---------------------------------------------------------------------------

  function renderChartsHTML() {
    return '<div class="rd-charts-grid">' +
      '<div class="rd-chart-card">' +
        '<h2>Top 8 ส่วนลด (จำนวนเงิน)</h2>' +
        '<div class="rd-chart-container"><canvas id="rd-chart-amount"></canvas></div>' +
      '</div>' +
      '<div class="rd-chart-card">' +
        '<h2>Top 10 ส่วนลด (เปอร์เซ็นต์)</h2>' +
        '<div class="rd-chart-container"><canvas id="rd-chart-percent"></canvas></div>' +
      '</div>' +
    '</div>';
  }

  function drawCharts(summary) {
    if (typeof Chart === 'undefined') {
      console.warn('[RequestDiscount] Chart.js not loaded');
      return;
    }

    // Destroy existing
    if (chartAmount) { chartAmount.destroy(); chartAmount = null; }
    if (chartPercent) { chartPercent.destroy(); chartPercent = null; }

    // Amount chart — top 8 by total_discount
    var amountData = summary.slice(0, 8);
    var amountLabels = amountData.map(function (s) {
      return s.seller_name.length > 15 ? s.seller_name.substring(0, 15) + '...' : s.seller_name;
    });

    var ctxA = el('rd-chart-amount');
    if (ctxA) {
      chartAmount = new Chart(ctxA, {
        type: 'bar',
        data: {
          labels: amountLabels,
          datasets: [{
            label: 'ส่วนลด (฿)',
            data : amountData.map(function (s) { return s.total_discount; }),
            backgroundColor: '#EF4444'
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { position: 'top' },
            tooltip: {
              callbacks: {
                label: function (ctx) {
                  var s = amountData[ctx.dataIndex];
                  return [
                    'ส่วนลด: ฿' + fmt(ctx.raw),
                    'Orders: ' + s.order_count,
                    'เฉลี่ย: ' + Math.round(s.avg_discount_percent) + '%'
                  ];
                }
              }
            }
          },
          scales: {
            x: { ticks: { maxRotation: 45, minRotation: 45, font: { size: 11 } } },
            y: { beginAtZero: true }
          }
        }
      });
    }

    // Percentage chart — top 10 by avg_discount_percent
    var pctData = summary.slice().sort(function (a, b) {
      return b.avg_discount_percent - a.avg_discount_percent;
    }).slice(0, 10);

    var pctLabels = pctData.map(function (s) {
      return s.seller_name.length > 15 ? s.seller_name.substring(0, 15) + '...' : s.seller_name;
    });

    var ctxP = el('rd-chart-percent');
    if (ctxP) {
      chartPercent = new Chart(ctxP, {
        type: 'bar',
        data: {
          labels: pctLabels,
          datasets: [{
            label: 'ส่วนลด (%)',
            data : pctData.map(function (s) { return s.avg_discount_percent; }),
            backgroundColor: '#FF8042'
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { position: 'top' },
            tooltip: {
              callbacks: {
                label: function (ctx) {
                  var s = pctData[ctx.dataIndex];
                  return [
                    'ส่วนลด: ' + Math.round(ctx.raw) + '%',
                    'จำนวนเงิน: ฿' + fmt(s.total_discount),
                    'Orders: ' + s.order_count
                  ];
                }
              }
            }
          },
          scales: {
            x: { ticks: { maxRotation: 45, minRotation: 45, font: { size: 11 } } },
            y: { beginAtZero: true }
          }
        }
      });
    }
  }

  // ---------------------------------------------------------------------------
  // Render: Orders detail table
  // ---------------------------------------------------------------------------

  function renderOrdersTable(metrics) {
    var sorted = sortedData();
    var total  = sorted.length;
    var start  = (currentPage - 1) * ITEMS_PER_PAGE;
    var end    = Math.min(start + ITEMS_PER_PAGE, total);
    var page   = sorted.slice(start, end);

    var subtitleMap = {
      'both'   : 'แสดงเฉพาะ Order ที่มีส่วนลด ≥ ฿1 และยังไม่ชำระเงิน',
      'disc'   : 'แสดงเฉพาะ Order ที่มีส่วนลด ≥ ฿1',
      'unpaid' : 'แสดงเฉพาะ Order ที่ยังไม่ชำระเงิน',
      'all'    : 'แสดง Order ทั้งหมด'
    };
    var subtitleKey = showDiscountOnly && showUnpaidOnly ? 'both'
                    : showDiscountOnly ? 'disc'
                    : showUnpaidOnly   ? 'unpaid'
                    : 'all';

    function sortTh(label, key, align) {
      var cls = 'sortable' + (align ? ' ' + align : '');
      var icon = '&#8597;';
      if (sortKey === key) {
        cls += ' sort-' + sortDir;
        icon = sortDir === 'asc' ? '&#8593;' : '&#8595;';
      }
      return '<th class="' + cls + '" data-sort="' + key + '">' +
        label + '<i class="rd-sort-icon">' + icon + '</i>' +
      '</th>';
    }

    var rows = page.length === 0
      ? '<tr><td colspan="11" style="text-align:center;padding:32px;color:#9ca3af">ไม่พบข้อมูล</td></tr>'
      : page.map(function (o) {
          var sc = paymentStatusClass(o.payment_details.status_list);
          return '<tr>' +
            '<td><span style="font-weight:600;color:#2563eb">' + escapeHtml(o.order_info.order_code) + '</span></td>' +
            '<td style="color:#6b7280">' + formatDate(o.order_info.created_at) + '</td>' +
            '<td style="font-weight:500">' + escapeHtml(o.customer_info.customer_name) + '</td>' +
            '<td>' + escapeHtml(o.sales_crm.seller_name) + '</td>' +
            '<td style="color:#6b7280">' + escapeHtml(o.sales_crm.crm_name) + '</td>' +
            '<td class="right" style="font-weight:500">฿' + fmt(o.financial_metrics.net_amount) + '</td>' +
            '<td class="right" style="color:#2563eb">฿' + fmt(o.financial_metrics.supplier_commission) + '</td>' +
            '<td class="right" style="font-weight:600;color:#dc2626">฿' + fmt(o.financial_metrics.discount) + '</td>' +
            '<td class="right" style="font-weight:600;color:#ea580c">' + Math.round(o.financial_metrics.discount_percent) + '%</td>' +
            '<td class="center">' +
              '<span class="rd-status-badge ' + sc + '">' +
                o.payment_details.paid_installments + '/' + o.payment_details.total_installments +
              '</span>' +
              '<div style="font-size:.7rem;color:#6b7280;margin-top:2px">งวด</div>' +
            '</td>' +
            '<td class="center" style="font-size:.75rem;max-width:100px;white-space:normal">' +
              escapeHtml(o.payment_details.status_list) +
            '</td>' +
          '</tr>';
        }).join('');

    var tableHTML =
      '<div class="rd-card">' +
        '<div class="rd-card-header">' +
          '<div class="rd-card-header-row">' +
            '<div>' +
              '<h2>รายละเอียด Orders</h2>' +
              '<p>' + subtitleMap[subtitleKey] + '</p>' +
            '</div>' +
            '<div class="rd-table-controls">' +
              '<button class="rd-export-btn" id="rd-export-btn">' +
                '<svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>' +
                'Export CSV' +
              '</button>' +
              '<label class="rd-checkbox-label">' +
                '<input type="checkbox" id="rd-chk-discount"' + (showDiscountOnly ? ' checked' : '') + '>' +
                'แสดงเฉพาะ Order ที่มีส่วนลด' +
              '</label>' +
              '<label class="rd-checkbox-label">' +
                '<input type="checkbox" id="rd-chk-unpaid"' + (showUnpaidOnly ? ' checked' : '') + '>' +
                'แสดงเฉพาะ Order ที่ยังไม่ชำระเงิน' +
              '</label>' +
            '</div>' +
          '</div>' +
        '</div>' +
        '<div class="rd-table-wrap">' +
          '<table class="rd-table">' +
            '<thead><tr>' +
              sortTh('Order Code', 'order_code', '') +
              sortTh('วันที่สร้าง', 'created_at', '') +
              sortTh('ลูกค้า', 'customer', '') +
              sortTh('เซลล์', 'seller', '') +
              sortTh('CRM', 'crm', '') +
              sortTh('ยอดสุทธิ', 'net_amount', 'right') +
              sortTh('คอมมิชชั่น', 'commission', 'right') +
              sortTh('ส่วนลด', 'discount', 'right') +
              sortTh('% ส่วนลด', 'discount_pct', 'right') +
              '<th class="center">การชำระเงิน</th>' +
              '<th class="center">สถานะ</th>' +
            '</tr></thead>' +
            '<tbody>' + rows + '</tbody>' +
          '</table>' +
        '</div>' +
        // Footer
        '<div class="rd-table-footer">' +
          '<span>แสดง ' + (total === 0 ? 0 : start + 1) + '-' + end + ' จาก ' + total + ' รายการ</span>' +
          '<div class="rd-table-footer-amounts">' +
            '<span>ยอดสุทธิรวม: <b>฿' + fmt(metrics.netAmount) + '</b></span>' +
            '<span>ส่วนลดรวม: <b style="color:#dc2626">฿' + fmt(metrics.discount) + '</b></span>' +
            '<span>คอมมิชชั่นรวม: <b style="color:#2563eb">฿' + fmt(metrics.commission) + '</b></span>' +
          '</div>' +
        '</div>' +
        renderPagination(total) +
      '</div>';

    return tableHTML;
  }

  function renderPagination(total) {
    var totalPages = Math.ceil(total / ITEMS_PER_PAGE);
    if (totalPages <= 1) return '';

    var pageBtns = '';

    // Prev
    pageBtns += '<button class="rd-page-btn" data-page="' + (currentPage - 1) + '"' +
      (currentPage === 1 ? ' disabled' : '') + '>ก่อนหน้า</button>';

    // Page numbers (max 5 visible)
    var startP, endP;
    if (totalPages <= 5) {
      startP = 1; endP = totalPages;
    } else if (currentPage <= 3) {
      startP = 1; endP = 5;
    } else if (currentPage >= totalPages - 2) {
      startP = totalPages - 4; endP = totalPages;
    } else {
      startP = currentPage - 2; endP = currentPage + 2;
    }

    for (var p = startP; p <= endP; p++) {
      pageBtns += '<button class="rd-page-btn' + (p === currentPage ? ' active' : '') +
        '" data-page="' + p + '">' + p + '</button>';
    }

    // Next
    pageBtns += '<button class="rd-page-btn" data-page="' + (currentPage + 1) + '"' +
      (currentPage === totalPages ? ' disabled' : '') + '>ถัดไป</button>';

    return '<div class="rd-pagination">' +
      '<span>หน้า ' + currentPage + ' จาก ' + totalPages + '</span>' +
      '<div class="rd-page-btns">' + pageBtns + '</div>' +
    '</div>';
  }

  // ---------------------------------------------------------------------------
  // Render full content (called after data load or checkbox change)
  // ---------------------------------------------------------------------------

  function renderContent() {
    if (allOrdersData.length === 0 && displayData.length === 0) {
      setHTML('rd-content',
        '<div class="rd-card"><div class="rd-empty">' +
          '<svg width="48" height="48" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>' +
          '<h3>ไม่พบข้อมูล</h3>' +
          '<p>ไม่พบ Order ที่มีส่วนลดตามเงื่อนไขที่เลือก</p>' +
        '</div></div>');
      return;
    }

    var summary = buildSalesSummary();
    var metrics = buildMetrics();

    var html =
      renderKPI(metrics) +
      renderSalesSummary(summary) +
      renderChartsHTML() +
      renderOrdersTable(metrics);

    setHTML('rd-content', html);

    drawCharts(summary);
    bindContentEvents();
  }

  // ---------------------------------------------------------------------------
  // Bind table/checkbox/sort/pagination events
  // ---------------------------------------------------------------------------

  function bindContentEvents() {
    // Sort headers
    var ths = document.querySelectorAll('#rd-content th.sortable');
    ths.forEach(function (th) {
      th.addEventListener('click', function () {
        var key = this.getAttribute('data-sort');
        if (sortKey === key) {
          sortDir = sortDir === 'asc' ? 'desc' : 'asc';
        } else {
          sortKey = key;
          sortDir = 'asc';
        }
        currentPage = 1;
        renderContent();
      });
    });

    // Pagination
    var pageBtns = document.querySelectorAll('#rd-content .rd-page-btn');
    pageBtns.forEach(function (btn) {
      btn.addEventListener('click', function () {
        var p = parseInt(this.getAttribute('data-page'), 10);
        if (!isNaN(p) && p >= 1) {
          currentPage = p;
          renderContent();
        }
      });
    });

    // Checkboxes (in-memory filter — NO new API call)
    var chkDiscount = el('rd-chk-discount');
    var chkUnpaid   = el('rd-chk-unpaid');

    if (chkDiscount) chkDiscount.addEventListener('change', function () {
      showDiscountOnly = this.checked;
      applyCheckboxFilters();
      renderContent();
    });

    if (chkUnpaid) chkUnpaid.addEventListener('change', function () {
      showUnpaidOnly = this.checked;
      applyCheckboxFilters();
      renderContent();
    });

    // Export CSV
    var exportBtn = el('rd-export-btn');
    if (exportBtn) exportBtn.addEventListener('click', exportCSV);
  }

  // ---------------------------------------------------------------------------
  // Export CSV
  // ---------------------------------------------------------------------------

  function exportCSV() {
    var headers = [
      'Order Code', 'วันที่สร้าง', 'ลูกค้า', 'เซลล์', 'CRM',
      'ยอดสุทธิ (฿)', 'คอมมิชชั่น (฿)', 'ส่วนลด (฿)', 'เปอร์เซ็นต์ส่วนลด (%)',
      'การชำระเงิน (งวด)', 'สถานะการชำระ'
    ];

    var metrics = buildMetrics();
    var sorted  = sortedData();

    var rows = [headers.join(',')].concat(sorted.map(function (o) {
      return [
        '"' + o.order_info.order_code + '"',
        '"' + formatDate(o.order_info.created_at) + '"',
        '"' + o.customer_info.customer_name + '"',
        '"' + o.sales_crm.seller_name + '"',
        '"' + o.sales_crm.crm_name + '"',
        fmt(o.financial_metrics.net_amount),
        fmt(o.financial_metrics.supplier_commission),
        fmt(o.financial_metrics.discount),
        Math.round(o.financial_metrics.discount_percent),
        '"' + o.payment_details.paid_installments + '/' + o.payment_details.total_installments + '"',
        '"' + o.payment_details.status_list + '"'
      ].join(',');
    }));

    rows.push('');
    rows.push('สรุปรวม');
    rows.push([
      'รวมทั้งหมด', '', '', '', '',
      fmt(metrics.netAmount),
      fmt(metrics.commission),
      fmt(metrics.discount),
      Math.round(metrics.avgDiscountPct),
      '"' + metrics.orders + ' Orders"',
      ''
    ].join(','));

    var csv  = '﻿' + rows.join('\n');
    var blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    var link = document.createElement('a');
    var now  = new Date();
    var dateStr = now.toISOString().split('T')[0];
    var timeStr = now.toTimeString().split(' ')[0].replace(/:/g, '-');
    link.setAttribute('href', URL.createObjectURL(blob));
    link.setAttribute('download', 'order-discount-report-' + dateStr + '-' + timeStr + '.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  // ---------------------------------------------------------------------------
  // Load data from API
  // ---------------------------------------------------------------------------

  async function loadData() {
    showLoading();
    clearError();

    try {
      var raw = await RequestDiscountAPI.fetch(filterState);

      if (raw && Array.isArray(raw)) {
        allOrdersData = raw.sort(function (a, b) {
          return new Date(b.order_info.created_at).getTime() -
                 new Date(a.order_info.created_at).getTime();
        });
      } else {
        allOrdersData = [];
      }

      applyCheckboxFilters();

    } catch (err) {
      console.error('[RequestDiscount] loadData failed:', err);
      showError('เกิดข้อผิดพลาดในการโหลดข้อมูล: ' + (err.message || 'กรุณาลองใหม่อีกครั้ง'));
      allOrdersData = [];
      displayData   = [];
    }

    hideLoading();

    // Re-render filter panel to reflect current state (preserves user's selections)
    renderFilterPanel();
    renderContent();
  }

  // ---------------------------------------------------------------------------
  // Page scaffold
  // ---------------------------------------------------------------------------

  function renderScaffold() {
    var container = el('page-content');
    if (!container) return;

    container.innerHTML =
      '<div id="rd-filter-container"></div>' +
      '<div id="rd-error-container"></div>' +
      '<div id="rd-loading-container"></div>' +
      '<div id="rd-content"></div>';
  }

  // ---------------------------------------------------------------------------
  // Initialise
  // ---------------------------------------------------------------------------

  async function init() {
    renderScaffold();

    // Load filter reference data in parallel
    try {
      var results = await Promise.all([
        FE2FilterService.getCountries(),
        FE2FilterService.getTeams(),
        FE2FilterService.getJobPositions(),
        FE2FilterService.getUsers()
      ]);
      allCountries    = results[0] || [];
      allTeams        = results[1] || [];
      allJobPositions = results[2] || [];
      allUsers        = results[3] || [];
      filteredUsers   = allUsers.slice();
    } catch (e) {
      console.warn('[RequestDiscount] init filter data error:', e);
    }

    renderFilterPanel();
    await loadData();
  }

  document.addEventListener('DOMContentLoaded', init);

})();
