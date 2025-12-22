// Tour Image Manager API Service
const TourImageAPI = {
  // Auto-detect environment from URL (hostname has highest priority)
  getEnvironmentFromURL() {
    const hostname = window.location.hostname;
    
    // IMPORTANT: Hostname detection has HIGHEST priority
    // Check staging FIRST (before production)
    if (hostname === 'staging-finance-backoffice-report.vercel.app') {
      console.log('🎯 Detected STAGING from hostname');
      return 'staging';
    }
    
    // Check if running on production Vercel URL
    if (hostname === 'finance-backoffice-report.vercel.app') {
      console.log('🎯 Detected PRODUCTION from hostname');
      return 'production';
    }
    
    // For localhost or other domains, use sessionStorage as fallback
    const sessionEnv = sessionStorage.getItem('env');
    console.log(`🎯 Using ${sessionEnv || 'production'} from sessionStorage (localhost)`);
    return sessionEnv || 'production';
  },
  
  // Dynamic baseURL based on environment
  get baseURL() {
    const env = this.getEnvironmentFromURL();
    const urls = {
      staging: 'https://fin-api-staging2.tourwow.com',
      production: 'https://fin-api.tourwow.com'
    };
    
    console.log(`🌍 Environment detected: ${env} (URL: ${window.location.hostname})`);
    console.log(`📡 Using API: ${urls[env]}`);
    
    return urls[env];
  },
  
  // Get token from sessionStorage
  getToken() {
    return sessionStorage.getItem('authToken');
  },
  
  // Set token to sessionStorage
  setToken(token) {
    sessionStorage.setItem('authToken', token);
  },
  
  // Check if token exists
  hasToken() {
    return !!sessionStorage.getItem('authToken');
  },
  
  // Remove token from sessionStorage
  removeToken() {
    sessionStorage.removeItem('authToken');
    sessionStorage.removeItem('env');
  },
  
  // Get current environment
  getEnvironment() {
    return this.getEnvironmentFromURL();
  },

  /**
   * Get Pre Product File Reports
   * @param {Object} filters - Filter parameters
   * @returns {Promise<Object>}
   */
  async getPreProductFileReports(filters = {}) {
    try {
      console.log('🔄 Calling API with filters:', filters);
      const url = new URL(`${this.baseURL}/pre_product_file_reports`);
      
      // Add filters as query parameter if provided
      if (Object.keys(filters).length > 0) {
        url.searchParams.append('filters', JSON.stringify(filters));
      }

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
      
      // Check if API returned error in response body
      if (data.status === 'error' || data.status === 'fail') {
        console.error('❌ API returned error:', data);
        const error = new Error(data.message || 'API Error');
        error.status = 401; // Treat as unauthorized
        throw error;
      }
      
      return data;
    } catch (error) {
      console.error('❌ API Error:', error);
      console.error('❌ Error details:', error.message);
      throw error;
    }
  },

  /**
   * Remake All Pre Product File Reports (POST)
   * @returns {Promise<Object>}
   */
  async remakePreProductFileReports() {
    try {
      const url = `${this.baseURL}/pre_product_file_reports`;

      const response = await fetch(url, {
        method: 'POST',
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

      const data = await response.json();
      
      console.log('✅ Remake API Response:', data);
      
      return data;
    } catch (error) {
      console.error('❌ Remake API Error:', error);
      throw error;
    }
  },

  /**
   * Get Countries
   * @param {string} sortBy - Sort order: 'country_name_th_by_asc' or 'country_name_th_by_desc'
   * @returns {Promise<Object>}
   */
  async getCountries(sortBy = 'country_name_th_by_asc') {
    try {
      const url = new URL(`${this.baseURL}/pre_product_file_reports/countries`);
      
      // Add sort_by parameter if provided
      if (sortBy) {
        url.searchParams.append('sort_by', sortBy);
      }

      const response = await fetch(url.toString(), {
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

      const data = await response.json();
      
      console.log('✅ Countries API Response:', data);
      
      return data;
    } catch (error) {
      console.error('❌ Countries API Error:', error);
      throw error;
    }
  },

  /**
   * Get Suppliers
   * @returns {Promise<Object>}
   */
  async getSuppliers() {
    try {
      const url = `${this.baseURL}/pre_product_file_reports/suppliers`;

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

      const data = await response.json();
      
      console.log('✅ Suppliers API Response:', data);
      
      return data;
    } catch (error) {
      console.error('❌ Suppliers API Error:', error);
      throw error;
    }
  },

  /**
   * Search with filters
   * @param {Object} searchParams
   * @returns {Promise<Object>}
   */
  async search(searchParams = {}) {
    const filters = {};

    // Map search params to API filters
    if (searchParams.imageName) {
      filters.name = searchParams.imageName;
    }

    if (searchParams.tourCode) {
      filters.product_tour_code = searchParams.tourCode;
    }

    if (searchParams.supplier_id) {
      filters.supplier_id = searchParams.supplier_id;
    }

    if (searchParams.country_id) {
      filters.country_id = searchParams.country_id;
    }

    if (searchParams.min_file_count) {
      filters.min_file_count = searchParams.min_file_count;
    }

    if (searchParams.dateRange) {
      filters.last_file_created_at_between = {
        min_date: searchParams.dateRange.start,
        max_date: searchParams.dateRange.end
      };
    }

    return await this.getPreProductFileReports(filters);
  }
};

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
  module.exports = TourImageAPI;
}
