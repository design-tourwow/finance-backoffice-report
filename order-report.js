// Order Report - Main JavaScript
(function () {
  'use strict';

  let currentChart = null;
  let currentTab = 'country';
  let currentFilters = {};
  
  // Date picker states
  let travelDatePicker = {
    startDate: null,
    endDate: null,
    currentMonth: new Date()
  };
  
  let bookingDatePicker = {
    startDate: null,
    endDate: null,
    currentMonth: new Date()
  };

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
      if (travelDatePicker.startDate && travelDatePicker.endDate) {
        currentFilters.travel_date_from = formatDateToAPI(travelDatePicker.startDate);
        currentFilters.travel_date_to = formatDateToAPI(travelDatePicker.endDate);
      }
      
      // Booking dates
      if (bookingDatePicker.startDate && bookingDatePicker.endDate) {
        currentFilters.booking_date_from = formatDateToAPI(bookingDatePicker.startDate);
        currentFilters.booking_date_to = formatDateToAPI(bookingDatePicker.endDate);
      }
      
      console.log('🔍 Applying filters:', currentFilters);
      
      // Reload current tab with filters
      await loadTabData(currentTab);
    });

    form.addEventListener('reset', function() {
      currentFilters = {};
      travelDatePicker.startDate = null;
      travelDatePicker.endDate = null;
      bookingDatePicker.startDate = null;
      bookingDatePicker.endDate = null;
      document.getElementById('travelDateRangePicker').value = '';
      document.getElementById('bookingDateRangePicker').value = '';
      setTimeout(() => loadTabData(currentTab), 100);
    });
  }
  
  // Format date to API format (YYYY-MM-DD)
  function formatDateToAPI(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  // Initialize date pickers
  function initDatePickers() {
    initDateRangePicker('travel', travelDatePicker);
    initDateRangePicker('booking', bookingDatePicker);
  }

  // Initialize date range picker
  function initDateRangePicker(type, pickerState) {
    const inputId = `${type}DateRangePicker`;
    const dropdownId = `${type}CalendarDropdown`;
    const wrapperId = `${type}DatePicker`;
    
    const input = document.getElementById(inputId);
    const dropdown = document.getElementById(dropdownId);
    const wrapper = document.getElementById(wrapperId);

    if (!input || !dropdown) return;

    const thaiMonths = [
      'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
      'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
    ];

    const thaiDays = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'];

    // Toggle calendar
    input.addEventListener('click', function (e) {
      e.stopPropagation();
      const isVisible = dropdown.style.display === 'block';
      dropdown.style.display = isVisible ? 'none' : 'block';
      input.setAttribute('aria-expanded', !isVisible);
      if (!isVisible) {
        renderCalendar();
      }
    });

    // Close calendar when clicking outside
    document.addEventListener('click', function (e) {
      if (!wrapper.contains(e.target)) {
        dropdown.style.display = 'none';
        input.setAttribute('aria-expanded', 'false');
      }
    });

    function renderCalendar() {
      const year = pickerState.currentMonth.getFullYear();
      const month = pickerState.currentMonth.getMonth();
      const buddhistYear = year + 543;

      const nextMonthDate = new Date(year, month + 1, 1);
      const nextYear = nextMonthDate.getFullYear();
      const nextMonth = nextMonthDate.getMonth();
      const nextBuddhistYear = nextYear + 543;

      let html = `
        <div class="calendar-dual">
          <div class="calendar-month">
            <div class="calendar-header">
              <button type="button" class="calendar-nav-btn prev-month">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
                </svg>
              </button>
              <div class="calendar-title">${thaiMonths[month]} ${buddhistYear}</div>
              <div style="width: 36px;"></div>
            </div>
            <div class="calendar-days-header">
              ${thaiDays.map((day) => `<div class="calendar-day-name">${day}</div>`).join('')}
            </div>
            <div class="calendar-days">${renderDays(year, month)}</div>
          </div>
          <div class="calendar-month">
            <div class="calendar-header">
              <div style="width: 36px;"></div>
              <div class="calendar-title">${thaiMonths[nextMonth]} ${nextBuddhistYear}</div>
              <button type="button" class="calendar-nav-btn next-month">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
                </svg>
              </button>
            </div>
            <div class="calendar-days-header">
              ${thaiDays.map((day) => `<div class="calendar-day-name">${day}</div>`).join('')}
            </div>
            <div class="calendar-days">${renderDays(nextYear, nextMonth)}</div>
          </div>
        </div>
        <div class="calendar-actions">
          <button type="button" class="calendar-btn clear">ล้าง</button>
          <button type="button" class="calendar-btn apply">ตกลง</button>
        </div>
      `;

      dropdown.innerHTML = html;

      // Event listeners
      dropdown.querySelector('.prev-month').addEventListener('click', (e) => {
        e.stopPropagation();
        pickerState.currentMonth.setMonth(pickerState.currentMonth.getMonth() - 1);
        renderCalendar();
      });

      dropdown.querySelector('.next-month').addEventListener('click', (e) => {
        e.stopPropagation();
        pickerState.currentMonth.setMonth(pickerState.currentMonth.getMonth() + 1);
        renderCalendar();
      });

      dropdown.querySelector('.clear').addEventListener('click', (e) => {
        e.stopPropagation();
        pickerState.startDate = null;
        pickerState.endDate = null;
        input.value = '';
        renderCalendar();
      });

      dropdown.querySelector('.apply').addEventListener('click', (e) => {
        e.stopPropagation();
        if (pickerState.startDate && pickerState.endDate) {
          updateInputValue();
          dropdown.style.display = 'none';
        } else if (pickerState.startDate) {
          alert('กรุณาเลือกวันที่สิ้นสุด');
        } else {
          dropdown.style.display = 'none';
        }
      });

      // Day click handlers
      dropdown.querySelectorAll('.calendar-day:not(.other-month)').forEach((cell) => {
        cell.addEventListener('click', function (e) {
          e.stopPropagation();
          const dateStr = this.dataset.date;
          if (!dateStr) return;

          const [y, m, d] = dateStr.split('-').map(Number);
          const selectedDate = new Date(y, m, d);

          if (!pickerState.startDate || (pickerState.startDate && pickerState.endDate)) {
            pickerState.startDate = selectedDate;
            pickerState.endDate = null;
            updateInputValue();
            renderCalendar();
          } else {
            if (selectedDate >= pickerState.startDate) {
              pickerState.endDate = selectedDate;
            } else {
              pickerState.endDate = pickerState.startDate;
              pickerState.startDate = selectedDate;
            }
            updateInputValue();
            renderCalendar();
            setTimeout(() => {
              dropdown.style.display = 'none';
            }, 300);
          }
        });
      });
    }

    function updateInputValue() {
      if (pickerState.startDate && pickerState.endDate) {
        const start = formatDateToBuddhistEra(pickerState.startDate);
        const end = formatDateToBuddhistEra(pickerState.endDate);
        input.value = `${start} ถึง ${end}`;
      } else if (pickerState.startDate) {
        const start = formatDateToBuddhistEra(pickerState.startDate);
        input.value = `${start} - เลือกวันที่สิ้นสุด`;
      }
    }

    function formatDateToBuddhistEra(date) {
      const day = String(date.getDate()).padStart(2, '0');
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const year = date.getFullYear() + 543;
      return `${day}/${month}/${year}`;
    }

    function renderDays(year, month) {
      const firstDay = new Date(year, month, 1);
      const lastDay = new Date(year, month + 1, 0);
      const prevLastDay = new Date(year, month, 0);

      const firstDayOfWeek = firstDay.getDay();
      const lastDate = lastDay.getDate();
      const prevLastDate = prevLastDay.getDate();

      let days = '';

      // Previous month days
      for (let i = firstDayOfWeek - 1; i >= 0; i--) {
        const day = prevLastDate - i;
        days += `<div class="calendar-day other-month">${day}</div>`;
      }

      // Current month days
      for (let day = 1; day <= lastDate; day++) {
        const date = new Date(year, month, day);
        const dateStr = `${year}-${month}-${day}`;
        const isStart = pickerState.startDate && isSameDay(date, pickerState.startDate);
        const isEnd = pickerState.endDate && isSameDay(date, pickerState.endDate);
        const isInRange = pickerState.startDate && pickerState.endDate && 
                         date > pickerState.startDate && date < pickerState.endDate;
        const isToday = isSameDay(date, new Date());

        let classes = 'calendar-day';
        if (isStart || isEnd) {
          classes += ' selected';
        } else if (isInRange) {
          classes += ' in-range';
        } else if (isToday) {
          classes += ' today';
        }

        days += `<div class="${classes}" data-date="${dateStr}">${day}</div>`;
      }

      // Next month days
      const totalCells = firstDayOfWeek + lastDate;
      const remainingCells = 7 - (totalCells % 7);
      if (remainingCells < 7) {
        for (let day = 1; day <= remainingCells; day++) {
          days += `<div class="calendar-day other-month">${day}</div>`;
        }
      }

      return days;
    }

    function isSameDay(date1, date2) {
      return (
        date1.getFullYear() === date2.getFullYear() &&
        date1.getMonth() === date2.getMonth() &&
        date1.getDate() === date2.getDate()
      );
    }
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
      
      switch(tabName) {
        case 'country':
          response = await OrderReportAPI.getReportByCountry(currentFilters);
          renderCountryReport(response);
          break;
        case 'supplier':
          response = await OrderReportAPI.getReportBySupplier(currentFilters);
          renderSupplierReport(response);
          break;
        case 'travel-date':
          response = await OrderReportAPI.getReportByTravelDate(currentFilters);
          renderTravelDateReport(response);
          break;
        case 'booking-date':
          response = await OrderReportAPI.getReportByBookingDate(currentFilters);
          renderBookingDateReport(response);
          break;
        case 'repeat-customers':
          response = await OrderReportAPI.getRepeatCustomers(currentFilters);
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
