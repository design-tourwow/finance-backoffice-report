// Order Report - Main JavaScript
(function () {
  'use strict';

  let currentChart = null;
  let currentTab = 'country';
  let currentFilters = {};
  let currentTableInstance = null;
  let currentTableData = [];
  
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
    console.log('🎯 Initializing Order Report...');
    
    // Check authentication
    if (!checkAuth()) {
      showAuthModal();
      return;
    }

    // Initialize components
    initTabs();
    initFilters();
    initDatePickers();
    initFormHandler();
    initTableSearch();
    
    // Load initial data
    await loadInitialData();
    
    console.log('✅ Order Report initialized');
  }

  // Check authentication
  function checkAuth() {
    if (typeof TourImageAPI !== 'undefined' && TourImageAPI.hasToken) {
      return TourImageAPI.hasToken();
    }
    return !!(sessionStorage.getItem('authToken') || localStorage.getItem('authToken'));
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
  function redirectToLogin() {
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
    // Update active tab
    document.querySelectorAll('.report-tab').forEach(tab => {
      tab.classList.remove('active');
    });
    document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
    
    currentTab = tabName;
    
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
      const countriesResponse = await OrderReportAPI.getCountries();
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
      const suppliersResponse = await OrderReportAPI.getSuppliers();
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
    try {
      const response = await OrderReportAPI.getOrderSummary(currentFilters);
      
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
    showLoading();
    
    try {
      let response;
      
      // Call API with minimum loading time for better UX
      const apiCall = async () => {
        switch(tabName) {
          case 'country':
            return await OrderReportAPI.getReportByCountry(currentFilters);
          case 'supplier':
            return await OrderReportAPI.getReportBySupplier(currentFilters);
          case 'travel-date':
            return await OrderReportAPI.getReportByTravelDate(currentFilters);
          case 'booking-date':
            return await OrderReportAPI.getReportByBookingDate(currentFilters);
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
    document.querySelector('.loading-state').style.display = 'flex';
    document.querySelector('.empty-state').style.display = 'none';
    document.getElementById('chartContainer').style.display = 'none';
    document.getElementById('tableContainer').style.display = 'none';
  }

  // Show empty
  function showEmpty() {
    document.querySelector('.loading-state').style.display = 'none';
    document.querySelector('.empty-state').style.display = 'flex';
    document.getElementById('chartContainer').style.display = 'none';
    document.getElementById('tableContainer').style.display = 'none';
  }

  // Show content
  function showContent() {
    document.querySelector('.loading-state').style.display = 'none';
    document.querySelector('.empty-state').style.display = 'none';
    document.getElementById('chartContainer').style.display = 'block';
    document.getElementById('tableContainer').style.display = 'block';
  }

  // Render Country Report
  function renderCountryReport(response) {
    console.log('🎨 Rendering Country Report:', response);
    
    if (!response || !response.data || response.data.length === 0) {
      console.warn('⚠️ No data in Country Report response');
      showEmpty();
      return;
    }

    showContent();
    
    const data = response.data;
    console.log('📊 Country Report Data:', data);
    console.log('📊 Data length:', data.length);
    console.log('🔍 Current Filters:', currentFilters);
    
    // Render chart
    renderChart({
      labels: data.map(item => item.country_name || 'ไม่ระบุ'),
      datasets: [{
        label: 'จำนวน Orders',
        data: data.map(item => item.total_orders),
        backgroundColor: 'rgba(74, 123, 167, 0.8)',
        borderColor: 'rgba(74, 123, 167, 1)',
        borderWidth: 1
      }]
    }, 'bar');
    
    // Render sortable table
    renderSortableTable([
      { key: 'country_name', label: 'ประเทศ', type: 'text', align: 'left' },
      { key: 'total_orders', label: 'จำนวน Orders', type: 'number', align: 'right' },
      { key: 'total_customers', label: 'จำนวนลูกค้า', type: 'number', align: 'right' },
      { key: 'total_net_amount', label: 'ยอดรวม (Net Amount)', type: 'currency', align: 'right' },
      { key: 'avg_net_amount', label: 'ค่าเฉลี่ย/Order', type: 'currency', align: 'right' }
    ], data.map(item => ({
      country_name: item.country_name || 'ไม่ระบุ',
      total_orders: item.total_orders,
      total_customers: item.total_customers,
      total_net_amount: item.total_net_amount,
      avg_net_amount: item.avg_net_amount
    })));
  }

  // Render Supplier Report
  function renderSupplierReport(response) {
    if (!response || !response.data || response.data.length === 0) {
      showEmpty();
      return;
    }

    showContent();
    
    const data = response.data;
    
    // Render chart (same blue color as Country)
    renderChart({
      labels: data.map(item => item.supplier_name || 'ไม่ระบุ'),
      datasets: [{
        label: 'จำนวน Orders',
        data: data.map(item => item.total_orders),
        backgroundColor: 'rgba(74, 123, 167, 0.8)',
        borderColor: 'rgba(74, 123, 167, 1)',
        borderWidth: 1
      }]
    }, 'bar');
    
    // Render sortable table
    renderSortableTable([
      { key: 'supplier_name', label: 'Supplier', type: 'text', align: 'left' },
      { key: 'total_orders', label: 'จำนวน Orders', type: 'number', align: 'right' },
      { key: 'total_customers', label: 'จำนวนลูกค้า', type: 'number', align: 'right' },
      { key: 'total_net_amount', label: 'ยอดรวม (Net Amount)', type: 'currency', align: 'right' },
      { key: 'avg_net_amount', label: 'ค่าเฉลี่ย/Order', type: 'currency', align: 'right' }
    ], data.map(item => ({
      supplier_name: item.supplier_name || 'ไม่ระบุ',
      total_orders: item.total_orders,
      total_customers: item.total_customers,
      total_net_amount: item.total_net_amount,
      avg_net_amount: item.avg_net_amount
    })));
  }

  // Render Travel Date Report
  function renderTravelDateReport(response) {
    if (!response || !response.data || response.data.length === 0) {
      showEmpty();
      return;
    }

    showContent();
    
    const data = response.data;
    
    // Render chart (same blue color as Country)
    renderChart({
      labels: data.map(item => item.travel_month_label || item.travel_month || 'ไม่ระบุ'),
      datasets: [{
        label: 'จำนวน Orders',
        data: data.map(item => item.total_orders),
        backgroundColor: 'rgba(74, 123, 167, 0.8)',
        borderColor: 'rgba(74, 123, 167, 1)',
        borderWidth: 2,
        fill: false
      }]
    }, 'line');
    
    // Render sortable table
    renderSortableTable([
      { key: 'travel_month_label', label: 'เดือน/ปี', type: 'text', align: 'left' },
      { key: 'total_orders', label: 'จำนวน Orders', type: 'number', align: 'right' },
      { key: 'total_customers', label: 'จำนวนลูกค้า', type: 'number', align: 'right' },
      { key: 'total_net_amount', label: 'ยอดรวม (Net Amount)', type: 'currency', align: 'right' }
    ], data.map(item => ({
      travel_month_label: item.travel_month_label || item.travel_month || 'ไม่ระบุ',
      total_orders: item.total_orders,
      total_customers: item.total_customers,
      total_net_amount: item.total_net_amount
    })));
  }

  // Render Booking Date Report
  function renderBookingDateReport(response) {
    if (!response || !response.data || response.data.length === 0) {
      showEmpty();
      return;
    }

    showContent();
    
    const data = response.data;
    
    // Render chart (same blue color as Country)
    renderChart({
      labels: data.map(item => item.booking_month_label || item.booking_month || 'ไม่ระบุ'),
      datasets: [{
        label: 'จำนวน Orders',
        data: data.map(item => item.total_orders),
        backgroundColor: 'rgba(74, 123, 167, 0.8)',
        borderColor: 'rgba(74, 123, 167, 1)',
        borderWidth: 2,
        fill: false
      }]
    }, 'line');
    
    // Render sortable table
    renderSortableTable([
      { key: 'booking_month_label', label: 'เดือน/ปี', type: 'text', align: 'left' },
      { key: 'total_orders', label: 'จำนวน Orders', type: 'number', align: 'right' },
      { key: 'total_customers', label: 'จำนวนลูกค้า', type: 'number', align: 'right' },
      { key: 'total_net_amount', label: 'ยอดรวม (Net Amount)', type: 'currency', align: 'right' }
    ], data.map(item => ({
      booking_month_label: item.booking_month_label || item.booking_month || 'ไม่ระบุ',
      total_orders: item.total_orders,
      total_customers: item.total_customers,
      total_net_amount: item.total_net_amount
    })));
  }

  // Calculate nice scale for chart axis (Best Practice)
  function calculateNiceScale(min, max, maxTicks = 10) {
    const range = max - min;
    
    // If range is 0, return simple scale
    if (range === 0) {
      return {
        min: Math.max(0, min - 1),
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
    
    // Calculate nice min and max
    const niceMin = Math.floor(min / niceTickSpacing) * niceTickSpacing;
    const niceMax = Math.ceil(max / niceTickSpacing) * niceTickSpacing;
    
    return {
      min: niceMin,
      max: niceMax,
      tickSpacing: niceTickSpacing
    };
  }

  // Render chart
  function renderChart(data, type, extraOptions = {}) {
    const canvas = document.getElementById('reportChart');
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
    
    console.log('📊 Rendering chart:', { type, labels: data.labels, data: data.datasets[0]?.data });
    
    // Determine if horizontal bar chart
    const isHorizontal = extraOptions.indexAxis === 'y';
    
    // Calculate nice scale for the data
    let scaleConfig = {};
    if (type !== 'pie' && data.datasets && data.datasets[0]) {
      const values = data.datasets[0].data;
      const min = Math.min(...values);
      const max = Math.max(...values);
      
      const niceScale = calculateNiceScale(min, max);
      
      console.log('📏 Scale:', { 
        dataMin: min, 
        dataMax: max, 
        scaleMin: niceScale.min, 
        scaleMax: niceScale.max, 
        tickSpacing: niceScale.tickSpacing 
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
    
    // Create new chart
    try {
      currentChart = new Chart(ctx, {
        type: type,
        data: data,
        options: {
          ...extraOptions,
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              display: type === 'pie',
              position: 'right'
            },
            tooltip: {
              backgroundColor: 'rgba(0, 0, 0, 0.8)',
              padding: 12,
              titleFont: {
                size: 14,
                family: 'Kanit'
              },
              bodyFont: {
                size: 13,
                family: 'Kanit'
              }
            },
            datalabels: {
              display: false
            }
          },
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
              }
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
              }
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

})();
