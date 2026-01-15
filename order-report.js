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
          case 'country-with-labels':
            return await OrderReportAPI.getReportByCountry(currentFilters);
          case 'supplier':
            return await OrderReportAPI.getReportBySupplier(currentFilters);
          case 'travel-date':
            return await OrderReportAPI.getReportByTravelDate(currentFilters);
          case 'booking-date':
            return await OrderReportAPI.getReportByBookingDate(currentFilters);
          case 'lead-time':
            return await OrderReportAPI.getLeadTimeAnalysis(currentFilters);
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
        case 'country-with-labels':
          renderCountryReportWithLabels(response);
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
    currentTabData = data;
    console.log('📊 Country Report Data:', data);
    console.log('📊 Data length:', data.length);
    console.log('🔍 Current Filters:', currentFilters);
    
    // Initialize filter dropdown for Country tab
    initTabFilter('country', data);
    
    // Render chart WITH data labels
    renderChart({
      labels: data.map(item => item.country_name || 'ไม่ระบุ'),
      datasets: [{
        label: 'จำนวน Orders',
        data: data.map(item => item.total_orders),
        backgroundColor: 'rgba(74, 123, 167, 0.8)',
        borderColor: 'rgba(74, 123, 167, 1)',
        borderWidth: 1
      }]
    }, 'bar', {
      plugins: {
        datalabels: {
          display: true,
          anchor: 'end',
          align: 'top',
          color: '#374151',
          font: {
            size: 12,
            weight: 'bold',
            family: 'Kanit'
          },
          formatter: (value) => {
            return formatNumber(value);
          }
        }
      }
    });
    
    // Render sortable table
    renderSortableTable([
      { key: 'row_number', label: 'ลำดับ', type: 'number', align: 'center', sortable: false },
      { key: 'country_name', label: 'ประเทศ', type: 'text', align: 'left' },
      { key: 'total_orders', label: 'จำนวน Orders', type: 'number', align: 'right' },
      { key: 'total_customers', label: 'จำนวนลูกค้า', type: 'number', align: 'right' },
      { key: 'total_net_amount', label: 'ยอดรวม (Net Amount)', type: 'currency', align: 'right' },
      { key: 'avg_net_amount', label: 'ค่าเฉลี่ย/Order', type: 'currency', align: 'right' }
    ], data.map((item, index) => ({
      row_number: index + 1,
      country_name: item.country_name || 'ไม่ระบุ',
      total_orders: item.total_orders,
      total_customers: item.total_customers,
      total_net_amount: item.total_net_amount,
      avg_net_amount: item.avg_net_amount
    })));
  }

  // Render Country Report with Data Labels on Chart
  function renderCountryReportWithLabels(response) {
    console.log('🎨 Rendering Country Report with Labels:', response);
    
    if (!response || !response.data || response.data.length === 0) {
      console.warn('⚠️ No data in Country Report response');
      showEmpty();
      return;
    }

    showContent();
    
    const data = response.data;
    currentTabData = data;
    
    // Initialize filter dropdown for Country tab
    initTabFilter('country', data);
    
    // Render chart WITH data labels on top of bars
    renderChart({
      labels: data.map(item => item.country_name || 'ไม่ระบุ'),
      datasets: [{
        label: 'จำนวน Orders',
        data: data.map(item => item.total_orders),
        backgroundColor: 'rgba(74, 123, 167, 0.8)',
        borderColor: 'rgba(74, 123, 167, 1)',
        borderWidth: 1
      }]
    }, 'bar', {
      plugins: {
        datalabels: {
          display: true,
          anchor: 'end',
          align: 'top',
          color: '#374151',
          font: {
            size: 12,
            weight: 'bold',
            family: 'Kanit'
          },
          formatter: (value) => {
            return formatNumber(value);
          }
        }
      }
    });
    
    // Render sortable table
    renderSortableTable([
      { key: 'row_number', label: 'ลำดับ', type: 'number', align: 'center', sortable: false },
      { key: 'country_name', label: 'ประเทศ', type: 'text', align: 'left' },
      { key: 'total_orders', label: 'จำนวน Orders', type: 'number', align: 'right' },
      { key: 'total_customers', label: 'จำนวนลูกค้า', type: 'number', align: 'right' },
      { key: 'total_net_amount', label: 'ยอดรวม (Net Amount)', type: 'currency', align: 'right' },
      { key: 'avg_net_amount', label: 'ค่าเฉลี่ย/Order', type: 'currency', align: 'right' }
    ], data.map((item, index) => ({
      row_number: index + 1,
      country_name: item.country_name || 'ไม่ระบุ',
      total_orders: item.total_orders,
      total_customers: item.total_customers,
      total_net_amount: item.total_net_amount,
      avg_net_amount: item.avg_net_amount
    })));
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
        options = [
          {
            value: 'all',
            label: 'ทั้งหมด',
            active: true,
            icon: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 12h18M3 6h18M3 18h18"/></svg>`
          },
          ...data.map(item => ({
            value: item.country_name,
            label: item.country_name || 'ไม่ระบุ',
            icon: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/></svg>`
          }))
        ];
        onChange = (value) => filterByCountry(value);
        break;
        
      case 'supplier':
        options = [
          {
            value: 'all',
            label: 'ทั้งหมด',
            active: true,
            icon: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 12h18M3 6h18M3 18h18"/></svg>`
          },
          ...data.map(item => ({
            value: item.supplier_name,
            label: item.supplier_name || 'ไม่ระบุ',
            icon: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>`
          }))
        ];
        onChange = (value) => filterBySupplier(value);
        break;
        
      case 'travel-date':
        options = [
          {
            value: 'all',
            label: 'ทั้งหมด',
            active: true,
            icon: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 12h18M3 6h18M3 18h18"/></svg>`
          },
          ...data.map(item => ({
            value: item.travel_month_label || item.travel_month,
            label: item.travel_month_label || item.travel_month || 'ไม่ระบุ',
            icon: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>`
          }))
        ];
        onChange = (value) => filterByTravelDate(value);
        break;
        
      case 'booking-date':
        options = [
          {
            value: 'all',
            label: 'ทั้งหมด',
            active: true,
            icon: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 12h18M3 6h18M3 18h18"/></svg>`
          },
          ...data.map(item => ({
            value: item.booking_month_label || item.booking_month,
            label: item.booking_month_label || item.booking_month || 'ไม่ระบุ',
            icon: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>`
          }))
        ];
        onChange = (value) => filterByBookingDate(value);
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
      currentFilterInstance = FilterSortDropdownComponent.initDropdown({
        containerId: 'tabFilterContainer',
        defaultLabel: options[0].label,
        defaultIcon: options[0].icon,
        options: options,
        onChange: onChange
      });
    }
  }

  // Filter functions for each tab
  function filterByCountry(value) {
    if (value === 'all') {
      renderCountryReport({ data: currentTabData });
    } else {
      const filtered = currentTabData.filter(item => item.country_name === value);
      renderCountryReport({ data: filtered });
    }
  }

  function filterBySupplier(value) {
    if (value === 'all') {
      renderSupplierReport({ data: currentTabData });
    } else {
      const filtered = currentTabData.filter(item => item.supplier_name === value);
      renderSupplierReport({ data: filtered });
    }
  }

  function filterByTravelDate(value) {
    if (value === 'all') {
      renderTravelDateReport({ data: currentTabData });
    } else {
      const filtered = currentTabData.filter(item => 
        (item.travel_month_label || item.travel_month) === value
      );
      renderTravelDateReport({ data: filtered });
    }
  }

  function filterByBookingDate(value) {
    if (value === 'all') {
      renderBookingDateReport({ data: currentTabData });
    } else {
      const filtered = currentTabData.filter(item => 
        (item.booking_month_label || item.booking_month) === value
      );
      renderBookingDateReport({ data: filtered });
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
    
    // Render chart WITH data labels
    renderChart({
      labels: data.map(item => item.supplier_name || 'ไม่ระบุ'),
      datasets: [{
        label: 'จำนวน Orders',
        data: data.map(item => item.total_orders),
        backgroundColor: 'rgba(74, 123, 167, 0.8)',
        borderColor: 'rgba(74, 123, 167, 1)',
        borderWidth: 1
      }]
    }, 'bar', {
      plugins: {
        datalabels: {
          display: true,
          anchor: 'end',
          align: 'top',
          color: '#374151',
          font: {
            size: 12,
            weight: 'bold',
            family: 'Kanit'
          },
          formatter: (value) => {
            return formatNumber(value);
          }
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
  function renderTravelDateReport(response) {
    if (!response || !response.data || response.data.length === 0) {
      showEmpty();
      return;
    }

    showContent();
    
    const data = response.data;
    currentTabData = data;
    
    // Initialize filter dropdown for Travel Date tab
    initTabFilter('travel-date', data);
    
    // Render chart WITH data labels
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
    }, 'line', {
      plugins: {
        datalabels: {
          display: true,
          anchor: 'end',
          align: 'top',
          color: '#374151',
          font: {
            size: 12,
            weight: 'bold',
            family: 'Kanit'
          },
          formatter: (value) => {
            return formatNumber(value);
          }
        }
      }
    });
    
    // Render sortable table
    renderSortableTable([
      { key: 'row_number', label: 'ลำดับ', type: 'number', align: 'center', sortable: false },
      { key: 'travel_month_label', label: 'เดือน/ปี', type: 'text', align: 'left' },
      { key: 'total_orders', label: 'จำนวน Orders', type: 'number', align: 'right' },
      { key: 'total_customers', label: 'จำนวนลูกค้า', type: 'number', align: 'right' },
      { key: 'total_net_amount', label: 'ยอดรวม (Net Amount)', type: 'currency', align: 'right' }
    ], data.map((item, index) => ({
      row_number: index + 1,
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
    currentTabData = data;
    
    // Initialize filter dropdown for Booking Date tab
    initTabFilter('booking-date', data);
    
    // Render chart WITH data labels
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
    }, 'line', {
      plugins: {
        datalabels: {
          display: true,
          anchor: 'end',
          align: 'top',
          color: '#374151',
          font: {
            size: 12,
            weight: 'bold',
            family: 'Kanit'
          },
          formatter: (value) => {
            return formatNumber(value);
          }
        }
      }
    });
    
    // Render sortable table
    renderSortableTable([
      { key: 'row_number', label: 'ลำดับ', type: 'number', align: 'center', sortable: false },
      { key: 'booking_month_label', label: 'เดือน/ปี', type: 'text', align: 'left' },
      { key: 'total_orders', label: 'จำนวน Orders', type: 'number', align: 'right' },
      { key: 'total_customers', label: 'จำนวนลูกค้า', type: 'number', align: 'right' },
      { key: 'total_net_amount', label: 'ยอดรวม (Net Amount)', type: 'currency', align: 'right' }
    ], data.map((item, index) => ({
      row_number: index + 1,
      booking_month_label: item.booking_month_label || item.booking_month || 'ไม่ระบุ',
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
    
    // Render Column Chart WITH data labels
    renderChart({
      labels: distribution.map(item => item.range_label || item.range),
      datasets: [{
        label: 'จำนวน Orders',
        data: distribution.map(item => item.count),
        backgroundColor: 'rgba(74, 123, 167, 0.8)',
        borderColor: 'rgba(74, 123, 167, 1)',
        borderWidth: 1
      }]
    }, 'bar', {
      plugins: {
        datalabels: {
          display: true,
          anchor: 'end',
          align: 'top',
          color: '#374151',
          font: {
            size: 12,
            weight: 'bold',
            family: 'Kanit'
          },
          formatter: (value) => {
            return formatNumber(value);
          }
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
      font-size: 13px;
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
