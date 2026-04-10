const WorkListAPI = {
  get baseURL() {
    return window.API_BASE_URL || 'https://finance-backoffice-report-api.vercel.app';
  },

  getToken() {
    return sessionStorage.getItem('authToken') || localStorage.getItem('authToken');
  },

  async fetchAPI(endpoint) {
    const response = await fetch(`${this.baseURL}${endpoint}`, {
      method: 'GET',
      headers: {
        'Authorization': 'Bearer ' + this.getToken()
      }
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`HTTP ${response.status}: ${text}`);
    }

    return response.json();
  },

  async getWorkList(roleGroup) {
    const qs = new URLSearchParams();
    if (roleGroup) qs.set('role_group', roleGroup);
    return this.fetchAPI(`/api/reports/work-list?${qs.toString()}`);
  }
};
