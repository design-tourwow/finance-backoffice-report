// Wholesale Destinations - Main JavaScript
(function () {
  'use strict';

  let currentFilters = {};
  let currentData = null;
  let topWholesalesChart = null;
  let stackedChart = null;
  let availablePeriods = null;
  let currentTimeGranularity = 'yearly';
  let selectedPeriods = []; // Array for multi-select: [{ type, year, quarter, month, label }]
  let availableWholesales = []; // List of wholesales from API
  let selectedWholesales = []; // Array for multi-select: [{ id, name }]
  let currentViewMode = 'sales'; // 'sales' or 'travelers'

  document.addEventListener('DOMContentLoaded', function () {
    initWholesaleDestinations();
  });

  async function initWholesaleDestinations() {
    console.log('🎯 Initializing Wholesale Destinations...');

    // Check authentication and token expiry
    if (!validateToken()) {
      return;
    }

    // Load report
    await loadWholesaleReport();

    console.log('✅ Wholesale Destinations initialized');
  }

  // Load wholesale report
  async function loadWholesaleReport() {
    // Show initial loading state
    const section = document.querySelector('.report-content-section');
    if (section) {
      section.innerHTML = `
        <div class="page-loading">
          <div class="spinner"></div>
          <p>กำลังโหลดข้อมูล...</p>
        </div>
      `;
    }

    try {
      // Fetch available periods first
      const periodsResponse = await WholesaleDestinationsAPI.getAvailablePeriods();
      if (periodsResponse && periodsResponse.success && periodsResponse.data) {
        availablePeriods = periodsResponse.data;
        console.log('📅 Available Periods:', availablePeriods);
      }

      // Load data with current view mode
      const response = await WholesaleDestinationsAPI.getWholesaleDestinations({ view_mode: currentViewMode });

      if (response && response.success && response.data) {
        currentData = response.data;
        renderDashboard(response.data);
      } else {
        showEmpty();
      }
    } catch (error) {
      console.error('❌ Failed to load wholesale report:', error);
      showEmpty();
    }
  }

  // Check authentication
  function checkAuth() {
    if (typeof TourImageAPI !== 'undefined' && TourImageAPI.hasToken) {
      return TourImageAPI.hasToken();
    }
    return !!(sessionStorage.getItem('authToken') || localStorage.getItem('authToken'));
  }

  // Check token expiry
  function checkTokenExpiry() {
    if (typeof TokenUtils !== 'undefined') {
      return !TokenUtils.isTokenExpired();
    }
    return true;
  }

  // Validate token
  function validateToken() {
    if (!checkAuth()) {
      showAuthModal();
      return false;
    }
    if (!checkTokenExpiry()) {
      showAuthModal();
      return false;
    }
    return true;
  }

  // Show auth modal
  function showAuthModal() {
    if (typeof MenuComponent !== 'undefined' && MenuComponent.showAuthModal) {
      MenuComponent.showAuthModal();
    } else {
      alert('กรุณาเข้าสู่ระบบใหม่');
      window.location.href = '/auth';
    }
  }

  // Show empty state
  function showEmpty() {
    const section = document.querySelector('.report-content-section');
    if (section) {
      section.innerHTML = `
        <div class="dashboard-table-empty">
          <img src="/assets/images/empty-state.svg" alt="ไม่พบข้อมูล" width="200" height="200" style="margin-bottom: 16px; opacity: 0.8;" />
          <h3 style="margin: 0 0 8px 0; font-size: 18px; color: #374151;">ไม่พบข้อมูล</h3>
          <p style="margin: 0; font-size: 15px; color: #6b7280;">ลองปรับเงื่อนไขการค้นหาใหม่</p>
        </div>
      `;
    }
  }

  // Show loading overlay
  function showDashboardLoading() {
    const dashboard = document.querySelector('.wholesale-dashboard');
    if (!dashboard) return;

    hideDashboardLoading();

    const overlay = document.createElement('div');
    overlay.className = 'dashboard-loading-overlay';
    overlay.id = 'dashboardLoadingOverlay';
    overlay.innerHTML = `
      <div class="spinner"></div>
      <p>กำลังโหลดข้อมูล...</p>
    `;
    dashboard.appendChild(overlay);
  }

  // Hide loading overlay
  function hideDashboardLoading() {
    const overlay = document.getElementById('dashboardLoadingOverlay');
    if (overlay) {
      overlay.remove();
    }
  }

  // Format number with commas
  function formatNumber(num) {
    if (num === null || num === undefined) return '-';
    return num.toLocaleString('th-TH');
  }

  // Format currency (Thai Baht)
  function formatCurrency(num) {
    if (num === null || num === undefined) return '-';
    return num.toLocaleString('th-TH', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) + ' บาท';
  }

  // Format value based on view mode
  function formatValueByMode(num, viewMode) {
    if (viewMode === 'travelers') {
      return formatNumber(num) + ' คน';
    }
    if (viewMode === 'orders') {
      return formatNumber(num);
    }
    return formatCurrency(num);
  }

  // Render main dashboard
  function renderDashboard(data) {
    console.log('🎨 Rendering Wholesale Dashboard:', data);

    const tabContent = document.querySelector('.report-content-section');

    if (!data || !data.wholesales || data.wholesales.length === 0) {
      showEmpty();
      return;
    }

    // Clear section
    tabContent.innerHTML = '';

    const { wholesales, summary, country_totals } = data;

    // Get all unique countries for dynamic columns
    const allCountries = getAllCountries(wholesales);

    const dashboardHTML = `
      <div class="wholesale-dashboard">
        <!-- Time Granularity Control -->
        <div class="time-granularity-control">
          <span class="time-granularity-label">เลือกช่วงเวลา</span>

          <!-- Period Type Selector (Master Dropdown) -->
          <div class="time-dropdown-wrapper">
            <button class="time-btn period-type-btn" id="periodTypeBtn">
              <span class="time-btn-text">ทั้งหมด</span>
              <svg class="time-btn-arrow" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="6 9 12 15 18 9"/>
              </svg>
            </button>
            <div class="time-dropdown-menu" id="periodTypeDropdown">
              <div class="time-dropdown-item" data-period-type="yearly">
                <span class="dropdown-item-label">รายปี</span>
              </div>
              <div class="time-dropdown-item" data-period-type="quarterly">
                <span class="dropdown-item-label">รายไตรมาส</span>
              </div>
              <div class="time-dropdown-item" data-period-type="monthly">
                <span class="dropdown-item-label">รายเดือน</span>
              </div>
            </div>
          </div>

          <!-- Period Value Dropdowns (shown based on selected type) -->
          <div class="time-granularity-buttons" id="periodValueButtons">
            <div class="time-dropdown-wrapper" data-type="yearly" style="display: none;">
              <button class="time-btn" data-granularity="yearly" id="yearlyBtn">
                <span class="time-btn-text">เลือกปี</span>
                <svg class="time-btn-arrow" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="6 9 12 15 18 9"/>
                </svg>
              </button>
              <div class="time-dropdown-menu" id="yearlyDropdown"></div>
            </div>
            <div class="time-dropdown-wrapper" data-type="quarterly" style="display: none;">
              <button class="time-btn" data-granularity="quarterly" id="quarterlyBtn">
                <span class="time-btn-text">เลือกไตรมาส</span>
                <svg class="time-btn-arrow" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="6 9 12 15 18 9"/>
                </svg>
              </button>
              <div class="time-dropdown-menu" id="quarterlyDropdown"></div>
            </div>
            <div class="time-dropdown-wrapper" data-type="monthly" style="display: none;">
              <button class="time-btn" data-granularity="monthly" id="monthlyBtn">
                <span class="time-btn-text">เลือกเดือน</span>
                <svg class="time-btn-arrow" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="6 9 12 15 18 9"/>
                </svg>
              </button>
              <div class="time-dropdown-menu" id="monthlyDropdown"></div>
            </div>
          </div>
          <div class="selected-period-badge" id="selectedPeriodBadge" style="display: none;"></div>

          <!-- Separator -->
          <div class="filter-separator"></div>

          <!-- Wholesale Filter -->
          <span class="time-granularity-label">Wholesale</span>
          <div class="time-dropdown-wrapper">
            <button class="time-btn" id="wholesaleFilterBtn">
              <span class="time-btn-text">Wholesale ทั้งหมด</span>
              <svg class="time-btn-arrow" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="6 9 12 15 18 9"/>
              </svg>
            </button>
            <div class="time-dropdown-menu wholesale-dropdown-menu" id="wholesaleFilterDropdown">
              <div class="dropdown-search-wrapper">
                <input type="text" class="dropdown-search-input" id="wholesaleSearchInput" placeholder="ค้นหา Wholesale..." />
              </div>
              <div class="dropdown-items-container" id="wholesaleItemsContainer">
                <!-- Wholesales will be populated here -->
              </div>
              <div class="dropdown-actions">
                <button type="button" class="dropdown-clear-btn" id="wholesaleFilterClearBtn">ล้าง</button>
                <button type="button" class="dropdown-confirm-btn" id="wholesaleFilterConfirmBtn">ยืนยัน</button>
              </div>
            </div>
          </div>
          <div class="selected-period-badge" id="selectedWholesaleBadge" style="display: none;"></div>
        </div>

        <!-- View Mode Tabs -->
        <div class="view-mode-tabs">
          <button class="view-mode-tab ${currentViewMode === 'sales' ? 'active' : ''}" data-view="sales">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="12" y1="1" x2="12" y2="23"></line>
              <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
            </svg>
            <span>ดูตามยอดขาย</span>
          </button>
          <button class="view-mode-tab ${currentViewMode === 'travelers' ? 'active' : ''}" data-view="travelers">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
              <circle cx="9" cy="7" r="4"></circle>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
              <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
            </svg>
            <span>ดูตามจำนวนผู้เดินทาง</span>
          </button>
          <button class="view-mode-tab ${currentViewMode === 'orders' ? 'active' : ''}" data-view="orders">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
              <polyline points="14 2 14 8 20 8"></polyline>
              <line x1="16" y1="13" x2="8" y2="13"></line>
              <line x1="16" y1="17" x2="8" y2="17"></line>
            </svg>
            <span>ดูตามจำนวนออเดอร์</span>
          </button>
          <button class="view-mode-tab ${currentViewMode === 'net_commission' ? 'active' : ''}" data-view="net_commission">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect>
              <line x1="1" y1="10" x2="23" y2="10"></line>
            </svg>
            <span>ดูตามค่าคอมสุทธิ</span>
          </button>
        </div>

        <!-- KPI Cards -->
        <div class="dashboard-kpi-cards">
          <div class="dashboard-kpi-card kpi-travelers">
            <div class="kpi-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2"/>
                <rect x="9" y="3" width="6" height="4" rx="1"/>
                <path d="M9 12h6M9 16h6"/>
              </svg>
            </div>
            <div class="kpi-content">
              <div class="kpi-label" id="kpiTotalLabel">${{ sales: 'ยอดขายรวม', travelers: 'จำนวนผู้เดินทาง', orders: 'จำนวนออเดอร์', net_commission: 'ค่าคอมสุทธิรวม' }[currentViewMode] || 'ยอดขายรวม'}</div>
              <div class="kpi-value" id="kpiTotalValue">${formatValueByMode(summary.total_value || 0, currentViewMode)}</div>
              <div class="kpi-subtext" id="kpiTotalSubtext">${{ sales: 'Total Sales', travelers: 'Total Travelers', orders: 'Total Orders', net_commission: 'Total Net Commission' }[currentViewMode] || 'Total Sales'}</div>
            </div>
          </div>

          <div class="dashboard-kpi-card kpi-top-wholesale">
            <div class="kpi-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
              </svg>
            </div>
            <div class="kpi-content">
              <div class="kpi-label">Wholesale ยอดนิยม</div>
              <div class="kpi-value" id="kpiTopWholesale" title="${summary.top_wholesale.name}">${truncateName(summary.top_wholesale.name, 20)}</div>
              <div class="kpi-subtext" id="kpiTopWholesaleSubtext">${formatValueByMode(summary.top_wholesale.count, currentViewMode)}</div>
            </div>
          </div>

          <div class="dashboard-kpi-card kpi-top-country">
            <div class="kpi-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"/>
                <path d="M2 12h20M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/>
              </svg>
            </div>
            <div class="kpi-content">
              <div class="kpi-label">ประเทศยอดนิยม</div>
              <div class="kpi-value" id="kpiTopCountry">${summary.top_country.name}</div>
              <div class="kpi-subtext" id="kpiTopCountrySubtext">${formatValueByMode(summary.top_country.count, currentViewMode)}</div>
            </div>
          </div>

          <div class="dashboard-kpi-card kpi-partners">
            <div class="kpi-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/>
                <circle cx="9" cy="7" r="4"/>
                <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/>
              </svg>
            </div>
            <div class="kpi-content">
              <div class="kpi-label">จำนวน Partner</div>
              <div class="kpi-value" id="kpiPartners">${formatNumber(summary.total_partners)}</div>
              <div class="kpi-subtext">Wholesales</div>
            </div>
          </div>
        </div>

        <!-- Charts Row -->
        <div class="dashboard-charts-row">
          <!-- Top 10 Wholesales Chart -->
          <div class="glass-chart-container">
            <div class="glass-chart-header">
              <div>
                <div class="glass-chart-title">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <line x1="18" y1="20" x2="18" y2="10"/>
                    <line x1="12" y1="20" x2="12" y2="4"/>
                    <line x1="6" y1="20" x2="6" y2="14"/>
                  </svg>
                  Top 10 Wholesales
                </div>
                <div class="glass-chart-subtitle" id="chartSubtitle">${{ sales: 'เรียงตามยอดขาย', travelers: 'เรียงตามจำนวนผู้เดินทาง', orders: 'เรียงตามจำนวนออเดอร์', net_commission: 'เรียงตามค่าคอมสุทธิ' }[currentViewMode] || 'เรียงตามยอดขาย'}</div>
              </div>
            </div>
            <div class="glass-chart-wrapper">
              <canvas id="topWholesalesChart"></canvas>
            </div>
          </div>

          <!-- Top 5 Wholesales List -->
          <div class="top-wholesales-container">
            <div class="glass-chart-header">
              <div>
                <div class="glass-chart-title" id="topWholesalesTitle">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                  </svg>
                  ${{ sales: 'สัดส่วนยอดขาย', travelers: 'สัดส่วนผู้เดินทาง', orders: 'สัดส่วนออเดอร์', net_commission: 'สัดส่วนค่าคอมสุทธิ' }[currentViewMode] || 'สัดส่วนยอดขาย'}
                </div>
                <div class="glass-chart-subtitle">Top 5 Wholesales</div>
              </div>
            </div>
            <div class="top-wholesales-list" id="topWholesalesList">
              ${renderTopWholesalesList(wholesales.slice(0, 5), summary.total_value || 0)}
            </div>
          </div>
        </div>

        <!-- Stacked Bar Chart -->
        <div class="glass-chart-container" style="margin-bottom: 24px;">
          <div class="glass-chart-header">
            <div>
              <div class="glass-chart-title" id="stackedChartTitle">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <rect x="3" y="3" width="18" height="18" rx="2"/>
                  <path d="M3 9h18M9 21V9"/>
                </svg>
                ${{ sales: 'สัดส่วนยอดขายแยกตามประเทศ', travelers: 'สัดส่วนผู้เดินทางแยกตามประเทศ', orders: 'สัดส่วนออเดอร์แยกตามประเทศ', net_commission: 'สัดส่วนค่าคอมสุทธิแยกตามประเทศ' }[currentViewMode] || 'สัดส่วนยอดขายแยกตามประเทศ'}
              </div>
              <div class="glass-chart-subtitle">แต่ละ Wholesale แบ่งตามประเทศปลายทาง</div>
            </div>
          </div>
          <div class="glass-chart-scroll-wrapper">
            <div class="glass-chart-wrapper" style="height: 350px; min-width: ${Math.max(800, wholesales.length * 60)}px;">
              <canvas id="stackedChart"></canvas>
            </div>
          </div>
        </div>

        <!-- Data Table -->
        <div class="dashboard-table-container">
          <div class="dashboard-table-header">
            <div class="dashboard-table-title">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M16 4h2a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h2"/>
                <rect x="8" y="2" width="8" height="4" rx="1"/>
              </svg>
              รายละเอียด Wholesale
            </div>
            <div class="dashboard-table-actions">
              <div class="dashboard-search-wrapper">
                <svg class="dashboard-search-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="11" cy="11" r="8"/>
                  <path d="M21 21l-4.35-4.35"/>
                </svg>
                <input type="text" class="dashboard-search-input" id="dashboardSearchInput" placeholder="ค้นหา Wholesale...">
              </div>
              <button class="dashboard-export-btn" id="dashboardExportBtn">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
                  <polyline points="7 10 12 15 17 10"/>
                  <line x1="12" y1="15" x2="12" y2="3"/>
                </svg>
                Export CSV
              </button>
            </div>
          </div>
          <div class="dashboard-table-wrapper">
            <table class="dashboard-table" id="dashboardTable">
              ${renderTableHeader(allCountries)}
              <tbody id="dashboardTableBody">
                ${renderTableRows(wholesales, summary.total_value || 0, allCountries)}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;

    tabContent.innerHTML = dashboardHTML;

    // Initialize components
    initViewModeTabs();
    initTimeGranularityButtons(data);
    initWholesaleFilter();
    renderTopWholesalesChart(wholesales.slice(0, 10));
    renderStackedChart(wholesales);
    initSearch(wholesales, summary.total_value || 0, allCountries);
    initExport(wholesales, summary.total_value || 0, allCountries);
    initTableSorting(wholesales, summary.total_value || 0, allCountries);
  }

  // Initialize view mode tabs
  function initViewModeTabs() {
    const tabs = document.querySelectorAll('.view-mode-tab');

    tabs.forEach(tab => {
      tab.addEventListener('click', function() {
        const viewMode = this.dataset.view;

        // Update active state
        tabs.forEach(t => t.classList.remove('active'));
        this.classList.add('active');

        // Update current view mode
        currentViewMode = viewMode;

        // Reload data with new view mode
        console.log('📊 View mode changed to:', viewMode);
        applyAllFilters();
      });
    });
  }

  // Initialize time granularity dropdown buttons
  async function initTimeGranularityButtons(data) {
    // Fetch available periods if not already loaded
    if (!availablePeriods) {
      try {
        const response = await WholesaleDestinationsAPI.getAvailablePeriods();
        if (response && response.success && response.data) {
          availablePeriods = response.data;
          console.log('📅 Available Periods:', availablePeriods);
        }
      } catch (error) {
        console.error('❌ Failed to fetch available periods:', error);
        availablePeriods = { years: [] };
      }
    }

    // Populate dropdowns
    populateTimeDropdowns();

    // Initialize period type selector (master dropdown)
    initPeriodTypeSelector();

    // Initialize dropdown click handlers for period value dropdowns
    const dropdownWrappers = document.querySelectorAll('#periodValueButtons .time-dropdown-wrapper');
    dropdownWrappers.forEach(wrapper => {
      const btn = wrapper.querySelector('.time-btn');
      const dropdown = wrapper.querySelector('.time-dropdown-menu');

      btn.addEventListener('click', function(e) {
        e.stopPropagation();

        // Close other dropdowns
        document.querySelectorAll('.time-dropdown-menu.show').forEach(menu => {
          if (menu !== dropdown) menu.classList.remove('show');
        });

        // Toggle this dropdown
        dropdown.classList.toggle('show');
      });
    });

    // Close dropdowns when clicking outside
    document.addEventListener('click', function() {
      document.querySelectorAll('.time-dropdown-menu.show').forEach(menu => {
        menu.classList.remove('show');
      });
    });
  }

  // Initialize period type selector (master dropdown)
  function initPeriodTypeSelector() {
    const periodTypeBtn = document.getElementById('periodTypeBtn');
    const periodTypeDropdown = document.getElementById('periodTypeDropdown');

    if (!periodTypeBtn || !periodTypeDropdown) return;

    // Toggle dropdown on button click
    periodTypeBtn.addEventListener('click', function(e) {
      e.stopPropagation();

      // Close other dropdowns
      document.querySelectorAll('.time-dropdown-menu.show').forEach(menu => {
        if (menu !== periodTypeDropdown) menu.classList.remove('show');
      });

      // Toggle this dropdown
      periodTypeDropdown.classList.toggle('show');
    });

    // Handle period type selection
    periodTypeDropdown.querySelectorAll('.time-dropdown-item').forEach(item => {
      item.addEventListener('click', function(e) {
        e.stopPropagation();

        const periodType = this.dataset.periodType;
        const periodTypeLabels = {
          'yearly': 'รายปี',
          'quarterly': 'รายไตรมาส',
          'monthly': 'รายเดือน'
        };

        // Update period type button text
        const btnText = periodTypeBtn.querySelector('.time-btn-text');
        if (btnText) {
          btnText.textContent = periodTypeLabels[periodType];
        }

        // Mark period type button as active
        periodTypeBtn.classList.add('active');

        // Reset ALL period value dropdowns and show only the selected type
        const periodValueButtons = document.getElementById('periodValueButtons');
        if (periodValueButtons) {
          const defaultTexts = {
            'yearly': 'เลือกปี',
            'quarterly': 'เลือกไตรมาส',
            'monthly': 'เลือกเดือน'
          };

          // Reset ALL period value dropdowns (clear labels, checkboxes and remove active state)
          periodValueButtons.querySelectorAll('.time-dropdown-wrapper').forEach(wrapper => {
            const type = wrapper.dataset.type;
            const btn = wrapper.querySelector('.time-btn');
            const btnText = btn?.querySelector('.time-btn-text');

            // Reset button text to default
            if (btnText && defaultTexts[type]) {
              btnText.textContent = defaultTexts[type];
            }

            // Remove active state
            if (btn) {
              btn.classList.remove('active');
            }

            // Clear all checkboxes and selected states
            wrapper.querySelectorAll('.time-dropdown-item').forEach(item => {
              item.classList.remove('selected');
              const checkbox = item.querySelector('.period-checkbox');
              if (checkbox) checkbox.checked = false;
            });

            // Hide all wrappers
            wrapper.style.display = 'none';
          });

          // Show only the selected type dropdown
          const targetWrapper = periodValueButtons.querySelector(`[data-type="${periodType}"]`);
          if (targetWrapper) {
            targetWrapper.style.display = 'block';
          }
        }

        // Close dropdown
        periodTypeDropdown.classList.remove('show');

        // Update selected item state in period type dropdown
        periodTypeDropdown.querySelectorAll('.time-dropdown-item').forEach(i => {
          i.classList.remove('selected');
        });
        this.classList.add('selected');

        // Always reset period selection when changing type
        selectedPeriods = [];
        currentTimeGranularity = periodType;

        // Hide the badge
        const badge = document.getElementById('selectedPeriodBadge');
        if (badge) badge.style.display = 'none';
      });
    });
  }

  // Populate time dropdowns with data from database
  function populateTimeDropdowns() {
    if (!availablePeriods || !availablePeriods.years) return;

    const years = availablePeriods.years;

    // Helper to create dropdown content with checkboxes and confirm button
    function createDropdownContent(items, type) {
      let html = '<div class="dropdown-items-container">';
      html += items;
      html += '</div>';
      html += `
        <div class="dropdown-actions">
          <button type="button" class="dropdown-clear-btn" data-type="${type}">ล้าง</button>
          <button type="button" class="dropdown-confirm-btn" data-type="${type}">ยืนยัน</button>
        </div>
      `;
      return html;
    }

    // Yearly dropdown
    const yearlyDropdown = document.getElementById('yearlyDropdown');
    if (yearlyDropdown) {
      const items = years.map(year => `
        <div class="time-dropdown-item" data-type="yearly" data-year="${year.year_ce}" data-label="พ.ศ. ${year.label} (${year.year_ce})">
          <label class="dropdown-checkbox">
            <input type="checkbox" class="period-checkbox" />
            <span class="checkbox-custom"></span>
          </label>
          <span class="dropdown-item-label">พ.ศ. ${year.label} (${year.year_ce})</span>
          <span class="dropdown-item-count">${formatNumber(year.total_orders || 0)} orders</span>
        </div>
      `).join('');
      yearlyDropdown.innerHTML = createDropdownContent(items, 'yearly');
    }

    // Quarterly dropdown - grouped by year
    const quarterlyDropdown = document.getElementById('quarterlyDropdown');
    if (quarterlyDropdown) {
      let quarterlyItems = '';
      years.forEach(year => {
        if (year.quarters && year.quarters.length > 0) {
          quarterlyItems += `<div class="dropdown-year-header">พ.ศ. ${year.label} (${year.year_ce})</div>`;
          year.quarters.forEach(q => {
            quarterlyItems += `
              <div class="time-dropdown-item" data-type="quarterly" data-year="${year.year_ce}" data-quarter="${q.quarter}" data-label="${q.label} ${year.label}">
                <label class="dropdown-checkbox">
                  <input type="checkbox" class="period-checkbox" />
                  <span class="checkbox-custom"></span>
                </label>
                <span class="dropdown-item-label">${q.label}</span>
              </div>
            `;
          });
        }
      });
      quarterlyDropdown.innerHTML = createDropdownContent(quarterlyItems, 'quarterly');
    }

    // Monthly dropdown - grouped by year
    const monthlyDropdown = document.getElementById('monthlyDropdown');
    if (monthlyDropdown) {
      let monthlyItems = '';
      years.forEach(year => {
        if (year.months && year.months.length > 0) {
          monthlyItems += `<div class="dropdown-year-header">พ.ศ. ${year.label} (${year.year_ce})</div>`;
          year.months.forEach(m => {
            monthlyItems += `
              <div class="time-dropdown-item" data-type="monthly" data-year="${year.year_ce}" data-month="${m.month}" data-label="${m.label_short} ${year.label}">
                <label class="dropdown-checkbox">
                  <input type="checkbox" class="period-checkbox" />
                  <span class="checkbox-custom"></span>
                </label>
                <span class="dropdown-item-label">${m.label}</span>
              </div>
            `;
          });
        }
      });
      monthlyDropdown.innerHTML = createDropdownContent(monthlyItems, 'monthly');
    }

    // Add click handlers to dropdown items (toggle checkbox)
    document.querySelectorAll('#periodValueButtons .time-dropdown-item').forEach(item => {
      item.addEventListener('click', function(e) {
        e.stopPropagation();

        const checkbox = this.querySelector('.period-checkbox');
        if (checkbox) {
          // If clicking on checkbox or label, let default behavior handle it
          // Otherwise toggle manually
          if (e.target !== checkbox && !e.target.closest('.dropdown-checkbox')) {
            checkbox.checked = !checkbox.checked;
          }
          // Update selected state
          this.classList.toggle('selected', checkbox.checked);
        }
      });

      // Handle direct checkbox click
      const checkbox = item.querySelector('.period-checkbox');
      if (checkbox) {
        checkbox.addEventListener('click', function(e) {
          e.stopPropagation();
          // Checkbox toggles itself, just update parent state
          setTimeout(() => {
            item.classList.toggle('selected', this.checked);
          }, 0);
        });

        checkbox.addEventListener('change', function() {
          item.classList.toggle('selected', this.checked);
        });
      }
    });

    // Add confirm button handlers (only for period dropdowns with data-type attribute)
    document.querySelectorAll('.dropdown-confirm-btn[data-type]').forEach(btn => {
      btn.addEventListener('click', function(e) {
        e.stopPropagation();
        const type = this.dataset.type;
        if (type) confirmPeriodSelection(type);
      });
    });

    // Add clear button handlers (only for period dropdowns with data-type attribute)
    document.querySelectorAll('.dropdown-clear-btn[data-type]').forEach(btn => {
      btn.addEventListener('click', function(e) {
        e.stopPropagation();
        const type = this.dataset.type;
        if (type) clearDropdownSelection(type);
      });
    });
  }

  // Clear selection in a specific dropdown
  function clearDropdownSelection(type) {
    const dropdownId = type + 'Dropdown';
    const dropdown = document.getElementById(dropdownId);
    if (dropdown) {
      dropdown.querySelectorAll('.time-dropdown-item').forEach(item => {
        item.classList.remove('selected');
        const checkbox = item.querySelector('.period-checkbox');
        if (checkbox) checkbox.checked = false;
      });
    }
  }

  // Confirm period selection from dropdown
  async function confirmPeriodSelection(type) {
    const dropdownId = type + 'Dropdown';
    const dropdown = document.getElementById(dropdownId);
    if (!dropdown) return;

    // Collect selected items
    selectedPeriods = [];
    dropdown.querySelectorAll('.time-dropdown-item.selected, .time-dropdown-item:has(.period-checkbox:checked)').forEach(item => {
      const year = parseInt(item.dataset.year);
      const quarter = item.dataset.quarter ? parseInt(item.dataset.quarter) : null;
      const month = item.dataset.month ? parseInt(item.dataset.month) : null;
      const label = item.dataset.label;

      selectedPeriods.push({ type, year, quarter, month, label });
    });

    currentTimeGranularity = type;

    // Update button text
    const btn = document.querySelector(`[data-granularity="${type}"]`);
    const btnText = btn?.querySelector('.time-btn-text');
    if (btnText) {
      if (selectedPeriods.length === 0) {
        const defaultTexts = {
          'yearly': 'เลือกปี',
          'quarterly': 'เลือกไตรมาส',
          'monthly': 'เลือกเดือน'
        };
        btnText.textContent = defaultTexts[type];
        btn.classList.remove('active');
      } else if (selectedPeriods.length === 1) {
        btnText.textContent = selectedPeriods[0].label;
        btn.classList.add('active');
      } else {
        btnText.textContent = `${selectedPeriods.length} รายการ`;
        btn.classList.add('active');
      }
    }

    // Close dropdown
    dropdown.classList.remove('show');

    // Update badge and reload data
    updateSelectedPeriodBadge();
    if (selectedPeriods.length > 0) {
      // Filter wholesales based on selected periods
      await updateWholesaleDropdownByPeriod();
      applyAllFilters();
    } else {
      // Reset wholesale dropdown to show all
      renderWholesaleItems(availableWholesales);
    }
  }

  // Update selected period badge
  function updateSelectedPeriodBadge() {
    const badge = document.getElementById('selectedPeriodBadge');
    if (!badge) return;

    if (selectedPeriods.length === 0) {
      badge.style.display = 'none';
      return;
    }

    let label = '';
    if (selectedPeriods.length === 1) {
      label = selectedPeriods[0].label;
    } else {
      label = `${selectedPeriods.length} ช่วงเวลา`;
    }

    badge.innerHTML = `
      <span>${label}</span>
      <button class="badge-clear" onclick="clearPeriodFilter()">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="18" y1="6" x2="6" y2="18"/>
          <line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      </button>
    `;
    badge.style.display = 'flex';
  }

  // Update wholesale dropdown based on selected periods
  async function updateWholesaleDropdownByPeriod() {
    if (selectedPeriods.length === 0) {
      renderWholesaleItems(availableWholesales);
      return;
    }

    // Calculate date range from selected periods
    let allDateFrom = null;
    let allDateTo = null;
    selectedPeriods.forEach(period => {
      const { dateFrom, dateTo } = getPeriodDateRange(period);
      if (!allDateFrom || dateFrom < allDateFrom) allDateFrom = dateFrom;
      if (!allDateTo || dateTo > allDateTo) allDateTo = dateTo;
    });

    try {
      // Fetch data with period filter to get available wholesales
      const response = await WholesaleDestinationsAPI.getWholesaleDestinations({
        booking_date_from: allDateFrom,
        booking_date_to: allDateTo
      });

      if (response && response.success && response.data && response.data.wholesales) {
        // Get wholesale names that have data in this period
        const wholesaleNames = response.data.wholesales.map(w => w.name);

        // Filter available wholesales
        const filteredWholesales = availableWholesales.filter(ws =>
          wholesaleNames.includes(ws.name)
        );

        // Clear previously selected wholesales that are no longer available
        selectedWholesales = selectedWholesales.filter(sw =>
          wholesaleNames.includes(sw.name)
        );

        // Update wholesale dropdown
        renderWholesaleItems(filteredWholesales.length > 0 ? filteredWholesales : availableWholesales);
        updateWholesaleButtonText();
        updateSelectedWholesaleBadge();
      }
    } catch (error) {
      console.error('❌ Failed to filter wholesales by period:', error);
    }
  }

  // Get period date range
  function getPeriodDateRange(period) {
    const year = period.year;
    let dateFrom, dateTo;

    if (period.type === 'yearly') {
      dateFrom = `${year}-01-01`;
      dateTo = `${year}-12-31`;
    } else if (period.type === 'quarterly' && period.quarter) {
      const q = period.quarter;
      const startMonth = (q - 1) * 3 + 1;
      const endMonth = q * 3;
      dateFrom = `${year}-${String(startMonth).padStart(2, '0')}-01`;
      const lastDay = new Date(year, endMonth, 0).getDate();
      dateTo = `${year}-${String(endMonth).padStart(2, '0')}-${lastDay}`;
    } else if (period.type === 'monthly' && period.month) {
      const m = period.month;
      dateFrom = `${year}-${String(m).padStart(2, '0')}-01`;
      const lastDay = new Date(year, m, 0).getDate();
      dateTo = `${year}-${String(m).padStart(2, '0')}-${lastDay}`;
    }

    return { dateFrom, dateTo };
  }

  // Initialize wholesale filter dropdown
  async function initWholesaleFilter() {
    const wholesaleBtn = document.getElementById('wholesaleFilterBtn');
    const wholesaleDropdown = document.getElementById('wholesaleFilterDropdown');
    const wholesaleSearchInput = document.getElementById('wholesaleSearchInput');
    const confirmBtn = document.getElementById('wholesaleFilterConfirmBtn');
    const clearBtn = document.getElementById('wholesaleFilterClearBtn');

    if (!wholesaleBtn || !wholesaleDropdown) return;

    // Get wholesales from loaded data
    if (currentData && currentData.wholesales) {
      availableWholesales = currentData.wholesales.map((w, index) => ({
        id: w.id || index + 1,
        name: w.name,
        total: w.total
      }));
      renderWholesaleItems(availableWholesales);
    }

    // Toggle dropdown
    wholesaleBtn.addEventListener('click', function(e) {
      e.stopPropagation();

      // Close other dropdowns
      document.querySelectorAll('.time-dropdown-menu.show').forEach(menu => {
        if (menu !== wholesaleDropdown) menu.classList.remove('show');
      });

      // Toggle this dropdown
      wholesaleDropdown.classList.toggle('show');

      // Focus search input when opened
      if (wholesaleDropdown.classList.contains('show') && wholesaleSearchInput) {
        wholesaleSearchInput.value = '';
        renderWholesaleItems(availableWholesales);
        wholesaleSearchInput.focus();
      }
    });

    // Search filter
    if (wholesaleSearchInput) {
      wholesaleSearchInput.addEventListener('input', function(e) {
        const searchTerm = e.target.value.toLowerCase();
        const filtered = availableWholesales.filter(w =>
          w.name.toLowerCase().includes(searchTerm)
        );
        renderWholesaleItems(filtered);
      });
    }

    // Prevent dropdown close when clicking inside
    wholesaleDropdown.addEventListener('click', function(e) {
      e.stopPropagation();
    });

    // Confirm button
    if (confirmBtn) {
      confirmBtn.addEventListener('click', async function(e) {
        e.stopPropagation();
        await confirmWholesaleSelection();
      });
    }

    // Clear button
    if (clearBtn) {
      clearBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        clearWholesaleDropdownSelection();
      });
    }
  }

  // Render wholesale items in dropdown
  function renderWholesaleItems(wholesales) {
    const container = document.getElementById('wholesaleItemsContainer');
    if (!container) return;

    container.innerHTML = wholesales.map(wholesale => {
      const isSelected = selectedWholesales.some(w => w.id === wholesale.id);
      return `
        <div class="time-dropdown-item wholesale-item ${isSelected ? 'selected' : ''}" data-wholesale-id="${wholesale.id}" data-wholesale-name="${wholesale.name}">
          <label class="dropdown-checkbox">
            <input type="checkbox" class="wholesale-checkbox" ${isSelected ? 'checked' : ''} />
            <span class="checkbox-custom"></span>
          </label>
          <span class="dropdown-item-label">${wholesale.name}</span>
        </div>
      `;
    }).join('');

    // Attach click handlers
    container.querySelectorAll('.wholesale-item').forEach(item => {
      item.addEventListener('click', function(e) {
        e.stopPropagation();
        const checkbox = this.querySelector('.wholesale-checkbox');
        if (checkbox && e.target !== checkbox && !e.target.closest('.dropdown-checkbox')) {
          checkbox.checked = !checkbox.checked;
        }
        this.classList.toggle('selected', checkbox?.checked);
      });

      const checkbox = item.querySelector('.wholesale-checkbox');
      if (checkbox) {
        checkbox.addEventListener('click', function(e) {
          e.stopPropagation();
          setTimeout(() => {
            item.classList.toggle('selected', this.checked);
          }, 0);
        });

        checkbox.addEventListener('change', function() {
          item.classList.toggle('selected', this.checked);
        });
      }
    });
  }

  // Confirm wholesale selection
  async function confirmWholesaleSelection() {
    const container = document.getElementById('wholesaleItemsContainer');
    if (!container) return;

    // Collect selected wholesales
    selectedWholesales = [];
    container.querySelectorAll('.wholesale-item.selected, .wholesale-item:has(.wholesale-checkbox:checked)').forEach(item => {
      const id = parseInt(item.dataset.wholesaleId);
      const name = item.dataset.wholesaleName;
      selectedWholesales.push({ id, name });
    });

    // Update button text
    updateWholesaleButtonText();

    // Close dropdown
    document.getElementById('wholesaleFilterDropdown')?.classList.remove('show');

    // Update badge and reload data
    updateSelectedWholesaleBadge();

    if (selectedWholesales.length > 0) {
      // Filter periods based on selected wholesales
      await updatePeriodDropdownsByWholesale();
    } else {
      // Reset period dropdowns to show all
      populateTimeDropdowns();
    }

    applyAllFilters();
  }

  // Clear wholesale dropdown selection
  function clearWholesaleDropdownSelection() {
    const container = document.getElementById('wholesaleItemsContainer');
    if (container) {
      container.querySelectorAll('.wholesale-item').forEach(item => {
        item.classList.remove('selected');
        const checkbox = item.querySelector('.wholesale-checkbox');
        if (checkbox) checkbox.checked = false;
      });
    }
  }

  // Update wholesale button text
  function updateWholesaleButtonText() {
    const btn = document.getElementById('wholesaleFilterBtn');
    const btnText = btn?.querySelector('.time-btn-text');
    if (btnText) {
      if (selectedWholesales.length === 0) {
        btnText.textContent = 'Wholesale ทั้งหมด';
        btn?.classList.remove('active');
      } else if (selectedWholesales.length === 1) {
        btnText.textContent = selectedWholesales[0].name;
        btn?.classList.add('active');
      } else {
        btnText.textContent = `${selectedWholesales.length} Wholesale`;
        btn?.classList.add('active');
      }
    }
  }

  // Update selected wholesale badge
  function updateSelectedWholesaleBadge() {
    const badge = document.getElementById('selectedWholesaleBadge');
    if (!badge) return;

    if (selectedWholesales.length === 0) {
      badge.style.display = 'none';
      return;
    }

    let label = '';
    if (selectedWholesales.length === 1) {
      label = selectedWholesales[0].name;
    } else {
      label = `${selectedWholesales.length} Wholesale`;
    }

    badge.innerHTML = `
      <span>${label}</span>
      <button class="badge-clear" onclick="clearWholesaleFilter()">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="18" y1="6" x2="6" y2="18"/>
          <line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      </button>
    `;
    badge.style.display = 'flex';
  }

  // Update period dropdowns based on selected wholesales
  async function updatePeriodDropdownsByWholesale() {
    if (selectedWholesales.length === 0) {
      // Reset to show all periods
      populateTimeDropdowns();
      return;
    }

    try {
      // Fetch available periods for selected wholesales
      const wholesaleIds = selectedWholesales.map(w => w.id).join(',');
      const response = await WholesaleDestinationsAPI.getAvailablePeriods({ wholesale_id: wholesaleIds });

      if (response && response.success && response.data) {
        const periodsData = response.data;

        // Update period dropdowns with filtered data
        updatePeriodDropdownsWithData(periodsData);

        // Clear previously selected periods that are no longer available
        filterSelectedPeriodsByAvailable(periodsData);
      }
    } catch (error) {
      console.error('❌ Failed to filter periods by wholesale:', error);
      // If API doesn't support wholesale filter, keep all periods
    }
  }

  // Update period dropdowns with filtered data (preserves selected state)
  function updatePeriodDropdownsWithData(periodsData) {
    if (!periodsData || !periodsData.years) return;

    const years = periodsData.years;

    // Helper to create dropdown content
    function createDropdownContent(items, type) {
      let html = '<div class="dropdown-items-container">';
      html += items;
      html += '</div>';
      html += `
        <div class="dropdown-actions">
          <button type="button" class="dropdown-clear-btn" data-type="${type}">ล้าง</button>
          <button type="button" class="dropdown-confirm-btn" data-type="${type}">ยืนยัน</button>
        </div>
      `;
      return html;
    }

    // Yearly dropdown
    const yearlyDropdown = document.getElementById('yearlyDropdown');
    if (yearlyDropdown) {
      const items = years.map(year => {
        const isSelected = selectedPeriods.some(p => p.type === 'yearly' && p.year === year.year_ce);
        return `
          <div class="time-dropdown-item ${isSelected ? 'selected' : ''}" data-type="yearly" data-year="${year.year_ce}" data-label="พ.ศ. ${year.label} (${year.year_ce})">
            <label class="dropdown-checkbox">
              <input type="checkbox" class="period-checkbox" ${isSelected ? 'checked' : ''} />
              <span class="checkbox-custom"></span>
            </label>
            <span class="dropdown-item-label">พ.ศ. ${year.label} (${year.year_ce})</span>
            <span class="dropdown-item-count">${formatNumber(year.total_orders || 0)} orders</span>
          </div>
        `;
      }).join('');
      yearlyDropdown.innerHTML = createDropdownContent(items, 'yearly');
      reattachPeriodItemHandlers(yearlyDropdown);
    }

    // Quarterly dropdown
    const quarterlyDropdown = document.getElementById('quarterlyDropdown');
    if (quarterlyDropdown) {
      let quarterlyItems = '';
      years.forEach(year => {
        if (year.quarters && year.quarters.length > 0) {
          quarterlyItems += `<div class="dropdown-year-header">พ.ศ. ${year.label} (${year.year_ce})</div>`;
          year.quarters.forEach(q => {
            const isSelected = selectedPeriods.some(p => p.type === 'quarterly' && p.year === year.year_ce && p.quarter === q.quarter);
            quarterlyItems += `
              <div class="time-dropdown-item ${isSelected ? 'selected' : ''}" data-type="quarterly" data-year="${year.year_ce}" data-quarter="${q.quarter}" data-label="${q.label} ${year.label}">
                <label class="dropdown-checkbox">
                  <input type="checkbox" class="period-checkbox" ${isSelected ? 'checked' : ''} />
                  <span class="checkbox-custom"></span>
                </label>
                <span class="dropdown-item-label">${q.label}</span>
              </div>
            `;
          });
        }
      });
      quarterlyDropdown.innerHTML = createDropdownContent(quarterlyItems, 'quarterly');
      reattachPeriodItemHandlers(quarterlyDropdown);
    }

    // Monthly dropdown
    const monthlyDropdown = document.getElementById('monthlyDropdown');
    if (monthlyDropdown) {
      let monthlyItems = '';
      years.forEach(year => {
        if (year.months && year.months.length > 0) {
          monthlyItems += `<div class="dropdown-year-header">พ.ศ. ${year.label} (${year.year_ce})</div>`;
          year.months.forEach(m => {
            const isSelected = selectedPeriods.some(p => p.type === 'monthly' && p.year === year.year_ce && p.month === m.month);
            monthlyItems += `
              <div class="time-dropdown-item ${isSelected ? 'selected' : ''}" data-type="monthly" data-year="${year.year_ce}" data-month="${m.month}" data-label="${m.label_short} ${year.label}">
                <label class="dropdown-checkbox">
                  <input type="checkbox" class="period-checkbox" ${isSelected ? 'checked' : ''} />
                  <span class="checkbox-custom"></span>
                </label>
                <span class="dropdown-item-label">${m.label}</span>
              </div>
            `;
          });
        }
      });
      monthlyDropdown.innerHTML = createDropdownContent(monthlyItems, 'monthly');
      reattachPeriodItemHandlers(monthlyDropdown);
    }

    // Reattach button handlers
    document.querySelectorAll('.dropdown-confirm-btn[data-type]').forEach(btn => {
      btn.addEventListener('click', function(e) {
        e.stopPropagation();
        const type = this.dataset.type;
        if (type) confirmPeriodSelection(type);
      });
    });

    document.querySelectorAll('.dropdown-clear-btn[data-type]').forEach(btn => {
      btn.addEventListener('click', function(e) {
        e.stopPropagation();
        const type = this.dataset.type;
        if (type) clearDropdownSelection(type);
      });
    });
  }

  // Reattach event handlers to period dropdown items
  function reattachPeriodItemHandlers(container) {
    container.querySelectorAll('.time-dropdown-item').forEach(item => {
      item.addEventListener('click', function(e) {
        e.stopPropagation();
        const checkbox = this.querySelector('.period-checkbox');
        if (checkbox && e.target !== checkbox && !e.target.closest('.dropdown-checkbox')) {
          checkbox.checked = !checkbox.checked;
        }
        this.classList.toggle('selected', checkbox?.checked);
      });

      const checkbox = item.querySelector('.period-checkbox');
      if (checkbox) {
        checkbox.addEventListener('click', function(e) {
          e.stopPropagation();
          setTimeout(() => {
            item.classList.toggle('selected', this.checked);
          }, 0);
        });
      }
    });
  }

  // Filter selected periods by available data
  function filterSelectedPeriodsByAvailable(periodsData) {
    if (!periodsData || !periodsData.years) return;

    const availableYears = periodsData.years.map(y => y.year_ce);
    const availableQuarters = [];
    const availableMonths = [];

    periodsData.years.forEach(year => {
      if (year.quarters) {
        year.quarters.forEach(q => {
          availableQuarters.push(`${year.year_ce}-${q.quarter}`);
        });
      }
      if (year.months) {
        year.months.forEach(m => {
          availableMonths.push(`${year.year_ce}-${m.month}`);
        });
      }
    });

    // Filter out periods that are no longer available
    selectedPeriods = selectedPeriods.filter(p => {
      if (p.type === 'yearly') {
        return availableYears.includes(p.year);
      } else if (p.type === 'quarterly') {
        return availableQuarters.includes(`${p.year}-${p.quarter}`);
      } else if (p.type === 'monthly') {
        return availableMonths.includes(`${p.year}-${p.month}`);
      }
      return false;
    });

    // Update UI
    updatePeriodButtonTextForType(currentTimeGranularity);
    updateSelectedPeriodBadge();
  }

  // Update period button text for a specific type
  function updatePeriodButtonTextForType(type) {
    const btn = document.querySelector(`[data-granularity="${type}"]`);
    const btnText = btn?.querySelector('.time-btn-text');
    if (btnText) {
      const defaultTexts = {
        'yearly': 'เลือกปี',
        'quarterly': 'เลือกไตรมาส',
        'monthly': 'เลือกเดือน'
      };
      if (selectedPeriods.length === 0) {
        btnText.textContent = defaultTexts[type];
        btn?.classList.remove('active');
      } else if (selectedPeriods.length === 1) {
        btnText.textContent = selectedPeriods[0].label;
        btn?.classList.add('active');
      } else {
        btnText.textContent = `${selectedPeriods.length} รายการ`;
        btn?.classList.add('active');
      }
    }
  }

  // Apply all filters and reload data
  async function applyAllFilters() {
    const filters = {};

    // Add view mode filter
    filters.view_mode = currentViewMode;

    // Add period filter
    if (selectedPeriods.length > 0) {
      let allDateFrom = null;
      let allDateTo = null;
      selectedPeriods.forEach(period => {
        const { dateFrom, dateTo } = getPeriodDateRange(period);
        if (!allDateFrom || dateFrom < allDateFrom) allDateFrom = dateFrom;
        if (!allDateTo || dateTo > allDateTo) allDateTo = dateTo;
      });
      filters.booking_date_from = allDateFrom;
      filters.booking_date_to = allDateTo;
    }

    // Add wholesale filter
    if (selectedWholesales.length > 0) {
      filters.wholesale_id = selectedWholesales.map(w => w.id).join(',');
    }

    console.log('📅 Applying filters:', filters);

    try {
      showDashboardLoading();
      const response = await WholesaleDestinationsAPI.getWholesaleDestinations(filters);
      hideDashboardLoading();

      if (response && response.success && response.data) {
        currentData = response.data;
        updateDashboardData(response.data);
      } else {
        showEmptyData();
      }
    } catch (error) {
      console.error('❌ Failed to apply filters:', error);
      hideDashboardLoading();
    }
  }

  // Show empty data state (within existing dashboard)
  function showEmptyData() {
    const kpiCards = document.querySelector('.dashboard-kpi-cards');
    const chartsRow = document.querySelector('.dashboard-charts-row');
    const tableContainer = document.querySelector('.dashboard-table-container');

    const emptyHTML = `
      <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 40px 20px;">
        <img src="/assets/images/empty-state.svg" alt="ไม่พบข้อมูล" width="160" height="160" style="margin-bottom: 16px; opacity: 0.8;" />
        <h3 style="margin: 0 0 8px 0; font-size: 18px; color: #374151;">ไม่พบข้อมูล</h3>
        <p style="margin: 0; font-size: 15px; color: #6b7280;">ลองปรับเงื่อนไขการค้นหาใหม่</p>
      </div>
    `;

    if (kpiCards) kpiCards.innerHTML = '';
    if (chartsRow) chartsRow.innerHTML = '';
    if (tableContainer) tableContainer.innerHTML = emptyHTML;
  }

  // Update dashboard data (KPIs, Charts, Table) without re-rendering filters
  function updateDashboardData(data) {
    if (!data || !data.wholesales || data.wholesales.length === 0) {
      showEmptyData();
      return;
    }

    const { wholesales, summary } = data;
    const allCountries = getAllCountries(wholesales);

    // Update KPIs based on view mode
    const viewMode = summary.view_mode || currentViewMode;

    // Update total value label and value
    const kpiTotalLabel = document.getElementById('kpiTotalLabel');
    const kpiTotalValue = document.getElementById('kpiTotalValue');
    const kpiTotalSubtext = document.getElementById('kpiTotalSubtext');
    const kpiLabels = {
      sales: { label: 'ยอดขายรวม', subtext: 'Total Sales' },
      travelers: { label: 'จำนวนผู้เดินทาง', subtext: 'Total Travelers' },
      orders: { label: 'จำนวนออเดอร์', subtext: 'Total Orders' },
      net_commission: { label: 'ค่าคอมสุทธิรวม', subtext: 'Total Net Commission' }
    };
    const kpiLabel = kpiLabels[viewMode] || kpiLabels.sales;
    if (kpiTotalLabel) kpiTotalLabel.textContent = kpiLabel.label;
    if (kpiTotalValue) kpiTotalValue.textContent = formatValueByMode(summary.total_value || 0, viewMode);
    if (kpiTotalSubtext) kpiTotalSubtext.textContent = kpiLabel.subtext;

    // Update top wholesale
    document.getElementById('kpiTopWholesale').textContent = truncateName(summary.top_wholesale.name, 20);
    document.getElementById('kpiTopWholesale').title = summary.top_wholesale.name;
    const kpiTopWholesaleSubtext = document.getElementById('kpiTopWholesaleSubtext');
    if (kpiTopWholesaleSubtext) kpiTopWholesaleSubtext.textContent = formatValueByMode(summary.top_wholesale.count, viewMode);

    // Update top country
    document.getElementById('kpiTopCountry').textContent = summary.top_country.name;
    const kpiTopCountrySubtext = document.getElementById('kpiTopCountrySubtext');
    if (kpiTopCountrySubtext) kpiTopCountrySubtext.textContent = formatValueByMode(summary.top_country.count, viewMode);

    // Update partners
    document.getElementById('kpiPartners').textContent = formatNumber(summary.total_partners);

    // Update chart subtitle
    const chartSubtitle = document.getElementById('chartSubtitle');
    if (chartSubtitle) {
      const subtitleMap = {
        sales: 'เรียงตามยอดขาย',
        travelers: 'เรียงตามจำนวนผู้เดินทาง',
        orders: 'เรียงตามจำนวนออเดอร์',
        net_commission: 'เรียงตามค่าคอมสุทธิ'
      };
      chartSubtitle.textContent = subtitleMap[viewMode] || subtitleMap.sales;
    }

    // Update top wholesales title
    const topWholesalesTitle = document.getElementById('topWholesalesTitle');
    if (topWholesalesTitle) {
      topWholesalesTitle.innerHTML = `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
        </svg>
        ${{ sales: 'สัดส่วนยอดขาย', travelers: 'สัดส่วนผู้เดินทาง', orders: 'สัดส่วนออเดอร์', net_commission: 'สัดส่วนค่าคอมสุทธิ' }[viewMode] || 'สัดส่วนยอดขาย'}
      `;
    }

    // Update stacked chart title
    const stackedChartTitle = document.getElementById('stackedChartTitle');
    if (stackedChartTitle) {
      stackedChartTitle.innerHTML = `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="3" y="3" width="18" height="18" rx="2"/>
          <path d="M3 9h18M9 21V9"/>
        </svg>
        ${{ sales: 'สัดส่วนยอดขายแยกตามประเทศ', travelers: 'สัดส่วนผู้เดินทางแยกตามประเทศ', orders: 'สัดส่วนออเดอร์แยกตามประเทศ', net_commission: 'สัดส่วนค่าคอมสุทธิแยกตามประเทศ' }[viewMode] || 'สัดส่วนยอดขายแยกตามประเทศ'}
      `;
    }

    // Update Charts
    renderTopWholesalesChart(wholesales.slice(0, 10));
    renderStackedChart(wholesales);

    // Update Top Wholesales List
    const listContainer = document.getElementById('topWholesalesList');
    if (listContainer) {
      listContainer.innerHTML = renderTopWholesalesList(wholesales.slice(0, 5), summary.total_value || 0);
    }

    // Update Table
    const table = document.getElementById('dashboardTable');
    if (table) {
      table.innerHTML = renderTableHeader(allCountries) + `<tbody id="dashboardTableBody">${renderTableRows(wholesales, summary.total_value || 0, allCountries)}</tbody>`;
      initTableSorting(wholesales, summary.total_value || 0, allCountries);
    }

    // Re-init search with new data
    initSearch(wholesales, summary.total_value || 0, allCountries);
    initExport(wholesales, summary.total_value || 0, allCountries);
  }

  // Truncate long names
  function truncateName(name, maxLength) {
    if (name.length <= maxLength) return name;
    return name.substring(0, maxLength) + '...';
  }

  // Render top wholesales list
  function renderTopWholesalesList(wholesales, totalValue) {
    return wholesales.map((item, index) => {
      const percent = totalValue > 0 ? ((item.total / totalValue) * 100) : 0;
      const rankClass = index < 3 ? `top-${index + 1}` : 'other';

      return `
        <div class="top-wholesale-item ${rankClass}">
          <div class="wholesale-rank ${rankClass}">${index + 1}</div>
          <div class="wholesale-info">
            <div class="wholesale-name" title="${item.name}">${truncateName(item.name, 25)}</div>
            <div class="wholesale-bar-wrapper">
              <div class="wholesale-bar" style="width: ${percent}%;"></div>
            </div>
          </div>
          <div class="wholesale-count">${percent.toFixed(1)}%</div>
        </div>
      `;
    }).join('');
  }

  // Get all unique countries from wholesales data (sorted by total bookings desc)
  function getAllCountries(wholesales) {
    const countryTotals = {};
    wholesales.forEach(w => {
      Object.entries(w.countries).forEach(([country, count]) => {
        countryTotals[country] = (countryTotals[country] || 0) + count;
      });
    });
    // Sort by total bookings descending
    return Object.entries(countryTotals)
      .sort((a, b) => b[1] - a[1])
      .map(([country]) => country);
  }

  // Render table header with grouped country columns
  function renderTableHeader(countries) {
    const totalLabelMap = {
      sales: 'ยอดขายรวม',
      travelers: 'จำนวนผู้เดินทาง',
      orders: 'จำนวนออเดอร์',
      net_commission: 'ค่าคอมสุทธิ'
    };
    const totalLabel = totalLabelMap[currentViewMode] || totalLabelMap.sales;

    return `
      <thead>
        <tr class="header-main">
          <th rowspan="2" class="sticky-left sticky-left-first" style="text-align: center;">#</th>
          <th rowspan="2" class="sticky-left sticky-left-second" style="text-align: left; min-width: 180px;" data-sort="name" data-type="string">
            Wholesale
            <span class="sort-icon"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M19 12l-7 7-7-7"/></svg></span>
          </th>
          <th colspan="${countries.length}" class="country-group-header">ประเทศ</th>
          <th rowspan="2" class="sticky-right sticky-right-second" style="text-align: right;" data-sort="total" data-type="number" id="tableTotalHeader">
            ${totalLabel}
            <span class="sort-icon"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M19 12l-7 7-7-7"/></svg></span>
          </th>
          <th rowspan="2" class="sticky-right sticky-right-first" style="text-align: right;">สัดส่วน</th>
        </tr>
        <tr class="header-sub">
          ${countries.map(country => `
            <th class="country-sub-header" data-sort="country-${country}" data-type="number" data-country="${country}">
              ${country}
              <span class="sort-icon"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M19 12l-7 7-7-7"/></svg></span>
            </th>
          `).join('')}
        </tr>
      </thead>
    `;
  }

  // Render table rows with dynamic country columns
  function renderTableRows(wholesales, totalValue, countries) {
    return wholesales.map((item, index) => {
      const percent = totalValue > 0 ? ((item.total / totalValue) * 100).toFixed(1) : '0.0';
      const formattedTotal = formatNumber(item.total);

      return `
        <tr data-wholesale="${item.name}" data-index="${index}">
          <td class="sticky-left sticky-left-first" style="text-align: center; color: #9ca3af; font-size: 16px;">${index + 1}</td>
          <td class="sticky-left sticky-left-second" style="font-weight: 500;">${item.name}</td>
          ${countries.map(country => {
            const count = item.countries[country] || 0;
            const formattedCount = currentViewMode === 'travelers' ? formatNumber(count) : formatNumber(count);
            return `<td class="country-cell ${count === 0 ? 'zero-value' : ''}">${count === 0 ? '-' : formattedCount}</td>`;
          }).join('')}
          <td class="sticky-right sticky-right-second" style="text-align: right; font-weight: 600; color: #4a7ba7;">${formattedTotal}</td>
          <td class="sticky-right sticky-right-first" style="text-align: right; color: #6b7280;">${percent}%</td>
        </tr>
      `;
    }).join('');
  }

  // Render Top 10 Wholesales horizontal bar chart
  function renderTopWholesalesChart(wholesales) {
    const canvas = document.getElementById('topWholesalesChart');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');

    if (topWholesalesChart) {
      topWholesalesChart.destroy();
    }

    const labels = wholesales.map(w => truncateName(w.name, 20));
    const data = wholesales.map(w => w.total);

    const chartLabel = { sales: 'ยอดขาย', travelers: 'จำนวนผู้เดินทาง', orders: 'จำนวนออเดอร์', net_commission: 'ค่าคอมสุทธิ' }[currentViewMode] || 'ยอดขาย';

    topWholesalesChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [{
          label: chartLabel,
          data: data,
          backgroundColor: '#4a7ba7',
          borderColor: '#3d6a91',
          borderWidth: 1,
          borderRadius: 4
        }]
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          datalabels: {
            anchor: 'end',
            align: 'end',
            color: '#374151',
            font: { family: 'Kanit', size: 14, weight: '600' },
            formatter: function(value) {
              return currentViewMode === 'travelers' ? formatNumber(value) : formatNumber(value);
            }
          },
          tooltip: {
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            titleColor: '#fff',
            bodyColor: 'rgba(255,255,255,0.9)',
            padding: 12,
            titleFont: { family: 'Kanit', size: 16, weight: '600' },
            bodyFont: { family: 'Kanit', size: 15 },
            callbacks: {
              label: function(context) {
                const label = { sales: 'ยอดขาย', travelers: 'ผู้เดินทาง', orders: 'ออเดอร์', net_commission: 'ค่าคอมสุทธิ' }[currentViewMode] || 'ยอดขาย';
                const value = formatValueByMode(context.raw, currentViewMode);
                return `${label}: ${value}`;
              }
            }
          }
        },
        scales: {
          x: {
            beginAtZero: true,
            grid: { color: 'rgba(0,0,0,0.05)' },
            ticks: {
              font: { family: 'Kanit', size: 14 },
              callback: function(value) {
                return formatNumber(value);
              }
            }
          },
          y: {
            grid: { display: false },
            ticks: {
              font: { family: 'Kanit', size: 14 }
            }
          }
        }
      },
      plugins: [ChartDataLabels]
    });
  }

  // Render stacked bar chart
  function renderStackedChart(wholesales) {
    const canvas = document.getElementById('stackedChart');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');

    if (stackedChart) {
      stackedChart.destroy();
    }

    // Get all unique countries
    const allCountriesSet = new Set();
    wholesales.forEach(w => {
      Object.keys(w.countries).forEach(c => allCountriesSet.add(c));
    });
    const countries = Array.from(allCountriesSet);

    // Define colors for countries
    const countryColors = {
      'ญี่ปุ่น': '#ef4444',
      'เวียดนาม': '#22c55e',
      'จีน': '#f59e0b',
      'เกาหลี': '#3b82f6',
      'ไต้หวัน': '#8b5cf6',
      'มาเลเซีย': '#ec4899',
      'สิงคโปร์': '#06b6d4',
      'ลาว': '#84cc16',
      'ฮ่องกง': '#f97316',
      'อื่นๆ': '#6b7280'
    };

    const defaultColors = ['#4a7ba7', '#5c6bc0', '#7b1fa2', '#c2185b', '#d32f2f', '#f57c00', '#fbc02d', '#388e3c', '#00897b', '#1976d2'];

    // Create datasets for each country
    const datasets = countries.map((country, index) => ({
      label: country,
      data: wholesales.map(w => w.countries[country] || 0),
      backgroundColor: countryColors[country] || defaultColors[index % defaultColors.length],
      borderWidth: 0,
      borderRadius: 2
    }));

    const labels = wholesales.map(w => truncateName(w.name, 15));

    stackedChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: datasets
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        layout: {
          padding: {
            left: 20,
            top: 10
          }
        },
        plugins: {
          legend: {
            display: true,
            position: 'top',
            align: 'center',
            maxHeight: 40,
            labels: {
              font: { family: 'Kanit', size: 11 },
              padding: 8,
              boxWidth: 8,
              usePointStyle: true,
              pointStyle: 'circle'
            }
          },
          datalabels: { display: false },
          tooltip: {
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            titleColor: '#fff',
            bodyColor: 'rgba(255,255,255,0.9)',
            padding: 12,
            titleFont: { family: 'Kanit', size: 16, weight: '600' },
            bodyFont: { family: 'Kanit', size: 15 },
            callbacks: {
              label: function(context) {
                const value = formatValueByMode(context.raw, currentViewMode);
                return `${context.dataset.label}: ${value}`;
              }
            }
          }
        },
        scales: {
          x: {
            stacked: true,
            grid: { display: false },
            ticks: {
              font: { family: 'Kanit', size: 13 },
              maxRotation: 45,
              minRotation: 45
            }
          },
          y: {
            stacked: true,
            beginAtZero: true,
            grid: { color: 'rgba(0,0,0,0.05)' },
            ticks: {
              font: { family: 'Kanit', size: 14 },
              callback: function(value) {
                return formatNumber(value);
              }
            }
          }
        }
      }
    });
  }

  // Initialize search
  function initSearch(wholesales, totalBookings, countries) {
    const searchInput = document.getElementById('dashboardSearchInput');
    if (!searchInput) return;

    // Remove old event listeners by replacing the element
    const newSearchInput = searchInput.cloneNode(true);
    searchInput.parentNode.replaceChild(newSearchInput, searchInput);

    newSearchInput.addEventListener('input', function() {
      const query = this.value.toLowerCase().trim();
      const filtered = wholesales.filter(w =>
        w.name.toLowerCase().includes(query)
      );

      const tableBody = document.getElementById('dashboardTableBody');
      if (tableBody) {
        tableBody.innerHTML = renderTableRows(filtered, totalBookings, countries);
      }
    });
  }

  // Initialize export
  function initExport(wholesales, totalBookings, countries) {
    const exportBtn = document.getElementById('dashboardExportBtn');
    if (!exportBtn) return;

    // Remove old event listeners by replacing the element
    const newExportBtn = exportBtn.cloneNode(true);
    exportBtn.parentNode.replaceChild(newExportBtn, exportBtn);

    newExportBtn.addEventListener('click', function() {
      // Build CSV header
      const totalColLabel = { sales: 'Total Sales', travelers: 'Total Travelers', orders: 'Total Orders', net_commission: 'Total Net Commission' }[currentViewMode] || 'Total Sales';
      const header = ['No', 'Wholesale', ...countries, totalColLabel, 'Percentage'];
      let csv = header.map(h => `"${h}"`).join(',') + '\n';

      // Get visible rows from table
      const tableBody = document.getElementById('dashboardTableBody');
      const visibleRows = tableBody.querySelectorAll('tr');

      visibleRows.forEach((row, index) => {
        const cells = row.querySelectorAll('td');
        if (cells.length >= 4 + countries.length) {
          const no = index + 1;
          const name = cells[1].textContent.trim();

          // Get country values
          const countryValues = countries.map((_, i) => {
            const val = cells[2 + i].textContent.trim();
            return val === '-' ? '0' : val.replace(/,/g, '');
          });

          const total = cells[2 + countries.length].textContent.trim().replace(/,/g, '');
          const percent = cells[3 + countries.length].textContent.trim();

          csv += `${no},"${name}",${countryValues.join(',')},${total},${percent}\n`;
        }
      });

      const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `wholesale-destinations-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    });
  }

  // Initialize table sorting
  function initTableSorting(wholesales, totalBookings, countries) {
    const table = document.getElementById('dashboardTable');
    if (!table) return;

    const headers = table.querySelectorAll('th[data-sort]');
    let currentSort = { field: null, direction: 'asc' };

    headers.forEach(header => {
      // Remove old event listeners by replacing the element
      const newHeader = header.cloneNode(true);
      header.parentNode.replaceChild(newHeader, header);

      newHeader.addEventListener('click', function() {
        const field = this.dataset.sort;
        const type = this.dataset.type;
        const country = this.dataset.country;

        // Toggle direction
        if (currentSort.field === field) {
          currentSort.direction = currentSort.direction === 'asc' ? 'desc' : 'asc';
        } else {
          currentSort.field = field;
          currentSort.direction = 'desc';
        }

        // Sort data
        const sorted = [...wholesales].sort((a, b) => {
          let valA, valB;

          if (field === 'name') {
            valA = a.name.toLowerCase();
            valB = b.name.toLowerCase();
          } else if (field === 'total') {
            valA = a.total;
            valB = b.total;
          } else if (field.startsWith('country-') && country) {
            valA = a.countries[country] || 0;
            valB = b.countries[country] || 0;
          } else {
            valA = a.total;
            valB = b.total;
          }

          if (currentSort.direction === 'asc') {
            return valA > valB ? 1 : -1;
          } else {
            return valA < valB ? 1 : -1;
          }
        });

        // Update table
        const tableBody = document.getElementById('dashboardTableBody');
        if (tableBody) {
          tableBody.innerHTML = renderTableRows(sorted, totalBookings, countries);
        }

        // Update header styles
        table.querySelectorAll('th[data-sort]').forEach(h => h.classList.remove('sorted', 'sort-asc', 'sort-desc'));
        this.classList.add('sorted', currentSort.direction === 'asc' ? 'sort-asc' : 'sort-desc');
      });
    });
  }

  // Global function for clearing period filter (called from badge button)
  window.clearPeriodFilter = function() {
    selectedPeriods = [];

    // Reset period type selector
    const periodTypeBtn = document.getElementById('periodTypeBtn');
    if (periodTypeBtn) {
      periodTypeBtn.classList.remove('active');
      const btnText = periodTypeBtn.querySelector('.time-btn-text');
      if (btnText) btnText.textContent = 'ทั้งหมด';
    }

    // Clear selected state in period type dropdown
    const periodTypeDropdown = document.getElementById('periodTypeDropdown');
    if (periodTypeDropdown) {
      periodTypeDropdown.querySelectorAll('.time-dropdown-item').forEach(item => {
        item.classList.remove('selected');
      });
    }

    // Reset all period dropdowns
    const periodValueButtons = document.getElementById('periodValueButtons');
    if (periodValueButtons) {
      const defaultTexts = {
        'yearly': 'เลือกปี',
        'quarterly': 'เลือกไตรมาส',
        'monthly': 'เลือกเดือน'
      };

      periodValueButtons.querySelectorAll('.time-dropdown-wrapper').forEach(wrapper => {
        const type = wrapper.dataset.type;
        const btn = wrapper.querySelector('.time-btn');
        const btnText = btn?.querySelector('.time-btn-text');

        if (btnText && defaultTexts[type]) {
          btnText.textContent = defaultTexts[type];
        }
        if (btn) {
          btn.classList.remove('active');
        }

        wrapper.querySelectorAll('.time-dropdown-item').forEach(item => {
          item.classList.remove('selected');
          const checkbox = item.querySelector('.period-checkbox');
          if (checkbox) checkbox.checked = false;
        });

        wrapper.style.display = 'none';
      });
    }

    // Hide badge
    const badge = document.getElementById('selectedPeriodBadge');
    if (badge) badge.style.display = 'none';

    // Reset country dropdown to show all
    renderCountryItems(availableCountries);

    // Apply filters
    applyAllFilters();
  };

  // Global function for clearing wholesale filter (called from badge button)
  window.clearWholesaleFilter = function() {
    selectedWholesales = [];

    // Reset button
    const btn = document.getElementById('wholesaleFilterBtn');
    if (btn) {
      btn.classList.remove('active');
      const btnText = btn.querySelector('.time-btn-text');
      if (btnText) btnText.textContent = 'Wholesale ทั้งหมด';
    }

    // Clear dropdown selection
    clearWholesaleDropdownSelection();

    // Hide badge
    const badge = document.getElementById('selectedWholesaleBadge');
    if (badge) badge.style.display = 'none';

    // Reset period dropdowns
    populateTimeDropdowns();

    // Apply filters
    applyAllFilters();
  };

})();
