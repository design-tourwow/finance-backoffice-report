# 📅 Date Format Request V2 - Numeric Format

## 📋 สรุป
ขอเพิ่มรูปแบบวันที่แบบตัวเลข (Numeric Format) สำหรับ Order Report System

## 🎯 รูปแบบที่ต้องการเพิ่ม

### 1. Full Date Format (มีวัน เดือน ปี)
**Format:** `DD/MM/YYYY` (พ.ศ. เต็ม)

**ตัวอย่าง:**
```
01/09/2569
14/01/2568
25/12/2567
```

**Use Case:** Tab "ช่วงเวลาจอง" (Lead Time) - แสดงวันที่เต็ม

---

### 2. Month/Year Format (มีแค่เดือน ปี)
**Format:** `MM/YY` (พ.ศ. ย่อ 2 หลัก)

**ตัวอย่าง:**
```
09/69  (กันยายน 2569)
01/68  (มกราคม 2568)
12/67  (ธันวาคม 2567)
```

**Use Case:** Tab "ตามวันเดินทาง", "ตามวันจอง" - แสดงเดือน/ปี

---

## 🔧 การ Implementation

### Option 1: เพิ่ม Format ใหม่ใน date_format Parameter

เพิ่ม 2 format ใหม่:
- `numeric_full` → `DD/MM/YYYY` (พ.ศ. เต็ม)
- `numeric_short` → `MM/YY` (พ.ศ. ย่อ)

**ตัวอย่าง API Call:**
```bash
# Full Date Format
GET /api/reports/lead-time-analysis?date_format=numeric_full
Response: "created_at": "14/01/2568"

# Month/Year Format
GET /api/reports/by-travel-date?date_format=numeric_short
Response: "travel_month_label": "01/68"
```

---

### Option 2: แยก Field ใหม่

เพิ่ม field ใหม่ควบคู่กับ field เดิม:
- `travel_month_label` → "มกราคม 2568" (เดิม)
- `travel_month_numeric` → "01/68" (ใหม่)

**ตัวอย่าง Response:**
```json
{
  "success": true,
  "data": [
    {
      "travel_month": "2025-01",
      "travel_month_label": "มกราคม 2568",
      "travel_month_numeric": "01/68",
      "total_orders": 125
    }
  ]
}
```

---

## 📊 Endpoints ที่ต้องอัปเดต

### 1. GET /api/reports/by-travel-date
**เพิ่ม:** `travel_month_numeric` → `"01/68"`

### 2. GET /api/reports/by-booking-date
**เพิ่ม:** `booking_month_numeric` → `"12/67"`

### 3. GET /api/reports/lead-time-analysis
**เพิ่ม:** รูปแบบ `DD/MM/YYYY` สำหรับ:
- `created_at` → `"14/01/2568"`
- `travel_start_date` → `"25/03/2568"`

---

## 💻 Code ตัวอย่าง

### TypeScript/JavaScript
```typescript
class DateFormatter {
    
    /**
     * แปลง YYYY-MM เป็น MM/YY (พ.ศ. ย่อ)
     * @param monthString "2025-01"
     * @returns "01/68"
     */
    static formatNumericShort(monthString: string): string {
        const [year, month] = monthString.split('-');
        const buddhistYear = parseInt(year) + 543;
        const shortYear = String(buddhistYear).slice(-2);
        
        return `${month}/${shortYear}`;
    }
    
    /**
     * แปลง YYYY-MM-DD เป็น DD/MM/YYYY (พ.ศ. เต็ม)
     * @param dateString "2025-01-14"
     * @returns "14/01/2568"
     */
    static formatNumericFull(dateString: string): string {
        const date = new Date(dateString);
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear() + 543;
        
        return `${day}/${month}/${year}`;
    }
}

// ตัวอย่างการใช้งาน:
console.log(DateFormatter.formatNumericShort('2025-01'));  // "01/68"
console.log(DateFormatter.formatNumericShort('2024-12'));  // "12/67"
console.log(DateFormatter.formatNumericFull('2025-01-14')); // "14/01/2568"
console.log(DateFormatter.formatNumericFull('2024-12-25')); // "25/12/2567"
```

### PHP
```php
<?php

class DateFormatter {
    
    /**
     * แปลง YYYY-MM เป็น MM/YY (พ.ศ. ย่อ)
     */
    public static function formatNumericShort($monthString) {
        list($year, $month) = explode('-', $monthString);
        $buddhistYear = (int)$year + 543;
        $shortYear = substr((string)$buddhistYear, -2);
        
        return "{$month}/{$shortYear}";
    }
    
    /**
     * แปลง YYYY-MM-DD เป็น DD/MM/YYYY (พ.ศ. เต็ม)
     */
    public static function formatNumericFull($dateString) {
        $date = new DateTime($dateString);
        $day = $date->format('d');
        $month = $date->format('m');
        $year = (int)$date->format('Y') + 543;
        
        return "{$day}/{$month}/{$year}";
    }
}

// ตัวอย่างการใช้งาน:
echo DateFormatter::formatNumericShort('2025-01');  // "01/68"
echo DateFormatter::formatNumericShort('2024-12');  // "12/67"
echo DateFormatter::formatNumericFull('2025-01-14'); // "14/01/2568"
echo DateFormatter::formatNumericFull('2024-12-25'); // "25/12/2567"
?>
```

---

## 🎨 ตัวอย่าง Response ที่ต้องการ

### Tab "ตามวันเดินทาง" (Travel Date)
```json
{
  "success": true,
  "data": [
    {
      "travel_month": "2025-01",
      "travel_month_label": "มกราคม 2568",
      "travel_month_numeric": "01/68",
      "total_orders": 125
    },
    {
      "travel_month": "2024-12",
      "travel_month_label": "ธันวาคม 2567",
      "travel_month_numeric": "12/67",
      "total_orders": 98
    }
  ]
}
```

### Tab "ช่วงเวลาจอง" (Lead Time)
```json
{
  "success": true,
  "data": [
    {
      "order_code": "ORD001",
      "created_at": "14/01/2568",
      "travel_start_date": "25/03/2568",
      "lead_time_days": 70
    }
  ]
}
```

---

## ✅ Checklist

- [ ] เพิ่ม `formatNumericShort()` function ใน dateFormatter.ts
- [ ] เพิ่ม `formatNumericFull()` function ใน dateFormatter.ts
- [ ] อัปเดต `/api/reports/by-travel-date` ให้ส่ง `travel_month_numeric`
- [ ] อัปเดต `/api/reports/by-booking-date` ให้ส่ง `booking_month_numeric`
- [ ] อัปเดต `/api/reports/lead-time-analysis` ให้ใช้รูปแบบ `DD/MM/YYYY`
- [ ] Test ทุก endpoint
- [ ] อัปเดตเอกสาร DATE_FORMAT_GUIDE.md
- [ ] Deploy ขึ้น staging

---

## 📞 Contact
Frontend Team พร้อมช่วยเหลือหากมีคำถามเพิ่มเติม

**Created:** 2025-01-16  
**Reporter:** Frontend Team  
**Priority:** MEDIUM  
**Type:** Feature Request
