// request-discount.js — Request Discount Report Page
// Depends on: token-utils.js, shared-auth-guard.js, shared-utils.js, shared-http.js,
//             shared-filter-service.js, shared-ui.js, shared-chart.js, shared-table.js,
//             shared-csv.js, filter-sort-dropdown-component.js, filter-search-dropdown-component.js,
//             report-filter-panel-component.js, request-discount-api.js, Chart.js.

(function () {
  'use strict';

  // ---------------------------------------------------------------------------
  // State
  // ---------------------------------------------------------------------------

  // allOrdersData: raw API response sorted by created_at desc.
  //   Refetched ONLY when API-side filters change (period / country / team /
  //   job / user). Checkbox toggles filter it in-memory — no new API call.
  // displayData: subset of allOrdersData after checkbox filters.
  var allOrdersData = [];
  var displayData   = [];

  var filterState = {
    filterMode    : 'quarterly',
    year          : SharedUtils.getCurrentYear(),
    quarter       : SharedUtils.getCurrentQuarter(),
    month         : new Date().getMonth() + 1,
    country_id    : null,
    job_position  : null,
    team_number   : null,
    user_id       : null
  };

  var showDiscountOnly = true;
  var showUnpaidOnly   = false;

  var sortKey = 'created_at';
  var sortDir = 'desc';

  var currentPage  = 1;
  var ITEMS_PER_PAGE = 50;

  // Reference data
  var allCountries    = [];
  var allTeams        = [];
  var allJobPositions = [];
  var allUsers        = [];

  // Chart instances
  var chartAmount  = null;
  var chartPercent = null;

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  var fmt = SharedUtils.formatCurrency;

  function formatDate(dateString) {
    return new Date(dateString).toLocaleDateString('th-TH', {
      year : 'numeric',
      month: 'short',
      day  : 'numeric'
    });
  }

  function escapeHtml(str) {
    return String(str == null ? '' : str)
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

  function el(id) { return document.getElementById(id); }
  function setHTML(id, html) {
    var node = el(id);
    if (node) node.innerHTML = html;
  }

  // ---------------------------------------------------------------------------
  // In-memory checkbox filter (Story 6.3) — NO API call on toggle
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
  // Sales summary (computed from allOrdersData, not displayData)
  // ---------------------------------------------------------------------------

  function buildSalesSummary() {
    var map = {};

    allOrdersData.forEach(function (order) {
      var name = order.sales_crm.seller_name;
      if (!map[name]) {
        map[name] = {
          seller_name         : name,
          orders_with_discount: 0,
          total_orders        : 0,
          total_discount      : 0,
          total_discount_pct  : 0,
          total_net_amount    : 0,
          no_discount         : 0,
          discount_1_15       : 0,
          discount_15_20      : 0,
          discount_over_20    : 0
        };
      }

      var m   = map[name];
      var pct = order.financial_metrics.discount_percent;
      var has = order.financial_metrics.discount >= 1;

      m.total_orders++;
      if (has) m.orders_with_discount++;
      m.total_discount     += order.financial_metrics.discount;
      m.total_discount_pct += pct;
      m.total_net_amount   += order.financial_metrics.net_amount;

      if      (pct === 0)  m.no_discount++;
      else if (pct <= 15)  m.discount_1_15++;
      else if (pct <= 20)  m.discount_15_20++;
      else                 m.discount_over_20++;
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
  // Overall metrics (computed from allOrdersData, not displayData — per spec)
  // ---------------------------------------------------------------------------

  function buildMetrics(source) {
    var rows = source || allOrdersData;
    var totals = { orders: 0, discount: 0, netAmount: 0, commission: 0, discountPctSum: 0 };
    rows.forEach(function (o) {
      totals.orders++;
      totals.discount       += o.financial_metrics.discount;
      totals.netAmount      += o.financial_metrics.net_amount;
      totals.commission     += o.financial_metrics.supplier_commission;
      totals.discountPctSum += o.financial_metrics.discount_percent;
    });
    totals.avgDiscountPct = totals.orders > 0 ? totals.discountPctSum / totals.orders : 0;
    return totals;
  }

  // ---------------------------------------------------------------------------
  // Sort displayData (SharedTable provides head UI only; sorting is our concern)
  // ---------------------------------------------------------------------------

  function sortedData() {
    if (!sortKey) return displayData.slice();
    var dir = sortDir === 'asc' ? 1 : -1;
    return displayData.slice().sort(function (a, b) {
      var va = resolveSort(a, sortKey);
      var vb = resolveSort(b, sortKey);
      if (va < vb) return -1 * dir;
      if (va > vb) return  1 * dir;
      return 0;
    });
  }

  function resolveSort(order, key) {
    switch (key) {
      case 'order_code':   return order.order_info.order_code;
      case 'created_at':   return new Date(order.order_info.created_at).getTime();
      case 'customer':     return order.customer_info.customer_name;
      case 'seller':       return order.sales_crm.seller_name;
      case 'crm':          return order.sales_crm.crm_name;
      case 'net_amount':   return order.financial_metrics.net_amount;
      case 'commission':   return order.financial_metrics.supplier_commission;
      case 'discount':     return order.financial_metrics.discount;
      case 'discount_pct': return order.financial_metrics.discount_percent;
      default: return 0;
    }
  }

  // ---------------------------------------------------------------------------
  // Filter panel (ReportFilterPanel)
  // ---------------------------------------------------------------------------

  function renderFilterPanel() {
    // ReportFilterPanel uses `mode`; this page's legacy state uses `filterMode`.
    // Wrap the state with a getter/setter proxy so the panel reads/writes to
    // filterState.filterMode transparently.
    var panelState = {
      year        : filterState.year,
      quarter     : filterState.quarter,
      month       : filterState.month,
      country_id  : filterState.country_id,
      team_number : filterState.team_number,
      job_position: filterState.job_position,
      user_id     : filterState.user_id
    };
    Object.defineProperty(panelState, 'mode', {
      get: function () { return filterState.filterMode; },
      set: function (v) { filterState.filterMode = v; },
      enumerable: true
    });

    window.ReportFilterPanel.init({
      containerId: 'rd-filter-container',
      state      : panelState,
      options    : {
        countries   : allCountries,
        teams       : allTeams,
        jobPositions: allJobPositions,
        users       : allUsers
      },
      prefix     : 'rd',
      onApply    : function (next) {
        filterState.year         = next.year;
        filterState.quarter      = next.quarter;
        filterState.month        = next.month;
        filterState.country_id   = next.country_id;
        filterState.team_number  = next.team_number;
        filterState.job_position = next.job_position;
        filterState.user_id      = next.user_id;
        loadData();
      }
    });
  }

  // ---------------------------------------------------------------------------
  // KPI cards
  // ---------------------------------------------------------------------------

  function renderKPI(metrics) {
    return '<div class="rd-kpi-grid">' +
      kpiCard('blue',
        '<svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>',
        'Total Orders', metrics.orders.toLocaleString()) +
      kpiCard('red',
        '<svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"/></svg>',
        'ส่วนลดรวม', '฿' + fmt(metrics.discount)) +
      kpiCard('green',
        '<svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>',
        'ยอดสุทธิ', '฿' + fmt(metrics.netAmount)) +
      kpiCard('purple',
        '<svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 8v8m-4-5v5m-4-2v2m-2 4h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>',
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
  // Top-sales summary table
  // ---------------------------------------------------------------------------

  function renderSalesSummary(summary) {
    if (summary.length === 0) return '';

    var rows = summary.map(function (s, i) {
      var rowClass  = i === 0 ? 'rd-rank-1' : i === 1 ? 'rd-rank-2' : i === 2 ? 'rd-rank-3' : '';
      var badgeClass = i < 3 ? 'rd-rank-badge top' : 'rd-rank-badge';
      var flame     = i === 0 ? ' <span style="color:#dc2626">&#128162;</span>' : '';
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
  // Charts (SharedChart)
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

  function truncate(name) {
    return name.length > 15 ? name.substring(0, 15) + '...' : name;
  }

  function drawCharts(summary) {
    var amountData = summary.slice(0, 8);
    var ctxA = el('rd-chart-amount');
    if (ctxA) {
      chartAmount = SharedChart.createBarChart({
        canvasEl: ctxA,
        previous: chartAmount,
        labels  : amountData.map(function (s) { return truncate(s.seller_name); }),
        datasets: [{
          label: 'ส่วนลด (฿)',
          data : amountData.map(function (s) { return s.total_discount; }),
          backgroundColor: '#EF4444',
          borderWidth: 0
        }],
        options: {
          plugins: {
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
          }
        }
      });
    }

    var pctData = summary.slice().sort(function (a, b) {
      return b.avg_discount_percent - a.avg_discount_percent;
    }).slice(0, 10);

    var ctxP = el('rd-chart-percent');
    if (ctxP) {
      chartPercent = SharedChart.createBarChart({
        canvasEl: ctxP,
        previous: chartPercent,
        labels  : pctData.map(function (s) { return truncate(s.seller_name); }),
        datasets: [{
          label: 'ส่วนลด (%)',
          data : pctData.map(function (s) { return s.avg_discount_percent; }),
          backgroundColor: '#FF8042',
          borderWidth: 0
        }],
        options: {
          scales: {
            y: {
              beginAtZero: true,
              ticks: { callback: function (v) { return v + '%'; } }
            }
          },
          plugins: {
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
          }
        }
      });
    }
  }

  // ---------------------------------------------------------------------------
  // Orders detail table (SharedTable)
  // ---------------------------------------------------------------------------

  var ORDER_COLUMNS = [
    { key: 'order_code',   label: 'Order Code',   align: 'left',
      format: function (_, o) {
        return '<span style="font-weight:600;color:#2563eb">' + escapeHtml(o.order_info.order_code) + '</span>';
      } },
    { key: 'created_at',   label: 'วันที่สร้าง',   align: 'left',
      format: function (_, o) {
        return '<span style="color:#6b7280">' + escapeHtml(formatDate(o.order_info.created_at)) + '</span>';
      } },
    { key: 'customer',     label: 'ลูกค้า',        align: 'left',
      format: function (_, o) {
        return '<span style="font-weight:500">' + escapeHtml(o.customer_info.customer_name) + '</span>';
      } },
    { key: 'seller',       label: 'เซลล์',         align: 'left',
      format: function (_, o) { return escapeHtml(o.sales_crm.seller_name); } },
    { key: 'crm',          label: 'CRM',          align: 'left',
      format: function (_, o) {
        return '<span style="color:#6b7280">' + escapeHtml(o.sales_crm.crm_name) + '</span>';
      } },
    { key: 'net_amount',   label: 'ยอดสุทธิ',      align: 'right',
      format: function (_, o) {
        return '<span style="font-weight:500">฿' + fmt(o.financial_metrics.net_amount) + '</span>';
      } },
    { key: 'commission',   label: 'คอมมิชชั่น',    align: 'right',
      format: function (_, o) {
        return '<span style="color:#2563eb">฿' + fmt(o.financial_metrics.supplier_commission) + '</span>';
      } },
    { key: 'discount',     label: 'ส่วนลด',        align: 'right',
      format: function (_, o) {
        return '<span style="font-weight:600;color:#dc2626">฿' + fmt(o.financial_metrics.discount) + '</span>';
      } },
    { key: 'discount_pct', label: '% ส่วนลด',      align: 'right',
      format: function (_, o) {
        return '<span style="font-weight:600;color:#ea580c">' + Math.round(o.financial_metrics.discount_percent) + '%</span>';
      } },
    { key: 'installments', label: 'การชำระเงิน',   align: 'center', sortable: false,
      format: function (_, o) {
        var sc = paymentStatusClass(o.payment_details.status_list);
        return '<span class="rd-status-badge ' + sc + '">' +
                 o.payment_details.paid_installments + '/' + o.payment_details.total_installments +
               '</span>' +
               '<div style="font-size:.7rem;color:#6b7280;margin-top:2px">งวด</div>';
      } },
    { key: 'status',       label: 'สถานะ',         align: 'center', sortable: false,
      format: function (_, o) {
        return '<span style="font-size:.75rem">' + escapeHtml(o.payment_details.status_list) + '</span>';
      } }
  ];

  function renderOrdersTable(metrics) {
    var sorted = sortedData();
    var total  = sorted.length;
    var start  = (currentPage - 1) * ITEMS_PER_PAGE;
    var end    = Math.min(start + ITEMS_PER_PAGE, total);
    var page   = sorted.slice(start, end);

    var subtitleMap = {
      'both'  : 'แสดงเฉพาะ Order ที่มีส่วนลด ≥ ฿1 และยังไม่ชำระเงิน',
      'disc'  : 'แสดงเฉพาะ Order ที่มีส่วนลด ≥ ฿1',
      'unpaid': 'แสดงเฉพาะ Order ที่ยังไม่ชำระเงิน',
      'all'   : 'แสดง Order ทั้งหมด'
    };
    var subtitleKey = showDiscountOnly && showUnpaidOnly ? 'both'
                    : showDiscountOnly ? 'disc'
                    : showUnpaidOnly   ? 'unpaid'
                    : 'all';

    var html =
      '<div class="rd-card">' +
        '<div class="rd-card-header">' +
          '<div class="rd-card-header-row">' +
            '<div>' +
              '<h2>รายละเอียด Orders</h2>' +
              '<p>' + subtitleMap[subtitleKey] + '</p>' +
            '</div>' +
            '<div class="rd-table-controls">' +
              window.SharedExportButton.render({ id: 'rd-export-btn' }) +
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
        '<div id="rd-orders-table"></div>' +
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

    return { html: html, rows: page };
  }

  function mountOrdersTable(rows) {
    var container = el('rd-orders-table');
    if (!container) return;
    SharedTable.render({
      containerEl: container,
      columns    : ORDER_COLUMNS,
      rows       : rows,
      sortKey    : sortKey,
      sortDir    : sortDir,
      onSort     : function (key) {
        if (sortKey === key) {
          sortDir = sortDir === 'asc' ? 'desc' : 'asc';
        } else {
          sortKey = key;
          sortDir = 'asc';
        }
        currentPage = 1;
        renderContent();
      }
    });
  }

  function renderPagination(total) {
    var totalPages = Math.ceil(total / ITEMS_PER_PAGE);
    if (totalPages <= 1) return '';

    var pageBtns = '';
    pageBtns += '<button class="rd-page-btn" data-page="' + (currentPage - 1) + '"' +
      (currentPage === 1 ? ' disabled' : '') + '>ก่อนหน้า</button>';

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

    pageBtns += '<button class="rd-page-btn" data-page="' + (currentPage + 1) + '"' +
      (currentPage === totalPages ? ' disabled' : '') + '>ถัดไป</button>';

    return '<div class="rd-pagination">' +
      '<span>หน้า ' + currentPage + ' จาก ' + totalPages + '</span>' +
      '<div class="rd-page-btns">' + pageBtns + '</div>' +
    '</div>';
  }

  // ---------------------------------------------------------------------------
  // Render full content
  // ---------------------------------------------------------------------------

  function renderContent() {
    if (allOrdersData.length === 0) {
      setHTML('rd-content',
        '<div class="rd-card"><div class="rd-empty">' +
          '<svg width="48" height="48" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>' +
          '<h3>ไม่พบข้อมูล</h3>' +
          '<p>ไม่พบ Order ที่มีส่วนลดตามเงื่อนไขที่เลือก</p>' +
        '</div></div>');
      return;
    }

    // Chart + KPI + sales summary derive from allOrdersData; table from displayData.
    var summary      = buildSalesSummary();
    var kpiMetrics   = buildMetrics(allOrdersData);
    var tableMetrics = buildMetrics(displayData);
    var tablePacket  = renderOrdersTable(tableMetrics);

    var html =
      renderKPI(kpiMetrics) +
      renderSalesSummary(summary) +
      renderChartsHTML() +
      tablePacket.html;

    setHTML('rd-content', html);

    drawCharts(summary);
    mountOrdersTable(tablePacket.rows);
    bindContentEvents();
  }

  // ---------------------------------------------------------------------------
  // Bind content events (pagination / checkboxes / export)
  // ---------------------------------------------------------------------------

  function bindContentEvents() {
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

    // Checkbox toggles — in-memory filter, NO API call (Story 6.3)
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

    var exportBtn = el('rd-export-btn');
    if (exportBtn) exportBtn.addEventListener('click', exportCSV);

    // Scroll-hint fade on the Top-Sales summary table (hand-rolled markup,
    // not SharedTable — SharedTable wires this up itself in shared-table.js).
    var rdWrap = document.querySelector('#rd-content .rd-table-wrap');
    if (rdWrap) {
      var updateRdHint = function () {
        var atEnd = rdWrap.scrollLeft + rdWrap.clientWidth >= rdWrap.scrollWidth - 2;
        var noScroll = rdWrap.scrollWidth <= rdWrap.clientWidth;
        rdWrap.classList.toggle('shared-hint-hidden', atEnd || noScroll);
      };
      rdWrap.addEventListener('scroll', updateRdHint);
      window.addEventListener('resize', updateRdHint);
      setTimeout(updateRdHint, 0);
    }
  }

  // ---------------------------------------------------------------------------
  // Export CSV (SharedCSV)
  // ---------------------------------------------------------------------------

  function exportCSV() {
    var headers = [
      'Order Code', 'วันที่สร้าง', 'ลูกค้า', 'เซลล์', 'CRM',
      'ยอดสุทธิ (฿)', 'คอมมิชชั่น (฿)', 'ส่วนลด (฿)', 'เปอร์เซ็นต์ส่วนลด (%)',
      'การชำระเงิน (งวด)', 'สถานะการชำระ'
    ];

    var metrics = buildMetrics(displayData);
    var sorted  = sortedData();

    var rows = sorted.map(function (o) {
      return [
        o.order_info.order_code,
        formatDate(o.order_info.created_at),
        o.customer_info.customer_name,
        o.sales_crm.seller_name,
        o.sales_crm.crm_name,
        fmt(o.financial_metrics.net_amount),
        fmt(o.financial_metrics.supplier_commission),
        fmt(o.financial_metrics.discount),
        Math.round(o.financial_metrics.discount_percent),
        o.payment_details.paid_installments + '/' + o.payment_details.total_installments,
        o.payment_details.status_list
      ];
    });

    rows.push([]);
    rows.push(['สรุปรวม']);
    rows.push([
      'รวมทั้งหมด', '', '', '', '',
      fmt(metrics.netAmount),
      fmt(metrics.commission),
      fmt(metrics.discount),
      Math.round(metrics.avgDiscountPct),
      metrics.orders + ' Orders',
      ''
    ]);

    var now = new Date();
    var ymd = now.getFullYear() + String(now.getMonth() + 1).padStart(2, '0') + String(now.getDate()).padStart(2, '0');

    SharedCSV.export({
      filename: 'request-discount-' + ymd,
      headers : headers,
      rows    : rows
    });
  }

  // ---------------------------------------------------------------------------
  // Load data from API
  // ---------------------------------------------------------------------------

  async function loadData() {
    var loadingEl = el('rd-loading-container');
    var errorEl   = el('rd-error-container');

    SharedUI.hideError(errorEl);
    SharedUI.showLoading(loadingEl, 'กำลังโหลดข้อมูล Order Discount...');
    setHTML('rd-content', '');

    try {
      var raw = await RequestDiscountAPI.fetch(filterState);

      allOrdersData = (raw && Array.isArray(raw))
        ? raw.sort(function (a, b) {
            return new Date(b.order_info.created_at).getTime() -
                   new Date(a.order_info.created_at).getTime();
          })
        : [];

      applyCheckboxFilters();
    } catch (err) {
      console.error('[RequestDiscount] loadData failed:', err);
      SharedUI.showError(errorEl,
        'เกิดข้อผิดพลาดในการโหลดข้อมูล: ' + (err.message || 'กรุณาลองใหม่อีกครั้ง'),
        { retryFn: loadData });
      allOrdersData = [];
      displayData   = [];
    }

    SharedUI.hideLoading(loadingEl);
    renderContent();
  }

  // ---------------------------------------------------------------------------
  // Scaffold + init
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

  async function init() {
    renderScaffold();

    try {
      var results = await Promise.all([
        SharedFilterService.getCountries(),
        SharedFilterService.getTeams(),
        SharedFilterService.getJobPositions(),
        SharedFilterService.getUsers()
      ]);
      allCountries    = results[0] || [];
      allTeams        = results[1] || [];
      allJobPositions = results[2] || [];
      allUsers        = results[3] || [];
    } catch (e) {
      console.warn('[RequestDiscount] init filter data error:', e);
    }

    renderFilterPanel();
    await loadData();
  }

  document.addEventListener('DOMContentLoaded', init);

})();
