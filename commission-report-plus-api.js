// Commission Report Plus API Service
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
    if (filters.created_at_from) params.append('created_at_from', filters.created_at_from)
    if (filters.created_at_to)   params.append('created_at_to',   filters.created_at_to)
    if (filters.paid_at_from)    params.append('paid_at_from',    filters.paid_at_from)
    if (filters.paid_at_to)      params.append('paid_at_to',      filters.paid_at_to)
    if (filters.job_position)    params.append('job_position',    filters.job_position)
    if (filters.seller_id)       params.append('seller_id',       filters.seller_id)
    if (filters.order_status)    params.append('order_status',    filters.order_status)
    const qs = params.toString()
    return qs ? `?${qs}` : ''
  },

  async fetchAPI(endpoint) {
    const token = this.getToken()
    const response = await fetch(`${this.baseURL}${endpoint}`, {
      method: 'GET',
      headers: { 'Authorization': 'Bearer ' + token }
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
    const token = this.getToken()
    const response = await fetch(`${this.baseURL}/api/reports/commission-plus/pdf`, {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + token,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    })

    if (!response.ok) {
      const text = await response.text()
      throw new Error(`HTTP ${response.status}: ${text}`)
    }

    return response.blob()
  }
}
