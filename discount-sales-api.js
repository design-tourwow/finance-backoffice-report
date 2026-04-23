// discount-sales-api.js — Discount Sales API service
// Exposes window.DiscountSalesAPI (IIFE)
// Depends on: window.SharedHttp (shared-http.js)

(function () {
  'use strict';

  /**
   * Fetch discount sales report.
   * @param {Object} filters
   * @param {string}  filters.filterMode   - 'all' | 'quarterly' | 'monthly' | 'yearly'
   * @param {number}  [filters.year]
   * @param {number}  [filters.quarter]
   * @param {number}  [filters.month]
   * @param {number|string} [filters.country_id] — one id, or csv "1,2,3"
   * @param {string}  [filters.job_position]
   * @param {number}  [filters.team_number]
   * @param {number}  [filters.user_id]
   * @returns {Promise<Array>}
   */
  async function fetch(filters) {
    filters = filters || {};

    var query = {
      year: filters.filterMode !== 'all' ? filters.year : null,
      quarter: filters.filterMode === 'quarterly' ? filters.quarter : null,
      month: filters.filterMode === 'monthly' ? filters.month : null,
      country_id: filters.country_id ? filters.country_id : null,
      job_position: filters.job_position,
      team_number: filters.team_number,
      user_id: filters.user_id
    };

    var data = await window.SharedHttp.get('/api/reports/sales-discount', { params: query });

    if (Array.isArray(data)) return data;
    if (data && typeof data === 'object' && Array.isArray(data.data)) return data.data;

    console.warn('[DiscountSalesAPI] Unexpected response format:', data);
    return [];
  }

  window.DiscountSalesAPI = { fetch: fetch };

})();
