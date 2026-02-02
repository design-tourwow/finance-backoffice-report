// Order Report - Main JavaScript
(function () {
  'use strict';

  let currentChart = null;
  let currentTab = 'country';
  let currentFilters = {};
  let currentTableInstance = null;
  let currentTableData = [];
  let currentFilterInstance = null;
  let currentTabData = [];

  // Country dashboard charts
  let countryDashboardChart = null;
  let marketShareChart = null;
  let currentTimeGranularity = 'yearly';
  let availablePeriods = null;
  let selectedPeriods = []; // Array for multi-select: [{ type, year, quarter, month, label }]
  let availableCountries = []; // List of countries from API
  let selectedCountries = []; // Array for multi-select: [{ id, name }]
  
  // Date picker instances
  let travelDatePickerInstance = null;
  let bookingDatePickerInstance = null;
  
  // Dropdown instances
  let countryDropdownInstance = null;
  let supplierDropdownInstance = null;

  document.addEventListener('DOMContentLoaded', function () {
    initOrderReport();
  });

  async function initOrderReport() {
    console.log('🎯 Initializing Country Report...');

    // Check authentication and token expiry
    if (!validateToken()) {
      return;
    }

    // Load country report directly (no tabs)
    await loadCountryReport();

    console.log('✅ Country Report initialized');
  }

  // Load country report
  async function loadCountryReport() {
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
      const periodsResponse = await SalesByCountryAPI.getAvailablePeriods();
      if (periodsResponse && periodsResponse.success && periodsResponse.data) {
        availablePeriods = periodsResponse.data;
        console.log('📅 Available Periods:', availablePeriods);
      }

      // Load all data (no filter)
      const response = await SalesByCountryAPI.getReportByCountry({});

      if (response && response.success && response.data) {
        renderCountryReport(response);
      } else {
        showEmpty();
      }
    } catch (error) {
      console.error('❌ Failed to load country report:', error);
      showEmpty();
    }
  }

  // Check authentication (token exists)
  function checkAuth() {
    if (typeof TourImageAPI !== 'undefined' && TourImageAPI.hasToken) {
      return TourImageAPI.hasToken();
    }
    return !!(sessionStorage.getItem('authToken') || localStorage.getItem('authToken'));
  }

  // Check token expiry - returns true if valid, false if expired
  function checkTokenExpiry() {
    if (typeof TokenUtils !== 'undefined') {
      return !TokenUtils.isTokenExpired();
    }
    return true; // If TokenUtils not available, assume valid
  }

  // Check both auth and token expiry before any action
  function validateToken() {
    if (!checkAuth()) {
      showAuthModal();
      return false;
    }
    if (!checkTokenExpiry()) {
      console.error('❌ Token expired - redirecting to login');
      redirectToLogin('Token หมดอายุ กรุณาเข้าสู่ระบบใหม่');
      return false;
    }
    return true;
  }

  // Show auth modal
  function showAuthModal() {
    if (typeof MenuComponent !== 'undefined' && MenuComponent.showAuthModal) {
      MenuComponent.showAuthModal();
    } else {
      alert('ไม่พบ Token หรือ Token หมดอายุ\nกรุณาเข้าสู่ระบบใหม่อีกครั้ง');
      redirectToLogin();
    }
  }

  // Redirect to login
  function redirectToLogin(message = null) {
    if (typeof TokenUtils !== 'undefined') {
      TokenUtils.redirectToLogin(message || 'ไม่พบ Token หรือ Token หมดอายุ\nกรุณาเข้าสู่ระบบใหม่อีกครั้ง');
      return;
    }

    if (message) alert(message);

    const hostname = window.location.hostname;
    let loginUrl = 'https://financebackoffice.tourwow.com/login';

    if (hostname.includes('staging')) {
      loginUrl = 'https://financebackoffice-staging2.tourwow.com/login';
    }

    window.location.href = loginUrl;
  }

  // Initialize tabs
  function initTabs() {
    const tabs = document.querySelectorAll('.report-tab');
    
    tabs.forEach(tab => {
      tab.addEventListener('click', function() {
        const tabName = this.getAttribute('data-tab');
        switchTab(tabName);
      });
    });
  }

  // Switch tab
  async function switchTab(tabName) {
    // Check token before switching tab
    if (!validateToken()) return;

    // Update active tab
    document.querySelectorAll('.report-tab').forEach(tab => {
      tab.classList.remove('active');
    });
    document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');

    currentTab = tabName;

    // Destroy current filter instance when switching tabs
    if (currentFilterInstance && currentFilterInstance.destroy) {
      currentFilterInstance.destroy();
      currentFilterInstance = null;
    }

    // Hide country dashboard if switching away from country tab
    const countryDashboard = document.querySelector('.country-dashboard');
    if (countryDashboard && tabName !== 'country') {
      countryDashboard.remove();
      // Destroy dashboard charts
      if (countryDashboardChart) {
        countryDashboardChart.destroy();
        countryDashboardChart = null;
      }
      if (marketShareChart) {
        marketShareChart.destroy();
        marketShareChart = null;
      }
    }

    // Show/hide filter dropdown based on tab
    const tableFilters = document.getElementById('tableFilters');
    if (tableFilters) {
      tableFilters.style.display = tabName === 'lead-time' ? 'flex' : 'none';
    }

    // Load data for selected tab
    await loadTabData(tabName);
  }

  // Initialize filters
  async function initFilters() {
    console.log('🔧 Initializing filters...');
    
    try {
      // Initialize country dropdown (Multi-select like tour-image-manager)
      console.log('📍 Creating country dropdown...');
      countryDropdownInstance = SearchableDropdownComponent.initMultiSelect({
        wrapperId: 'countryDropdownWrapper',
        placeholder: 'เลือกประเทศ',
        options: [],
        onChange: (values, labels) => {
          document.getElementById('filterCountry').value = values.join(',');
          console.log('Countries selected:', values, labels);
        }
      });
      
      if (!countryDropdownInstance) {
        console.error('❌ Failed to create country dropdown');
      } else {
        console.log('✅ Country dropdown created');
      }

      // Initialize supplier dropdown (Multi-select like tour-image-manager)
      console.log('🏢 Creating supplier dropdown...');
      supplierDropdownInstance = SearchableDropdownComponent.initMultiSelect({
        wrapperId: 'supplierDropdownWrapper',
        placeholder: 'เลือก Supplier',
        options: [],
        onChange: (values, labels) => {
          document.getElementById('filterSupplier').value = values.join(',');
          console.log('Suppliers selected:', values, labels);
        }
      });
      
      if (!supplierDropdownInstance) {
        console.error('❌ Failed to create supplier dropdown');
      } else {
        console.log('✅ Supplier dropdown created');
      }

      // Load countries
      console.log('🌍 Loading countries...');
      const countriesResponse = await SalesByCountryAPI.getCountries();
      if (countriesResponse && countriesResponse.success && countriesResponse.data) {
        const countryOptions = countriesResponse.data.map(country => ({
          value: country.id,
          label: `${country.name_th} (${country.name_en})`
        }));
        countryDropdownInstance.updateOptions(countryOptions);
        console.log('✅ Countries loaded:', countryOptions.length);
      }

      // Load suppliers
      console.log('🏢 Loading suppliers...');
      const suppliersResponse = await SalesByCountryAPI.getSuppliers();
      if (suppliersResponse && suppliersResponse.success && suppliersResponse.data) {
        const supplierOptions = suppliersResponse.data.map(supplier => ({
          value: supplier.id,
          label: `${supplier.name_th} (${supplier.name_en})`
        }));
        supplierDropdownInstance.updateOptions(supplierOptions);
        console.log('✅ Suppliers loaded:', supplierOptions.length);
      }
      
      console.log('✅ Filters initialized successfully');
    } catch (error) {
      console.error('❌ Failed to load filters:', error);
    }
  }

  // Initialize form handler
  function initFormHandler() {
    const form = document.getElementById('reportFilterForm');
    const submitBtn = form.querySelector('button[type="submit"]');
    
    form.addEventListener('submit', async function(e) {
      e.preventDefault();

      // Check token before submitting
      if (!validateToken()) return;

      // Add loading state
      submitBtn.classList.add('loading');
      submitBtn.disabled = true;
      
      // Get form data
      currentFilters = {};
      
      // Country and Supplier (now comma-separated values from multi-select)
      const countryValue = document.getElementById('filterCountry').value;
      const supplierValue = document.getElementById('filterSupplier').value;
      
      // Convert comma-separated to array, then back to comma-separated for API
      // (or send as array if API supports it)
      if (countryValue) {
        const countryIds = countryValue.split(',').filter(v => v);
        if (countryIds.length > 0) {
          // If API supports multiple IDs, send as comma-separated
          // Otherwise, you might need to send first one only
          currentFilters.country_id = countryIds.join(',');
        }
      }
      
      if (supplierValue) {
        const supplierIds = supplierValue.split(',').filter(v => v);
        if (supplierIds.length > 0) {
          currentFilters.supplier_id = supplierIds.join(',');
        }
      }
      
      // Travel dates
      if (travelDatePickerInstance) {
        const startDate = travelDatePickerInstance.getStartDate();
        const endDate = travelDatePickerInstance.getEndDate();
        if (startDate && endDate) {
          currentFilters.travel_date_from = DatePickerComponent.formatDateToAPI(startDate);
          currentFilters.travel_date_to = DatePickerComponent.formatDateToAPI(endDate);
        }
      }
      
      // Booking dates
      if (bookingDatePickerInstance) {
        const startDate = bookingDatePickerInstance.getStartDate();
        const endDate = bookingDatePickerInstance.getEndDate();
        if (startDate && endDate) {
          currentFilters.booking_date_from = DatePickerComponent.formatDateToAPI(startDate);
          currentFilters.booking_date_to = DatePickerComponent.formatDateToAPI(endDate);
        }
      }
      
      console.log('🔍 Applying filters:', currentFilters);
      
      try {
        // Reload current tab with filters
        await loadTabData(currentTab);
      } finally {
        // Remove loading state
        submitBtn.classList.remove('loading');
        submitBtn.disabled = false;
      }
    });

    form.addEventListener('reset', function(e) {
      e.preventDefault();
      
      // Clear filters object
      currentFilters = {};
      
      // Clear date pickers
      if (travelDatePickerInstance) travelDatePickerInstance.clear();
      if (bookingDatePickerInstance) bookingDatePickerInstance.clear();
      
      // Clear hidden inputs
      document.getElementById('filterCountry').value = '';
      document.getElementById('filterSupplier').value = '';
      
      // Clear multi-select dropdowns
      if (countryDropdownInstance) countryDropdownInstance.clear();
      if (supplierDropdownInstance) supplierDropdownInstance.clear();
      
      console.log('✅ Form reset - filters cleared (no reload)');
    });
  }

  // Initialize date pickers
  function initDatePickers() {
    travelDatePickerInstance = DatePickerComponent.initDateRangePicker({
      inputId: 'travelDateRangePicker',
      dropdownId: 'travelCalendarDropdown',
      wrapperId: 'travelDatePicker',
      onChange: (startDate, endDate) => {
        console.log('Travel dates changed:', startDate, endDate);
      }
    });

    bookingDatePickerInstance = DatePickerComponent.initDateRangePicker({
      inputId: 'bookingDateRangePicker',
      dropdownId: 'bookingCalendarDropdown',
      wrapperId: 'bookingDatePicker',
      onChange: (startDate, endDate) => {
        console.log('Booking dates changed:', startDate, endDate);
      }
    });
  }

  // Initialize table search
  function initTableSearch() {
    const searchInput = document.getElementById('tableSearchInput');
    const clearBtn = document.getElementById('clearTableSearch');
    const resultsDiv = document.getElementById('tableSearchResults');
    const resultCount = document.getElementById('searchResultCount');

    if (!searchInput || !clearBtn) return;

    // Search input handler
    searchInput.addEventListener('input', function(e) {
      const searchTerm = e.target.value.toLowerCase().trim();
      
      // Show/hide clear button
      clearBtn.style.display = searchTerm ? 'flex' : 'none';
      
      if (!searchTerm) {
        // Reset all rows - remove highlights
        const rows = document.querySelectorAll('#reportTableBody tr');
        rows.forEach(row => {
          row.classList.remove('search-hidden');
          // Remove all highlight marks
          row.querySelectorAll('mark').forEach(mark => {
            mark.replaceWith(mark.textContent);
          });
        });
        resultsDiv.style.display = 'none';
        return;
      }

      // Filter rows
      const rows = document.querySelectorAll('#reportTableBody tr');
      let matchCount = 0;

      rows.forEach(row => {
        const cells = row.querySelectorAll('td');
        let rowMatches = false;
        
        cells.forEach(cell => {
          const originalText = cell.textContent;
          const lowerText = originalText.toLowerCase();
          
          if (lowerText.includes(searchTerm)) {
            rowMatches = true;
            
            // Highlight matching text
            const regex = new RegExp(`(${escapeRegex(searchTerm)})`, 'gi');
            const highlightedText = originalText.replace(regex, '<mark class="search-highlight">$1</mark>');
            cell.innerHTML = highlightedText;
          } else {
            // Remove any existing highlights
            cell.querySelectorAll('mark').forEach(mark => {
              mark.replaceWith(mark.textContent);
            });
          }
        });
        
        if (rowMatches) {
          row.classList.remove('search-hidden');
          matchCount++;
        } else {
          row.classList.add('search-hidden');
        }
      });

      // Show results
      resultCount.textContent = matchCount;
      resultsDiv.style.display = 'block';
    });

    // Helper function to escape regex special characters
    function escapeRegex(string) {
      return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    // Clear button handler
    clearBtn.addEventListener('click', function() {
      searchInput.value = '';
      
      // Remove all highlights
      const rows = document.querySelectorAll('#reportTableBody tr');
      rows.forEach(row => {
        row.classList.remove('search-hidden');
        row.querySelectorAll('mark').forEach(mark => {
          mark.replaceWith(mark.textContent);
        });
      });
      
      clearBtn.style.display = 'none';
      resultsDiv.style.display = 'none';
      searchInput.focus();
    });

    // Clear search when switching tabs
    document.querySelectorAll('.report-tab').forEach(tab => {
      tab.addEventListener('click', function() {
        searchInput.value = '';
        clearBtn.style.display = 'none';
        resultsDiv.style.display = 'none';
        const rows = document.querySelectorAll('#reportTableBody tr');
        rows.forEach(row => {
          row.classList.remove('search-hidden');
          row.querySelectorAll('mark').forEach(mark => {
            mark.replaceWith(mark.textContent);
          });
        });
      });
    });
  }

  // Initialize Export CSV button
  function initExportButton() {
    const exportBtn = document.getElementById('exportCsvBtn');
    if (!exportBtn) return;

    exportBtn.addEventListener('click', function() {
      exportCurrentTabToCSV();
    });
  }

  // Load initial data
  async function loadInitialData() {
    // Load summary and tab data in parallel (now using report endpoints - fast!)
    await Promise.all([
      loadSummary(),
      loadTabData('country')
    ]);
  }

  // Load summary
  async function loadSummary() {
    // Check token before loading
    if (!validateToken()) return;

    try {
      const response = await SalesByCountryAPI.getOrderSummary(currentFilters);
      
      console.log('📊 Summary Response:', response);
      
      if (response && response.success && response.data) {
        const data = response.data;
        
        console.log('📊 Summary Data:', data);
        
        document.getElementById('summaryTotalOrders').textContent = 
          formatNumber(data.total_orders || 0);
        document.getElementById('summaryTotalCustomers').textContent = 
          formatNumber(data.total_customers || 0);
        document.getElementById('summaryTotalAmount').textContent = 
          formatCurrency(data.total_net_amount || 0);
        document.getElementById('summaryAvgAmount').textContent = 
          formatCurrency(data.avg_net_amount || 0);
      } else {
        console.warn('⚠️ Invalid summary response format:', response);
        throw new Error('Invalid response format');
      }
    } catch (error) {
      console.error('❌ Failed to load summary:', error);
      // Show placeholder values
      document.getElementById('summaryTotalOrders').textContent = '-';
      document.getElementById('summaryTotalCustomers').textContent = '-';
      document.getElementById('summaryTotalAmount').textContent = '-';
      document.getElementById('summaryAvgAmount').textContent = '-';
    }
  }

  // Load tab data
  async function loadTabData(tabName) {
    // Check token before loading
    if (!validateToken()) return;

    showLoading();
    
    try {
      let response;
      
      // Call API with minimum loading time for better UX
      const apiCall = async () => {
        switch(tabName) {
          case 'country':
            return await SalesByCountryAPI.getReportByCountry(currentFilters);
          case 'supplier':
            return await SalesByCountryAPI.getReportBySupplier(currentFilters);
          case 'travel-date':
            return await SalesByCountryAPI.getReportByTravelDate(currentFilters);
          case 'booking-date':
            return await SalesByCountryAPI.getReportByBookingDate(currentFilters);
          case 'lead-time':
            return await SalesByCountryAPI.getLeadTimeAnalysis(currentFilters);
        }
      };
      
      // Minimum 800ms loading for better UX
      const [apiResponse] = await Promise.all([
        apiCall(),
        new Promise(resolve => setTimeout(resolve, 800))
      ]);
      
      response = apiResponse;
      
      // Render based on tab
      switch(tabName) {
        case 'country':
          renderCountryReport(response);
          break;
        case 'supplier':
          renderSupplierReport(response);
          break;
        case 'travel-date':
          renderTravelDateReport(response);
          break;
        case 'booking-date':
          renderBookingDateReport(response);
          break;
        case 'lead-time':
          renderLeadTimeReport(response);
          break;
      }
      
      // Reload summary
      await loadSummary();
      
    } catch (error) {
      console.error('❌ Failed to load tab data:', error);
      showEmpty();
    }
  }

  // Show loading
  function showLoading() {
    const section = document.querySelector('.report-content-section');
    if (section) {
      section.innerHTML = `
        <div class="dashboard-table-loading">
          <div class="spinner"></div>
          <span>กำลังโหลดข้อมูล...</span>
        </div>
      `;
    }
  }

  // Show empty
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

  // Show dashboard loading overlay
  function showDashboardLoading() {
    const dashboard = document.querySelector('.country-dashboard');
    if (!dashboard) return;

    // Remove existing overlay if any
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

  // Hide dashboard loading overlay
  function hideDashboardLoading() {
    const overlay = document.getElementById('dashboardLoadingOverlay');
    if (overlay) {
      overlay.remove();
    }
  }

  // Show content - not needed with new structure
  function showContent() {
    // Content is rendered directly to section
  }

  // Render Country Report - Interactive Dashboard
  function renderCountryReport(response) {
    console.log('🎨 Rendering Country Dashboard:', response);

    const tabContent = document.querySelector('.report-content-section');

    if (!response || !response.data || response.data.length === 0) {
      console.warn('⚠️ No data in Country Report response');
      tabContent.innerHTML = `
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
      return;
    }

    const data = response.data;
    currentTabData = data;
    console.log('📊 Country Dashboard Data:', data);

    // Calculate KPI metrics
    const totalTravelers = data.reduce((sum, item) => sum + (item.total_customers || 0), 0);
    const totalOrders = data.reduce((sum, item) => sum + (item.total_orders || 0), 0);
    const totalRevenue = data.reduce((sum, item) => sum + (item.total_net_amount || 0), 0);
    const topCountry = data.reduce((max, item) =>
      (item.total_orders > (max?.total_orders || 0)) ? item : max, null);
    const activeCountries = data.filter(item => item.total_orders > 0).length;

    // Calculate metrics
    const topOrdersPercent = topCountry ? ((topCountry.total_orders / totalOrders) * 100) : 0;
    const avgPerOrder = totalOrders > 0 ? (totalRevenue / totalOrders) : 0;
    const avgPerTraveler = totalTravelers > 0 ? (totalRevenue / totalTravelers) : 0;

    // Clear section content completely (remove loading state and any existing dashboard)
    tabContent.innerHTML = '';

    const dashboardHTML = `
      <div class="country-dashboard">
        <!-- Time Granularity Control with Dropdowns -->
        <div class="time-granularity-control">
          <span class="time-granularity-label">เลือกช่วงเวลา</span>

          <!-- Period Type Selector (Master Dropdown) -->
          <div class="time-dropdown-wrapper">
            <button class="time-btn period-type-btn" id="periodTypeBtn">
              <span class="time-btn-text">มุมมอง</span>
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

          <!-- Country Filter -->
          <span class="time-granularity-label">ประเทศ</span>
          <div class="time-dropdown-wrapper">
            <button class="time-btn" id="countryFilterBtn">
              <span class="time-btn-text">เลือกประเทศ</span>
              <svg class="time-btn-arrow" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="6 9 12 15 18 9"/>
              </svg>
            </button>
            <div class="time-dropdown-menu country-dropdown-menu" id="countryFilterDropdown">
              <div class="dropdown-search-wrapper">
                <input type="text" class="dropdown-search-input" id="countrySearchInput" placeholder="ค้นหาประเทศ..." />
              </div>
              <div class="dropdown-items-container" id="countryItemsContainer">
                <!-- Countries will be populated here -->
              </div>
              <div class="dropdown-actions">
                <button type="button" class="dropdown-clear-btn" id="countryFilterClearBtn">ล้าง</button>
                <button type="button" class="dropdown-confirm-btn" id="countryFilterConfirmBtn">ยืนยัน</button>
              </div>
            </div>
          </div>
          <div class="selected-period-badge" id="selectedCountryBadge" style="display: none;"></div>
        </div>

        <!-- Compact KPI Cards -->
        <div class="dashboard-kpi-cards">
          <div class="dashboard-kpi-card kpi-travelers">
            <div class="kpi-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/>
                <circle cx="9" cy="7" r="4"/>
                <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/>
              </svg>
            </div>
            <div class="kpi-content">
              <div class="kpi-label">จำนวนผู้เดินทาง</div>
              <div class="kpi-value" id="kpiTotalTravelers">${formatNumber(totalTravelers)}</div>
              <div class="kpi-subtext">จาก ${formatNumber(totalOrders)} ออเดอร์</div>
            </div>
          </div>

          <div class="dashboard-kpi-card kpi-top-country">
            <div class="kpi-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
              </svg>
            </div>
            <div class="kpi-content">
              <div class="kpi-label">ยอดนิยม #1</div>
              <div class="kpi-value" id="kpiTopCountry">${topCountry?.country_name || '-'}</div>
              <div class="kpi-subtext">${topOrdersPercent.toFixed(1)}% ของทั้งหมด</div>
            </div>
          </div>

          <div class="dashboard-kpi-card kpi-growth">
            <div class="kpi-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="12" y1="1" x2="12" y2="23"/>
                <path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/>
              </svg>
            </div>
            <div class="kpi-content">
              <div class="kpi-label">ยอดรวม</div>
              <div class="kpi-value" id="kpiTotalRevenue">${formatCurrencyShort(totalRevenue)}</div>
              <div class="kpi-subtext">เฉลี่ย ${formatCurrencyShort(avgPerOrder)}/ออเดอร์</div>
            </div>
          </div>

          <div class="dashboard-kpi-card kpi-active">
            <div class="kpi-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/>
              </svg>
            </div>
            <div class="kpi-content">
              <div class="kpi-label">ยอดเฉลี่ย/คน</div>
              <div class="kpi-value" id="kpiAvgPerPerson">${formatCurrencyShort(avgPerTraveler)}</div>
              <div class="kpi-subtext">ต่อผู้เดินทาง 1 คน</div>
            </div>
          </div>
        </div>

        <!-- Charts Row -->
        <div class="dashboard-charts-row">
          <!-- Main Chart with Toggle -->
          <div class="glass-chart-container" id="mainChartContainer">
            <div class="glass-chart-header">
              <div>
                <div class="glass-chart-title">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <line x1="18" y1="20" x2="18" y2="10"/>
                    <line x1="12" y1="20" x2="12" y2="4"/>
                    <line x1="6" y1="20" x2="6" y2="14"/>
                  </svg>
                  จำนวนผู้เดินทางตามประเทศ
                </div>
                <div class="glass-chart-subtitle" id="chartSubtitle">ทุกประเทศ (เรียงตามจำนวน)</div>
              </div>
              <div class="chart-type-toggle">
                <button class="chart-type-btn active" data-type="bar" title="Bar Chart">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <line x1="18" y1="20" x2="18" y2="10"/>
                    <line x1="12" y1="20" x2="12" y2="4"/>
                    <line x1="6" y1="20" x2="6" y2="14"/>
                  </svg>
                </button>
                <button class="chart-type-btn" data-type="pie" title="Pie Chart">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M21.21 15.89A10 10 0 1 1 8 2.83"/>
                    <path d="M22 12A10 10 0 0 0 12 2v10z"/>
                  </svg>
                </button>
              </div>
            </div>
            <div class="glass-chart-scroll-wrapper" id="chartScrollWrapper">
              <div class="glass-chart-wrapper" id="chartWrapper">
                <canvas id="countryAreaChart"></canvas>
              </div>
            </div>
          </div>

          <!-- Market Share Chart -->
          <div class="market-share-container">
            <div class="glass-chart-header">
              <div>
                <div class="glass-chart-title">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M21.21 15.89A10 10 0 1 1 8 2.83"/>
                    <path d="M22 12A10 10 0 0 0 12 2v10z"/>
                  </svg>
                  สัดส่วนยอดขาย
                </div>
                <div class="glass-chart-subtitle">Top ${Math.min(5, data.length)} ประเทศ</div>
              </div>
            </div>
            <div class="market-share-list" id="marketShareList">
              ${renderMarketShareList(data)}
            </div>
          </div>
        </div>

        <!-- Data Table -->
        <div class="dashboard-table-container">
          <div class="dashboard-table-header">
            <div class="dashboard-table-title">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"/>
                <path d="M2 12h20M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/>
              </svg>
              รายละเอียดตามประเทศ
            </div>
            <div class="dashboard-table-actions">
              <div class="dashboard-search-wrapper">
                <svg class="dashboard-search-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="11" cy="11" r="8"/>
                  <path d="M21 21l-4.35-4.35"/>
                </svg>
                <input type="text" class="dashboard-search-input" id="dashboardSearchInput" placeholder="ค้นหาประเทศ...">
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
          <div class="dashboard-table-wrapper" style="overflow-x: auto;">
            <table class="dashboard-table" id="dashboardTable">
              <thead>
                <tr>
                  <th style="text-align: center; width: 50px; cursor: default;">#</th>
                  <th style="text-align: left;" data-sort="country_name" data-type="string">
                    ประเทศ
                    <span class="sort-icon"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M19 12l-7 7-7-7"/></svg></span>
                  </th>
                  <th style="text-align: right;" data-sort="total_orders" data-type="number">
                    Orders
                    <span class="sort-icon"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M19 12l-7 7-7-7"/></svg></span>
                  </th>
                  <th style="text-align: right;" data-sort="total_customers" data-type="number">
                    ลูกค้า
                    <span class="sort-icon"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M19 12l-7 7-7-7"/></svg></span>
                  </th>
                  <th style="text-align: right;" data-sort="total_net_amount" data-type="number">
                    ยอดรวม
                    <span class="sort-icon"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M19 12l-7 7-7-7"/></svg></span>
                  </th>
                  <th style="text-align: right;" data-sort="avg_net_amount" data-type="number">
                    เฉลี่ย/Order
                    <span class="sort-icon"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M19 12l-7 7-7-7"/></svg></span>
                  </th>
                </tr>
              </thead>
              <tbody id="dashboardTableBody">
                ${renderDashboardTableRows(data)}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;

    tabContent.innerHTML = dashboardHTML;

    // Debug: Verify dashboard elements are rendered
    console.log('✅ Dashboard rendered, checking elements:');
    console.log('  - market-share-container:', !!document.querySelector('.market-share-container'));
    console.log('  - chart-type-toggle:', !!document.querySelector('.chart-type-toggle'));
    console.log('  - chart-type-btn count:', document.querySelectorAll('.chart-type-btn').length);
    console.log('  - marketShareList:', !!document.getElementById('marketShareList'));

    // Initialize time granularity buttons
    initTimeGranularityButtons(data);

    // Initialize country filter
    initCountryFilter();

    // Initialize bar chart
    renderCountryAreaChart(data, 'bar');

    // Initialize chart type toggle
    initChartTypeToggle(data);

    // Initialize search
    initDashboardSearch(data);

    // Initialize export
    initDashboardExport(data);

    // Initialize table sorting
    initTableSorting(data);
  }

  // Current chart type
  let currentChartType = 'bar';

  // Initialize chart type toggle
  function initChartTypeToggle(data) {
    const toggleBtns = document.querySelectorAll('.chart-type-btn');
    console.log('🔘 Initializing chart type toggle, found buttons:', toggleBtns.length);

    toggleBtns.forEach(btn => {
      btn.addEventListener('click', function() {
        const chartType = this.dataset.type;
        console.log('📊 Chart type clicked:', chartType, 'current:', currentChartType);
        if (chartType === currentChartType) return;

        // Update active state
        toggleBtns.forEach(b => b.classList.remove('active'));
        this.classList.add('active');

        currentChartType = chartType;

        // Re-render chart with new type
        console.log('📊 Re-rendering chart as:', chartType);
        renderCountryAreaChart(currentTabData, chartType);
      });
    });
  }

  // Get granularity label in Thai
  function getGranularityLabel(granularity) {
    switch(granularity) {
      case 'yearly': return 'รายปี';
      case 'quarterly': return 'รายไตรมาส';
      case 'monthly': return 'รายเดือน';
      default: return 'รายเดือน';
    }
  }

  // Format currency to short format (e.g., 1.2M, 500K)
  function formatCurrencyShort(num) {
    if (num === null || num === undefined) return '-';
    if (num >= 1000000) {
      return '฿' + (num / 1000000).toFixed(1) + 'M';
    } else if (num >= 1000) {
      return '฿' + (num / 1000).toFixed(0) + 'K';
    }
    return '฿' + formatNumber(num);
  }

  // Render market share list
  function renderMarketShareList(data) {
    const totalOrders = data.reduce((sum, item) => sum + (item.total_orders || 0), 0);
    const sorted = [...data].sort((a, b) => b.total_orders - a.total_orders).slice(0, 5);

    return sorted.map((item, index) => {
      const percent = ((item.total_orders / totalOrders) * 100);
      const rankClass = index < 3 ? `top-${index + 1}` : 'other';

      return `
        <div class="market-share-item ${rankClass}">
          <div class="market-share-rank ${rankClass}">${index + 1}</div>
          <div class="market-share-info">
            <div class="market-share-name">${item.country_name || 'ไม่ระบุ'}</div>
            <div class="market-share-bar-wrapper">
              <div class="market-share-bar" style="width: ${percent}%;"></div>
            </div>
          </div>
          <div class="market-share-percent">${percent.toFixed(1)}%</div>
        </div>
      `;
    }).join('');
  }

  // Render dashboard table rows
  function renderDashboardTableRows(data) {
    return data.map((item, index) => `
      <tr data-country="${item.country_name || ''}" data-index="${index}">
        <td style="text-align: center; color: #9ca3af; font-size: 16px;">${index + 1}</td>
        <td style="font-weight: 500;">${item.country_name || 'ไม่ระบุ'}</td>
        <td style="text-align: right; font-variant-numeric: tabular-nums;">${formatNumber(item.total_orders)}</td>
        <td style="text-align: right; font-variant-numeric: tabular-nums;">${formatNumber(item.total_customers)}</td>
        <td style="text-align: right; font-variant-numeric: tabular-nums;">${formatCurrency(item.total_net_amount)}</td>
        <td style="text-align: right; font-variant-numeric: tabular-nums;">${formatCurrency(item.avg_net_amount)}</td>
      </tr>
    `).join('');
  }

  // Initialize time granularity dropdown buttons
  async function initTimeGranularityButtons(data) {
    // Fetch available periods if not already loaded
    if (!availablePeriods) {
      try {
        const response = await SalesByCountryAPI.getAvailablePeriods();
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

    // No default selection - show all data
    // User must click dropdown to filter by period
    selectedPeriod = { type: null, year: null, quarter: null, month: null };
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
        <div class="time-dropdown-item" data-type="yearly" data-year="${year.year_ce}" data-label="พ.ศ. ${year.label}">
          <label class="dropdown-checkbox">
            <input type="checkbox" class="period-checkbox" />
            <span class="checkbox-custom"></span>
          </label>
          <span class="dropdown-item-label">พ.ศ. ${year.label}</span>
          <span class="dropdown-item-count">${formatNumber(year.total_orders)} orders</span>
        </div>
      `).join('');
      yearlyDropdown.innerHTML = createDropdownContent(items, 'yearly');
    }

    // Quarterly dropdown - grouped by year
    const quarterlyDropdown = document.getElementById('quarterlyDropdown');
    if (quarterlyDropdown) {
      let quarterlyItems = '';
      years.forEach(year => {
        quarterlyItems += `<div class="dropdown-year-header">พ.ศ. ${year.label}</div>`;
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
      });
      quarterlyDropdown.innerHTML = createDropdownContent(quarterlyItems, 'quarterly');
    }

    // Monthly dropdown - grouped by year
    const monthlyDropdown = document.getElementById('monthlyDropdown');
    if (monthlyDropdown) {
      let monthlyItems = '';
      years.forEach(year => {
        monthlyItems += `<div class="dropdown-year-header">พ.ศ. ${year.label}</div>`;
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

    // Add confirm button handlers
    document.querySelectorAll('.dropdown-confirm-btn').forEach(btn => {
      btn.addEventListener('click', function(e) {
        e.stopPropagation();
        const type = this.dataset.type;
        confirmPeriodSelection(type);
      });
    });

    // Add clear button handlers
    document.querySelectorAll('.dropdown-clear-btn').forEach(btn => {
      btn.addEventListener('click', function(e) {
        e.stopPropagation();
        const type = this.dataset.type;
        clearDropdownSelection(type);
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

  // Update country dropdown based on selected periods
  async function updateCountryDropdownByPeriod() {
    if (selectedPeriods.length === 0) {
      renderCountryItems(availableCountries);
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
      // Fetch data with period filter to get available countries
      const response = await SalesByCountryAPI.getReportByCountry({
        booking_date_from: allDateFrom,
        booking_date_to: allDateTo
      });

      if (response && response.success && response.data) {
        // Get country IDs that have data in this period
        const countryIdsWithData = response.data.map(item => item.country_id);

        // Filter available countries
        const filteredCountries = availableCountries.filter(c =>
          countryIdsWithData.includes(c.id)
        );

        // Clear previously selected countries that are no longer available
        selectedCountries = selectedCountries.filter(sc =>
          countryIdsWithData.includes(sc.id)
        );

        // Update country dropdown
        renderCountryItems(filteredCountries);
        updateCountryButtonText();
        updateSelectedCountryBadge();
      }
    } catch (error) {
      console.error('❌ Failed to filter countries by period:', error);
    }
  }

  // Update period dropdowns based on selected countries
  async function updatePeriodDropdownsByCountry() {
    if (selectedCountries.length === 0) {
      // Reset to show all periods
      populateTimeDropdowns();
      return;
    }

    try {
      // Fetch available periods for selected countries
      const countryIds = selectedCountries.map(c => c.id).join(',');
      const response = await SalesByCountryAPI.getAvailablePeriods({ country_id: countryIds });

      if (response && response.success && response.data) {
        const periodsData = response.data;

        // Update period dropdowns with filtered data
        updatePeriodDropdownsWithData(periodsData);

        // Clear previously selected periods that are no longer available
        filterSelectedPeriodsByAvailable(periodsData);
      }
    } catch (error) {
      console.error('❌ Failed to filter periods by country:', error);
      // If API doesn't support country filter, keep all periods
    }
  }

  // Update period dropdowns with filtered data
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
          <div class="time-dropdown-item ${isSelected ? 'selected' : ''}" data-type="yearly" data-year="${year.year_ce}" data-label="พ.ศ. ${year.label}">
            <label class="dropdown-checkbox">
              <input type="checkbox" class="period-checkbox" ${isSelected ? 'checked' : ''} />
              <span class="checkbox-custom"></span>
            </label>
            <span class="dropdown-item-label">พ.ศ. ${year.label}</span>
            <span class="dropdown-item-count">${formatNumber(year.total_orders)} orders</span>
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
          quarterlyItems += `<div class="dropdown-year-header">พ.ศ. ${year.label}</div>`;
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
          monthlyItems += `<div class="dropdown-year-header">พ.ศ. ${year.label}</div>`;
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

  // Reattach click handlers to period items
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
    updatePeriodButtonText();
    updateSelectedPeriodBadge();
  }

  // Update period button text
  function updatePeriodButtonText() {
    const type = currentTimeGranularity;
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

  // Update country button text
  function updateCountryButtonText() {
    const btn = document.getElementById('countryFilterBtn');
    const btnText = btn?.querySelector('.time-btn-text');
    if (btnText) {
      if (selectedCountries.length === 0) {
        btnText.textContent = 'เลือกประเทศ';
        btn?.classList.remove('active');
      } else if (selectedCountries.length === 1) {
        btnText.textContent = selectedCountries[0].name;
        btn?.classList.add('active');
      } else {
        btnText.textContent = `${selectedCountries.length} ประเทศ`;
        btn?.classList.add('active');
      }
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
      // Filter countries based on selected periods
      await updateCountryDropdownByPeriod();
      applyAllFilters();
    } else {
      // Reset country dropdown to show all
      renderCountryItems(availableCountries);
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

  // Initialize country filter dropdown
  async function initCountryFilter() {
    const countryBtn = document.getElementById('countryFilterBtn');
    const countryDropdown = document.getElementById('countryFilterDropdown');
    const countrySearchInput = document.getElementById('countrySearchInput');
    const countryItemsContainer = document.getElementById('countryItemsContainer');
    const confirmBtn = document.getElementById('countryFilterConfirmBtn');
    const clearBtn = document.getElementById('countryFilterClearBtn');

    if (!countryBtn || !countryDropdown) return;

    // Fetch countries from API
    try {
      const response = await SalesByCountryAPI.getCountries();
      if (response && response.success && response.data) {
        availableCountries = response.data;
        renderCountryItems(availableCountries);
      }
    } catch (error) {
      console.error('❌ Failed to fetch countries:', error);
    }

    // Toggle dropdown
    countryBtn.addEventListener('click', function(e) {
      e.stopPropagation();
      document.querySelectorAll('.time-dropdown-menu.show').forEach(menu => {
        if (menu !== countryDropdown) menu.classList.remove('show');
      });
      countryDropdown.classList.toggle('show');
      if (countryDropdown.classList.contains('show')) {
        countrySearchInput.focus();
      }
    });

    // Search filter
    countrySearchInput.addEventListener('input', function(e) {
      const searchTerm = e.target.value.toLowerCase();
      const filtered = availableCountries.filter(c =>
        c.name_th.toLowerCase().includes(searchTerm) ||
        c.name_en.toLowerCase().includes(searchTerm)
      );
      renderCountryItems(filtered);
    });

    // Prevent dropdown close when clicking inside
    countryDropdown.addEventListener('click', function(e) {
      e.stopPropagation();
    });

    // Confirm button
    confirmBtn.addEventListener('click', function(e) {
      e.stopPropagation();
      confirmCountrySelection();
    });

    // Clear button
    clearBtn.addEventListener('click', function(e) {
      e.stopPropagation();
      clearCountrySelection();
    });
  }

  // Render country items in dropdown
  function renderCountryItems(countries) {
    const container = document.getElementById('countryItemsContainer');
    if (!container) return;

    container.innerHTML = countries.map(country => {
      const isSelected = selectedCountries.some(c => c.id === country.id);
      return `
        <div class="time-dropdown-item country-item ${isSelected ? 'selected' : ''}" data-country-id="${country.id}" data-country-name="${country.name_th}">
          <label class="dropdown-checkbox">
            <input type="checkbox" class="country-checkbox" ${isSelected ? 'checked' : ''} />
            <span class="checkbox-custom"></span>
          </label>
          <span class="dropdown-item-label">${country.name_th}</span>
          <span class="dropdown-item-count">${country.name_en}</span>
        </div>
      `;
    }).join('');

    // Add click handlers
    container.querySelectorAll('.country-item').forEach(item => {
      item.addEventListener('click', function(e) {
        e.stopPropagation();
        const checkbox = this.querySelector('.country-checkbox');
        if (checkbox && e.target !== checkbox && !e.target.closest('.dropdown-checkbox')) {
          checkbox.checked = !checkbox.checked;
        }
        this.classList.toggle('selected', checkbox?.checked);
      });

      const checkbox = item.querySelector('.country-checkbox');
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

  // Confirm country selection
  async function confirmCountrySelection() {
    const container = document.getElementById('countryItemsContainer');
    if (!container) return;

    selectedCountries = [];
    container.querySelectorAll('.country-item.selected, .country-item:has(.country-checkbox:checked)').forEach(item => {
      const id = parseInt(item.dataset.countryId);
      const name = item.dataset.countryName;
      selectedCountries.push({ id, name });
    });

    // Update button text
    updateCountryButtonText();

    // Close dropdown
    document.getElementById('countryFilterDropdown')?.classList.remove('show');

    // Update badge
    updateSelectedCountryBadge();

    // Filter periods based on selected countries
    if (selectedCountries.length > 0) {
      await updatePeriodDropdownsByCountry();
    } else {
      // Reset period dropdowns to show all
      populateTimeDropdowns();
    }

    // Reload data with filter
    applyAllFilters();
  }

  // Clear country selection
  function clearCountrySelection() {
    const container = document.getElementById('countryItemsContainer');
    if (container) {
      container.querySelectorAll('.country-item').forEach(item => {
        item.classList.remove('selected');
        const checkbox = item.querySelector('.country-checkbox');
        if (checkbox) checkbox.checked = false;
      });
    }
    selectedCountries = [];
  }

  // Update selected country badge
  function updateSelectedCountryBadge() {
    const badge = document.getElementById('selectedCountryBadge');
    if (!badge) return;

    if (selectedCountries.length === 0) {
      badge.style.display = 'none';
      return;
    }

    let label = '';
    if (selectedCountries.length === 1) {
      label = selectedCountries[0].name;
    } else {
      label = `${selectedCountries.length} ประเทศ`;
    }

    badge.innerHTML = `
      <span>${label}</span>
      <button class="badge-clear" onclick="clearCountryFilter()">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="18" y1="6" x2="6" y2="18"/>
          <line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      </button>
    `;
    badge.style.display = 'flex';
  }

  // Clear country filter (called from badge)
  window.clearCountryFilter = async function() {
    selectedCountries = [];

    // Reset button
    const btn = document.getElementById('countryFilterBtn');
    if (btn) {
      btn.classList.remove('active');
      const btnText = btn.querySelector('.time-btn-text');
      if (btnText) btnText.textContent = 'เลือกประเทศ';
    }

    // Clear checkboxes
    clearCountrySelection();

    // Hide badge
    const badge = document.getElementById('selectedCountryBadge');
    if (badge) badge.style.display = 'none';

    // Reset period dropdowns to show all periods
    populateTimeDropdowns();

    // Reload data
    applyAllFilters();
  };

  // Apply all filters (period + country)
  async function applyAllFilters() {
    const filters = { ...currentFilters };

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

    // Add country filter
    if (selectedCountries.length > 0) {
      filters.country_id = selectedCountries.map(c => c.id).join(',');
    }

    console.log('📅 Applying filters:', filters);

    try {
      showDashboardLoading();
      const response = await SalesByCountryAPI.getReportByCountry(filters);
      hideDashboardLoading();

      if (response && response.success && response.data) {
        renderCountryDashboardContent(response.data);
      } else {
        const tableBody = document.getElementById('dashboardTableBody');
        if (tableBody) {
          tableBody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 40px; color: #6b7280;">ไม่พบข้อมูลตามเงื่อนไขที่เลือก</td></tr>';
        }
      }
    } catch (error) {
      console.error('❌ Failed to apply filters:', error);
      hideDashboardLoading();
    }
  }

  // Calculate date range for a single period
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

  // Apply period filter and reload data
  async function applyPeriodFilter(data) {
    if (selectedPeriods.length === 0) return;
    applyAllFilters();
  }

  // Clear period filter
  window.clearPeriodFilter = async function() {
    selectedPeriods = [];

    // Reset period type selector
    const periodTypeBtn = document.getElementById('periodTypeBtn');
    if (periodTypeBtn) {
      periodTypeBtn.classList.remove('active');
      const btnText = periodTypeBtn.querySelector('.time-btn-text');
      if (btnText) btnText.textContent = 'มุมมอง';
    }

    // Clear selected state in period type dropdown
    const periodTypeDropdown = document.getElementById('periodTypeDropdown');
    if (periodTypeDropdown) {
      periodTypeDropdown.querySelectorAll('.time-dropdown-item').forEach(item => {
        item.classList.remove('selected');
      });
    }

    // Hide all period value dropdowns and clear checkboxes
    const periodValueButtons = document.getElementById('periodValueButtons');
    if (periodValueButtons) {
      periodValueButtons.querySelectorAll('.time-dropdown-wrapper').forEach(wrapper => {
        wrapper.style.display = 'none';
        const btn = wrapper.querySelector('.time-btn');
        if (btn) {
          btn.classList.remove('active');
          const text = btn.querySelector('.time-btn-text');
          if (text) {
            const type = wrapper.dataset.type;
            const defaultTexts = {
              'yearly': 'เลือกปี',
              'quarterly': 'เลือกไตรมาส',
              'monthly': 'เลือกเดือน'
            };
            text.textContent = defaultTexts[type] || '';
          }
        }

        // Clear all checkboxes and selected states in dropdown
        wrapper.querySelectorAll('.time-dropdown-item').forEach(item => {
          item.classList.remove('selected');
          const checkbox = item.querySelector('.period-checkbox');
          if (checkbox) checkbox.checked = false;
        });
      });
    }

    // Hide badge
    const badge = document.getElementById('selectedPeriodBadge');
    if (badge) badge.style.display = 'none';

    // Reset country dropdown to show all countries
    renderCountryItems(availableCountries);

    // Reload all data
    applyAllFilters();
  };

  // Render dashboard content (update existing elements or recreate)
  function renderCountryDashboardContent(data) {
    currentTabData = data;

    // Check if dashboard exists
    const existingDashboard = document.querySelector('.country-dashboard');
    if (!existingDashboard) {
      // Dashboard was destroyed, need to call full render
      renderCountryReport({ success: true, data: data });
      return;
    }

    if (data.length === 0) {
      const tableBody = document.getElementById('dashboardTableBody');
      if (tableBody) {
        tableBody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 40px; color: #6b7280;">ไม่พบข้อมูลในช่วงเวลาที่เลือก</td></tr>';
      }
      return;
    }

    // Calculate KPI metrics
    const totalTravelers = data.reduce((sum, item) => sum + (item.total_customers || 0), 0);
    const totalOrders = data.reduce((sum, item) => sum + (item.total_orders || 0), 0);
    const totalRevenue = data.reduce((sum, item) => sum + (item.total_net_amount || 0), 0);
    const topCountry = data.reduce((max, item) =>
      (item.total_orders > (max?.total_orders || 0)) ? item : max, null);
    const activeCountries = data.filter(item => item.total_orders > 0).length;
    const topOrdersPercent = topCountry ? ((topCountry.total_orders / totalOrders) * 100) : 0;
    const avgPerOrder = totalOrders > 0 ? (totalRevenue / totalOrders) : 0;

    // Calculate avgPerTraveler for KPI card 4
    const avgPerTraveler = totalTravelers > 0 ? (totalRevenue / totalTravelers) : 0;

    // Update KPI values
    const kpiTravelers = document.getElementById('kpiTotalTravelers');
    const kpiTopCountry = document.getElementById('kpiTopCountry');
    const kpiRevenue = document.getElementById('kpiTotalRevenue');
    const kpiAvgPerPerson = document.getElementById('kpiAvgPerPerson');

    if (kpiTravelers) kpiTravelers.textContent = formatNumber(totalTravelers);
    if (kpiTopCountry) kpiTopCountry.textContent = topCountry?.country_name || '-';
    if (kpiRevenue) kpiRevenue.textContent = formatCurrencyShort(totalRevenue);
    if (kpiAvgPerPerson) kpiAvgPerPerson.textContent = formatCurrencyShort(avgPerTraveler);

    // Update subtexts
    const subtexts = document.querySelectorAll('.kpi-subtext');
    if (subtexts.length >= 4) {
      subtexts[0].textContent = `จาก ${formatNumber(totalOrders)} ออเดอร์`;
      subtexts[1].textContent = `${topOrdersPercent.toFixed(1)}% ของทั้งหมด`;
      subtexts[2].textContent = `เฉลี่ย ${formatCurrencyShort(avgPerOrder)}/ออเดอร์`;
      subtexts[3].textContent = 'ต่อผู้เดินทาง 1 คน';
    }

    // Update market share list
    const marketShareList = document.getElementById('marketShareList');
    if (marketShareList) {
      marketShareList.innerHTML = renderMarketShareList(data);
    }

    // Update table
    const tableBody = document.getElementById('dashboardTableBody');
    if (tableBody) {
      tableBody.innerHTML = renderDashboardTableRows(data);
    }

    // Re-render chart with current type
    renderCountryAreaChart(data, currentChartType);

    // Re-initialize table sorting
    initTableSorting(data);
  }

  // Render country chart (bar or pie)
  function renderCountryAreaChart(data, chartType) {
    const canvas = document.getElementById('countryAreaChart');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const chartWrapper = document.getElementById('chartWrapper');
    const scrollWrapper = document.getElementById('chartScrollWrapper');
    const chartContainer = document.getElementById('mainChartContainer');

    // Destroy existing chart
    if (countryDashboardChart) {
      countryDashboardChart.destroy();
    }

    // Sort data by customers for visualization (show ALL data, synced with table)
    const sortedData = [...data].sort((a, b) => b.total_customers - a.total_customers);

    // Use country names as labels
    const labels = sortedData.map(item => item.country_name || 'ไม่ระบุ');
    const chartData = sortedData.map(item => item.total_customers);

    // Generate colors for pie chart (cycle through if more than 10)
    const baseColors = [
      '#4a7ba7', '#5c6bc0', '#7b1fa2', '#c2185b', '#d32f2f',
      '#f57c00', '#fbc02d', '#388e3c', '#00897b', '#1976d2'
    ];
    const pieColors = sortedData.map((_, i) => baseColors[i % baseColors.length]);

    if (chartType === 'pie') {
      // Add pie-mode class for CSS
      chartContainer.classList.add('pie-mode');

      // Reset scroll wrapper for pie (no scroll)
      scrollWrapper.style.overflowX = 'visible';
      chartWrapper.style.width = '100%';
      chartWrapper.style.minWidth = 'auto';
      chartWrapper.style.height = '380px';

      // Pie Chart with labels INSIDE
      countryDashboardChart = new Chart(ctx, {
        type: 'pie',
        data: {
          labels: labels,
          datasets: [{
            data: chartData,
            backgroundColor: pieColors,
            borderColor: '#fff',
            borderWidth: 2
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          layout: {
            padding: 10
          },
          plugins: {
            legend: {
              display: true,
              position: 'right',
              align: 'start', // Align legend items to top
              labels: {
                font: { family: 'Kanit', size: 13 },
                padding: 8,
                usePointStyle: true,
                pointStyle: 'circle'
              }
            },
            datalabels: {
              color: '#fff',
              font: {
                family: 'Kanit',
                size: 14,
                weight: '600'
              },
              anchor: 'center',
              align: 'center',
              formatter: function(value, context) {
                const label = context.chart.data.labels[context.dataIndex];
                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                const percent = (value / total) * 100;
                // Only show if segment is large enough
                if (percent < 5) return '';
                return label;
              },
              textAlign: 'center'
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
                  const total = context.dataset.data.reduce((a, b) => a + b, 0);
                  const percent = ((context.raw / total) * 100).toFixed(1);
                  return `จำนวนผู้เดินทาง: ${formatNumber(context.raw)} คน (${percent}%)`;
                }
              }
            }
          }
        },
        plugins: [ChartDataLabels]
      });
    } else {
      // Remove pie-mode class
      chartContainer.classList.remove('pie-mode');

      // Bar Chart - calculate width based on data count for scrolling
      const barWidth = 50;
      const gap = 10;
      const minChartWidth = sortedData.length * (barWidth + gap);
      const containerWidth = scrollWrapper.clientWidth - 20;

      // Reset height for bar chart
      chartWrapper.style.height = '280px';

      if (minChartWidth > containerWidth) {
        // Enable horizontal scroll on scroll wrapper only
        scrollWrapper.style.overflowX = 'auto';
        chartWrapper.style.width = minChartWidth + 'px';
        chartWrapper.style.minWidth = minChartWidth + 'px';
      } else {
        scrollWrapper.style.overflowX = 'visible';
        chartWrapper.style.width = '100%';
        chartWrapper.style.minWidth = 'auto';
      }

      countryDashboardChart = new Chart(ctx, {
        type: 'bar',
        data: {
          labels: labels,
          datasets: [{
            label: 'จำนวนผู้เดินทาง',
            data: chartData,
            backgroundColor: '#4a7ba7',
            borderColor: '#3d6a8f',
            borderWidth: 1,
            borderRadius: 4,
            barThickness: barWidth
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            datalabels: {
              anchor: 'end',
              align: 'top',
              offset: 4,
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
              borderColor: 'rgba(74, 123, 167, 0.5)',
              borderWidth: 1,
              padding: 12,
              titleFont: { family: 'Kanit', size: 16, weight: '600' },
              bodyFont: { family: 'Kanit', size: 15 },
              callbacks: {
                label: function(context) {
                  return `จำนวนผู้เดินทาง: ${formatNumber(context.raw)} คน`;
                }
              }
            }
          },
          scales: {
            x: {
              grid: { display: false },
              ticks: {
                color: '#6b7280',
                font: { family: 'Kanit', size: 14 },
                maxRotation: 45,
                minRotation: 45
              }
            },
            y: {
              grid: { color: 'rgba(0, 0, 0, 0.05)', drawBorder: false },
              ticks: {
                color: '#6b7280',
                font: { family: 'Kanit', size: 13 },
                callback: function(value) { return formatNumber(value); }
              },
              beginAtZero: true,
              suggestedMax: Math.max(...chartData) * 1.15
            }
          }
        },
        plugins: [ChartDataLabels]
      });
    }
  }

  // Initialize table sorting
  function initTableSorting(data) {
    const table = document.getElementById('dashboardTable');
    if (!table) return;

    const headers = table.querySelectorAll('thead th[data-sort]');
    let currentSort = { column: null, direction: 'asc' };

    headers.forEach(header => {
      header.addEventListener('click', function() {
        const sortKey = this.dataset.sort;
        const sortType = this.dataset.type || 'string';

        // Toggle direction if same column
        if (currentSort.column === sortKey) {
          currentSort.direction = currentSort.direction === 'asc' ? 'desc' : 'asc';
        } else {
          currentSort.column = sortKey;
          currentSort.direction = 'desc'; // Default to descending for numbers
        }

        // Update header styles
        headers.forEach(h => {
          h.classList.remove('sort-asc', 'sort-desc');
        });
        this.classList.add(currentSort.direction === 'asc' ? 'sort-asc' : 'sort-desc');

        // Sort data
        const sortedData = [...currentTabData].sort((a, b) => {
          let aVal = a[sortKey];
          let bVal = b[sortKey];

          if (sortType === 'number') {
            aVal = parseFloat(aVal) || 0;
            bVal = parseFloat(bVal) || 0;
          } else {
            aVal = (aVal || '').toString().toLowerCase();
            bVal = (bVal || '').toString().toLowerCase();
          }

          if (aVal < bVal) return currentSort.direction === 'asc' ? -1 : 1;
          if (aVal > bVal) return currentSort.direction === 'asc' ? 1 : -1;
          return 0;
        });

        // Re-render table body
        const tableBody = document.getElementById('dashboardTableBody');
        if (tableBody) {
          tableBody.innerHTML = renderDashboardTableRows(sortedData);
        }
      });
    });
  }

  // Initialize dashboard search
  function initDashboardSearch(data) {
    const searchInput = document.getElementById('dashboardSearchInput');
    if (!searchInput) return;

    searchInput.addEventListener('input', function(e) {
      const searchTerm = e.target.value.toLowerCase().trim();
      const rows = document.querySelectorAll('#dashboardTableBody tr');

      rows.forEach(row => {
        const countryName = row.dataset.country?.toLowerCase() || '';
        if (!searchTerm || countryName.includes(searchTerm)) {
          row.style.display = '';
        } else {
          row.style.display = 'none';
        }
      });
    });
  }

  // Initialize dashboard export
  function initDashboardExport(data) {
    const exportBtn = document.getElementById('dashboardExportBtn');
    if (!exportBtn) return;

    exportBtn.addEventListener('click', function() {
      // Get visible rows
      const visibleRows = Array.from(document.querySelectorAll('#dashboardTableBody tr'))
        .filter(row => row.style.display !== 'none');

      if (visibleRows.length === 0) {
        alert('ไม่มีข้อมูลให้ Export');
        return;
      }

      const headers = ['ลำดับ', 'ประเทศ', 'จำนวน Orders', 'จำนวนลูกค้า', 'ยอดรวม', 'ค่าเฉลี่ย/Order'];
      const rows = visibleRows.map(row => {
        const cells = row.querySelectorAll('td');
        return Array.from(cells).slice(0, 6).map(cell => {
          let text = cell.textContent.trim();
          text = text.replace(/[฿,]/g, '');
          return text;
        });
      });

      const dateStr = new Date().toISOString().split('T')[0];
      const filename = `country-dashboard-${dateStr}.csv`;

      const csvContent = [
        headers.join(','),
        ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
      ].join('\n');

      const BOM = '\uFEFF';
      const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = filename;
      link.click();

      console.log('✅ Dashboard CSV exported:', filename, `(${rows.length} rows)`);
    });
  }

  // Initialize Tab Filter
  function initTabFilter(tabType, data) {
    const container = document.getElementById('tabFilterContainer');
    if (!container) return;
    
    // Destroy existing filter
    if (currentFilterInstance && currentFilterInstance.destroy) {
      currentFilterInstance.destroy();
    }
    
    let options = [];
    let onChange = null;
    
    switch(tabType) {
      case 'country':
        // No filter for country tab
        container.innerHTML = '';
        return;
        
      case 'supplier':
        // No filter for supplier tab
        container.innerHTML = '';
        return;
        
      case 'travel-date':
        options = [
          {
            value: 'all',
            label: 'ทั้งหมด',
            active: false,
            icon: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 12h18M3 6h18M3 18h18"/></svg>`
          },
          {
            value: '7d',
            label: '7 วันล่าสุด',
            active: false,
            icon: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>`
          },
          {
            value: '14d',
            label: '14 วันล่าสุด',
            active: false,
            icon: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>`
          },
          {
            value: '30d',
            label: '30 วันล่าสุด',
            active: true,
            icon: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>`
          },
          {
            value: '1-3m',
            label: '1-3 เดือนล่าสุด',
            icon: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>`
          },
          {
            value: '3-6m',
            label: '3-6 เดือนล่าสุด',
            icon: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>`
          },
          {
            value: '6-12m',
            label: '6-12 เดือนล่าสุด',
            icon: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>`
          },
          {
            value: '1-2y',
            label: '1-2 ปีล่าสุด',
            icon: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>`
          },
          {
            value: '2-3y',
            label: '2-3 ปีล่าสุด',
            icon: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>`
          },
          {
            value: '3-4y',
            label: '3-4 ปีล่าสุด',
            icon: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>`
          },
          {
            value: '4-5y',
            label: '4-5 ปีล่าสุด',
            icon: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>`
          },
          {
            value: '5y+',
            label: '5 ปีขึ้นไป',
            icon: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>`
          }
        ];
        onChange = (value) => filterByDateRange(value, 'travel');
        break;
        
      case 'booking-date':
        options = [
          {
            value: 'all',
            label: 'ทั้งหมด',
            active: false,
            icon: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 12h18M3 6h18M3 18h18"/></svg>`
          },
          {
            value: '7d',
            label: '7 วันล่าสุด',
            active: false,
            icon: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>`
          },
          {
            value: '14d',
            label: '14 วันล่าสุด',
            active: false,
            icon: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>`
          },
          {
            value: '30d',
            label: '30 วันล่าสุด',
            active: true,
            icon: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>`
          },
          {
            value: '1-3m',
            label: '1-3 เดือนล่าสุด',
            icon: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>`
          },
          {
            value: '3-6m',
            label: '3-6 เดือนล่าสุด',
            icon: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>`
          },
          {
            value: '6-12m',
            label: '6-12 เดือนล่าสุด',
            icon: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>`
          },
          {
            value: '1-2y',
            label: '1-2 ปีล่าสุด',
            icon: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>`
          },
          {
            value: '2-3y',
            label: '2-3 ปีล่าสุด',
            icon: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>`
          },
          {
            value: '3-4y',
            label: '3-4 ปีล่าสุด',
            icon: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>`
          },
          {
            value: '4-5y',
            label: '4-5 ปีล่าสุด',
            icon: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>`
          },
          {
            value: '5y+',
            label: '5 ปีขึ้นไป',
            icon: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>`
          }
        ];
        onChange = (value) => filterByDateRange(value, 'booking');
        break;
        
      case 'lead-time':
        options = [
          {
            value: 'all',
            label: 'ทั้งหมด',
            active: true,
            icon: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 12h18M3 6h18M3 18h18"/></svg>`
          },
          {
            value: '0-7',
            label: '0-7 วัน (จองใกล้วันเดินทาง)',
            icon: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>`
          },
          {
            value: '8-14',
            label: '8-14 วัน',
            icon: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`
          },
          {
            value: '15-30',
            label: '15-30 วัน',
            icon: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`
          },
          {
            value: '31-60',
            label: '31-60 วัน',
            icon: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>`
          },
          {
            value: '61-90',
            label: '61-90 วัน',
            icon: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>`
          },
          {
            value: '90+',
            label: 'มากกว่า 90 วัน (จองล่วงหน้ามาก)',
            icon: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>`
          }
        ];
        onChange = (value) => filterLeadTimeByRange(value);
        break;
    }
    
    if (options.length > 0) {
      // Find the active option for default label and icon
      const activeOption = options.find(opt => opt.active) || options[0];
      
      currentFilterInstance = FilterSortDropdownComponent.initDropdown({
        containerId: 'tabFilterContainer',
        defaultLabel: activeOption.label,
        defaultIcon: activeOption.icon,
        options: options,
        onChange: onChange
      });
    }
  }

  // Filter by date range (for travel-date and booking-date tabs)
  function filterByDateRange(rangeValue, dateType) {
    if (rangeValue === 'all') {
      // Show all data - pass skipDefaultFilter to prevent infinite loop
      if (dateType === 'travel') {
        renderTravelDateReport({ data: currentTabData }, true);
      } else {
        renderBookingDateReport({ data: currentTabData }, true);
      }
      return;
    }
    
    // Calculate date range
    const today = new Date();
    let startDate, endDate;
    
    switch(rangeValue) {
      case '7d':
        startDate = new Date(today);
        startDate.setDate(today.getDate() - 7);
        endDate = new Date(today);
        break;
      case '14d':
        startDate = new Date(today);
        startDate.setDate(today.getDate() - 14);
        endDate = new Date(today);
        break;
      case '30d':
        startDate = new Date(today);
        startDate.setDate(today.getDate() - 30);
        endDate = new Date(today);
        break;
      case '1-3m':
        startDate = new Date(today);
        startDate.setMonth(today.getMonth() - 3);
        endDate = new Date(today);
        endDate.setMonth(today.getMonth() - 1);
        break;
      case '3-6m':
        startDate = new Date(today);
        startDate.setMonth(today.getMonth() - 6);
        endDate = new Date(today);
        endDate.setMonth(today.getMonth() - 3);
        break;
      case '6-12m':
        startDate = new Date(today);
        startDate.setMonth(today.getMonth() - 12);
        endDate = new Date(today);
        endDate.setMonth(today.getMonth() - 6);
        break;
      case '1-2y':
        startDate = new Date(today);
        startDate.setFullYear(today.getFullYear() - 2);
        endDate = new Date(today);
        endDate.setFullYear(today.getFullYear() - 1);
        break;
      case '2-3y':
        startDate = new Date(today);
        startDate.setFullYear(today.getFullYear() - 3);
        endDate = new Date(today);
        endDate.setFullYear(today.getFullYear() - 2);
        break;
      case '3-4y':
        startDate = new Date(today);
        startDate.setFullYear(today.getFullYear() - 4);
        endDate = new Date(today);
        endDate.setFullYear(today.getFullYear() - 3);
        break;
      case '4-5y':
        startDate = new Date(today);
        startDate.setFullYear(today.getFullYear() - 5);
        endDate = new Date(today);
        endDate.setFullYear(today.getFullYear() - 4);
        break;
      case '5y+':
        startDate = new Date('2000-01-01');
        endDate = new Date(today);
        endDate.setFullYear(today.getFullYear() - 5);
        break;
    }
    
    // Filter data based on date range
    const filtered = currentTabData.filter(item => {
      let itemDateStr;
      if (dateType === 'travel') {
        itemDateStr = item.travel_start_date;
      } else {
        itemDateStr = item.created_date;
      }
      
      if (!itemDateStr) return false;
      
      // Parse date (format: YYYY-MM-DD)
      const itemDate = new Date(itemDateStr);
      
      return itemDate >= startDate && itemDate <= endDate;
    });
    
    console.log('📊 Filtered by date range:', { 
      rangeValue, 
      dateType, 
      startDate: startDate.toISOString().split('T')[0], 
      endDate: endDate.toISOString().split('T')[0],
      originalCount: currentTabData.length,
      filteredCount: filtered.length 
    });
    
    // Re-render with filtered data - pass skipDefaultFilter to prevent infinite loop
    if (dateType === 'travel') {
      renderTravelDateReport({ data: filtered }, true);
    } else {
      renderBookingDateReport({ data: filtered }, true);
    }
  }

  // Render Supplier Report
  function renderSupplierReport(response) {
    if (!response || !response.data || response.data.length === 0) {
      showEmpty();
      return;
    }

    showContent();
    
    const data = response.data;
    currentTabData = data;
    
    // Initialize filter dropdown for Supplier tab
    initTabFilter('supplier', data);
    
    // Calculate max value for background bars
    const maxValue = Math.max(...data.map(item => item.total_orders));
    
    // Render chart WITH data labels and background bars (stacked with remainder)
    renderChart({
      labels: data.map(item => item.supplier_name || 'ไม่ระบุ'),
      datasets: [
        {
          label: 'จำนวน Orders',
          data: data.map(item => item.total_orders),
          backgroundColor: 'rgba(74, 123, 167, 0.8)',
          borderColor: 'rgba(74, 123, 167, 1)',
          borderWidth: 1,
          datalabels: {
            display: true,
            anchor: 'end',
            align: 'top',
            color: '#374151',
            font: {
              size: 14,
              weight: 'bold',
              family: 'Kanit'
            },
            formatter: (value) => {
              return formatNumber(value);
            }
          }
        },
        {
          label: 'Background',
          data: data.map(item => maxValue - item.total_orders),
          backgroundColor: 'rgba(230, 230, 230, 0.3)',
          borderColor: 'rgba(230, 230, 230, 0.5)',
          borderWidth: 1,
          datalabels: {
            display: false
          }
        }
      ]
    }, 'bar', {
      plugins: {
        datalabels: {
          display: true
        }
      },
      scales: {
        x: {
          stacked: true,
          ticks: {
            font: {
              family: 'Kanit',
              size: 16
            }
          }
        },
        y: {
          stacked: true
        }
      }
    });
    
    // Render sortable table
    renderSortableTable([
      { key: 'row_number', label: 'ลำดับ', type: 'number', align: 'center', sortable: false },
      { key: 'supplier_name', label: 'Supplier', type: 'text', align: 'left' },
      { key: 'total_orders', label: 'จำนวน Orders', type: 'number', align: 'right' },
      { key: 'total_customers', label: 'จำนวนลูกค้า', type: 'number', align: 'right' },
      { key: 'total_net_amount', label: 'ยอดรวม (Net Amount)', type: 'currency', align: 'right' },
      { key: 'avg_net_amount', label: 'ค่าเฉลี่ย/Order', type: 'currency', align: 'right' }
    ], data.map((item, index) => ({
      row_number: index + 1,
      supplier_name: item.supplier_name || 'ไม่ระบุ',
      total_orders: item.total_orders,
      total_customers: item.total_customers,
      total_net_amount: item.total_net_amount,
      avg_net_amount: item.avg_net_amount
    })));
  }

  // Render Travel Date Report
  function renderTravelDateReport(response, skipDefaultFilter = false) {
    if (!response || !response.data || response.data.length === 0) {
      showEmpty();
      return;
    }

    showContent();
    
    const data = response.data;
    currentTabData = data;
    
    // Initialize filter dropdown ONLY if not already initialized
    if (!currentFilterInstance) {
      initTabFilter('travel-date', data);
      // Apply default filter (30d) only on first load
      if (!skipDefaultFilter) {
        filterByDateRange('30d', 'travel');
        return; // Exit early as filterByDateRange will re-render
      }
    }
    
    // Calculate dynamic width: 40px per bar for better spacing with grid
    const barWidth = 40;
    const chartMinWidth = data.length * barWidth;
    
    // Calculate max value for background bars
    const maxValue = Math.max(...data.map(item => item.total_orders));
    
    // Render bar chart with horizontal scroll and background bars (stacked with remainder)
    renderChart({
      labels: data.map(item => item.travel_start_date_label || item.travel_start_date || 'ไม่ระบุ'),
      datasets: [
        {
          label: 'จำนวน Orders',
          data: data.map(item => item.total_orders),
          backgroundColor: 'rgba(74, 123, 167, 0.8)',
          borderColor: 'rgba(74, 123, 167, 1)',
          borderWidth: 1,
          datalabels: {
            display: true,
            anchor: 'end',
            align: 'top',
            color: '#374151',
            font: {
              size: 14,
              weight: 'bold',
              family: 'Kanit'
            },
            formatter: (value) => {
              return formatNumber(value);
            }
          }
        },
        {
          label: 'Background',
          data: data.map(item => maxValue - item.total_orders),
          backgroundColor: 'rgba(230, 230, 230, 0.3)',
          borderColor: 'rgba(230, 230, 230, 0.5)',
          borderWidth: 1,
          datalabels: {
            display: false
          }
        }
      ]
    }, 'bar', {
      plugins: {
        datalabels: {
          display: true
        }
      },
      scales: {
        x: {
          stacked: true,
          grid: {
            display: true,
            drawOnChartArea: true,
            color: 'rgba(0, 0, 0, 0.1)',
            lineWidth: 1
          },
          ticks: {
            maxRotation: 90,
            minRotation: 90,
            font: {
              family: 'Kanit',
              size: 16
            }
          }
        },
        y: {
          stacked: true,
          grid: {
            display: true,
            color: 'rgba(0, 0, 0, 0.05)'
          }
        }
      }
    }, chartMinWidth, 550);
    
    // Render sortable table
    renderSortableTable([
      { key: 'row_number', label: 'ลำดับ', type: 'number', align: 'center', sortable: false },
      { key: 'travel_start_date_label', label: 'วันที่เดินทาง', type: 'text', align: 'left' },
      { key: 'total_orders', label: 'จำนวน Orders', type: 'number', align: 'right' },
      { key: 'total_customers', label: 'จำนวนลูกค้า', type: 'number', align: 'right' },
      { key: 'total_net_amount', label: 'ยอดรวม (Net Amount)', type: 'currency', align: 'right' }
    ], data.map((item, index) => ({
      row_number: index + 1,
      travel_start_date_label: item.travel_start_date_label || item.travel_start_date || 'ไม่ระบุ',
      total_orders: item.total_orders,
      total_customers: item.total_customers,
      total_net_amount: item.total_net_amount
    })));
  }

  // Render Booking Date Report
  function renderBookingDateReport(response, skipDefaultFilter = false) {
    if (!response || !response.data || response.data.length === 0) {
      showEmpty();
      return;
    }

    showContent();
    
    const data = response.data;
    currentTabData = data;
    
    // Initialize filter dropdown ONLY if not already initialized
    if (!currentFilterInstance) {
      initTabFilter('booking-date', data);
      // Apply default filter (30d) only on first load
      if (!skipDefaultFilter) {
        filterByDateRange('30d', 'booking');
        return; // Exit early as filterByDateRange will re-render
      }
    }
    
    // Calculate dynamic width: 40px per bar for better spacing with grid
    const barWidth = 40;
    const chartMinWidth = data.length * barWidth;
    
    // Calculate max value for background bars
    const maxValue = Math.max(...data.map(item => item.total_orders));
    
    // Render bar chart with horizontal scroll and background bars (stacked with remainder)
    renderChart({
      labels: data.map(item => item.created_date_label || item.created_date || 'ไม่ระบุ'),
      datasets: [
        {
          label: 'จำนวน Orders',
          data: data.map(item => item.total_orders),
          backgroundColor: 'rgba(74, 123, 167, 0.8)',
          borderColor: 'rgba(74, 123, 167, 1)',
          borderWidth: 1,
          datalabels: {
            display: true,
            anchor: 'end',
            align: 'top',
            color: '#374151',
            font: {
              size: 14,
              weight: 'bold',
              family: 'Kanit'
            },
            formatter: (value) => {
              return formatNumber(value);
            }
          }
        },
        {
          label: 'Background',
          data: data.map(item => maxValue - item.total_orders),
          backgroundColor: 'rgba(230, 230, 230, 0.3)',
          borderColor: 'rgba(230, 230, 230, 0.5)',
          borderWidth: 1,
          datalabels: {
            display: false
          }
        }
      ]
    }, 'bar', {
      plugins: {
        datalabels: {
          display: true
        }
      },
      scales: {
        x: {
          stacked: true,
          grid: {
            display: true,
            drawOnChartArea: true,
            color: 'rgba(0, 0, 0, 0.1)',
            lineWidth: 1
          },
          ticks: {
            maxRotation: 90,
            minRotation: 90,
            font: {
              family: 'Kanit',
              size: 16
            }
          }
        },
        y: {
          stacked: true,
          grid: {
            display: true,
            color: 'rgba(0, 0, 0, 0.05)'
          }
        }
      }
    }, chartMinWidth, 550);
    
    // Render sortable table
    renderSortableTable([
      { key: 'row_number', label: 'ลำดับ', type: 'number', align: 'center', sortable: false },
      { key: 'created_date_label', label: 'วันที่จอง', type: 'text', align: 'left' },
      { key: 'total_orders', label: 'จำนวน Orders', type: 'number', align: 'right' },
      { key: 'total_customers', label: 'จำนวนลูกค้า', type: 'number', align: 'right' },
      { key: 'total_net_amount', label: 'ยอดรวม (Net Amount)', type: 'currency', align: 'right' }
    ], data.map((item, index) => ({
      row_number: index + 1,
      created_date_label: item.created_date_label || item.created_date || 'ไม่ระบุ',
      total_orders: item.total_orders,
      total_customers: item.total_customers,
      total_net_amount: item.total_net_amount
    })));
  }

  // Render Lead Time Report
  function renderLeadTimeReport(response) {
    console.log('🎨 Rendering Lead Time Report:', response);
    
    if (!response || !response.distribution || response.distribution.length === 0) {
      console.warn('⚠️ No distribution data in Lead Time Report response');
      showEmpty();
      return;
    }

    showContent();
    
    const distribution = response.distribution;
    const summary = response.summary || {};
    const data = response.data || [];
    
    console.log('📊 Lead Time Distribution:', distribution);
    console.log('📊 Lead Time Summary:', summary);
    console.log('📊 Lead Time Data:', data.length, 'orders');
    
    // Store full data for filtering
    window.leadTimeFullData = data;
    window.leadTimeDistribution = distribution;
    currentTabData = data;
    
    // Initialize filter dropdown using initTabFilter
    initTabFilter('lead-time', data);
    
    // Calculate max value for background bars
    const maxValue = Math.max(...distribution.map(item => item.count));
    
    // Render Column Chart WITH data labels and background bars (stacked with remainder)
    renderChart({
      labels: distribution.map(item => item.range_label || item.range),
      datasets: [
        {
          label: 'จำนวน Orders',
          data: distribution.map(item => item.count),
          backgroundColor: 'rgba(74, 123, 167, 0.8)',
          borderColor: 'rgba(74, 123, 167, 1)',
          borderWidth: 1,
          datalabels: {
            display: true,
            anchor: 'end',
            align: 'top',
            color: '#374151',
            font: {
              size: 14,
              weight: 'bold',
              family: 'Kanit'
            },
            formatter: (value) => {
              return formatNumber(value);
            }
          }
        },
        {
          label: 'Background',
          data: distribution.map(item => maxValue - item.count),
          backgroundColor: 'rgba(230, 230, 230, 0.3)',
          borderColor: 'rgba(230, 230, 230, 0.5)',
          borderWidth: 1,
          datalabels: {
            display: false
          }
        }
      ]
    }, 'bar', {
      plugins: {
        datalabels: {
          display: true
        }
      },
      scales: {
        x: {
          stacked: true,
          ticks: {
            font: {
              family: 'Kanit',
              size: 16
            }
          }
        },
        y: {
          stacked: true
        }
      }
    });
    
    // Render sortable table with order details (show all initially)
    renderLeadTimeTable(data);
  }

  // Filter Lead Time by range (using new component)
  function filterLeadTimeByRange(rangeKey) {
    const fullData = window.leadTimeFullData || [];
    const distribution = window.leadTimeDistribution || [];
    
    console.log('🔍 Filtering by range:', rangeKey);
    
    if (rangeKey === 'all') {
      // Show all data
      console.log('📊 Showing all data:', fullData.length, 'orders');
      renderLeadTimeTable(fullData);
      return;
    }
    
    // Find range details
    const range = distribution.find(d => d.range === rangeKey);
    if (!range) {
      console.warn('⚠️ Range not found:', rangeKey);
      renderLeadTimeTable(fullData);
      return;
    }
    
    console.log('📊 Range details:', range);
    
    // Filter data based on range
    let filteredData;
    if (range.range === '90+') {
      filteredData = fullData.filter(item => item.lead_time_days >= 91);
    } else {
      filteredData = fullData.filter(item => 
        item.lead_time_days >= range.min_days && 
        item.lead_time_days <= range.max_days
      );
    }
    
    console.log('📊 Filtered data:', filteredData.length, 'orders for range:', rangeKey);
    
    // Re-render table with filtered data
    renderLeadTimeTable(filteredData);
  }

  // Filter table by lead time range
  function filterTableByLeadTimeRange(range) {
    console.log('🔍 Filtering by range:', range);
    
    const fullData = window.leadTimeFullData || [];
    
    // Filter data based on range
    let filteredData;
    if (range.range === '90+') {
      filteredData = fullData.filter(item => item.lead_time_days >= 91);
    } else {
      filteredData = fullData.filter(item => 
        item.lead_time_days >= range.min_days && 
        item.lead_time_days <= range.max_days
      );
    }
    
    console.log('📊 Filtered data:', filteredData.length, 'orders');
    
    // Re-render table with filtered data
    renderLeadTimeTable(filteredData);
    
    // Show filter indicator
    showLeadTimeFilterIndicator(range.range_label);
  }

  // Initialize Lead Time Filter Dropdown
  function initLeadTimeFilter() {
    const filterBtn = document.getElementById('leadTimeFilterBtn');
    const filterMenu = document.getElementById('leadTimeFilterMenu');
    
    if (!filterBtn || !filterMenu) {
      console.warn('⚠️ Lead Time filter elements not found');
      return;
    }
    
    console.log('🔧 Initializing Lead Time filter dropdown');
    
    // Reset dropdown state
    const filterLabel = document.getElementById('leadTimeFilterLabel');
    if (filterLabel) {
      filterLabel.textContent = 'ช่วง Lead Time';
    }
    filterBtn.classList.remove('active');
    filterMenu.classList.remove('show');
    
    // Set "ทั้งหมด" as active
    const filterOptions = filterMenu.querySelectorAll('.table-filter-option');
    filterOptions.forEach(opt => opt.classList.remove('active'));
    const allOption = filterMenu.querySelector('[data-range="all"]');
    if (allOption) {
      allOption.classList.add('active');
    }
    
    // Remove old button listener by cloning
    const newFilterBtn = filterBtn.cloneNode(true);
    filterBtn.parentNode.replaceChild(newFilterBtn, filterBtn);
    
    // Toggle dropdown when clicking button
    newFilterBtn.addEventListener('click', function(e) {
      e.stopPropagation();
      filterMenu.classList.toggle('show');
      console.log('🔘 Dropdown toggled:', filterMenu.classList.contains('show'));
    });
    
    // Close dropdown when clicking outside
    document.addEventListener('click', function(e) {
      if (!newFilterBtn.contains(e.target) && !filterMenu.contains(e.target)) {
        filterMenu.classList.remove('show');
      }
    });
    
    // Handle filter selection
    filterOptions.forEach(option => {
      // Remove old listeners by cloning
      const newOption = option.cloneNode(true);
      option.parentNode.replaceChild(newOption, option);
      
      newOption.addEventListener('click', function(e) {
        e.stopPropagation();
        const rangeKey = this.getAttribute('data-range');
        const rangeLabel = this.textContent.trim();
        
        console.log('🔍 Filter selected:', rangeKey, rangeLabel);
        
        // Update active state
        filterMenu.querySelectorAll('.table-filter-option').forEach(opt => opt.classList.remove('active'));
        this.classList.add('active');
        
        // Update button label
        const labelElement = document.getElementById('leadTimeFilterLabel');
        const btnElement = document.getElementById('leadTimeFilterBtn');
        if (rangeKey === 'all') {
          labelElement.textContent = 'ช่วง Lead Time';
          if (btnElement) btnElement.classList.remove('active');
          
          // Show all data
          const fullData = window.leadTimeFullData || [];
          renderLeadTimeTable(fullData);
          
          // Remove filter indicator
          const indicator = document.querySelector('.lead-time-filter-indicator');
          if (indicator) indicator.remove();
        } else {
          labelElement.textContent = rangeLabel;
          if (btnElement) btnElement.classList.add('active');
          
          // Find and filter by range
          const distribution = window.leadTimeDistribution || [];
          const range = distribution.find(d => d.range === rangeKey);
          if (range) {
            filterTableByLeadTimeRange(range);
          }
        }
        
        // Close dropdown
        filterMenu.classList.remove('show');
      });
    });
    
    console.log('✅ Lead Time filter initialized');
  }

  // Show filter indicator
  function showLeadTimeFilterIndicator(rangeLabel) {
    // Remove existing indicator
    const existingIndicator = document.querySelector('.lead-time-filter-indicator');
    if (existingIndicator) {
      existingIndicator.remove();
    }
    
    // Create new indicator (Chip/Badge style - subtle & professional)
    const indicator = document.createElement('div');
    indicator.className = 'lead-time-filter-indicator';
    indicator.style.cssText = `
      background: #f5f5f5;
      border: 1px solid #e0e0e0;
      border-radius: 6px;
      padding: 8px 12px;
      margin-bottom: 12px;
      display: inline-flex;
      align-items: center;
      gap: 8px;
      font-size: 15px;
      color: #666;
      font-family: 'Kanit', sans-serif;
    `;
    
    indicator.innerHTML = `
      <span style="color: #888; font-weight: 400;">กรองแสดง:</span>
      <span style="
        background: #fff;
        border: 1px solid #ddd;
        border-radius: 4px;
        padding: 4px 10px;
        display: inline-flex;
        align-items: center;
        gap: 8px;
        color: #333;
        font-weight: 500;
      ">
        ${rangeLabel}
        <button onclick="clearLeadTimeFilter()" style="
          background: transparent;
          border: none;
          color: #999;
          cursor: pointer;
          padding: 0;
          font-size: 18px;
          line-height: 1;
          display: flex;
          align-items: center;
          transition: color 0.2s;
        " onmouseover="this.style.color='#666'" onmouseout="this.style.color='#999'" title="ล้างการกรอง">
          ×
        </button>
      </span>
    `;
    
    const tableContainer = document.getElementById('tableContainer');
    tableContainer.insertBefore(indicator, tableContainer.firstChild);
  }

  // Clear lead time filter (global function)
  window.clearLeadTimeFilter = function() {
    const fullData = window.leadTimeFullData || [];
    renderLeadTimeTable(fullData);
    
    const indicator = document.querySelector('.lead-time-filter-indicator');
    if (indicator) {
      indicator.remove();
    }
  };

  // Render lead time table
  function renderLeadTimeTable(data) {
    renderSortableTable([
      { key: 'row_number', label: 'ลำดับ', type: 'number', align: 'center', sortable: false },
      { key: 'order_code', label: 'Order Code', type: 'text', align: 'left' },
      { key: 'customer_name', label: 'ลูกค้า', type: 'text', align: 'left' },
      { key: 'country_name', label: 'ประเทศ', type: 'text', align: 'left' },
      { key: 'created_at', label: 'วันจอง', type: 'text', align: 'center' },
      { key: 'travel_start_date', label: 'วันเดินทาง', type: 'text', align: 'center' },
      { key: 'lead_time_days', label: 'Lead Time (วัน)', type: 'number', align: 'right' },
      { key: 'net_amount', label: 'ยอดเงิน', type: 'currency', align: 'right' }
    ], data.map((item, index) => ({
      row_number: index + 1,
      order_code: item.order_code || '-',
      customer_name: item.customer_name || 'ไม่ระบุ',
      country_name: item.country_name || 'ไม่ระบุ',
      created_at: item.created_at || '-',
      travel_start_date: item.travel_start_date || '-',
      lead_time_days: item.lead_time_days,
      net_amount: item.net_amount
    })));
  }

  // Format date for display (for other tabs)
  function formatDate(dateString) {
    if (!dateString) return '-';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('th-TH', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch (error) {
      return dateString;
    }
  }

  // Calculate nice scale for chart axis (Best Practice)
  function calculateNiceScale(min, max, maxTicks = 10) {
    // Always start Y-axis from 0 for bar charts
    min = 0;
    
    const range = max - min;
    
    // If range is 0, return simple scale
    if (range === 0) {
      return {
        min: 0,
        max: max + 1,
        tickSpacing: 1
      };
    }
    
    // Calculate rough tick spacing
    const roughTickSpacing = range / (maxTicks - 1);
    
    // Get magnitude of tick spacing
    const magnitude = Math.floor(Math.log10(roughTickSpacing));
    const magnitudePower = Math.pow(10, magnitude);
    
    // Calculate nice tick spacing (1, 2, 5, 10, 20, 50, 100, etc.)
    const normalizedSpacing = roughTickSpacing / magnitudePower;
    let niceTickSpacing;
    
    if (normalizedSpacing < 1.5) {
      niceTickSpacing = 1 * magnitudePower;
    } else if (normalizedSpacing < 3) {
      niceTickSpacing = 2 * magnitudePower;
    } else if (normalizedSpacing < 7) {
      niceTickSpacing = 5 * magnitudePower;
    } else {
      niceTickSpacing = 10 * magnitudePower;
    }
    
    // Calculate nice max (min is always 0)
    const niceMax = Math.ceil(max / niceTickSpacing) * niceTickSpacing;
    
    return {
      min: 0,
      max: niceMax,
      tickSpacing: niceTickSpacing
    };
  }

  // Render chart
  function renderChart(data, type, extraOptions = {}, minWidth = null, height = null) {
    const canvas = document.getElementById('reportChart');
    const chartContainer = document.getElementById('chartContainer');
    const chartWrapper = canvas.parentElement;
    const ctx = canvas.getContext('2d');
    
    // Destroy existing chart
    if (currentChart) {
      currentChart.destroy();
    }
    
    // Validate data
    if (!data || !data.labels || !data.datasets || data.labels.length === 0) {
      console.error('❌ Invalid chart data:', data);
      return;
    }
    
    console.log('📊 Rendering chart:', { 
      type, 
      labels: data.labels.length, 
      minWidth, 
      height,
      containerWidth: chartContainer.clientWidth 
    });
    
    // Set custom height if provided
    if (height) {
      chartContainer.style.height = `${height}px`;
    } else {
      chartContainer.style.height = '400px'; // default
    }
    
    // Enable horizontal scroll if minWidth is provided and exceeds container width
    if (minWidth && minWidth > chartContainer.clientWidth) {
      // Set wrapper width to enable scroll
      chartWrapper.style.width = `${minWidth}px`;
      chartWrapper.style.height = '100%';
      
      console.log('📏 Enabled horizontal scroll:', { 
        minWidth, 
        containerWidth: chartContainer.clientWidth,
        wrapperWidth: minWidth
      });
    } else {
      // Reset to default
      chartWrapper.style.width = '100%';
      chartWrapper.style.height = '100%';
    }
    
    // Determine if horizontal bar chart
    const isHorizontal = extraOptions.indexAxis === 'y';
    
    // Check if data labels are enabled
    const hasDataLabels = extraOptions.plugins?.datalabels?.display === true;
    
    // Calculate nice scale for the data
    let scaleConfig = {};
    if (type !== 'pie' && data.datasets && data.datasets[0]) {
      const values = data.datasets[0].data;
      const min = Math.min(...values);
      const max = Math.max(...values);
      
      // Add extra space for data labels (10% more)
      const adjustedMax = hasDataLabels ? max * 1.1 : max;
      const niceScale = calculateNiceScale(min, adjustedMax);
      
      console.log('📏 Scale:', { 
        dataMin: min, 
        dataMax: max,
        adjustedMax: adjustedMax,
        scaleMin: niceScale.min, 
        scaleMax: niceScale.max, 
        tickSpacing: niceScale.tickSpacing,
        hasDataLabels: hasDataLabels
      });
      
      scaleConfig = {
        min: niceScale.min,
        max: niceScale.max,
        ticks: {
          stepSize: niceScale.tickSpacing,
          font: {
            family: 'Kanit'
          },
          precision: 0
        }
      };
    }
    
    // Merge plugin options (extraOptions.plugins should override defaults)
    const pluginOptions = {
      legend: {
        display: type === 'pie',
        position: 'right',
        labels: {
          filter: function(legendItem, chartData) {
            // Hide 'Background' dataset from legend
            return legendItem.text !== 'Background';
          }
        }
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        padding: 12,
        titleFont: {
          size: 16,
          family: 'Kanit'
        },
        bodyFont: {
          size: 15,
          family: 'Kanit'
        },
        filter: function(tooltipItem) {
          // Hide 'Background' dataset from tooltip
          return tooltipItem.dataset.label !== 'Background';
        }
      },
      datalabels: {
        display: false,
        ...(extraOptions.plugins?.datalabels || {})
      },
      ...(extraOptions.plugins || {})
    };
    
    // Create new chart
    try {
      currentChart = new Chart(ctx, {
        type: type,
        data: data,
        plugins: extraOptions.plugins?.datalabels?.display ? [ChartDataLabels] : [],
        options: {
          ...extraOptions,
          responsive: true,
          maintainAspectRatio: false,
          layout: {
            padding: {
              top: hasDataLabels ? 30 : 10,
              right: 20,
              bottom: 10,
              left: 20
            }
          },
          plugins: pluginOptions,
          scales: type !== 'pie' ? {
            y: isHorizontal ? {
              ticks: {
                font: {
                  family: 'Kanit'
                }
              },
              grid: {
                display: false
              }
            } : {
              ...scaleConfig,
              grid: {
                display: true,
                color: 'rgba(0, 0, 0, 0.05)'
              },
              ...(extraOptions.scales?.y || {})
            },
            x: isHorizontal ? {
              ...scaleConfig,
              grid: {
                display: true,
                color: 'rgba(0, 0, 0, 0.05)'
              }
            } : {
              ticks: {
                font: {
                  family: 'Kanit'
                }
              },
              grid: {
                display: false
              },
              ...(extraOptions.scales?.x || {})
            }
          } : {}
        }
      });
      
      console.log('✅ Chart rendered successfully');
    } catch (error) {
      console.error('❌ Chart rendering error:', error);
    }
  }

  // Render sortable table
  function renderSortableTable(columns, data) {
    const thead = document.getElementById('reportTableHead');
    const tbody = document.getElementById('reportTableBody');
    
    // Clear existing content
    thead.innerHTML = '';
    tbody.innerHTML = '';
    
    // Store current data
    currentTableData = data;
    
    // Clear search
    const searchInput = document.getElementById('tableSearchInput');
    if (searchInput) {
      searchInput.value = '';
      document.getElementById('clearTableSearch').style.display = 'none';
      document.getElementById('tableSearchResults').style.display = 'none';
      
      // Remove any existing highlights
      setTimeout(() => {
        const rows = document.querySelectorAll('#reportTableBody tr');
        rows.forEach(row => {
          row.classList.remove('search-hidden');
          row.querySelectorAll('mark').forEach(mark => {
            mark.replaceWith(mark.textContent);
          });
        });
      }, 100);
    }
    
    // Initialize sortable table
    currentTableInstance = TableSortingComponent.initSortableTable({
      tableId: 'reportTable',
      columns: columns,
      data: data,
      onSort: (sortedData, sortColumn, sortDirection) => {
        console.log('Table sorted:', { sortColumn, sortDirection });
        currentTableData = sortedData;
      }
    });
  }

  // Format number
  function formatNumber(num) {
    if (num === null || num === undefined) return '-';
    return new Intl.NumberFormat('th-TH').format(num);
  }

  // Format currency
  function formatCurrency(num) {
    if (num === null || num === undefined) return '-';
    return new Intl.NumberFormat('th-TH', {
      style: 'currency',
      currency: 'THB',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(num);
  }

  // Export current tab to CSV
  function exportCurrentTabToCSV() {
    // Get visible rows from table (excluding hidden rows from search)
    const visibleRows = Array.from(document.querySelectorAll('#reportTableBody tr:not(.search-hidden)'));
    
    if (visibleRows.length === 0) {
      alert('ไม่มีข้อมูลให้ Export');
      return;
    }

    let headers = [];
    let rows = [];
    let filename = '';

    // Get headers from table
    const headerCells = document.querySelectorAll('#reportTableHead th');
    headers = Array.from(headerCells).map(th => {
      // Remove sort icons from header text
      const text = th.textContent.trim();
      return text.replace(/[▲▼]/g, '').trim();
    });

    // Get data from visible rows
    rows = visibleRows.map(row => {
      const cells = row.querySelectorAll('td');
      return Array.from(cells).map(cell => {
        // Get text content and remove any HTML tags or highlights
        let text = cell.textContent.trim();
        // Remove currency symbols and format
        text = text.replace(/[฿,]/g, '');
        return text;
      });
    });

    // Generate filename based on current tab
    const dateStr = new Date().toISOString().split('T')[0];
    switch(currentTab) {
      case 'country':
        filename = `order-report-by-country-${dateStr}.csv`;
        break;
      case 'supplier':
        filename = `order-report-by-supplier-${dateStr}.csv`;
        break;
      case 'travel-date':
        filename = `order-report-by-travel-date-${dateStr}.csv`;
        break;
      case 'booking-date':
        filename = `order-report-by-booking-date-${dateStr}.csv`;
        break;
      case 'lead-time':
        filename = `order-report-lead-time-${dateStr}.csv`;
        break;
      default:
        filename = `order-report-${dateStr}.csv`;
    }

    // Create CSV content
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    // Add BOM for Excel UTF-8 support
    const BOM = '\uFEFF';
    const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
    
    console.log('✅ CSV exported successfully:', filename, `(${rows.length} rows)`);
  }

})();
