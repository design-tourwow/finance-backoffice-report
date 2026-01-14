# 🚀 Quick Start Guide for Backend Team

## 📌 สรุปสั้นๆ

Frontend เจอปัญหา **429 Rate Limit Error** เพราะพยายามดึง Orders ทั้งหมดมาคำนวณฝั่ง Client

**วิธีแก้:** Backend ต้องสร้าง **7 Report Endpoints** เพื่อคำนวณฝั่ง Server แทน

---

## ✅ Endpoints ที่ต้องสร้าง (7 ตัว)

| # | Endpoint | คำอธิบาย | Limit |
|---|----------|----------|-------|
| 1 | `GET /api/reports/summary` | สรุปภาพรวม Orders | - |
| 2 | `GET /api/reports/by-country` | รายงานแยกตามประเทศ | 100 |
| 3 | `GET /api/reports/by-supplier` | รายงานแยกตาม Supplier | 100 |
| 4 | `GET /api/reports/by-travel-date` | รายงานแยกตามเดือนเดินทาง | 100 |
| 5 | `GET /api/reports/by-booking-date` | รายงานแยกตามเดือนจอง | 100 |
| 6 | `GET /api/reports/repeat-customers` | ลูกค้าที่จองซ้ำ (>1 ครั้ง) | 100 |
| 7 | `GET /api/reports/countries` | รายการประเทศทั้งหมด | ไม่จำกัด |

---

## 🔑 Query Parameters (ทุก Endpoint ยกเว้น countries)

```
travel_date_from    - วันเดินทางเริ่มต้น (YYYY-MM-DD)
travel_date_to      - วันเดินทางสิ้นสุด (YYYY-MM-DD)
booking_date_from   - วันจองเริ่มต้น (YYYY-MM-DD)
booking_date_to     - วันจองสิ้นสุด (YYYY-MM-DD)
country_id          - รหัสประเทศ
supplier_id         - รหัส Supplier
```

**ทุก parameter เป็น optional**

---

## 📤 Response Format (สำคัญมาก!)

### ✅ ถูกต้อง - ใช้ `success`
```json
{
  "success": true,
  "data": [...]
}
```

### ❌ ผิด - อย่าใช้ `status`
```json
{
  "status": "success",
  "data": [...]
}
```

---

## 🔐 Authentication

ทุก Request ต้องมี Header:
```
x-api-key: <token>
```

Test Tokens:
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

### Allowed Methods:
```
GET, OPTIONS
```

---

## 📊 ข้อมูลประเทศ (สำคัญ!)

ดึงจาก field `product_snapshot` ใน Orders table:

```json
{
  "country": {
    "id": "TH",
    "name_th": "ประเทศไทย",
    "name_en": "Thailand"
  }
}
```

**วิธีดึง:**
- MySQL: `JSON_EXTRACT(product_snapshot, '$.country.id')`
- PostgreSQL: `product_snapshot->'country'->>'id'`

---

## 🎯 ตัวอย่าง Response แต่ละ Endpoint

### 1. Summary
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

### 2. By Country
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

### 3. By Supplier
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

### 4. By Travel Date
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

### 5. By Booking Date
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

### 6. Repeat Customers
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

### 7. Countries
```json
{
  "success": true,
  "data": [
    {
      "id": "TH",
      "name_th": "ประเทศไทย",
      "name_en": "Thailand"
    }
  ]
}
```

---

## 🧪 Testing

### ตัวอย่างการเรียกใช้:
```bash
# 1. Summary
curl -X GET "https://staging-finance-backoffice-report-api.vercel.app/api/reports/summary" \
  -H "x-api-key: sk_test_4f8b2c9e1a3d5f7b9c0e2a4d6f8b1c3e"

# 2. By Country with filters
curl -X GET "https://staging-finance-backoffice-report-api.vercel.app/api/reports/by-country?travel_date_from=2025-01-01&travel_date_to=2025-01-31" \
  -H "x-api-key: sk_test_4f8b2c9e1a3d5f7b9c0e2a4d6f8b1c3e"

# 3. Countries list
curl -X GET "https://staging-finance-backoffice-report-api.vercel.app/api/reports/countries" \
  -H "x-api-key: sk_test_4f8b2c9e1a3d5f7b9c0e2a4d6f8b1c3e"
```

---

## ⚠️ สิ่งที่ต้องระวัง

1. **Response Format:** ใช้ `success: true` ไม่ใช่ `status: "success"`
2. **Limit Records:** Report ทุกตัวจำกัด 100 รายการ (ยกเว้น countries/suppliers)
3. **Country Data:** ดึงจาก `product_snapshot` JSON field
4. **Month Label:** ต้องเป็นภาษาไทย + ปี พ.ศ. (เช่น "มกราคม 2568")
5. **NULL Handling:** จัดการกรณีข้อมูลไม่ครบ (แสดง "ไม่ระบุ" หรือ null)
6. **CORS:** ต้องเพิ่ม `x-api-key` ใน allowed headers

---

## 📚 เอกสารเพิ่มเติม

1. **BACKEND_API_REQUIREMENTS.md** - รายละเอียดครบถ้วน (English)
2. **BACKEND_API_REQUIREMENTS_TH.md** - รายละเอียดครบถ้วน (ไทย)
3. **BACKEND_SQL_EXAMPLES.md** - ตัวอย่าง SQL Queries

---

## ✅ Checklist

- [ ] สร้าง 7 Endpoints
- [ ] ใช้ `success: true` ใน Response
- [ ] ตั้งค่า CORS (4 origins + x-api-key header)
- [ ] จำกัด 100 records
- [ ] ดึงประเทศจาก `product_snapshot`
- [ ] แปลงเดือนเป็นภาษาไทย + พ.ศ.
- [ ] ทดสอบทุก endpoint
- [ ] Deploy ขึ้น staging
- [ ] แจ้งกลับเมื่อเสร็จ

---

## 📞 Contact

หากมีคำถาม ติดต่อทีม Frontend ได้เลยครับ

**Priority:** 🔴 High - Frontend รอ endpoints เหล่านี้เพื่อแก้ปัญหา 429 Error

---

## 💡 Tips

- ใช้ Database Indexing สำหรับ `travel_date`, `booking_date`, `supplier_id`, `customer_id`
- พิจารณาใช้ Caching สำหรับ `/api/reports/countries` และ `/api/suppliers`
- ทดสอบ performance ด้วย `EXPLAIN` query
- ตรวจสอบ CORS configuration ให้ถูกต้องก่อน deploy

---

**Last Updated:** 2025-01-14
**Version:** 1.0
