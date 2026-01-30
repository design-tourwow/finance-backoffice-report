# Backend API Enhancement Request: Multiple Country/Supplier Filter Support

## Issue Summary
Currently, the Order Report API endpoints do not support filtering by multiple countries or suppliers. When multiple IDs are sent, the API returns either 0 results or a 500 error.

## Current Behavior

### Working (Single Selection)
```
GET /api/reports/by-country?country_id=7
✅ Returns: Orders for Japan only (463 orders)
```

### Not Working (Multiple Selection)
```
GET /api/reports/by-country?country_id=7,39
❌ Returns: 0 orders or empty result

GET /api/reports/by-country?country_id=["7","39"]
❌ Returns: 500 Internal Server Error
Error: "Invalid JSON text in argument 2 to function json_contains"
```

## Requested Enhancement

### Option 1: Comma-Separated Values (Recommended)
Support comma-separated IDs in query parameters:

```
GET /api/reports/by-country?country_id=7,39,4
GET /api/reports/by-supplier?supplier_id=1,5,10
GET /api/reports/summary?country_id=7,39&supplier_id=1,5
```

**Backend Implementation:**
```sql
-- Parse comma-separated string and use IN clause
WHERE country_id IN (7, 39, 4)
```

### Option 2: Array Parameters
Support array-style parameters:

```
GET /api/reports/by-country?country_id[]=7&country_id[]=39&country_id[]=4
GET /api/reports/by-supplier?supplier_id[]=1&supplier_id[]=5
```

**Backend Implementation:**
```javascript
// Parse array from query params
const countryIds = req.query.country_id; // ['7', '39', '4']
```

### Option 3: JSON Array in Query String
Support JSON array in query parameter:

```
GET /api/reports/by-country?country_id=["7","39","4"]
```

**Note:** This requires proper URL encoding: `country_id=%5B%227%22%2C%2239%22%2C%224%22%5D`

## Affected Endpoints

All report endpoints should support multiple filters:

1. **GET /api/reports/summary**
   - `country_id` (single or multiple)
   - `supplier_id` (single or multiple)

2. **GET /api/reports/by-country**
   - `country_id` (single or multiple)
   - `supplier_id` (single or multiple)

3. **GET /api/reports/by-supplier**
   - `country_id` (single or multiple)
   - `supplier_id` (single or multiple)

4. **GET /api/reports/by-travel-date**
   - `country_id` (single or multiple)
   - `supplier_id` (single or multiple)

5. **GET /api/reports/by-booking-date**
   - `country_id` (single or multiple)
   - `supplier_id` (single or multiple)

## Expected Response Format

Response format should remain the same, but include data for all selected countries/suppliers:

### Example: Multiple Countries
```json
{
  "success": true,
  "data": [
    {
      "country_id": 7,
      "country_name": "ญี่ปุ่น",
      "total_orders": 463,
      "total_customers": 95,
      "total_net_amount": 85738019,
      "avg_net_amount": 185179
    },
    {
      "country_id": 39,
      "country_name": "จีน",
      "total_orders": 156,
      "total_customers": 42,
      "total_net_amount": 12450000,
      "avg_net_amount": 79807
    },
    {
      "country_id": 4,
      "country_name": "จอร์เจีย",
      "total_orders": 89,
      "total_customers": 28,
      "total_net_amount": 8920000,
      "avg_net_amount": 100224
    }
  ]
}
```

## SQL Implementation Example

### Current (Single Value)
```sql
SELECT 
  country_id,
  country_name,
  COUNT(*) as total_orders,
  COUNT(DISTINCT customer_id) as total_customers,
  SUM(net_amount) as total_net_amount,
  AVG(net_amount) as avg_net_amount
FROM orders
WHERE country_id = ?  -- Single value only
GROUP BY country_id, country_name
```

### Proposed (Multiple Values)
```sql
SELECT 
  country_id,
  country_name,
  COUNT(*) as total_orders,
  COUNT(DISTINCT customer_id) as total_customers,
  SUM(net_amount) as total_net_amount,
  AVG(net_amount) as avg_net_amount
FROM orders
WHERE country_id IN (?, ?, ?)  -- Multiple values
GROUP BY country_id, country_name
```

## Backward Compatibility

The enhancement should maintain backward compatibility:

- **Single value:** `country_id=7` → Works as before
- **Multiple values:** `country_id=7,39,4` → New functionality
- **No value:** No `country_id` parameter → Show all (as before)

## Testing Scenarios

### Test Case 1: Single Country
```
Request: GET /api/reports/by-country?country_id=7
Expected: Orders for Japan only
```

### Test Case 2: Multiple Countries
```
Request: GET /api/reports/by-country?country_id=7,39,4
Expected: Orders for Japan, China, and Georgia
```

### Test Case 3: Multiple Countries + Date Range
```
Request: GET /api/reports/by-country?country_id=7,39&travel_date_from=2024-01-01&travel_date_to=2024-12-31
Expected: Orders for Japan and China within date range
```

### Test Case 4: Multiple Countries + Multiple Suppliers
```
Request: GET /api/reports/summary?country_id=7,39&supplier_id=1,5,10
Expected: Summary for selected countries and suppliers
```

## Priority
**HIGH** - This blocks the Order Report feature from being fully functional.

## Timeline
Please implement this enhancement as soon as possible to unblock the frontend development.

## Contact
If you have any questions or need clarification, please contact the frontend team.

---

**Document Created:** 2026-01-15
**Status:** Pending Backend Implementation
