# SQL Query Examples for Backend Team

## 📋 ตัวอย่าง SQL Queries สำหรับแต่ละ Endpoint

> **หมายเหตุ:** Queries เหล่านี้เป็นตัวอย่างเบื้องต้น อาจต้องปรับแต่งตามโครงสร้าง Database จริง

---

## 1. Order Summary (`/api/reports/summary`)

```sql
SELECT 
  COUNT(*) as total_orders,
  COUNT(DISTINCT customer_id) as total_customers,
  SUM(net_amount) as total_net_amount,
  AVG(net_amount) as avg_net_amount
FROM orders
WHERE 1=1
  -- Apply filters dynamically
  AND (travel_date >= :travel_date_from OR :travel_date_from IS NULL)
  AND (travel_date <= :travel_date_to OR :travel_date_to IS NULL)
  AND (booking_date >= :booking_date_from OR :booking_date_from IS NULL)
  AND (booking_date <= :booking_date_to OR :booking_date_to IS NULL)
  AND (supplier_id = :supplier_id OR :supplier_id IS NULL)
  -- Country filter จาก JSON field
  AND (JSON_EXTRACT(product_snapshot, '$.country.id') = :country_id OR :country_id IS NULL);
```

---

## 2. Report by Country (`/api/reports/by-country`)

```sql
SELECT 
  JSON_EXTRACT(product_snapshot, '$.country.id') as country_id,
  JSON_EXTRACT(product_snapshot, '$.country.name_th') as country_name,
  COUNT(*) as total_orders,
  COUNT(DISTINCT customer_id) as total_customers,
  SUM(net_amount) as total_net_amount,
  AVG(net_amount) as avg_net_amount
FROM orders
WHERE 1=1
  -- Apply filters
  AND (travel_date >= :travel_date_from OR :travel_date_from IS NULL)
  AND (travel_date <= :travel_date_to OR :travel_date_to IS NULL)
  AND (booking_date >= :booking_date_from OR :booking_date_from IS NULL)
  AND (booking_date <= :booking_date_to OR :booking_date_to IS NULL)
  AND (supplier_id = :supplier_id OR :supplier_id IS NULL)
  AND (JSON_EXTRACT(product_snapshot, '$.country.id') = :country_id OR :country_id IS NULL)
GROUP BY 
  JSON_EXTRACT(product_snapshot, '$.country.id'),
  JSON_EXTRACT(product_snapshot, '$.country.name_th')
ORDER BY total_orders DESC
LIMIT 100;
```

**สำหรับ PostgreSQL:**
```sql
SELECT 
  product_snapshot->>'country'->>'id' as country_id,
  product_snapshot->>'country'->>'name_th' as country_name,
  COUNT(*) as total_orders,
  COUNT(DISTINCT customer_id) as total_customers,
  SUM(net_amount) as total_net_amount,
  AVG(net_amount) as avg_net_amount
FROM orders
WHERE 1=1
  -- Apply filters
GROUP BY 
  product_snapshot->>'country'->>'id',
  product_snapshot->>'country'->>'name_th'
ORDER BY total_orders DESC
LIMIT 100;
```

---

## 3. Report by Supplier (`/api/reports/by-supplier`)

```sql
SELECT 
  s.id as supplier_id,
  s.name_th as supplier_name,
  COUNT(o.id) as total_orders,
  COUNT(DISTINCT o.customer_id) as total_customers,
  SUM(o.net_amount) as total_net_amount,
  AVG(o.net_amount) as avg_net_amount
FROM orders o
LEFT JOIN suppliers s ON o.supplier_id = s.id
WHERE 1=1
  -- Apply filters
  AND (o.travel_date >= :travel_date_from OR :travel_date_from IS NULL)
  AND (o.travel_date <= :travel_date_to OR :travel_date_to IS NULL)
  AND (o.booking_date >= :booking_date_from OR :booking_date_from IS NULL)
  AND (o.booking_date <= :booking_date_to OR :booking_date_to IS NULL)
  AND (o.supplier_id = :supplier_id OR :supplier_id IS NULL)
  AND (JSON_EXTRACT(o.product_snapshot, '$.country.id') = :country_id OR :country_id IS NULL)
GROUP BY s.id, s.name_th
ORDER BY total_orders DESC
LIMIT 100;
```

---

## 4. Report by Travel Date (`/api/reports/by-travel-date`)

```sql
SELECT 
  DATE_FORMAT(travel_date, '%Y-%m') as travel_month,
  CONCAT(
    CASE DATE_FORMAT(travel_date, '%m')
      WHEN '01' THEN 'มกราคม'
      WHEN '02' THEN 'กุมภาพันธ์'
      WHEN '03' THEN 'มีนาคม'
      WHEN '04' THEN 'เมษายน'
      WHEN '05' THEN 'พฤษภาคม'
      WHEN '06' THEN 'มิถุนายน'
      WHEN '07' THEN 'กรกฎาคม'
      WHEN '08' THEN 'สิงหาคม'
      WHEN '09' THEN 'กันยายน'
      WHEN '10' THEN 'ตุลาคม'
      WHEN '11' THEN 'พฤศจิกายน'
      WHEN '12' THEN 'ธันวาคม'
    END,
    ' ',
    (DATE_FORMAT(travel_date, '%Y') + 543)
  ) as travel_month_label,
  COUNT(*) as total_orders,
  COUNT(DISTINCT customer_id) as total_customers,
  SUM(net_amount) as total_net_amount
FROM orders
WHERE 1=1
  -- Apply filters
  AND (travel_date >= :travel_date_from OR :travel_date_from IS NULL)
  AND (travel_date <= :travel_date_to OR :travel_date_to IS NULL)
  AND (booking_date >= :booking_date_from OR :booking_date_from IS NULL)
  AND (booking_date <= :booking_date_to OR :booking_date_to IS NULL)
  AND (supplier_id = :supplier_id OR :supplier_id IS NULL)
  AND (JSON_EXTRACT(product_snapshot, '$.country.id') = :country_id OR :country_id IS NULL)
GROUP BY DATE_FORMAT(travel_date, '%Y-%m')
ORDER BY travel_month ASC
LIMIT 100;
```

---

## 5. Report by Booking Date (`/api/reports/by-booking-date`)

```sql
SELECT 
  DATE_FORMAT(booking_date, '%Y-%m') as booking_month,
  CONCAT(
    CASE DATE_FORMAT(booking_date, '%m')
      WHEN '01' THEN 'มกราคม'
      WHEN '02' THEN 'กุมภาพันธ์'
      WHEN '03' THEN 'มีนาคม'
      WHEN '04' THEN 'เมษายน'
      WHEN '05' THEN 'พฤษภาคม'
      WHEN '06' THEN 'มิถุนายน'
      WHEN '07' THEN 'กรกฎาคม'
      WHEN '08' THEN 'สิงหาคม'
      WHEN '09' THEN 'กันยายน'
      WHEN '10' THEN 'ตุลาคม'
      WHEN '11' THEN 'พฤศจิกายน'
      WHEN '12' THEN 'ธันวาคม'
    END,
    ' ',
    (DATE_FORMAT(booking_date, '%Y') + 543)
  ) as booking_month_label,
  COUNT(*) as total_orders,
  COUNT(DISTINCT customer_id) as total_customers,
  SUM(net_amount) as total_net_amount
FROM orders
WHERE 1=1
  -- Apply filters
GROUP BY DATE_FORMAT(booking_date, '%Y-%m')
ORDER BY booking_month ASC
LIMIT 100;
```

---

## 6. Repeat Customers (`/api/reports/repeat-customers`)

```sql
SELECT 
  customer_id,
  customer_code,
  customer_name,
  phone_number,
  COUNT(*) as total_orders,
  SUM(net_amount) as total_spent,
  GROUP_CONCAT(
    DISTINCT JSON_EXTRACT(product_snapshot, '$.country.name_th')
    SEPARATOR ', '
  ) as countries
FROM orders
WHERE 1=1
  -- Apply filters
  AND (travel_date >= :travel_date_from OR :travel_date_from IS NULL)
  AND (travel_date <= :travel_date_to OR :travel_date_to IS NULL)
  AND (booking_date >= :booking_date_from OR :booking_date_from IS NULL)
  AND (booking_date <= :booking_date_to OR :booking_date_to IS NULL)
  AND (supplier_id = :supplier_id OR :supplier_id IS NULL)
  AND (JSON_EXTRACT(product_snapshot, '$.country.id') = :country_id OR :country_id IS NULL)
GROUP BY customer_id, customer_code, customer_name, phone_number
HAVING COUNT(*) > 1
ORDER BY total_orders DESC
LIMIT 100;
```

**สำหรับ PostgreSQL:**
```sql
SELECT 
  customer_id,
  customer_code,
  customer_name,
  phone_number,
  COUNT(*) as total_orders,
  SUM(net_amount) as total_spent,
  STRING_AGG(
    DISTINCT product_snapshot->>'country'->>'name_th',
    ', '
  ) as countries
FROM orders
WHERE 1=1
  -- Apply filters
GROUP BY customer_id, customer_code, customer_name, phone_number
HAVING COUNT(*) > 1
ORDER BY total_orders DESC
LIMIT 100;
```

---

## 7. Countries List (`/api/reports/countries`)

```sql
SELECT DISTINCT
  JSON_EXTRACT(product_snapshot, '$.country.id') as id,
  JSON_EXTRACT(product_snapshot, '$.country.name_th') as name_th,
  JSON_EXTRACT(product_snapshot, '$.country.name_en') as name_en
FROM orders
WHERE JSON_EXTRACT(product_snapshot, '$.country.id') IS NOT NULL
ORDER BY name_th ASC;
```

**สำหรับ PostgreSQL:**
```sql
SELECT DISTINCT
  product_snapshot->'country'->>'id' as id,
  product_snapshot->'country'->>'name_th' as name_th,
  product_snapshot->'country'->>'name_en' as name_en
FROM orders
WHERE product_snapshot->'country'->>'id' IS NOT NULL
ORDER BY name_th ASC;
```

---

## 📊 Recommended Database Indexes

```sql
-- สำหรับ performance ที่ดีขึ้น
CREATE INDEX idx_orders_travel_date ON orders(travel_date);
CREATE INDEX idx_orders_booking_date ON orders(booking_date);
CREATE INDEX idx_orders_supplier_id ON orders(supplier_id);
CREATE INDEX idx_orders_customer_id ON orders(customer_id);

-- สำหรับ JSON field (MySQL 5.7+)
CREATE INDEX idx_orders_country_id ON orders(
  (CAST(JSON_EXTRACT(product_snapshot, '$.country.id') AS CHAR(10)))
);

-- สำหรับ PostgreSQL
CREATE INDEX idx_orders_country_id ON orders 
  USING GIN ((product_snapshot->'country'));
```

---

## 🔧 Helper Function สำหรับแปลงเดือนเป็นภาษาไทย

### JavaScript/Node.js
```javascript
function getThaiMonthLabel(dateString) {
  const date = new Date(dateString);
  const months = [
    'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน',
    'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม',
    'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
  ];
  
  const month = months[date.getMonth()];
  const year = date.getFullYear() + 543; // แปลงเป็น พ.ศ.
  
  return `${month} ${year}`;
}

// ตัวอย่างการใช้งาน
console.log(getThaiMonthLabel('2025-01-14')); // "มกราคม 2568"
```

### Python
```python
def get_thai_month_label(date_string):
    from datetime import datetime
    
    months = [
        'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน',
        'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม',
        'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
    ]
    
    date = datetime.strptime(date_string, '%Y-%m-%d')
    month = months[date.month - 1]
    year = date.year + 543  # แปลงเป็น พ.ศ.
    
    return f"{month} {year}"

# ตัวอย่างการใช้งาน
print(get_thai_month_label('2025-01-14'))  # "มกราคม 2568"
```

---

## ⚠️ Important Notes

1. **NULL Handling:**
   - ใช้ `COALESCE()` หรือ `IFNULL()` สำหรับ fields ที่อาจเป็น NULL
   - ตัวอย่าง: `COALESCE(country_name, 'ไม่ระบุ')`

2. **JSON Field Access:**
   - MySQL: `JSON_EXTRACT(field, '$.path')` หรือ `field->>'$.path'`
   - PostgreSQL: `field->'path'` หรือ `field->>'path'`

3. **Date Format:**
   - Input: `YYYY-MM-DD` (ISO 8601)
   - Output: ตามที่ระบุในแต่ละ endpoint

4. **Performance:**
   - ใช้ `EXPLAIN` เพื่อตรวจสอบ query performance
   - พิจารณาใช้ materialized views สำหรับ reports ที่ซับซ้อน
   - ใช้ caching สำหรับข้อมูลที่ไม่เปลี่ยนแปลงบ่อย

---

## 🧪 Testing Queries

```sql
-- ทดสอบว่า JSON extraction ทำงานถูกต้อง
SELECT 
  id,
  product_snapshot,
  JSON_EXTRACT(product_snapshot, '$.country.id') as country_id,
  JSON_EXTRACT(product_snapshot, '$.country.name_th') as country_name
FROM orders
LIMIT 10;

-- ทดสอบการนับลูกค้าที่ไม่ซ้ำ
SELECT 
  COUNT(*) as total_orders,
  COUNT(DISTINCT customer_id) as unique_customers
FROM orders;

-- ทดสอบการ group by เดือน
SELECT 
  DATE_FORMAT(travel_date, '%Y-%m') as month,
  COUNT(*) as orders
FROM orders
GROUP BY DATE_FORMAT(travel_date, '%Y-%m')
ORDER BY month DESC
LIMIT 12;
```

---

## 📞 Need Help?
หากมีคำถามเกี่ยวกับ SQL queries ติดต่อทีม Frontend ได้เลยครับ
