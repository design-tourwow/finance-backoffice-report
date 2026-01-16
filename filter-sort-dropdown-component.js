// Filter & Sort Dropdown Component
// Single-select dropdown for filtering and sorting
const FilterSortDropdownComponent = (function() {
  'use strict';

  /**
   * Initialize Filter/Sort Dropdown
   * @param {Object} config - Configuration object
   * @param {string} config.containerId - ID of container element
   * @param {string} config.defaultLabel - Default button label
   * @param {string} config.defaultIcon - Default button icon (SVG string)
   * @param {Array} config.options - Array of options
   * @param {Function} config.onChange - Callback when option selected
   * @returns {Object} - Component instance
   */
  function initDropdown(config) {
    const {
      containerId,
      defaultLabel = 'เลือก',
      defaultIcon = '',
      options = [],
      onChange
    } = config;

    const container = document.getElementById(containerId);
    if (!container) {
      console.error(`❌ Container #${containerId} not found`);
      return null;
    }

    // Generate unique IDs
    const btnId = `${containerId}Btn`;
    const menuId = `${containerId}Menu`;

    // Create dropdown HTML
    container.innerHTML = `
      <div class="filter-sort-dropdown">
        <button type="button" class="filter-sort-btn" id="${btnId}">
          <div class="filter-sort-btn-content">
            ${defaultIcon || `
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M3 6h18M7 12h10M11 18h2"></path>
              </svg>
            `}
            <span class="filter-sort-btn-text">${defaultLabel}</span>
          </div>
          <svg class="filter-sort-arrow" width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M2 4L6 8L10 4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </button>
        <div class="filter-sort-menu" id="${menuId}">
          ${options.map(opt => `
            <button type="button" class="filter-sort-option ${opt.active ? 'active' : ''}" data-value="${opt.value}">
              ${opt.icon || `
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="12" cy="12" r="10"/>
                </svg>
              `}
              ${opt.label}
            </button>
          `).join('')}
        </div>
      </div>
    `;

    const btn = document.getElementById(btnId);
    const menu = document.getElementById(menuId);
    const btnText = btn.querySelector('.filter-sort-btn-text');
    const btnContent = btn.querySelector('.filter-sort-btn-content');

    // Toggle dropdown
    btn.addEventListener('click', function(e) {
      e.stopPropagation();
      const isOpen = menu.classList.contains('open');
      
      // Close all other dropdowns
      document.querySelectorAll('.filter-sort-menu.open').forEach(m => {
        if (m !== menu) m.classList.remove('open');
      });
      document.querySelectorAll('.filter-sort-btn.open').forEach(b => {
        if (b !== btn) b.classList.remove('open');
      });
      
      // Toggle this dropdown
      menu.classList.toggle('open');
      btn.classList.toggle('open');
      
      console.log('🔘 Dropdown toggled:', !isOpen);
    });

    // Close dropdown when clicking outside
    document.addEventListener('click', function(e) {
      if (!container.contains(e.target)) {
        menu.classList.remove('open');
        btn.classList.remove('open');
      }
    });

    // Handle option selection
    const dropdownOptions = menu.querySelectorAll('.filter-sort-option');
    dropdownOptions.forEach(option => {
      option.addEventListener('click', function(e) {
        e.stopPropagation();
        const value = this.getAttribute('data-value');
        
        // Get label text only (exclude SVG)
        const labelText = Array.from(this.childNodes)
          .filter(node => node.nodeType === Node.TEXT_NODE)
          .map(node => node.textContent.trim())
          .join(' ')
          .trim();
        
        const icon = this.querySelector('svg')?.outerHTML || '';
        
        console.log('🔍 Option selected:', value, labelText);
        
        // Update active state
        dropdownOptions.forEach(opt => opt.classList.remove('active'));
        this.classList.add('active');
        
        // Update button text and icon
        btnContent.innerHTML = `
          ${icon}
          <span class="filter-sort-btn-text">${labelText}</span>
        `;
        
        // No active state on button - same as tour-image-manager
        
        // Close dropdown
        menu.classList.remove('open');
        btn.classList.remove('open');
        
        // Trigger callback
        if (onChange && typeof onChange === 'function') {
          onChange(value, labelText);
        }
      });
    });

    // Public API
    return {
      reset: function() {
        const firstOption = options[0];
        if (firstOption) {
          const firstBtn = dropdownOptions[0];
          if (firstBtn) {
            firstBtn.click();
          }
        }
      },
      setValue: function(value) {
        const option = Array.from(dropdownOptions).find(opt => 
          opt.getAttribute('data-value') === value
        );
        if (option) {
          option.click();
        }
      },
      destroy: function() {
        container.innerHTML = '';
      }
    };
  }

  return {
    initDropdown
  };
})();

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
  module.exports = FilterSortDropdownComponent;
}
