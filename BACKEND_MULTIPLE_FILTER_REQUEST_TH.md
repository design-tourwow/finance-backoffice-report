# คำขอปรับปรุง Backend API: รองรับการกรองหลายประเทศ/Supplier

## สรุปปัญหา
ปัจจุบัน API endpoints ของ Order Report ไม่รองรับการกรองด้วยหลายประเทศหรือหลาย Supplier พร้อมกัน เมื่อส่ง ID หลายตัว API จะคืนค่า 0 รายการ หรือ error 500

## พฤติกรรมปัจจุบัน

### ใช้งานได้ (เลือกเดียว)
```
GET /api/reports/by-country?country_id=7
✅ ผลลัพธ์: Orders ของญี่ปุ่นเท่านั้น (463 orders)
```

### ใช้งานไม่ได้ (เลือกหลายรายการ)
```
GET /api/reports/by-country?country_id=7,39
❌ ผลลัพธ์: 0 orders หรือผลลัพธ์ว่างเปล่า

GET /api/reports/by-country?country_id=["7","39"]
❌ ผลลัพธ์: 500 Internal Server Error
Error: "Invalid JSON text in argument 2 to function json_contains"
```

## การปรับปรุงที่ต้องการ

### ตัวเลือกที่ 1: Comma-Separated Values (แนะนำ)
รองรับ ID แบบคั่นด้วย comma ใน query parameters:

```
GET /api/reports/by-country?country_id=7,39,4
GET /api/reports/by-supplier?supplier_id=1,5,10
GET /api/reports/summary?country_id=7,39&supplier_id=1,5
```

**การทำงานฝั่ง Backend:**
```sql
-- แยก comma-separated string และใช้ IN clause
WHERE country_id IN (7, 39, 4)
```

### ตัวเลือกที่ 2: Array Parameters
รองรับ parameters แบบ array:

```
GET /api/reports/by-country?country_id[]=7&country_id[]=39&country_id[]=4
GET /api/reports/by-supplier?supplier_id[]=1&supplier_id[]=5
```

**การทำงานฝั่ง Backend:**
```javascript
// แปลง array จาก query params
const countryIds = req.query.country_id; // ['7', '39', '4']
```

### ตัวเลือกที่ 3: JSON Array ใน Query String
รองรับ JSON array ใน query parameter:

```
GET /api/reports/by-country?country_id=["7","39","4"]
```

**หมายเหตุ:** ต้อง URL encode: `country_id=%5B%227%22%2C%2239%22%2C%224%22%5D`

## Endpoints ที่ได้รับผลกระทบ

ทุก report endpoints ควรรองรับการกรองหลายรายการ:

1. **GET /api/reports/summary**
   - `country_id` (เดียวหรือหลายรายการ)
   - `supplier_id` (เดียวหรือหลายรายการ)

2. **GET /api/reports/by-country**
   - `country_id` (เดียวหรือหลายรายการ)
   - `supplier_id` (เดียวหรือหลายรายการ)

3. **GET /api/reports/by-supplier**
   - `country_id` (เดียวหรือหลายรายการ)
   - `supplier_id` (เดียวหรือหลายรายการ)

4. **GET /api/reports/by-travel-date**
   - `country_id` (เดียวหรือหลายรายการ)
   - `supplier_id` (เดียวหรือหลายรายการ)

5. **GET /api/reports/by-booking-date**
   - `country_id` (เดียวหรือหลายรายการ)
   - `supplier_id` (เดียวหรือหลายรายการ)

## รูปแบบ Response ที่คาดหวัง

รูปแบบ Response ควรเหมือนเดิม แต่รวมข้อมูลของทุกประเทศ/supplier ที่เลือก:

### ตัวอย่าง: หลายประเทศ
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

## ตัวอย่างการทำงานใน SQL

### ปัจจุบัน (ค่าเดียว)
```sql
SELECT 
  country_id,
  country_name,
  COUNT(*) as total_orders,
  COUNT(DISTINCT customer_id) as total_customers,
  SUM(net_amount) as total_net_amount,
  AVG(net_amount) as avg_net_amount
FROM orders
WHERE country_id = ?  -- ค่าเดียวเท่านั้น
GROUP BY country_id, country_name
```

### ที่เสนอ (หลายค่า)
```sql
SELECT 
  country_id,
  country_name,
  COUNT(*) as total_orders,
  COUNT(DISTINCT customer_id) as total_customers,
  SUM(net_amount) as total_net_amount,
  AVG(net_amount) as avg_net_amount
FROM orders
WHERE country_id IN (?, ?, ?)  -- หลายค่า
GROUP BY country_id, country_name
```

## Backward Compatibility

การปรับปรุงควรรักษา backward compatibility:

- **ค่าเดียว:** `country_id=7` → ทำงานเหมือนเดิม
- **หลายค่า:** `country_id=7,39,4` → ฟังก์ชันใหม่
- **ไม่มีค่า:** ไม่มี parameter `country_id` → แสดงทั้งหมด (เหมือนเดิม)

## สถานการณ์ทดสอบ

### Test Case 1: ประเทศเดียว
```
Request: GET /api/reports/by-country?country_id=7
คาดหวัง: Orders ของญี่ปุ่นเท่านั้น
```

### Test Case 2: หลายประเทศ
```
Request: GET /api/reports/by-country?country_id=7,39,4
คาดหวัง: Orders ของญี่ปุ่น, จีน, และจอร์เจีย
```

### Test Case 3: หลายประเทศ + ช่วงวันที่
```
Request: GET /api/reports/by-country?country_id=7,39&travel_date_from=2024-01-01&travel_date_to=2024-12-31
คาดหวัง: Orders ของญี่ปุ่นและจีนในช่วงวันที่ที่กำหนด
```

### Test Case 4: หลายประเทศ + หลาย Suppliers
```
Request: GET /api/reports/summary?country_id=7,39&supplier_id=1,5,10
คาดหวัง: สรุปของประเทศและ suppliers ที่เลือก
```

## ระดับความสำคัญ
**สูง (HIGH)** - ปัญหานี้ทำให้ฟีเจอร์ Order Report ใช้งานไม่ได้เต็มประสิทธิภาพ

## กำหนดเวลา
กรุณาทำการปรับปรุงโดยเร็วที่สุด เพื่อให้ทีม Frontend สามารถพัฒนาต่อได้

## ติดต่อ
หากมีคำถามหรือต้องการความชัดเจนเพิ่มเติม กรุณาติดต่อทีม Frontend

---

**สร้างเอกสาร:** 15 มกราคม 2026
**สถานะ:** รอการทำงานจากทีม Backend
