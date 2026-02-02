// Wholesale Destinations - Main JavaScript
(function () {
  'use strict';

  let currentFilters = {};
  let currentData = null;
  let topWholesalesChart = null;
  let stackedChart = null;
  let availablePeriods = null;
  let isInitialized = false;

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

      // Load data
      const response = await WholesaleDestinationsAPI.getWholesaleDestinations({});

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
    const dataContainer = document.getElementById('dashboardDataContainer');
    if (dataContainer) {
      dataContainer.innerHTML = `
        <div class="dashboard-table-empty">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"/>
            <path d="M8 15s1.5-2 4-2 4 2 4 2"/>
            <line x1="9" y1="9" x2="9.01" y2="9"/>
            <line x1="15" y1="9" x2="15.01" y2="9"/>
          </svg>
          <h3 style="margin: 0 0 8px 0; font-size: 16px; color: #374151;">ไม่พบข้อมูล</h3>
          <p style="margin: 0; font-size: 16px;">ลองปรับเงื่อนไขการค้นหาใหม่</p>
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

  // Render main dashboard (only called once on initial load)
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
        <!-- Filter Controls (stays fixed, not re-rendered) -->
        <div class="time-granularity-control" id="filterControlsContainer">
          <!-- Period Filter -->
          <span class="time-granularity-label">เลือกช่วงเวลา</span>
          <div id="periodFilterContainer"></div>

          <!-- Separator -->
          <div class="filter-separator"></div>

          <!-- Country Filter -->
          <span class="time-granularity-label">ประเทศ</span>
          <div id="countryFilterContainer"></div>
        </div>

        <!-- Data Container (this part gets updated on filter change) -->
        <div id="dashboardDataContainer">
          ${renderDashboardData(data)}
        </div>
      </div>
    `;

    tabContent.innerHTML = dashboardHTML;

    // Initialize filter components (only once)
    if (!isInitialized) {
      initPeriodFilter();
      initCountryFilter();
      isInitialized = true;
    }

    // Initialize data components
    initDataComponents(data);
  }

  // Render dashboard data (KPIs, Charts, Table)
  function renderDashboardData(data) {
    const { wholesales, summary, country_totals } = data;
    const allCountries = getAllCountries(wholesales);

    return `
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
            <div class="kpi-label">ยอดจองทั้งหมด</div>
            <div class="kpi-value" id="kpiTotalBookings">${formatNumber(summary.total_bookings)}</div>
            <div class="kpi-subtext">Total Bookings</div>
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
            <div class="kpi-subtext">${formatNumber(summary.top_wholesale.count)} bookings</div>
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
            <div class="kpi-subtext">${formatNumber(summary.top_country.count)} bookings</div>
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
              <div class="glass-chart-subtitle">เรียงตามยอดจอง</div>
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
              <div class="glass-chart-title">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                </svg>
                สัดส่วนยอดขาย
              </div>
              <div class="glass-chart-subtitle">Top 5 Wholesales</div>
            </div>
          </div>
          <div class="top-wholesales-list" id="topWholesalesList">
            ${renderTopWholesalesList(wholesales.slice(0, 5), summary.total_bookings)}
          </div>
        </div>
      </div>

      <!-- Stacked Bar Chart -->
      <div class="glass-chart-container" style="margin-bottom: 24px;">
        <div class="glass-chart-header">
          <div>
            <div class="glass-chart-title">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="3" y="3" width="18" height="18" rx="2"/>
                <path d="M3 9h18M9 21V9"/>
              </svg>
              สัดส่วนยอดจองแยกตามประเทศ
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
              ${renderTableRows(wholesales, summary.total_bookings, allCountries)}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  // Update dashboard data only (without re-rendering filters)
  function updateDashboardData(data) {
    console.log('🔄 Updating dashboard data:', data);

    const dataContainer = document.getElementById('dashboardDataContainer');
    if (!dataContainer) {
      console.error('Data container not found');
      return;
    }

    if (!data || !data.wholesales || data.wholesales.length === 0) {
      showEmpty();
      return;
    }

    currentData = data;
    dataContainer.innerHTML = renderDashboardData(data);
    initDataComponents(data);
  }

  // Initialize data-related components (charts, search, export, sorting)
  function initDataComponents(data) {
    const { wholesales, summary } = data;
    const allCountries = getAllCountries(wholesales);

    renderTopWholesalesChart(wholesales.slice(0, 10));
    renderStackedChart(wholesales);
    initSearch(wholesales, summary.total_bookings, allCountries);
    initExport(wholesales, summary.total_bookings, allCountries);
    initTableSorting(wholesales, summary.total_bookings, allCountries);
  }

  // Initialize Period Filter Component
  function initPeriodFilter() {
    if (typeof PeriodFilterComponent === 'undefined') {
      console.error('❌ PeriodFilterComponent not loaded');
      return;
    }

    PeriodFilterComponent.init({
      containerId: 'periodFilterContainer',
      onFilterChange: handleFilterChange,
      fetchAvailablePeriods: async function(filters) {
        return await WholesaleDestinationsAPI.getAvailablePeriods(filters);
      }
    });
  }

  // Initialize Country Filter Component
  function initCountryFilter() {
    if (typeof CountryFilterComponent === 'undefined') {
      console.error('❌ CountryFilterComponent not loaded');
      return;
    }

    CountryFilterComponent.init({
      containerId: 'countryFilterContainer',
      onFilterChange: handleFilterChange,
      fetchCountries: async function() {
        return await WholesaleDestinationsAPI.getCountries();
      }
    });
  }

  // Handle filter changes from both components
  async function handleFilterChange() {
    console.log('📅 Handling filter change...');

    // Get filters from both components
    const periodFilters = typeof PeriodFilterComponent !== 'undefined' ? PeriodFilterComponent.getFilters() : {};
    const countryFilters = typeof CountryFilterComponent !== 'undefined' ? CountryFilterComponent.getFilters() : {};

    // Merge filters
    const filters = { ...periodFilters, ...countryFilters };
    console.log('📅 Combined filters:', filters);

    // Store current filters
    currentFilters = filters;

    try {
      showDashboardLoading();
      const response = await WholesaleDestinationsAPI.getWholesaleDestinations(filters);
      hideDashboardLoading();

      if (response && response.success && response.data) {
        updateDashboardData(response.data);
      } else {
        showEmpty();
      }
    } catch (error) {
      console.error('❌ Failed to apply filters:', error);
      hideDashboardLoading();
    }
  }

  // Truncate long names
  function truncateName(name, maxLength) {
    if (name.length <= maxLength) return name;
    return name.substring(0, maxLength) + '...';
  }

  // Render top wholesales list
  function renderTopWholesalesList(wholesales, totalBookings) {
    return wholesales.map((item, index) => {
      const percent = ((item.total / totalBookings) * 100);
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
    return `
      <thead>
        <tr class="header-main">
          <th rowspan="2" class="sticky-left sticky-left-first" style="text-align: center;">#</th>
          <th rowspan="2" class="sticky-left sticky-left-second" style="text-align: left; min-width: 180px;" data-sort="name" data-type="string">
            Wholesale
            <span class="sort-icon"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M19 12l-7 7-7-7"/></svg></span>
          </th>
          <th colspan="${countries.length}" class="country-group-header">ประเทศ</th>
          <th rowspan="2" class="sticky-right sticky-right-second" style="text-align: right;" data-sort="total" data-type="number">
            ยอดรวม
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
  function renderTableRows(wholesales, totalBookings, countries) {
    return wholesales.map((item, index) => {
      const percent = ((item.total / totalBookings) * 100).toFixed(1);

      return `
        <tr data-wholesale="${item.name}" data-index="${index}">
          <td class="sticky-left sticky-left-first" style="text-align: center; color: #9ca3af; font-size: 16px;">${index + 1}</td>
          <td class="sticky-left sticky-left-second" style="font-weight: 500;">${item.name}</td>
          ${countries.map(country => {
            const count = item.countries[country] || 0;
            return `<td class="country-cell ${count === 0 ? 'zero-value' : ''}">${count === 0 ? '-' : formatNumber(count)}</td>`;
          }).join('')}
          <td class="sticky-right sticky-right-second" style="text-align: right; font-weight: 600; color: #4a7ba7;">${formatNumber(item.total)}</td>
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

    topWholesalesChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [{
          label: 'ยอดจอง',
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
              return formatNumber(value);
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
                return `ยอดจอง: ${formatNumber(context.raw)}`;
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
    const allCountries = new Set();
    wholesales.forEach(w => {
      Object.keys(w.countries).forEach(c => allCountries.add(c));
    });
    const countries = Array.from(allCountries);

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
                return `${context.dataset.label}: ${formatNumber(context.raw)}`;
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

    searchInput.addEventListener('input', function() {
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

    exportBtn.addEventListener('click', function() {
      // Build CSV header
      const header = ['No', 'Wholesale', ...countries, 'Total Bookings', 'Percentage'];
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
      header.addEventListener('click', function() {
        const field = this.dataset.sort;
        const type = this.dataset.type;
        const country = this.dataset.country; // For country columns

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
            // Sort by specific country
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
        headers.forEach(h => h.classList.remove('sorted', 'asc', 'desc'));
        this.classList.add('sorted', currentSort.direction);
      });
    });
  }

})();
