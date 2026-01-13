// Order Report API Service
const OrderReportAPI = {
  // Use global API_BASE_URL set by inline script in HTML
  get baseURL() {
    const url = window.API_BASE_URL || 'https://fin-api.tourwow.com';
    console.log('📡 Using API URL:', url);
    return url;
  },
  
  // Get token from sessionStorage or localStorage (fallback)
  getToken() {
    return sessionStorage.getItem('authToken') || localStorage.getItem('authToken');
  },
  
  /**
   * Get Order Summary Report
   * @param {Object} filters - Filter parameters
   * @returns {Promise<Object>}
   */
  async getOrderSummary(filters = {}) {
    try {
      console.log('🔄 Calling Order Summary API with filters:', filters);
      const url = new URL(`${this.baseURL}/reports/orders/summary`);
      
      // Add filters as query parameters
      Object.keys(filters).forEach(key => {
        if (filters[key] !== null && filters[key] !== undefined && filters[key] !== '') {
          url.searchParams.append(key, filters[key]);
        }
      });

      console.log('📡 Fetching:', url.toString());

      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'authorization': this.getToken()
        }
      });

      console.log('📥 Response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Response error:', errorText);
        const error = new Error(`HTTP error! status: ${response.status}`);
        error.status = response.status;
        throw error;
      }

      const data = await response.json();
      console.log('✅ API Response:', data);
      
      return data;
    } catch (error) {
      console.error('❌ API Error:', error);
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
      const url = new URL(`${this.baseURL}/reports/orders/by-country`);
      
      Object.keys(filters).forEach(key => {
        if (filters[key] !== null && filters[key] !== undefined && filters[key] !== '') {
          url.searchParams.append(key, filters[key]);
        }
      });

      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'authorization': this.getToken()
        }
      });

      if (!response.ok) {
        const error = new Error(`HTTP error! status: ${response.status}`);
        error.status = response.status;
        throw error;
      }

      return await response.json();
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
      const url = new URL(`${this.baseURL}/reports/orders/by-supplier`);
      
      Object.keys(filters).forEach(key => {
        if (filters[key] !== null && filters[key] !== undefined && filters[key] !== '') {
          url.searchParams.append(key, filters[key]);
        }
      });

      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'authorization': this.getToken()
        }
      });

      if (!response.ok) {
        const error = new Error(`HTTP error! status: ${response.status}`);
        error.status = response.status;
        throw error;
      }

      return await response.json();
    } catch (error) {
      console.error('❌ Report by Supplier Error:', error);
      throw error;
    }
  },

  /**
   * Get Report by Travel Date
   * @param {Object} filters - Filter parameters
   * @returns {Promise<Object>}
   */
  async getReportByTravelDate(filters = {}) {
    try {
      const url = new URL(`${this.baseURL}/reports/orders/by-travel-date`);
      
      Object.keys(filters).forEach(key => {
        if (filters[key] !== null && filters[key] !== undefined && filters[key] !== '') {
          url.searchParams.append(key, filters[key]);
        }
      });

      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'authorization': this.getToken()
        }
      });

      if (!response.ok) {
        const error = new Error(`HTTP error! status: ${response.status}`);
        error.status = response.status;
        throw error;
      }

      return await response.json();
    } catch (error) {
      console.error('❌ Report by Travel Date Error:', error);
      throw error;
    }
  },

  /**
   * Get Report by Booking Date
   * @param {Object} filters - Filter parameters
   * @returns {Promise<Object>}
   */
  async getReportByBookingDate(filters = {}) {
    try {
      const url = new URL(`${this.baseURL}/reports/orders/by-booking-date`);
      
      Object.keys(filters).forEach(key => {
        if (filters[key] !== null && filters[key] !== undefined && filters[key] !== '') {
          url.searchParams.append(key, filters[key]);
        }
      });

      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'authorization': this.getToken()
        }
      });

      if (!response.ok) {
        const error = new Error(`HTTP error! status: ${response.status}`);
        error.status = response.status;
        throw error;
      }

      return await response.json();
    } catch (error) {
      console.error('❌ Report by Booking Date Error:', error);
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
      const url = new URL(`${this.baseURL}/reports/customers/repeat-orders`);
      
      Object.keys(filters).forEach(key => {
        if (filters[key] !== null && filters[key] !== undefined && filters[key] !== '') {
          url.searchParams.append(key, filters[key]);
        }
      });

      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'authorization': this.getToken()
        }
      });

      if (!response.ok) {
        const error = new Error(`HTTP error! status: ${response.status}`);
        error.status = response.status;
        throw error;
      }

      return await response.json();
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
      const url = `${this.baseURL}/countries`;

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'authorization': this.getToken()
        }
      });

      if (!response.ok) {
        const error = new Error(`HTTP error! status: ${response.status}`);
        error.status = response.status;
        throw error;
      }

      return await response.json();
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
      const url = `${this.baseURL}/suppliers`;

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'authorization': this.getToken()
        }
      });

      if (!response.ok) {
        const error = new Error(`HTTP error! status: ${response.status}`);
        error.status = response.status;
        throw error;
      }

      return await response.json();
    } catch (error) {
      console.error('❌ Suppliers Error:', error);
      throw error;
    }
  }
};

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
  module.exports = OrderReportAPI;
}
