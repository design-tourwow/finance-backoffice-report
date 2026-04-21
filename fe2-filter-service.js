// fe2-filter-service.js — Filter API service ported from fe-2-project-main
// Exposes window.FE2FilterService (IIFE)
// Depends on: window.FE2Http (fe2-http.js)

(function () {
  'use strict';

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

  /**
   * GET wrapper that never throws — returns [] on failure to preserve
   * the "filter service always resolves" contract.
   * @param {string} endpoint
   * @param {string} label
   * @returns {Promise<Array>}
   */
  async function safeGet(endpoint, label) {
    try {
      var response = await window.FE2Http.get(endpoint);
      return normaliseArray(response, label);
    } catch (err) {
      console.error('[FE2FilterService] ' + label + ' failed:', err);
      return [];
    }
  }

  // ---------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------

  /**
   * GET /api/countries
   * @returns {Promise<Array>}
   */
  async function getCountries() {
    return safeGet('/api/countries', 'countries');
  }

  /**
   * GET /api/teams
   * @returns {Promise<Array>}
   */
  async function getTeams() {
    return safeGet('/api/teams', 'teams');
  }

  /**
   * GET /api/job-positions
   * Optionally filters client-side by teamId if provided.
   * @param {number} [teamId]
   * @returns {Promise<Array>}
   */
  async function getJobPositions(teamId) {
    var positions = await safeGet('/api/job-positions', 'job-positions');
    if (teamId !== undefined && teamId !== null) {
      return positions.filter(function (p) {
        return p.team_number === teamId;
      });
    }
    return positions;
  }

  /**
   * GET /api/users — returns all users, filtered client-side.
   * Mirrors fe-2 getUsersFiltered logic.
   * @param {number} [teamId]
   * @param {string} [jobPositionId]
   * @returns {Promise<Array>}
   */
  async function getUsers(teamId, jobPositionId) {
    var users = await safeGet('/api/users', 'users');

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
