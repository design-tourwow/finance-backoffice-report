// shared-filter-service.js — Filter API service ported from fe-2-project-main
// Exposes window.SharedFilterService (IIFE)
// Depends on: window.SharedHttp (shared-http.js)

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
    console.warn('[SharedFilterService] Unexpected response format for ' + label + ':', response);
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
      var response = await window.SharedHttp.get(endpoint);
      return normaliseArray(response, label);
    } catch (err) {
      console.error('[SharedFilterService] ' + label + ' failed:', err);
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
    // Note: our own backend exposes this at /api/agency-members (/api/users
    // is already reserved for chat users). Semantics match fe-2's /api/users.
    var users = await safeGet('/api/agency-members', 'agency-members');

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

  window.SharedFilterService = {
    getCountries: getCountries,
    getTeams: getTeams,
    getJobPositions: getJobPositions,
    getUsers: getUsers
  };

})();
