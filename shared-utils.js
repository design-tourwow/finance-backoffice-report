// shared-utils.js — Shared Thai-locale formatting + period helpers
// Exposes window.SharedUtils (IIFE)

(function () {
  'use strict';

  // ---------------------------------------------------------------------------
  // Currency
  // ---------------------------------------------------------------------------

  /**
   * Format a numeric value as Thai-locale integer (no decimals).
   * @param {number} value
   * @returns {string}
   */
  function formatCurrency(value) {
    return new Intl.NumberFormat('th-TH', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  }

  // ---------------------------------------------------------------------------
  // Date helpers
  // ---------------------------------------------------------------------------

  /**
   * Format a date string as DD/MM/YYYY with Buddhist year (+543).
   * Ported from OrderExternalSummary.tsx inline helper.
   * @param {string} dateString
   * @returns {string}
   */
  function formatDateTH(dateString) {
    var d = new Date(dateString);
    var day = String(d.getDate()).padStart(2, '0');
    var month = String(d.getMonth() + 1).padStart(2, '0');
    var year = d.getFullYear() + 543;
    return day + '/' + month + '/' + year;
  }

  function getCurrentYear() {
    return new Date().getFullYear();
  }

  function getCurrentQuarter() {
    var month = new Date().getMonth() + 1; // 0-based → 1-based
    return Math.ceil(month / 3);
  }

  // ---------------------------------------------------------------------------
  // Dropdown option helpers
  // ---------------------------------------------------------------------------

  /**
   * Returns array of year numbers: current year + 4 previous years.
   * @returns {number[]}
   */
  function getYearOptions() {
    var currentYear = getCurrentYear();
    var years = [];
    for (var i = 0; i < 5; i++) {
      years.push(currentYear - i);
    }
    return years;
  }

  /**
   * Returns 12 Thai month objects {value, label}.
   * @returns {Array<{value: number, label: string}>}
   */
  function getMonthOptions() {
    return [
      { value: 1,  label: 'มกราคม' },
      { value: 2,  label: 'กุมภาพันธ์' },
      { value: 3,  label: 'มีนาคม' },
      { value: 4,  label: 'เมษายน' },
      { value: 5,  label: 'พฤษภาคม' },
      { value: 6,  label: 'มิถุนายน' },
      { value: 7,  label: 'กรกฎาคม' },
      { value: 8,  label: 'สิงหาคม' },
      { value: 9,  label: 'กันยายน' },
      { value: 10, label: 'ตุลาคม' },
      { value: 11, label: 'พฤศจิกายน' },
      { value: 12, label: 'ธันวาคม' }
    ];
  }

  /**
   * Returns 4 quarter objects rolling back from current quarter.
   * @returns {Array<{label: string, year: number, quarter: number}>}
   */
  function getQuarterOptions() {
    var currentYear = getCurrentYear();
    var currentQuarter = getCurrentQuarter();
    var options = [];

    for (var i = 0; i < 4; i++) {
      var quarter = currentQuarter - i;
      var year = currentYear;

      if (quarter <= 0) {
        quarter += 4;
        year -= 1;
      }

      var label = i === 0
        ? 'Q' + quarter + '/' + year + ' (Current)'
        : 'Q' + quarter + '/' + year;

      options.push({ label: label, year: year, quarter: quarter });
    }

    return options;
  }

  // ---------------------------------------------------------------------------
  // Country / position helpers
  // ---------------------------------------------------------------------------

  /**
   * Sort an array of country objects by name_th using Thai locale.
   * Does not mutate the original array.
   * @param {Array<{name_th: string}>} countries
   * @returns {Array}
   */
  function sortCountriesByThai(countries) {
    return countries.slice().sort(function (a, b) {
      return a.name_th.localeCompare(b.name_th, 'th-TH', {
        numeric: true,
        sensitivity: 'base'
      });
    });
  }

  /**
   * Filter job positions to only 'ts' and 'crm', adding a display_name.
   * Optionally filter further by teamId (if provided and item has team_number).
   *
   * @param {Array<{job_position: string, [key: string]: any}>} jobPositions
   * @param {number|undefined} [teamId] - optional team filter
   * @returns {Array}
   */
  function filterAndDisplayJobPositions(jobPositions, teamId) {
    return jobPositions
      .filter(function (position) {
        var jobPos = position.job_position.toLowerCase();
        var matchesType = jobPos === 'ts' || jobPos === 'crm';
        if (!matchesType) return false;
        if (teamId !== undefined && teamId !== null && position.team_number !== undefined) {
          return position.team_number === teamId;
        }
        return true;
      })
      .map(function (position) {
        return Object.assign({}, position, {
          display_name: position.job_position.toLowerCase() === 'ts' ? 'เซลล์' : 'CRM'
        });
      });
  }

  // ---------------------------------------------------------------------------
  // Expose
  // ---------------------------------------------------------------------------

  window.SharedUtils = {
    formatCurrency: formatCurrency,
    formatDateTH: formatDateTH,
    getCurrentYear: getCurrentYear,
    getCurrentQuarter: getCurrentQuarter,
    getYearOptions: getYearOptions,
    getMonthOptions: getMonthOptions,
    getQuarterOptions: getQuarterOptions,
    sortCountriesByThai: sortCountriesByThai,
    filterAndDisplayJobPositions: filterAndDisplayJobPositions
  };

})();
