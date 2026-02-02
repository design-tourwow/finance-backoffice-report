/**
 * Period & Country Filter Component
 * Shared component for filtering by period (year/quarter/month) and country
 * Used in: sales-by-country, wholesale-destinations
 */

const PeriodCountryFilterComponent = (function() {
  'use strict';

  // State
  let state = {
    availablePeriods: null,
    availableCountries: [],
    selectedPeriods: [],
    selectedCountries: [],
    currentTimeGranularity: 'yearly',
    allCountries: [], // Original full list
  };

  // Callbacks
  let callbacks = {
    onFilterChange: null,
    fetchReportData: null,
    fetchAvailablePeriods: null,
    fetchCountries: null,
  };

  // Config
  let config = {
    containerSelector: '.time-granularity-control',
  };

  /**
   * Initialize the filter component
   * @param {Object} options - Configuration options
   */
  async function init(options = {}) {
    // Set callbacks
    callbacks.onFilterChange = options.onFilterChange || (() => {});
    callbacks.fetchReportData = options.fetchReportData || (() => Promise.resolve({ data: [] }));
    callbacks.fetchAvailablePeriods = options.fetchAvailablePeriods || (() => Promise.resolve({ data: { years: [] } }));
    callbacks.fetchCountries = options.fetchCountries || (() => Promise.resolve({ data: [] }));

    // Load initial data
    await loadInitialData();

    // Initialize UI handlers
    initPeriodTypeSelector();
    initPeriodDropdowns();
    initCountryFilter();

    console.log('✅ PeriodCountryFilterComponent initialized');
  }

  /**
   * Load initial data (periods and countries)
   */
  async function loadInitialData() {
    try {
      // Fetch available periods
      const periodsResponse = await callbacks.fetchAvailablePeriods();
      if (periodsResponse && periodsResponse.success && periodsResponse.data) {
        state.availablePeriods = periodsResponse.data;
        populateTimeDropdowns();
      }

      // Fetch countries
      const countriesResponse = await callbacks.fetchCountries();
      if (countriesResponse && countriesResponse.success && countriesResponse.data) {
        state.allCountries = countriesResponse.data;
        state.availableCountries = countriesResponse.data;
        renderCountryItems(state.availableCountries);
      }
    } catch (error) {
      console.error('❌ Failed to load filter data:', error);
    }
  }

  /**
   * Initialize period type selector (master dropdown)
   */
  function initPeriodTypeSelector() {
    const periodTypeBtn = document.getElementById('periodTypeBtn');
    const periodTypeDropdown = document.getElementById('periodTypeDropdown');

    if (!periodTypeBtn || !periodTypeDropdown) return;

    // Toggle dropdown on button click
    periodTypeBtn.addEventListener('click', function(e) {
      e.stopPropagation();
      closeAllDropdowns();
      periodTypeDropdown.classList.toggle('show');
    });

    // Handle period type selection
    periodTypeDropdown.querySelectorAll('.time-dropdown-item').forEach(item => {
      item.addEventListener('click', function(e) {
        e.stopPropagation();

        const periodType = this.dataset.periodType;
        const periodTypeLabels = {
          'yearly': 'รายปี',
          'quarterly': 'รายไตรมาส',
          'monthly': 'รายเดือน'
        };

        // Update period type button text
        const btnText = periodTypeBtn.querySelector('.time-btn-text');
        if (btnText) {
          btnText.textContent = periodTypeLabels[periodType];
        }
        periodTypeBtn.classList.add('active');

        // Reset ALL period value dropdowns
        resetAllPeriodDropdowns();

        // Show only the selected type dropdown
        const periodValueButtons = document.getElementById('periodValueButtons');
        if (periodValueButtons) {
          const targetWrapper = periodValueButtons.querySelector(`[data-type="${periodType}"]`);
          if (targetWrapper) {
            targetWrapper.style.display = 'block';
          }
        }

        // Close dropdown
        periodTypeDropdown.classList.remove('show');

        // Update selected item state
        periodTypeDropdown.querySelectorAll('.time-dropdown-item').forEach(i => {
          i.classList.remove('selected');
        });
        this.classList.add('selected');

        // Reset period selection
        state.selectedPeriods = [];
        state.currentTimeGranularity = periodType;

        // Hide the badge
        const badge = document.getElementById('selectedPeriodBadge');
        if (badge) badge.style.display = 'none';
      });
    });
  }

  /**
   * Reset all period dropdowns
   */
  function resetAllPeriodDropdowns() {
    const periodValueButtons = document.getElementById('periodValueButtons');
    if (!periodValueButtons) return;

    const defaultTexts = {
      'yearly': 'เลือกปี',
      'quarterly': 'เลือกไตรมาส',
      'monthly': 'เลือกเดือน'
    };

    periodValueButtons.querySelectorAll('.time-dropdown-wrapper').forEach(wrapper => {
      const type = wrapper.dataset.type;
      const btn = wrapper.querySelector('.time-btn');
      const btnText = btn?.querySelector('.time-btn-text');

      if (btnText && defaultTexts[type]) {
        btnText.textContent = defaultTexts[type];
      }
      if (btn) {
        btn.classList.remove('active');
      }

      // Clear all checkboxes and selected states
      wrapper.querySelectorAll('.time-dropdown-item').forEach(item => {
        item.classList.remove('selected');
        const checkbox = item.querySelector('.period-checkbox');
        if (checkbox) checkbox.checked = false;
      });

      wrapper.style.display = 'none';
    });
  }

  /**
   * Initialize period dropdowns
   */
  function initPeriodDropdowns() {
    // Initialize dropdown click handlers for period value dropdowns
    const dropdownWrappers = document.querySelectorAll('#periodValueButtons .time-dropdown-wrapper');
    dropdownWrappers.forEach(wrapper => {
      const btn = wrapper.querySelector('.time-btn');
      const dropdown = wrapper.querySelector('.time-dropdown-menu');

      if (btn && dropdown) {
        btn.addEventListener('click', function(e) {
          e.stopPropagation();
          closeAllDropdowns();
          dropdown.classList.toggle('show');
        });
      }
    });

    // Close dropdowns when clicking outside
    document.addEventListener('click', function() {
      closeAllDropdowns();
    });
  }

  /**
   * Populate time dropdowns with data
   */
  function populateTimeDropdowns() {
    if (!state.availablePeriods || !state.availablePeriods.years) return;

    const years = state.availablePeriods.years;

    // Helper to create dropdown content with checkboxes and confirm button
    function createDropdownContent(items, type) {
      let html = '<div class="dropdown-items-container">';
      html += items;
      html += '</div>';
      html += `
        <div class="dropdown-actions">
          <button type="button" class="dropdown-clear-btn" data-type="${type}">ล้าง</button>
          <button type="button" class="dropdown-confirm-btn" data-type="${type}">ยืนยัน</button>
        </div>
      `;
      return html;
    }

    // Yearly dropdown
    const yearlyDropdown = document.getElementById('yearlyDropdown');
    if (yearlyDropdown) {
      const items = years.map(year => `
        <div class="time-dropdown-item" data-type="yearly" data-year="${year.year_ce}" data-label="พ.ศ. ${year.label}">
          <label class="dropdown-checkbox">
            <input type="checkbox" class="period-checkbox" />
            <span class="checkbox-custom"></span>
          </label>
          <span class="dropdown-item-label">พ.ศ. ${year.label}</span>
          <span class="dropdown-item-count">${formatNumber(year.total_orders || 0)} orders</span>
        </div>
      `).join('');
      yearlyDropdown.innerHTML = createDropdownContent(items, 'yearly');
    }

    // Quarterly dropdown
    const quarterlyDropdown = document.getElementById('quarterlyDropdown');
    if (quarterlyDropdown) {
      let quarterlyItems = '';
      years.forEach(year => {
        if (year.quarters && year.quarters.length > 0) {
          quarterlyItems += `<div class="dropdown-year-header">พ.ศ. ${year.label}</div>`;
          year.quarters.forEach(q => {
            quarterlyItems += `
              <div class="time-dropdown-item" data-type="quarterly" data-year="${year.year_ce}" data-quarter="${q.quarter}" data-label="${q.label} ${year.label}">
                <label class="dropdown-checkbox">
                  <input type="checkbox" class="period-checkbox" />
                  <span class="checkbox-custom"></span>
                </label>
                <span class="dropdown-item-label">${q.label}</span>
              </div>
            `;
          });
        }
      });
      quarterlyDropdown.innerHTML = createDropdownContent(quarterlyItems, 'quarterly');
    }

    // Monthly dropdown
    const monthlyDropdown = document.getElementById('monthlyDropdown');
    if (monthlyDropdown) {
      let monthlyItems = '';
      years.forEach(year => {
        if (year.months && year.months.length > 0) {
          monthlyItems += `<div class="dropdown-year-header">พ.ศ. ${year.label}</div>`;
          year.months.forEach(m => {
            monthlyItems += `
              <div class="time-dropdown-item" data-type="monthly" data-year="${year.year_ce}" data-month="${m.month}" data-label="${m.label_short} ${year.label}">
                <label class="dropdown-checkbox">
                  <input type="checkbox" class="period-checkbox" />
                  <span class="checkbox-custom"></span>
                </label>
                <span class="dropdown-item-label">${m.label}</span>
              </div>
            `;
          });
        }
      });
      monthlyDropdown.innerHTML = createDropdownContent(monthlyItems, 'monthly');
    }

    // Attach event handlers
    attachPeriodItemHandlers();
    attachPeriodButtonHandlers();
  }

  /**
   * Attach click handlers to period items
   */
  function attachPeriodItemHandlers() {
    document.querySelectorAll('#periodValueButtons .time-dropdown-item').forEach(item => {
      item.addEventListener('click', function(e) {
        e.stopPropagation();
        const checkbox = this.querySelector('.period-checkbox');
        if (checkbox && e.target !== checkbox && !e.target.closest('.dropdown-checkbox')) {
          checkbox.checked = !checkbox.checked;
        }
        this.classList.toggle('selected', checkbox?.checked);
      });

      const checkbox = item.querySelector('.period-checkbox');
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
   * Attach handlers to confirm/clear buttons
   */
  function attachPeriodButtonHandlers() {
    document.querySelectorAll('.dropdown-confirm-btn[data-type]').forEach(btn => {
      btn.addEventListener('click', function(e) {
        e.stopPropagation();
        const type = this.dataset.type;
        if (type) confirmPeriodSelection(type);
      });
    });

    document.querySelectorAll('.dropdown-clear-btn[data-type]').forEach(btn => {
      btn.addEventListener('click', function(e) {
        e.stopPropagation();
        const type = this.dataset.type;
        if (type) clearDropdownSelection(type);
      });
    });
  }

  /**
   * Clear selection in a specific dropdown
   */
  function clearDropdownSelection(type) {
    const dropdownId = type + 'Dropdown';
    const dropdown = document.getElementById(dropdownId);
    if (dropdown) {
      dropdown.querySelectorAll('.time-dropdown-item').forEach(item => {
        item.classList.remove('selected');
        const checkbox = item.querySelector('.period-checkbox');
        if (checkbox) checkbox.checked = false;
      });
    }
  }

  /**
   * Confirm period selection
   */
  async function confirmPeriodSelection(type) {
    const dropdownId = type + 'Dropdown';
    const dropdown = document.getElementById(dropdownId);
    if (!dropdown) return;

    // Collect selected items
    state.selectedPeriods = [];
    dropdown.querySelectorAll('.time-dropdown-item.selected, .time-dropdown-item:has(.period-checkbox:checked)').forEach(item => {
      const year = parseInt(item.dataset.year);
      const quarter = item.dataset.quarter ? parseInt(item.dataset.quarter) : null;
      const month = item.dataset.month ? parseInt(item.dataset.month) : null;
      const label = item.dataset.label;
      state.selectedPeriods.push({ type, year, quarter, month, label });
    });

    state.currentTimeGranularity = type;

    // Update button text
    updatePeriodButtonText(type);

    // Close dropdown
    dropdown.classList.remove('show');

    // Update badge
    updateSelectedPeriodBadge();

    if (state.selectedPeriods.length > 0) {
      // Filter countries based on selected periods
      await updateCountryDropdownByPeriod();
      triggerFilterChange();
    } else {
      // Reset country dropdown to show all
      renderCountryItems(state.allCountries);
    }
  }

  /**
   * Update period button text
   */
  function updatePeriodButtonText(type) {
    const btn = document.querySelector(`[data-granularity="${type}"]`);
    const btnText = btn?.querySelector('.time-btn-text');
    if (btnText) {
      const defaultTexts = {
        'yearly': 'เลือกปี',
        'quarterly': 'เลือกไตรมาส',
        'monthly': 'เลือกเดือน'
      };
      if (state.selectedPeriods.length === 0) {
        btnText.textContent = defaultTexts[type];
        btn?.classList.remove('active');
      } else if (state.selectedPeriods.length === 1) {
        btnText.textContent = state.selectedPeriods[0].label;
        btn?.classList.add('active');
      } else {
        btnText.textContent = `${state.selectedPeriods.length} รายการ`;
        btn?.classList.add('active');
      }
    }
  }

  /**
   * Update selected period badge
   */
  function updateSelectedPeriodBadge() {
    const badge = document.getElementById('selectedPeriodBadge');
    if (!badge) return;

    if (state.selectedPeriods.length === 0) {
      badge.style.display = 'none';
      return;
    }

    let label = state.selectedPeriods.length === 1
      ? state.selectedPeriods[0].label
      : `${state.selectedPeriods.length} ช่วงเวลา`;

    badge.innerHTML = `
      <span>${label}</span>
      <button class="badge-clear" onclick="PeriodCountryFilterComponent.clearPeriodFilter()">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="18" y1="6" x2="6" y2="18"/>
          <line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      </button>
    `;
    badge.style.display = 'flex';
  }

  /**
   * Update country dropdown based on selected periods
   */
  async function updateCountryDropdownByPeriod() {
    if (state.selectedPeriods.length === 0) {
      renderCountryItems(state.allCountries);
      return;
    }

    // Calculate date range from selected periods
    let allDateFrom = null;
    let allDateTo = null;
    state.selectedPeriods.forEach(period => {
      const { dateFrom, dateTo } = getPeriodDateRange(period);
      if (!allDateFrom || dateFrom < allDateFrom) allDateFrom = dateFrom;
      if (!allDateTo || dateTo > allDateTo) allDateTo = dateTo;
    });

    try {
      const response = await callbacks.fetchReportData({
        booking_date_from: allDateFrom,
        booking_date_to: allDateTo
      });

      if (response && response.success && response.data) {
        // Extract countries from response
        let countryIdsWithData = [];

        // Handle different response structures
        if (Array.isArray(response.data)) {
          countryIdsWithData = response.data.map(item => item.country_id);
        } else if (response.data.wholesales) {
          // For wholesale destinations
          const countriesSet = new Set();
          response.data.wholesales.forEach(w => {
            if (w.countries) {
              w.countries.forEach(c => countriesSet.add(c.country_id));
            }
          });
          countryIdsWithData = Array.from(countriesSet);
        }

        // Filter available countries
        const filteredCountries = state.allCountries.filter(c =>
          countryIdsWithData.includes(c.id)
        );

        // Clear previously selected countries that are no longer available
        state.selectedCountries = state.selectedCountries.filter(sc =>
          countryIdsWithData.includes(sc.id)
        );

        state.availableCountries = filteredCountries;
        renderCountryItems(filteredCountries);
        updateCountryButtonText();
        updateSelectedCountryBadge();
      }
    } catch (error) {
      console.error('❌ Failed to filter countries by period:', error);
    }
  }

  /**
   * Initialize country filter
   */
  function initCountryFilter() {
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
  async function confirmCountrySelection() {
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

    if (state.selectedCountries.length > 0) {
      await updatePeriodDropdownsByCountry();
    } else {
      populateTimeDropdowns();
    }

    triggerFilterChange();
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
      <button class="badge-clear" onclick="PeriodCountryFilterComponent.clearCountryFilter()">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="18" y1="6" x2="6" y2="18"/>
          <line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      </button>
    `;
    badge.style.display = 'flex';
  }

  /**
   * Update period dropdowns based on selected countries
   */
  async function updatePeriodDropdownsByCountry() {
    if (state.selectedCountries.length === 0) {
      populateTimeDropdowns();
      return;
    }

    try {
      const countryIds = state.selectedCountries.map(c => c.id).join(',');
      const response = await callbacks.fetchAvailablePeriods({ country_id: countryIds });

      if (response && response.success && response.data) {
        state.availablePeriods = response.data;
        populateTimeDropdowns();
      }
    } catch (error) {
      console.error('❌ Failed to filter periods by country:', error);
    }
  }

  /**
   * Clear period filter
   */
  function clearPeriodFilter() {
    state.selectedPeriods = [];

    // Reset period type selector
    const periodTypeBtn = document.getElementById('periodTypeBtn');
    if (periodTypeBtn) {
      periodTypeBtn.classList.remove('active');
      const btnText = periodTypeBtn.querySelector('.time-btn-text');
      if (btnText) btnText.textContent = 'มุมมอง';
    }

    // Clear selected state in period type dropdown
    const periodTypeDropdown = document.getElementById('periodTypeDropdown');
    if (periodTypeDropdown) {
      periodTypeDropdown.querySelectorAll('.time-dropdown-item').forEach(item => {
        item.classList.remove('selected');
      });
    }

    // Reset all period dropdowns
    resetAllPeriodDropdowns();

    // Hide badge
    const badge = document.getElementById('selectedPeriodBadge');
    if (badge) badge.style.display = 'none';

    // Reset country dropdown to show all
    state.availableCountries = state.allCountries;
    renderCountryItems(state.allCountries);

    triggerFilterChange();
  }

  /**
   * Clear country filter
   */
  function clearCountryFilter() {
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

    // Reset period dropdowns
    populateTimeDropdowns();

    triggerFilterChange();
  }

  /**
   * Get period date range
   */
  function getPeriodDateRange(period) {
    const year = period.year;
    let dateFrom, dateTo;

    if (period.type === 'yearly') {
      dateFrom = `${year}-01-01`;
      dateTo = `${year}-12-31`;
    } else if (period.type === 'quarterly' && period.quarter) {
      const q = period.quarter;
      const startMonth = (q - 1) * 3 + 1;
      const endMonth = q * 3;
      dateFrom = `${year}-${String(startMonth).padStart(2, '0')}-01`;
      const lastDay = new Date(year, endMonth, 0).getDate();
      dateTo = `${year}-${String(endMonth).padStart(2, '0')}-${lastDay}`;
    } else if (period.type === 'monthly' && period.month) {
      const m = period.month;
      dateFrom = `${year}-${String(m).padStart(2, '0')}-01`;
      const lastDay = new Date(year, m, 0).getDate();
      dateTo = `${year}-${String(m).padStart(2, '0')}-${lastDay}`;
    }

    return { dateFrom, dateTo };
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
   * Trigger filter change callback
   */
  function triggerFilterChange() {
    const filters = {};

    // Add period filter
    if (state.selectedPeriods.length > 0) {
      let allDateFrom = null;
      let allDateTo = null;
      state.selectedPeriods.forEach(period => {
        const { dateFrom, dateTo } = getPeriodDateRange(period);
        if (!allDateFrom || dateFrom < allDateFrom) allDateFrom = dateFrom;
        if (!allDateTo || dateTo > allDateTo) allDateTo = dateTo;
      });
      filters.booking_date_from = allDateFrom;
      filters.booking_date_to = allDateTo;
    }

    // Add country filter
    if (state.selectedCountries.length > 0) {
      filters.country_id = state.selectedCountries.map(c => c.id).join(',');
    }

    callbacks.onFilterChange(filters);
  }

  /**
   * Format number with commas
   */
  function formatNumber(num) {
    if (num === null || num === undefined) return '0';
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  }

  /**
   * Get current filters
   */
  function getFilters() {
    const filters = {};

    if (state.selectedPeriods.length > 0) {
      let allDateFrom = null;
      let allDateTo = null;
      state.selectedPeriods.forEach(period => {
        const { dateFrom, dateTo } = getPeriodDateRange(period);
        if (!allDateFrom || dateFrom < allDateFrom) allDateFrom = dateFrom;
        if (!allDateTo || dateTo > allDateTo) allDateTo = dateTo;
      });
      filters.booking_date_from = allDateFrom;
      filters.booking_date_to = allDateTo;
    }

    if (state.selectedCountries.length > 0) {
      filters.country_id = state.selectedCountries.map(c => c.id).join(',');
    }

    return filters;
  }

  /**
   * Get filter HTML template
   */
  function getFilterHTML() {
    return `
      <div class="time-granularity-control">
        <span class="time-granularity-label">เลือกช่วงเวลา</span>

        <!-- Period Type Selector (Master Dropdown) -->
        <div class="time-dropdown-wrapper">
          <button class="time-btn period-type-btn" id="periodTypeBtn">
            <span class="time-btn-text">มุมมอง</span>
            <svg class="time-btn-arrow" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="6 9 12 15 18 9"/>
            </svg>
          </button>
          <div class="time-dropdown-menu" id="periodTypeDropdown">
            <div class="time-dropdown-item" data-period-type="yearly">
              <span class="dropdown-item-label">รายปี</span>
            </div>
            <div class="time-dropdown-item" data-period-type="quarterly">
              <span class="dropdown-item-label">รายไตรมาส</span>
            </div>
            <div class="time-dropdown-item" data-period-type="monthly">
              <span class="dropdown-item-label">รายเดือน</span>
            </div>
          </div>
        </div>

        <!-- Period Value Dropdowns -->
        <div class="time-granularity-buttons" id="periodValueButtons">
          <div class="time-dropdown-wrapper" data-type="yearly" style="display: none;">
            <button class="time-btn" data-granularity="yearly" id="yearlyBtn">
              <span class="time-btn-text">เลือกปี</span>
              <svg class="time-btn-arrow" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="6 9 12 15 18 9"/>
              </svg>
            </button>
            <div class="time-dropdown-menu" id="yearlyDropdown"></div>
          </div>
          <div class="time-dropdown-wrapper" data-type="quarterly" style="display: none;">
            <button class="time-btn" data-granularity="quarterly" id="quarterlyBtn">
              <span class="time-btn-text">เลือกไตรมาส</span>
              <svg class="time-btn-arrow" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="6 9 12 15 18 9"/>
              </svg>
            </button>
            <div class="time-dropdown-menu" id="quarterlyDropdown"></div>
          </div>
          <div class="time-dropdown-wrapper" data-type="monthly" style="display: none;">
            <button class="time-btn" data-granularity="monthly" id="monthlyBtn">
              <span class="time-btn-text">เลือกเดือน</span>
              <svg class="time-btn-arrow" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="6 9 12 15 18 9"/>
              </svg>
            </button>
            <div class="time-dropdown-menu" id="monthlyDropdown"></div>
          </div>
        </div>
        <div class="selected-period-badge" id="selectedPeriodBadge" style="display: none;"></div>

        <!-- Separator -->
        <div class="filter-separator"></div>

        <!-- Country Filter -->
        <span class="time-granularity-label">ประเทศ</span>
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
            <div class="dropdown-items-container" id="countryItemsContainer"></div>
            <div class="dropdown-actions">
              <button type="button" class="dropdown-clear-btn" id="countryFilterClearBtn">ล้าง</button>
              <button type="button" class="dropdown-confirm-btn" id="countryFilterConfirmBtn">ยืนยัน</button>
            </div>
          </div>
        </div>
        <div class="selected-period-badge" id="selectedCountryBadge" style="display: none;"></div>
      </div>
    `;
  }

  // Public API
  return {
    init,
    getFilters,
    getFilterHTML,
    clearPeriodFilter,
    clearCountryFilter,
  };
})();

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
  module.exports = PeriodCountryFilterComponent;
}
