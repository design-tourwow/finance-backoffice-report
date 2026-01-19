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
    initExportButton();
    
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
    
    // Destroy current filter instance when switching tabs
    if (currentFilterInstance && currentFilterInstance.destroy) {
      currentFilterInstance.destroy();
      currentFilterInstance = null;
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
    
    // Calculate max value for background bars
    const maxValue = Math.max(...data.map(item => item.total_orders));
    
    // Render chart WITH data labels and background bars (stacked)
    renderChart({
      labels: data.map(item => item.country_name || 'ไม่ระบุ'),
      datasets: [
        {
          label: 'Background',
          data: data.map(() => maxValue),
          backgroundColor: 'rgba(230, 230, 230, 0.3)',
          borderColor: 'transparent',
          borderWidth: 0,
          datalabels: {
            display: false
          }
        },
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
              size: 12,
              weight: 'bold',
              family: 'Kanit'
            },
            formatter: (value) => {
              return formatNumber(value);
            }
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
              size: 14
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
    
    // Render chart WITH data labels and background bars (stacked)
    renderChart({
      labels: data.map(item => item.supplier_name || 'ไม่ระบุ'),
      datasets: [
        {
          label: 'Background',
          data: data.map(() => maxValue),
          backgroundColor: 'rgba(230, 230, 230, 0.3)',
          borderColor: 'transparent',
          borderWidth: 0,
          datalabels: {
            display: false
          }
        },
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
              size: 12,
              weight: 'bold',
              family: 'Kanit'
            },
            formatter: (value) => {
              return formatNumber(value);
            }
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
              size: 14
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
    
    // Render bar chart with horizontal scroll and background bars (stacked)
    renderChart({
      labels: data.map(item => item.travel_start_date_label || item.travel_start_date || 'ไม่ระบุ'),
      datasets: [
        {
          label: 'Background',
          data: data.map(() => maxValue),
          backgroundColor: 'rgba(230, 230, 230, 0.3)',
          borderColor: 'transparent',
          borderWidth: 0,
          datalabels: {
            display: false
          }
        },
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
              size: 12,
              weight: 'bold',
              family: 'Kanit'
            },
            formatter: (value) => {
              return formatNumber(value);
            }
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
              size: 14
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
    
    // Render bar chart with horizontal scroll and background bars (stacked)
    renderChart({
      labels: data.map(item => item.created_date_label || item.created_date || 'ไม่ระบุ'),
      datasets: [
        {
          label: 'Background',
          data: data.map(() => maxValue),
          backgroundColor: 'rgba(230, 230, 230, 0.3)',
          borderColor: 'transparent',
          borderWidth: 0,
          datalabels: {
            display: false
          }
        },
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
              size: 12,
              weight: 'bold',
              family: 'Kanit'
            },
            formatter: (value) => {
              return formatNumber(value);
            }
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
              size: 14
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
    
    // Render Column Chart WITH data labels and background bars (stacked)
    renderChart({
      labels: distribution.map(item => item.range_label || item.range),
      datasets: [
        {
          label: 'Background',
          data: distribution.map(() => maxValue),
          backgroundColor: 'rgba(230, 230, 230, 0.3)',
          borderColor: 'transparent',
          borderWidth: 0,
          datalabels: {
            display: false
          }
        },
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
              size: 12,
              weight: 'bold',
              family: 'Kanit'
            },
            formatter: (value) => {
              return formatNumber(value);
            }
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
              size: 14
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
          size: 14,
          family: 'Kanit'
        },
        bodyFont: {
          size: 13,
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
    if (!currentTableData || currentTableData.length === 0) {
      alert('ไม่มีข้อมูลให้ Export');
      return;
    }

    let headers = [];
    let rows = [];
    let filename = '';

    // Determine which tab is active and prepare data accordingly
    switch(currentTab) {
      case 'country':
        filename = `order-report-by-country-${new Date().toISOString().split('T')[0]}.csv`;
        headers = ['ลำดับ', 'ประเทศ', 'จำนวน Orders', 'จำนวนลูกค้า', 'ยอดรวม (Net Amount)', 'ค่าเฉลี่ย/Order'];
        rows = currentTableData.map((item, index) => [
          index + 1,
          item.country_name || 'ไม่ระบุ',
          item.total_orders || 0,
          item.total_customers || 0,
          item.total_net_amount || 0,
          item.avg_net_amount || 0
        ]);
        break;

      case 'supplier':
        filename = `order-report-by-supplier-${new Date().toISOString().split('T')[0]}.csv`;
        headers = ['ลำดับ', 'Supplier', 'จำนวน Orders', 'จำนวนลูกค้า', 'ยอดรวม (Net Amount)', 'ค่าเฉลี่ย/Order'];
        rows = currentTableData.map((item, index) => [
          index + 1,
          item.supplier_name || 'ไม่ระบุ',
          item.total_orders || 0,
          item.total_customers || 0,
          item.total_net_amount || 0,
          item.avg_net_amount || 0
        ]);
        break;

      case 'travel-date':
        filename = `order-report-by-travel-date-${new Date().toISOString().split('T')[0]}.csv`;
        headers = ['ลำดับ', 'วันที่เดินทาง', 'จำนวน Orders', 'จำนวนลูกค้า', 'ยอดรวม (Net Amount)'];
        rows = currentTableData.map((item, index) => [
          index + 1,
          item.travel_start_date_label || item.travel_start_date || 'ไม่ระบุ',
          item.total_orders || 0,
          item.total_customers || 0,
          item.total_net_amount || 0
        ]);
        break;

      case 'booking-date':
        filename = `order-report-by-booking-date-${new Date().toISOString().split('T')[0]}.csv`;
        headers = ['ลำดับ', 'วันที่จอง', 'จำนวน Orders', 'จำนวนลูกค้า', 'ยอดรวม (Net Amount)'];
        rows = currentTableData.map((item, index) => [
          index + 1,
          item.created_date_label || item.created_date || 'ไม่ระบุ',
          item.total_orders || 0,
          item.total_customers || 0,
          item.total_net_amount || 0
        ]);
        break;

      case 'lead-time':
        filename = `order-report-lead-time-${new Date().toISOString().split('T')[0]}.csv`;
        headers = ['ลำดับ', 'Order Code', 'ลูกค้า', 'ประเทศ', 'วันจอง', 'วันเดินทาง', 'Lead Time (วัน)', 'ยอดเงิน'];
        rows = currentTableData.map((item, index) => [
          index + 1,
          item.order_code || '-',
          item.customer_name || 'ไม่ระบุ',
          item.country_name || 'ไม่ระบุ',
          item.created_at || '-',
          item.travel_start_date || '-',
          item.lead_time_days || 0,
          item.net_amount || 0
        ]);
        break;

      default:
        alert('ไม่สามารถ Export ข้อมูลได้');
        return;
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
    
    console.log('✅ CSV exported successfully:', filename);
  }

})();
