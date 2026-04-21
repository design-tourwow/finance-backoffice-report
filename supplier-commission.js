// supplier-commission.js
// Supplier Commission report page — vanilla JS
// Depends on: fe2-utils.js, fe2-filter-service.js, supplier-commission-api.js,
//             fe2-ui.js, fe2-chart.js, fe2-table.js, fe2-csv.js, fe2-filter-panel.js,
//             Chart.js (CDN)

(function () {
  'use strict';

  var SORT_FIELDS = [
    { key: 'total_commission',           label: 'Total Comm.',          align: 'right'  },
    { key: 'total_net_commission',       label: 'Net Comm.',            align: 'right'  },
    { key: 'total_pax',                  label: 'จำนวนผู้เดินทาง',      align: 'center' },
    { key: 'avg_commission_per_pax',     label: 'Avg Comm.(ต่อคน)',     align: 'right'  },
    { key: 'avg_net_commission_per_pax', label: 'Avg Net(สุทธิต่อคน)',  align: 'right'  }
  ];

  var reportData    = [];
  var sortField     = 'total_commission';
  var sortDir       = 'desc';
  var chartInstance = null;

  var filterState = {
    mode         : 'quarterly',
    year         : null,
    quarter      : null,
    month        : new Date().getMonth() + 1,
    country_id   : null,
    team_number  : null,
    job_position : null,
    user_id      : null
  };

  // Dropdown option caches populated once from FE2FilterService.
  var filterOptions = {
    countries    : [],
    teams        : [],
    jobPositions : [],
    users        : []
  };

  document.addEventListener('DOMContentLoaded', function () {
    filterState.year    = window.FE2Utils.getCurrentYear();
    filterState.quarter = window.FE2Utils.getCurrentQuarter();

    renderShell();
    loadFilterOptions().then(function () {
      renderFilterPanel();
      applyFilters();
    });
  });

  function renderShell() {
    var pc = document.getElementById('page-content');
    if (!pc) return;
    pc.innerHTML =
      '<div id="sc-filter-container"></div>' +
      '<div id="sc-results"></div>';
  }

  async function loadFilterOptions() {
    try {
      var results = await Promise.all([
        window.FE2FilterService.getCountries(),
        window.FE2FilterService.getTeams(),
        window.FE2FilterService.getJobPositions(),
        window.FE2FilterService.getUsers()
      ]);
      filterOptions.countries    = results[0] || [];
      filterOptions.teams        = results[1] || [];
      filterOptions.jobPositions = results[2] || [];
      filterOptions.users        = results[3] || [];
    } catch (err) {
      console.warn('[SupplierCommission] loadFilterOptions error:', err);
    }
  }

  function renderFilterPanel() {
    var container = document.getElementById('sc-filter-container');
    if (!container) return;
    window.FE2FilterPanel.render({
      containerEl: container,
      state      : filterState,
      options    : filterOptions,
      onChange   : function (next) { filterState = next; },
      onApply    : function (next) { filterState = next; applyFilters(); }
    });
  }

  async function applyFilters() {
    var params = {};
    if (filterState.mode !== 'all') params.year = filterState.year;
    if (filterState.mode === 'quarterly') params.quarter = filterState.quarter;
    else if (filterState.mode === 'monthly') params.month = filterState.month;
    if (filterState.country_id)   params.country_id   = filterState.country_id;
    if (filterState.team_number)  params.team_number  = filterState.team_number;
    if (filterState.job_position) params.job_position = filterState.job_position;
    if (filterState.user_id)      params.user_id      = filterState.user_id;

    var resultsEl = getResultsEl();
    if (!resultsEl) return;
    resultsEl.innerHTML = '';
    window.FE2UI.showLoading(resultsEl, 'กำลังโหลดข้อมูล Supplier Commission...');

    try {
      var data = await window.SupplierCommissionAPI.fetchReport(params);
      reportData = Array.isArray(data) ? data.slice() : [];
      sortField = 'total_commission';
      sortDir   = 'desc';
      sortReportData();
      renderResults();
    } catch (err) {
      console.error('[SupplierCommission] applyFilters error:', err);
      window.FE2UI.hideLoading(resultsEl);
      window.FE2UI.showError(
        resultsEl,
        'เกิดข้อผิดพลาดในการโหลดข้อมูล: ' + (err.message || 'กรุณาลองใหม่อีกครั้ง'),
        { retryFn: applyFilters }
      );
    }
  }

  function getResultsEl() {
    return document.getElementById('sc-results');
  }

  function sortReportData() {
    reportData.sort(function (a, b) {
      var av = a.metrics ? a.metrics[sortField] : 0;
      var bv = b.metrics ? b.metrics[sortField] : 0;
      return sortDir === 'desc' ? bv - av : av - bv;
    });
  }

  function renderResults() {
    var el = getResultsEl();
    if (!el) return;

    if (!reportData.length) {
      el.innerHTML =
        '<div class="sc-empty-state">' +
          '<svg fill="none" viewBox="0 0 24 24" stroke="#d1d5db" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>' +
          '<p>ไม่พบข้อมูลตามเงื่อนไขที่เลือก</p>' +
        '</div>';
      return;
    }

    el.innerHTML =
      '<div class="sc-chart-card">' +
        '<h2>Top 10 Supplier Commission</h2>' +
        '<div class="sc-chart-wrapper"><canvas id="sc-chart"></canvas></div>' +
      '</div>' +
      '<div class="sc-table-card">' +
        '<div class="sc-table-header">' +
          '<h2>รายละเอียด Supplier</h2>' +
          '<button class="sc-btn-export" id="sc-export-btn">' +
            '<svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>' +
            'Export CSV' +
          '</button>' +
        '</div>' +
        '<div id="sc-table-container"></div>' +
      '</div>';

    renderChart();
    renderTable();
    document.getElementById('sc-export-btn').addEventListener('click', exportCSV);
  }

  function renderChart() {
    var canvas = document.getElementById('sc-chart');
    if (!canvas) return;

    var top10 = reportData.slice()
      .sort(function (a, b) { return b.metrics.total_commission - a.metrics.total_commission; })
      .slice(0, 10);

    var labels = top10.map(function (item) {
      var name = item.supplier_name_th || item.supplier_name_en || 'N/A';
      return name.length > 15 ? name.substring(0, 15) + '...' : name;
    });
    var fullNames = top10.map(function (item) {
      return (item.supplier_name_th || '') +
        (item.supplier_name_en ? ' (' + item.supplier_name_en + ')' : '');
    });

    chartInstance = window.FE2Chart.createBarChart({
      canvasEl: canvas,
      previous: chartInstance,
      labels  : labels,
      datasets: [
        {
          label: 'Total Commission',
          data : top10.map(function (i) { return i.metrics.total_commission; }),
          backgroundColor: 'rgba(59, 130, 246, 0.7)',
          borderColor    : 'rgba(59, 130, 246, 1)',
          borderWidth    : 1
        },
        {
          label: 'Net Commission',
          data : top10.map(function (i) { return i.metrics.total_net_commission; }),
          backgroundColor: 'rgba(16, 185, 129, 0.7)',
          borderColor    : 'rgba(16, 185, 129, 1)',
          borderWidth    : 1
        }
      ],
      options: {
        plugins: {
          tooltip: {
            callbacks: {
              title: function (items) { return fullNames[items[0].dataIndex] || labels[items[0].dataIndex]; },
              label: function (item)  { return item.dataset.label + ': ฿' + window.FE2Utils.formatCurrency(item.parsed.y); }
            }
          }
        }
      }
    });
  }

  function renderTable() {
    var container = document.getElementById('sc-table-container');
    if (!container) return;

    var columns = [
      {
        key: 'supplier',
        label: 'Supplier Name',
        sortable: false,
        align: 'left',
        format: function (_v, row) {
          return '<div class="sc-supplier-name-th">' + escHtml(row.supplier_name_th || '') + '</div>' +
                 '<div class="sc-supplier-name-en">' + escHtml(row.supplier_name_en || '') + '</div>';
        }
      }
    ].concat(SORT_FIELDS.map(function (f) {
      return {
        key     : f.key,
        label   : f.label,
        align   : f.align,
        sortable: true,
        format  : buildMetricFormatter(f.key)
      };
    }));

    window.FE2Table.render({
      containerEl: container,
      columns    : columns,
      rows       : reportData,
      sortKey    : sortField,
      sortDir    : sortDir,
      onSort     : function (key) {
        if (sortField === key) {
          sortDir = sortDir === 'desc' ? 'asc' : 'desc';
        } else {
          sortField = key;
          sortDir   = 'desc';
        }
        sortReportData();
        renderTable();
      }
    });
  }

  function buildMetricFormatter(key) {
    if (key === 'total_pax') {
      return function (_v, row) {
        return '<span class="sc-pax-badge">' + Number(row.metrics.total_pax).toLocaleString() + '</span>';
      };
    }
    var cellClass = key === 'total_net_commission' ? ' sc-net-value'
                  : key === 'avg_commission_per_pax' ? ' sc-avg-value'
                  : '';
    return function (_v, row) {
      return '<span class="' + cellClass.trim() + '">฿' +
        window.FE2Utils.formatCurrency(row.metrics[key]) + '</span>';
    };
  }

  function exportCSV() {
    var headers = [
      'Supplier Name (TH)',
      'Supplier Name (EN)',
      'Total Commission',
      'Net Commission',
      'Total PAX',
      'Avg Commission Per PAX',
      'Avg Net Commission Per PAX'
    ];
    var rows = reportData.map(function (item) {
      var m = item.metrics || {};
      return [
        item.supplier_name_th || '',
        item.supplier_name_en || '',
        m.total_commission,
        m.total_net_commission,
        m.total_pax,
        m.avg_commission_per_pax,
        m.avg_net_commission_per_pax
      ];
    });
    var dateStr = new Date().toISOString().split('T')[0].replace(/-/g, '');
    window.FE2CSV.export({
      filename: 'supplier-commission-' + dateStr + '.csv',
      headers : headers,
      rows    : rows
    });
  }

  function escHtml(str) {
    return String(str == null ? '' : str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

})();
