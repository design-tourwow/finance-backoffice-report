// Wholesale Report API Service
const WholesaleReportAPI = {
  get baseURL() {
    return window.API_BASE_URL || 'https://finance-backoffice-report-api.vercel.app';
  },

  getToken() {
    return sessionStorage.getItem('authToken') || localStorage.getItem('authToken');
  },

  async fetchAPI(endpoint) {
    const response = await fetch(`${this.baseURL}${endpoint}`, {
      method: 'GET',
      headers: { 'Authorization': 'Bearer ' + this.getToken() }
    });
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    return response.json();
  },

  buildQueryString(filters = {}) {
    const params = new URLSearchParams();
    if (filters.date_type)    params.append('date_type',    filters.date_type);
    if (filters.date_from)    params.append('date_from',    filters.date_from);
    if (filters.date_to)      params.append('date_to',      filters.date_to);
    if (filters.supplier_id)  params.append('supplier_id',  filters.supplier_id);
    if (filters.country_id)   params.append('country_id',   filters.country_id);
    const qs = params.toString();
    return qs ? `?${qs}` : '';
  },

  async getOrders(filters = {}) {
    return this.fetchAPI(`/api/reports/wholesale-orders${this.buildQueryString(filters)}`);
  },

  async getSuppliers() {
    return this.fetchAPI('/api/suppliers');
  },

  async getCountries() {
    return this.fetchAPI('/api/reports/countries');
  },

  async getAvailablePeriods() {
    return this.fetchAPI('/api/reports/available-periods');
  }
};
