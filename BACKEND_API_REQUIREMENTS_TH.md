# คำสั่งสำหรับทีม Backend - ระบบ Order Report

## 📋 สรุปปัญหา
ตอนนี้ Frontend พยายามดึงข้อมูล Orders ทั้งหมดมาคำนวณฝั่ง Client ทำให้เกิด **429 Rate Limit Error**

## 🎯 วิธีแก้ไข
Backend ต้องสร้าง **7 Report Endpoints** เพื่อคำนวณข้อมูลฝั่ง Server แล้วส่งผลลัพธ์ที่พร้อมใช้งานกลับมา

---

## 📡 Endpoints ที่ต้องสร้าง

### 1. สรุปภาพรวม Orders
**Endpoint:** `GET /api/reports/summary`

**Parameters ที่รับ (Query String):**
- `travel_date_from` - วันเดินทางเริ่มต้น (YYYY-MM-DD)
- `travel_date_to` - วันเดินทางสิ้นสุด (YYYY-MM-DD)
- `booking_date_from` - วันจองเริ่มต้น (YYYY-MM-DD)
- `booking_date_to` - วันจองสิ้นสุด (YYYY-MM-DD)
- `country_id` - รหัสประเทศ
- `supplier_id` - รหัส Supplier

**ส่งกลับ:**
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

### 2. รายงานแยกตามประเทศ
**Endpoint:** `GET /api/reports/by-country`

**Parameters:** เหมือนข้อ 1

**ส่งกลับ:**
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
    }
  ]
}
```

**วิธีทำ:**
- ดึงข้อมูลประเทศจาก field `product_snapshot` ใน Orders table
- Group by ประเทศ แล้วคำนวณ:
  - จำนวน Orders
  - จำนวนลูกค้าที่ไม่ซ้ำ
  - ยอดรวม Net Amount
  - ค่าเฉลี่ยต่อ Order
- เรียงจากมากไปน้อย
- **จำกัดแสดงสูงสุด 100 รายการ**

---

### 3. รายงานแยกตาม Supplier
**Endpoint:** `GET /api/reports/by-supplier`

**Parameters:** เหมือนข้อ 1

**ส่งกลับ:**
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

**วิธีทำ:**
- Group by Supplier แล้วคำนวณเหมือนข้อ 2
- **จำกัดแสดงสูงสุด 100 รายการ**

---

### 4. รายงานแยกตามเดือนเดินทาง
**Endpoint:** `GET /api/reports/by-travel-date`

**Parameters:** เหมือนข้อ 1

**ส่งกลับ:**
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
    }
  ]
}
```

**วิธีทำ:**
- Group by เดือน/ปีของวันเดินทาง
- `travel_month_label` ต้องเป็นภาษาไทย + ปี พ.ศ.
- เรียงจากเก่าไปใหม่
- **จำกัดแสดงสูงสุด 100 รายการ**

---

### 5. รายงานแยกตามเดือนจอง
**Endpoint:** `GET /api/reports/by-booking-date`

**Parameters:** เหมือนข้อ 1

**ส่งกลับ:**
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

**วิธีทำ:**
- Group by เดือน/ปีของวันจอง
- `booking_month_label` ต้องเป็นภาษาไทย + ปี พ.ศ.
- เรียงจากเก่าไปใหม่
- **จำกัดแสดงสูงสุด 100 รายการ**

---

### 6. รายงานลูกค้าที่จองซ้ำ
**Endpoint:** `GET /api/reports/repeat-customers`

**Parameters:** เหมือนข้อ 1

**ส่งกลับ:**
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
    }
  ]
}
```

**วิธีทำ:**
- แสดงเฉพาะลูกค้าที่มี Orders **มากกว่า 1 ครั้ง**
- `countries` รวมชื่อประเทศที่เคยจอง (คั่นด้วย comma)
- เรียงจากมากไปน้อย
- **จำกัดแสดงสูงสุด 100 รายการ**

---

### 7. รายการประเทศทั้งหมด
**Endpoint:** `GET /api/reports/countries`

**ส่งกลับ:**
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

**วิธีทำ:**
- ดึงรายการประเทศที่ไม่ซ้ำจาก Orders (จาก `product_snapshot`)
- เรียง A-Z ตาม `name_th`
- **ไม่จำกัดจำนวน** (แสดงทั้งหมด)

---

### 8. รายงาน Wholesale แยกตามประเทศปลายทาง
**Endpoint:** `GET /api/reports/wholesale-by-country`

**Parameters ที่รับ (Query String):**
- `travel_date_from` - วันเดินทางเริ่มต้น (YYYY-MM-DD)
- `travel_date_to` - วันเดินทางสิ้นสุด (YYYY-MM-DD)
- `booking_date_from` - วันจองเริ่มต้น (YYYY-MM-DD)
- `booking_date_to` - วันจองสิ้นสุด (YYYY-MM-DD)
- `country_id` - รหัสประเทศ
- `supplier_id` - รหัส Supplier
- `view_mode` - **โหมดการแสดงผล (จำเป็น)** ค่าที่เป็นไปได้:
  - `sales` - ยอดจองรวม (SUM ของ net_amount)
  - `travelers` - จำนวนผู้เดินทาง (COUNT travelers)
  - `orders` - จำนวนออเดอร์ (COUNT orders)
  - `net_commission` - **ค่าคอมสุทธิ** (ดูรายละเอียดการคำนวณด้านล่าง)

**ส่งกลับ:**
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

> **หมายเหตุ:** ค่าใน `countries`, `total`, `summary.total_value`, และ `country_totals` จะเปลี่ยนตาม `view_mode` ที่ส่งมา (จำนวน orders / ยอดจอง / จำนวนผู้เดินทาง / ค่าคอมสุทธิ)

**วิธีทำ:**
- Group by Supplier แล้วแยกตามประเทศ
- เรียงลำดับ wholesales ตาม total มากไปน้อย
- คำนวณ summary และ country_totals
- **ค่าที่คำนวณจะแตกต่างกันตาม `view_mode`** (ดูตารางด้านล่าง)

---

### การคำนวณตาม view_mode

| view_mode | ค่าที่คำนวณ | สูตร |
|---|---|---|
| `sales` | ยอดจองรวม | `SUM(o.net_amount)` |
| `travelers` | จำนวนผู้เดินทาง | `SUM(o.pax)` หรือ COUNT travelers |
| `orders` | จำนวนออเดอร์ | `COUNT(DISTINCT o.id)` |
| `net_commission` | **ค่าคอมสุทธิ** | `SUM(COALESCE(o.supplier_commission, 0) - COALESCE(o.discount, 0))` |

---

### เงื่อนไขสำคัญสำหรับ view_mode = `net_commission`

เมื่อ `view_mode=net_commission` **ต้องใช้เงื่อนไขเพิ่มเติม** ดังนี้:

**1. สูตรคำนวณ:**
```
ค่าคอมสุทธิ = supplier_commission - discount
```

**2. ต้อง INNER JOIN กับตาราง installments:**
- JOIN กับ `customer_order_installments` โดย `o.id = i.order_id`
- กรองเฉพาะ **งวดแรก** (`i.ordinal = 1`)
- กรองเฉพาะงวดที่ **จ่ายเงินแล้ว** (`LOWER(i.status) = 'paid'`)

**3. กรอง Order ที่ไม่ยกเลิก:**
- `o.order_status != 'Canceled'`

**4. กรองปีตามเวลาไทย (GMT+7):**
- ใช้ `CONVERT_TZ(o.created_at, '+00:00', '+07:00')` สำหรับการกรองปี

**SQL ที่ถูกต้อง (ตรวจสอบแล้วกับ Report ปอ):**
```sql
-- คำนวณค่าคอมสุทธิรวม (ตรวจสอบกับ Report แล้ว ค่าตรง)
SELECT
    COALESCE(SUM(COALESCE(o.supplier_commission, 0) - COALESCE(o.discount, 0)), 0) AS total_net_commission
FROM
    tw_tourwow_db_views.v_Xqc7k7_orders AS o
INNER JOIN
    tw_tourwow_db_views.v_Xqc7k7_customer_order_installments AS i
    ON o.id = i.order_id
WHERE
    o.order_status != 'Canceled'
    AND i.ordinal = 1
    AND LOWER(i.status) = 'paid'
    AND YEAR(CONVERT_TZ(o.created_at, '+00:00', '+07:00')) = 2025;
```

**SQL สำหรับ Group by Wholesale + Country (สำหรับ endpoint นี้):**
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
    -- เพิ่ม filters จาก query params ตามปกติ
GROUP BY o.supplier_id, s.name, country.name
ORDER BY net_commission DESC;
```

> **สาเหตุที่ต้องใช้เงื่อนไขพิเศษ:** เนื่องจากค่าคอมสุทธิต้องนับเฉพาะ Orders ที่ลูกค้าจ่ายเงินงวดแรกแล้วเท่านั้น ถ้าไม่ JOIN กับ installments ค่าจะไม่ตรง เพราะจะรวม Orders ที่ยังไม่ได้จ่ายเงินเข้ามาด้วย

---

## 🔐 Authentication
ทุก Request ต้องมี Header:
```
x-api-key: sk_test_4f8b2c9e1a3d5f7b9c0e2a4d6f8b1c3e
```

---

## 🌐 CORS Settings
ต้องอนุญาต Origins:
```
http://localhost:3000
http://localhost:3001
https://staging-finance-backoffice-report.vercel.app
https://finance-backoffice-report.vercel.app
```

ต้องอนุญาต Headers:
```
Content-Type
x-api-key
```

---

## ⚠️ สิ่งสำคัญที่ต้องระวัง

### 1. Response Format ต้องใช้ `success` ไม่ใช่ `status`
```json
// ✅ ถูกต้อง
{
  "success": true,
  "data": [...]
}

// ❌ ผิด - อย่าใช้
{
  "status": "success",
  "data": [...]
}
```

### 2. จำกัดจำนวน Records
- Report ทุกตัว: **สูงสุด 100 รายการ**
- ยกเว้น countries และ suppliers: แสดงทั้งหมด

### 3. ข้อมูลประเทศ
- ดึงจาก field `product_snapshot` ใน Orders table
- ถ้าไม่มีข้อมูล ให้แสดง "ไม่ระบุ"

### 4. Format วันที่
- รับเข้ามา: `YYYY-MM-DD` (เช่น `2025-01-14`)
- ส่งออกไป: ตามที่ระบุในแต่ละ endpoint

---

## 🧪 Testing
ใช้ Token นี้ทดสอบ:
```
sk_test_4f8b2c9e1a3d5f7b9c0e2a4d6f8b1c3e
sk_test_9a7b5c3d1e2f4a6b8c0d2e4f6a8b0c2d
```

**ตัวอย่างการเรียกใช้:**
```bash
curl -X GET "https://staging-finance-backoffice-report-api.vercel.app/api/reports/summary?travel_date_from=2025-01-01&travel_date_to=2025-01-31" \
  -H "x-api-key: sk_test_4f8b2c9e1a3d5f7b9c0e2a4d6f8b1c3e"
```

---

## 📊 โครงสร้างข้อมูล (สมมติ)

### Orders Table
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
```

### Product Snapshot (JSON)
```json
{
  "country": {
    "id": "TH",
    "name_th": "ประเทศไทย",
    "name_en": "Thailand"
  }
}
```

---

## ✅ Checklist

- [ ] สร้าง 8 Endpoints ตามที่ระบุ (รวม wholesale-by-country + view_mode)
- [ ] ใช้ `success: true` ใน Response (ไม่ใช่ `status`)
- [ ] ตั้งค่า CORS ให้ถูกต้อง (4 origins)
- [ ] เพิ่ม `x-api-key` ใน allowed headers
- [ ] จำกัด 100 records (ยกเว้น countries/suppliers)
- [ ] ดึงประเทศจาก `product_snapshot`
- [ ] รองรับ `view_mode` parameter สำหรับ wholesale-by-country (sales/travelers/orders/net_commission)
- [ ] net_commission: ใช้สูตร `supplier_commission - discount` + INNER JOIN installments (ordinal=1, status=paid)
- [ ] จัดการกรณีข้อมูลไม่ครบ (null/undefined)
- [ ] ทดสอบทุก endpoint
- [ ] Deploy ขึ้น staging
- [ ] แจ้งกลับเมื่อเสร็จ

---

## 💡 Tips สำหรับ Performance

1. **Database Indexing:**
   - `travel_date`
   - `booking_date`
   - `country_id` (ถ้ามี)
   - `supplier_id`
   - `customer_id`

2. **Caching:**
   - `/api/reports/countries` - cache 1 ชั่วโมง
   - `/api/suppliers` - cache 1 ชั่วโมง

3. **Query Optimization:**
   - ใช้ `COUNT(DISTINCT customer_id)` สำหรับนับลูกค้า
   - ใช้ `SUM()` และ `AVG()` สำหรับคำนวณยอดเงิน
   - ใช้ `GROUP BY` แทนการ loop

---

## 📞 ติดต่อ
หากมีคำถาม ติดต่อทีม Frontend ได้เลยครับ
