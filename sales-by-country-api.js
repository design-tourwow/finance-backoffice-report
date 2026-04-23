// Order Report API Service - Using Backend Report Endpoints
const SalesByCountryAPI = {
  // Use global API_BASE_URL set by inline script in HTML
  get baseURL() {
    const url = window.API_BASE_URL || 'https://finance-backoffice-report-api.vercel.app';
    console.log('📡 Using API URL:', url);
    return url;
  },
  
  // Get JWT token from sessionStorage or localStorage (fallback)
  getToken() {
    return sessionStorage.getItem('authToken') || localStorage.getItem('authToken');
  },

  /**
   * Build query string from filters
   * @param {Object} filters - Filter parameters
   * @param {string} dateFormat - Date format (optional)
   * @returns {string}
   */
  buildQueryString(filters = {}, dateFormat = null) {
    const params = new URLSearchParams();
    
    if (filters.travel_date_from) params.append('travel_date_from', filters.travel_date_from);
    if (filters.travel_date_to) params.append('travel_date_to', filters.travel_date_to);
    if (filters.booking_date_from) params.append('booking_date_from', filters.booking_date_from);
    if (filters.booking_date_to) params.append('booking_date_to', filters.booking_date_to);
    if (filters.country_id) params.append('country_id', filters.country_id);
    if (filters.supplier_id) params.append('supplier_id', filters.supplier_id);
    if (filters.view_mode) params.append('view_mode', filters.view_mode);
    if (dateFormat) params.append('date_format', dateFormat);
    
    const queryString = params.toString();
    return queryString ? `?${queryString}` : '';
  },

  /**
   * Make API request
   * @param {string} endpoint - API endpoint
   * @returns {Promise<Object>}
   */
  async fetchAPI(endpoint) {
    try {
      console.log('📡 Request:', endpoint);
      
      const response = await fetch(`${this.baseURL}${endpoint}`, {
        method: 'GET',
        headers: {
          'Authorization': 'Bearer ' + this.getToken()
        }
      });

      console.log('📥 Response Status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Response Error:', errorText);
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      console.log('✅ Response:', result);
      
      // Normalize response format (support both 'success' and 'status')
      if (result.status === 'success' && !result.success) {
        result.success = true;
      }
      
      return result;
    } catch (error) {
      console.error('❌ API Error:', error);
      throw error;
    }
  },

  /**
   * Get Order Summary Report
   * @param {Object} filters - Filter parameters
   * @returns {Promise<Object>}
   */
  async getOrderSummary(filters = {}) {
    try {
      console.log('🔄 Fetching Order Summary with filters:', filters);
      
      const queryString = this.buildQueryString(filters);
      const result = await this.fetchAPI(`/api/reports/summary${queryString}`);
      
      return result;
    } catch (error) {
      console.error('❌ Order Summary Error:', error);
      throw error;
    }
  },

  /**
   * Get Report by Country
   * @param {Object} filters - Filter parameters
   * @returns {Promise<Object>}
   */
  async getReportByCountry(filters = {}) {
    try {
      console.log('🔄 Fetching Report by Country with filters:', filters);
      
      const queryString = this.buildQueryString(filters);
      const result = await this.fetchAPI(`/api/reports/by-country${queryString}`);
      
      return result;
    } catch (error) {
      console.error('❌ Report by Country Error:', error);
      throw error;
    }
  },

  /**
   * Get Report by Supplier
   * @param {Object} filters - Filter parameters
   * @returns {Promise<Object>}
   */
  async getReportBySupplier(filters = {}) {
    try {
      console.log('🔄 Fetching Report by Supplier with filters:', filters);
      
      const queryString = this.buildQueryString(filters);
      const result = await this.fetchAPI(`/api/reports/by-supplier${queryString}`);
      
      return result;
    } catch (error) {
      console.error('❌ Report by Supplier Error:', error);
      throw error;
    }
  },

  /**
   * Get Report by Travel Date (Daily)
   * @param {Object} filters - Filter parameters
   * @returns {Promise<Object>}
   */
  async getReportByTravelDate(filters = {}) {
    try {
      console.log('🔄 Fetching Report by Travel Start Date (Daily) with filters:', filters);
      
      // Use numeric_full format: DD/MM/YYYY พ.ศ. (e.g., "01/03/2569")
      const queryString = this.buildQueryString(filters, 'numeric_full');
      const result = await this.fetchAPI(`/api/reports/by-travel-start-date${queryString}`);
      
      return result;
    } catch (error) {
      console.error('❌ Report by Travel Start Date Error:', error);
      throw error;
    }
  },

  /**
   * Get Report by Booking Date (Daily)
   * @param {Object} filters - Filter parameters
   * @returns {Promise<Object>}
   */
  async getReportByBookingDate(filters = {}) {
    try {
      console.log('🔄 Fetching Report by Created Date (Daily) with filters:', filters);
      
      // Use numeric_full format: DD/MM/YYYY พ.ศ. (e.g., "13/01/2569")
      const queryString = this.buildQueryString(filters, 'numeric_full');
      const result = await this.fetchAPI(`/api/reports/by-created-date${queryString}`);
      
      return result;
    } catch (error) {
      console.error('❌ Report by Created Date Error:', error);
      throw error;
    }
  },

  /**
   * Get Repeat Customers Report
   * @param {Object} filters - Filter parameters
   * @returns {Promise<Object>}
   */
  async getRepeatCustomers(filters = {}) {
    try {
      console.log('🔄 Fetching Repeat Customers with filters:', filters);
      
      const queryString = this.buildQueryString(filters);
      const result = await this.fetchAPI(`/api/reports/repeat-customers${queryString}`);
      
      return result;
    } catch (error) {
      console.error('❌ Repeat Customers Error:', error);
      throw error;
    }
  },

  /**
   * Get Countries List
   * @returns {Promise<Object>}
   */
  async getCountries() {
    try {
      console.log('🔄 Fetching Countries List');
      
      const result = await this.fetchAPI('/api/reports/countries');
      
      return result;
    } catch (error) {
      console.error('❌ Countries Error:', error);
      throw error;
    }
  },

  /**
   * Get Suppliers List
   * @returns {Promise<Object>}
   */
  async getSuppliers() {
    try {
      console.log('🔄 Fetching Suppliers List');
      
      const result = await this.fetchAPI('/api/suppliers');
      
      return result;
    } catch (error) {
      console.error('❌ Suppliers Error:', error);
      throw error;
    }
  },

  /**
   * Get Lead Time Analysis Report
   * @param {Object} filters - Filter parameters
   * @returns {Promise<Object>}
   */
  async getLeadTimeAnalysis(filters = {}) {
    try {
      console.log('🔄 Fetching Lead Time Analysis with filters:', filters);

      const queryString = this.buildQueryString(filters);
      const result = await this.fetchAPI(`/api/reports/lead-time-analysis${queryString}`);

      return result;
    } catch (error) {
      console.error('❌ Lead Time Analysis Error:', error);
      throw error;
    }
  },

  /**
   * Get Available Time Periods (years, quarters, months from database).
   *
   * @param {Object}  [filters]
   * @param {string|number} [filters.country_id]   — single id or csv "1,2,3"
   * @param {string|number} [filters.supplier_id]  — single id or csv "1,2,3"
   * @returns {Promise<Object>}
   */
  async getAvailablePeriods(filters = {}) {
    try {
      console.log('🔄 Fetching Available Time Periods', filters);

      const queryString = this.buildQueryString(filters);
      const result = await this.fetchAPI(`/api/reports/available-periods${queryString}`);

      return result;
    } catch (error) {
      console.error('❌ Available Periods Error:', error);
      throw error;
    }
  }
};

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
  module.exports = OrderReportAPI;
}
