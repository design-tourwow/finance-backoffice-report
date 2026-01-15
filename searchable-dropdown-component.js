/**
 * Searchable Dropdown Component
 * Supports both single-select and multi-select with search functionality
 */

const SearchableDropdownComponent = {
  // Track all open dropdowns to close them when opening a new one
  _openDropdowns: [],
  
  /**
   * Close all open dropdowns
   */
  closeAllDropdowns() {
    this._openDropdowns.forEach(dropdown => {
      if (dropdown && dropdown.close) {
        dropdown.close();
      }
    });
  },
  
  /**
   * Initialize Simple Dropdown (without search)
   * @param {Object} options - Configuration options
   * @param {string} options.wrapperId - ID of wrapper element
   * @param {string} options.placeholder - Placeholder text
   * @param {Array} options.options - Array of {value, label} objects
   * @param {Function} options.onChange - Callback when selection changes
   * @returns {Object} Dropdown instance with methods
   */
  initDropdown(options) {
    const { wrapperId, placeholder, options: dropdownOptions, onChange } = options;
    
    const wrapper = document.getElementById(wrapperId);
    if (!wrapper) {
      console.error('SearchableDropdown: Wrapper not found', wrapperId);
      return null;
    }

    const state = {
      selectedValue: null,
      selectedLabel: null,
      isOpen: false
    };

    // Build HTML (without search box)
    wrapper.innerHTML = `
      <div class="searchable-dropdown-trigger placeholder" tabindex="0" role="button" aria-haspopup="listbox" aria-expanded="false">
        <span class="selected-text">${placeholder}</span>
        <svg class="arrow" width="12" height="12" viewBox="0 0 12 12" fill="none">
          <path d="M2 4L6 8L10 4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </div>
      <div class="searchable-dropdown-menu" role="listbox">
        <div class="searchable-dropdown-options">
          ${renderSimpleOptions(dropdownOptions)}
        </div>
      </div>
    `;

    const trigger = wrapper.querySelector('.searchable-dropdown-trigger');
    const menu = wrapper.querySelector('.searchable-dropdown-menu');
    const optionsContainer = wrapper.querySelector('.searchable-dropdown-options');
    const selectedText = wrapper.querySelector('.selected-text');

    // Toggle dropdown
    trigger.addEventListener('click', function(e) {
      e.stopPropagation();
      
      const isCurrentlyOpen = state.isOpen;
      
      // Close all other dropdowns and date pickers first
      if (!isCurrentlyOpen) {
        SearchableDropdownComponent.closeAllDropdowns();
        if (typeof DatePickerComponent !== 'undefined') {
          DatePickerComponent.closeAllPickers();
        }
      }
      
      toggleDropdown();
    });

    // Keyboard support for trigger
    trigger.addEventListener('keydown', function(e) {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        toggleDropdown();
      }
      if (e.key === 'Escape') {
        closeDropdown();
      }
    });

    // Close when clicking outside
    document.addEventListener('click', function(e) {
      if (!wrapper.contains(e.target)) {
        closeDropdown();
      }
    });

    // Prevent closing when clicking inside menu
    menu.addEventListener('click', function(e) {
      e.stopPropagation();
    });

    function renderSimpleOptions(options) {
      if (options.length === 0) {
        return '<div class="searchable-dropdown-empty">ไม่พบข้อมูล</div>';
      }
      
      return options.map(opt => `
        <div class="searchable-dropdown-option ${opt.value === state.selectedValue ? 'selected' : ''}" 
             data-value="${opt.value}" 
             role="option" 
             aria-selected="${opt.value === state.selectedValue}">
          ${opt.label}
        </div>
      `).join('');
    }

    function attachOptionListeners() {
      const options = optionsContainer.querySelectorAll('.searchable-dropdown-option');
      options.forEach(option => {
        option.addEventListener('click', function() {
          const value = this.getAttribute('data-value');
          const label = this.textContent.trim();
          selectOption(value, label);
        });
      });
    }

    function selectOption(value, label) {
      state.selectedValue = value;
      state.selectedLabel = label;
      selectedText.textContent = label;
      trigger.classList.remove('placeholder');
      
      // Update selected state in options
      optionsContainer.querySelectorAll('.searchable-dropdown-option').forEach(opt => {
        opt.classList.toggle('selected', opt.getAttribute('data-value') === value);
        opt.setAttribute('aria-selected', opt.getAttribute('data-value') === value);
      });
      
      closeDropdown();
      
      if (onChange) {
        onChange(value, label);
      }
    }

    function toggleDropdown() {
      if (state.isOpen) {
        closeDropdown();
      } else {
        openDropdown();
      }
    }

    function openDropdown() {
      state.isOpen = true;
      menu.classList.add('open');
      trigger.classList.add('open');
      trigger.setAttribute('aria-expanded', 'true');
    }

    function closeDropdown() {
      state.isOpen = false;
      menu.classList.remove('open');
      trigger.classList.remove('open');
      trigger.setAttribute('aria-expanded', 'false');
    }

    // Initial render
    attachOptionListeners();

    // Public API
    const dropdownInstance = {
      getValue: () => state.selectedValue,
      getLabel: () => state.selectedLabel,
      setValue: (value) => {
        const option = dropdownOptions.find(opt => opt.value === value);
        if (option) {
          selectOption(option.value, option.label);
        }
      },
      clear: () => {
        state.selectedValue = null;
        state.selectedLabel = null;
        selectedText.textContent = placeholder;
        trigger.classList.add('placeholder');
        optionsContainer.querySelectorAll('.searchable-dropdown-option').forEach(opt => {
          opt.classList.remove('selected');
          opt.setAttribute('aria-selected', 'false');
        });
      },
      updateOptions: (newOptions) => {
        dropdownOptions.length = 0;
        dropdownOptions.push(...newOptions);
        optionsContainer.innerHTML = renderSimpleOptions(newOptions);
        attachOptionListeners();
      },
      close: closeDropdown
    };
    
    // Register this dropdown
    SearchableDropdownComponent._openDropdowns.push(dropdownInstance);
    
    return dropdownInstance;
  },

  /**
   * Initialize Single-Select Dropdown
   * @param {Object} options - Configuration options
   * @param {string} options.wrapperId - ID of wrapper element
   * @param {string} options.placeholder - Placeholder text
   * @param {Array} options.options - Array of {value, label} objects
   * @param {Function} options.onChange - Callback when selection changes
   * @returns {Object} Dropdown instance with methods
   */
  initSingleSelect(options) {
    const { wrapperId, placeholder, options: dropdownOptions, onChange } = options;
    
    const wrapper = document.getElementById(wrapperId);
    if (!wrapper) {
      console.error('SearchableDropdown: Wrapper not found', wrapperId);
      return null;
    }

    const state = {
      selectedValue: null,
      selectedLabel: null,
      isOpen: false,
      filteredOptions: [...dropdownOptions]
    };

    // Build HTML
    wrapper.innerHTML = `
      <div class="searchable-dropdown-trigger placeholder" tabindex="0" role="button" aria-haspopup="listbox" aria-expanded="false">
        <span class="selected-text">${placeholder}</span>
        <svg class="arrow" width="12" height="12" viewBox="0 0 12 12" fill="none">
          <path d="M2 4L6 8L10 4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </div>
      <div class="searchable-dropdown-menu" role="listbox">
        <div class="searchable-dropdown-search">
          <input type="text" placeholder="ค้นหา..." aria-label="ค้นหา">
        </div>
        <div class="searchable-dropdown-options">
          ${renderOptions(dropdownOptions)}
        </div>
      </div>
    `;

    const trigger = wrapper.querySelector('.searchable-dropdown-trigger');
    const menu = wrapper.querySelector('.searchable-dropdown-menu');
    const searchInput = wrapper.querySelector('.searchable-dropdown-search input');
    const optionsContainer = wrapper.querySelector('.searchable-dropdown-options');
    const selectedText = wrapper.querySelector('.selected-text');

    // Toggle dropdown
    trigger.addEventListener('click', function(e) {
      e.stopPropagation();
      
      const isCurrentlyOpen = state.isOpen;
      
      // Close all other dropdowns and date pickers first
      if (!isCurrentlyOpen) {
        SearchableDropdownComponent.closeAllDropdowns();
        if (typeof DatePickerComponent !== 'undefined') {
          DatePickerComponent.closeAllPickers();
        }
      }
      
      toggleDropdown();
    });

    // Keyboard support for trigger
    trigger.addEventListener('keydown', function(e) {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        toggleDropdown();
      }
      if (e.key === 'Escape') {
        closeDropdown();
      }
    });

    // Search functionality
    searchInput.addEventListener('input', function(e) {
      const searchTerm = e.target.value.toLowerCase();
      state.filteredOptions = dropdownOptions.filter(opt => 
        opt.label.toLowerCase().includes(searchTerm)
      );
      optionsContainer.innerHTML = renderOptions(state.filteredOptions);
      attachOptionListeners();
    });

    // Close when clicking outside
    document.addEventListener('click', function(e) {
      if (!wrapper.contains(e.target)) {
        closeDropdown();
      }
    });

    // Prevent closing when clicking inside menu
    menu.addEventListener('click', function(e) {
      e.stopPropagation();
    });

    function renderOptions(options) {
      if (options.length === 0) {
        return '<div class="searchable-dropdown-empty">ไม่พบข้อมูล</div>';
      }
      
      return options.map(opt => `
        <div class="searchable-dropdown-option ${opt.value === state.selectedValue ? 'selected' : ''}" 
             data-value="${opt.value}" 
             role="option" 
             aria-selected="${opt.value === state.selectedValue}">
          ${opt.label}
        </div>
      `).join('');
    }

    function attachOptionListeners() {
      const options = optionsContainer.querySelectorAll('.searchable-dropdown-option');
      options.forEach(option => {
        option.addEventListener('click', function() {
          const value = this.getAttribute('data-value');
          const label = this.textContent.trim();
          selectOption(value, label);
        });
      });
    }

    function selectOption(value, label) {
      state.selectedValue = value;
      state.selectedLabel = label;
      selectedText.textContent = label;
      trigger.classList.remove('placeholder');
      
      // Update selected state in options
      optionsContainer.querySelectorAll('.searchable-dropdown-option').forEach(opt => {
        opt.classList.toggle('selected', opt.getAttribute('data-value') === value);
        opt.setAttribute('aria-selected', opt.getAttribute('data-value') === value);
      });
      
      closeDropdown();
      
      if (onChange) {
        onChange(value, label);
      }
    }

    function toggleDropdown() {
      if (state.isOpen) {
        closeDropdown();
      } else {
        openDropdown();
      }
    }

    function openDropdown() {
      state.isOpen = true;
      menu.classList.add('open');
      trigger.classList.add('open');
      trigger.setAttribute('aria-expanded', 'true');
      searchInput.value = '';
      state.filteredOptions = [...dropdownOptions];
      optionsContainer.innerHTML = renderOptions(state.filteredOptions);
      attachOptionListeners();
      setTimeout(() => searchInput.focus(), 100);
    }

    function closeDropdown() {
      state.isOpen = false;
      menu.classList.remove('open');
      trigger.classList.remove('open');
      trigger.setAttribute('aria-expanded', 'false');
    }

    // Initial render
    attachOptionListeners();

    // Public API
    const dropdownInstance = {
      getValue: () => state.selectedValue,
      getLabel: () => state.selectedLabel,
      setValue: (value) => {
        const option = dropdownOptions.find(opt => opt.value === value);
        if (option) {
          selectOption(option.value, option.label);
        }
      },
      clear: () => {
        state.selectedValue = null;
        state.selectedLabel = null;
        selectedText.textContent = placeholder;
        trigger.classList.add('placeholder');
        optionsContainer.querySelectorAll('.searchable-dropdown-option').forEach(opt => {
          opt.classList.remove('selected');
          opt.setAttribute('aria-selected', 'false');
        });
      },
      updateOptions: (newOptions) => {
        dropdownOptions.length = 0;
        dropdownOptions.push(...newOptions);
        state.filteredOptions = [...newOptions];
        optionsContainer.innerHTML = renderOptions(newOptions);
        attachOptionListeners();
      },
      close: closeDropdown
    };
    
    // Register this dropdown
    SearchableDropdownComponent._openDropdowns.push(dropdownInstance);
    
    return dropdownInstance;
  },

  /**
   * Initialize Multi-Select Dropdown
   * @param {Object} options - Configuration options
   * @param {string} options.wrapperId - ID of wrapper element
   * @param {string} options.placeholder - Placeholder text
   * @param {Array} options.options - Array of {value, label} objects
   * @param {Function} options.onChange - Callback when selection changes
   * @returns {Object} Dropdown instance with methods
   */
  initMultiSelect(options) {
    const { wrapperId, placeholder, options: dropdownOptions, onChange } = options;
    
    const wrapper = document.getElementById(wrapperId);
    if (!wrapper) {
      console.error('SearchableDropdown: Wrapper not found', wrapperId);
      return null;
    }

    // Build HTML (same structure as tour-image-manager)
    wrapper.className = 'multi-select-wrapper';
    wrapper.innerHTML = `
      <div class="multi-select-trigger placeholder" tabindex="0" role="button" aria-haspopup="listbox" aria-expanded="false">
        <span class="selected-text">${placeholder}</span>
        <svg class="arrow" width="12" height="12" viewBox="0 0 12 12" fill="none">
          <path d="M2 4L6 8L10 4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </div>
      <div class="multi-select-dropdown" role="listbox">
        <div class="multi-select-search">
          <input type="text" placeholder="ค้นหา..." aria-label="ค้นหา">
          <div class="multi-select-actions">
            <button type="button" class="multi-select-action-btn select-all">เลือกทั้งหมด</button>
            <button type="button" class="multi-select-action-btn deselect-all">ล้างทั้งหมด</button>
          </div>
        </div>
        <div class="multi-select-options">
          ${dropdownOptions.map(opt => `
            <div class="multi-select-option">
              <input type="checkbox" id="opt-${wrapperId}-${opt.value}" value="${opt.value}">
              <label for="opt-${wrapperId}-${opt.value}">${opt.label}</label>
            </div>
          `).join('')}
        </div>
      </div>
    `;

    const trigger = wrapper.querySelector('.multi-select-trigger');
    const dropdown = wrapper.querySelector('.multi-select-dropdown');
    const searchInput = wrapper.querySelector('.multi-select-search input');
    const selectAllBtn = wrapper.querySelector('.select-all');
    const deselectAllBtn = wrapper.querySelector('.deselect-all');
    const optionsContainer = wrapper.querySelector('.multi-select-options');
    const selectedText = trigger.querySelector('.selected-text');
    
    // Store placeholder
    trigger.dataset.placeholder = placeholder;
    
    // Toggle dropdown (same as tour-image-manager)
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
      
      // Close date pickers
      if (typeof DatePickerComponent !== 'undefined') {
        DatePickerComponent.closeAllPickers();
      }
      
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
    
    // Update selected text (same as tour-image-manager)
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
      
      // Trigger onChange callback
      if (onChange) {
        const values = Array.from(checkboxes).map(cb => cb.value);
        const labels = Array.from(checkboxes).map(cb => cb.nextElementSibling.textContent);
        onChange(values, labels);
      }
    };
    
    // Search functionality (same as tour-image-manager)
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
    
    // Select all (same as tour-image-manager)
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
    
    // Deselect all (same as tour-image-manager)
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
    
    // Event listeners (same as tour-image-manager)
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
    
    // Handle option clicks (same as tour-image-manager)
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
    
    // Close on outside click (same as tour-image-manager)
    document.addEventListener('click', (e) => {
      if (!wrapper.contains(e.target)) {
        dropdown.classList.remove('open');
        trigger.classList.remove('open');
        trigger.setAttribute('aria-expanded', 'false');
      }
    });

    // Public API
    const dropdownInstance = {
      getValues: () => {
        const checkboxes = optionsContainer.querySelectorAll('input[type="checkbox"]:checked');
        return Array.from(checkboxes).map(cb => cb.value);
      },
      getLabels: () => {
        const checkboxes = optionsContainer.querySelectorAll('input[type="checkbox"]:checked');
        return Array.from(checkboxes).map(cb => cb.nextElementSibling.textContent);
      },
      setValues: (values) => {
        optionsContainer.querySelectorAll('input[type="checkbox"]').forEach(cb => {
          cb.checked = values.includes(cb.value);
          const option = cb.closest('.multi-select-option');
          if (cb.checked) {
            option.classList.add('selected');
          } else {
            option.classList.remove('selected');
          }
        });
        updateSelectedText();
      },
      clear: () => {
        optionsContainer.querySelectorAll('input[type="checkbox"]').forEach(cb => {
          cb.checked = false;
          cb.closest('.multi-select-option').classList.remove('selected');
        });
        updateSelectedText();
      },
      updateOptions: (newOptions) => {
        optionsContainer.innerHTML = newOptions.map(opt => `
          <div class="multi-select-option">
            <input type="checkbox" id="opt-${wrapperId}-${opt.value}" value="${opt.value}">
            <label for="opt-${wrapperId}-${opt.value}">${opt.label}</label>
          </div>
        `).join('');
        updateSelectedText();
      },
      close: () => {
        dropdown.classList.remove('open');
        trigger.classList.remove('open');
        trigger.setAttribute('aria-expanded', 'false');
      }
    };
    
    // Register this dropdown
    SearchableDropdownComponent._openDropdowns.push(dropdownInstance);
    
    return dropdownInstance;
  }
};

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
  module.exports = SearchableDropdownComponent;
}
