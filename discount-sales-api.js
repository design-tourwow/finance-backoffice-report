// discount-sales-api.js — Discount Sales API service
// Exposes window.DiscountSalesAPI (IIFE)
// Depends on: token-utils.js (window.TokenUtils), window.FE2_API_BASE_URL

(function () {
  'use strict';

  var API_BASE = window.FE2_API_BASE_URL || 'https://be-2-report.vercel.app';

  function buildHeaders() {
    var token = TokenUtils.getToken();
    var headers = { 'Content-Type': 'application/json' };
    if (token) {
      headers['Authorization'] = 'Bearer ' + token;
    }
    return headers;
  }

  /**
   * Fetch discount sales report.
   * @param {Object} filters
   * @param {string}  filters.filterMode   - 'all' | 'quarterly' | 'monthly' | 'yearly'
   * @param {number}  [filters.year]
   * @param {number}  [filters.quarter]
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

    if (filters.filterMode !== 'all' && filters.year) {
      params.append('year', String(filters.year));
    }

    if (filters.filterMode === 'quarterly' && filters.quarter) {
      params.append('quarter', String(filters.quarter));
    } else if (filters.filterMode === 'monthly' && filters.month) {
      params.append('month', String(filters.month));
    }

    if (filters.country_id && filters.country_id > 0) {
      params.append('country_id', String(filters.country_id));
    }

    if (filters.job_position) {
      params.append('job_position', filters.job_position);
    }

    if (filters.team_number) {
      params.append('team_number', String(filters.team_number));
    }

    if (filters.user_id) {
      params.append('user_id', String(filters.user_id));
    }

    var url = API_BASE + '/api/reports/sales-discount?' + params.toString();
    console.log('[DiscountSalesAPI] GET', url);

    var response = await window.fetch(url, {
      method: 'GET',
      headers: buildHeaders()
    });

    if (response.status === 401) {
      TokenUtils.redirectToLogin('Token หมดอายุหรือไม่ถูกต้อง\nกรุณาเข้าสู่ระบบใหม่อีกครั้ง');
      throw new Error('Unauthorized');
    }

    if (!response.ok) {
      throw new Error('API error ' + response.status + ': ' + response.statusText);
    }

    var data = await response.json();

    // Normalise: array or {data: [...]} wrapper
    if (Array.isArray(data)) {
      return data;
    }
    if (data && typeof data === 'object' && Array.isArray(data.data)) {
      return data.data;
    }
    console.warn('[DiscountSalesAPI] Unexpected response format:', data);
    return [];
  }

  window.DiscountSalesAPI = { fetch: fetch };

})();
