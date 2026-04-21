// order-external-summary-api.js — Order External Summary API service
// Exposes window.OrderExternalAPI (IIFE)
// Depends on: window.FE2Http (fe2-http.js)

(function () {
  'use strict';

  /**
   * Fetch order-external-summary report.
   * @param {Object} filters
   * @param {number}  [filters.year]
   * @param {number}  [filters.month]
   * @param {number}  [filters.country_id]
   * @param {string}  [filters.job_position]
   * @param {number}  [filters.team_number]
   * @param {number}  [filters.user_id]
   * @returns {Promise<Array>}
   */
  async function fetch(filters) {
    filters = filters || {};

    var query = {
      year: filters.year,
      month: filters.month,
      country_id: filters.country_id && filters.country_id > 0 ? filters.country_id : null,
      job_position: filters.job_position,
      team_number: filters.team_number,
      user_id: filters.user_id
    };

    var data = await window.FE2Http.get('/api/reports/order-external-summary', { params: query });

    if (Array.isArray(data)) return data;
    if (data && typeof data === 'object' && Array.isArray(data.data)) return data.data;

    console.warn('[OrderExternalAPI] Unexpected response format:', data);
    return [];
  }

  window.OrderExternalAPI = { fetch: fetch };

})();
