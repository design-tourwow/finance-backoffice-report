# คำขอ Backend API: Endpoints สำหรับรายงานรายวัน

## ภาพรวม
ขอ API endpoints ใหม่เพื่อรองรับการแสดงรายงานแบบรายวัน (daily aggregation) สำหรับ Tab "ตามวันเดินทาง" และ "ตามวันจอง" ในหน้า Order Report

## ปัญหาปัจจุบัน
- Endpoints ปัจจุบัน `/api/reports/by-travel-date` และ `/api/reports/by-booking-date` รวมข้อมูลแบบ **เดือน/ปี**
- Frontend ต้องการข้อมูลแบบรายวัน เพื่อแสดงข้อมูลแยกตาม**วันที่แต่ละวัน**

## Endpoints ที่ต้องการ

### 1. รายงานตามวันเริ่มเดินทาง (รายวัน)
**Endpoint:** `GET /api/reports/by-travel-start-date`

**คำอธิบาย:** รวมข้อมูล orders ตามวันเริ่มเดินทาง (จาก `product_period_snapshot.start_date`)

**Query Parameters:**
- `travel_date_from` (optional): กรองวันที่เริ่มต้น (YYYY-MM-DD)
- `travel_date_to` (optional): กรองวันที่สิ้นสุด (YYYY-MM-DD)
- `booking_date_from` (optional): กรองวันที่จองเริ่มต้น (YYYY-MM-DD)
- `booking_date_to` (optional): กรองวันที่จองสิ้นสุด (YYYY-MM-DD)
- `country_id` (optional): กรองตามประเทศ
- `supplier_id` (optional): กรองตาม Supplier
- `date_format` (optional): รูปแบบวันที่ในผลลัพธ์ (default: `numeric_full` = DD/MM/YYYY พ.ศ.)

**รูปแบบ Response:**
```json
{
  "success": true,
  "data": [
    {
      "travel_start_date": "2026-03-01",
      "travel_start_date_label": "01/03/2569",
      "total_orders": 15,
      "total_customers": 12,
      "total_net_amount": 750000.00,
      "avg_net_amount": 50000.00
    },
    {
      "travel_start_date": "2026-03-05",
      "travel_start_date_label": "05/03/2569",
      "total_orders": 8,
      "total_customers": 7,
      "total_net_amount": 400000.00,
      "avg_net_amount": 50000.00
    }
  ]
}
```

**SQL Logic:**
```sql
SELECT 
  DATE(JSON_UNQUOTE(JSON_EXTRACT(product_period_snapshot, '$.start_date'))) as travel_start_date,
  COUNT(*) as total_orders,
  COUNT(DISTINCT customer_id) as total_customers,
  SUM(net_amount) as total_net_amount,
  AVG(net_amount) as avg_net_amount
FROM orders
WHERE deleted_at IS NULL
  AND order_status != 'canceled'
  [AND filters...]
GROUP BY travel_start_date
ORDER BY travel_start_date ASC
```

---

### 2. รายงานตามวันที่จอง (รายวัน)
**Endpoint:** `GET /api/reports/by-created-date`

**คำอธิบาย:** รวมข้อมูล orders ตามวันที่จอง/สร้าง (จาก `created_at`)

**Query Parameters:**
- `travel_date_from` (optional): กรองวันที่เริ่มต้น (YYYY-MM-DD)
- `travel_date_to` (optional): กรองวันที่สิ้นสุด (YYYY-MM-DD)
- `booking_date_from` (optional): กรองวันที่จองเริ่มต้น (YYYY-MM-DD)
- `booking_date_to` (optional): กรองวันที่จองสิ้นสุด (YYYY-MM-DD)
- `country_id` (optional): กรองตามประเทศ
- `supplier_id` (optional): กรองตาม Supplier
- `date_format` (optional): รูปแบบวันที่ในผลลัพธ์ (default: `numeric_full` = DD/MM/YYYY พ.ศ.)

**รูปแบบ Response:**
```json
{
  "success": true,
  "data": [
    {
      "created_date": "2026-01-13",
      "created_date_label": "13/01/2569",
      "total_orders": 25,
      "total_customers": 20,
      "total_net_amount": 1250000.00,
      "avg_net_amount": 50000.00
    },
    {
      "created_date": "2026-01-14",
      "created_date_label": "14/01/2569",
      "total_orders": 18,
      "total_customers": 15,
      "total_net_amount": 900000.00,
      "avg_net_amount": 50000.00
    }
  ]
}
```

**SQL Logic:**
```sql
SELECT 
  DATE(created_at) as created_date,
  COUNT(*) as total_orders,
  COUNT(DISTINCT customer_id) as total_customers,
  SUM(net_amount) as total_net_amount,
  AVG(net_amount) as avg_net_amount
FROM orders
WHERE deleted_at IS NULL
  AND order_status != 'canceled'
  [AND filters...]
GROUP BY created_date
ORDER BY created_date ASC
```

---

## รองรับรูปแบบวันที่
กรุณารองรับรูปแบบวันที่เหมือน endpoints ที่มีอยู่:
- `numeric_full`: DD/MM/YYYY พ.ศ. (เช่น "01/03/2569")
- `numeric_month_year_full`: MM/YYYY (เช่น "03/2569")
- `th_full_be_full`: เดือนเต็ม ปีเต็ม (เช่น "มีนาคม 2569")

## การใช้งานที่ Frontend
เมื่อ endpoints เหล่านี้พร้อมใช้งาน frontend จะ:
1. เรียก `/api/reports/by-travel-start-date` สำหรับ Tab "ตามวันเดินทาง"
2. เรียก `/api/reports/by-created-date` สำหรับ Tab "ตามวันจอง"
3. แสดงข้อมูลในรูปแบบ line chart และตารางที่เรียงลำดับได้

## ความสำคัญ
**ปานกลาง** - Endpoints ปัจจุบันใช้งานได้ แต่แสดงข้อมูลแบบเดือน/ปี แทนที่จะเป็นรายวัน

## มีคำถาม?
ติดต่อทีม frontend เพื่อขอคำชี้แจงเพิ่มเติม

---

**สร้างเมื่อ:** 16 มกราคม 2568
**สถานะ:** รอทีม Backend ดำเนินการ
