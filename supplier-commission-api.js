// supplier-commission-api.js
// Exposes window.SupplierCommissionAPI
// Depends on: window.FE2_API_BASE_URL, window.TokenUtils

(function () {
  'use strict';

  var BASE_URL = window.FE2_API_BASE_URL || 'https://be-2-report.vercel.app';

  function buildHeaders() {
    var token = window.TokenUtils ? window.TokenUtils.getToken() : null;
    var headers = { 'Content-Type': 'application/json' };
    if (token) {
      headers['Authorization'] = 'Bearer ' + token;
    }
    return headers;
  }

  async function request(endpoint) {
    var response = await fetch(BASE_URL + endpoint, {
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
      throw new Error('HTTP error ' + response.status + ' from ' + endpoint);
    }

    return response.json();
  }

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
    var qs = new URLSearchParams();

    if (params.year)          qs.append('year',         String(params.year));
    if (params.quarter)       qs.append('quarter',      String(params.quarter));
    if (params.month)         qs.append('month',        String(params.month));
    if (params.country_id && params.country_id > 0)
                              qs.append('country_id',   String(params.country_id));
    if (params.job_position)  qs.append('job_position', params.job_position);
    if (params.team_number)   qs.append('team_number',  String(params.team_number));
    if (params.user_id)       qs.append('user_id',      String(params.user_id));

    var url = '/api/reports/supplier-performance?' + qs.toString();
    console.log('[SupplierCommissionAPI] GET', BASE_URL + url);

    var response = await request(url);
    return normaliseArray(response, 'supplier-performance');
  }

  window.SupplierCommissionAPI = {
    fetchReport: fetchReport
  };

})();
