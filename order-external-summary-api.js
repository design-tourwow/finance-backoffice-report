// order-external-summary-api.js — Order External Summary API service
// Exposes window.OrderExternalAPI (IIFE)
// Depends on: token-utils.js (window.TokenUtils), window.FE2_API_BASE_URL

(function () {
  'use strict';

  var API_BASE = window.FE2_API_BASE_URL || 'https://be-2-report.vercel.app';

  function buildHeaders() {
    var token = window.TokenUtils ? window.TokenUtils.getToken() : null;
    var headers = { 'Content-Type': 'application/json' };
    if (token) {
      headers['Authorization'] = 'Bearer ' + token;
    }
    return headers;
  }

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

    var params = new URLSearchParams();

    if (filters.year)         params.append('year',         String(filters.year));
    if (filters.month)        params.append('month',        String(filters.month));
    if (filters.country_id && filters.country_id > 0)
                              params.append('country_id',   String(filters.country_id));
    if (filters.job_position) params.append('job_position', filters.job_position);
    if (filters.team_number)  params.append('team_number',  String(filters.team_number));
    if (filters.user_id)      params.append('user_id',      String(filters.user_id));

    var url = API_BASE + '/api/reports/order-external-summary?' + params.toString();
    console.log('[OrderExternalAPI] GET', url);

    var response = await window.fetch(url, {
      method: 'GET',
      headers: buildHeaders()
    });

    if (response.status === 401) {
      if (window.TokenUtils) {
        window.TokenUtils.redirectToLogin('Token หมดอายุหรือไม่ถูกต้อง\nกรุณาเข้าสู่ระบบใหม่อีกครั้ง');
      }
      throw new Error('Unauthorized');
    }

    if (!response.ok) {
      throw new Error('API error ' + response.status + ': ' + response.statusText);
    }

    var data = await response.json();

    if (Array.isArray(data)) return data;
    if (data && typeof data === 'object' && Array.isArray(data.data)) return data.data;

    console.warn('[OrderExternalAPI] Unexpected response format:', data);
    return [];
  }

  window.OrderExternalAPI = { fetch: fetch };

})();
