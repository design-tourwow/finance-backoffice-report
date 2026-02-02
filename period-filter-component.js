/**
 * Period Filter Component
 * Standalone component for filtering by period (year/quarter/month)
 */

const PeriodFilterComponent = (function() {
  'use strict';

  // State
  let state = {
    availablePeriods: null,
    selectedPeriods: [],
    currentTimeGranularity: 'yearly',
  };

  // Callbacks
  let callbacks = {
    onFilterChange: null,
    fetchAvailablePeriods: null,
  };

  // Config
  let config = {
    containerId: 'periodFilterContainer',
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
    callbacks.fetchAvailablePeriods = options.fetchAvailablePeriods || (() => Promise.resolve({ data: { years: [] } }));

    // Render HTML
    renderFilterHTML();

    // Load initial data
    await loadPeriodData();

    // Initialize UI handlers
    initPeriodTypeSelector();
    initPeriodDropdowns();

    console.log('✅ PeriodFilterComponent initialized');
  }

  /**
   * Render filter HTML
   */
  function renderFilterHTML() {
    const container = document.getElementById(config.containerId);
    if (!container) {
      console.error('Period filter container not found:', config.containerId);
      return;
    }

    container.innerHTML = `
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

      <!-- Period Value Dropdowns (shown based on selected type) -->
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

      <!-- Selected Period Badge -->
      <div class="selected-period-badge" id="selectedPeriodBadge" style="display: none;"></div>
    `;
  }

  /**
   * Load period data from API
   */
  async function loadPeriodData(filters = {}) {
    try {
      const response = await callbacks.fetchAvailablePeriods(filters);
      if (response && response.success && response.data) {
        state.availablePeriods = response.data;
        populateTimeDropdowns();
      }
    } catch (error) {
      console.error('❌ Failed to load period data:', error);
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
  function confirmPeriodSelection(type) {
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

    // Trigger filter change callback
    callbacks.onFilterChange();
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
      <button class="badge-clear" onclick="PeriodFilterComponent.clearFilter()">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="18" y1="6" x2="6" y2="18"/>
          <line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      </button>
    `;
    badge.style.display = 'flex';
  }

  /**
   * Clear period filter
   */
  function clearFilter() {
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

    // Trigger filter change callback
    callbacks.onFilterChange();
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

    return filters;
  }

  /**
   * Update available periods (called from external source)
   */
  async function updateAvailablePeriods(filters = {}) {
    await loadPeriodData(filters);
  }

  // Public API
  return {
    init,
    getFilters,
    clearFilter,
    updateAvailablePeriods,
  };
})();

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
  module.exports = PeriodFilterComponent;
}
