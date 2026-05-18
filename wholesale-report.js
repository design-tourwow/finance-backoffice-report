// Wholesales Report (Order Date / Check-in Date)
(function () {
  'use strict';

  const utils = window.SharedUtils;

  // ── State ──────────────────────────────────────────────────────────────────
  let currentData         = [];
  let filteredData        = [];
  let tableSearchQuery    = '';
  let availablePeriods    = null;
  let periodInstance      = null;
  let periodState         = null;
  let countryDropInstance = null;
  let supplierDropInstance= null;
  let dateTypeDropInstance= null;
  let countryOptionsCache = [];
  let supplierOptionsCache= [];
  let selectedDateType    = 'order_date'; // 'order_date' | 'travel_date'
  let tableSortKey        = null;
  let tableSortDir        = 'desc';

  // ── Init ───────────────────────────────────────────────────────────────────
  document.addEventListener('DOMContentLoaded', function () {
    init();
  });

  async function init() {
    renderFilterShell();
    initPeriodSelector();
    mountDateTypeDropdown();
    initFormHandler();

    try {
      const [periodsRes] = await Promise.all([
        WholesaleReportAPI.getAvailablePeriods()
      ]);
      if (periodsRes && periodsRes.success && periodsRes.data) {
        availablePeriods = periodsRes.data;
        if (periodInstance && periodInstance.destroy) { periodInstance.destroy(); periodInstance = null; }
        initPeriodSelector();
      }
    } catch (e) { /* non-fatal */ }

    await initFilters();
    await loadReport();
  }

  // ── Render filter shell ────────────────────────────────────────────────────
  function renderFilterShell() {
    const section = document.getElementById('reportContentSection');
    if (!section) return;
    section.innerHTML = `
      <div class="wr-wrapper">

        <!-- Hidden value holders — outside the grid so they don't affect :last-child selectors -->
        <input type="hidden" id="wrSupplierId" value="">
        <input type="hidden" id="wrCountryId" value="">

        <div class="filter-wrap filter-wrap-stacked">

          <!-- แถว 1: ดูตาม (1 col) + Period mode+value (spans 2 cols) -->
          <div class="filter-row wr-filter-row">
            <div class="wr-filter-field">
              <span class="time-granularity-label wr-filter-label">ประเภทวันที่</span>
              <div class="wr-filter-control" id="wrDateTypeContainer"></div>
            </div>
            <div class="wr-filter-field">
              <span class="time-granularity-label wr-filter-label" id="wrPeriodLabel">วันที่สร้าง Order</span>
              <div class="wr-filter-control" id="wrPeriodModeHost"></div>
              <div class="wr-filter-control" id="wrPeriodValueHost"></div>
            </div>
          </div>

          <!-- แถว 2: Wholesale (1 col) + ประเทศ (1 col) -->
          <div class="filter-row wr-filter-row">
            <div class="wr-filter-field">
              <span class="time-granularity-label wr-filter-label">Wholesale</span>
              <div class="wr-filter-control" id="wrSupplierWrapper"></div>
            </div>
            <div class="wr-filter-field">
              <span class="time-granularity-label wr-filter-label">ประเทศ</span>
              <div class="wr-filter-control" id="wrCountryWrapper"></div>
            </div>
          </div>

          <!-- แถว 3: Actions -->
          <div class="filter-row wr-filter-actions-row">
            <div id="wrFilterActionsHost"></div>
          </div>

        </div>

        <div id="wrResults"></div>
      </div>
    `;
  }

  // ── Date type dropdown ─────────────────────────────────────────────────────
  function mountDateTypeDropdown(activeValue) {
    activeValue = activeValue || 'order_date';
    if (dateTypeDropInstance && dateTypeDropInstance.destroy) {
      dateTypeDropInstance.destroy();
      dateTypeDropInstance = null;
    }
    const options = [
      { value: 'order_date',  label: 'วันที่สร้าง Order', active: activeValue === 'order_date' },
      { value: 'travel_date', label: 'วันที่เดินทาง',     active: activeValue === 'travel_date' }
    ];
    const activeOpt = options.find(function (o) { return o.active; }) || options[0];
    dateTypeDropInstance = FilterSortDropdownComponent.initDropdown({
      containerId : 'wrDateTypeContainer',
      defaultLabel: activeOpt.label,
      options     : options,
      onChange    : function (value) {
        selectedDateType = value;
        const label = document.getElementById('wrPeriodLabel');
        if (label) {
          label.textContent = value === 'travel_date' ? 'วันที่เดินทาง' : 'วันที่สร้าง Order';
        }
      }
    });
  }

  // ── Filters ────────────────────────────────────────────────────────────────
  async function initFilters() {
    try {
      const [countriesRes, suppliersRes] = await Promise.all([
        WholesaleReportAPI.getCountries(),
        WholesaleReportAPI.getSuppliers()
      ]);

      if (countriesRes && countriesRes.success && countriesRes.data) {
        countryOptionsCache = countriesRes.data;
      }
      if (suppliersRes && suppliersRes.success && suppliersRes.data) {
        supplierOptionsCache = suppliersRes.data.map(function (s) {
          return {
            value : String(s.id),
            label : (s.name_th || '') + (s.name_en ? ' (' + s.name_en + ')' : ''),
            active: false
          };
        });
      }

      mountSupplierDropdown(supplierOptionsCache);
      mountCountryDropdown(countryOptionsCache);
    } catch (e) {
      console.error('initFilters error', e);
    }
  }

  function mountSupplierDropdown(options) {
    supplierDropInstance = window.FilterSearchDropdown.init({
      containerId : 'wrSupplierWrapper',
      defaultLabel: 'Wholesale ทั้งหมด',
      placeholder : 'ค้นหา Wholesale...',
      options     : options,
      multiSelect : true,
      onChange    : function (csv, values) {
        document.getElementById('wrSupplierId').value = (values || []).join(',');
      }
    });
  }

  function mountCountryDropdown(rawCountries) {
    var flags = window.CountryFlags;
    var options = (rawCountries || []).map(function (c) {
      return {
        value : String(c.id),
        label : c.name_th || c.name_en || ('#' + c.id),
        icon  : flags && flags.iconFor ? flags.iconFor(c, { size: 18 }) : '',
        active: false
      };
    });
    countryDropInstance = window.FilterSearchDropdown.init({
      containerId : 'wrCountryWrapper',
      defaultLabel: 'ประเทศทั้งหมด',
      defaultIcon : '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>',
      placeholder : 'ค้นหาประเทศ...',
      options     : options,
      multiSelect : true,
      onChange    : function (csv, values) {
        document.getElementById('wrCountryId').value = (values || []).join(',');
      }
    });
  }

  // ── Period selector ────────────────────────────────────────────────────────
  function getDefaultMonthlyPeriodState() {
    const now = new Date();
    return {
      mode   : 'monthly',
      year   : now.getFullYear(),
      quarter: Math.ceil((now.getMonth() + 1) / 3),
      month  : now.getMonth() + 1
    };
  }

  function initPeriodSelector() {
    if (!window.SharedPeriodSelector) return;
    periodState = getDefaultMonthlyPeriodState();
    periodInstance = window.SharedPeriodSelector.mount({
      modeContainerId : 'wrPeriodModeHost',
      valueContainerId: 'wrPeriodValueHost',
      availablePeriods: availablePeriods,
      multiSelect     : false,
      initialState    : periodState,
      onChange        : function (s) { periodState = s; }
    });
  }

  // ── Form handler ───────────────────────────────────────────────────────────
  function initFormHandler() {
    if (window.SharedFilterActions) {
      window.SharedFilterActions.mount({
        containerId: 'wrFilterActionsHost',
        onSearch   : function () { loadReport(); },
        onReset    : resetFilters,
        resetLabel : 'รีเซ็ต'
      });
    }
  }

  function resetFilters() {
    selectedDateType = 'order_date';
    mountDateTypeDropdown('order_date');
    const label = document.getElementById('wrPeriodLabel');
    if (label) label.textContent = 'วันที่สร้าง Order';

    if (supplierDropInstance && supplierDropInstance.destroy) supplierDropInstance.destroy();
    if (countryDropInstance  && countryDropInstance.destroy)  countryDropInstance.destroy();
    mountSupplierDropdown(supplierOptionsCache.map(function (o) { return Object.assign({}, o, { active: false }); }));
    mountCountryDropdown(countryOptionsCache);
    document.getElementById('wrSupplierId').value = '';
    document.getElementById('wrCountryId').value  = '';

    if (periodInstance && periodInstance.destroy) { periodInstance.destroy(); periodInstance = null; }
    initPeriodSelector();

    currentData      = [];
    filteredData     = [];
    tableSearchQuery = '';
    tableSortKey     = null;
    tableSortDir     = 'desc';

    document.getElementById('wrResults').innerHTML = '';
  }

  // ── Load report ────────────────────────────────────────────────────────────
  async function loadReport() {
    const resultsEl = document.getElementById('wrResults');
    if (!resultsEl) return;

    // Clear any stale card before showing spinner (fixes stale-table-during-refetch)
    resultsEl.innerHTML = '';
    // Default sort by the active date column A→Z on each fresh search
    tableSortKey = selectedDateType === 'travel_date' ? 'travel_date' : 'order_date';
    tableSortDir = 'asc';
    tableSearchQuery = '';

    window.SharedUI.showLoading(resultsEl, 'กำลังโหลดข้อมูล...');

    const filters = buildFilters();

    try {
      const res = await WholesaleReportAPI.getOrders(filters);
      if (res && res.success) {
        currentData = res.data || [];
        renderTable(currentData);
      } else {
        window.SharedUI.showError(resultsEl, 'ไม่สามารถโหลดข้อมูลได้', { retryFn: loadReport });
      }
    } catch (e) {
      console.error('loadReport error', e);
      window.SharedUI.showError(resultsEl, 'เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง', { retryFn: loadReport });
    }
  }

  function buildFilters() {
    const filters = { date_type: selectedDateType };

    if (periodState && window.SharedPeriodSelector && window.SharedPeriodSelector.toDateRange) {
      const range = window.SharedPeriodSelector.toDateRange(periodState);
      if (range && range.dateFrom) filters.date_from = range.dateFrom;
      if (range && range.dateTo)   filters.date_to   = range.dateTo;
    }

    const supplierId = document.getElementById('wrSupplierId').value;
    const countryId  = document.getElementById('wrCountryId').value;
    if (supplierId) filters.supplier_id = supplierId;
    if (countryId)  filters.country_id  = countryId;

    return filters;
  }

  // ── KPI Cards ──────────────────────────────────────────────────────────────
  function renderKpiCards(data) {
    var kpiArea = document.getElementById('wr-kpi-area');
    if (!kpiArea) return;

    var totalAmount      = data.reduce(function (s, r) { return s + (Number(r.amount) || 0); }, 0);
    var totalOrders      = data.length;
    var totalTravelers   = data.reduce(function (s, r) { return s + (Number(r.traveler_count) || 0); }, 0);
    var distinctWholesales = new Set(data.map(function (r) { return r.supplier_name_th || r.supplier_id || ''; })).size;

    if (document.getElementById('wr-kpi-total-amount')) {
      document.getElementById('wr-kpi-total-amount').textContent    = utils.formatCurrency(totalAmount);
      document.getElementById('wr-kpi-total-orders').textContent    = totalOrders.toLocaleString();
      document.getElementById('wr-kpi-total-travelers').textContent = totalTravelers.toLocaleString();
      document.getElementById('wr-kpi-wholesales').textContent      = distinctWholesales.toLocaleString();
      return;
    }

    kpiArea.innerHTML =
      '<div class="dashboard-kpi-cards">' +

        '<div class="dashboard-kpi-card kpi-growth">' +
          '<div class="kpi-icon">' +
            '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/></svg>' +
          '</div>' +
          '<div class="kpi-content">' +
            '<div class="kpi-label">โอนให้ Wholesale รวม</div>' +
            '<div class="kpi-value" id="wr-kpi-total-amount">' + utils.formatCurrency(totalAmount) + '</div>' +
            '<div class="kpi-subtext">บาท</div>' +
          '</div>' +
        '</div>' +

        '<div class="dashboard-kpi-card kpi-travelers">' +
          '<div class="kpi-icon">' +
            '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>' +
          '</div>' +
          '<div class="kpi-content">' +
            '<div class="kpi-label">จำนวน Order</div>' +
            '<div class="kpi-value" id="wr-kpi-total-orders">' + totalOrders.toLocaleString() + '</div>' +
            '<div class="kpi-subtext">รายการ</div>' +
          '</div>' +
        '</div>' +

        '<div class="dashboard-kpi-card kpi-active">' +
          '<div class="kpi-icon">' +
            '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>' +
          '</div>' +
          '<div class="kpi-content">' +
            '<div class="kpi-label">จำนวนผู้เดินทาง</div>' +
            '<div class="kpi-value" id="wr-kpi-total-travelers">' + totalTravelers.toLocaleString() + '</div>' +
            '<div class="kpi-subtext">คน</div>' +
          '</div>' +
        '</div>' +

        '<div class="dashboard-kpi-card kpi-top-country">' +
          '<div class="kpi-icon">' +
            '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>' +
          '</div>' +
          '<div class="kpi-content">' +
            '<div class="kpi-label">จำนวน Wholesale</div>' +
            '<div class="kpi-value" id="wr-kpi-wholesales">' + distinctWholesales.toLocaleString() + '</div>' +
            '<div class="kpi-subtext">ราย</div>' +
          '</div>' +
        '</div>' +

      '</div>';
  }

  // ── Render table ───────────────────────────────────────────────────────────
  function applyTableSearch(data) {
    if (!tableSearchQuery) return data;
    var q = tableSearchQuery;
    return data.filter(function (r) {
      return (
        (r.order_code       || '').toLowerCase().indexOf(q) !== -1 ||
        (r.customer_name    || '').toLowerCase().indexOf(q) !== -1 ||
        (r.supplier_name_th || '').toLowerCase().indexOf(q) !== -1 ||
        (r.country_name     || '').toLowerCase().indexOf(q) !== -1
      );
    });
  }

  function sortRows(rows) {
    if (!tableSortKey) return rows;
    var key = tableSortKey;
    var dir = tableSortDir === 'asc' ? 1 : -1;
    return rows.slice().sort(function (a, b) {
      var av = a[key], bv = b[key];
      if (av == null && bv == null) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;
      if (typeof av === 'number' && typeof bv === 'number') return (av - bv) * dir;
      return String(av).localeCompare(String(bv), 'th') * dir;
    });
  }

  // cardExists: true = sort/search re-render (only update table + count + total)
  //             false = fresh render from loadReport (build full card + wire search/export)
  function renderTable(data) {
    var resultsEl = document.getElementById('wrResults');
    if (!resultsEl) return;

    filteredData = sortRows(applyTableSearch(data));
    var displayData = filteredData;

    // No API data at all
    if (!data || data.length === 0) {
      resultsEl.innerHTML =
        '<div class="wr-empty">' +
          '<svg fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>' +
          '<h3>ไม่พบข้อมูล</h3>' +
          '<p>ลองปรับเงื่อนไขการค้นหาใหม่</p>' +
        '</div>';
      return;
    }

    var totalAmount = displayData.reduce(function (s, r) { return s + (Number(r.amount) || 0); }, 0);
    var rows = displayData.map(function (r, i) { return Object.assign({ _rownum: i + 1 }, r); });

    var cardExists = !!document.getElementById('wr-table-card');

    if (!cardExists) {
      // Full render — called after each loadReport() response
      resultsEl.innerHTML =
        '<div id="wr-kpi-area"></div>' +
        '<div class="wr-table-card" id="wr-table-card">' +
          '<div class="wr-table-header">' +
            (window.SharedTableCount ? window.SharedTableCount.render({ id: 'wr-table-count', count: displayData.length }) : '') +
            '<div class="dashboard-table-actions">' +
              '<div id="wr-table-search-host"></div>' +
              (window.SharedExportButton ? window.SharedExportButton.render({ id: 'wr-export-btn', variant: 'excel' }) : '') +
            '</div>' +
          '</div>' +
          '<div id="wr-table-container"></div>' +
        '</div>';

      if (window.SharedTableSearch) {
        window.SharedTableSearch.init({
          containerId: 'wr-table-search-host',
          placeholder: 'ค้นหา Order, ลูกค้า, Wholesale...',
          value      : tableSearchQuery,
          onInput    : function (raw) {
            tableSearchQuery = String(raw || '').toLowerCase().trim();
            renderTable(currentData);
          }
        });
      }

      if (window.SharedExportButton) {
        var exportBtn = document.getElementById('wr-export-btn');
        if (exportBtn) exportBtn.addEventListener('click', function () { exportExcel(filteredData); });
      }
    } else {
      // Partial update — sort or search re-render; search input and export button stay intact
      if (window.SharedTableCount) window.SharedTableCount.update('wr-table-count', displayData.length);
    }

    renderKpiCards(displayData);

    // Search returned no results — show message inside the card
    if (displayData.length === 0) {
      var container = document.getElementById('wr-table-container');
      if (container) {
        container.innerHTML =
          '<div class="wr-empty">' +
            '<svg fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>' +
            '<h3>ไม่พบข้อมูล</h3>' +
            '<p>ลองปรับเงื่อนไขการค้นหาใหม่</p>' +
          '</div>';
      }
      return;
    }

    window.SharedTable.render({
      containerEl: document.getElementById('wr-table-container'),
      columns: [
        { key: '_rownum',          label: 'ลำดับ',              sortable: false, align: 'center' },
        { key: 'order_date',       label: 'วันที่จอง',            sortable: true,  align: 'center', format: function (v) { return utils.formatDateTH(v) || '-'; } },
        { key: 'supplier_name_th', label: 'Wholesale',           sortable: true,  align: 'left' },
        { key: 'order_code',       label: 'Order ID',            sortable: true,  align: 'center' },
        { key: 'customer_name',    label: 'ชื่อลูกค้า/ผู้จอง',    sortable: true,  align: 'left' },
        { key: 'country_name',     label: 'ประเทศ',               sortable: true,  align: 'left' },
        { key: 'product_code',     label: 'Tour Code',           sortable: true,  align: 'left' },
        { key: 'travel_date',      label: 'วันที่เดินทางไป',       sortable: true,  align: 'center', format: function (v) { return utils.formatDateTH(v) || '-'; } },
        { key: 'travel_date_end',  label: 'วันที่เดินทางกลับ',     sortable: true,  align: 'center', format: function (v) { return utils.formatDateTH(v) || '-'; } },
        { key: 'traveler_count',   label: 'ผู้เดินทาง',            sortable: true,  align: 'right',  format: function (v) { return Number(v || 0).toLocaleString(); } },
        { key: 'amount',           label: 'โอนให้ Wholesale',     sortable: true,  align: 'right',  format: function (v) { return utils.formatCurrency(v); } },
        { key: 'supplier_commission', label: 'ค่าคอม',            sortable: true,  align: 'right',  format: function (v) { return utils.formatCurrency(v); } }
      ],
      rows   : rows,
      sortKey: tableSortKey,
      sortDir: tableSortDir,
      onSort : function (key) {
        tableSortDir = tableSortKey === key && tableSortDir === 'desc' ? 'asc' : 'desc';
        tableSortKey = key;
        renderTable(currentData);
      }
    });
  }

  // ── Export Excel ───────────────────────────────────────────────────────────
  function exportExcel(data) {
    if (!window.XLSX || !window.XLSX.utils) {
      alert('ไม่สามารถสร้างไฟล์ Excel ได้ในขณะนี้');
      return;
    }

    const headers = ['ลำดับ', 'วันที่จอง', 'Wholesale', 'Order ID', 'ชื่อลูกค้า/ผู้จอง', 'ประเทศ', 'Tour Code', 'วันที่เดินทางไป', 'วันที่เดินทางกลับ', 'ผู้เดินทาง', 'โอนให้ Wholesale', 'ค่าคอม'];
    const rows = data.map(function (r, i) {
      return [
        i + 1,
        utils.formatDateTH(r.order_date)      || '',
        r.supplier_name_th                    || '',
        r.order_code                          || '',
        r.customer_name                       || '',
        r.country_name                        || '',
        r.product_code                        || '',
        utils.formatDateTH(r.travel_date)     || '',
        utils.formatDateTH(r.travel_date_end) || '',
        Number(r.traveler_count)              || 0,
        parseFloat(r.amount)                  || 0,
        parseFloat(r.supplier_commission)     || 0
      ];
    });

    const ws = window.XLSX.utils.aoa_to_sheet([headers].concat(rows));
    ws['!cols'] = [
      { wch: 6 }, { wch: 12 }, { wch: 30 }, { wch: 18 },
      { wch: 25 }, { wch: 15 }, { wch: 16 }, { wch: 14 }, { wch: 14 }, { wch: 10 }, { wch: 14 }, { wch: 14 }
    ];

    const wb = window.XLSX.utils.book_new();
    window.XLSX.utils.book_append_sheet(wb, ws, 'wholesale-report');

    const now = new Date();
    const pad = function (n) { return String(n).padStart(2, '0'); };
    const fname = 'wholesale-report-' + now.getFullYear() + pad(now.getMonth() + 1) + pad(now.getDate()) + '.xlsx';
    window.XLSX.writeFile(wb, fname, { compression: true });
  }

})();
