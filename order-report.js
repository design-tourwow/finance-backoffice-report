// Order Report - Main JavaScript
(function () {
  'use strict';

  let currentChart = null;
  let currentTab = 'country';
  let currentFilters = {};
  let currentTableInstance = null;
  let currentTableData = [];
  let currentTabFullData = []; // Store full data for current tab
  let currentTopFilter = 'all'; // Default to All
  
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
    
    // Initialize top filter buttons for repeat customers
    const topFilterButtons = document.querySelectorAll('.top-filter-btn');
    topFilterButtons.forEach(btn => {
      btn.addEventListener('click', function() {
        // Update active state
        topFilterButtons.forEach(b => b.classList.remove('active'));
        this.classList.add('active');
        
        // Get selected top value
        const topValue = this.getAttribute('data-top');
        currentTopFilter = topValue === 'all' ? 'all' : parseInt(topValue);
        
        // Re-render chart with filtered data
        rerenderCurrentChart();
      });
    });
  }
  
  // Re-render current chart with top filter
  function rerenderCurrentChart() {
    if (!currentTabFullData || currentTabFullData.length === 0) {
      return;
    }
    
    switch(currentTab) {
      case 'country':
        renderCountryChart();
        break;
      case 'supplier':
        renderSupplierChart();
        break;
      case 'travel-date':
        renderTravelDateChart();
        break;
      case 'booking-date':
        renderBookingDateChart();
        break;
      case 'repeat-customers':
        renderRepeatCustomersChart();
        break;
    }
  }

  // Switch tab
  async function switchTab(tabName) {
    // Update active tab
    document.querySelectorAll('.report-tab').forEach(tab => {
      tab.classList.remove('active');
    });
    document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
    
    currentTab = tabName;
    
    // Reset top filter to default (All)
    currentTopFilter = 'all';
    document.querySelectorAll('.top-filter-btn').forEach(btn => {
      btn.classList.remove('active');
      if (btn.getAttribute('data-top') === 'all') {
        btn.classList.add('active');
      }
    });
    
    // Show top filter for all tabs
    const topFilterWrapper = document.getElementById('topFilterWrapper');
    topFilterWrapper.style.display = 'flex';
    
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
          case 'repeat-customers':
            return await OrderReportAPI.getRepeatCustomers(currentFilters);
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
        case 'repeat-customers':
          renderRepeatCustomersReport(response);
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
      showEmpty();
      return;
    }

    showContent();
    
    // Store full data
    currentTabFullData = response.data;
    
    // Render chart with current filter
    renderCountryChart();
    
    // Render sortable table with full data
    renderSortableTable([
      { key: 'country_name', label: 'ประเทศ', type: 'text', align: 'left' },
      { key: 'total_orders', label: 'จำนวน Orders', type: 'number', align: 'right' },
      { key: 'total_customers', label: 'จำนวนลูกค้า', type: 'number', align: 'right' },
      { key: 'total_net_amount', label: 'ยอดรวม (Net Amount)', type: 'currency', align: 'right' },
      { key: 'avg_net_amount', label: 'ค่าเฉลี่ย/Order', type: 'currency', align: 'right' }
    ], currentTabFullData.map(item => ({
      country_name: item.country_name || 'ไม่ระบุ',
      total_orders: item.total_orders,
      total_customers: item.total_customers,
      total_net_amount: item.total_net_amount,
      avg_net_amount: item.avg_net_amount
    })));
  }
  
  // Render Country Chart (separate function for filtering)
  function renderCountryChart() {
    if (!currentTabFullData || currentTabFullData.length === 0) {
      return;
    }
    
    // Filter data based on currentTopFilter
    let filteredData = currentTabFullData;
    if (currentTopFilter !== 'all') {
      filteredData = currentTabFullData.slice(0, currentTopFilter);
    }
    
    // Fixed chart height - calculate based on full data for consistency
    const totalItems = currentTabFullData.length;
    const minHeight = 500;
    const maxHeight = 1200;
    const heightPerItem = 40; // Increased spacing
    const calculatedHeight = Math.min(maxHeight, Math.max(minHeight, totalItems * heightPerItem));
    
    const chartContainer = document.getElementById('chartContainer');
    chartContainer.style.height = calculatedHeight + 'px';
    
    // Render chart
    renderChart({
      labels: filteredData.map(item => item.country_name || 'ไม่ระบุ'),
      datasets: [{
        label: 'จำนวน Orders',
        data: filteredData.map(item => item.total_orders),
        backgroundColor: 'rgba(74, 123, 167, 0.8)',
        borderColor: 'rgba(74, 123, 167, 1)',
        borderWidth: 1
      }]
    }, 'bar', { 
      barPercentage: 0.7,
      categoryPercentage: 0.8
    });
  }

  // Render Supplier Report
  function renderSupplierReport(response) {
    if (!response || !response.data || response.data.length === 0) {
      showEmpty();
      return;
    }

    showContent();
    
    // Store full data
    currentTabFullData = response.data;
    
    // Render chart with current filter
    renderSupplierChart();
    
    // Render sortable table with full data
    renderSortableTable([
      { key: 'supplier_name', label: 'Supplier', type: 'text', align: 'left' },
      { key: 'total_orders', label: 'จำนวน Orders', type: 'number', align: 'right' },
      { key: 'total_customers', label: 'จำนวนลูกค้า', type: 'number', align: 'right' },
      { key: 'total_net_amount', label: 'ยอดรวม (Net Amount)', type: 'currency', align: 'right' },
      { key: 'avg_net_amount', label: 'ค่าเฉลี่ย/Order', type: 'currency', align: 'right' }
    ], currentTabFullData.map(item => ({
      supplier_name: item.supplier_name || 'ไม่ระบุ',
      total_orders: item.total_orders,
      total_customers: item.total_customers,
      total_net_amount: item.total_net_amount,
      avg_net_amount: item.avg_net_amount
    })));
  }
  
  // Render Supplier Chart (separate function for filtering)
  function renderSupplierChart() {
    if (!currentTabFullData || currentTabFullData.length === 0) {
      return;
    }
    
    // Filter data based on currentTopFilter
    let filteredData = currentTabFullData;
    if (currentTopFilter !== 'all') {
      filteredData = currentTabFullData.slice(0, currentTopFilter);
    }
    
    // Fixed chart height - calculate based on full data for consistency
    const totalItems = currentTabFullData.length;
    const minHeight = 500;
    const maxHeight = 1200;
    const heightPerItem = 40; // Increased spacing
    const calculatedHeight = Math.min(maxHeight, Math.max(minHeight, totalItems * heightPerItem));
    
    const chartContainer = document.getElementById('chartContainer');
    chartContainer.style.height = calculatedHeight + 'px';
    
    // Render chart (same blue color as Country)
    renderChart({
      labels: filteredData.map(item => item.supplier_name || 'ไม่ระบุ'),
      datasets: [{
        label: 'จำนวน Orders',
        data: filteredData.map(item => item.total_orders),
        backgroundColor: 'rgba(74, 123, 167, 0.8)',
        borderColor: 'rgba(74, 123, 167, 1)',
        borderWidth: 1
      }]
    }, 'bar', { 
      barPercentage: 0.7,
      categoryPercentage: 0.8
    });
  }

  // Render Travel Date Report
  function renderTravelDateReport(response) {
    if (!response || !response.data || response.data.length === 0) {
      showEmpty();
      return;
    }

    showContent();
    
    // Store full data
    currentTabFullData = response.data;
    
    // Render chart with current filter
    renderTravelDateChart();
    
    // Render sortable table with full data
    renderSortableTable([
      { key: 'travel_month_label', label: 'เดือน/ปี', type: 'text', align: 'left' },
      { key: 'total_orders', label: 'จำนวน Orders', type: 'number', align: 'right' },
      { key: 'total_customers', label: 'จำนวนลูกค้า', type: 'number', align: 'right' },
      { key: 'total_net_amount', label: 'ยอดรวม (Net Amount)', type: 'currency', align: 'right' }
    ], currentTabFullData.map(item => ({
      travel_month_label: item.travel_month_label || item.travel_month || 'ไม่ระบุ',
      total_orders: item.total_orders,
      total_customers: item.total_customers,
      total_net_amount: item.total_net_amount
    })));
  }
  
  // Render Travel Date Chart (separate function for filtering)
  function renderTravelDateChart() {
    if (!currentTabFullData || currentTabFullData.length === 0) {
      return;
    }
    
    // Filter data based on currentTopFilter
    let filteredData = currentTabFullData;
    if (currentTopFilter !== 'all') {
      filteredData = currentTabFullData.slice(0, currentTopFilter);
    }
    
    // Reset chart height for line chart
    const chartContainer = document.getElementById('chartContainer');
    chartContainer.style.height = '400px';
    
    // Render chart (same blue color as Country)
    renderChart({
      labels: filteredData.map(item => item.travel_month_label || item.travel_month || 'ไม่ระบุ'),
      datasets: [{
        label: 'จำนวน Orders',
        data: filteredData.map(item => item.total_orders),
        backgroundColor: 'rgba(74, 123, 167, 0.8)',
        borderColor: 'rgba(74, 123, 167, 1)',
        borderWidth: 2,
        fill: false
      }]
    }, 'line');
  }

  // Render Booking Date Report
  function renderBookingDateReport(response) {
    if (!response || !response.data || response.data.length === 0) {
      showEmpty();
      return;
    }

    showContent();
    
    // Store full data
    currentTabFullData = response.data;
    
    // Render chart with current filter
    renderBookingDateChart();
    
    // Render sortable table with full data
    renderSortableTable([
      { key: 'booking_month_label', label: 'เดือน/ปี', type: 'text', align: 'left' },
      { key: 'total_orders', label: 'จำนวน Orders', type: 'number', align: 'right' },
      { key: 'total_customers', label: 'จำนวนลูกค้า', type: 'number', align: 'right' },
      { key: 'total_net_amount', label: 'ยอดรวม (Net Amount)', type: 'currency', align: 'right' }
    ], currentTabFullData.map(item => ({
      booking_month_label: item.booking_month_label || item.booking_month || 'ไม่ระบุ',
      total_orders: item.total_orders,
      total_customers: item.total_customers,
      total_net_amount: item.total_net_amount
    })));
  }
  
  // Render Booking Date Chart (separate function for filtering)
  function renderBookingDateChart() {
    if (!currentTabFullData || currentTabFullData.length === 0) {
      return;
    }
    
    // Filter data based on currentTopFilter
    let filteredData = currentTabFullData;
    if (currentTopFilter !== 'all') {
      filteredData = currentTabFullData.slice(0, currentTopFilter);
    }
    
    // Reset chart height for line chart
    const chartContainer = document.getElementById('chartContainer');
    chartContainer.style.height = '400px';
    
    // Render chart (same blue color as Country)
    renderChart({
      labels: filteredData.map(item => item.booking_month_label || item.booking_month || 'ไม่ระบุ'),
      datasets: [{
        label: 'จำนวน Orders',
        data: filteredData.map(item => item.total_orders),
        backgroundColor: 'rgba(74, 123, 167, 0.8)',
        borderColor: 'rgba(74, 123, 167, 1)',
        borderWidth: 2,
        fill: false
      }]
    }, 'line');
  }

  // Render Repeat Customers Report
  function renderRepeatCustomersReport(response) {
    if (!response || !response.data || response.data.length === 0) {
      showEmpty();
      return;
    }

    showContent();
    
    // Store full data
    currentTabFullData = response.data;
    
    // Render chart with current filter
    renderRepeatCustomersChart();
    
    // Render sortable table with full data
    renderSortableTable([
      { key: 'customer_code', label: 'รหัสลูกค้า', type: 'text', align: 'left' },
      { key: 'customer_name', label: 'ชื่อลูกค้า', type: 'text', align: 'left' },
      { key: 'phone_number', label: 'เบอร์โทร', type: 'text', align: 'left' },
      { key: 'total_orders', label: 'จำนวน Orders', type: 'number', align: 'right' },
      { key: 'countries', label: 'ประเทศ', type: 'text', align: 'left' },
      { key: 'total_spent', label: 'ยอดรวม', type: 'currency', align: 'right' }
    ], currentTabFullData.map(item => ({
      customer_code: item.customer_code || '-',
      customer_name: item.customer_name || 'ไม่ระบุ',
      phone_number: item.phone_number || '-',
      total_orders: item.total_orders,
      countries: item.countries || '-',
      total_spent: item.total_spent
    })));
  }
  
  // Render Repeat Customers Chart (separate function for filtering)
  function renderRepeatCustomersChart() {
    if (!currentTabFullData || currentTabFullData.length === 0) {
      return;
    }
    
    // Filter data based on currentTopFilter
    let filteredData = currentTabFullData;
    if (currentTopFilter !== 'all') {
      filteredData = currentTabFullData.slice(0, currentTopFilter);
    }
    
    // Fixed chart height - calculate based on full data for consistency
    const totalItems = currentTabFullData.length;
    const minHeight = 500;
    const maxHeight = 1200;
    const heightPerItem = 40; // Increased spacing
    const calculatedHeight = Math.min(maxHeight, Math.max(minHeight, totalItems * heightPerItem));
    
    const chartContainer = document.getElementById('chartContainer');
    chartContainer.style.height = calculatedHeight + 'px';
    
    // Render chart (Horizontal Bar chart - same style as Country tab)
    renderChart({
      labels: filteredData.map(item => item.customer_name || 'ไม่ระบุ'),
      datasets: [{
        label: 'จำนวน Orders',
        data: filteredData.map(item => item.total_orders),
        backgroundColor: 'rgba(74, 123, 167, 0.8)',
        borderColor: 'rgba(74, 123, 167, 1)',
        borderWidth: 1
      }]
    }, 'bar', { 
      indexAxis: 'y',
      barPercentage: 0.7,
      categoryPercentage: 0.8
    });
  }
  
  // Adjust chart height based on number of items (removed - no longer used)
  function adjustChartHeight(itemCount) {
    // This function is no longer used but kept for compatibility
  }

  // Render chart
  function renderChart(data, type, extraOptions = {}) {
    const canvas = document.getElementById('reportChart');
    const ctx = canvas.getContext('2d');
    
    // Destroy existing chart
    if (currentChart) {
      currentChart.destroy();
    }
    
    // Calculate min/max for better scaling
    let minValue = 0;
    let maxValue = 0;
    
    if (type !== 'pie' && data.datasets && data.datasets[0]) {
      const values = data.datasets[0].data;
      minValue = Math.min(...values);
      maxValue = Math.max(...values);
      
      // If all values are small (< 10), adjust scale
      if (maxValue < 10 && maxValue > 0) {
        minValue = 0;
        maxValue = Math.ceil(maxValue * 1.2); // Add 20% padding
      } else if (minValue > 0) {
        // If minimum is not 0, start from a reasonable baseline
        const range = maxValue - minValue;
        minValue = Math.max(0, minValue - range * 0.1);
      }
    }
    
    // Determine if horizontal bar chart
    const isHorizontal = extraOptions.indexAxis === 'y';
    
    // Create new chart
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
          y: {
            beginAtZero: isHorizontal ? true : (maxValue >= 10),
            min: isHorizontal ? undefined : minValue,
            max: isHorizontal ? undefined : maxValue,
            ticks: {
              font: {
                family: 'Kanit'
              },
              stepSize: (!isHorizontal && maxValue < 10) ? 1 : undefined,
              precision: isHorizontal ? 0 : 0
            }
          },
          x: {
            beginAtZero: isHorizontal ? true : undefined,
            ticks: {
              font: {
                family: 'Kanit'
              },
              stepSize: isHorizontal ? 1 : undefined,
              precision: 0
            }
          }
        } : {}
      }
    });
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
