// request-discount-api.js — API service for Request Discount report
// Exposes window.RequestDiscountAPI (IIFE)
// Depends on: window.FE2Http (fe2-http.js)

(function () {
  'use strict';

  /**
   * Fetch order discount report data.
   * Maps to GET /api/reports/order-has-discount
   *
   * @param {Object} params
   * @param {string}  [params.filterMode]   - 'all' | 'quarterly' | 'monthly' | 'yearly'
   * @param {number}  [params.year]
   * @param {number}  [params.quarter]
   * @param {number}  [params.month]
   * @param {number}  [params.country_id]
   * @param {string}  [params.job_position]
   * @param {number}  [params.team_number]
   * @param {number}  [params.user_id]
   * @returns {Promise<Array>} OrderDiscountData[]
   */
  async function fetchReport(params) {
    params = params || {};

    var query = {
      year: params.filterMode !== 'all' ? params.year : null,
      quarter: params.filterMode === 'quarterly' ? params.quarter : null,
      month: params.filterMode === 'monthly' ? params.month : null,
      country_id: params.country_id && params.country_id > 0 ? params.country_id : null,
      job_position: params.job_position,
      team_number: params.team_number,
      user_id: params.user_id
    };

    var response = await window.FE2Http.get('/api/reports/order-has-discount', { params: query });

    if (Array.isArray(response)) return response;
    if (response && typeof response === 'object' && Array.isArray(response.data)) return response.data;

    console.warn('[RequestDiscountAPI] Unexpected response format:', response);
    return [];
  }

  window.RequestDiscountAPI = {
    fetch: fetchReport
  };

})();
