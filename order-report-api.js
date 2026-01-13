// Order Report API Service
const OrderReportAPI = {
  // Use global API_BASE_URL set by inline script in HTML
  get baseURL() {
    const url = window.API_BASE_URL || 'https://finance-backoffice-report-api.vercel.app';
    console.log('📡 Using API URL:', url);
    return url;
  },
  
  // Get token from sessionStorage or localStorage (fallback)
  getToken() {
    // For testing, use test token
    const testToken = 'sk_test_9a7b5c3d1e2f4a6b8c0d2e4f6a8b0c2d';
    const storedToken = sessionStorage.getItem('authToken') || localStorage.getItem('authToken');
    return storedToken || testToken;
  },
  
  /**
   * Get all orders from API
   * @param {Object} filters - Filter parameters
   * @returns {Promise<Array>}
   */
  async getAllOrders(filters = {}) {
    try {
      console.log('🔄 Fetching all orders with filters:', filters);
      const url = new URL(`${this.baseURL}/api/orders`);
      url.searchParams.append('limit', '10000'); // Get all orders
      
      // Add filters
      if (filters.supplier_id) url.searchParams.append('supplier_id', filters.supplier_id);
      if (filters.country_id) url.searchParams.append('country_id', filters.country_id);

      console.log('📡 Request URL:', url.toString());
      console.log('🔑 Auth Token:', this.getToken() ? 'Present' : 'Missing');

      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'authorization': this.getToken()
        }
      });

      console.log('📥 Response Status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Response Error:', errorText);
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      console.log('✅ Orders Response:', result);
      console.log('📊 Orders Count:', result.data?.length || 0);
      
      return result.data || [];
    } catch (error) {
      console.error('❌ Get Orders Error:', error);
      throw error;
    }
  },

  /**
   * Get all customers from API
   * @returns {Promise<Array>}
   */
  async getAllCustomers() {
    try {
      const url = new URL(`${this.baseURL}/api/customers`);
      url.searchParams.append('limit', '10000');

      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'authorization': this.getToken()
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      return result.data || [];
    } catch (error) {
      console.error('❌ Get Customers Error:', error);
      throw error;
    }
  },

  /**
   * Filter orders by date range and status
   * @param {Array} orders - Orders array
   * @param {Object} filters - Filter parameters
   * @returns {Array}
   */
  filterOrders(orders, filters = {}) {
    return orders.filter(order => {
      // Valid order conditions: order_status != 'Canceled', first installment paid
      if (order.order_status === 'Canceled' || order.order_status === 'canceled') {
        return false;
      }

      // Filter by travel date
      if (filters.travel_date_from && order.travel_date) {
        const travelDate = new Date(order.travel_date);
        const fromDate = new Date(filters.travel_date_from);
        if (travelDate < fromDate) return false;
      }
      if (filters.travel_date_to && order.travel_date) {
        const travelDate = new Date(order.travel_date);
        const toDate = new Date(filters.travel_date_to);
        if (travelDate > toDate) return false;
      }

      // Filter by booking date (created_at)
      if (filters.booking_date_from && order.created_at) {
        const bookingDate = new Date(order.created_at);
        const fromDate = new Date(filters.booking_date_from);
        if (bookingDate < fromDate) return false;
      }
      if (filters.booking_date_to && order.created_at) {
        const bookingDate = new Date(order.created_at);
        const toDate = new Date(filters.booking_date_to);
        if (bookingDate > toDate) return false;
      }

      return true;
    });
  },

  /**
   * Get Order Summary Report
   * @param {Object} filters - Filter parameters
   * @returns {Promise<Object>}
   */
  async getOrderSummary(filters = {}) {
    try {
      console.log('🔄 Calculating Order Summary with filters:', filters);
      
      const allOrders = await this.getAllOrders(filters);
      console.log('📊 Total orders fetched:', allOrders.length);
      
      const filteredOrders = this.filterOrders(allOrders, filters);
      console.log('📊 Filtered orders:', filteredOrders.length);

      // Calculate summary
      const totalOrders = filteredOrders.length;
      const totalNetAmount = filteredOrders.reduce((sum, order) => {
        return sum + (parseFloat(order.net_amount) || 0);
      }, 0);
      const uniqueCustomers = new Set(filteredOrders.map(o => o.customer_id)).size;
      const avgNetAmount = totalOrders > 0 ? totalNetAmount / totalOrders : 0;

      const summary = {
        status: 'success',
        data: {
          total_orders: totalOrders,
          total_customers: uniqueCustomers,
          total_net_amount: totalNetAmount,
          avg_net_amount: avgNetAmount
        }
      };
      
      console.log('✅ Summary calculated:', summary);
      return summary;
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
      const allOrders = await this.getAllOrders(filters);
      const filteredOrders = this.filterOrders(allOrders, filters);

      // Group by country
      const byCountry = {};
      filteredOrders.forEach(order => {
        const countryId = order.country_id || 'unknown';
        const countryName = order.country_name || 'ไม่ระบุ';
        
        if (!byCountry[countryId]) {
          byCountry[countryId] = {
            country_id: countryId,
            country_name: countryName,
            orders: [],
            customers: new Set()
          };
        }
        
        byCountry[countryId].orders.push(order);
        byCountry[countryId].customers.add(order.customer_id);
      });

      // Calculate totals
      const data = Object.values(byCountry).map(country => ({
        country_name: country.country_name,
        total_orders: country.orders.length,
        total_customers: country.customers.size,
        total_net_amount: country.orders.reduce((sum, o) => sum + (parseFloat(o.net_amount) || 0), 0),
        avg_net_amount: country.orders.reduce((sum, o) => sum + (parseFloat(o.net_amount) || 0), 0) / country.orders.length
      }));

      return {
        status: 'success',
        data: data.sort((a, b) => b.total_orders - a.total_orders)
      };
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
      const allOrders = await this.getAllOrders(filters);
      const filteredOrders = this.filterOrders(allOrders, filters);

      // Group by supplier
      const bySupplier = {};
      filteredOrders.forEach(order => {
        const supplierId = order.product_owner_supplier_id || 'unknown';
        const supplierName = order.supplier_name || 'ไม่ระบุ';
        
        if (!bySupplier[supplierId]) {
          bySupplier[supplierId] = {
            supplier_id: supplierId,
            supplier_name: supplierName,
            orders: [],
            customers: new Set()
          };
        }
        
        bySupplier[supplierId].orders.push(order);
        bySupplier[supplierId].customers.add(order.customer_id);
      });

      // Calculate totals
      const data = Object.values(bySupplier).map(supplier => ({
        supplier_name: supplier.supplier_name,
        total_orders: supplier.orders.length,
        total_customers: supplier.customers.size,
        total_net_amount: supplier.orders.reduce((sum, o) => sum + (parseFloat(o.net_amount) || 0), 0),
        avg_net_amount: supplier.orders.reduce((sum, o) => sum + (parseFloat(o.net_amount) || 0), 0) / supplier.orders.length
      }));

      return {
        status: 'success',
        data: data.sort((a, b) => b.total_orders - a.total_orders)
      };
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
      const allOrders = await this.getAllOrders(filters);
      const filteredOrders = this.filterOrders(allOrders, filters);

      // Group by travel month
      const byMonth = {};
      filteredOrders.forEach(order => {
        if (!order.travel_date) return;
        
        const date = new Date(order.travel_date);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        const monthLabel = `${date.getMonth() + 1}/${date.getFullYear()}`;
        
        if (!byMonth[monthKey]) {
          byMonth[monthKey] = {
            travel_month: monthLabel,
            orders: [],
            customers: new Set()
          };
        }
        
        byMonth[monthKey].orders.push(order);
        byMonth[monthKey].customers.add(order.customer_id);
      });

      // Calculate totals
      const data = Object.values(byMonth).map(month => ({
        travel_month: month.travel_month,
        total_orders: month.orders.length,
        total_customers: month.customers.size,
        total_net_amount: month.orders.reduce((sum, o) => sum + (parseFloat(o.net_amount) || 0), 0)
      }));

      return {
        status: 'success',
        data: data.sort((a, b) => a.travel_month.localeCompare(b.travel_month))
      };
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
      const allOrders = await this.getAllOrders(filters);
      const filteredOrders = this.filterOrders(allOrders, filters);

      // Group by booking month
      const byMonth = {};
      filteredOrders.forEach(order => {
        if (!order.created_at) return;
        
        const date = new Date(order.created_at);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        const monthLabel = `${date.getMonth() + 1}/${date.getFullYear()}`;
        
        if (!byMonth[monthKey]) {
          byMonth[monthKey] = {
            booking_month: monthLabel,
            orders: [],
            customers: new Set()
          };
        }
        
        byMonth[monthKey].orders.push(order);
        byMonth[monthKey].customers.add(order.customer_id);
      });

      // Calculate totals
      const data = Object.values(byMonth).map(month => ({
        booking_month: month.booking_month,
        total_orders: month.orders.length,
        total_customers: month.customers.size,
        total_net_amount: month.orders.reduce((sum, o) => sum + (parseFloat(o.net_amount) || 0), 0)
      }));

      return {
        status: 'success',
        data: data.sort((a, b) => a.booking_month.localeCompare(b.booking_month))
      };
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
      const [allOrders, allCustomers] = await Promise.all([
        this.getAllOrders(filters),
        this.getAllCustomers()
      ]);
      
      const filteredOrders = this.filterOrders(allOrders, filters);

      // Group orders by customer
      const byCustomer = {};
      filteredOrders.forEach(order => {
        const customerId = order.customer_id;
        if (!customerId) return;
        
        if (!byCustomer[customerId]) {
          byCustomer[customerId] = {
            customer_id: customerId,
            orders: [],
            countries: new Set()
          };
        }
        
        byCustomer[customerId].orders.push(order);
        if (order.country_name) {
          byCustomer[customerId].countries.add(order.country_name);
        }
      });

      // Filter only repeat customers (> 1 order)
      const repeatCustomers = Object.values(byCustomer)
        .filter(customer => customer.orders.length > 1)
        .map(customer => {
          const customerInfo = allCustomers.find(c => c.id === customer.customer_id) || {};
          return {
            customer_code: customerInfo.customer_code || '-',
            customer_name: customerInfo.name || 'ไม่ระบุ',
            phone_number: customerInfo.phone_number || '-',
            total_orders: customer.orders.length,
            countries: Array.from(customer.countries).join(', ') || '-',
            total_spent: customer.orders.reduce((sum, o) => sum + (parseFloat(o.net_amount) || 0), 0)
          };
        });

      return {
        status: 'success',
        data: repeatCustomers.sort((a, b) => b.total_orders - a.total_orders)
      };
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
      // Get unique countries from orders
      const allOrders = await this.getAllOrders();
      const countries = new Map();
      
      allOrders.forEach(order => {
        if (order.country_id && order.country_name) {
          countries.set(order.country_id, {
            id: order.country_id,
            name_th: order.country_name,
            name_en: order.country_name
          });
        }
      });

      return {
        status: 'success',
        data: Array.from(countries.values()).sort((a, b) => a.name_th.localeCompare(b.name_th))
      };
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
      const url = new URL(`${this.baseURL}/api/suppliers`);
      url.searchParams.append('limit', '1000');

      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'authorization': this.getToken()
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      return {
        status: 'success',
        data: result.data || []
      };
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
