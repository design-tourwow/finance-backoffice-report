// Filter & Sort Dropdown Component
// Single-select dropdown for filtering and sorting
const FilterSortDropdownComponent = (function() {
  'use strict';
  const CLOSE_OVERLAY_EVENT = 'app:close-dropdown-overlays';

  console.log('🔧 FilterSortDropdownComponent loaded - Version 2.0 with label span fix');

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

    function findOptionByValue(value) {
      return options.find(function (opt) {
        return String(opt.value) === String(value);
      }) || null;
    }

    function iconMarkup(iconHtml) {
      return iconHtml ? iconHtml : '';
    }

    var activeOption = options.find(function (opt) { return !!opt.active; }) || options[0] || null;
    var initialIcon = activeOption && activeOption.icon ? activeOption.icon : defaultIcon;

    // Create dropdown HTML
    container.innerHTML = `
      <div class="filter-sort-dropdown">
        <button type="button" class="filter-sort-btn" id="${btnId}">
          <div class="filter-sort-btn-content">
            ${iconMarkup(initialIcon) || `
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
              ${iconMarkup(opt.icon)}
              <span class="filter-sort-option-label">${opt.label}</span>
            </button>
          `).join('')}
        </div>
      </div>
    `;

    const btn = document.getElementById(btnId);
    const menu = document.getElementById(menuId);
    const btnText = btn.querySelector('.filter-sort-btn-text');
    const btnContent = btn.querySelector('.filter-sort-btn-content');

    function closeMenu() {
      menu.classList.remove('open');
      btn.classList.remove('open');
    }

    // Toggle dropdown
    btn.addEventListener('click', function(e) {
      e.stopPropagation();
      const isOpen = menu.classList.contains('open');

      if (!isOpen) {
        document.dispatchEvent(new CustomEvent(CLOSE_OVERLAY_EVENT));
      }

      // Toggle this dropdown
      menu.classList.toggle('open', !isOpen);
      btn.classList.toggle('open', !isOpen);
      
      console.log('🔘 Dropdown toggled:', !isOpen);
    });

    document.addEventListener(CLOSE_OVERLAY_EVENT, closeMenu);

    // Close dropdown when clicking outside
    document.addEventListener('click', function(e) {
      if (!container.contains(e.target)) {
        closeMenu();
      }
    });

    // Handle option selection
    const dropdownOptions = menu.querySelectorAll('.filter-sort-option');
    function getTriggerIconHTML(optionValue) {
      var selected = findOptionByValue(optionValue);
      if (selected && selected.icon) return selected.icon;
      if (defaultIcon) return defaultIcon;
      var initial = btn.querySelector('.filter-sort-btn-content svg, .filter-sort-btn-content img');
      return initial ? initial.outerHTML : '';
    }

    dropdownOptions.forEach(option => {
      option.addEventListener('click', function(e) {
        e.stopPropagation();
        const value = this.getAttribute('data-value');

        // Get label from span
        const labelSpan = this.querySelector('.filter-sort-option-label');
        const labelText = labelSpan ? labelSpan.textContent.trim() : '';

        // Update active state
        dropdownOptions.forEach(opt => opt.classList.remove('active'));
        this.classList.add('active');

        // Get fresh reference to button content (in case it was re-created)
        const currentBtn = document.getElementById(btnId);
        const currentBtnContent = currentBtn ? currentBtn.querySelector('.filter-sort-btn-content') : null;

        if (currentBtnContent) {
          currentBtnContent.innerHTML = `
            ${getTriggerIconHTML(value)}
            <span class="filter-sort-btn-text">${labelText}</span>
          `;
        }
        
        // Close dropdown
        closeMenu();
        
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
        document.removeEventListener(CLOSE_OVERLAY_EVENT, closeMenu);
        container.innerHTML = '';
      }
    };
  }

  return {
    initDropdown
  };
})();

// Classic <script> `const` bindings don't attach to window — expose so
// pages can reference via window.FilterSortDropdownComponent uniformly.
if (typeof window !== 'undefined') {
  window.FilterSortDropdownComponent = FilterSortDropdownComponent;
}

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
  module.exports = FilterSortDropdownComponent;
}
