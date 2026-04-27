// Repeated Customer Report API Service.
// Thin wrapper over SharedHttp so auth, base URL, and 401 redirect logic all
// live in one place (shared-http.js).
const RepeatedCustomerReportAPI = {
  async getReport(filters = {}) {
    // SharedHttp.get() auto-attaches Bearer from TokenUtils and redirects on
    // 401 via SharedUI. Unknown/empty filter fields are dropped by buildQuery.
    return window.SharedHttp.get('/api/reports/repeated-customer-report', {
      params: {
        customer_name:     filters.customer_name     || '',
        seller_id:         filters.seller_id         || '',
        repeat_bucket:     filters.repeat_bucket     || '',
        booking_date_from: filters.booking_date_from || '',
        booking_date_to:   filters.booking_date_to   || '',
        travel_date_from:  filters.travel_date_from  || '',
        travel_date_to:    filters.travel_date_to    || ''
      }
    });
  },

  // Autocomplete source for the customer-name filter. Returns an array of
  // raw customer objects { id, name, code, phone }; the SharedFilterSearchInput
  // caller provides formatLabel/onSelect to shape the suggestion UI.
  async searchCustomers(q) {
    const res = await window.SharedHttp.get('/api/customers/search', {
      params: { q: q || '', limit: 20 }
    });
    if (res && res.success && Array.isArray(res.data)) return res.data;
    return [];
  }
};
