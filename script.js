// Tour Image Manager - Custom Date Range Picker
(function () {
  'use strict';

  // Utility: Debounce function
  function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }

  document.addEventListener('DOMContentLoaded', function () {
    initMobileMenu();
    initCustomDateRangePicker();
    initMultiSelect();
    initFormHandler();
    initShowAllButtons();
    initAccessibility();
    initInfiniteScroll();
    initImagePreviewModal();
    initExportImport();
    initSorting();
    loadInitialData();
  });

  // Mobile Menu
  function initMobileMenu() {
    const menuToggle = document.querySelector('.mobile-menu-toggle');
    const sidebar = document.querySelector('.sidebar');
    const appWrapper = document.querySelector('.app-wrapper');

    if (!menuToggle || !sidebar) return;

    menuToggle.addEventListener('click', function () {
      const isOpen = sidebar.classList.toggle('open');
      appWrapper.classList.toggle('menu-open', isOpen);
      menuToggle.setAttribute('aria-expanded', isOpen);
    });

    // Close menu when clicking overlay
    appWrapper.addEventListener('click', function (e) {
      if (e.target === appWrapper && sidebar.classList.contains('open')) {
        sidebar.classList.remove('open');
        appWrapper.classList.remove('menu-open');
        menuToggle.setAttribute('aria-expanded', 'false');
      }
    });

    // Close menu on escape key
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && sidebar.classList.contains('open')) {
        sidebar.classList.remove('open');
        appWrapper.classList.remove('menu-open');
        menuToggle.setAttribute('aria-expanded', 'false');
      }
    });
  }

  // Accessibility improvements
  function initAccessibility() {
    // Handle expandable nav items
    const expandableItems = document.querySelectorAll('.nav-item.expandable');
    expandableItems.forEach((item) => {
      item.addEventListener('click', function (e) {
        e.preventDefault();
        const isExpanded = this.getAttribute('aria-expanded') === 'true';
        this.setAttribute('aria-expanded', !isExpanded);
      });
    });
  }

  // Multi-Select Dropdown
  function initMultiSelect() {
    const multiSelects = document.querySelectorAll('.multi-select-wrapper');
    
    multiSelects.forEach((wrapper) => {
      const trigger = wrapper.querySelector('.multi-select-trigger');
      const dropdown = wrapper.querySelector('.multi-select-dropdown');
      const searchInput = wrapper.querySelector('.multi-select-search input');
      const selectAllBtn = wrapper.querySelector('.select-all');
      const deselectAllBtn = wrapper.querySelector('.deselect-all');
      const optionsContainer = wrapper.querySelector('.multi-select-options');
      const hiddenInput = wrapper.nextElementSibling;
      const selectedText = trigger.querySelector('.selected-text');
      
      let selectedValues = [];
      
      // Toggle dropdown
      const toggleDropdown = () => {
        const isOpen = dropdown.classList.contains('open');
        
        // Close all other dropdowns
        document.querySelectorAll('.multi-select-dropdown.open').forEach(d => {
          if (d !== dropdown) {
            d.classList.remove('open');
            d.previousElementSibling.classList.remove('open');
            d.previousElementSibling.setAttribute('aria-expanded', 'false');
          }
        });
        
        if (isOpen) {
          dropdown.classList.remove('open');
          trigger.classList.remove('open');
          trigger.setAttribute('aria-expanded', 'false');
        } else {
          dropdown.classList.add('open');
          trigger.classList.add('open');
          trigger.setAttribute('aria-expanded', 'true');
          searchInput.focus();
        }
      };
      
      // Update selected text
      const updateSelectedText = () => {
        const checkboxes = optionsContainer.querySelectorAll('input[type="checkbox"]:checked');
        const count = checkboxes.length;
        
        if (count === 0) {
          selectedText.textContent = trigger.dataset.placeholder || 'เลือก';
          trigger.classList.add('placeholder');
        } else {
          // Show all selected items as comma-separated text
          const labels = Array.from(checkboxes).map(cb => cb.nextElementSibling.textContent);
          selectedText.textContent = labels.join(', ');
          trigger.classList.remove('placeholder');
        }
        
        // Update hidden input
        selectedValues = Array.from(checkboxes).map(cb => cb.value);
        hiddenInput.value = selectedValues.join(',');
      };
      
      // Search functionality
      const filterOptions = () => {
        const searchTerm = searchInput.value.toLowerCase();
        const options = optionsContainer.querySelectorAll('.multi-select-option');
        let hasResults = false;
        
        options.forEach(option => {
          const label = option.querySelector('label').textContent.toLowerCase();
          if (label.includes(searchTerm)) {
            option.style.display = 'flex';
            hasResults = true;
          } else {
            option.style.display = 'none';
          }
        });
        
        // Show/hide no results message
        let noResults = optionsContainer.querySelector('.multi-select-no-results');
        if (!hasResults) {
          if (!noResults) {
            noResults = document.createElement('div');
            noResults.className = 'multi-select-no-results';
            noResults.textContent = 'ไม่พบผลลัพธ์';
            optionsContainer.appendChild(noResults);
          }
          noResults.style.display = 'block';
        } else if (noResults) {
          noResults.style.display = 'none';
        }
      };
      
      // Select all
      const selectAll = () => {
        const visibleCheckboxes = Array.from(optionsContainer.querySelectorAll('.multi-select-option'))
          .filter(opt => opt.style.display !== 'none')
          .map(opt => opt.querySelector('input[type="checkbox"]'));
        
        visibleCheckboxes.forEach(cb => {
          cb.checked = true;
          cb.closest('.multi-select-option').classList.add('selected');
        });
        updateSelectedText();
      };
      
      // Deselect all
      const deselectAll = () => {
        const visibleCheckboxes = Array.from(optionsContainer.querySelectorAll('.multi-select-option'))
          .filter(opt => opt.style.display !== 'none')
          .map(opt => opt.querySelector('input[type="checkbox"]'));
        
        visibleCheckboxes.forEach(cb => {
          cb.checked = false;
          cb.closest('.multi-select-option').classList.remove('selected');
        });
        updateSelectedText();
      };
      
      // Event listeners
      trigger.addEventListener('click', toggleDropdown);
      trigger.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          toggleDropdown();
        }
      });
      
      searchInput.addEventListener('input', filterOptions);
      searchInput.addEventListener('click', (e) => e.stopPropagation());
      
      selectAllBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        selectAll();
      });
      
      deselectAllBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        deselectAll();
      });
      
      // Handle option clicks
      optionsContainer.addEventListener('click', (e) => {
        const option = e.target.closest('.multi-select-option');
        if (option) {
          const checkbox = option.querySelector('input[type="checkbox"]');
          if (e.target !== checkbox) {
            checkbox.checked = !checkbox.checked;
          }
          
          if (checkbox.checked) {
            option.classList.add('selected');
          } else {
            option.classList.remove('selected');
          }
          
          updateSelectedText();
        }
      });
      
      // Close on outside click
      document.addEventListener('click', (e) => {
        if (!wrapper.contains(e.target)) {
          dropdown.classList.remove('open');
          trigger.classList.remove('open');
          trigger.setAttribute('aria-expanded', 'false');
        }
      });
      
      // Store placeholder
      trigger.dataset.placeholder = selectedText.textContent;
    });
  }

function initCustomDateRangePicker() {
  const input = document.getElementById('dateRangePicker');
  const dropdown = document.getElementById('calendarDropdown');
  const wrapper = document.getElementById('customDatePicker');

  if (!input || !dropdown) return;

  try {

  let startDate = null;
  let endDate = null;
  let currentMonth = new Date();
  let isSelecting = false;

  const thaiMonths = [
    'มกราคม',
    'กุมภาพันธ์',
    'มีนาคม',
    'เมษายน',
    'พฤษภาคม',
    'มิถุนายน',
    'กรกฎาคม',
    'สิงหาคม',
    'กันยายน',
    'ตุลาคม',
    'พฤศจิกายน',
    'ธันวาคม',
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

  // Keyboard support for input
  input.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      this.click();
    }
    if (e.key === 'Escape') {
      dropdown.style.display = 'none';
      input.setAttribute('aria-expanded', 'false');
    }
  });

  // Prevent closing when clicking inside dropdown
  dropdown.addEventListener('click', function (e) {
    e.stopPropagation();
  });

  // Close calendar when clicking outside
  document.addEventListener('click', function (e) {
    if (!wrapper.contains(e.target)) {
      dropdown.style.display = 'none';
      input.setAttribute('aria-expanded', 'false');
    }
  });

  // Close on escape key
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && dropdown.style.display === 'block') {
      dropdown.style.display = 'none';
      input.setAttribute('aria-expanded', 'false');
      input.focus();
    }
  });

  function renderCalendar() {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const buddhistYear = year + 543;

    // Next month
    const nextMonthDate = new Date(year, month + 1, 1);
    const nextYear = nextMonthDate.getFullYear();
    const nextMonth = nextMonthDate.getMonth();
    const nextBuddhistYear = nextYear + 543;

    let html = `
      <div class="calendar-dual">
        <!-- First Month -->
        <div class="calendar-month">
          <div class="calendar-header">
            <button type="button" class="calendar-nav-btn prev-month">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
              </svg>
            </button>
            <div class="calendar-title">
              ${thaiMonths[month]} ${buddhistYear}
            </div>
            <div style="width: 36px;"></div>
          </div>

          <div class="calendar-days-header">
            ${thaiDays.map((day) => `<div class="calendar-day-name">${day}</div>`).join('')}
          </div>

          <div class="calendar-days">
            ${renderDays(year, month)}
          </div>
        </div>

        <!-- Second Month -->
        <div class="calendar-month">
          <div class="calendar-header">
            <div style="width: 36px;"></div>
            <div class="calendar-title">
              ${thaiMonths[nextMonth]} ${nextBuddhistYear}
            </div>
            <button type="button" class="calendar-nav-btn next-month">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
              </svg>
            </button>
          </div>

          <div class="calendar-days-header">
            ${thaiDays.map((day) => `<div class="calendar-day-name">${day}</div>`).join('')}
          </div>

          <div class="calendar-days">
            ${renderDays(nextYear, nextMonth)}
          </div>
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
      currentMonth.setMonth(currentMonth.getMonth() - 1);
      renderCalendar();
    });

    dropdown.querySelector('.next-month').addEventListener('click', (e) => {
      e.stopPropagation();
      currentMonth.setMonth(currentMonth.getMonth() + 1);
      renderCalendar();
    });

    dropdown.querySelector('.clear').addEventListener('click', (e) => {
      e.stopPropagation();
      startDate = null;
      endDate = null;
      input.value = '';
      renderCalendar();
    });

    dropdown.querySelector('.apply').addEventListener('click', (e) => {
      e.stopPropagation();
      if (startDate && endDate) {
        updateInputValue();
        dropdown.style.display = 'none';
      } else if (startDate) {
        // Show message if only start date selected
        alert('กรุณาเลือกวันที่สิ้นสุด');
      } else {
        // Close if no date selected
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

        if (!startDate || (startDate && endDate)) {
          // Start new selection
          startDate = selectedDate;
          endDate = null;
          updateInputValue();
          renderCalendar();
        } else {
          // Complete selection
          if (selectedDate >= startDate) {
            endDate = selectedDate;
          } else {
            endDate = startDate;
            startDate = selectedDate;
          }
          updateInputValue();
          renderCalendar();
          // Auto close after selecting both dates
          setTimeout(() => {
            dropdown.style.display = 'none';
          }, 300);
        }
      });

      // Hover effect for range preview
      cell.addEventListener('mouseenter', function () {
        if (startDate && !endDate) {
          const dateStr = this.dataset.date;
          if (!dateStr) return;

          const [y, m, d] = dateStr.split('-').map(Number);
          const hoverDate = new Date(y, m, d);

          // Highlight range preview
          dropdown.querySelectorAll('.calendar-day').forEach((day) => {
            const dayDateStr = day.dataset.date;
            if (!dayDateStr) return;

            const [dy, dm, dd] = dayDateStr.split('-').map(Number);
            const dayDate = new Date(dy, dm, dd);

            if (
              dayDate > startDate &&
              dayDate < hoverDate &&
              hoverDate > startDate
            ) {
              day.classList.add('hover-range');
            } else if (
              dayDate < startDate &&
              dayDate > hoverDate &&
              hoverDate < startDate
            ) {
              day.classList.add('hover-range');
            } else {
              day.classList.remove('hover-range');
            }
          });
        }
      });
    });

    // Remove hover effect when leaving calendar
    dropdown.addEventListener('mouseleave', function () {
      dropdown.querySelectorAll('.hover-range').forEach((day) => {
        day.classList.remove('hover-range');
      });
    });
  }

  function updateInputValue() {
    if (startDate && endDate) {
      const start = formatDateToBuddhistEra(startDate);
      const end = formatDateToBuddhistEra(endDate);
      input.value = `${start} ถึง ${end}`;
    } else if (startDate) {
      const start = formatDateToBuddhistEra(startDate);
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
      const isStart = startDate && isSameDay(date, startDate);
      const isEnd = endDate && isSameDay(date, endDate);
      const isInRange =
        startDate && endDate && date > startDate && date < endDate;
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

  } catch (error) {
    console.error('Date picker initialization error:', error);
    // Fallback: disable date picker if error occurs
    if (input) {
      input.placeholder = 'เกิดข้อผิดพลาดในการโหลดปฏิทิน';
      input.disabled = true;
    }
  }
}

function initFormHandler() {
  const filterForm = document.getElementById('searchForm');
  if (!filterForm) return;

  // Form validation
  const validateField = (field) => {
    const formGroup = field.closest('.form-group');
    const errorMessage = formGroup.querySelector('.error-message');

    if (!field.value.trim() && field.hasAttribute('required')) {
      formGroup.classList.add('error');
      if (errorMessage) {
        errorMessage.textContent = 'กรุณากรอกข้อมูล';
      }
      return false;
    }

    // Validate number field
    if (field.type === 'number' && field.value) {
      const value = parseInt(field.value);
      if (isNaN(value) || value < 0) {
        formGroup.classList.add('error');
        if (errorMessage) {
          errorMessage.textContent = 'กรุณากรอกตัวเลขที่ถูกต้อง';
        }
        return false;
      }
    }

    formGroup.classList.remove('error');
    if (errorMessage) {
      errorMessage.textContent = '';
    }
    return true;
  };

  // Real-time validation with debounce
  const inputs = filterForm.querySelectorAll('input, select');
  inputs.forEach((input) => {
    const debouncedValidate = debounce(() => validateField(input), 500);
    input.addEventListener('input', debouncedValidate);
    input.addEventListener('blur', () => validateField(input));
  });

  // Form submission
  filterForm.addEventListener('submit', async function (e) {
    e.preventDefault();

    // Validate all fields
    let isValid = true;
    inputs.forEach((input) => {
      if (!validateField(input)) {
        isValid = false;
      }
    });

    if (!isValid) {
      // Focus first error field
      const firstError = filterForm.querySelector('.form-group.error input, .form-group.error select');
      if (firstError) {
        firstError.focus();
      }
      return;
    }

    // Show loading state
    const submitBtn = filterForm.querySelector('.btn-primary');
    const resultsTable = document.getElementById('resultsTable');
    const loadingState = document.querySelector('.loading-state');
    const emptyState = document.querySelector('.empty-state');

    if (submitBtn) {
      submitBtn.classList.add('loading');
      submitBtn.disabled = true;
    }

    // Hide only data rows, keep header visible
    if (resultsTable) {
      const existingRows = resultsTable.querySelectorAll('.table-row');
      existingRows.forEach(row => row.style.display = 'none');
      resultsTable.style.display = 'flex';
    }
    if (emptyState) emptyState.style.display = 'none';
    if (loadingState) loadingState.style.display = 'flex';

    try {
      // Get form data
      const formData = new FormData(filterForm);
      const filters = {};
      
      // Only add non-empty filters (exclude "all" and empty values)
      const wholesale = formData.get('wholesale');
      const country = formData.get('country');
      const tourCode = formData.get('tourCode');
      const imageName = formData.get('imageName');
      const usageCount = formData.get('usageCount');
      const dateRange = formData.get('dateRange');
      
      if (wholesale && wholesale !== 'all' && wholesale !== '') filters.wholesale = wholesale;
      if (country && country !== 'all' && country !== '') filters.country = country;
      if (tourCode && tourCode !== '') filters.tourCode = tourCode;
      if (imageName && imageName !== '') filters.imageName = imageName;
      if (usageCount && usageCount !== '') filters.usageCount = usageCount;
      if (dateRange && dateRange !== '') filters.dateRange = dateRange;

      console.log('Searching with filters:', filters);

      // Call API with minimum loading time for better UX
      const [response] = await Promise.all([
        ImageService.searchImages(filters, 1, CONFIG.ITEMS_PER_PAGE),
        new Promise(resolve => setTimeout(resolve, 500)) // Minimum 500ms loading
      ]);
      
      if (loadingState) loadingState.style.display = 'none';

      // Update results count immediately
      const countElement = document.querySelector('.results-header .count');
      
      if (response && response.data && response.data.length > 0) {
        // Render results
        renderResults(response.data);
        
        if (resultsTable) resultsTable.style.display = 'flex';
        
        // Update results count to show TOTAL
        if (countElement) {
          countElement.textContent = response.total || response.data.length;
        }
        
        // Reset infinite scroll with current filters and total
        if (window.resetInfiniteScroll) {
          window.resetInfiniteScroll(filters, response.total || response.data.length);
        }
        
        console.log('✅ Search results:', response.data.length);
      } else {
        if (emptyState) emptyState.style.display = 'flex';
        if (countElement) {
          countElement.textContent = '0';
        }
      }
    } catch (error) {
      console.error('Search error:', error);
      alert(error.message || 'เกิดข้อผิดพลาดในการค้นหา กรุณาลองใหม่อีกครั้ง');
      if (loadingState) loadingState.style.display = 'none';
      if (resultsTable) resultsTable.style.display = 'flex';
    } finally {
      if (submitBtn) {
        submitBtn.classList.remove('loading');
        submitBtn.disabled = false;
      }
    }
  });

  // Reset form with confirmation modal
  filterForm.addEventListener('reset', function (e) {
    e.preventDefault(); // Always prevent default
    
    const hasData = Array.from(inputs).some((input) => input.value.trim() !== '');

    if (hasData) {
      // Show modal
      showConfirmModal(() => {
        // On confirm: reset the form
        // Clear all errors
        document.querySelectorAll('.form-group.error').forEach((group) => {
          group.classList.remove('error');
        });

        // Clear date picker
        const dateInput = document.getElementById('dateRangePicker');
        if (dateInput) {
          dateInput.value = '';
        }
        
        // Reset all form fields
        inputs.forEach((input) => {
          if (input.tagName === 'SELECT') {
            input.selectedIndex = 0; // Reset to first option
          } else {
            input.value = '';
          }
        });
        
        // Reset multi-select dropdowns
        document.querySelectorAll('.multi-select-wrapper').forEach(wrapper => {
          const checkboxes = wrapper.querySelectorAll('input[type="checkbox"]');
          checkboxes.forEach(cb => {
            cb.checked = false;
            cb.closest('.multi-select-option').classList.remove('selected');
          });
          
          const trigger = wrapper.querySelector('.multi-select-trigger');
          const selectedText = trigger.querySelector('.selected-text');
          selectedText.textContent = trigger.dataset.placeholder || 'เลือก';
          trigger.classList.add('placeholder');
          
          const hiddenInput = wrapper.nextElementSibling;
          if (hiddenInput) hiddenInput.value = '';
        });
        
        console.log('✅ Form reset completed');
      });
    } else {
      // No data, just reset
      filterForm.reset();
    }
  });
}

// Confirmation Modal
function showConfirmModal(onConfirm) {
  const modal = document.getElementById('confirmModal');
  if (!modal) return;
  
  const overlay = modal.querySelector('.modal-overlay');
  const cancelBtn = document.getElementById('modalCancel');
  const confirmBtn = document.getElementById('modalConfirm');
  
  // Show modal
  modal.style.display = 'flex';
  
  // Close modal function
  const closeModal = () => {
    modal.style.display = 'none';
    // Clean up event listeners
    overlay.removeEventListener('click', handleCancel);
    cancelBtn.removeEventListener('click', handleCancel);
    confirmBtn.removeEventListener('click', handleConfirm);
    document.removeEventListener('keydown', handleEsc);
  };
  
  // Handle confirm
  const handleConfirm = (e) => {
    e.preventDefault();
    e.stopPropagation();
    closeModal();
    if (onConfirm) {
      onConfirm();
    }
  };
  
  // Handle cancel
  const handleCancel = (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    closeModal();
  };
  
  // ESC key to close
  const handleEsc = (e) => {
    if (e.key === 'Escape') {
      handleCancel(e);
    }
  };
  
  // Add event listeners
  overlay.addEventListener('click', handleCancel);
  cancelBtn.addEventListener('click', handleCancel);
  confirmBtn.addEventListener('click', handleConfirm);
  document.addEventListener('keydown', handleEsc);
}

// Initialize Show All Buttons

// Initialize Show All Buttons
function initShowAllButtons() {
  const showAllButtons = document.querySelectorAll('.show-all-btn');

  showAllButtons.forEach((button) => {
    button.addEventListener('click', function (e) {
      e.preventDefault();
      const container = this.closest('.programs-list-visible');
      const hiddenLinks = container.querySelectorAll('.hidden-link');
      const isExpanded = this.getAttribute('aria-expanded') === 'true';

      // Toggle visibility
      hiddenLinks.forEach((link) => {
        link.style.display = isExpanded ? 'none' : 'block';
      });

      // Update ARIA state
      this.setAttribute('aria-expanded', !isExpanded);

      // Update button text
      const textSpan = this.querySelector('span');
      if (textSpan) {
        textSpan.textContent = isExpanded
          ? 'แสดงโปรแกรมทัวร์ทั้งหมด'
          : 'ซ่อนโปรแกรมทัวร์';
      }
    });

    // Keyboard support
    button.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        this.click();
      }
    });
  });
}

  // Infinite Scroll
  function initInfiniteScroll() {
    const resultsTable = document.getElementById('resultsTable');
    const infiniteLoader = document.querySelector('.infinite-scroll-loader');
    const endOfResults = document.querySelector('.end-of-results');
    
    let isLoading = false;
    let hasMoreData = true;
    let currentPage = 1;
    let currentFilters = {};
    let totalLoaded = 0;

    // Intersection Observer for infinite scroll
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          console.log(`👁️ Intersection: ${entry.isIntersecting}, Loading: ${isLoading}, HasMore: ${hasMoreData}`);
          if (entry.isIntersecting && !isLoading && hasMoreData) {
            console.log('🚀 Triggering load more...');
            loadMoreResults();
          }
        });
      },
      {
        root: null,
        rootMargin: '200px',
        threshold: 0.1,
      }
    );

    // Observe the loader element
    if (infiniteLoader) {
      observer.observe(infiniteLoader);
      console.log('✅ Infinite scroll observer initialized');
    } else {
      console.error('❌ Infinite scroll loader element not found!');
    }

    async function loadMoreResults() {
      console.log(`🔍 loadMoreResults called: isLoading=${isLoading}, hasMoreData=${hasMoreData}`);
      
      if (isLoading || !hasMoreData) {
        console.log(`⛔ Blocked: isLoading=${isLoading}, hasMoreData=${hasMoreData}`);
        return;
      }

      isLoading = true;
      console.log('📦 Showing loader...');
      if (infiniteLoader) infiniteLoader.classList.add('active');

      try {
        currentPage++;
        console.log(`📄 Loading page ${currentPage} with filters:`, currentFilters);
        
        // Load next page
        const response = await ImageService.searchImages(currentFilters, currentPage, CONFIG.ITEMS_PER_PAGE);
        console.log(`📥 Response:`, response);
        
        if (response && response.data && response.data.length > 0) {
          // Append new rows
          response.data.forEach((image, index) => {
            const formattedImage = DataFormatter.formatImageData(image);
            const rowHTML = createImageRow(formattedImage, totalLoaded + index + 1);
            resultsTable.insertAdjacentHTML('beforeend', rowHTML);
          });
          
          totalLoaded += response.data.length;
          
          // Check if there's more data using hasMore from response
          if (response.hasMore === false || response.data.length < CONFIG.ITEMS_PER_PAGE) {
            hasMoreData = false;
            if (endOfResults) endOfResults.style.display = 'block';
            console.log('🏁 No more data');
          } else {
            console.log(`✅ More data available`);
          }
          
          // Re-initialize show all buttons for new rows
          initShowAllButtons();
          
          console.log(`✅ Loaded ${response.data.length} more items (Total: ${totalLoaded})`);
        } else {
          hasMoreData = false;
          if (endOfResults) endOfResults.style.display = 'block';
          console.log('🏁 No data returned');
        }
        
        if (infiniteLoader) infiniteLoader.classList.remove('active');
        isLoading = false;
      } catch (error) {
        console.error('❌ Error loading more results:', error);
        if (infiniteLoader) infiniteLoader.classList.remove('active');
        isLoading = false;
        hasMoreData = false;
      }
    }

    // Reset function for new searches
    window.resetInfiniteScroll = function (filters = {}, total = 0) {
      currentPage = 1;
      hasMoreData = total > CONFIG.ITEMS_PER_PAGE;
      isLoading = false;
      currentFilters = filters;
      totalLoaded = Math.min(CONFIG.ITEMS_PER_PAGE, total); // Already loaded first page
      if (infiniteLoader) infiniteLoader.classList.remove('active');
      if (endOfResults) {
        // Don't show end message when showing all at once
        endOfResults.style.display = 'none';
      }
      
      console.log(`🔄 Reset infinite scroll: Total=${total}, Loaded=${totalLoaded}, HasMore=${hasMoreData}`);
      
      // Re-observe if disconnected
      if (infiniteLoader && !observer.root) {
        observer.observe(infiniteLoader);
      }
    };
  }

  // Load initial data on page load
  async function loadInitialData() {
    try {
      // Load countries for dropdown
      await loadCountries();
      
      // Load initial images
      await loadImages();
    } catch (error) {
      console.error('Failed to load initial data:', error);
    }
  }

  // Load countries into dropdown
  async function loadCountries() {
    try {
      // Get unique countries from images
      const response = await ImageService.getAllImages(1, 100);
      const countryOptions = document.getElementById('countryOptions');
      
      if (response && response.data && countryOptions) {
        // Get unique countries
        const uniqueCountries = [...new Set(response.data.map(img => img.country))].sort();
        
        // Clear existing options
        countryOptions.innerHTML = '';
        
        // Add countries from data
        uniqueCountries.forEach(country => {
          const countryName = countryTranslation[country] || country;
          const optionDiv = document.createElement('div');
          optionDiv.className = 'multi-select-option';
          optionDiv.dataset.value = country;
          optionDiv.innerHTML = `
            <input type="checkbox" id="country-${country}" value="${country}">
            <label for="country-${country}">${countryName}</label>
          `;
          countryOptions.appendChild(optionDiv);
        });
        
        console.log('✅ Loaded countries:', uniqueCountries.length);
      }
    } catch (error) {
      console.error('Failed to load countries:', error);
    }
  }

  // Load images
  async function loadImages(page = 1) {
    const resultsTable = document.getElementById('resultsTable');
    const loadingState = document.querySelector('.loading-state');
    const emptyState = document.querySelector('.empty-state');
    const countElement = document.querySelector('.results-header .count');
    const tableHeader = resultsTable ? resultsTable.querySelector('.table-header') : null;
    
    try {
      // Show loading, hide results but keep header visible
      if (loadingState) loadingState.style.display = 'flex';
      if (emptyState) emptyState.style.display = 'none';
      
      // Hide only the data rows, keep header
      if (resultsTable) {
        const existingRows = resultsTable.querySelectorAll('.table-row');
        existingRows.forEach(row => row.style.display = 'none');
        resultsTable.style.display = 'flex';
      }
      
      // Load with minimum loading time for better UX
      const [response] = await Promise.all([
        ImageService.getAllImages(1, CONFIG.ITEMS_PER_PAGE),
        new Promise(resolve => setTimeout(resolve, 500)) // Minimum 500ms loading
      ]);
      
      if (loadingState) loadingState.style.display = 'none';
      
      if (response && response.data && response.data.length > 0) {
        renderResults(response.data);
        if (resultsTable) resultsTable.style.display = 'flex';
        
        // Update count to show TOTAL, not just current page
        if (countElement) {
          countElement.textContent = response.total || response.data.length;
        }
        
        // Reset infinite scroll for initial load
        if (window.resetInfiniteScroll) {
          window.resetInfiniteScroll({}, response.total || response.data.length);
        }
        
        console.log(`✅ Loaded ${response.data.length} images (Total: ${response.total})`);
      } else {
        if (emptyState) emptyState.style.display = 'flex';
        if (resultsTable) resultsTable.style.display = 'none';
        if (countElement) {
          countElement.textContent = '0';
        }
      }
    } catch (error) {
      console.error('Failed to load images:', error);
      if (loadingState) loadingState.style.display = 'none';
      if (emptyState) emptyState.style.display = 'flex';
      if (resultsTable) resultsTable.style.display = 'none';
      if (countElement) {
        countElement.textContent = '0';
      }
    }
  }

  // Render results to table
  function renderResults(images) {
    const resultsTable = document.getElementById('resultsTable');
    if (!resultsTable) return;

    // Clear existing rows (keep header)
    const existingRows = resultsTable.querySelectorAll('.table-row');
    existingRows.forEach(row => row.remove());

    // Store formatted images for modal
    window.currentImages = images.map(img => DataFormatter.formatImageData(img));

    // Render each image
    images.forEach((image, index) => {
      const formattedImage = DataFormatter.formatImageData(image);
      const rowHTML = createImageRow(formattedImage, index + 1);
      resultsTable.insertAdjacentHTML('beforeend', rowHTML);
    });

    // Re-initialize show all buttons
    initShowAllButtons();

    // Add click handlers to images
    const clickableImages = resultsTable.querySelectorAll('.clickable-image');
    clickableImages.forEach((img) => {
      img.addEventListener('click', function() {
        const imageIndex = parseInt(this.dataset.imageIndex);
        if (window.currentImages && window.currentImages[imageIndex]) {
          window.openImagePreview(window.currentImages[imageIndex], imageIndex, window.currentImages);
        }
      });
    });
  }

  // Country translation map
  const countryTranslation = {
    'Japan': 'ญี่ปุ่น',
    'Korea': 'เกาหลี',
    'China': 'จีน',
    'Taiwan': 'ไต้หวัน',
    'Vietnam': 'เวียดนาม',
    'Singapore': 'สิงคโปร์',
    'Malaysia': 'มาเลเซีย',
    'Indonesia': 'อินโดนีเซีย'
  };

  // Get image based on filename
  function getCountryImage(country, id, imageName) {
    // Extract main keyword from image name
    let mainKeyword = imageName
      .replace(/\.(jpg|jpeg|png|gif)$/i, '')
      .split(/[-_]/)[0]
      .toLowerCase()
      .trim();
    
    const keywordMap = {
      'fuji': 'mount-fuji-japan',
      'osaka': 'osaka-castle-japan',
      'tokyo': 'tokyo-tower-japan',
      'kyoto': 'kyoto-temple-japan',
      'shibuya': 'shibuya-crossing-tokyo',
      'seoul': 'seoul-tower-korea',
      'gyeongbokgung': 'gyeongbokgung-palace-korea',
      'busan': 'busan-beach-korea',
      'jeju': 'jeju-island-korea',
      'myeongdong': 'myeongdong-seoul-korea',
      'great': 'great-wall-china',
      'shanghai': 'shanghai-skyline-china',
      'forbidden': 'forbidden-city-beijing',
      'taipei': 'taipei-101-taiwan',
      'taroko': 'taroko-gorge-taiwan',
      'halong': 'halong-bay-vietnam',
      'hanoi': 'hanoi-vietnam',
      'marina': 'marina-bay-sands-singapore',
      'gardens': 'gardens-by-the-bay-singapore',
      'petronas': 'petronas-towers-malaysia',
      'penang': 'penang-street-art-malaysia',
      'bali': 'bali-rice-terraces-indonesia',
      'borobudur': 'borobudur-temple-indonesia'
    };
    
    const searchTerm = keywordMap[mainKeyword] || `${mainKeyword}-${country}`;
    const seed = searchTerm.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return `https://picsum.photos/seed/${seed}/300/200`;
  }

  // Generate recent users (Mock data)
  function generateRecentUsers(count = 5) {
    const names = [
      'สมชาย ใจดี',
      'สมหญิง รักสงบ',
      'วิชัย มั่นคง',
      'ประภา สว่างใจ',
      'อนุชา เจริญ',
      'สุดา ยิ้มแย้ม',
      'ธนา พัฒนา',
      'มานี สุขสันต์'
    ];
    
    const users = [];
    let remainingCount = 10; // Start with higher count for first user
    
    for (let i = 0; i < count; i++) {
      const usageCount = Math.max(1, remainingCount - Math.floor(Math.random() * 3));
      users.push({
        name: names[Math.floor(Math.random() * names.length)],
        count: usageCount
      });
      remainingCount = usageCount;
    }
    
    return users;
  }

  // Create image row HTML
  function createImageRow(image, index) {
    const updateDate = DataFormatter.formatDateThai(image.updatedAt);
    
    const programsHTML = image.programs.slice(0, 5).map(program => {
      const formattedProgram = DataFormatter.formatProgramData(program);
      const programUpdateDate = DataFormatter.formatDateThai(formattedProgram.updatedAt);
      return `<a href="${formattedProgram.url}" class="program-link">${formattedProgram.code} (${formattedProgram.wholesale}) update ${programUpdateDate}</a>`;
    }).join('');

    const hiddenProgramsHTML = image.programs.slice(5).map(program => {
      const formattedProgram = DataFormatter.formatProgramData(program);
      const programUpdateDate = DataFormatter.formatDateThai(formattedProgram.updatedAt);
      return `<a href="${formattedProgram.url}" class="program-link hidden-link">${formattedProgram.code} (${formattedProgram.wholesale}) update ${programUpdateDate}</a>`;
    }).join('');

    const showAllButton = image.programs.length > 5 ? `
      <button class="show-all-btn" aria-label="แสดงโปรแกรมทัวร์ทั้งหมด" aria-expanded="false">
        <span>แสดงโปรแกรมทัวร์ทั้งหมด</span>
        <svg class="chevron-icon" width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
          <path d="M2 4L6 8L10 4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </button>
    ` : '';

    // Show "No programs" message if no programs
    const programsContent = image.programs.length > 0 
      ? `${programsHTML}${hiddenProgramsHTML}${showAllButton}`
      : '<span class="no-programs">ยังไม่มีโปรแกรมทัวร์ที่ใช้รูปนี้</span>';

    return `
      <div class="table-row" role="row">
        <div class="td td-number" role="cell">${index}.</div>
        <div class="td td-image" role="cell">
          <img
            src="${getCountryImage(image.country, image.id, image.name)}"
            alt="${image.name} - ${image.country}"
            loading="lazy"
            class="clickable-image"
            data-image-index="${index - 1}"
            style="width: 100%; max-width: 300px; height: 200px; object-fit: cover; border-radius: 8px; cursor: pointer;"
          />
          <div class="image-name">${image.name}</div>
          ${updateDate ? `<div class="image-update-date">อัปเดต: ${updateDate}</div>` : ''}
        </div>
        <div class="td td-details" role="cell">
          <div class="detail-main">
            <span class="detail-label">รวมใช้ซ้ำ :</span>
            <span class="detail-value text-orange" aria-label="รวมใช้ซ้ำ ${image.usageCount} โปรแกรมทัวร์">${image.usageCount} โปรแกรมทัวร์</span>
          </div>
          <div class="detail-sub">
            <div class="detail-item">
              <span class="detail-label">Banner ลำดับที่ 1 :</span>
              <span class="detail-value">${image.bannerFirst} โปรแกรมทัวร์</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">Banner ลำดับที่ 2 ขึ้นไป :</span>
              <span class="detail-value">${image.bannerOther} โปรแกรมทัวร์</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">รายละเอียดทัวร์ :</span>
              <span class="detail-value">${image.tourDetail} โปรแกรมทัวร์</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">ประเทศ :</span>
              <span class="detail-value">${countryTranslation[image.country] || image.country}</span>
            </div>
          </div>
        </div>
        <div class="td td-programs" role="cell">
          <div class="programs-list-visible">
            ${programsContent}
          </div>
        </div>
        <div class="td td-usage" role="cell">
          <div class="usage-users">
            ${generateRecentUsers(5).map(user => `
              <div class="user-item">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                  <circle cx="12" cy="7" r="4"/>
                </svg>
                <span class="user-name">${user.name} <span class="user-count">(${user.count})</span></span>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    `;
  }

  // Sorting Functions
  function initSorting() {
    const sortBtn = document.getElementById('sortBtn');
    const sortMenu = document.getElementById('sortMenu');
    let currentSort = null;

    if (!sortBtn || !sortMenu) return;

    // Toggle sort menu
    sortBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      sortBtn.classList.toggle('open');
      sortMenu.classList.toggle('open');
    });

    // Close menu on outside click
    document.addEventListener('click', () => {
      sortBtn.classList.remove('open');
      sortMenu.classList.remove('open');
    });

    // Sort options
    sortMenu.addEventListener('click', (e) => {
      const option = e.target.closest('.sort-option');
      if (option) {
        const sortType = option.dataset.sort;
        
        // Update active state
        sortMenu.querySelectorAll('.sort-option').forEach(opt => {
          opt.classList.remove('active');
        });
        option.classList.add('active');
        
        // Apply sort
        currentSort = sortType;
        applySorting(sortType);
        
        // Close menu
        sortBtn.classList.remove('open');
        sortMenu.classList.remove('open');
      }
    });

    // Store current sort globally
    window.currentSort = () => currentSort;
  }

  // Apply Sorting
  function applySorting(sortType) {
    const images = window.currentImages;
    if (!images || images.length === 0) return;

    let sortedImages = [...images];

    switch (sortType) {
      case 'date-desc':
        sortedImages.sort((a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0));
        break;
      case 'date-asc':
        sortedImages.sort((a, b) => new Date(a.updatedAt || 0) - new Date(b.updatedAt || 0));
        break;
      case 'usage-desc':
        sortedImages.sort((a, b) => (b.usageCount || 0) - (a.usageCount || 0));
        break;
      case 'usage-asc':
        sortedImages.sort((a, b) => (a.usageCount || 0) - (b.usageCount || 0));
        break;
    }

    // Update global images
    window.currentImages = sortedImages;

    // Re-render results
    renderResults(sortedImages);

    console.log(`✅ Sorted by: ${sortType}`);
  }

  // Export Functions
  function initExportImport() {
    const exportBtn = document.getElementById('exportBtn');
    const exportMenu = document.getElementById('exportMenu');

    if (!exportBtn || !exportMenu) return;

    // Toggle export menu
    exportBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      exportBtn.classList.toggle('open');
      exportMenu.classList.toggle('open');
    });

    // Close menu on outside click
    document.addEventListener('click', () => {
      exportBtn.classList.remove('open');
      exportMenu.classList.remove('open');
    });

    // Export options
    exportMenu.addEventListener('click', (e) => {
      const option = e.target.closest('.export-option');
      if (option) {
        const format = option.dataset.format;
        handleExport(format);
        exportBtn.classList.remove('open');
        exportMenu.classList.remove('open');
      }
    });
  }

  // Handle Export
  async function handleExport(format) {
    try {
      // Get current images data
      const images = window.currentImages || [];
      
      if (images.length === 0) {
        alert('ไม่มีข้อมูลให้ Export');
        return;
      }

      console.log(`Exporting ${images.length} images as ${format}...`);

      switch (format) {
        case 'csv':
          exportToCSV(images);
          break;
        case 'excel':
          exportToExcel(images);
          break;
        case 'pdf':
          exportToPDF(images);
          break;
      }
    } catch (error) {
      console.error('Export error:', error);
      alert('เกิดข้อผิดพลาดในการ Export');
    }
  }

  // Export to CSV
  function exportToCSV(images) {
    const headers = ['ลำดับ', 'ชื่อรูป', 'ประเทศ', 'Wholesale', 'รหัสทัวร์', 'จำนวนใช้ซ้ำ', 'วันที่อัปเดต', 'ใช้ล่าสุด', 'จำนวนโปรแกรม', 'โปรแกรมทัวร์'];
    
    const rows = images.map((img, index) => {
      const programs = img.programs.map(p => p.program_code || p.code).join('; ');
      const lastUsed = DataFormatter.formatDateThai(img.updatedAt) || '-';
      return [
        index + 1,
        img.name,
        countryTranslation[img.country] || img.country,
        img.wholesale || '-',
        img.tourCode || '-',
        img.usageCount,
        DataFormatter.formatDateThai(img.updatedAt) || '-',
        lastUsed,
        img.programs.length,
        programs || '-'
      ];
    });

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    // Add BOM for Excel UTF-8 support
    const BOM = '\uFEFF';
    const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `tour-images-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    
    console.log('✅ CSV exported successfully');
  }

  // Export to Excel (using SheetJS library)
  function exportToExcel(images) {
    // Simple Excel export without external library
    // For full Excel support, you would need SheetJS (xlsx.js)
    
    const headers = ['ลำดับ', 'ชื่อรูป', 'ประเทศ', 'Wholesale', 'รหัสทัวร์', 'จำนวนใช้ซ้ำ', 'วันที่อัปเดต', 'ใช้ล่าสุด', 'จำนวนโปรแกรม', 'โปรแกรมทัวร์'];
    
    let html = '<table><thead><tr>';
    headers.forEach(h => html += `<th>${h}</th>`);
    html += '</tr></thead><tbody>';
    
    images.forEach((img, index) => {
      const programs = img.programs.map(p => p.program_code || p.code).join(', ');
      const lastUsed = DataFormatter.formatDateThai(img.updatedAt) || '-';
      html += '<tr>';
      html += `<td>${index + 1}</td>`;
      html += `<td>${img.name}</td>`;
      html += `<td>${countryTranslation[img.country] || img.country}</td>`;
      html += `<td>${img.wholesale || '-'}</td>`;
      html += `<td>${img.tourCode || '-'}</td>`;
      html += `<td>${img.usageCount}</td>`;
      html += `<td>${DataFormatter.formatDateThai(img.updatedAt) || '-'}</td>`;
      html += `<td>${lastUsed}</td>`;
      html += `<td>${img.programs.length}</td>`;
      html += `<td>${programs || '-'}</td>`;
      html += '</tr>';
    });
    
    html += '</tbody></table>';
    
    const blob = new Blob([html], { type: 'application/vnd.ms-excel' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `tour-images-${new Date().toISOString().split('T')[0]}.xls`;
    link.click();
    
    console.log('✅ Excel exported successfully');
  }

  // Export to PDF
  function exportToPDF(images) {
    // Create printable HTML
    const printWindow = window.open('', '_blank');
    
    let html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Tour Images Report</title>
        <style>
          body { font-family: 'Kanit', sans-serif; padding: 20px; }
          h1 { color: #4a7ba7; text-align: center; }
          .meta { text-align: center; color: #666; margin-bottom: 30px; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; font-size: 12px; }
          th { background-color: #4a7ba7; color: white; font-weight: bold; }
          tr:nth-child(even) { background-color: #f9fafb; }
          .footer { margin-top: 30px; text-align: center; color: #999; font-size: 11px; }
          @media print {
            body { padding: 10px; }
            .no-print { display: none; }
          }
        </style>
      </head>
      <body>
        <h1>รายงานรูปภาพทัวร์</h1>
        <div class="meta">
          <p>วันที่: ${new Date().toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
          <p>จำนวนรูปภาพทั้งหมด: ${images.length} รูป</p>
        </div>
        <table>
          <thead>
            <tr>
              <th>ลำดับ</th>
              <th>ชื่อรูป</th>
              <th>ประเทศ</th>
              <th>Wholesale</th>
              <th>รหัสทัวร์</th>
              <th>จำนวนใช้ซ้ำ</th>
              <th>วันที่อัปเดต</th>
              <th>ใช้ล่าสุด</th>
              <th>จำนวนโปรแกรม</th>
            </tr>
          </thead>
          <tbody>
    `;
    
    images.forEach((img, index) => {
      const lastUsed = DataFormatter.formatDateThai(img.updatedAt) || '-';
      html += `
        <tr>
          <td>${index + 1}</td>
          <td>${img.name}</td>
          <td>${countryTranslation[img.country] || img.country}</td>
          <td>${img.wholesale || '-'}</td>
          <td>${img.tourCode || '-'}</td>
          <td>${img.usageCount}</td>
          <td>${DataFormatter.formatDateThai(img.updatedAt) || '-'}</td>
          <td>${lastUsed}</td>
          <td>${img.programs.length}</td>
        </tr>
      `;
    });
    
    html += `
          </tbody>
        </table>
        <div class="footer">
          <p>สร้างโดย Tour Image Manager - Tourwow</p>
        </div>
        <div class="no-print" style="margin-top: 20px; text-align: center;">
          <button onclick="window.print()" style="padding: 10px 20px; background: #4a7ba7; color: white; border: none; border-radius: 4px; cursor: pointer;">พิมพ์ / บันทึกเป็น PDF</button>
          <button onclick="window.close()" style="padding: 10px 20px; background: #666; color: white; border: none; border-radius: 4px; cursor: pointer; margin-left: 10px;">ปิด</button>
        </div>
      </body>
      </html>
    `;
    
    printWindow.document.write(html);
    printWindow.document.close();
    
    console.log('✅ PDF report opened');
  }

  // Image Preview Modal
  function initImagePreviewModal() {
    const modal = document.getElementById('imagePreviewModal');
    if (!modal) return;

    const overlay = modal.querySelector('.image-modal-overlay');
    const closeBtn = document.getElementById('imageModalClose');
    const modalImage = document.getElementById('imageModalImage');
    const zoomInBtn = document.getElementById('zoomIn');
    const zoomOutBtn = document.getElementById('zoomOut');
    const zoomResetBtn = document.getElementById('zoomReset');
    const zoomLevelSpan = document.getElementById('zoomLevel');
    const prevBtn = document.getElementById('imagePrev');
    const nextBtn = document.getElementById('imageNext');
    const downloadBtn = document.getElementById('downloadImage');
    const copyUrlBtn = document.getElementById('copyImageUrl');

    let currentZoom = 1;
    let currentImageIndex = 0;
    let allImages = [];
    let isDragging = false;
    let startX, startY, translateX = 0, translateY = 0;

    // Close modal
    const closeModal = () => {
      modal.style.display = 'none';
      currentZoom = 1;
      translateX = 0;
      translateY = 0;
      updateImageTransform();
      document.body.style.overflow = '';
    };

    // Open modal
    window.openImagePreview = (imageData, imageIndex, imagesArray) => {
      currentImageIndex = imageIndex;
      allImages = imagesArray;
      
      // Get image URL
      const imageUrl = getCountryImage(imageData.country, imageData.id, imageData.name);
      
      // Update image
      modalImage.src = imageUrl;
      modalImage.alt = imageData.name;
      
      console.log('Opening image preview:', {
        name: imageData.name,
        url: imageUrl,
        country: imageData.country
      });
      
      // Update info
      document.getElementById('imageModalTitle').textContent = imageData.name;
      document.getElementById('infoImageName').textContent = imageData.name;
      document.getElementById('infoCountry').textContent = countryTranslation[imageData.country] || imageData.country;
      document.getElementById('infoWholesale').textContent = imageData.wholesale || '-';
      document.getElementById('infoTourCode').textContent = imageData.tourCode || '-';
      document.getElementById('infoUsageCount').textContent = `${imageData.usageCount} โปรแกรมทัวร์`;
      document.getElementById('infoLastUpdated').textContent = DataFormatter.formatDateThai(imageData.updatedAt) || '-';
      
      // Update programs
      const programsContainer = document.getElementById('infoPrograms');
      if (imageData.programs && imageData.programs.length > 0) {
        programsContainer.innerHTML = imageData.programs.map(program => {
          const formattedProgram = DataFormatter.formatProgramData(program);
          return `<a href="${formattedProgram.url}" class="info-program-link" target="_blank">${formattedProgram.code} - ${formattedProgram.name}</a>`;
        }).join('');
      } else {
        programsContainer.innerHTML = '<p class="text-muted">ยังไม่มีโปรแกรมทัวร์ที่ใช้รูปนี้</p>';
      }
      

      
      // Update download link
      downloadBtn.href = imageUrl;
      downloadBtn.download = imageData.name;
      
      // Update navigation buttons
      prevBtn.disabled = currentImageIndex === 0;
      nextBtn.disabled = currentImageIndex === allImages.length - 1;
      
      // Show modal
      modal.style.display = 'flex';
      document.body.style.overflow = 'hidden';
      
      // Reset zoom
      currentZoom = 1;
      translateX = 0;
      translateY = 0;
      updateImageTransform();
    };

    // Update image transform
    const updateImageTransform = () => {
      modalImage.style.transform = `scale(${currentZoom}) translate(${translateX}px, ${translateY}px)`;
      zoomLevelSpan.textContent = `${Math.round(currentZoom * 100)}%`;
    };

    // Zoom in
    zoomInBtn.addEventListener('click', () => {
      if (currentZoom < 3) {
        currentZoom += 0.25;
        updateImageTransform();
      }
    });

    // Zoom out
    zoomOutBtn.addEventListener('click', () => {
      if (currentZoom > 0.5) {
        currentZoom -= 0.25;
        updateImageTransform();
      }
    });

    // Reset zoom
    zoomResetBtn.addEventListener('click', () => {
      currentZoom = 1;
      translateX = 0;
      translateY = 0;
      updateImageTransform();
    });

    // Mouse wheel zoom
    modalImage.addEventListener('wheel', (e) => {
      e.preventDefault();
      if (e.deltaY < 0) {
        // Zoom in
        if (currentZoom < 3) {
          currentZoom += 0.1;
          updateImageTransform();
        }
      } else {
        // Zoom out
        if (currentZoom > 0.5) {
          currentZoom -= 0.1;
          updateImageTransform();
        }
      }
    });

    // Drag to pan
    modalImage.addEventListener('mousedown', (e) => {
      if (currentZoom > 1) {
        isDragging = true;
        startX = e.clientX - translateX;
        startY = e.clientY - translateY;
        modalImage.style.cursor = 'grabbing';
      }
    });

    document.addEventListener('mousemove', (e) => {
      if (isDragging) {
        translateX = e.clientX - startX;
        translateY = e.clientY - startY;
        updateImageTransform();
      }
    });

    document.addEventListener('mouseup', () => {
      isDragging = false;
      modalImage.style.cursor = 'grab';
    });

    // Navigation
    prevBtn.addEventListener('click', () => {
      if (currentImageIndex > 0) {
        currentImageIndex--;
        window.openImagePreview(allImages[currentImageIndex], currentImageIndex, allImages);
      }
    });

    nextBtn.addEventListener('click', () => {
      if (currentImageIndex < allImages.length - 1) {
        currentImageIndex++;
        window.openImagePreview(allImages[currentImageIndex], currentImageIndex, allImages);
      }
    });

    // Copy URL
    copyUrlBtn.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(modalImage.src);
        copyUrlBtn.innerHTML = `
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M20 6L9 17l-5-5"/>
          </svg>
          คัดลอกแล้ว!
        `;
        setTimeout(() => {
          copyUrlBtn.innerHTML = `
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
            </svg>
            คัดลอก URL
          `;
        }, 2000);
      } catch (err) {
        console.error('Failed to copy:', err);
      }
    });

    // Close handlers
    closeBtn.addEventListener('click', closeModal);
    overlay.addEventListener('click', closeModal);

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      if (modal.style.display === 'flex') {
        switch(e.key) {
          case 'Escape':
            closeModal();
            break;
          case 'ArrowLeft':
            if (!prevBtn.disabled) prevBtn.click();
            break;
          case 'ArrowRight':
            if (!nextBtn.disabled) nextBtn.click();
            break;
          case '+':
          case '=':
            zoomInBtn.click();
            break;
          case '-':
            zoomOutBtn.click();
            break;
          case '0':
            zoomResetBtn.click();
            break;
        }
      }
    });
  }

})();
