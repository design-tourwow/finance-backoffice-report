// Wholesale Destinations - Main JavaScript
(function () {
  'use strict';

  let currentFilters = {};
  let currentData = null;
  let topWholesalesChart = null;
  let stackedChart = null;
  let availablePeriods = null;
  let selectedPeriod = { type: 'yearly', year: null, quarter: null, month: null };

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
    const section = document.querySelector('.report-content-section');
    if (section) {
      section.innerHTML = `
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

    const dashboardHTML = `
      <div class="wholesale-dashboard">
        <!-- Time Granularity Control -->
        <div class="time-granularity-control">
          <span class="time-granularity-label">เลือกช่วงเวลา</span>
          <div class="time-granularity-buttons">
            <div class="time-dropdown-wrapper">
              <button class="time-btn" data-granularity="yearly" id="yearlyBtn">
                <span class="time-btn-text">รายปี</span>
                <svg class="time-btn-arrow" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="6 9 12 15 18 9"/>
                </svg>
              </button>
              <div class="time-dropdown-menu" id="yearlyDropdown"></div>
            </div>
            <div class="time-dropdown-wrapper">
              <button class="time-btn" data-granularity="quarterly" id="quarterlyBtn">
                <span class="time-btn-text">รายไตรมาส</span>
                <svg class="time-btn-arrow" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="6 9 12 15 18 9"/>
                </svg>
              </button>
              <div class="time-dropdown-menu" id="quarterlyDropdown"></div>
            </div>
            <div class="time-dropdown-wrapper">
              <button class="time-btn" data-granularity="monthly" id="monthlyBtn">
                <span class="time-btn-text">รายเดือน</span>
                <svg class="time-btn-arrow" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="6 9 12 15 18 9"/>
                </svg>
              </button>
              <div class="time-dropdown-menu" id="monthlyDropdown"></div>
            </div>
          </div>
          <div class="selected-period-badge" id="selectedPeriodBadge" style="display: none;"></div>
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
              <thead>
                <tr>
                  <th style="text-align: center; width: 50px;">#</th>
                  <th style="text-align: left;" data-sort="name" data-type="string">
                    Wholesale
                    <span class="sort-icon"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M19 12l-7 7-7-7"/></svg></span>
                  </th>
                  <th style="text-align: left;">ประเทศหลัก</th>
                  <th style="text-align: right;" data-sort="total" data-type="number">
                    ยอดรวม
                    <span class="sort-icon"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M19 12l-7 7-7-7"/></svg></span>
                  </th>
                  <th style="text-align: right;">สัดส่วน</th>
                </tr>
              </thead>
              <tbody id="dashboardTableBody">
                ${renderTableRows(wholesales, summary.total_bookings)}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;

    tabContent.innerHTML = dashboardHTML;

    // Initialize components
    initTimeGranularityButtons();
    renderTopWholesalesChart(wholesales.slice(0, 10));
    renderStackedChart(wholesales);
    initSearch(wholesales, summary.total_bookings);
    initExport(wholesales, summary.total_bookings);
    initTableSorting(wholesales, summary.total_bookings);
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

  // Render table rows
  function renderTableRows(wholesales, totalBookings) {
    return wholesales.map((item, index) => {
      const percent = ((item.total / totalBookings) * 100).toFixed(1);
      const topCountry = Object.entries(item.countries)
        .sort((a, b) => b[1] - a[1])[0];
      const otherCountries = Object.entries(item.countries)
        .sort((a, b) => b[1] - a[1])
        .slice(1, 3);

      return `
        <tr data-wholesale="${item.name}" data-index="${index}">
          <td style="text-align: center; color: #9ca3af; font-size: 16px;">${index + 1}</td>
          <td style="font-weight: 500;">${item.name}</td>
          <td>
            <div class="country-tags">
              <span class="country-tag primary">${topCountry[0]} (${formatNumber(topCountry[1])})</span>
              ${otherCountries.map(([country, count]) =>
                `<span class="country-tag">${country} (${formatNumber(count)})</span>`
              ).join('')}
            </div>
          </td>
          <td style="text-align: right; font-weight: 600; color: #4a7ba7;">${formatNumber(item.total)}</td>
          <td style="text-align: right; color: #6b7280;">${percent}%</td>
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
        plugins: {
          legend: {
            display: true,
            position: 'top',
            align: 'start',
            labels: {
              font: { family: 'Kanit', size: 14 },
              padding: 16,
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

  // Initialize time granularity buttons
  async function initTimeGranularityButtons() {
    if (!availablePeriods) {
      try {
        const response = await WholesaleDestinationsAPI.getAvailablePeriods();
        if (response && response.success && response.data) {
          availablePeriods = response.data;
        }
      } catch (error) {
        console.error('❌ Failed to fetch available periods:', error);
        availablePeriods = { years: [] };
      }
    }

    populateTimeDropdowns();
    initDropdownHandlers();
  }

  // Populate time dropdowns
  function populateTimeDropdowns() {
    if (!availablePeriods || !availablePeriods.years) return;

    const yearlyDropdown = document.getElementById('yearlyDropdown');
    const quarterlyDropdown = document.getElementById('quarterlyDropdown');
    const monthlyDropdown = document.getElementById('monthlyDropdown');

    if (yearlyDropdown) {
      yearlyDropdown.innerHTML = availablePeriods.years.map(year => `
        <div class="time-dropdown-item" data-type="yearly" data-year="${year.year_ce}">
          <span class="dropdown-item-label">${year.year_be}</span>
          <span class="dropdown-item-count">${formatNumber(year.total_orders)} orders</span>
        </div>
      `).join('');
    }

    if (quarterlyDropdown && availablePeriods.years.length > 0) {
      const latestYear = availablePeriods.years[0];
      quarterlyDropdown.innerHTML = latestYear.quarters.map(q => `
        <div class="time-dropdown-item" data-type="quarterly" data-year="${latestYear.year_ce}" data-quarter="${q.quarter}">
          <span class="dropdown-item-label">${q.label_with_year}</span>
        </div>
      `).join('');
    }

    if (monthlyDropdown && availablePeriods.years.length > 0) {
      const latestYear = availablePeriods.years[0];
      monthlyDropdown.innerHTML = latestYear.months.map(m => `
        <div class="time-dropdown-item" data-type="monthly" data-year="${latestYear.year_ce}" data-month="${m.month}">
          <span class="dropdown-item-label">${m.label_with_year}</span>
        </div>
      `).join('');
    }
  }

  // Initialize dropdown handlers
  function initDropdownHandlers() {
    const dropdownWrappers = document.querySelectorAll('.time-dropdown-wrapper');

    dropdownWrappers.forEach(wrapper => {
      const btn = wrapper.querySelector('.time-btn');
      const dropdown = wrapper.querySelector('.time-dropdown-menu');

      btn.addEventListener('click', function(e) {
        e.stopPropagation();

        // Close other dropdowns
        document.querySelectorAll('.time-dropdown-menu.show').forEach(d => {
          if (d !== dropdown) d.classList.remove('show');
        });

        dropdown.classList.toggle('show');
      });

      // Handle item selection
      dropdown.addEventListener('click', function(e) {
        const item = e.target.closest('.time-dropdown-item');
        if (!item) return;

        const type = item.dataset.type;
        const year = parseInt(item.dataset.year);
        const quarter = item.dataset.quarter ? parseInt(item.dataset.quarter) : null;
        const month = item.dataset.month ? parseInt(item.dataset.month) : null;

        selectedPeriod = { type, year, quarter, month };

        // Update button text
        const btnText = btn.querySelector('.time-btn-text');
        btnText.textContent = item.querySelector('.dropdown-item-label').textContent;

        // Add active class
        document.querySelectorAll('.time-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        // Close dropdown
        dropdown.classList.remove('show');

        // Show badge
        updateSelectedBadge();

        // Apply filter
        applyPeriodFilter();
      });
    });

    // Close dropdowns on outside click
    document.addEventListener('click', function() {
      document.querySelectorAll('.time-dropdown-menu.show').forEach(d => {
        d.classList.remove('show');
      });
    });
  }

  // Update selected badge
  function updateSelectedBadge() {
    const badge = document.getElementById('selectedPeriodBadge');
    if (!badge || !selectedPeriod.year) return;

    let label = '';
    if (selectedPeriod.type === 'yearly') {
      const year = availablePeriods.years.find(y => y.year_ce === selectedPeriod.year);
      label = year ? year.year_be : selectedPeriod.year;
    } else if (selectedPeriod.type === 'quarterly') {
      label = `Q${selectedPeriod.quarter}/${selectedPeriod.year + 543}`;
    } else if (selectedPeriod.type === 'monthly') {
      const year = availablePeriods.years.find(y => y.year_ce === selectedPeriod.year);
      const month = year?.months.find(m => m.month === selectedPeriod.month);
      label = month ? month.label_with_year : '';
    }

    badge.innerHTML = `
      <span>${label}</span>
      <button class="clear-btn" onclick="clearPeriodFilter()">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="18" y1="6" x2="6" y2="18"/>
          <line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      </button>
    `;
    badge.style.display = 'flex';
  }

  // Apply period filter
  async function applyPeriodFilter() {
    if (!selectedPeriod.year) return;

    let dateFrom, dateTo;
    const year = selectedPeriod.year;

    if (selectedPeriod.type === 'yearly') {
      dateFrom = `${year}-01-01`;
      dateTo = `${year}-12-31`;
    } else if (selectedPeriod.type === 'quarterly' && selectedPeriod.quarter) {
      const q = selectedPeriod.quarter;
      const startMonth = (q - 1) * 3 + 1;
      const endMonth = q * 3;
      dateFrom = `${year}-${String(startMonth).padStart(2, '0')}-01`;
      const lastDay = new Date(year, endMonth, 0).getDate();
      dateTo = `${year}-${String(endMonth).padStart(2, '0')}-${lastDay}`;
    } else if (selectedPeriod.type === 'monthly' && selectedPeriod.month) {
      const m = selectedPeriod.month;
      dateFrom = `${year}-${String(m).padStart(2, '0')}-01`;
      const lastDay = new Date(year, m, 0).getDate();
      dateTo = `${year}-${String(m).padStart(2, '0')}-${lastDay}`;
    }

    console.log('📅 Applying period filter:', { selectedPeriod, dateFrom, dateTo });

    try {
      showDashboardLoading();

      // TODO: Call API with date filters when available
      // const response = await WholesaleDestinationsAPI.getWholesaleDestinations({
      //   booking_date_from: dateFrom,
      //   booking_date_to: dateTo
      // });

      // For now, just hide loading (using mock data)
      setTimeout(() => {
        hideDashboardLoading();
      }, 500);

    } catch (error) {
      console.error('❌ Failed to apply period filter:', error);
      hideDashboardLoading();
    }
  }

  // Clear period filter
  window.clearPeriodFilter = function() {
    selectedPeriod = { type: null, year: null, quarter: null, month: null };

    document.querySelectorAll('.time-btn').forEach((btn, index) => {
      btn.classList.remove('active');
      const text = btn.querySelector('.time-btn-text');
      if (text) {
        const labels = ['รายปี', 'รายไตรมาส', 'รายเดือน'];
        text.textContent = labels[index];
      }
    });

    const badge = document.getElementById('selectedPeriodBadge');
    if (badge) badge.style.display = 'none';

    // Reload data
    loadWholesaleReport();
  };

  // Initialize search
  function initSearch(wholesales, totalBookings) {
    const searchInput = document.getElementById('dashboardSearchInput');
    if (!searchInput) return;

    searchInput.addEventListener('input', function() {
      const query = this.value.toLowerCase().trim();
      const filtered = wholesales.filter(w =>
        w.name.toLowerCase().includes(query)
      );

      const tableBody = document.getElementById('dashboardTableBody');
      if (tableBody) {
        tableBody.innerHTML = renderTableRows(filtered, totalBookings);
      }
    });
  }

  // Initialize export
  function initExport(wholesales, totalBookings) {
    const exportBtn = document.getElementById('dashboardExportBtn');
    if (!exportBtn) return;

    exportBtn.addEventListener('click', function() {
      // Get visible rows from table
      const tableBody = document.getElementById('dashboardTableBody');
      const visibleRows = tableBody.querySelectorAll('tr');

      let csv = 'No,Wholesale,Top Country,Total Bookings,Percentage\n';

      visibleRows.forEach((row, index) => {
        const cells = row.querySelectorAll('td');
        if (cells.length >= 5) {
          const no = index + 1;
          const name = cells[1].textContent.trim();
          const topCountry = cells[2].querySelector('.country-tag.primary')?.textContent.trim() || '';
          const total = cells[3].textContent.trim();
          const percent = cells[4].textContent.trim();

          csv += `${no},"${name}","${topCountry}",${total},${percent}\n`;
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
  function initTableSorting(wholesales, totalBookings) {
    const table = document.getElementById('dashboardTable');
    if (!table) return;

    const headers = table.querySelectorAll('th[data-sort]');
    let currentSort = { field: null, direction: 'asc' };

    headers.forEach(header => {
      header.addEventListener('click', function() {
        const field = this.dataset.sort;
        const type = this.dataset.type;

        // Toggle direction
        if (currentSort.field === field) {
          currentSort.direction = currentSort.direction === 'asc' ? 'desc' : 'asc';
        } else {
          currentSort.field = field;
          currentSort.direction = 'desc';
        }

        // Sort data
        const sorted = [...wholesales].sort((a, b) => {
          let valA = field === 'name' ? a.name : a.total;
          let valB = field === 'name' ? b.name : b.total;

          if (type === 'string') {
            valA = valA.toLowerCase();
            valB = valB.toLowerCase();
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
          tableBody.innerHTML = renderTableRows(sorted, totalBookings);
        }

        // Update header styles
        headers.forEach(h => h.classList.remove('sorted', 'asc', 'desc'));
        this.classList.add('sorted', currentSort.direction);
      });
    });
  }

})();
