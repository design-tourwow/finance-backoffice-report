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

    const state = {
      selectedValues: [],
      selectedLabels: [],
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
      <div class="searchable-dropdown-menu multi" role="listbox">
        <div class="searchable-dropdown-search">
          <input type="text" placeholder="ค้นหา..." aria-label="ค้นหา">
          <div class="searchable-dropdown-actions">
            <button type="button" class="searchable-action-btn select-all">เลือกทั้งหมด</button>
            <button type="button" class="searchable-action-btn deselect-all">ล้างทั้งหมด</button>
          </div>
        </div>
        <div class="searchable-dropdown-options">
          ${renderMultiOptions(dropdownOptions, state.selectedValues)}
        </div>
      </div>
    `;

    const trigger = wrapper.querySelector('.searchable-dropdown-trigger');
    const menu = wrapper.querySelector('.searchable-dropdown-menu');
    const searchInput = wrapper.querySelector('.searchable-dropdown-search input');
    const optionsContainer = wrapper.querySelector('.searchable-dropdown-options');
    const selectedText = wrapper.querySelector('.selected-text');
    const selectAllBtn = wrapper.querySelector('.select-all');
    const deselectAllBtn = wrapper.querySelector('.deselect-all');

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
      optionsContainer.innerHTML = renderMultiOptions(state.filteredOptions, state.selectedValues);
      attachMultiOptionListeners();
    });

    // Select all
    selectAllBtn.addEventListener('click', function() {
      state.selectedValues = state.filteredOptions.map(opt => opt.value);
      state.selectedLabels = state.filteredOptions.map(opt => opt.label);
      updateMultiDisplay();
      optionsContainer.innerHTML = renderMultiOptions(state.filteredOptions, state.selectedValues);
      attachMultiOptionListeners();
      if (onChange) {
        onChange(state.selectedValues, state.selectedLabels);
      }
    });

    // Deselect all
    deselectAllBtn.addEventListener('click', function() {
      state.selectedValues = [];
      state.selectedLabels = [];
      updateMultiDisplay();
      optionsContainer.innerHTML = renderMultiOptions(state.filteredOptions, state.selectedValues);
      attachMultiOptionListeners();
      if (onChange) {
        onChange(state.selectedValues, state.selectedLabels);
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

    function renderMultiOptions(options, selectedValues) {
      if (options.length === 0) {
        return '<div class="searchable-dropdown-empty">ไม่พบข้อมูล</div>';
      }
      
      return options.map(opt => {
        const isSelected = selectedValues.includes(opt.value);
        return `
          <div class="searchable-dropdown-option ${isSelected ? 'selected' : ''}" 
               data-value="${opt.value}" 
               role="option" 
               aria-selected="${isSelected}">
            <input type="checkbox" 
                   id="opt-${opt.value}" 
                   value="${opt.value}" 
                   ${isSelected ? 'checked' : ''}
                   class="option-checkbox">
            <label for="opt-${opt.value}">${opt.label}</label>
          </div>
        `;
      }).join('');
    }

    function attachMultiOptionListeners() {
      const options = optionsContainer.querySelectorAll('.searchable-dropdown-option');
      options.forEach(option => {
        const checkbox = option.querySelector('.option-checkbox');
        
        option.addEventListener('click', function(e) {
          if (e.target.tagName !== 'INPUT') {
            checkbox.checked = !checkbox.checked;
          }
          toggleOption(checkbox.value, checkbox.checked);
        });
        
        checkbox.addEventListener('change', function() {
          toggleOption(this.value, this.checked);
        });
      });
    }

    function toggleOption(value, isChecked) {
      const option = dropdownOptions.find(opt => opt.value === value);
      if (!option) return;

      if (isChecked) {
        if (!state.selectedValues.includes(value)) {
          state.selectedValues.push(value);
          state.selectedLabels.push(option.label);
        }
      } else {
        const index = state.selectedValues.indexOf(value);
        if (index > -1) {
          state.selectedValues.splice(index, 1);
          state.selectedLabels.splice(index, 1);
        }
      }

      updateMultiDisplay();
      
      // Update checkbox state in DOM
      const optionElement = optionsContainer.querySelector(`[data-value="${value}"]`);
      if (optionElement) {
        optionElement.classList.toggle('selected', isChecked);
        optionElement.setAttribute('aria-selected', isChecked);
      }
      
      if (onChange) {
        onChange(state.selectedValues, state.selectedLabels);
      }
    }

    function updateMultiDisplay() {
      // Get all checked checkboxes from DOM (like tour-image-manager)
      const checkboxes = optionsContainer.querySelectorAll('input[type="checkbox"]:checked');
      const count = checkboxes.length;
      
      if (count === 0) {
        selectedText.textContent = placeholder;
        trigger.classList.add('placeholder');
      } else {
        // Show all selected items as comma-separated text
        const labels = Array.from(checkboxes).map(cb => {
          const label = cb.nextElementSibling;
          return label ? label.textContent.trim() : '';
        }).filter(text => text !== '');
        const fullText = labels.join(', ');
        selectedText.textContent = fullText;
        trigger.classList.remove('placeholder');
      }
      
      // Update state from DOM
      state.selectedValues = Array.from(checkboxes).map(cb => cb.value);
      state.selectedLabels = Array.from(checkboxes).map(cb => {
        const label = cb.nextElementSibling;
        return label ? label.textContent.trim() : '';
      }).filter(text => text !== '');
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
      optionsContainer.innerHTML = renderMultiOptions(state.filteredOptions, state.selectedValues);
      attachMultiOptionListeners();
      setTimeout(() => searchInput.focus(), 100);
    }

    function closeDropdown() {
      state.isOpen = false;
      menu.classList.remove('open');
      trigger.classList.remove('open');
      trigger.setAttribute('aria-expanded', 'false');
    }

    // Initial render
    attachMultiOptionListeners();

    // Public API
    const dropdownInstance = {
      getValues: () => state.selectedValues,
      getLabels: () => state.selectedLabels,
      setValues: (values) => {
        state.selectedValues = [...values];
        state.selectedLabels = values.map(val => {
          const opt = dropdownOptions.find(o => o.value === val);
          return opt ? opt.label : val;
        });
        updateMultiDisplay();
        optionsContainer.innerHTML = renderMultiOptions(state.filteredOptions, state.selectedValues);
        attachMultiOptionListeners();
      },
      clear: () => {
        state.selectedValues = [];
        state.selectedLabels = [];
        updateMultiDisplay();
        optionsContainer.innerHTML = renderMultiOptions(state.filteredOptions, state.selectedValues);
        attachMultiOptionListeners();
      },
      updateOptions: (newOptions) => {
        dropdownOptions.length = 0;
        dropdownOptions.push(...newOptions);
        state.filteredOptions = [...newOptions];
        optionsContainer.innerHTML = renderMultiOptions(newOptions, state.selectedValues);
        attachMultiOptionListeners();
      },
      close: closeDropdown
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
