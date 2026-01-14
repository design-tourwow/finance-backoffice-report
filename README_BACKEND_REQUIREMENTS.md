# 📚 Backend API Requirements - Complete Guide

## 🎯 Quick Links

| Document | Description | Language |
|----------|-------------|----------|
| **[SEND_TO_BACKEND_TEAM.md](SEND_TO_BACKEND_TEAM.md)** | 📨 สรุปสั้นๆ ส่งให้ Backend Team | 🇹🇭 Thai |
| **[BACKEND_QUICK_START.md](BACKEND_QUICK_START.md)** | 🚀 เริ่มต้นอ่านตัวนี้ก่อน | 🇹🇭 Thai + 🇬🇧 English |
| **[BACKEND_API_REQUIREMENTS_TH.md](BACKEND_API_REQUIREMENTS_TH.md)** | 📋 รายละเอียดครบถ้วน | 🇹🇭 Thai |
| **[BACKEND_API_REQUIREMENTS.md](BACKEND_API_REQUIREMENTS.md)** | 📋 Complete Specifications | 🇬🇧 English |
| **[BACKEND_SQL_EXAMPLES.md](BACKEND_SQL_EXAMPLES.md)** | 💾 SQL Query Examples | 🇹🇭 Thai + SQL |
| **[backend-architecture-diagram.html](backend-architecture-diagram.html)** | 🏗️ Visual Architecture Diagram | 🇹🇭 Thai (Interactive) |

---

## 🔴 Problem Statement

Frontend is experiencing **429 Rate Limit Error** because it's trying to fetch all orders and calculate reports on the client-side.

**Error Example:**
```
GET https://staging-finance-backoffice-report-api.vercel.app/api/orders net::ERR_FAILED
Access to fetch has been blocked by CORS policy
```

---

## ✅ Solution

Backend needs to create **7 Report Endpoints** that calculate data on the server-side and return ready-to-use results.

---

## 📡 Required Endpoints

| # | Endpoint | Description | Limit |
|---|----------|-------------|-------|
| 1 | `GET /api/reports/summary` | Order summary (totals, averages) | - |
| 2 | `GET /api/reports/by-country` | Report grouped by country | 100 |
| 3 | `GET /api/reports/by-supplier` | Report grouped by supplier | 100 |
| 4 | `GET /api/reports/by-travel-date` | Report grouped by travel month | 100 |
| 5 | `GET /api/reports/by-booking-date` | Report grouped by booking month | 100 |
| 6 | `GET /api/reports/repeat-customers` | Customers with >1 orders | 100 |
| 7 | `GET /api/reports/countries` | List of all countries | ∞ |

---

## 🔑 Query Parameters (All endpoints except #7)

```
travel_date_from    - Travel date start (YYYY-MM-DD)
travel_date_to      - Travel date end (YYYY-MM-DD)
booking_date_from   - Booking date start (YYYY-MM-DD)
booking_date_to     - Booking date end (YYYY-MM-DD)
country_id          - Country ID
supplier_id         - Supplier ID
```

**All parameters are optional**

---

## 📤 Response Format

### ✅ CORRECT - Use `success`
```json
{
  "success": true,
  "data": [...]
}
```

### ❌ WRONG - Don't use `status`
```json
{
  "status": "success",
  "data": [...]
}
```

---

## 🔐 Authentication

Every request must include header:
```
x-api-key: <token>
```

**Test Tokens:**
- `sk_test_4f8b2c9e1a3d5f7b9c0e2a4d6f8b1c3e`
- `sk_test_9a7b5c3d1e2f4a6b8c0d2e4f6a8b0c2d`

---

## 🌐 CORS Configuration

### Allowed Origins:
```
http://localhost:3000
http://localhost:3001
https://staging-finance-backoffice-report.vercel.app
https://finance-backoffice-report.vercel.app
```

### Allowed Headers:
```
Content-Type
x-api-key
```

**⚠️ IMPORTANT:** Must include `x-api-key` in allowed headers!

---

## 📊 Country Data Source

Extract from `product_snapshot` field in Orders table:

```json
{
  "country": {
    "id": "TH",
    "name_th": "ประเทศไทย",
    "name_en": "Thailand"
  }
}
```

**SQL Examples:**
- MySQL: `JSON_EXTRACT(product_snapshot, '$.country.id')`
- PostgreSQL: `product_snapshot->'country'->>'id'`

---

## 🧪 Testing

### Example Request:
```bash
curl -X GET "https://staging-finance-backoffice-report-api.vercel.app/api/reports/summary?travel_date_from=2025-01-01&travel_date_to=2025-01-31" \
  -H "x-api-key: sk_test_4f8b2c9e1a3d5f7b9c0e2a4d6f8b1c3e"
```

### Example Response:
```json
{
  "success": true,
  "data": {
    "total_orders": 1250,
    "total_customers": 890,
    "total_net_amount": 45678900.50,
    "avg_net_amount": 36543.12
  }
}
```

---

## ⚠️ Critical Requirements

1. ✅ Use `success: true` not `status: "success"`
2. ✅ Limit to 100 records (except countries/suppliers)
3. ✅ Extract country from `product_snapshot` JSON field
4. ✅ Month labels must be in Thai + Buddhist Era (e.g., "มกราคม 2568")
5. ✅ Add `x-api-key` to CORS allowed headers
6. ✅ Handle NULL/undefined data gracefully

---

## 📚 Documentation Structure

```
📁 Backend API Documentation
├── 📄 README_BACKEND_REQUIREMENTS.md (This file - Index)
├── 📄 SEND_TO_BACKEND_TEAM.md (Quick summary for team)
├── 📄 BACKEND_QUICK_START.md (Start here)
├── 📄 BACKEND_API_REQUIREMENTS_TH.md (Full specs - Thai)
├── 📄 BACKEND_API_REQUIREMENTS.md (Full specs - English)
├── 📄 BACKEND_SQL_EXAMPLES.md (SQL queries & helpers)
└── 🌐 backend-architecture-diagram.html (Visual diagram)
```

---

## 🎯 Reading Order

### For Backend Developers:
1. **Start:** [BACKEND_QUICK_START.md](BACKEND_QUICK_START.md)
2. **Details:** [BACKEND_API_REQUIREMENTS_TH.md](BACKEND_API_REQUIREMENTS_TH.md) or [BACKEND_API_REQUIREMENTS.md](BACKEND_API_REQUIREMENTS.md)
3. **SQL Help:** [BACKEND_SQL_EXAMPLES.md](BACKEND_SQL_EXAMPLES.md)
4. **Visual:** Open [backend-architecture-diagram.html](backend-architecture-diagram.html) in browser

### For Project Managers:
1. **Summary:** [SEND_TO_BACKEND_TEAM.md](SEND_TO_BACKEND_TEAM.md)
2. **Visual:** Open [backend-architecture-diagram.html](backend-architecture-diagram.html) in browser

---

## ✅ Implementation Checklist

- [ ] Create 7 report endpoints
- [ ] Use `success: true` in response format
- [ ] Configure CORS (4 origins)
- [ ] Add `x-api-key` to allowed headers
- [ ] Implement 100 record limit (except countries/suppliers)
- [ ] Extract country from `product_snapshot`
- [ ] Convert month names to Thai + Buddhist Era
- [ ] Handle NULL/undefined data
- [ ] Add database indexes for performance
- [ ] Test all endpoints with test tokens
- [ ] Deploy to staging environment
- [ ] Notify frontend team when complete

---

## 🎨 Visual Architecture

Open [backend-architecture-diagram.html](backend-architecture-diagram.html) in your browser to see:
- Before & After comparison
- All 7 endpoints with descriptions
- Benefits of the new architecture
- Interactive visual diagram

---

## 💡 Performance Tips

1. **Database Indexing:**
   - `travel_date`
   - `booking_date`
   - `supplier_id`
   - `customer_id`
   - JSON path for country (if supported)

2. **Caching:**
   - `/api/reports/countries` - cache 1 hour
   - `/api/suppliers` - cache 1 hour

3. **Query Optimization:**
   - Use `COUNT(DISTINCT customer_id)` for unique customers
   - Use `SUM()` and `AVG()` for calculations
   - Use `GROUP BY` instead of loops
   - Use `LIMIT 100` for reports

---

## 📞 Contact

If you have questions, contact the Frontend Team.

---

## 🚨 Priority

**🔴 High Priority** - Frontend is waiting for these endpoints to fix 429 Error

---

## 📅 Timeline

Please provide an estimated completion date so Frontend can plan accordingly.

---

## 🎯 Expected Outcome

- ✅ Fix 429 Rate Limit Error
- ✅ Faster report loading
- ✅ Reduced bandwidth usage
- ✅ Better scalability
- ✅ Improved user experience

---

**Created:** 2025-01-14  
**Version:** 1.0  
**Status:** 🔴 Waiting for Backend Implementation

---

## 📝 Notes

- All SQL examples are provided in [BACKEND_SQL_EXAMPLES.md](BACKEND_SQL_EXAMPLES.md)
- Response format examples are in [BACKEND_API_REQUIREMENTS.md](BACKEND_API_REQUIREMENTS.md)
- Thai translations available in [BACKEND_API_REQUIREMENTS_TH.md](BACKEND_API_REQUIREMENTS_TH.md)
- Visual diagram available in [backend-architecture-diagram.html](backend-architecture-diagram.html)

---

## 🔄 Updates

| Date | Version | Changes |
|------|---------|---------|
| 2025-01-14 | 1.0 | Initial documentation created |

---

**End of Document**
