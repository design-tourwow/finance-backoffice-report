// request-discount-api.js — API service for Request Discount report
// Exposes window.RequestDiscountAPI (IIFE)
// Depends on: token-utils.js (window.TokenUtils), window.FE2_API_BASE_URL

(function () {
  'use strict';

  var API_BASE_URL = window.FE2_API_BASE_URL || 'https://be-2-report.vercel.app';

  function buildHeaders() {
    var token = TokenUtils.getToken();
    var headers = { 'Content-Type': 'application/json' };
    if (token) {
      headers['Authorization'] = 'Bearer ' + token;
    }
    return headers;
  }

  async function request(endpoint) {
    var response = await fetch(API_BASE_URL + endpoint, {
      method: 'GET',
      headers: buildHeaders()
    });

    if (response.status === 401) {
      TokenUtils.redirectToLogin('Token หมดอายุหรือไม่ถูกต้อง\nกรุณาเข้าสู่ระบบใหม่อีกครั้ง');
      throw new Error('Unauthorized');
    }

    if (!response.ok) {
      throw new Error('HTTP error ' + response.status + ': ' + response.statusText);
    }

    return response.json();
  }

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

    var qs = new URLSearchParams();

    if (params.filterMode !== 'all' && params.year) {
      qs.append('year', String(params.year));
    }

    if (params.filterMode === 'quarterly' && params.quarter) {
      qs.append('quarter', String(params.quarter));
    } else if (params.filterMode === 'monthly' && params.month) {
      qs.append('month', String(params.month));
    }

    if (params.country_id && params.country_id > 0) {
      qs.append('country_id', String(params.country_id));
    }

    if (params.job_position) {
      qs.append('job_position', params.job_position);
    }

    if (params.team_number) {
      qs.append('team_number', String(params.team_number));
    }

    if (params.user_id) {
      qs.append('user_id', String(params.user_id));
    }

    var qsStr = qs.toString();
    var url = '/api/reports/order-has-discount' + (qsStr ? '?' + qsStr : '');

    console.log('[RequestDiscountAPI] GET', API_BASE_URL + url);

    var response = await request(url);

    if (Array.isArray(response)) {
      return response;
    }
    if (response && typeof response === 'object' && Array.isArray(response.data)) {
      return response.data;
    }

    console.warn('[RequestDiscountAPI] Unexpected response format:', response);
    return [];
  }

  window.RequestDiscountAPI = {
    fetch: fetchReport
  };

})();
