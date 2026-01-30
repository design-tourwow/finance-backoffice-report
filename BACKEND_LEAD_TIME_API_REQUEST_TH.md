# เอกสาร API: รายงานวิเคราะห์ช่วงเวลาจอง (Lead Time Analysis)

## ภาพรวม
API endpoint สำหรับวิเคราะห์ช่วงเวลาจอง (Lead Time) ระหว่างวันที่จองกับวันเดินทาง เพื่อเข้าใจพฤติกรรมการจองของลูกค้า

## Endpoint

### GET /api/reports/lead-time-analysis

วิเคราะห์ช่วงเวลาจอง (Lead Time) พร้อมสถิติและการกระจายตัว

**Authentication:** Required (API Key)

**Query Parameters:**
- `country_id` (ไม่บังคับ) - รหัสประเทศเดียวหรือหลายรหัสคั่นด้วยคอมม่า (เช่น `7` หรือ `7,39,4`)
- `supplier_id` (ไม่บังคับ) - รหัส Supplier เดียวหรือหลายรหัสคั่นด้วยคอมม่า (เช่น `1` หรือ `1,5,10`)
- `travel_date_from` (ไม่บังคับ) - วันเดินทางเริ่มต้น (YYYY-MM-DD)
- `travel_date_to` (ไม่บังคับ) - วันเดินทางสิ้นสุด (YYYY-MM-DD)
- `booking_date_from` (ไม่บังคับ) - วันจองเริ่มต้น (YYYY-MM-DD)
- `booking_date_to` (ไม่บังคับ) - วันจองสิ้นสุด (YYYY-MM-DD)
- `limit` (ไม่บังคับ) - จำนวนข้อมูลที่ต้องการ (default: 1000, max: 10000)
- `offset` (ไม่บังคับ) - ตำแหน่งเริ่มต้น (default: 0)

## รูปแบบ Response

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

## ฟิลด์ใน Response

### data[] (รายละเอียด Order)
- `order_id` - รหัส Order
- `order_code` - รหัสคำสั่งซื้อ
- `customer_id` - รหัสลูกค้า
- `customer_name` - ชื่อลูกค้า
- `customer_code` - รหัสลูกค้า
- `country_id` - รหัสประเทศ
- `country_name` - ชื่อประเทศ (ภาษาไทย)
- `supplier_id` - รหัส Supplier
- `supplier_name` - ชื่อ Supplier (ภาษาไทย)
- `created_at` - วันที่/เวลาจอง (UTC)
- `travel_start_date` - วันเดินทางเริ่มต้น
- `travel_end_date` - วันเดินทางสิ้นสุด
- `lead_time_days` - จำนวนวันระหว่างจองกับเดินทาง (สามารถเป็น 0 หรือติดลบได้)
- `net_amount` - ยอดเงินสุทธิ

### summary (สถิติ)
- `total_orders` - จำนวน Orders ทั้งหมด
- `avg_lead_time` - Lead Time เฉลี่ย (วัน)
- `min_lead_time` - Lead Time น้อยสุด (วัน)
- `max_lead_time` - Lead Time มากสุด (วัน)
- `median_lead_time` - Lead Time กลาง (วัน)
- `total_net_amount` - ยอดเงินสุทธิรวม

### distribution[] (การกระจายตัว Lead Time)
- `range` - รหัสช่วง (เช่น "0-7", "8-14", "90+")
- `range_label` - ชื่อช่วงภาษาไทย
- `min_days` - จำนวนวันต่ำสุดในช่วง
- `max_days` - จำนวนวันสูงสุดในช่วง (null สำหรับ "90+")
- `count` - จำนวน Orders ในช่วงนี้
- `percentage` - เปอร์เซ็นต์ของ Orders ทั้งหมด
- `total_net_amount` - ยอดเงินสุทธิรวมในช่วงนี้
- `avg_net_amount` - ยอดเงินสุทธิเฉลี่ยในช่วงนี้

### pagination
- `total` - จำนวนข้อมูลทั้งหมด
- `limit` - จำนวนข้อมูลต่อหน้า
- `offset` - ตำแหน่งเริ่มต้น
- `has_more` - มีข้อมูลเพิ่มเติมหรือไม่

## ตัวอย่างการใช้งาน

### ตัวอย่าง 1: Request พื้นฐาน
```bash
curl -X GET "https://staging-finance-backoffice-report-api.vercel.app/api/reports/lead-time-analysis" \
  -H "x-api-key: YOUR_API_KEY"
```

### ตัวอย่าง 2: กรองตามประเทศ
```bash
curl -X GET "https://staging-finance-backoffice-report-api.vercel.app/api/reports/lead-time-analysis?country_id=7" \
  -H "x-api-key: YOUR_API_KEY"
```

### ตัวอย่าง 3: หลายประเทศ
```bash
curl -X GET "https://staging-finance-backoffice-report-api.vercel.app/api/reports/lead-time-analysis?country_id=7,39,4" \
  -H "x-api-key: YOUR_API_KEY"
```

### ตัวอย่าง 4: กรองตามช่วงวันที่
```bash
curl -X GET "https://staging-finance-backoffice-report-api.vercel.app/api/reports/lead-time-analysis?travel_date_from=2026-03-01&travel_date_to=2026-03-31" \
  -H "x-api-key: YOUR_API_KEY"
```

### ตัวอย่าง 5: หลาย Filters พร้อม Pagination
```bash
curl -X GET "https://staging-finance-backoffice-report-api.vercel.app/api/reports/lead-time-analysis?country_id=7,39&supplier_id=1,5&limit=100&offset=0" \
  -H "x-api-key: YOUR_API_KEY"
```

## การคำนวณ Lead Time

**สูตร:**
```
Lead Time (วัน) = วันเดินทาง - วันจอง
```

**ตัวอย่าง:**
- จอง: 2026-01-15, เดินทาง: 2026-03-01 → Lead Time: 45 วัน
- จอง: 2026-02-28, เดินทาง: 2026-03-01 → Lead Time: 1 วัน
- จอง: 2026-03-01, เดินทาง: 2026-03-01 → Lead Time: 0 วัน (จองวันเดินทาง)
- จอง: 2026-03-05, เดินทาง: 2026-03-01 → Lead Time: -4 วัน (จองหลังวันเดินทาง - ข้อมูลผิดพลาด)

## ช่วงการกระจายตัว

| ช่วง | ชื่อ | คำอธิบาย |
|------|------|----------|
| 0-7 | 0-7 วัน (จองใกล้วันเดินทาง) | จองใกล้วันเดินทาง |
| 8-14 | 8-14 วัน | จองล่วงหน้า 1-2 สัปดาห์ |
| 15-30 | 15-30 วัน | จองล่วงหน้า 2-4 สัปดาห์ |
| 31-60 | 31-60 วัน | จองล่วงหน้า 1-2 เดือน |
| 61-90 | 61-90 วัน | จองล่วงหน้า 2-3 เดือน |
| 90+ | มากกว่า 90 วัน (จองล่วงหน้ามาก) | จองล่วงหน้ามากกว่า 3 เดือน |

## การทำงานใน SQL

### Query หลัก (รายละเอียด Order)
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
  -- เพิ่ม filters ตาม query parameters
ORDER BY lead_time_days DESC
LIMIT ? OFFSET ?
```

### สถิติสรุป
```sql
SELECT 
  COUNT(*) as total_orders,
  AVG(lead_time_days) as avg_lead_time,
  MIN(lead_time_days) as min_lead_time,
  MAX(lead_time_days) as max_lead_time,
  -- คำนวณ Median (MySQL 8.0+)
  PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY lead_time_days) as median_lead_time,
  SUM(net_amount) as total_net_amount
FROM (
  -- WHERE clause เดียวกับ main query
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

### การกระจายตัวตามช่วง
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

## การตรวจสอบข้อมูล

**รวมข้อมูล:**
- Orders ที่มี `product_period_snapshot` ถูกต้อง
- Orders ที่มี `start_at` date ถูกต้อง
- Orders ที่ status != 'Canceled'
- Orders ที่ไม่ถูก soft-deleted

**ไม่รวมข้อมูล:**
- Orders ที่ไม่มีวันเดินทาง
- Orders ที่ถูกยกเลิก
- Orders ที่ถูก soft-deleted

## ประสิทธิภาพ

### Index ที่แนะนำ
```sql
CREATE INDEX idx_orders_created_at ON Xqc7k7_orders(created_at);
CREATE INDEX idx_orders_product_period ON Xqc7k7_orders((JSON_EXTRACT(product_period_snapshot, '$.start_at')));
CREATE INDEX idx_orders_status ON Xqc7k7_orders(order_status);
CREATE INDEX idx_orders_deleted ON Xqc7k7_orders(deleted_at);
```

### Pagination
- Default limit: 1000 records
- Maximum limit: 10000 records
- ใช้ `offset` สำหรับ pagination
- ตรวจสอบ `has_more` flag เพื่อดูว่ามีข้อมูลเพิ่มเติมหรือไม่

### กลยุทธ์ Caching
- Cache key: `lead_time_analysis:{filters_hash}`
- TTL: 1 ชั่วโมง
- Invalidate เมื่อมี orders ใหม่

## การจัดการ Error

### Error Responses

**400 Bad Request:**
```json
{
  "success": false,
  "error": "รูปแบบวันที่ไม่ถูกต้อง ใช้ YYYY-MM-DD"
}
```

**401 Unauthorized:**
```json
{
  "success": false,
  "error": "Unauthorized - Invalid API key"
}
```

**429 Rate Limit Exceeded:**
```json
{
  "success": false,
  "error": "Rate limit exceeded. Try again later.",
  "retryAfter": 45
}
```

**500 Internal Server Error:**
```json
{
  "success": false,
  "error": "ไม่สามารถคำนวณ lead time analysis ได้"
}
```

## ข้อมูลเชิงธุรกิจ

### ตัวชี้วัดสำคัญที่ควรติดตาม
1. **Average Lead Time** - พฤติกรรมการจองโดยรวม
2. **Median Lead Time** - รูปแบบการจองทั่วไปของลูกค้า
3. **Distribution** - ระบุช่วงเวลาจองที่มีมากที่สุด
4. **Percentage by Range** - เข้าใจความเร่งด่วนในการจอง

### กรณีการใช้งาน
- **การตลาด:** กำหนดกลุ่มเป้าหมายตามรูปแบบการจอง
- **สินค้าคงคลัง:** วางแผนกำลังการผลิตตามแนวโน้ม lead time
- **ราคา:** กำหนดราคาแบบไดนามิกตามความเร่งด่วนในการจอง
- **การดำเนินงาน:** จัดสรรทรัพยากรตามช่วงเวลาจอง

## ตัวอย่างการ Integrate กับ Frontend

```javascript
// ดึงข้อมูล lead time analysis
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

// การใช้งาน
const result = await getLeadTimeAnalysis({
  countryIds: [7, 39],
  supplierIds: [1, 5],
  travelDateFrom: '2026-03-01',
  travelDateTo: '2026-03-31',
  limit: 100,
  offset: 0
})

console.log('Lead Time เฉลี่ย:', result.summary.avg_lead_time, 'วัน')
console.log('การกระจายตัว:', result.distribution)
```

## รายการตรวจสอบการทดสอบ
- [ ] ทดสอบโดยไม่มี filters (ข้อมูลทั้งหมด)
- [ ] ทดสอบกรองประเทศเดียว
- [ ] ทดสอบกรองหลายประเทศ
- [ ] ทดสอบกรองตามช่วงวันที่
- [ ] ทดสอบ pagination (limit/offset)
- [ ] ทดสอบรูปแบบวันที่ไม่ถูกต้อง
- [ ] ทดสอบ API key ไม่ถูกต้อง
- [ ] ตรวจสอบความถูกต้องของสถิติสรุป
- [ ] ตรวจสอบเปอร์เซ็นต์การกระจายตัวรวมเป็น 100%
- [ ] ทดสอบกรณีพิเศษ (lead_time = 0, ค่าติดลบ)

---

**สร้างเอกสาร:** 15 มกราคม 2026  
**สถานะ:** ✅ พร้อม Deploy  
**Endpoint:** `/api/reports/lead-time-analysis`  
**Method:** GET  
**Authentication:** Required
