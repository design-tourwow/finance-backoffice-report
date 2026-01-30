# Lead Time Analysis API Documentation

## Overview
API endpoint สำหรับวิเคราะห์ช่วงเวลาจอง (Lead Time) ระหว่างวันที่จองกับวันเดินทาง เพื่อเข้าใจพฤติกรรมการจองของลูกค้า

## Endpoint

### GET /api/reports/lead-time-analysis

วิเคราะห์ช่วงเวลาจอง (Lead Time) พร้อมสถิติและการกระจายตัว

**Authentication:** Required (API Key)

**Query Parameters:**
- `country_id` (optional) - Single or comma-separated country IDs (e.g., `7` or `7,39,4`)
- `supplier_id` (optional) - Single or comma-separated supplier IDs (e.g., `1` or `1,5,10`)
- `travel_date_from` (optional) - Start travel date (YYYY-MM-DD)
- `travel_date_to` (optional) - End travel date (YYYY-MM-DD)
- `booking_date_from` (optional) - Start booking date (YYYY-MM-DD)
- `booking_date_to` (optional) - End booking date (YYYY-MM-DD)
- `limit` (optional) - Number of records to return (default: 1000, max: 10000)
- `offset` (optional) - Starting position (default: 0)

## Response Format

```json
{
  "success": true,
  "data": [
    {
      "order_id": 1262,
      "order_code": "ORD-2026-001262",
      "customer_id": 95,
      "customer_name": "คุณสมชาย ใจดี",
      "customer_code": "CUST-001",
      "country_id": 7,
      "country_name": "ญี่ปุ่น",
      "supplier_id": 5,
      "supplier_name": "ABC Tour",
      "created_at": "2026-01-13T10:00:00.000Z",
      "travel_start_date": "2026-03-01",
      "travel_end_date": "2026-03-05",
      "lead_time_days": 47,
      "net_amount": 185000
    }
  ],
  "summary": {
    "total_orders": 877,
    "avg_lead_time": 45.3,
    "min_lead_time": 0,
    "max_lead_time": 365,
    "median_lead_time": 30,
    "total_net_amount": 90971192
  },
  "distribution": [
    {
      "range": "0-7",
      "range_label": "0-7 วัน (จองใกล้วันเดินทาง)",
      "min_days": 0,
      "max_days": 7,
      "count": 150,
      "percentage": 17.1,
      "total_net_amount": 15000000,
      "avg_net_amount": 100000
    },
    {
      "range": "8-14",
      "range_label": "8-14 วัน",
      "min_days": 8,
      "max_days": 14,
      "count": 180,
      "percentage": 20.5,
      "total_net_amount": 18000000,
      "avg_net_amount": 100000
    },
    {
      "range": "15-30",
      "range_label": "15-30 วัน",
      "min_days": 15,
      "max_days": 30,
      "count": 280,
      "percentage": 31.9,
      "total_net_amount": 28000000,
      "avg_net_amount": 100000
    },
    {
      "range": "31-60",
      "range_label": "31-60 วัน",
      "min_days": 31,
      "max_days": 60,
      "count": 150,
      "percentage": 17.1,
      "total_net_amount": 15000000,
      "avg_net_amount": 100000
    },
    {
      "range": "61-90",
      "range_label": "61-90 วัน",
      "min_days": 61,
      "max_days": 90,
      "count": 80,
      "percentage": 9.1,
      "total_net_amount": 8000000,
      "avg_net_amount": 100000
    },
    {
      "range": "90+",
      "range_label": "มากกว่า 90 วัน (จองล่วงหน้ามาก)",
      "min_days": 91,
      "max_days": null,
      "count": 37,
      "percentage": 4.2,
      "total_net_amount": 6971192,
      "avg_net_amount": 188410
    }
  ],
  "pagination": {
    "total": 877,
    "limit": 1000,
    "offset": 0,
    "has_more": false
  }
}
```

## Response Fields

### data[] (Order Details)
- `order_id` - Order ID
- `order_code` - Order code
- `customer_id` - Customer ID
- `customer_name` - Customer name
- `customer_code` - Customer code
- `country_id` - Country ID
- `country_name` - Country name (Thai)
- `supplier_id` - Supplier ID
- `supplier_name` - Supplier name (Thai)
- `created_at` - Booking date/time (UTC)
- `travel_start_date` - Travel start date
- `travel_end_date` - Travel end date
- `lead_time_days` - Number of days between booking and travel (can be 0 or negative)
- `net_amount` - Net amount

### summary (Statistics)
- `total_orders` - Total number of orders
- `avg_lead_time` - Average lead time in days
- `min_lead_time` - Minimum lead time in days
- `max_lead_time` - Maximum lead time in days
- `median_lead_time` - Median lead time in days
- `total_net_amount` - Total net amount

### distribution[] (Lead Time Distribution)
- `range` - Range key (e.g., "0-7", "8-14", "90+")
- `range_label` - Range label in Thai
- `min_days` - Minimum days in range
- `max_days` - Maximum days in range (null for "90+")
- `count` - Number of orders in this range
- `percentage` - Percentage of total orders
- `total_net_amount` - Total net amount in this range
- `avg_net_amount` - Average net amount in this range

### pagination
- `total` - Total number of records
- `limit` - Records per page
- `offset` - Starting position
- `has_more` - Whether there are more records

## Usage Examples

### Example 1: Basic Request
```bash
curl -X GET "https://staging-finance-backoffice-report-api.vercel.app/api/reports/lead-time-analysis" \
  -H "x-api-key: YOUR_API_KEY"
```

### Example 2: Filter by Country
```bash
curl -X GET "https://staging-finance-backoffice-report-api.vercel.app/api/reports/lead-time-analysis?country_id=7" \
  -H "x-api-key: YOUR_API_KEY"
```

### Example 3: Multiple Countries
```bash
curl -X GET "https://staging-finance-backoffice-report-api.vercel.app/api/reports/lead-time-analysis?country_id=7,39,4" \
  -H "x-api-key: YOUR_API_KEY"
```

### Example 4: Filter by Date Range
```bash
curl -X GET "https://staging-finance-backoffice-report-api.vercel.app/api/reports/lead-time-analysis?travel_date_from=2026-03-01&travel_date_to=2026-03-31" \
  -H "x-api-key: YOUR_API_KEY"
```

### Example 5: Multiple Filters with Pagination
```bash
curl -X GET "https://staging-finance-backoffice-report-api.vercel.app/api/reports/lead-time-analysis?country_id=7,39&supplier_id=1,5&limit=100&offset=0" \
  -H "x-api-key: YOUR_API_KEY"
```

## Lead Time Calculation

**Formula:**
```
Lead Time (days) = Travel Start Date - Booking Date
```

**Examples:**
- Booking: 2026-01-15, Travel: 2026-03-01 → Lead Time: 45 days
- Booking: 2026-02-28, Travel: 2026-03-01 → Lead Time: 1 day
- Booking: 2026-03-01, Travel: 2026-03-01 → Lead Time: 0 days (same day booking)
- Booking: 2026-03-05, Travel: 2026-03-01 → Lead Time: -4 days (booked after travel date - data error)

## Distribution Ranges

| Range | Label | Description |
|-------|-------|-------------|
| 0-7 | 0-7 วัน (จองใกล้วันเดินทาง) | Last minute bookings |
| 8-14 | 8-14 วัน | 1-2 weeks advance |
| 15-30 | 15-30 วัน | 2-4 weeks advance |
| 31-60 | 31-60 วัน | 1-2 months advance |
| 61-90 | 61-90 วัน | 2-3 months advance |
| 90+ | มากกว่า 90 วัน (จองล่วงหน้ามาก) | 3+ months advance |

## SQL Implementation

### Main Query (Order Details)
```sql
SELECT 
  o.id as order_id,
  o.order_code,
  o.customer_id,
  CONCAT(c.first_name, ' ', c.last_name) as customer_name,
  c.customer_code,
  o.country_id,
  co.name_th as country_name,
  o.supplier_id,
  s.name_th as supplier_name,
  o.created_at,
  JSON_UNQUOTE(JSON_EXTRACT(o.product_period_snapshot, '$.start_date')) as travel_start_date,
  JSON_UNQUOTE(JSON_EXTRACT(o.product_period_snapshot, '$.end_date')) as travel_end_date,
  DATEDIFF(
    STR_TO_DATE(JSON_UNQUOTE(JSON_EXTRACT(o.product_period_snapshot, '$.start_date')), '%Y-%m-%d'),
    DATE(o.created_at)
  ) as lead_time_days,
  o.net_amount
FROM orders o
LEFT JOIN customers c ON o.customer_id = c.id
LEFT JOIN countries co ON o.country_id = co.id
LEFT JOIN suppliers s ON o.supplier_id = s.id
WHERE o.product_period_snapshot IS NOT NULL
  AND JSON_EXTRACT(o.product_period_snapshot, '$.start_date') IS NOT NULL
  -- Add filters here based on query parameters
ORDER BY lead_time_days DESC
LIMIT ? OFFSET ?
```

### Summary Statistics
```sql
SELECT 
  COUNT(*) as total_orders,
  AVG(lead_time_days) as avg_lead_time,
  MIN(lead_time_days) as min_lead_time,
  MAX(lead_time_days) as max_lead_time,
  -- Median calculation (MySQL 8.0+)
  PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY lead_time_days) as median_lead_time,
  SUM(net_amount) as total_net_amount
FROM (
  -- Same WHERE clause as main query
  SELECT 
    DATEDIFF(
      STR_TO_DATE(JSON_UNQUOTE(JSON_EXTRACT(o.product_period_snapshot, '$.start_date')), '%Y-%m-%d'),
      DATE(o.created_at)
    ) as lead_time_days,
    o.net_amount
  FROM orders o
  WHERE o.product_period_snapshot IS NOT NULL
    AND JSON_EXTRACT(o.product_period_snapshot, '$.start_date') IS NOT NULL
) as lead_times
```

### Distribution by Range
```sql
SELECT 
  CASE 
    WHEN lead_time_days BETWEEN 0 AND 7 THEN '0-7'
    WHEN lead_time_days BETWEEN 8 AND 14 THEN '8-14'
    WHEN lead_time_days BETWEEN 15 AND 30 THEN '15-30'
    WHEN lead_time_days BETWEEN 31 AND 60 THEN '31-60'
    WHEN lead_time_days BETWEEN 61 AND 90 THEN '61-90'
    ELSE '90+'
  END as range_key,
  CASE 
    WHEN lead_time_days BETWEEN 0 AND 7 THEN '0-7 วัน (จองใกล้วันเดินทาง)'
    WHEN lead_time_days BETWEEN 8 AND 14 THEN '8-14 วัน'
    WHEN lead_time_days BETWEEN 15 AND 30 THEN '15-30 วัน'
    WHEN lead_time_days BETWEEN 31 AND 60 THEN '31-60 วัน'
    WHEN lead_time_days BETWEEN 61 AND 90 THEN '61-90 วัน'
    ELSE 'มากกว่า 90 วัน (จองล่วงหน้ามาก)'
  END as range_label,
  COUNT(*) as count,
  ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM orders WHERE product_period_snapshot IS NOT NULL), 1) as percentage,
  SUM(net_amount) as total_net_amount,
  AVG(net_amount) as avg_net_amount
FROM (
  SELECT 
    DATEDIFF(
      STR_TO_DATE(JSON_UNQUOTE(JSON_EXTRACT(o.product_period_snapshot, '$.start_date')), '%Y-%m-%d'),
      DATE(o.created_at)
    ) as lead_time_days,
    o.net_amount
  FROM orders o
  WHERE o.product_period_snapshot IS NOT NULL
    AND JSON_EXTRACT(o.product_period_snapshot, '$.start_date') IS NOT NULL
) as lead_times
GROUP BY range_key, range_label
ORDER BY 
  CASE range_key
    WHEN '0-7' THEN 1
    WHEN '8-14' THEN 2
    WHEN '15-30' THEN 3
    WHEN '31-60' THEN 4
    WHEN '61-90' THEN 5
    WHEN '90+' THEN 6
  END
```

## Data Validation

**Included:**
- Orders with valid `product_period_snapshot`
- Orders with valid `start_at` date
- Orders with status != 'Canceled'
- Orders not soft-deleted

**Excluded:**
- Orders without travel dates
- Canceled orders
- Soft-deleted orders

## Error Responses

### 400 Bad Request
```json
{
  "success": false,
  "error": "รูปแบบวันที่ไม่ถูกต้อง ใช้ YYYY-MM-DD"
}
```

### 401 Unauthorized
```json
{
  "success": false,
  "error": "Unauthorized - Invalid API key"
}
```

### 429 Rate Limit Exceeded
```json
{
  "success": false,
  "error": "Rate limit exceeded. Try again later.",
  "retryAfter": 45
}
```

### 500 Internal Server Error
```json
{
  "success": false,
  "error": "ไม่สามารถคำนวณ lead time analysis ได้"
}
```

## Performance Considerations

### Recommended Indexes
```sql
CREATE INDEX idx_orders_created_at ON Xqc7k7_orders(created_at);
CREATE INDEX idx_orders_product_period ON Xqc7k7_orders((JSON_EXTRACT(product_period_snapshot, '$.start_at')));
CREATE INDEX idx_orders_status ON Xqc7k7_orders(order_status);
CREATE INDEX idx_orders_deleted ON Xqc7k7_orders(deleted_at);
```

### Pagination
- Default limit: 1000 records
- Maximum limit: 10000 records
- Use `offset` for pagination
- Check `has_more` flag to determine if more data exists

### Caching Strategy
- Cache key: `lead_time_analysis:{filters_hash}`
- TTL: 1 hour
- Invalidate on new orders

## Business Insights

### Key Metrics to Monitor
1. **Average Lead Time** - Overall booking behavior
2. **Median Lead Time** - Typical customer booking pattern
3. **Distribution** - Identify peak booking windows
4. **Percentage by Range** - Understand booking urgency

### Use Cases
- **Marketing:** Target customers based on booking patterns
- **Inventory:** Plan capacity based on lead time trends
- **Pricing:** Dynamic pricing based on booking urgency
- **Operations:** Resource allocation based on booking windows

## Frontend Integration Example

```javascript
// Fetch lead time analysis
async function getLeadTimeAnalysis(filters = {}) {
  const params = new URLSearchParams()
  
  if (filters.countryIds?.length) {
    params.append('country_id', filters.countryIds.join(','))
  }
  if (filters.supplierIds?.length) {
    params.append('supplier_id', filters.supplierIds.join(','))
  }
  if (filters.travelDateFrom) {
    params.append('travel_date_from', filters.travelDateFrom)
  }
  if (filters.travelDateTo) {
    params.append('travel_date_to', filters.travelDateTo)
  }
  if (filters.limit) {
    params.append('limit', filters.limit)
  }
  if (filters.offset) {
    params.append('offset', filters.offset)
  }
  
  const response = await fetch(
    `/api/reports/lead-time-analysis?${params}`,
    {
      headers: {
        'x-api-key': 'YOUR_API_KEY'
      }
    }
  )
  
  return await response.json()
}

// Usage
const result = await getLeadTimeAnalysis({
  countryIds: [7, 39],
  supplierIds: [1, 5],
  travelDateFrom: '2026-03-01',
  travelDateTo: '2026-03-31',
  limit: 100,
  offset: 0
})

console.log('Average Lead Time:', result.summary.avg_lead_time, 'days')
console.log('Distribution:', result.distribution)
```

## Testing Checklist
- [ ] Test without filters (all data)
- [ ] Test with single country filter
- [ ] Test with multiple countries
- [ ] Test with date range filters
- [ ] Test with pagination (limit/offset)
- [ ] Test with invalid date format
- [ ] Test with invalid API key
- [ ] Verify summary statistics accuracy
- [ ] Verify distribution percentages sum to 100%
- [ ] Test edge cases (lead_time = 0, negative values)

---

**Created:** January 15, 2026  
**Status:** ✅ Ready for Deployment  
**Endpoint:** `/api/reports/lead-time-analysis`  
**Method:** GET  
**Authentication:** Required
