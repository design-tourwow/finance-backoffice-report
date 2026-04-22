---
stepsCompleted: ['step-01-validate-prerequisites', 'step-02-design-epics', 'step-03-create-stories', 'step-04-final-validation']
inputDocuments: ['_bmad-output/planning-artifacts/prd.md']
---

# finance-backoffice-report - Epic Breakdown

## Overview

This document provides the complete epic and story breakdown for finance-backoffice-report, decomposing the requirements from the PRD into implementable stories.

## Requirements Inventory

### Functional Requirements

FR1: ระบบรับ JWT Token ผ่าน URL parameter เมื่อ page โหลด
FR2: ระบบเก็บ JWT Token ลง sessionStorage หรือ localStorage
FR3: ระบบอ่าน JWT Token จาก storage เพื่อ inject เข้า API request headers
FR4: ระบบตรวจสอบ token และ redirect กลับ auth flow หากไม่พบ token
FR5: User เห็นเมนูรวมทุกหน้า (หน้าเดิมและ 4 หน้าใหม่) ในที่เดียวกัน
FR6: User navigate ไปหน้าใดก็ได้โดยไม่ต้อง re-authenticate ภายใน session เดียวกัน
FR7: Navigation menu แสดง active state ของหน้าปัจจุบัน
FR8: User ดู supplier commission data ในรูปแบบ chart
FR9: User filter commission data ตามประเทศ
FR10: User filter commission data ตามปี / quarter / เดือน
FR11: User filter commission data ตาม team
FR12: User filter commission data ตาม job position
FR13: User filter commission data ตาม user / sales person
FR14: User sort commission data ตาม field ต่างๆ
FR15: ระบบดึงข้อมูล supplier commission จาก API พร้อม JWT auth
FR16: User ดู discount sales data ในรูปแบบ chart
FR17: User filter discount sales ตามประเทศ
FR18: User filter discount sales ตามปี / quarter / เดือน
FR19: User filter discount sales ตาม team, job position, user
FR20: User sort discount sales data ตาม field ต่างๆ
FR21: ระบบดึงข้อมูล discount sales จาก API พร้อม JWT auth
FR22: User ดู order external summary data ในรูปแบบ table
FR23: User filter order external summary ตามประเทศ
FR24: User filter order external summary ตามปี / เดือน
FR25: User filter order external summary ตาม team, job position, user
FR26: ระบบดึงข้อมูล order external summary จาก API พร้อม JWT auth
FR27: User ดู request discount data ในรูปแบบ chart และ table
FR28: User filter request discount ตามประเทศ
FR29: User filter request discount ตามปี / quarter / เดือน
FR30: User filter request discount ตาม team, job position, user
FR31: User sort request discount data ตาม field ต่างๆ
FR32: ระบบดึงข้อมูล request discount จาก API พร้อม JWT auth
FR33: ระบบดึงรายการประเทศจาก API สำหรับ filter dropdowns
FR34: ระบบดึงรายการ team จาก API สำหรับ filter dropdowns
FR35: ระบบดึงรายการ job position กรองตาม team สำหรับ filter dropdowns
FR36: ระบบดึงรายการ user กรองตาม team และ job position สำหรับ filter dropdowns
FR37: ระบบแสดงตัวเลขในรูปแบบ currency ที่ถูกต้อง
FR38: ระบบแสดงวันที่ในรูปแบบปีพุทธศักราช
FR39: ระบบ route ทุก path ใหม่ผ่าน server.js ได้ถูกต้อง
FR40: ระบบ route ทุก path ใหม่ผ่าน vercel.json ได้ถูกต้อง

### NonFunctional Requirements

NFR1: JWT Token ถูก clean ออกจาก URL หลัง extract เสร็จ — ไม่ expose ใน browser history
NFR2: JWT Token ส่งผ่าน HTTPS เท่านั้น (Vercel enforce โดยอัตโนมัติ)
NFR3: JWT Token inject เข้า Authorization header — ไม่ส่งผ่าน URL ของ API calls
NFR4: ไม่เก็บข้อมูล sensitive อื่นนอกจาก JWT Token ใน client storage
NFR5: API call failure แสดง error message ที่เข้าใจได้ — ไม่ crash ไม่แสดงหน้าว่าง
NFR6: หน้าเดิมทำงานปกติหลัง deploy หน้าใหม่ (zero regression)
NFR7: API endpoints ทุกตัวที่หน้าใหม่เรียกต้องเป็น endpoint เดิมของ fe-2-project — ห้ามเปลี่ยน API contract
NFR8: Authorization header format ตรงกับที่ backend ของ fe-2-project expect
NFR9: แต่ละหน้าแยกเป็น 3 ไฟล์: .html, .js, .css ตาม project pattern
NFR10: ไม่ใช้ bundler, transpiler, หรือ build tool — code run ใน browser ได้โดยตรง

### Additional Requirements

- Tech stack: Vanilla JS (ES6+), HTML5, CSS3 — ไม่มี build pipeline
- Chart library: ต้องเลือก vanilla JS chart library (Chart.js หรือ ApexCharts) แทน recharts
- Routing: เพิ่ม route ใหม่ใน server.js และ vercel.json สำหรับ 4 หน้า
- Auth pattern: JWT Token อ่านจาก sessionStorage/localStorage inject เข้า Authorization header
- File naming: [page-name].html, [page-name].js, [page-name].css
- API services to port: supplierApi, discountSalesApi, orderExternalApi, orderDiscountApi, filterService
- Utilities to port: formatCurrency, getYearOptions, getMonthOptions, sortCountriesByThai, filterAndDisplayJobPositions, formatDateTH
- Brownfield: ห้ามกระทบหน้าเดิมที่มีอยู่แล้ว

### UX Design Requirements

N/A — ไม่มี UX Design document สำหรับโปรเจกต์นี้ หน้าใหม่ทั้ง 4 ใช้ UI/UX ที่ port มาจาก fe-2-project ต้นฉบับ

### FR Coverage Map

FR1: Epic 1 — JWT Token receive via URL parameter
FR2: Epic 1 — JWT Token store in sessionStorage/localStorage
FR3: Epic 1 — JWT Token inject into API headers
FR4: Epic 1 — Token validation and auth redirect
FR5: Epic 2 — Unified menu shows all pages
FR6: Epic 2 — Navigate without re-auth
FR7: Epic 2 — Active state on current page
FR8: Epic 3 — Supplier Commission chart
FR9: Epic 3 — Filter by country
FR10: Epic 3 — Filter by year/quarter/month
FR11: Epic 3 — Filter by team
FR12: Epic 3 — Filter by job position
FR13: Epic 3 — Filter by user/sales person
FR14: Epic 3 — Sort by field
FR15: Epic 3 — API call with JWT auth
FR16: Epic 4 — Discount Sales chart
FR17: Epic 4 — Filter by country
FR18: Epic 4 — Filter by year/quarter/month
FR19: Epic 4 — Filter by team/job position/user
FR20: Epic 4 — Sort by field
FR21: Epic 4 — API call with JWT auth
FR22: Epic 5 — Order External Summary table
FR23: Epic 5 — Filter by country
FR24: Epic 5 — Filter by year/month
FR25: Epic 5 — Filter by team/job position/user
FR26: Epic 5 — API call with JWT auth
FR27: Epic 6 — Request Discount chart + table
FR28: Epic 6 — Filter by country
FR29: Epic 6 — Filter by year/quarter/month
FR30: Epic 6 — Filter by team/job position/user
FR31: Epic 6 — Sort by field
FR32: Epic 6 — API call with JWT auth
FR33: Epic 1 — Country list from API
FR34: Epic 1 — Team list from API
FR35: Epic 1 — Job position list filtered by team
FR36: Epic 1 — User list filtered by team/job position
FR37: Epic 1 — Currency formatting utility
FR38: Epic 1 — Thai Buddhist date formatting utility
FR39: Epic 1 — server.js routing for 4 new pages
FR40: Epic 1 — vercel.json routing for 4 new pages

## Epic List

### Epic 1: Foundation — Shared Infrastructure
User ใช้งานหน้าใหม่ได้อย่างปลอดภัยผ่าน JWT auth, routes ถูกต้อง, และ shared utilities พร้อมใช้
**FRs covered:** FR1, FR2, FR3, FR4, FR33, FR34, FR35, FR36, FR37, FR38, FR39, FR40

### Epic 2: Unified Navigation Menu
User เห็นและ navigate ไปทุกหน้า (เดิม + ใหม่) จากเมนูเดียวกัน พร้อม active state
**FRs covered:** FR5, FR6, FR7

### Epic 3: Supplier Commission Report
User ดูข้อมูล Supplier Commission พร้อม chart, filter ครบ (ประเทศ, ปี/quarter/เดือน, team, job position, user), และ sort
**FRs covered:** FR8, FR9, FR10, FR11, FR12, FR13, FR14, FR15

### Epic 4: Discount Sales Report
User ดูข้อมูล Discount Sales พร้อม chart, filter ครบ, และ sort
**FRs covered:** FR16, FR17, FR18, FR19, FR20, FR21

### Epic 5: Order External Summary Report
User ดูข้อมูล Order External Summary พร้อม table, filter ครบ
**FRs covered:** FR22, FR23, FR24, FR25, FR26

### Epic 6: Request Discount Report
User ดูข้อมูล Request Discount พร้อม chart + table, filter ครบ, และ sort
**FRs covered:** FR27, FR28, FR29, FR30, FR31, FR32

---

## Epic 1: Foundation — Shared Infrastructure

User ใช้งานหน้าใหม่ได้อย่างปลอดภัยผ่าน JWT auth, routes ถูกต้อง, และ shared utilities พร้อมใช้
**FRs covered:** FR1, FR2, FR3, FR4, FR33, FR34, FR35, FR36, FR37, FR38, FR39, FR40

### Story 1.1: Add 4 Page Routes & HTML Shells

As a developer,
I want 4 new page routes registered and HTML shell files created,
So that the new pages are accessible via URL and ready for content.

**Acceptance Criteria:**

**Given** server.js is loaded
**When** a request arrives at /supplier-commission, /discount-sales, /order-external-summary, or /request-discount
**Then** each request is served the correct .html file without 404

**Given** vercel.json is updated
**When** Vercel serves the app in production
**Then** all 4 new routes resolve correctly

**Given** each HTML shell file exists
**When** the page loads in browser
**Then** the page renders the shared menu, a page title, and an empty content area without console errors

---

### Story 1.2: Port Shared Utility Functions

As a developer,
I want shared utility functions available as vanilla JS,
So that all 4 new pages can format currency, dates, and filter options consistently.

**Acceptance Criteria:**

**Given** a numeric value
**When** formatCurrency(value) is called
**Then** it returns a correctly formatted currency string matching fe-2-project output

**Given** a date string
**When** formatDateTH(dateString) is called
**Then** it returns the date in Thai Buddhist calendar format (DD/MM/YYYY+543)

**Given** current date
**When** getYearOptions(), getMonthOptions(), getQuarterOptions() are called
**Then** they return arrays with correct year/month/quarter values

**Given** a country list array
**When** sortCountriesByThai(countries) is called
**Then** countries are returned sorted by Thai name alphabetically

**Given** a team and job position list
**When** filterAndDisplayJobPositions(jobPositions, teamId) is called
**Then** it returns only job positions belonging to that team

---

### Story 1.3: Port Shared Filter API Service

As a developer,
I want shared API service functions for dropdown filter data,
So that all 4 new pages can load country, team, job position, and user data with JWT auth.

**Acceptance Criteria:**

**Given** a valid JWT token in storage
**When** getCountries() is called
**Then** API request includes Authorization header and returns country list

**Given** a valid JWT token in storage
**When** getTeams() is called
**Then** API request includes Authorization header and returns team list

**Given** a team ID is provided
**When** getJobPositions(teamId) is called
**Then** returns job positions filtered for that team only

**Given** a team ID and job position ID are provided
**When** getUsers(teamId, jobPositionId) is called
**Then** returns users filtered by those parameters

**Given** API call fails (network error or 4xx/5xx)
**When** any filter service function is called
**Then** function returns empty array and does not throw — calling page handles the empty state gracefully

---

### Story 1.4: JWT Auth Guard for New Pages

As a Finance staff member,
I want the system to capture my JWT Token from URL and protect new pages,
So that I'm authenticated automatically when arriving from Finance Backoffice and safely redirected if I access without a token.

**Acceptance Criteria:**

**Given** JWT token is present in URL parameter (e.g. ?token=xxx)
**When** any new page loads
**Then** token is extracted, stored in sessionStorage/localStorage, and cleaned from URL (browser history shows clean URL)

**Given** JWT token exists in storage (from previous capture)
**When** any new page loads
**Then** page renders normally without redirect

**Given** no JWT token in URL or storage
**When** a new page is accessed directly
**Then** user is redirected to auth flow gracefully — no blank page, no crash

**Given** token is stored
**When** API calls are made from new pages
**Then** Authorization header contains the token — token is not appended to API request URLs

---

## Epic 2: Unified Navigation Menu

User เห็นและ navigate ไปทุกหน้า (เดิม + ใหม่) จากเมนูเดียวกัน พร้อม active state
**FRs covered:** FR5, FR6, FR7

### Story 2.1: Update Unified Navigation Menu

As a Finance staff member,
I want the navigation menu to show all pages including the 4 new ones,
So that I can navigate to any report from any page without re-authenticating.

**Acceptance Criteria:**

**Given** I am on any page in finance-backoffice-report
**When** the menu loads
**Then** existing pages AND all 4 new pages (Supplier Commission, Discount Sales, Order External Summary, Request Discount) appear in the menu

**Given** I am on the Supplier Commission page
**When** the menu renders
**Then** "Supplier Commission" menu item shows active/highlighted state

**Given** I click a new menu item from an existing page
**When** navigation occurs
**Then** the target page loads with JWT token still valid in storage (no re-authentication required)

**Given** menu-component.js is updated
**When** any existing page loads
**Then** all pre-existing menu items and behavior remain unchanged (NFR6 — zero regression)

---

## Epic 3: Supplier Commission Report

User ดูข้อมูล Supplier Commission พร้อม chart, filter ครบ (ประเทศ, ปี/quarter/เดือน, team, job position, user), และ sort
**FRs covered:** FR8, FR9, FR10, FR11, FR12, FR13, FR14, FR15

### Story 3.1: Supplier Commission Page Layout & CSS

As a Finance staff member,
I want the Supplier Commission page to have the correct responsive layout,
So that the filter panel, chart, and table render properly on desktop.

**Acceptance Criteria:**

**Given** I navigate to /supplier-commission
**When** the page loads
**Then** the page shows: shared menu, page title "Supplier Commission", filter panel section, chart section, and table section

**Given** a desktop browser (Chrome, Edge, or Safari)
**When** the page renders
**Then** layout is desktop-first responsive matching the visual structure of the fe-2-project original

**Given** page CSS is loaded
**When** the page renders
**Then** no Tailwind classes are used — all styles are plain CSS3 in supplier-commission.css

---

### Story 3.2: Supplier Commission Filter Panel

As a Finance staff member,
I want to filter Supplier Commission data by country, date period, team, job position, and user,
So that I can narrow the report to the specific data I need.

**Acceptance Criteria:**

**Given** the page loads
**When** the filter panel renders
**Then** dropdowns for country, year, quarter/month filter mode, team, job position, and user are shown

**Given** I select a team
**When** the team dropdown changes
**Then** the job position dropdown updates to show only positions for that team

**Given** I select a job position
**When** the job position dropdown changes
**Then** the user dropdown updates to show only users matching that team + position

**Given** I apply filter changes
**When** filters are submitted
**Then** chart and table data update to reflect the selected filter values

---

### Story 3.3: Supplier Commission Chart, Table & API

As a Finance staff member,
I want to view Supplier Commission data as a chart and sortable table,
So that I can analyze commission trends and drill into specific entries.

**Acceptance Criteria:**

**Given** I am on the page with valid JWT in storage
**When** the page loads (and when filters are applied)
**Then** API is called with correct Authorization header and commission data is displayed

**Given** data is returned from API
**When** chart renders
**Then** chart (Chart.js or ApexCharts) displays commission data correctly matching fe-2-project chart layout

**Given** data is displayed in table
**When** I click a sortable column header
**Then** table rows sort by that column — clicking again reverses sort direction

**Given** API call fails
**When** page loads or filters are applied
**Then** a clear error message is shown — the page does not crash or show a blank screen (NFR5)

---

## Epic 4: Discount Sales Report

User ดูข้อมูล Discount Sales พร้อม chart, filter ครบ, และ sort
**FRs covered:** FR16, FR17, FR18, FR19, FR20, FR21

### Story 4.1: Discount Sales Page Layout & CSS

As a Finance staff member,
I want the Discount Sales page to have the correct layout,
So that the chart, filters, and table render properly.

**Acceptance Criteria:**

**Given** I navigate to /discount-sales
**When** the page loads
**Then** page shows: shared menu, title "Discount Sales", filter panel, chart section, and table section

**Given** desktop browser
**When** page renders
**Then** layout matches fe-2-project visual structure using plain CSS3 in discount-sales.css

---

### Story 4.2: Discount Sales Filter Panel

As a Finance staff member,
I want to filter Discount Sales data by country, date period, team, job position, and user,
So that I can view targeted discount data.

**Acceptance Criteria:**

**Given** the page loads
**When** filter panel renders
**Then** country, year, quarter/month, team, job position, and user dropdowns are shown

**Given** I select a team
**When** team dropdown changes
**Then** job position and user dropdowns cascade correctly

**Given** I apply filters
**When** data updates
**Then** chart and table reflect the selected filter values

---

### Story 4.3: Discount Sales Chart, Table & API

As a Finance staff member,
I want to view Discount Sales data as a chart and sortable table,
So that I can compare discount values across suppliers and periods.

**Acceptance Criteria:**

**Given** valid JWT in storage
**When** page loads or filters applied
**Then** API called with Authorization header and data displays

**Given** data returned
**When** chart renders
**Then** Chart.js chart matches fe-2-project visual layout

**Given** table displays data
**When** column header clicked
**Then** rows sort by that column correctly (ascending/descending toggle)

**Given** API fails
**When** page loads or filters applied
**Then** error message shown clearly — no crash (NFR5)

---

## Epic 5: Order External Summary Report

User ดูข้อมูล Order External Summary พร้อม table, filter ครบ
**FRs covered:** FR22, FR23, FR24, FR25, FR26

### Story 5.1: Order External Summary Page Layout & CSS

As a Finance staff member,
I want the Order External Summary page to have the correct table layout,
So that order data renders clearly.

**Acceptance Criteria:**

**Given** I navigate to /order-external-summary
**When** page loads
**Then** page shows: shared menu, title "Order External Summary", filter panel, and table section

**Given** desktop browser
**When** page renders
**Then** layout matches fe-2-project using plain CSS3 in order-external-summary.css

---

### Story 5.2: Order External Summary Filter Panel

As a Finance staff member,
I want to filter Order External Summary by country, year/month, team, job position, and user,
So that I can view specific order data.

**Acceptance Criteria:**

**Given** page loads
**When** filter panel renders
**Then** country, year, month, team, job position, and user dropdowns are shown

**Given** team selected
**When** team dropdown changes
**Then** job position and user dropdowns cascade correctly

**Given** filters applied
**When** data updates
**Then** table reflects the selected filter values

---

### Story 5.3: Order External Summary Table & API

As a Finance staff member,
I want to view Order External Summary data in a table with Thai date format,
So that I can review order details clearly.

**Acceptance Criteria:**

**Given** valid JWT in storage
**When** page loads
**Then** API called with Authorization header and table data displays correctly

**Given** date values exist in data
**When** dates render in table
**Then** dates display in Thai Buddhist calendar format (DD/MM/YYYY+543) using formatDateTH utility

**Given** API fails
**When** page loads or filters applied
**Then** error message shown clearly — no blank screen or crash (NFR5)

---

## Epic 6: Request Discount Report

User ดูข้อมูล Request Discount พร้อม chart + table, filter ครบ, และ sort
**FRs covered:** FR27, FR28, FR29, FR30, FR31, FR32

### Story 6.1: Request Discount Page Layout & CSS

As a Finance staff member,
I want the Request Discount page to have both chart and table layout,
So that discount request data renders correctly.

**Acceptance Criteria:**

**Given** I navigate to /request-discount
**When** page loads
**Then** page shows: shared menu, title "Request Discount", filter panel, chart section, and table section

**Given** desktop browser
**When** page renders
**Then** layout matches fe-2-project using plain CSS3 in request-discount.css

---

### Story 6.2: Request Discount Filter Panel

As a Finance staff member,
I want to filter Request Discount data by country, date period, team, job position, and user,
So that I can analyze specific discount request patterns.

**Acceptance Criteria:**

**Given** page loads
**When** filter panel renders
**Then** country, year, quarter/month, team, job position, and user dropdowns are shown

**Given** team selected
**When** team dropdown changes
**Then** job position and user dropdowns cascade correctly

**Given** filters applied
**When** data updates
**Then** chart and table reflect selected filter values

---

### Story 6.3: Request Discount Chart, Table, Sort & API

As a Finance staff member,
I want to view Request Discount data as a chart and sortable table,
So that I can analyze discount request trends and amounts.

**Acceptance Criteria:**

**Given** valid JWT in storage
**When** page loads
**Then** API called with Authorization header and allOrdersData loaded into memory

**Given** data returned from API
**When** chart renders
**Then** Chart.js chart matches fe-2-project layout

**Given** table displays data
**When** column header clicked
**Then** rows sort by that column correctly (ascending/descending)

**Given** allOrdersData is loaded
**When** filters change
**Then** table filters from in-memory dataset without re-calling API (matching fe-2-project behavior)

**Given** API fails
**When** page loads
**Then** error message shown clearly — no crash (NFR5)
