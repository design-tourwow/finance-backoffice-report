// fe2-filter-service.js — Filter API service ported from fe-2-project-main
// Exposes window.FE2FilterService (IIFE)
// Depends on: token-utils.js (window.TokenUtils), window.FE2_API_BASE_URL

(function () {
  'use strict';

  /**
   * Build auth headers using TokenUtils from token-utils.js.
   * @returns {Object}
   */
  function buildHeaders() {
    var token = TokenUtils.getToken();
    var headers = { 'Content-Type': 'application/json' };
    if (token) {
      headers['Authorization'] = 'Bearer ' + token;
    }
    return headers;
  }

  /**
   * Core fetch wrapper. Returns parsed JSON or throws.
   * On 401, redirects to login via TokenUtils.
   * @param {string} endpoint  - path starting with /
   * @returns {Promise<any>}
   */
  async function request(endpoint) {
    var baseUrl = window.FE2_API_BASE_URL || 'https://be-2-report.vercel.app';
    var response = await fetch(baseUrl + endpoint, {
      method: 'GET',
      headers: buildHeaders()
    });

    if (response.status === 401) {
      console.warn('[FE2FilterService] 401 Unauthorized — redirecting to login');
      TokenUtils.redirectToLogin('Token หมดอายุหรือไม่ถูกต้อง\nกรุณาเข้าสู่ระบบใหม่อีกครั้ง');
      throw new Error('Unauthorized');
    }

    if (!response.ok) {
      throw new Error('HTTP error ' + response.status);
    }

    return response.json();
  }

  /**
   * Normalise API response that may be an array or an {data: [...]} wrapper.
   * @param {any} response
   * @param {string} label - for warning message
   * @returns {Array}
   */
  function normaliseArray(response, label) {
    if (Array.isArray(response)) {
      return response;
    }
    if (response && typeof response === 'object' && Array.isArray(response.data)) {
      return response.data;
    }
    console.warn('[FE2FilterService] Unexpected response format for ' + label + ':', response);
    return [];
  }

  // ---------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------

  /**
   * GET /api/countries
   * @returns {Promise<Array>}
   */
  async function getCountries() {
    try {
      var response = await request('/api/countries');
      return normaliseArray(response, 'countries');
    } catch (err) {
      console.error('[FE2FilterService] getCountries failed:', err);
      return [];
    }
  }

  /**
   * GET /api/teams
   * @returns {Promise<Array>}
   */
  async function getTeams() {
    try {
      var response = await request('/api/teams');
      return normaliseArray(response, 'teams');
    } catch (err) {
      console.error('[FE2FilterService] getTeams failed:', err);
      return [];
    }
  }

  /**
   * GET /api/job-positions
   * Optionally filters client-side by teamId if provided.
   * @param {number} [teamId]
   * @returns {Promise<Array>}
   */
  async function getJobPositions(teamId) {
    try {
      var response = await request('/api/job-positions');
      var positions = normaliseArray(response, 'job-positions');
      if (teamId !== undefined && teamId !== null) {
        positions = positions.filter(function (p) {
          return p.team_number === teamId;
        });
      }
      return positions;
    } catch (err) {
      console.error('[FE2FilterService] getJobPositions failed:', err);
      return [];
    }
  }

  /**
   * GET /api/users — returns all users, filtered client-side.
   * Mirrors fe-2 getUsersFiltered logic.
   * @param {number} [teamId]
   * @param {string} [jobPositionId]
   * @returns {Promise<Array>}
   */
  async function getUsers(teamId, jobPositionId) {
    try {
      var response = await request('/api/users');
      var users = normaliseArray(response, 'users');

      if (teamId !== undefined && teamId !== null) {
        users = users.filter(function (u) {
          return u.team_number === teamId;
        });
      }
      if (jobPositionId !== undefined && jobPositionId !== null) {
        users = users.filter(function (u) {
          return u.job_position &&
            u.job_position.toLowerCase() === String(jobPositionId).toLowerCase();
        });
      }

      return users;
    } catch (err) {
      console.error('[FE2FilterService] getUsers failed:', err);
      return [];
    }
  }

  // ---------------------------------------------------------------------------
  // Expose
  // ---------------------------------------------------------------------------

  window.FE2FilterService = {
    getCountries: getCountries,
    getTeams: getTeams,
    getJobPositions: getJobPositions,
    getUsers: getUsers
  };

})();
