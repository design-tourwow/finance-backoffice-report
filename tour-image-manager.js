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
    initSidebarToggle();
    initDateRangePicker();
    initMultiSelect();
    initFormHandler();
    initShowAllButtons();
    initAccessibility();
    initInfiniteScroll();
    initImagePreviewModal();
    initExportImport();
    initSorting();
    initImageNameAutocomplete();
    initTourCodeAutocomplete();
    checkTokenAndLoadData();
  });

  // Mobile Menu
  function initMobileMenu() {
    // Sidebar mobile menu
    const menuToggle = document.querySelector('.mobile-menu-toggle');
    const sidebar = document.querySelector('.sidebar');
    const appWrapper = document.querySelector('.app-wrapper');

    if (menuToggle && sidebar) {
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

    // Dropdown menu functionality
    const dropdownToggles = document.querySelectorAll('.navbar-dropdown-toggle');
    dropdownToggles.forEach(toggle => {
      toggle.addEventListener('click', function (e) {
        e.stopPropagation();
        const dropdownId = this.getAttribute('data-dropdown');
        const dropdown = document.getElementById(dropdownId);
        
        if (dropdown) {
          const isOpen = dropdown.classList.toggle('open');
          this.setAttribute('aria-expanded', isOpen);
          
          // Close other dropdowns
          document.querySelectorAll('.navbar-dropdown').forEach(dd => {
            if (dd !== dropdown) {
              dd.classList.remove('open');
            }
          });
        }
      });
    });

    // Close dropdowns when clicking outside
    document.addEventListener('click', function (e) {
      if (!e.target.closest('.navbar-item')) {
        document.querySelectorAll('.navbar-dropdown').forEach(dropdown => {
          dropdown.classList.remove('open');
        });
        dropdownToggles.forEach(toggle => {
          toggle.setAttribute('aria-expanded', 'false');
        });
      }
    });
  }

  // Sidebar Toggle (Desktop)
  function initSidebarToggle() {
    const toggleBtn = document.getElementById('sidebarToggle');
    const appWrapper = document.querySelector('.app-wrapper');
    const STORAGE_KEY = 'sidebar-collapsed';

    if (!toggleBtn || !appWrapper) return;

    // Remove init class and apply proper class
    document.documentElement.classList.remove('sidebar-collapsed-init');
    
    // Load saved state from localStorage
    const savedState = localStorage.getItem(STORAGE_KEY);
    if (savedState === 'true') {
      appWrapper.classList.add('sidebar-collapsed');
    }

    // Toggle sidebar
    toggleBtn.addEventListener('click', function () {
      const isCollapsed = appWrapper.classList.toggle('sidebar-collapsed');
      
      // Save state to localStorage
      localStorage.setItem(STORAGE_KEY, isCollapsed);
      
      // Update aria-label
      toggleBtn.setAttribute('aria-label', isCollapsed ? 'แสดงเมนู' : 'ซ่อนเมนู');
      toggleBtn.setAttribute('title', isCollapsed ? 'แสดงเมนู' : 'ซ่อนเมนู');
      
      console.log(`Sidebar ${isCollapsed ? 'collapsed' : 'expanded'}`);
    });

    // Keyboard shortcut: Ctrl/Cmd + B
    document.addEventListener('keydown', function (e) {
      if ((e.ctrlKey || e.metaKey) && e.key === 'b') {
        e.preventDefault();
        toggleBtn.click();
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
          const fullText = labels.join(', ');
          selectedText.textContent = fullText;
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

// Date picker instance
let dateRangePickerInstance = null;

function initDateRangePicker() {
  dateRangePickerInstance = DatePickerComponent.initDateRangePicker({
    inputId: 'dateRangePicker',
    dropdownId: 'calendarDropdown',
    wrapperId: 'customDatePicker',
    onChange: (startDate, endDate) => {
      console.log('Date range changed:', startDate, endDate);
    }
  });
}

function initFormHandler() {
  const filterForm = document.getElementById('searchForm');
  if (!filterForm) return;

  // Convert date from DD/MM/YYYY to YYYY-MM-DD
  function convertDateToAPIFormat(dateStr) {
    if (!dateStr) return '';
    const parts = dateStr.trim().split('/');
    if (parts.length === 3) {
      const [day, month, year] = parts;
      // Convert Buddhist year to Christian year if needed
      const christianYear = parseInt(year) > 2500 ? parseInt(year) - 543 : parseInt(year);
      return `${christianYear}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }
    return dateStr;
  }

  // Form validation
  const validateField = (field) => {
    const formGroup = field.closest('.form-group');
    if (!formGroup) return true; // Skip if not in form-group
    
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

    // Check token before action
    if (typeof TokenUtils !== 'undefined' && TokenUtils.isTokenExpired()) {
      console.error('❌ Token expired - redirecting to login');
      TokenUtils.redirectToLogin('Token หมดอายุ กรุณาเข้าสู่ระบบใหม่');
      return;
    }

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
      
      // Get date range from picker instance
      let dateRange = '';
      if (dateRangePickerInstance) {
        const startDate = dateRangePickerInstance.getStartDate();
        const endDate = dateRangePickerInstance.getEndDate();
        if (startDate && endDate) {
          // Format to DD/MM/YYYY for display
          const formatDate = (date) => {
            const day = String(date.getDate()).padStart(2, '0');
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const year = date.getFullYear() + 543;
            return `${day}/${month}/${year}`;
          };
          dateRange = `${formatDate(startDate)} ถึง ${formatDate(endDate)}`;
        }
      }
      
      // Map to API parameters
      if (wholesale && wholesale !== 'all' && wholesale !== '') {
        const ids = wholesale.split(',').map(id => parseInt(id));
        if (ids.length > 0) filters.supplier_id = ids[0]; // API accepts single ID
      }
      if (country && country !== 'all' && country !== '') {
        const ids = country.split(',').map(id => parseInt(id));
        if (ids.length > 0) filters.country_id = ids[0]; // API accepts single ID
      }
      // Note: tourCode and imageName will be filtered client-side for partial match
      // if (tourCode && tourCode !== '') filters.product_tour_code = tourCode.trim();
      // if (imageName && imageName !== '') filters.name = imageName.trim();
      if (usageCount && usageCount !== '') filters.min_file_count = parseInt(usageCount);
      if (dateRange && dateRange !== '') {
        // Parse date range (format: "DD/MM/YYYY ถึง DD/MM/YYYY")
        const dates = dateRange.split(' ถึง ');
        if (dates.length === 2) {
          const minDate = convertDateToAPIFormat(dates[0]);
          const maxDate = convertDateToAPIFormat(dates[1]);
          filters.last_file_created_at_between = {
            min_date: minDate,
            max_date: maxDate
          };
          console.log('Date filter:', { min_date: minDate, max_date: maxDate });
        }
      }

      console.log('Searching with filters:', filters);

      // Call API with minimum loading time for better UX
      const [response] = await Promise.all([
        TourImageAPI.getPreProductFileReports(filters),
        new Promise(resolve => setTimeout(resolve, 500)) // Minimum 500ms loading
      ]);
      
      if (loadingState) loadingState.style.display = 'none';

      // Update results count immediately
      const countElement = document.querySelector('.results-header .count');
      
      if (response && response.status === 'success' && response.data && response.data.length > 0) {
        let filteredData = [...response.data];
        
        // Client-side filter by image name (partial match)
        if (imageName && imageName !== '') {
          const searchName = imageName.trim().toLowerCase();
          filteredData = filteredData.filter(item => {
            const itemName = (item.name || '').toLowerCase();
            return itemName.includes(searchName);
          });
          console.log(`🔍 Filtered by name contains "${imageName}": ${filteredData.length} results`);
        }
        
        // Client-side filter by tour code (partial match)
        if (tourCode && tourCode !== '') {
          const searchCode = tourCode.trim().toLowerCase();
          filteredData = filteredData.filter(item => {
            // Check if any pre_product_file has matching tour code
            if (item.pre_product_files && Array.isArray(item.pre_product_files)) {
              return item.pre_product_files.some(file => {
                const code = (file.pre_product?.product_tour_code || '').toLowerCase();
                return code.includes(searchCode);
              });
            }
            return false;
          });
          console.log(`🔍 Filtered by tour code contains "${tourCode}": ${filteredData.length} results`);
        }
        
        // Client-side filter by file_count if min_file_count is specified
        if (usageCount && usageCount !== '') {
          const minCount = parseInt(usageCount);
          filteredData = filteredData.filter(item => {
            const fileCount = item.file_count || 0;
            return fileCount === minCount;
          });
          console.log(`🔍 Filtered by file_count = ${minCount}: ${filteredData.length} results`);
        }
        
        // Apply default sorting (date-desc) to results
        const sortedData = filteredData.sort((a, b) => {
          const dateA = a.last_file_created_at ? new Date(a.last_file_created_at) : new Date(0);
          const dateB = b.last_file_created_at ? new Date(b.last_file_created_at) : new Date(0);
          return dateB - dateA;
        });
        
        // Check if we have results after filtering
        if (sortedData.length === 0) {
          if (emptyState) emptyState.style.display = 'flex';
          if (countElement) countElement.textContent = '0';
          console.log('❌ No results after filtering');
        } else {
          // Render results
          renderResults(sortedData);
          
          if (resultsTable) resultsTable.style.display = 'flex';
          if (emptyState) emptyState.style.display = 'none';
          
          // Update results count
          if (countElement) {
            countElement.textContent = sortedData.length;
          }
          
          // Reset infinite scroll with current filters and total
          if (window.resetInfiniteScroll) {
            window.resetInfiniteScroll(filters, sortedData.length);
          }
          
          console.log('✅ Search results:', sortedData.length);
        }
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

  // Reset form without confirmation
  filterForm.addEventListener('reset', function (e) {
    e.preventDefault();
    
    // Clear all errors
    document.querySelectorAll('.form-group.error').forEach((group) => {
      group.classList.remove('error');
    });

    // Clear date picker
    if (dateRangePickerInstance) {
      dateRangePickerInstance.clear();
    }
    
    // Reset all form fields
    inputs.forEach((input) => {
      if (input.tagName === 'SELECT') {
        input.selectedIndex = 0;
      } else {
        input.value = '';
      }
    });
    
    // Reset multi-select dropdowns
    document.querySelectorAll('.multi-select-wrapper').forEach(wrapper => {
      const checkboxes = wrapper.querySelectorAll('input[type="checkbox"]');
      checkboxes.forEach(cb => {
        cb.checked = false;
        cb.closest('.multi-select-option')?.classList.remove('selected');
      });
      
      const trigger = wrapper.querySelector('.multi-select-trigger');
      const selectedText = trigger?.querySelector('.selected-text');
      if (selectedText && trigger) {
        selectedText.textContent = trigger.dataset.placeholder || 'เลือก';
        trigger.classList.add('placeholder');
      }
      
      const hiddenInput = wrapper.nextElementSibling;
      if (hiddenInput) hiddenInput.value = '';
    });
    
    // Close autocomplete dropdown
    const autocompleteDropdown = document.getElementById('imageNameAutocomplete');
    if (autocompleteDropdown) autocompleteDropdown.style.display = 'none';
    
    console.log('✅ Form reset completed');
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

      // Check token before loading more
      if (typeof TokenUtils !== 'undefined' && TokenUtils.isTokenExpired()) {
        console.error('❌ Token expired - redirecting to login');
        TokenUtils.redirectToLogin('Token หมดอายุ กรุณาเข้าสู่ระบบใหม่');
        return;
      }

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
        const response = await TourImageAPI.getPreProductFileReports(currentFilters);
        console.log(`📥 Response:`, response);
        
        if (response && response.status === 'success' && response.data && response.data.length > 0) {
          // Append new rows
          response.data.forEach((image, index) => {
            const rowHTML = createImageRow(image, totalLoaded + index + 1);
            resultsTable.insertAdjacentHTML('beforeend', rowHTML);
          });
          
          totalLoaded += response.data.length;
          
          // Re-initialize show all buttons for new rows
          initShowAllButtons();
          
          // API returns all data at once, so no more data after first load
          hasMoreData = false;
          if (endOfResults) endOfResults.style.display = 'block';
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
      hasMoreData = false; // API returns all data at once
      isLoading = false;
      currentFilters = filters;
      totalLoaded = total;
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

  // Highlight matching text in autocomplete suggestions
  function highlightMatch(text, query) {
    if (!query) return text;
    
    // Escape special regex characters
    const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(${escapedQuery})`, 'gi');
    
    return text.replace(regex, '<mark class="autocomplete-highlight">$1</mark>');
  }

  // Image Name Autocomplete
  function initImageNameAutocomplete() {
    const input = document.getElementById('imageName');
    const dropdown = document.getElementById('imageNameAutocomplete');
    const wrapper = input?.closest('.autocomplete-wrapper');
    const spinner = wrapper?.querySelector('.autocomplete-spinner');
    
    if (!input || !dropdown || !spinner) return;

    let currentRequest = null;
    let selectedIndex = -1;

    // Debounced search function
    const searchImages = debounce(async (query) => {
      if (query.length < 3) {
        dropdown.style.display = 'none';
        spinner.style.display = 'none';
        return;
      }

      // Show spinner
      spinner.style.display = 'block';
      dropdown.style.display = 'none';

      try {
        // Cancel previous request if exists
        if (currentRequest) {
          currentRequest = null;
        }

        // Wait 1 second before making request
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Call API with name filter
        const response = await TourImageAPI.getPreProductFileReports({ name: query });

        // Hide spinner
        spinner.style.display = 'none';

        if (response && response.status === 'success' && response.data && response.data.length > 0) {
          // Get unique names and sort
          const names = [...new Set(response.data.map(item => item.name))].sort((a, b) => {
            return a.localeCompare(b, ['en', 'th']);
          });

          // Show dropdown with results (with highlighted query)
          dropdown.innerHTML = names.map(name => 
            `<div class="autocomplete-item" data-value="${name}">${highlightMatch(name, query)}</div>`
          ).join('');
          
          dropdown.style.display = 'block';
          selectedIndex = -1;

          // Add click handlers
          dropdown.querySelectorAll('.autocomplete-item').forEach((item, index) => {
            item.addEventListener('click', () => {
              input.value = item.dataset.value;
              dropdown.style.display = 'none';
              selectedIndex = -1;
            });
          });
        } else {
          dropdown.innerHTML = '<div class="autocomplete-no-results">ไม่พบผลลัพธ์</div>';
          dropdown.style.display = 'block';
        }
      } catch (error) {
        console.error('Autocomplete error:', error);
        spinner.style.display = 'none';
        dropdown.style.display = 'none';
      }
    }, 300);

    // Input event
    input.addEventListener('input', (e) => {
      searchImages(e.target.value.trim());
    });

    // Keyboard navigation
    input.addEventListener('keydown', (e) => {
      const items = dropdown.querySelectorAll('.autocomplete-item');
      
      if (dropdown.style.display === 'none' || items.length === 0) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        selectedIndex = Math.min(selectedIndex + 1, items.length - 1);
        updateSelection(items);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        selectedIndex = Math.max(selectedIndex - 1, -1);
        updateSelection(items);
      } else if (e.key === 'Enter' && selectedIndex >= 0) {
        e.preventDefault();
        items[selectedIndex].click();
      } else if (e.key === 'Escape') {
        dropdown.style.display = 'none';
        selectedIndex = -1;
      }
    });

    // Update selection highlight
    function updateSelection(items) {
      items.forEach((item, index) => {
        if (index === selectedIndex) {
          item.classList.add('active');
          item.scrollIntoView({ block: 'nearest' });
        } else {
          item.classList.remove('active');
        }
      });
    }

    // Close dropdown when clicking outside
    document.addEventListener('click', (e) => {
      if (!input.contains(e.target) && !dropdown.contains(e.target)) {
        dropdown.style.display = 'none';
        selectedIndex = -1;
      }
    });

    // Focus event
    input.addEventListener('focus', () => {
      if (input.value.length >= 3 && dropdown.innerHTML) {
        dropdown.style.display = 'block';
      }
    });
  }

  // Tour Code Autocomplete
  function initTourCodeAutocomplete() {
    const input = document.getElementById('tourCode');
    const dropdown = document.getElementById('tourCodeAutocomplete');
    const wrapper = input?.closest('.autocomplete-wrapper');
    const spinner = wrapper?.querySelector('.autocomplete-spinner');
    
    if (!input || !dropdown || !spinner) return;

    let currentRequest = null;
    let selectedIndex = -1;

    // Debounced search function
    const searchTourCodes = debounce(async (query) => {
      if (query.length < 3) {
        dropdown.style.display = 'none';
        spinner.style.display = 'none';
        return;
      }

      // Show spinner
      spinner.style.display = 'block';
      dropdown.style.display = 'none';

      try {
        // Cancel previous request if exists
        if (currentRequest) {
          currentRequest = null;
        }

        // Wait 1 second before making request
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Call API without filter to get all data, then filter client-side
        const response = await TourImageAPI.getPreProductFileReports({});
        
        console.log('🔍 Tour Code Autocomplete - Query:', query);
        console.log('📦 API Response:', response);

        // Hide spinner
        spinner.style.display = 'none';

        if (response && response.status === 'success' && response.data && response.data.length > 0) {
          console.log('✅ Found', response.data.length, 'total items');
          
          // Extract unique tour codes from pre_product_files and filter by query
          const tourCodes = new Set();
          response.data.forEach(item => {
            if (item.pre_product_files && Array.isArray(item.pre_product_files)) {
              item.pre_product_files.forEach(file => {
                const tourCode = file.pre_product?.product_tour_code;
                // Filter by query (case-insensitive)
                if (tourCode && tourCode.toLowerCase().includes(query.toLowerCase())) {
                  tourCodes.add(tourCode);
                  console.log('  ➕ Added tour code:', tourCode);
                }
              });
            }
          });
          
          console.log('📋 Filtered tour codes:', [...tourCodes]);

          // Convert to array and sort
          const sortedCodes = [...tourCodes].sort((a, b) => {
            return a.localeCompare(b, ['en', 'th']);
          });

          if (sortedCodes.length > 0) {
            // Show dropdown with results (with highlighted query)
            dropdown.innerHTML = sortedCodes.map(code => 
              `<div class="autocomplete-item" data-value="${code}">${highlightMatch(code, query)}</div>`
            ).join('');
            
            dropdown.style.display = 'block';
            selectedIndex = -1;

            // Add click handlers
            dropdown.querySelectorAll('.autocomplete-item').forEach((item, index) => {
              item.addEventListener('click', () => {
                input.value = item.dataset.value;
                dropdown.style.display = 'none';
                selectedIndex = -1;
              });
            });
          } else {
            dropdown.innerHTML = '<div class="autocomplete-no-results">ไม่พบผลลัพธ์</div>';
            dropdown.style.display = 'block';
          }
        } else {
          dropdown.innerHTML = '<div class="autocomplete-no-results">ไม่พบผลลัพธ์</div>';
          dropdown.style.display = 'block';
        }
      } catch (error) {
        console.error('Tour code autocomplete error:', error);
        spinner.style.display = 'none';
        dropdown.style.display = 'none';
      }
    }, 300);

    // Input event
    input.addEventListener('input', (e) => {
      searchTourCodes(e.target.value.trim());
    });

    // Keyboard navigation
    input.addEventListener('keydown', (e) => {
      const items = dropdown.querySelectorAll('.autocomplete-item');
      
      if (dropdown.style.display === 'none' || items.length === 0) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        selectedIndex = Math.min(selectedIndex + 1, items.length - 1);
        updateSelection(items);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        selectedIndex = Math.max(selectedIndex - 1, -1);
        updateSelection(items);
      } else if (e.key === 'Enter' && selectedIndex >= 0) {
        e.preventDefault();
        items[selectedIndex].click();
      } else if (e.key === 'Escape') {
        dropdown.style.display = 'none';
        selectedIndex = -1;
      }
    });

    // Update selection highlight
    function updateSelection(items) {
      items.forEach((item, index) => {
        if (index === selectedIndex) {
          item.classList.add('active');
          item.scrollIntoView({ block: 'nearest' });
        } else {
          item.classList.remove('active');
        }
      });
    }

    // Close dropdown when clicking outside
    document.addEventListener('click', (e) => {
      if (!input.contains(e.target) && !dropdown.contains(e.target)) {
        dropdown.style.display = 'none';
        selectedIndex = -1;
      }
    });

    // Focus event
    input.addEventListener('focus', () => {
      if (input.value.length >= 3 && dropdown.innerHTML) {
        dropdown.style.display = 'block';
      }
    });
  }

  // Check token and load data
  async function checkTokenAndLoadData() {
    console.log('🔐 Checking authentication...');

    // Check if token exists in localStorage
    if (!TourImageAPI.hasToken()) {
      console.error('❌ No token found - redirecting to login');
      redirectToLogin();
      return;
    }

    // Check if token is expired using TokenUtils
    if (typeof TokenUtils !== 'undefined' && TokenUtils.isTokenExpired()) {
      console.error('❌ Token expired - redirecting to login');
      redirectToLogin();
      return;
    }

    console.log('✅ Token found and valid - loading data...');

    // Token exists, validate by trying to load data
    try {
      await loadInitialData();
    } catch (error) {
      console.error('❌ Token validation failed:', error);
      // Token is invalid, redirect to login
      redirectToLogin();
    }
  }

  // Check token before any action (call this before load data, search, etc.)
  function checkTokenBeforeAction() {
    if (typeof TokenUtils !== 'undefined') {
      if (TokenUtils.isTokenExpired()) {
        console.error('❌ Token expired before action - redirecting to login');
        redirectToLogin();
        return false;
      }
    }
    return true;
  }

  // Redirect to login page
  function redirectToLogin() {
    // Use TokenUtils if available
    if (typeof TokenUtils !== 'undefined') {
      TokenUtils.redirectToLogin('ไม่พบ Token หรือ Token หมดอายุ\nกรุณาเข้าสู่ระบบใหม่อีกครั้ง');
      return;
    }

    // Fallback to manual redirect
    const hostname = window.location.hostname;
    let loginUrl = 'https://financebackoffice.tourwow.com/login';

    if (hostname.includes('staging')) {
      loginUrl = 'https://financebackoffice-staging2.tourwow.com/login';
    }

    console.log('🔙 Redirecting to login:', loginUrl);

    // Show alert before redirect
    alert('ไม่พบ Token หรือ Token หมดอายุ\nกรุณาเข้าสู่ระบบใหม่อีกครั้ง');

    // Clear token
    TourImageAPI.removeToken();

    // Redirect
    window.location.href = loginUrl;
  }

  // Load initial data on page load
  async function loadInitialData() {
    try {
      console.log('📊 Loading initial data...');
      
      // Load dropdowns
      await Promise.all([
        loadSuppliers(),
        loadCountries()
      ]);
      
      // Load initial images
      await loadImages();
      
      console.log('✅ Initial data loaded successfully');
    } catch (error) {
      console.error('❌ Failed to load initial data:', error);
      console.error('Error status:', error.status);
      
      // If error is 401/403, token is invalid
      if (error.status === 401 || error.status === 403 || 
          error.message.includes('401') || error.message.includes('403')) {
        console.error('❌ Authentication error - token invalid');
        throw error; // Re-throw to trigger redirect
      }
      
      throw error;
    }
  }

  // Load suppliers (wholesale) into dropdown
  async function loadSuppliers() {
    // Get suppliers from API
    const response = await TourImageAPI.getSuppliers();
    const wholesaleOptions = document.querySelector('#wholesaleMultiSelect .multi-select-options');
    
    if (response && response.status === 'success' && response.data && wholesaleOptions) {
      // Clear existing options
      wholesaleOptions.innerHTML = '';
      
      // Add suppliers from API response
      response.data.forEach(supplier => {
        const optionDiv = document.createElement('div');
        optionDiv.className = 'multi-select-option';
        optionDiv.dataset.value = supplier.id;
        optionDiv.innerHTML = `
          <input type="checkbox" id="wholesale-${supplier.id}" value="${supplier.id}">
          <label for="wholesale-${supplier.id}">${supplier.name_en} (${supplier.name_th})</label>
        `;
        wholesaleOptions.appendChild(optionDiv);
      });
      
      console.log('✅ Loaded suppliers:', response.data.length);
    }
  }

  // Load countries into dropdown
  async function loadCountries() {
    // Get countries from API
    const response = await TourImageAPI.getCountries('country_name_th_by_asc');
    const countryOptions = document.getElementById('countryOptions');
    
    if (response && response.status === 'success' && response.data && countryOptions) {
      // Clear existing options
      countryOptions.innerHTML = '';
      
      // Add countries from API response
      response.data.forEach(country => {
        const optionDiv = document.createElement('div');
        optionDiv.className = 'multi-select-option';
        optionDiv.dataset.value = country.id;
        optionDiv.innerHTML = `
          <input type="checkbox" id="country-${country.id}" value="${country.id}">
          <label for="country-${country.id}">${country.name_th} (${country.name_en})</label>
        `;
        countryOptions.appendChild(optionDiv);
      });
      
      console.log('✅ Loaded countries:', response.data.length);
    }
  }

  // Load images
  async function loadImages(page = 1) {
    // Check token before loading
    if (!checkTokenBeforeAction()) return;

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
        TourImageAPI.getPreProductFileReports({}),
        new Promise(resolve => setTimeout(resolve, 500)) // Minimum 500ms loading
      ]);
      
      if (loadingState) loadingState.style.display = 'none';
      
      if (response && response.status === 'success' && response.data && response.data.length > 0) {
        // Apply default sorting (date-desc) to initial results
        const sortedData = [...response.data].sort((a, b) => {
          const dateA = a.last_file_created_at ? new Date(a.last_file_created_at) : new Date(0);
          const dateB = b.last_file_created_at ? new Date(b.last_file_created_at) : new Date(0);
          return dateB - dateA;
        });
        
        renderResults(sortedData);
        if (resultsTable) resultsTable.style.display = 'flex';
        if (emptyState) emptyState.style.display = 'none';
        
        // Update count
        if (countElement) {
          countElement.textContent = sortedData.length;
        }
        
        // Reset infinite scroll for initial load
        if (window.resetInfiniteScroll) {
          window.resetInfiniteScroll({}, sortedData.length);
        }
        
        console.log(`✅ Loaded ${sortedData.length} images`);
      } else {
        if (emptyState) emptyState.style.display = 'flex';
        if (countElement) {
          countElement.textContent = '0';
        }
      }
    } catch (error) {
      console.error('Failed to load images:', error);
      if (loadingState) loadingState.style.display = 'none';
      if (emptyState) emptyState.style.display = 'flex';
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

    // Store images for modal
    window.currentImages = images;

    // Render each image
    images.forEach((image, index) => {
      const rowHTML = createImageRow(image, index + 1);
      resultsTable.insertAdjacentHTML('beforeend', rowHTML);
    });

    // Re-initialize show all buttons
    initShowAllButtons();

    // Image click handlers removed - no action on click
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

  // Format date to Thai format
  function formatDateThai(dateStr) {
    if (!dateStr || dateStr === '-') return '-';
    try {
      const date = new Date(dateStr);
      const day = String(date.getDate()).padStart(2, '0');
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const year = date.getFullYear() + 543;
      return `${day}/${month}/${year}`;
    } catch (error) {
      return dateStr;
    }
  }

  // Create image row HTML
  function createImageRow(image, index) {
    // Map API response to expected format
    const imageName = image.name || 'ไม่มีชื่อ';
    const imageUrl = image.pre_product_thumbnail_url || 'https://via.placeholder.com/300x200?text=No+Image';
    const fileCount = image.file_count || 0;
    const firstBannerCount = image.first_banner_count || 0;
    const afterFirstBannerCount = image.after_first_banner_count || 0;
    const dayDetailCount = image.day_detail_count || 0;
    const lastUpdated = formatDateThai(image.last_file_created_at);
    
    // Count countries (from root level countries array which represents all programs)
    const countryCount = {};
    const imageCountries = image.countries || [];
    
    // Count each country
    imageCountries.forEach(country => {
      const countryName = country.name_th || country.name_en || 'Unknown';
      countryCount[countryName] = (countryCount[countryName] || 0) + 1;
    });
    
    // Sort countries by count (desc) then by name (asc)
    const sortedCountries = Object.entries(countryCount)
      .sort((a, b) => {
        // First sort by count (descending)
        if (b[1] !== a[1]) {
          return b[1] - a[1];
        }
        // Then sort by name (ascending) - supports both Thai and English
        return a[0].localeCompare(b[0], ['th', 'en']);
      })
      .map(([name, count]) => `${name} (${count})`)
      .join(', ');
    
    const countries = sortedCountries || '-';
    
    // Get programs from pre_product_files
    const programs = image.pre_product_files || [];
    
    const updateDate = lastUpdated;
    
    const programsHTML = programs.slice(0, 5).map(program => {
      const tourCode = program.pre_product?.product_tour_code || '-';
      const wholesale = program.pre_product?.supplier?.name_en || '-';
      return `<a href="#" class="program-link">${tourCode} (${wholesale})</a>`;
    }).join('');

    const hiddenProgramsHTML = programs.slice(5).map(program => {
      const tourCode = program.pre_product?.product_tour_code || '-';
      const wholesale = program.pre_product?.supplier?.name_en || '-';
      return `<a href="#" class="program-link hidden-link">${tourCode} (${wholesale})</a>`;
    }).join('');

    const showAllButton = programs.length > 5 ? `
      <button class="show-all-btn" aria-label="แสดงโปรแกรมทัวร์ทั้งหมด" aria-expanded="false">
        <span>แสดงโปรแกรมทัวร์ทั้งหมด</span>
        <svg class="chevron-icon" width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
          <path d="M2 4L6 8L10 4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </button>
    ` : '';

    // Show "No programs" message if no programs
    const programsContent = programs.length > 0 
      ? `${programsHTML}${hiddenProgramsHTML}${showAllButton}`
      : '<span class="no-programs">ยังไม่มีโปรแกรมทัวร์ที่ใช้รูปนี้</span>';

    return `
      <div class="table-row" role="row">
        <div class="td td-number" role="cell">${index}.</div>
        <div class="td td-image" role="cell">
          <img
            src="${imageUrl}"
            alt="${imageName}"
            loading="lazy"
            style="width: 100%; height: 133px; object-fit: cover; border-radius: 8px;"
            onerror="this.src='https://via.placeholder.com/200x133?text=Error'"
          />
        </div>
        <div class="td td-details" role="cell">
          <div class="image-name-header">${imageName}</div>
          <div class="detail-main">
            <span class="detail-label">รวมใช้ซ้ำ :</span>
            <span class="detail-value text-orange" aria-label="รวมใช้ซ้ำ ${fileCount} โปรแกรมทัวร์">${fileCount} โปรแกรมทัวร์</span>
          </div>
          <div class="detail-sub">
            <div class="detail-item">
              <span class="detail-label">Banner ลำดับที่ 1 :</span>
              <span class="detail-value">${firstBannerCount} โปรแกรมทัวร์</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">Banner ลำดับที่ 2 ขึ้นไป :</span>
              <span class="detail-value">${afterFirstBannerCount} โปรแกรมทัวร์</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">รายละเอียดทัวร์ :</span>
              <span class="detail-value">${dayDetailCount} โปรแกรมทัวร์</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">ประเทศ :</span>
              <span class="detail-value">${countries}</span>
            </div>
          </div>
        </div>
        <div class="td td-programs" role="cell">
          <div class="programs-list-visible">
            ${programsContent}
          </div>
        </div>
        <div class="td td-updated" role="cell">
          ${updateDate ? `<div class="image-update-date">อัปเดต: ${updateDate}</div>` : '-'}
        </div>
      </div>
    `;
  }

  // Sorting Functions
  function initSorting() {
    const sortBtn = document.getElementById('sortBtn');
    const sortMenu = document.getElementById('sortMenu');
    let currentSort = 'date-desc'; // Default sort

    if (!sortBtn || !sortMenu) return;

    // Get button text element (create if doesn't exist)
    let btnTextElement = sortBtn.querySelector('.sort-btn-text');
    if (!btnTextElement) {
      // Find the text node and wrap it
      const textNode = Array.from(sortBtn.childNodes).find(node => node.nodeType === 3 && node.textContent.trim() === 'เรียงลำดับ');
      if (textNode) {
        btnTextElement = document.createElement('span');
        btnTextElement.className = 'sort-btn-text';
        btnTextElement.textContent = 'เรียงลำดับ';
        textNode.replaceWith(btnTextElement);
      }
    }

    // Set default sort option as active and update button text
    const defaultOption = sortMenu.querySelector('[data-sort="date-desc"]');
    if (defaultOption) {
      defaultOption.classList.add('active');
      if (btnTextElement) {
        btnTextElement.textContent = defaultOption.textContent.trim();
      }
    }

    // Toggle sort menu
    sortBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      
      // Close other dropdowns
      const exportBtn = document.getElementById('exportBtn');
      const exportMenu = document.getElementById('exportMenu');
      if (exportBtn && exportMenu) {
        exportBtn.classList.remove('open');
        exportMenu.classList.remove('open');
      }
      
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
        
        // Update button text to show selected option
        if (btnTextElement) {
          const optionText = option.textContent.trim();
          btnTextElement.textContent = optionText;
        }
        
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

    // Helper function to get banner/detail value by type
    function getBannerValue(image, type) {
      switch(type) {
        case 'banner1':
          return image.first_banner_count || 0;
        case 'banner2':
          return image.after_first_banner_count || 0;
        case 'detail':
          return image.day_detail_count || 0;
        default:
          return 0;
      }
    }

    switch (sortType) {
      case 'date-desc':
        // Sort by last_file_created_at (newest first)
        sortedImages.sort((a, b) => {
          const dateA = a.last_file_created_at ? new Date(a.last_file_created_at) : new Date(0);
          const dateB = b.last_file_created_at ? new Date(b.last_file_created_at) : new Date(0);
          return dateB - dateA;
        });
        break;
      case 'date-asc':
        // Sort by last_file_created_at (oldest first)
        sortedImages.sort((a, b) => {
          const dateA = a.last_file_created_at ? new Date(a.last_file_created_at) : new Date(0);
          const dateB = b.last_file_created_at ? new Date(b.last_file_created_at) : new Date(0);
          return dateA - dateB;
        });
        break;
      case 'usage-desc':
        // Sort by file_count (most used first)
        sortedImages.sort((a, b) => (b.file_count || 0) - (a.file_count || 0));
        break;
      case 'usage-asc':
        // Sort by file_count (least used first)
        sortedImages.sort((a, b) => (a.file_count || 0) - (b.file_count || 0));
        break;
      case 'banner1-desc':
        // Sort by Banner ลำดับที่ 1 (มาก-น้อย)
        sortedImages.sort((a, b) => {
          const valA = getBannerValue(a, 'banner1');
          const valB = getBannerValue(b, 'banner1');
          // Primary sort by banner1
          if (valB !== valA) {
            return valB - valA;
          }
          // Secondary sort by file_count (มาก-น้อย)
          return (b.file_count || 0) - (a.file_count || 0);
        });
        break;
      case 'banner1-asc':
        // Sort by Banner ลำดับที่ 1 (น้อย-มาก)
        sortedImages.sort((a, b) => {
          const valA = getBannerValue(a, 'banner1');
          const valB = getBannerValue(b, 'banner1');
          // Primary sort by banner1
          if (valA !== valB) {
            return valA - valB;
          }
          // Secondary sort by file_count (มาก-น้อย)
          return (b.file_count || 0) - (a.file_count || 0);
        });
        break;
      case 'banner2-desc':
        // Sort by Banner ลำดับที่ 2 (มาก-น้อย)
        sortedImages.sort((a, b) => {
          const valA = getBannerValue(a, 'banner2');
          const valB = getBannerValue(b, 'banner2');
          // Primary sort by banner2
          if (valB !== valA) {
            return valB - valA;
          }
          // Secondary sort by file_count (มาก-น้อย)
          return (b.file_count || 0) - (a.file_count || 0);
        });
        break;
      case 'banner2-asc':
        // Sort by Banner ลำดับที่ 2 (น้อย-มาก)
        sortedImages.sort((a, b) => {
          const valA = getBannerValue(a, 'banner2');
          const valB = getBannerValue(b, 'banner2');
          // Primary sort by banner2
          if (valA !== valB) {
            return valA - valB;
          }
          // Secondary sort by file_count (มาก-น้อย)
          return (b.file_count || 0) - (a.file_count || 0);
        });
        break;
      case 'detail-desc':
        // Sort by รายละเอียดทัวร์ (มาก-น้อย)
        sortedImages.sort((a, b) => {
          const valA = getBannerValue(a, 'detail');
          const valB = getBannerValue(b, 'detail');
          // Primary sort by detail
          if (valB !== valA) {
            return valB - valA;
          }
          // Secondary sort by file_count (มาก-น้อย)
          return (b.file_count || 0) - (a.file_count || 0);
        });
        break;
      case 'detail-asc':
        // Sort by รายละเอียดทัวร์ (น้อย-มาก)
        sortedImages.sort((a, b) => {
          const valA = getBannerValue(a, 'detail');
          const valB = getBannerValue(b, 'detail');
          // Primary sort by detail
          if (valA !== valB) {
            return valA - valB;
          }
          // Secondary sort by file_count (มาก-น้อย)
          return (b.file_count || 0) - (a.file_count || 0);
        });
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
      
      // Close other dropdowns
      const sortBtn = document.getElementById('sortBtn');
      const sortMenu = document.getElementById('sortMenu');
      if (sortBtn && sortMenu) {
        sortBtn.classList.remove('open');
        sortMenu.classList.remove('open');
      }
      
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
    // Check token before export
    if (typeof TokenUtils !== 'undefined' && TokenUtils.isTokenExpired()) {
      console.error('❌ Token expired - redirecting to login');
      TokenUtils.redirectToLogin('Token หมดอายุ กรุณาเข้าสู่ระบบใหม่');
      return;
    }

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
    const headers = ['ลำดับ', 'ชื่อรูป', 'จำนวนรวมใช้ซ้ำ', 'Banner ลำดับที่ 1', 'Banner ลำดับที่ 2 ขึ้นไป', 'รายละเอียดทัวร์', 'ประเทศ', 'วันที่อัปเดต', 'โปรแกรมทัวร์'];
    
    const rows = images.map((img, index) => {
      // Get programs list
      const programs = (img.pre_product_files || [])
        .map(file => {
          const tourCode = file.pre_product?.product_tour_code || '-';
          const wholesale = file.pre_product?.supplier?.name_en || '-';
          return `${tourCode} (${wholesale})`;
        })
        .join('; ');
      
      // Count countries
      const countryCount = {};
      const imageCountries = img.countries || [];
      imageCountries.forEach(country => {
        const countryName = country.name_th || country.name_en || 'Unknown';
        countryCount[countryName] = (countryCount[countryName] || 0) + 1;
      });
      const countries = Object.entries(countryCount)
        .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], ['th', 'en']))
        .map(([name, count]) => `${name} (${count})`)
        .join(', ');
      
      return [
        index + 1,
        img.name || '-',
        img.file_count || 0,
        img.first_banner_count || 0,
        img.after_first_banner_count || 0,
        img.day_detail_count || 0,
        countries || '-',
        formatDateThai(img.last_file_created_at) || '-',
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



  // Export to PDF
  function exportToPDF(images) {
    // Create printable HTML
    const printWindow = window.open('', '_blank');
    
    let html = `
      <!DOCTYPE html>
      <html lang="th">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>รายงานรูปภาพทัวร์ - Tour Image Manager</title>
        <link href="https://fonts.googleapis.com/css2?family=Kanit:wght@300;400;500;600;700&display=swap" rel="stylesheet">
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { 
            font-family: 'Kanit', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            padding: 30px;
            background: #f7f8fa;
            color: #1a1a1a;
          }
          .container {
            max-width: 1200px;
            margin: 0 auto;
            background: white;
            padding: 40px;
            border-radius: 8px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
          }
          .header {
            text-align: center;
            margin-bottom: 40px;
            padding-bottom: 20px;
            border-bottom: 3px solid #4a7ba7;
          }
          h1 { 
            color: #4a7ba7;
            font-size: 32px;
            font-weight: 700;
            margin-bottom: 10px;
          }
          .meta { 
            color: #666;
            font-size: 14px;
            margin-top: 15px;
          }
          .meta p {
            margin: 5px 0;
          }
          .summary {
            background: #f0f7ff;
            padding: 20px;
            border-radius: 6px;
            margin-bottom: 30px;
            border-left: 4px solid #4a7ba7;
          }
          .summary-title {
            font-size: 16px;
            font-weight: 600;
            color: #4a7ba7;
            margin-bottom: 10px;
          }
          table { 
            width: 100%;
            border-collapse: collapse;
            margin-top: 20px;
            font-size: 13px;
          }
          th, td { 
            border: 1px solid #e0e0e0;
            padding: 12px 10px;
            text-align: left;
          }
          th { 
            background: #4a7ba7;
            color: white;
            font-weight: 600;
            font-size: 13px;
          }
          tr:nth-child(even) { 
            background: #f9fafb;
          }
          tr:hover {
            background: #f0f7ff;
          }
          .number-col { text-align: center; font-weight: 600; }
          .count-col { text-align: center; color: #ef4444; font-weight: 600; }
          .date-col { color: #6b7280; font-size: 12px; }
          .footer { 
            margin-top: 40px;
            padding-top: 20px;
            border-top: 2px solid #e0e0e0;
            text-align: center;
            color: #999;
            font-size: 12px;
          }
          .actions {
            margin-top: 30px;
            text-align: center;
            padding: 20px;
            background: #f9fafb;
            border-radius: 6px;
          }
          .btn {
            padding: 12px 24px;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-family: 'Kanit', sans-serif;
            font-size: 14px;
            font-weight: 500;
            margin: 0 5px;
            transition: all 0.2s;
          }
          .btn-primary {
            background: #4a7ba7;
            color: white;
          }
          .btn-primary:hover {
            background: #3a6287;
          }
          .btn-secondary {
            background: #666;
            color: white;
          }
          .btn-secondary:hover {
            background: #555;
          }
          @media print {
            body { 
              padding: 0;
              background: white;
            }
            .container {
              box-shadow: none;
              padding: 20px;
            }
            .actions { display: none; }
            table { font-size: 11px; }
            th, td { padding: 8px 6px; }
          }
          @page {
            margin: 1cm;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>รายงานรูปภาพทัวร์</h1>
            <div class="meta">
              <p><strong>วันที่สร้างรายงาน:</strong> ${new Date().toLocaleDateString('th-TH', { 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })}</p>
            </div>
          </div>
          
          <div class="summary">
            <div class="summary-title">สรุปข้อมูล</div>
            <p><strong>จำนวนรูปภาพทั้งหมด:</strong> ${images.length} รูป</p>
            <p><strong>จำนวนการใช้งานรวม:</strong> ${images.reduce((sum, img) => sum + (img.file_count || 0), 0)} ครั้ง</p>
          </div>
          
          <table>
            <thead>
              <tr>
                <th style="width: 50px;">ลำดับ</th>
                <th style="width: 200px;">ชื่อรูป</th>
                <th style="width: 80px;">รวมใช้ซ้ำ</th>
                <th style="width: 80px;">Banner 1</th>
                <th style="width: 80px;">Banner 2+</th>
                <th style="width: 80px;">รายละเอียด</th>
                <th style="width: 150px;">ประเทศ</th>
                <th style="width: 100px;">วันที่อัปเดต</th>
              </tr>
            </thead>
            <tbody>
    `;
    
    images.forEach((img, index) => {
      // Count countries
      const countryCount = {};
      const imageCountries = img.countries || [];
      imageCountries.forEach(country => {
        const countryName = country.name_th || country.name_en || 'Unknown';
        countryCount[countryName] = (countryCount[countryName] || 0) + 1;
      });
      const countries = Object.entries(countryCount)
        .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], ['th', 'en']))
        .map(([name, count]) => `${name} (${count})`)
        .join(', ');
      
      html += `
        <tr>
          <td class="number-col">${index + 1}</td>
          <td>${img.name || '-'}</td>
          <td class="count-col">${img.file_count || 0}</td>
          <td class="number-col">${img.first_banner_count || 0}</td>
          <td class="number-col">${img.after_first_banner_count || 0}</td>
          <td class="number-col">${img.day_detail_count || 0}</td>
          <td>${countries || '-'}</td>
          <td class="date-col">${formatDateThai(img.last_file_created_at) || '-'}</td>
        </tr>
      `;
    });
    
    html += `
            </tbody>
          </table>
          
          <div class="footer">
            <p><strong>Tour Image Manager</strong> - ระบบจัดการรูปภาพทัวร์ Tourwow</p>
            <p>สร้างโดยระบบอัตโนมัติ</p>
          </div>
          
          <div class="actions">
            <button onclick="window.print()" class="btn btn-primary">
              <span>🖨️</span> พิมพ์ / บันทึกเป็น PDF
            </button>
            <button onclick="window.close()" class="btn btn-secondary">
              <span>✕</span> ปิดหน้าต่าง
            </button>
          </div>
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
