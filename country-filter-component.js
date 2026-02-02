/**
 * Country Filter Component
 * Standalone component for filtering by country
 */

const CountryFilterComponent = (function() {
  'use strict';

  // State
  let state = {
    allCountries: [],
    availableCountries: [],
    selectedCountries: [],
  };

  // Callbacks
  let callbacks = {
    onFilterChange: null,
    fetchCountries: null,
  };

  // Config
  let config = {
    containerId: 'countryFilterContainer',
  };

  /**
   * Initialize the filter component
   * @param {Object} options - Configuration options
   */
  async function init(options = {}) {
    // Set config
    if (options.containerId) config.containerId = options.containerId;

    // Set callbacks
    callbacks.onFilterChange = options.onFilterChange || (() => {});
    callbacks.fetchCountries = options.fetchCountries || (() => Promise.resolve({ data: [] }));

    // Render HTML
    renderFilterHTML();

    // Load initial data
    await loadCountryData();

    // Initialize UI handlers
    initCountryDropdown();

    console.log('✅ CountryFilterComponent initialized');
  }

  /**
   * Render filter HTML
   */
  function renderFilterHTML() {
    const container = document.getElementById(config.containerId);
    if (!container) {
      console.error('Country filter container not found:', config.containerId);
      return;
    }

    container.innerHTML = `
      <div class="time-dropdown-wrapper">
        <button class="time-btn" id="countryFilterBtn">
          <span class="time-btn-text">เลือกประเทศ</span>
          <svg class="time-btn-arrow" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="6 9 12 15 18 9"/>
          </svg>
        </button>
        <div class="time-dropdown-menu country-dropdown-menu" id="countryFilterDropdown">
          <div class="dropdown-search-wrapper">
            <input type="text" class="dropdown-search-input" id="countrySearchInput" placeholder="ค้นหาประเทศ..." />
          </div>
          <div class="dropdown-items-container" id="countryItemsContainer">
            <!-- Countries will be populated here -->
          </div>
          <div class="dropdown-actions">
            <button type="button" class="dropdown-clear-btn" id="countryFilterClearBtn">ล้าง</button>
            <button type="button" class="dropdown-confirm-btn" id="countryFilterConfirmBtn">ยืนยัน</button>
          </div>
        </div>
      </div>

      <!-- Selected Country Badge -->
      <div class="selected-period-badge" id="selectedCountryBadge" style="display: none;"></div>
    `;
  }

  /**
   * Load country data from API
   */
  async function loadCountryData() {
    try {
      const response = await callbacks.fetchCountries();
      if (response && response.success && response.data) {
        state.allCountries = response.data;
        state.availableCountries = response.data;
        renderCountryItems(state.availableCountries);
      }
    } catch (error) {
      console.error('❌ Failed to load country data:', error);
    }
  }

  /**
   * Initialize country dropdown
   */
  function initCountryDropdown() {
    const countryBtn = document.getElementById('countryFilterBtn');
    const countryDropdown = document.getElementById('countryFilterDropdown');
    const countrySearchInput = document.getElementById('countrySearchInput');
    const confirmBtn = document.getElementById('countryFilterConfirmBtn');
    const clearBtn = document.getElementById('countryFilterClearBtn');

    if (!countryBtn || !countryDropdown) return;

    // Toggle dropdown
    countryBtn.addEventListener('click', function(e) {
      e.stopPropagation();
      closeAllDropdowns();
      countryDropdown.classList.toggle('show');
      if (countryDropdown.classList.contains('show') && countrySearchInput) {
        countrySearchInput.value = '';
        renderCountryItems(state.availableCountries);
        countrySearchInput.focus();
      }
    });

    // Search filter
    if (countrySearchInput) {
      countrySearchInput.addEventListener('input', function(e) {
        const searchTerm = e.target.value.toLowerCase();
        const filtered = state.availableCountries.filter(c =>
          c.name_th.toLowerCase().includes(searchTerm) ||
          c.name_en.toLowerCase().includes(searchTerm)
        );
        renderCountryItems(filtered);
      });
    }

    // Prevent dropdown close when clicking inside
    countryDropdown.addEventListener('click', function(e) {
      e.stopPropagation();
    });

    // Confirm button
    if (confirmBtn) {
      confirmBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        confirmCountrySelection();
      });
    }

    // Clear button
    if (clearBtn) {
      clearBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        clearCountryDropdownSelection();
      });
    }

    // Close dropdowns when clicking outside
    document.addEventListener('click', function() {
      closeAllDropdowns();
    });
  }

  /**
   * Render country items in dropdown
   */
  function renderCountryItems(countries) {
    const container = document.getElementById('countryItemsContainer');
    if (!container) return;

    container.innerHTML = countries.map(country => {
      const isSelected = state.selectedCountries.some(c => c.id === country.id);
      return `
        <div class="time-dropdown-item country-item ${isSelected ? 'selected' : ''}" data-country-id="${country.id}" data-country-name="${country.name_th}">
          <label class="dropdown-checkbox">
            <input type="checkbox" class="country-checkbox" ${isSelected ? 'checked' : ''} />
            <span class="checkbox-custom"></span>
          </label>
          <span class="dropdown-item-label">${country.name_th}</span>
          <span class="dropdown-item-count">${country.name_en}</span>
        </div>
      `;
    }).join('');

    // Attach click handlers
    container.querySelectorAll('.country-item').forEach(item => {
      item.addEventListener('click', function(e) {
        e.stopPropagation();
        const checkbox = this.querySelector('.country-checkbox');
        if (checkbox && e.target !== checkbox && !e.target.closest('.dropdown-checkbox')) {
          checkbox.checked = !checkbox.checked;
        }
        this.classList.toggle('selected', checkbox?.checked);
      });

      const checkbox = item.querySelector('.country-checkbox');
      if (checkbox) {
        checkbox.addEventListener('click', function(e) {
          e.stopPropagation();
          setTimeout(() => {
            item.classList.toggle('selected', this.checked);
          }, 0);
        });
      }
    });
  }

  /**
   * Confirm country selection
   */
  function confirmCountrySelection() {
    const container = document.getElementById('countryItemsContainer');
    if (!container) return;

    state.selectedCountries = [];
    container.querySelectorAll('.country-item.selected, .country-item:has(.country-checkbox:checked)').forEach(item => {
      const id = parseInt(item.dataset.countryId);
      const name = item.dataset.countryName;
      state.selectedCountries.push({ id, name });
    });

    updateCountryButtonText();
    document.getElementById('countryFilterDropdown')?.classList.remove('show');
    updateSelectedCountryBadge();

    // Trigger filter change callback
    callbacks.onFilterChange();
  }

  /**
   * Clear country dropdown selection
   */
  function clearCountryDropdownSelection() {
    const container = document.getElementById('countryItemsContainer');
    if (container) {
      container.querySelectorAll('.country-item').forEach(item => {
        item.classList.remove('selected');
        const checkbox = item.querySelector('.country-checkbox');
        if (checkbox) checkbox.checked = false;
      });
    }
  }

  /**
   * Update country button text
   */
  function updateCountryButtonText() {
    const btn = document.getElementById('countryFilterBtn');
    const btnText = btn?.querySelector('.time-btn-text');
    if (btnText) {
      if (state.selectedCountries.length === 0) {
        btnText.textContent = 'เลือกประเทศ';
        btn?.classList.remove('active');
      } else if (state.selectedCountries.length === 1) {
        btnText.textContent = state.selectedCountries[0].name;
        btn?.classList.add('active');
      } else {
        btnText.textContent = `${state.selectedCountries.length} ประเทศ`;
        btn?.classList.add('active');
      }
    }
  }

  /**
   * Update selected country badge
   */
  function updateSelectedCountryBadge() {
    const badge = document.getElementById('selectedCountryBadge');
    if (!badge) return;

    if (state.selectedCountries.length === 0) {
      badge.style.display = 'none';
      return;
    }

    let label = state.selectedCountries.length === 1
      ? state.selectedCountries[0].name
      : `${state.selectedCountries.length} ประเทศ`;

    badge.innerHTML = `
      <span>${label}</span>
      <button class="badge-clear" onclick="CountryFilterComponent.clearFilter()">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="18" y1="6" x2="6" y2="18"/>
          <line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      </button>
    `;
    badge.style.display = 'flex';
  }

  /**
   * Clear country filter
   */
  function clearFilter() {
    state.selectedCountries = [];

    const btn = document.getElementById('countryFilterBtn');
    if (btn) {
      btn.classList.remove('active');
      const btnText = btn.querySelector('.time-btn-text');
      if (btnText) btnText.textContent = 'เลือกประเทศ';
    }

    clearCountryDropdownSelection();

    const badge = document.getElementById('selectedCountryBadge');
    if (badge) badge.style.display = 'none';

    // Trigger filter change callback
    callbacks.onFilterChange();
  }

  /**
   * Close all dropdowns
   */
  function closeAllDropdowns() {
    document.querySelectorAll('.time-dropdown-menu.show').forEach(menu => {
      menu.classList.remove('show');
    });
  }

  /**
   * Get current filters
   */
  function getFilters() {
    const filters = {};

    if (state.selectedCountries.length > 0) {
      filters.country_id = state.selectedCountries.map(c => c.id).join(',');
    }

    return filters;
  }

  /**
   * Update available countries (called from external source)
   */
  function updateAvailableCountries(countries) {
    state.availableCountries = countries;

    // Clear previously selected countries that are no longer available
    const availableIds = countries.map(c => c.id);
    state.selectedCountries = state.selectedCountries.filter(sc =>
      availableIds.includes(sc.id)
    );

    renderCountryItems(state.availableCountries);
    updateCountryButtonText();
    updateSelectedCountryBadge();
  }

  /**
   * Reset to all countries
   */
  function resetToAllCountries() {
    state.availableCountries = state.allCountries;
    renderCountryItems(state.allCountries);
  }

  // Public API
  return {
    init,
    getFilters,
    clearFilter,
    updateAvailableCountries,
    resetToAllCountries,
  };
})();

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
  module.exports = CountryFilterComponent;
}
