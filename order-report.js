// Order Report - Main JavaScript
(function () {
  'use strict';

  let currentChart = null;
  let currentTab = 'country';
  let currentFilters = {};
  
  // Date picker instances
  let travelDatePickerInstance = null;
  let bookingDatePickerInstance = null;

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
    try {
      // Load countries
      const countriesResponse = await OrderReportAPI.getCountries();
      if (countriesResponse && countriesResponse.status === 'success' && countriesResponse.data) {
        const countrySelect = document.getElementById('filterCountry');
        countriesResponse.data.forEach(country => {
          const option = document.createElement('option');
          option.value = country.id;
          option.textContent = `${country.name_th} (${country.name_en})`;
          countrySelect.appendChild(option);
        });
      }

      // Load suppliers
      const suppliersResponse = await OrderReportAPI.getSuppliers();
      if (suppliersResponse && suppliersResponse.status === 'success' && suppliersResponse.data) {
        const supplierSelect = document.getElementById('filterSupplier');
        suppliersResponse.data.forEach(supplier => {
          const option = document.createElement('option');
          option.value = supplier.id;
          option.textContent = `${supplier.name_th} (${supplier.name_en})`;
          supplierSelect.appendChild(option);
        });
      }
    } catch (error) {
      console.error('❌ Failed to load filters:', error);
    }
  }

  // Initialize form handler
  function initFormHandler() {
    const form = document.getElementById('reportFilterForm');
    
    form.addEventListener('submit', async function(e) {
      e.preventDefault();
      
      // Get form data
      currentFilters = {};
      
      // Country and Supplier
      const country = document.getElementById('filterCountry').value;
      const supplier = document.getElementById('filterSupplier').value;
      
      if (country) currentFilters.country_id = country;
      if (supplier) currentFilters.supplier_id = supplier;
      
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
      
      // Reload current tab with filters
      await loadTabData(currentTab);
    });

    form.addEventListener('reset', function() {
      currentFilters = {};
      if (travelDatePickerInstance) travelDatePickerInstance.clear();
      if (bookingDatePickerInstance) bookingDatePickerInstance.clear();
      setTimeout(() => loadTabData(currentTab), 100);
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

  // Load initial data
  async function loadInitialData() {
    await Promise.all([
      loadSummary(),
      loadTabData('country')
    ]);
  }

  // Load summary
  async function loadSummary() {
    try {
      const response = await OrderReportAPI.getOrderSummary(currentFilters);
      
      if (response && response.status === 'success' && response.data) {
        const data = response.data;
        
        document.getElementById('summaryTotalOrders').textContent = 
          formatNumber(data.total_orders || 0);
        document.getElementById('summaryTotalCustomers').textContent = 
          formatNumber(data.total_customers || 0);
        document.getElementById('summaryTotalAmount').textContent = 
          formatCurrency(data.total_net_amount || 0);
        document.getElementById('summaryAvgAmount').textContent = 
          formatCurrency(data.avg_net_amount || 0);
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
    if (!response || !response.data || response.data.length === 0) {
      showEmpty();
      return;
    }

    showContent();
    
    const data = response.data;
    
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
    
    // Render table
    renderTable(
      ['ประเทศ', 'จำนวน Orders', 'จำนวนลูกค้า', 'ยอดรวม (Net Amount)', 'ค่าเฉลี่ย/Order'],
      data.map(item => [
        item.country_name || 'ไม่ระบุ',
        formatNumber(item.total_orders),
        formatNumber(item.total_customers),
        formatCurrency(item.total_net_amount),
        formatCurrency(item.avg_net_amount)
      ])
    );
  }

  // Render Supplier Report
  function renderSupplierReport(response) {
    if (!response || !response.data || response.data.length === 0) {
      showEmpty();
      return;
    }

    showContent();
    
    const data = response.data;
    
    // Render chart
    renderChart({
      labels: data.map(item => item.supplier_name || 'ไม่ระบุ'),
      datasets: [{
        label: 'จำนวน Orders',
        data: data.map(item => item.total_orders),
        backgroundColor: 'rgba(123, 31, 162, 0.8)',
        borderColor: 'rgba(123, 31, 162, 1)',
        borderWidth: 1
      }]
    }, 'bar');
    
    // Render table
    renderTable(
      ['Supplier', 'จำนวน Orders', 'จำนวนลูกค้า', 'ยอดรวม (Net Amount)', 'ค่าเฉลี่ย/Order'],
      data.map(item => [
        item.supplier_name || 'ไม่ระบุ',
        formatNumber(item.total_orders),
        formatNumber(item.total_customers),
        formatCurrency(item.total_net_amount),
        formatCurrency(item.avg_net_amount)
      ])
    );
  }

  // Render Travel Date Report
  function renderTravelDateReport(response) {
    if (!response || !response.data || response.data.length === 0) {
      showEmpty();
      return;
    }

    showContent();
    
    const data = response.data;
    
    // Render chart
    renderChart({
      labels: data.map(item => item.travel_month || 'ไม่ระบุ'),
      datasets: [{
        label: 'จำนวน Orders',
        data: data.map(item => item.total_orders),
        backgroundColor: 'rgba(56, 142, 60, 0.8)',
        borderColor: 'rgba(56, 142, 60, 1)',
        borderWidth: 2,
        fill: false
      }]
    }, 'line');
    
    // Render table
    renderTable(
      ['เดือน/ปี', 'จำนวน Orders', 'จำนวนลูกค้า', 'ยอดรวม (Net Amount)'],
      data.map(item => [
        item.travel_month || 'ไม่ระบุ',
        formatNumber(item.total_orders),
        formatNumber(item.total_customers),
        formatCurrency(item.total_net_amount)
      ])
    );
  }

  // Render Booking Date Report
  function renderBookingDateReport(response) {
    if (!response || !response.data || response.data.length === 0) {
      showEmpty();
      return;
    }

    showContent();
    
    const data = response.data;
    
    // Render chart
    renderChart({
      labels: data.map(item => item.booking_month || 'ไม่ระบุ'),
      datasets: [{
        label: 'จำนวน Orders',
        data: data.map(item => item.total_orders),
        backgroundColor: 'rgba(245, 124, 0, 0.8)',
        borderColor: 'rgba(245, 124, 0, 1)',
        borderWidth: 2,
        fill: false
      }]
    }, 'line');
    
    // Render table
    renderTable(
      ['เดือน/ปี', 'จำนวน Orders', 'จำนวนลูกค้า', 'ยอดรวม (Net Amount)'],
      data.map(item => [
        item.booking_month || 'ไม่ระบุ',
        formatNumber(item.total_orders),
        formatNumber(item.total_customers),
        formatCurrency(item.total_net_amount)
      ])
    );
  }

  // Render Repeat Customers Report
  function renderRepeatCustomersReport(response) {
    if (!response || !response.data || response.data.length === 0) {
      showEmpty();
      return;
    }

    showContent();
    
    const data = response.data;
    
    // Render chart (Pie chart for repeat customers)
    renderChart({
      labels: data.map(item => item.customer_name || 'ไม่ระบุ'),
      datasets: [{
        label: 'จำนวน Orders',
        data: data.map(item => item.total_orders),
        backgroundColor: [
          'rgba(74, 123, 167, 0.8)',
          'rgba(123, 31, 162, 0.8)',
          'rgba(56, 142, 60, 0.8)',
          'rgba(245, 124, 0, 0.8)',
          'rgba(211, 47, 47, 0.8)',
          'rgba(0, 150, 136, 0.8)',
          'rgba(255, 152, 0, 0.8)',
          'rgba(63, 81, 181, 0.8)'
        ],
        borderWidth: 1
      }]
    }, 'pie');
    
    // Render table
    renderTable(
      ['รหัสลูกค้า', 'ชื่อลูกค้า', 'เบอร์โทร', 'จำนวน Orders', 'ประเทศ', 'ยอดรวม'],
      data.map(item => [
        item.customer_code || '-',
        item.customer_name || 'ไม่ระบุ',
        item.phone_number || '-',
        formatNumber(item.total_orders),
        item.countries || '-',
        formatCurrency(item.total_spent)
      ])
    );
  }

  // Render chart
  function renderChart(data, type) {
    const canvas = document.getElementById('reportChart');
    const ctx = canvas.getContext('2d');
    
    // Destroy existing chart
    if (currentChart) {
      currentChart.destroy();
    }
    
    // Create new chart
    currentChart = new Chart(ctx, {
      type: type,
      data: data,
      options: {
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
          }
        },
        scales: type !== 'pie' ? {
          y: {
            beginAtZero: true,
            ticks: {
              font: {
                family: 'Kanit'
              }
            }
          },
          x: {
            ticks: {
              font: {
                family: 'Kanit'
              }
            }
          }
        } : {}
      }
    });
  }

  // Render table
  function renderTable(headers, rows) {
    const thead = document.getElementById('reportTableHead');
    const tbody = document.getElementById('reportTableBody');
    
    // Clear existing content
    thead.innerHTML = '';
    tbody.innerHTML = '';
    
    // Render headers
    const headerRow = document.createElement('tr');
    headers.forEach(header => {
      const th = document.createElement('th');
      th.textContent = header;
      headerRow.appendChild(th);
    });
    thead.appendChild(headerRow);
    
    // Render rows
    rows.forEach((row) => {
      const tr = document.createElement('tr');
      row.forEach((cell, cellIndex) => {
        const td = document.createElement('td');
        td.textContent = cell;
        
        // Add classes for number/currency columns
        if (cellIndex > 0 && typeof cell === 'string' && (cell.includes(',') || cell.includes('฿'))) {
          td.classList.add(cell.includes('฿') ? 'currency' : 'number');
        }
        
        tr.appendChild(td);
      });
      tbody.appendChild(tr);
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
