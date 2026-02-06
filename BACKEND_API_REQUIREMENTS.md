# Backend API Requirements - Order Report System

## 📋 Overview
Frontend ต้องการ Backend สร้าง Report Endpoints เพื่อแก้ปัญหา 429 Rate Limit Error ที่เกิดจากการดึงข้อมูล Orders ทั้งหมดมาคำนวณฝั่ง Frontend

## 🎯 Required Endpoints

### 1. **GET /api/reports/summary**
สรุปภาพรวมของ Orders ทั้งหมด

**Query Parameters:**
- `travel_date_from` (optional): วันที่เดินทางเริ่มต้น (YYYY-MM-DD)
- `travel_date_to` (optional): วันที่เดินทางสิ้นสุด (YYYY-MM-DD)
- `booking_date_from` (optional): วันที่จองเริ่มต้น (YYYY-MM-DD)
- `booking_date_to` (optional): วันที่จองสิ้นสุด (YYYY-MM-DD)
- `country_id` (optional): รหัสประเทศ
- `supplier_id` (optional): รหัส Supplier

**Response Format:**
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

**คำอธิบาย Fields:**
- `total_orders`: จำนวน Orders ทั้งหมด
- `total_customers`: จำนวนลูกค้าที่ไม่ซ้ำกัน (unique customers)
- `total_net_amount`: ยอดรวมทั้งหมด (Net Amount)
- `avg_net_amount`: ค่าเฉลี่ยต่อ Order

---

### 2. **GET /api/reports/by-country**
รายงานแยกตามประเทศ (จาก product_snapshot)

**Query Parameters:** (เหมือน summary)

**Response Format:**
```json
{
  "success": true,
  "data": [
    {
      "country_id": "TH",
      "country_name": "ประเทศไทย",
      "total_orders": 450,
      "total_customers": 320,
      "total_net_amount": 15678900.50,
      "avg_net_amount": 34842.00
    },
    {
      "country_id": "JP",
      "country_name": "ญี่ปุ่น",
      "total_orders": 380,
      "total_customers": 290,
      "total_net_amount": 18900500.00,
      "avg_net_amount": 49738.16
    }
  ]
}
```

**คำอธิบาย:**
- ดึงข้อมูลประเทศจาก `product_snapshot` field ใน Orders table
- Group by ประเทศและคำนวณสถิติ
- เรียงลำดับตาม `total_orders` จากมากไปน้อย
- **จำกัดแสดงสูงสุด 100 records**

---

### 3. **GET /api/reports/by-supplier**
รายงานแยกตาม Supplier

**Query Parameters:** (เหมือน summary)

**Response Format:**
```json
{
  "success": true,
  "data": [
    {
      "supplier_id": "SUP001",
      "supplier_name": "ABC Tour Company",
      "total_orders": 280,
      "total_customers": 210,
      "total_net_amount": 9876543.00,
      "avg_net_amount": 35273.37
    }
  ]
}
```

**คำอธิบาย:**
- Group by Supplier และคำนวณสถิติ
- เรียงลำดับตาม `total_orders` จากมากไปน้อย
- **จำกัดแสดงสูงสุด 100 records**

---

### 4. **GET /api/reports/by-travel-date**
รายงานแยกตามเดือน/ปีของวันเดินทาง

**Query Parameters:** (เหมือน summary)

**Response Format:**
```json
{
  "success": true,
  "data": [
    {
      "travel_month": "2025-01",
      "travel_month_label": "มกราคม 2568",
      "total_orders": 125,
      "total_customers": 98,
      "total_net_amount": 4567890.00
    },
    {
      "travel_month": "2025-02",
      "travel_month_label": "กุมภาพันธ์ 2568",
      "total_orders": 145,
      "total_customers": 112,
      "total_net_amount": 5234567.00
    }
  ]
}
```

**คำอธิบาย:**
- Group by เดือน/ปีของวันเดินทาง
- `travel_month_label` เป็นชื่อเดือนภาษาไทย + ปี พ.ศ.
- เรียงลำดับตาม `travel_month` จากเก่าไปใหม่
- **จำกัดแสดงสูงสุด 100 records**

---

### 5. **GET /api/reports/by-booking-date**
รายงานแยกตามเดือน/ปีของวันจอง

**Query Parameters:** (เหมือน summary)

**Response Format:**
```json
{
  "success": true,
  "data": [
    {
      "booking_month": "2024-12",
      "booking_month_label": "ธันวาคม 2567",
      "total_orders": 98,
      "total_customers": 76,
      "total_net_amount": 3456789.00
    }
  ]
}
```

**คำอธิบาย:**
- Group by เดือน/ปีของวันจอง
- `booking_month_label` เป็นชื่อเดือนภาษาไทย + ปี พ.ศ.
- เรียงลำดับตาม `booking_month` จากเก่าไปใหม่
- **จำกัดแสดงสูงสุด 100 records**

---

### 6. **GET /api/reports/repeat-customers**
รายงานลูกค้าที่จองซ้ำ (มากกว่า 1 ครั้ง)

**Query Parameters:** (เหมือน summary)

**Response Format:**
```json
{
  "success": true,
  "data": [
    {
      "customer_id": "CUST001",
      "customer_code": "C001234",
      "customer_name": "นายสมชาย ใจดี",
      "phone_number": "0812345678",
      "total_orders": 5,
      "total_spent": 234567.00,
      "countries": "ไทย, ญี่ปุ่น, เกาหลี"
    },
    {
      "customer_id": "CUST002",
      "customer_code": "C001235",
      "customer_name": "นางสาวสมหญิง รักสวย",
      "phone_number": "0823456789",
      "total_orders": 3,
      "total_spent": 156789.00,
      "countries": "ญี่ปุ่น, สิงคโปร์"
    }
  ]
}
```

**คำอธิบาย:**
- แสดงเฉพาะลูกค้าที่มี Orders มากกว่า 1 ครั้ง
- `countries` เป็น string รวมชื่อประเทศที่เคยจอง (comma-separated)
- เรียงลำดับตาม `total_orders` จากมากไปน้อย
- **จำกัดแสดงสูงสุด 100 records**

---

### 7. **GET /api/reports/countries**
รายการประเทศทั้งหมดสำหรับ Filter Dropdown

**Response Format:**
```json
{
  "success": true,
  "data": [
    {
      "id": "TH",
      "name_th": "ประเทศไทย",
      "name_en": "Thailand"
    },
    {
      "id": "JP",
      "name_th": "ญี่ปุ่น",
      "name_en": "Japan"
    }
  ]
}
```

**คำอธิบาย:**
- ดึงรายการประเทศที่ไม่ซ้ำกันจาก Orders (จาก product_snapshot)
- เรียงลำดับตาม `name_th` A-Z
- ไม่จำกัดจำนวน (แสดงทั้งหมด)

---

### 8. **GET /api/reports/wholesale-by-country**
รายงาน Wholesale แยกตามประเทศปลายทาง (รองรับหลาย view mode)

**Query Parameters:**
- `travel_date_from` (optional): วันเดินทางเริ่มต้น (YYYY-MM-DD)
- `travel_date_to` (optional): วันเดินทางสิ้นสุด (YYYY-MM-DD)
- `booking_date_from` (optional): วันจองเริ่มต้น (YYYY-MM-DD)
- `booking_date_to` (optional): วันจองสิ้นสุด (YYYY-MM-DD)
- `country_id` (optional): รหัสประเทศ
- `supplier_id` (optional): รหัส Supplier
- `view_mode` **(required)**: โหมดการแสดงผล — `sales` | `travelers` | `orders` | `net_commission`

**Response Format:**
```json
{
  "success": true,
  "data": {
    "wholesales": [
      {
        "id": 46,
        "name": "บริษัท โปร บุ๊คกิ้ง เซนเตอร์ จำกัด",
        "countries": {
          "ญี่ปุ่น": 150,
          "เวียดนาม": 80,
          "จีน": 45
        },
        "total": 275
      }
    ],
    "summary": {
      "total_value": 425,
      "view_mode": "net_commission",
      "top_wholesale": { "name": "...", "count": 275 },
      "top_country": { "name": "ญี่ปุ่น", "count": 250 },
      "total_partners": 15
    },
    "country_totals": {
      "ญี่ปุ่น": 250,
      "เวียดนาม": 80
    }
  }
}
```

**คำอธิบาย:**
- ค่าใน `countries`, `total`, `summary.total_value`, `country_totals` เปลี่ยนตาม `view_mode`
- เรียงลำดับ wholesales ตาม `total` จากมากไปน้อย

**การคำนวณตาม view_mode:**

| view_mode | สูตร |
|---|---|
| `sales` | `SUM(o.net_amount)` |
| `travelers` | `SUM(o.pax)` หรือ COUNT travelers |
| `orders` | `COUNT(DISTINCT o.id)` |
| `net_commission` | `SUM(COALESCE(o.supplier_commission, 0) - COALESCE(o.discount, 0))` |

**เงื่อนไขพิเศษสำหรับ `view_mode=net_commission`:**
1. ต้อง INNER JOIN กับ `customer_order_installments` (กรอง `ordinal=1`, `status='paid'`)
2. กรอง `order_status != 'Canceled'`
3. กรองปีตามเวลาไทย GMT+7: `CONVERT_TZ(o.created_at, '+00:00', '+07:00')`

**SQL ที่ถูกต้อง (ตรวจสอบแล้วกับ Report):**
```sql
SELECT
    o.supplier_id,
    s.name AS supplier_name,
    country.name AS country_name,
    COALESCE(SUM(COALESCE(o.supplier_commission, 0) - COALESCE(o.discount, 0)), 0) AS net_commission
FROM
    tw_tourwow_db_views.v_Xqc7k7_orders AS o
INNER JOIN
    tw_tourwow_db_views.v_Xqc7k7_customer_order_installments AS i
    ON o.id = i.order_id
LEFT JOIN suppliers s ON o.supplier_id = s.id
LEFT JOIN countries country ON o.country_id = country.id
WHERE
    o.order_status != 'Canceled'
    AND i.ordinal = 1
    AND LOWER(i.status) = 'paid'
    AND YEAR(CONVERT_TZ(o.created_at, '+00:00', '+07:00')) = 2025
GROUP BY o.supplier_id, s.name, country.name
ORDER BY net_commission DESC;
```

---

### 9. **GET /api/suppliers** (มีอยู่แล้ว - ตรวจสอบ Response Format)
รายการ Suppliers ทั้งหมดสำหรับ Filter Dropdown

**Response Format ที่ต้องการ:**
```json
{
  "success": true,
  "data": [
    {
      "id": "SUP001",
      "name_th": "บริษัททัวร์ ABC จำกัด",
      "name_en": "ABC Tour Company Ltd."
    }
  ]
}
```

---

## 🔐 Authentication
ทุก Endpoint ต้องตรวจสอบ `x-api-key` header

**Example Request:**
```bash
curl -X GET "https://staging-finance-backoffice-report-api.vercel.app/api/reports/summary?travel_date_from=2025-01-01&travel_date_to=2025-01-31" \
  -H "x-api-key: sk_test_4f8b2c9e1a3d5f7b9c0e2a4d6f8b1c3e"
```

---

## 🌐 CORS Configuration
ต้องอนุญาต Origins ต่อไปนี้:
- `http://localhost:3000`
- `http://localhost:3001`
- `https://staging-finance-backoffice-report.vercel.app`
- `https://finance-backoffice-report.vercel.app`

**Allowed Headers:**
- `Content-Type`
- `x-api-key`

---

## ⚠️ Important Notes

### 1. Response Format
**ต้องใช้ `success` ไม่ใช่ `status`:**
```json
// ✅ ถูกต้อง
{
  "success": true,
  "data": [...]
}

// ❌ ผิด
{
  "status": "success",
  "data": [...]
}
```

### 2. Error Response
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Error description"
  }
}
```

### 3. Data Limits
- **ทุก Report Endpoint จำกัดแสดงสูงสุด 100 records**
- ยกเว้น `/api/reports/countries` และ `/api/suppliers` แสดงทั้งหมด

### 4. Date Format
- Input: `YYYY-MM-DD` (เช่น `2025-01-14`)
- Output: ตามที่ระบุในแต่ละ endpoint

### 5. Performance
- ควรใช้ Database Indexing สำหรับ fields ที่ใช้ filter และ group by
- พิจารณาใช้ Caching สำหรับ `/api/reports/countries` และ `/api/suppliers`

### 6. ข้อมูลประเทศ
- ดึงจาก `product_snapshot` field ใน Orders table
- ต้องจัดการกรณีที่ไม่มีข้อมูลประเทศ (แสดงเป็น "ไม่ระบุ")

---

## 🧪 Testing
ใช้ Test Token:
- `sk_test_4f8b2c9e1a3d5f7b9c0e2a4d6f8b1c3e`
- `sk_test_9a7b5c3d1e2f4a6b8c0d2e4f6a8b0c2d`

---

## 📊 Database Schema Reference

### Orders Table (สมมติ)
```
- id
- customer_id
- customer_code
- customer_name
- phone_number
- supplier_id
- travel_date
- booking_date
- net_amount
- product_snapshot (JSON - มีข้อมูลประเทศ)
- created_at
- updated_at
```

### Product Snapshot Structure (JSON)
```json
{
  "country": {
    "id": "TH",
    "name_th": "ประเทศไทย",
    "name_en": "Thailand"
  },
  // ... other product details
}
```

---

## ✅ Checklist สำหรับ Backend Team

- [ ] สร้าง 8 Report Endpoints ตามที่ระบุ (รวม wholesale-by-country)
- [ ] ตรวจสอบ Response Format ใช้ `success` แทน `status`
- [ ] เพิ่ม CORS configuration สำหรับ 4 origins
- [ ] เพิ่ม `x-api-key` ใน allowed headers
- [ ] จำกัด records สูงสุด 100 รายการ (ยกเว้น countries/suppliers)
- [ ] ดึงข้อมูลประเทศจาก `product_snapshot` field
- [ ] จัดการกรณีข้อมูลไม่ครบ (null/undefined)
- [ ] รองรับ `view_mode` parameter สำหรับ wholesale-by-country (sales/travelers/orders/net_commission)
- [ ] ใช้ INNER JOIN installments + กรอง ordinal=1, status=paid สำหรับ net_commission
- [ ] เพิ่ม Database Indexing สำหรับ performance
- [ ] Test ทุก endpoint ด้วย test tokens
- [ ] Deploy ขึ้น staging environment
- [ ] แจ้งกลับเมื่อเสร็จสมบูรณ์

---

## 📞 Contact
หากมีคำถามหรือต้องการข้อมูลเพิ่มเติม กรุณาติดต่อ Frontend Team
