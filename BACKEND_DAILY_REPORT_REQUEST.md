# Backend API Request: Daily Report Endpoints

## Overview
Request for new API endpoints to support daily aggregation reports for "Travel Date" and "Booking Date" tabs in Order Report page.

## Current Issue
- Current endpoints `/api/reports/by-travel-date` and `/api/reports/by-booking-date` aggregate data by **month/year**
- Frontend needs daily aggregation to show data grouped by **individual dates**

## Required Endpoints

### 1. Report by Travel Start Date (Daily)
**Endpoint:** `GET /api/reports/by-travel-start-date`

**Description:** Aggregate orders by travel start date (from `product_period_snapshot.start_date`)

**Query Parameters:**
- `travel_date_from` (optional): Filter start date (YYYY-MM-DD)
- `travel_date_to` (optional): Filter end date (YYYY-MM-DD)
- `booking_date_from` (optional): Filter booking start date (YYYY-MM-DD)
- `booking_date_to` (optional): Filter booking end date (YYYY-MM-DD)
- `country_id` (optional): Filter by country ID
- `supplier_id` (optional): Filter by supplier ID
- `date_format` (optional): Date format for response (default: `numeric_full` = DD/MM/YYYY พ.ศ.)

**Response Format:**
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

### 2. Report by Created Date (Daily)
**Endpoint:** `GET /api/reports/by-created-date`

**Description:** Aggregate orders by booking/created date (from `created_at`)

**Query Parameters:**
- `travel_date_from` (optional): Filter start date (YYYY-MM-DD)
- `travel_date_to` (optional): Filter end date (YYYY-MM-DD)
- `booking_date_from` (optional): Filter booking start date (YYYY-MM-DD)
- `booking_date_to` (optional): Filter booking end date (YYYY-MM-DD)
- `country_id` (optional): Filter by country ID
- `supplier_id` (optional): Filter by supplier ID
- `date_format` (optional): Date format for response (default: `numeric_full` = DD/MM/YYYY พ.ศ.)

**Response Format:**
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

## Date Format Support
Please support the same date formats as existing endpoints:
- `numeric_full`: DD/MM/YYYY พ.ศ. (e.g., "01/03/2569")
- `numeric_month_year_full`: MM/YYYY (e.g., "03/2569")
- `th_full_be_full`: เดือนเต็ม ปีเต็ม (e.g., "มีนาคม 2569")

## Frontend Usage
Once these endpoints are ready, frontend will:
1. Call `/api/reports/by-travel-start-date` for "ตามวันเดินทาง" tab
2. Call `/api/reports/by-created-date` for "ตามวันจอง" tab
3. Display data in line charts and sortable tables

## Priority
**Medium** - Current endpoints work but show month/year aggregation instead of daily data

## Questions?
Contact frontend team for clarification.

---

**Created:** 2025-01-16
**Status:** Pending Backend Implementation
