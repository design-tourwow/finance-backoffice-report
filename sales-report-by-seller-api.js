// Sales Report API Service
const CommissionReportPlusAPI = {
  get baseURL() {
    const url = window.API_BASE_URL || 'https://finance-backoffice-report-api.vercel.app'
    return url
  },

  getToken() {
    return sessionStorage.getItem('authToken') || localStorage.getItem('authToken')
  },

  buildQueryString(filters = {}) {
    const params = new URLSearchParams()
    if (filters.created_at_from)  params.append('created_at_from',  filters.created_at_from)
    if (filters.created_at_to)    params.append('created_at_to',    filters.created_at_to)
    if (filters.paid_at_from)     params.append('paid_at_from',     filters.paid_at_from)
    if (filters.paid_at_to)       params.append('paid_at_to',       filters.paid_at_to)
    if (filters.canceled_at_from) params.append('canceled_at_from', filters.canceled_at_from)
    if (filters.canceled_at_to)   params.append('canceled_at_to',   filters.canceled_at_to)
    if (filters.job_position)     params.append('job_position',     filters.job_position)
    if (filters.seller_id)        params.append('seller_id',        filters.seller_id)
    if (filters.order_status)     params.append('order_status',     filters.order_status)
    const qs = params.toString()
    return qs ? `?${qs}` : ''
  },

  buildHeaders(extra) {
    // Native view-as header injection — independent of menu-component.js's
    // global window.fetch monkey-patch so this API service works correctly
    // even if the patch hasn't loaded or has been overwritten elsewhere.
    const token = this.getToken()
    const headers = Object.assign({}, extra || {})
    if (token) headers['Authorization'] = 'Bearer ' + token
    try {
      const role = sessionStorage.getItem('viewAsRole')
      const uid  = sessionStorage.getItem('viewAsUserId')
      if (role && uid) {
        headers['X-View-As-Role']    = role
        headers['X-View-As-User-Id'] = uid
      }
    } catch (e) { /* sessionStorage may be unavailable */ }
    return headers
  },

  async fetchAPI(endpoint) {
    const response = await fetch(`${this.baseURL}${endpoint}`, {
      method: 'GET',
      headers: this.buildHeaders()
    })
    if (!response.ok) {
      const text = await response.text()
      throw new Error(`HTTP ${response.status}: ${text}`)
    }
    return response.json()
  },

  async getReport(filters = {}) {
    return this.fetchAPI(`/api/reports/commission-plus${this.buildQueryString(filters)}`)
  },

  async getSellers() {
    return this.fetchAPI('/api/reports/commission-plus/sellers')
  },

  async downloadPDF(payload) {
    const response = await fetch(`${this.baseURL}/api/reports/commission-plus/pdf`, {
      method: 'POST',
      headers: this.buildHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify(payload)
    })

    if (!response.ok) {
      const text = await response.text()
      throw new Error(`HTTP ${response.status}: ${text}`)
    }

    return response.blob()
  }
}
