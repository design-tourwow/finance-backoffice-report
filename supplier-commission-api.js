// supplier-commission-api.js
// Exposes window.SupplierCommissionAPI
// Depends on: window.FE2Http (fe2-http.js)

(function () {
  'use strict';

  function normaliseArray(response, label) {
    if (Array.isArray(response)) return response;
    if (response && response.data && Array.isArray(response.data)) return response.data;
    console.warn('[SupplierCommissionAPI] Unexpected response format for ' + label + ':', response);
    return [];
  }

  /**
   * Fetch supplier performance report.
   * @param {Object} params
   * @param {number}  [params.year]
   * @param {number}  [params.quarter]
   * @param {number}  [params.month]
   * @param {number}  [params.country_id]
   * @param {string}  [params.job_position]
   * @param {number}  [params.team_number]
   * @param {number}  [params.user_id]
   * @returns {Promise<Array>}
   */
  async function fetchReport(params) {
    params = params || {};

    var query = {
      year: params.year,
      quarter: params.quarter,
      month: params.month,
      country_id: params.country_id && params.country_id > 0 ? params.country_id : null,
      job_position: params.job_position,
      team_number: params.team_number,
      user_id: params.user_id
    };

    var response = await window.FE2Http.get('/api/reports/supplier-performance', { params: query });
    return normaliseArray(response, 'supplier-performance');
  }

  window.SupplierCommissionAPI = {
    fetchReport: fetchReport
  };

})();
