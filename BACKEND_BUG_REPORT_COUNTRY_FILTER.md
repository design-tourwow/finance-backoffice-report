# 🐛 Bug Report: Country Filter Not Working in Report APIs

**Date:** 2026-01-14  
**Priority:** HIGH  
**Status:** NEEDS FIX

---

## 📋 Problem Description

When filtering by `country_id` parameter, the `/api/reports/by-country` endpoint returns **ALL countries** instead of filtering to show only the selected country.

### Expected Behavior
When user selects "Greece" (country_id = X) from the filter dropdown:
- Summary should show: 1 Order, 1 Customer, ฿830,000 ✅ (Working)
- Chart should show: **Only Greece** ❌ (Not Working)
- Table should show: **Only Greece** ❌ (Not Working)

### Actual Behavior
- Summary is correctly filtered ✅
- Chart shows **ALL countries** (Japan, Vietnam, Greece, etc.) ❌
- Table shows **ALL countries** ❌

---

## 🔍 Technical Details

### Frontend Request
```
GET /api/reports/by-country?country_id=89
Headers:
  x-api-key: sk_test_...
```

### Current Backend Response (WRONG)
```json
{
  "success": true,
  "data": [
    { "country_name": "ญี่ปุ่น", "total_orders": 462, ... },
    { "country_name": "เวียดนาม", "total_orders": 234, ... },
    { "country_name": "กรีซ", "total_orders": 1, ... },
    { "country_name": "เกาหลี", "total_orders": 45, ... },
    // ... ALL countries returned
  ]
}
```

### Expected Backend Response (CORRECT)
```json
{
  "success": true,
  "data": [
    { "country_name": "กรีซ", "total_orders": 1, "total_customers": 1, "total_net_amount": 830000, "avg_net_amount": 830000 }
  ]
}
```

---

## 🛠️ Required Fix

### Affected Endpoints
All report endpoints need to respect the `country_id` filter:

1. ✅ `/api/reports/summary` - Already working correctly
2. ❌ `/api/reports/by-country` - **NEEDS FIX**
3. ❌ `/api/reports/by-supplier` - **NEEDS FIX**
4. ❌ `/api/reports/by-travel-date` - **NEEDS FIX**
5. ❌ `/api/reports/by-booking-date` - **NEEDS FIX**
6. ❌ `/api/reports/repeat-customers` - **NEEDS FIX**

### SQL Fix Example

**Current SQL (WRONG):**
```sql
SELECT 
  c.name_th as country_name,
  COUNT(DISTINCT o.id) as total_orders,
  COUNT(DISTINCT o.customer_id) as total_customers,
  SUM(o.net_amount) as total_net_amount,
  AVG(o.net_amount) as avg_net_amount
FROM orders o
LEFT JOIN countries c ON o.country_id = c.id
GROUP BY c.id, c.name_th
ORDER BY total_orders DESC
```

**Fixed SQL (CORRECT):**
```sql
SELECT 
  c.name_th as country_name,
  COUNT(DISTINCT o.id) as total_orders,
  COUNT(DISTINCT o.customer_id) as total_customers,
  SUM(o.net_amount) as total_net_amount,
  AVG(o.net_amount) as avg_net_amount
FROM orders o
LEFT JOIN countries c ON o.country_id = c.id
WHERE 1=1
  -- Add country filter if provided
  AND (@country_id IS NULL OR o.country_id = @country_id)
  -- Add supplier filter if provided
  AND (@supplier_id IS NULL OR o.supplier_id = @supplier_id)
  -- Add date filters if provided
  AND (@travel_date_from IS NULL OR o.travel_date >= @travel_date_from)
  AND (@travel_date_to IS NULL OR o.travel_date <= @travel_date_to)
  AND (@booking_date_from IS NULL OR o.booking_date >= @booking_date_from)
  AND (@booking_date_to IS NULL OR o.booking_date <= @booking_date_to)
GROUP BY c.id, c.name_th
ORDER BY total_orders DESC
```

---

## 📝 Implementation Checklist

### For `/api/reports/by-country`
- [ ] Accept `country_id` query parameter
- [ ] Add WHERE clause: `o.country_id = @country_id` (if provided)
- [ ] Accept `supplier_id` query parameter
- [ ] Add WHERE clause: `o.supplier_id = @supplier_id` (if provided)
- [ ] Accept date range parameters
- [ ] Add WHERE clauses for date filters
- [ ] Test with single country filter
- [ ] Test with multiple filters combined

### For `/api/reports/by-supplier`
- [ ] Accept `country_id` query parameter
- [ ] Accept `supplier_id` query parameter
- [ ] Accept date range parameters
- [ ] Add all WHERE clauses
- [ ] Test filters

### For `/api/reports/by-travel-date`
- [ ] Accept `country_id` query parameter
- [ ] Accept `supplier_id` query parameter
- [ ] Accept date range parameters
- [ ] Add all WHERE clauses
- [ ] Test filters

### For `/api/reports/by-booking-date`
- [ ] Accept `country_id` query parameter
- [ ] Accept `supplier_id` query parameter
- [ ] Accept date range parameters
- [ ] Add all WHERE clauses
- [ ] Test filters

### For `/api/reports/repeat-customers`
- [ ] Accept `country_id` query parameter
- [ ] Accept `supplier_id` query parameter
- [ ] Accept date range parameters
- [ ] Add all WHERE clauses
- [ ] Test filters

---

## 🧪 Test Cases

### Test Case 1: Filter by Country Only
```
Request: GET /api/reports/by-country?country_id=89
Expected: Only Greece data returned
```

### Test Case 2: Filter by Country + Date Range
```
Request: GET /api/reports/by-country?country_id=89&travel_date_from=2024-01-01&travel_date_to=2024-12-31
Expected: Only Greece data within date range
```

### Test Case 3: Filter by Country + Supplier
```
Request: GET /api/reports/by-country?country_id=89&supplier_id=5
Expected: Only Greece data for specific supplier
```

### Test Case 4: No Filters
```
Request: GET /api/reports/by-country
Expected: All countries (current behavior)
```

---

## 📊 Query Parameters Reference

All report endpoints should accept these parameters:

| Parameter | Type | Description | Example |
|-----------|------|-------------|---------|
| `country_id` | integer | Filter by country ID | `89` |
| `supplier_id` | integer | Filter by supplier ID | `5` |
| `travel_date_from` | date | Travel date start | `2024-01-01` |
| `travel_date_to` | date | Travel date end | `2024-12-31` |
| `booking_date_from` | date | Booking date start | `2024-01-01` |
| `booking_date_to` | date | Booking date end | `2024-12-31` |

---

## 🔗 Related Documentation

- See `BACKEND_API_REQUIREMENTS.md` for full API specifications
- See `BACKEND_SQL_EXAMPLES.md` for SQL query examples
- Frontend code: `order-report-api.js` (buildQueryString function)

---

## ⚠️ Important Notes

1. **All filters are optional** - If not provided, return all data
2. **Filters should be cumulative** - Multiple filters should work together (AND logic)
3. **Summary endpoint is working correctly** - Use it as reference
4. **Date format:** `YYYY-MM-DD` (e.g., `2024-01-15`)
5. **Response format must remain the same** - Only filter the data, don't change structure

---

## 📞 Contact

If you have questions about this bug report, please contact the Frontend team.

**Frontend Developer:** [Your Name]  
**Date Reported:** 2026-01-14
