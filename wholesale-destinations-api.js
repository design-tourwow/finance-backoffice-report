// Wholesale Destinations API Service
const WholesaleDestinationsAPI = {
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
   * @returns {string}
   */
  buildQueryString(filters = {}) {
    const params = new URLSearchParams();

    if (filters.booking_date_from) params.append('booking_date_from', filters.booking_date_from);
    if (filters.booking_date_to) params.append('booking_date_to', filters.booking_date_to);
    if (filters.wholesale_id) params.append('wholesale_id', filters.wholesale_id);
    if (filters.country_id) params.append('country_id', filters.country_id);

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

      // Normalize response format
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
   * Get Wholesale by Destination Report
   * @param {Object} filters - Filter parameters
   * @returns {Promise<Object>}
   */
  async getWholesaleDestinations(filters = {}) {
    try {
      console.log('🔄 Fetching Wholesale Destinations with filters:', filters);

      const queryString = this.buildQueryString(filters);
      // TODO: Replace with actual API endpoint when available
      // const result = await this.fetchAPI(`/api/reports/wholesale-destinations${queryString}`);

      // For now, return mock data
      const result = this.getMockData();

      return result;
    } catch (error) {
      console.error('❌ Wholesale Destinations Error:', error);
      throw error;
    }
  },

  /**
   * Get Available Time Periods
   * @returns {Promise<Object>}
   */
  async getAvailablePeriods() {
    try {
      console.log('🔄 Fetching Available Time Periods');

      const result = await this.fetchAPI('/api/reports/available-periods');

      return result;
    } catch (error) {
      console.error('❌ Available Periods Error:', error);
      throw error;
    }
  },

  /**
   * Get Mock Data for development
   * @returns {Object}
   */
  getMockData() {
    // Mock data based on the Pivot table provided
    const wholesales = [
      { id: 1, name: 'ZEGO TRAVEL CO., LTD.', countries: { 'ญี่ปุ่น': 280, 'เวียดนาม': 120, 'จีน': 80, 'เกาหลี': 53 }, total: 533 },
      { id: 2, name: 'BEST INDOCHINA TRAVEL', countries: { 'เวียดนาม': 200, 'ญี่ปุ่น': 150, 'จีน': 60, 'ลาว': 40 }, total: 450 },
      { id: 3, name: 'GS25 TRAVEL', countries: { 'ญี่ปุ่น': 180, 'ไต้หวัน': 100, 'เกาหลี': 80, 'จีน': 40 }, total: 400 },
      { id: 4, name: 'WONDER WORLD TOUR', countries: { 'ญี่ปุ่น': 150, 'เวียดนาม': 100, 'จีน': 70, 'มาเลเซีย': 30 }, total: 350 },
      { id: 5, name: 'ASIA EXPLORER', countries: { 'จีน': 140, 'ญี่ปุ่น': 100, 'เกาหลี': 60, 'ไต้หวัน': 50 }, total: 350 },
      { id: 6, name: 'SMILE HOLIDAY', countries: { 'ญี่ปุ่น': 120, 'เวียดนาม': 80, 'จีน': 50, 'สิงคโปร์': 30 }, total: 280 },
      { id: 7, name: 'HAPPY JOURNEY', countries: { 'เวียดนาม': 100, 'ญี่ปุ่น': 90, 'จีน': 40, 'ลาว': 20 }, total: 250 },
      { id: 8, name: 'THAI TRAVEL SERVICE', countries: { 'ญี่ปุ่น': 100, 'จีน': 60, 'เกาหลี': 40, 'ฮ่องกง': 30 }, total: 230 },
      { id: 9, name: 'GLOBAL TOUR', countries: { 'ญี่ปุ่น': 80, 'เวียดนาม': 60, 'จีน': 50, 'มาเลเซีย': 30 }, total: 220 },
      { id: 10, name: 'STAR TRAVEL', countries: { 'จีน': 80, 'ญี่ปุ่น': 60, 'ไต้หวัน': 40, 'เกาหลี': 20 }, total: 200 },
      { id: 11, name: 'DREAM VACATION', countries: { 'ญี่ปุ่น': 70, 'เวียดนาม': 50, 'จีน': 40, 'สิงคโปร์': 20 }, total: 180 },
      { id: 12, name: 'SUNSHINE TOUR', countries: { 'เวียดนาม': 70, 'ญี่ปุ่น': 50, 'จีน': 30, 'ลาว': 20 }, total: 170 },
      { id: 13, name: 'ROYAL TRAVEL', countries: { 'ญี่ปุ่น': 60, 'จีน': 40, 'เกาหลี': 30, 'ไต้หวัน': 20 }, total: 150 },
      { id: 14, name: 'PARADISE TOUR', countries: { 'ญี่ปุ่น': 50, 'เวียดนาม': 40, 'จีน': 30, 'มาเลเซีย': 20 }, total: 140 },
      { id: 15, name: 'GOLDEN PATH', countries: { 'จีน': 50, 'ญี่ปุ่น': 40, 'เกาหลี': 20, 'ฮ่องกง': 20 }, total: 130 },
    ];

    // Calculate totals
    const totalBookings = wholesales.reduce((sum, w) => sum + w.total, 0);

    // Get top wholesale
    const topWholesale = wholesales[0];

    // Calculate country totals
    const countryTotals = {};
    wholesales.forEach(w => {
      Object.entries(w.countries).forEach(([country, count]) => {
        countryTotals[country] = (countryTotals[country] || 0) + count;
      });
    });

    // Get top country
    const topCountry = Object.entries(countryTotals)
      .sort((a, b) => b[1] - a[1])[0];

    return {
      success: true,
      data: {
        wholesales: wholesales,
        summary: {
          total_bookings: totalBookings,
          top_wholesale: {
            name: topWholesale.name,
            count: topWholesale.total
          },
          top_country: {
            name: topCountry[0],
            count: topCountry[1]
          },
          total_partners: wholesales.length
        },
        country_totals: countryTotals
      }
    };
  }
};

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
  module.exports = WholesaleDestinationsAPI;
}
