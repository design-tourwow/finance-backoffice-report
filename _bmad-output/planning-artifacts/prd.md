---
stepsCompleted: ['step-01-init', 'step-02-discovery', 'step-02b-vision', 'step-02c-executive-summary', 'step-03-success', 'step-04-journeys', 'step-05-domain', 'step-06-innovation', 'step-07-project-type', 'step-08-scoping', 'step-09-functional', 'step-10-nonfunctional', 'step-11-polish', 'step-12-complete']
inputDocuments: ['_bmad-output/project-context.md']
workflowType: 'prd'
briefCount: 0
researchCount: 0
brainstormingCount: 0
projectDocsCount: 1
classification:
  projectType: web_app
  domain: general
  complexity: medium
  projectContext: brownfield
---

# Product Requirements Document - finance-backoffice-report

**Author:** Gap
**Date:** 2026-04-21

## Executive Summary

Finance Backoffice Report เป็น internal reporting web application สำหรับ Tourwow ที่ให้ทีม Finance เข้าใช้ผ่าน JWT Token handoff จากระบบหลัก Finance Backoffice (เมนู "Report Plus") ปัจจุบันระบบแตกออกเป็น 2 domain แยกกัน: หน้า report หลักอยู่ใน `finance-backoffice-report.vercel.app` (vanilla JS) และหน้า report เพิ่มเติมอยู่ใน `fe-2-project.vercel.app` (React/TypeScript) ทำให้ user ต้องสลับระหว่าง 2 ระบบ

Initiative นี้รวมทุกหน้าเข้า `finance-backoffice-report` domain เดียว โดย port 4 หน้าจาก fe-2-project (SupplierCommission, DiscountSales, OrderExternalSummary, RequestDiscount) มาเป็น vanilla JS อัปเดต shared menu ให้แสดงทุกหน้าในที่เดียว และยกเลิก cross-domain dependency โดยไม่มีการเปลี่ยนแปลง backend หรือ API ใดๆ

### What Makes This Special

ปัญหาคือ UX fragmentation ไม่ใช่ความซับซ้อนทางเทคนิค สองระบบที่ user มองว่าเป็นหนึ่งเดียวกลับ deploy แยกกัน แนวทางแก้ไขคือย้าย UI boundary ให้ตรงกับ mental model ของ user — port UI มา vanilla JS (stack เดิม ไม่มี build step) และเรียก backend API เดิมโดยตรง ได้ผล unified UX โดยไม่ต้องเปลี่ยน infrastructure

## Project Classification

- **Project Type:** Web Application (vanilla JS, static HTML/CSS/JS, ไม่มี build pipeline)
- **Domain:** Internal Business Reporting (travel industry — sales, commissions, wholesale)
- **Complexity:** Medium — brownfield integration, cross-stack UI migration (React → Vanilla JS)
- **Project Context:** Brownfield — additive change บน live production system

## Success Criteria

### User Success

- User คลิก "Report Plus" จาก Finance Backoffice → JWT Token ส่งผ่าน URL → ระบบเก็บลง storage และแสดงเมนูรวมทันที ไม่ต้อง login ซ้ำ
- เมนูแสดงทุกหน้า (หน้าเดิมและ 4 หน้าใหม่) ในที่เดียวกัน
- หน้าทั้ง 4 (SupplierCommission, DiscountSales, OrderExternalSummary, RequestDiscount) ทำงาน feature parity 100% กับ fe-2-project — charts, filters, sort ครบ

### Business Success

- Zero backend changes — ไม่มีการแก้ไข API หรือ backend
- fe-2-project ยังคง deploy อยู่และไม่ถูก break
- Deploy บน Vercel production และใช้งานได้จริง

### Technical Success

- 4 หน้า port เป็น vanilla JS สำเร็จ พร้อม feature parity 100%
- JWT Token inject เข้า API headers ถูกต้องทุกหน้า
- `menu-component.js`, `server.js`, `vercel.json` อัปเดตครบสำหรับ 4 routes ใหม่
- ไม่มี regression บนหน้าเดิม

### Measurable Outcomes

- ทุก route ใหม่โหลดได้จาก URL ของ finance-backoffice-report โดยตรง
- API calls response ถูกต้องเหมือนที่ fe-2-project เรียก
- Deploy สำเร็จบน Vercel production

## Product Scope

### MVP (Phase 1)

- Port 4 หน้า: SupplierCommission, DiscountSales, OrderExternalSummary, RequestDiscount → vanilla JS feature parity 100%
- เลือกและ integrate vanilla JS chart library แทน recharts (แนะนำ Chart.js หรือ ApexCharts)
- Port utility functions และ API service calls จาก fe-2-project
- อัปเดต `menu-component.js`, `server.js`, `vercel.json`
- JWT Token auth ทำงานได้ทุกหน้าใหม่
- Deploy และ verify บน Vercel production

### Growth (Phase 2) — ✅ Completed 2026-04-22

- ✅ Retire fe-2-project (commit `1ce6825` — frontend swapped off `be-2-report.vercel.app` onto our own `finance-backoffice-report-api`)
- ✅ Refactor shared utilities (commit `dd5db13` — `fe2-*.js` renamed to `shared-*.js`; new `shared-http.js` centralises Bearer/401 handling; `shared-ui.js` + `shared-chart.js` + `shared-table.js` + `shared-csv.js` + `shared-filter-panel.js` extracted for reuse across new and existing pages)
- ✅ Playwright test suite added (commit `97c3f9a`) — 21 Chromium P0 scenarios green

### Vision (Phase 3) — 🚧 In progress

- Finance Backoffice Report เป็น single consolidated reporting platform สำหรับ Tourwow ทั้งหมด
- ✅ **Repeated Customer Report** (ship 2026-04-24) — รายงานลูกค้าซื้อซ้ำสำหรับทีม Commission Co'Auay พร้อม customer-name autocomplete + seller (TS/CRM) filter + ranking summary by job_position
- ✅ **Shared Period Selector "ทั้งหมด" mode** (2026-04-25) — option สำหรับข้ามการกรองช่วงเวลา ครอบคลุม 10 หน้า
- ✅ **SharedTable groupColumns** (2026-04-25) — รองรับ grouped header (ใช้แล้วใน RCR และ extensible สำหรับ report ใหม่)
- ✅ **SearchableDropdownComponent legacy retire** (2026-04-27) — migrate sales-by-country มาใช้ FilterSearchDropdown และลบ component เดิมออกจาก codebase
- ✅ **Phase 5 — Shared component consolidation** (2026-04-27 → 2026-04-28) — เก็บกวาดโค้ดซ้ำที่สะสมระหว่าง Phase 3 + 4 เป็น 4 module กลาง (1 frontend + 3 backend) และจัด format ของ period dropdown ให้เหมือนกันทุกหน้า รายละเอียด:
  - **`shared-trophy-rank.js`** — รวม trophy SVG + palette (gold/silver/bronze) เป็นจุดเดียว แทน inline copy ใน commission-report-plus + repeated-customer-report
  - **`shared-filter-service.js#getAvailablePeriods()`** — รวม `loadAvailablePeriods()` ที่ก่อนหน้านี้แต่ละหน้า implement เอง (3 หน้า: commission-report-plus, canceled-orders, order-report) — caching ด้วย module-scope promise
  - **`lib/agency-db-helper.ts`** — รวม `getAgencyDb()` ที่ duplicate อยู่ 4 routes (work-list, repeated-customer-report, commission-plus, commission-plus/sellers) — INFORMATION_SCHEMA lookup + module-scope caching
  - **`lib/api-guard.ts#withApiGuard()`** — wrapper รวม rate-limit + JWT/API-key authentication + structured logging boilerplate ที่อยู่หัวของทุก report route — rollout 21 routes (ทั้ง simple-pattern auth-only และ standard rate-limit + auth pattern)
  - **Period selector label format unification** — ทุก year/quarter/month dropdown แสดงในรูป `[BE] ([CE])` (เช่น `2568 (2025)`) แทนรูปแบบเดิมที่แต่ละหน้าใช้ต่างกัน (`พ.ศ. 2568 (2026)` vs `2026`); แก้ bug `buildYearOptions` ที่ขาดฟิลด์ `year` ทำให้ payload ส่ง `undefined-01-01`
- ✅ **Canceled-orders + Sales-report-by-seller refinements** (2026-05-05) — แก้บั๊ก data ที่ค้างมานานบนหน้า /canceled-orders, ปรับ ranking summary ของ /sales-report-by-seller ให้รองรับ CRM role อย่างเต็มรูปแบบ, และปรับคำว่า "ยอดขาย" → "ยอดจอง" ทั้งระบบ รายละเอียด:
  - **/canceled-orders — คอลัมน์ "วันที่ยกเลิก"** — backend `commission-plus` SELECT ไม่ได้ส่ง `canceled_at` มา ทำให้คอลัมน์ในตารางเป็น "-" ตลอด เพิ่ม `o.canceled_at` ใน SELECT + GROUP BY
  - **/canceled-orders — `canceled_at_from/to` filter** — frontend ส่ง query param มานาน แต่ backend silently ไม่อ่าน ทำให้ตัวเลือกช่วงวันที่ยกเลิกไม่มีผลกับผลลัพธ์จริง เพิ่มเงื่อนไข `DATE(o.canceled_at) BETWEEN` ตามที่ส่งมา
  - **/canceled-orders — dropdown "วันที่สร้าง Order"** — เพิ่ม column ที่ 3 บน period filter row 2 ตัวเลือก: "ก่อนช่วงที่ยกเลิก" (`created_at < canceled_at_from`) และ "ตรงกับช่วงที่ยกเลิก" (created ในช่วงเดียวกัน) แสดงเฉพาะตอน canceled period mode = ราย... (ปี/ไตรมาส/เดือน); ซ่อนใน mode "ทั้งหมด" และ "กำหนดเอง"
  - **/canceled-orders — default sort** — ตารางหลักเริ่มต้น sort ตาม "จองวันที่" (`created_at`) จากใหม่→เก่า เพื่อให้ booking ล่าสุดอยู่บนสุด
  - **/sales-report-by-seller — CRM ranking visibility** — ก่อนหน้านี้ CRM role login ไม่เห็น ranking summary section เลย เปิดให้แสดง CRM group ของตัวเอง โดย unmasked ทุกคนในทีม (ต่างจาก TS ที่ peer rows ยัง redact name → `******`)
  - **/sales-report-by-seller — CRM trophies vs numbering** — Admin viewing CRM group เห็นถ้วยทอง/เงิน/ทองแดงเหมือน Telesales (consistency); CRM-role login เห็น CRM group เป็น plain numbering ทุก rank
  - **/sales-report-by-seller — CRM team title suffix** — title group ของ CRM แสดง "CRM ทีม X" เฉพาะเมื่อ CRM role เป็นคนดู (X = team_number ของผู้ดูเอง จาก `agency_members.team_number`); admin/ts ไม่เห็น suffix
  - **/sales-report-by-seller — half-width single group** — เมื่อ TS หรือ CRM ดูคนเดียว กล่อง summary คงความกว้างเท่าครึ่งจอ ชิดซ้าย (เหมือน admin's side-by-side pair) แทนที่จะยืดเต็มจอ
  - **/sales-report-by-seller — exclude 0-traveler orders** — ตัด order ที่ `room_quantity = 0` ออกตั้งแต่ต้นทาง (filter ที่ renderResults entry) ทุก consumer (KPI / ranking / table / export) เห็นชุดเดียวกัน; summary คำนวณ client-side เพื่อให้ count ตรงกับ filter
  - **`commission-plus` — `seller_team_number`** — เพิ่ม `COALESCE(am.team_number, 0)` ใน SELECT + GROUP BY (ใช้ pattern null-safe เดียวกับ `seller_nick_name` / `seller_job_position`) เพื่อให้ frontend หา team_number ของ user สำหรับ title suffix ได้
  - **i18n: ยอดขาย → ยอดจอง** — เปลี่ยนคำทั้งระบบ (14 ไฟล์, 53 occurrences) ครอบคลุม UI labels (KPI, table headers, chart titles/tooltips, dropdown labels), CSV/PDF/print headers, page descriptions, HTML meta, และ supporting docs ทั้ง 2 repo รวมเข้ากับ canceled-orders / sales-report / repeated-customer-report ที่ใช้ "ยอดจอง" อยู่แล้วก่อนหน้า

## User Journeys

### Journey 1: Finance Staff — Happy Path

**Persona:** นุ่น, พนักงาน Finance ที่ต้องดู commission และ discount report ทุกสัปดาห์

1. คลิก "Report Plus" ใน Finance Backoffice → JWT Token ส่งผ่าน URL → Finance Backoffice Report รับ token เก็บลง storage
2. เห็นเมนูรวมครบ ทั้งหน้าเดิมและ 4 หน้าใหม่
3. คลิก "Supplier Commission" → filter และ chart โหลดขึ้น → เลือก filter → ข้อมูลอัปเดต
4. ได้ report ครบในระบบเดียว ไม่ต้องสลับ tab ไม่ต้อง login ซ้ำ

**Capabilities revealed:** JWT handoff, unified menu, all 4 pages functional

### Journey 2: Finance Staff — Edge Case (ไม่มี Token)

**Persona:** นุ่น เปิด URL ของหน้า DiscountSales โดยตรงจาก bookmark

1. เปิด URL → ระบบเช็ค token ใน storage → ไม่พบ
2. ระบบ redirect กลับ auth flow gracefully — ไม่ crash ไม่แสดงหน้าว่าง

**Capabilities revealed:** Auth guard, graceful redirect

### Journey 3: Admin — Verify หลัง Deploy

**Persona:** Gap, Admin ตรวจสอบระบบก่อน go-live

1. เข้าผ่าน Finance Backoffice → verify JWT Token flow
2. เปิดทีละหน้า → เช็ค chart, filter, API response
3. ยืนยัน feature parity 100% และเมนูครบ → go-live

**Capabilities revealed:** All pages accessible, no regression, API correctness

### Journey Requirements Summary

| Journey | Capabilities Required |
|---------|----------------------|
| Finance Staff - Happy Path | JWT handoff, unified menu, 4 pages functional |
| Finance Staff - Edge Case | Auth guard, graceful redirect |
| Admin - Verify | All pages accessible, zero regression, API correctness |

## Web App Technical Requirements

- **Architecture:** MPA — แต่ละหน้าเป็นไฟล์ `.html` แยก routing ผ่าน `server.js` และ `vercel.json`
- **Stack:** Vanilla JS (ES6+), HTML5, CSS3 — ห้ามใช้ bundler หรือ build step
- **Charts:** Vanilla JS chart library (Chart.js หรือ ApexCharts) แทน recharts
- **Auth:** JWT Token จาก sessionStorage/localStorage inject เข้า Authorization header ทุก API call
- **Naming:** ไฟล์ตาม pattern `[page-name].html`, `[page-name].js`, `[page-name].css`
- **Browser:** Desktop — Chrome, Edge, Safari (latest versions)
- **Responsive:** Desktop-first responsive ด้วย CSS3 แทน Tailwind
- **API Services:** Port จาก TypeScript services เดิม: `supplierApi`, `discountSalesApi`, `orderExternalApi`, `orderDiscountApi`, `filterService`
- **Utilities:** Port `formatCurrency`, `getYearOptions`, `getMonthOptions`, `sortCountriesByThai`, `filterAndDisplayJobPositions`, `formatDateTH`

### Risk Mitigation

- **recharts → Chart.js:** Test chart render บนหน้าแรกก่อน port หน้าอื่น
- **TypeScript → Vanilla JS:** เพิ่ม null checks รอบ API response shapes ทุกจุด
- **Scope creep:** port ทีละหน้า deploy incrementally

## Functional Requirements

### Authentication & Session Management

- **FR1:** ระบบรับ JWT Token ผ่าน URL parameter เมื่อ page โหลด
- **FR2:** ระบบเก็บ JWT Token ลง sessionStorage หรือ localStorage
- **FR3:** ระบบอ่าน JWT Token จาก storage เพื่อ inject เข้า API request headers
- **FR4:** ระบบตรวจสอบ token และ redirect กลับ auth flow หากไม่พบ token

### Unified Navigation

- **FR5:** User เห็นเมนูรวมทุกหน้า (หน้าเดิมและ 4 หน้าใหม่) ในที่เดียวกัน
- **FR6:** User navigate ไปหน้าใดก็ได้โดยไม่ต้อง re-authenticate ภายใน session เดียวกัน
- **FR7:** Navigation menu แสดง active state ของหน้าปัจจุบัน

### Supplier Commission Report

- **FR8:** User ดู supplier commission data ในรูปแบบ chart
- **FR9:** User filter commission data ตามประเทศ
- **FR10:** User filter commission data ตามปี / quarter / เดือน
- **FR11:** User filter commission data ตาม team
- **FR12:** User filter commission data ตาม job position
- **FR13:** User filter commission data ตาม user / sales person
- **FR14:** User sort commission data ตาม field ต่างๆ
- **FR15:** ระบบดึงข้อมูล supplier commission จาก API พร้อม JWT auth

### Discount Sales Report

- **FR16:** User ดู discount sales data ในรูปแบบ chart
- **FR17:** User filter discount sales ตามประเทศ
- **FR18:** User filter discount sales ตามปี / quarter / เดือน
- **FR19:** User filter discount sales ตาม team, job position, user
- **FR20:** User sort discount sales data ตาม field ต่างๆ
- **FR21:** ระบบดึงข้อมูล discount sales จาก API พร้อม JWT auth

### Order External Summary Report

- **FR22:** User ดู order external summary data ในรูปแบบ table
- **FR23:** User filter order external summary ตามประเทศ
- **FR24:** User filter order external summary ตามปี / เดือน
- **FR25:** User filter order external summary ตาม team, job position, user
- **FR26:** ระบบดึงข้อมูล order external summary จาก API พร้อม JWT auth

### Request Discount Report

- **FR27:** User ดู request discount data ในรูปแบบ chart และ table
- **FR28:** User filter request discount ตามประเทศ
- **FR29:** User filter request discount ตามปี / quarter / เดือน
- **FR30:** User filter request discount ตาม team, job position, user
- **FR31:** User sort request discount data ตาม field ต่างๆ
- **FR32:** ระบบดึงข้อมูล request discount จาก API พร้อม JWT auth

### Shared Data & Utilities

- **FR33:** ระบบดึงรายการประเทศจาก API สำหรับ filter dropdowns
- **FR34:** ระบบดึงรายการ team จาก API สำหรับ filter dropdowns
- **FR35:** ระบบดึงรายการ job position กรองตาม team สำหรับ filter dropdowns
- **FR36:** ระบบดึงรายการ user กรองตาม team และ job position สำหรับ filter dropdowns
- **FR37:** ระบบแสดงตัวเลขในรูปแบบ currency ที่ถูกต้อง
- **FR38:** ระบบแสดงวันที่ในรูปแบบปีพุทธศักราช

### System Configuration & Routing

- **FR39:** ระบบ route ทุก path ใหม่ผ่าน `server.js` ได้ถูกต้อง
- **FR40:** ระบบ route ทุก path ใหม่ผ่าน `vercel.json` ได้ถูกต้อง

### Repeated Customer Report (Phase 3 — ship 2026-04-24)

- **FR41:** User ดูรายงานลูกค้าที่ซื้อซ้ำ (≥ 2 orders ที่ชำระงวดแรก + ไม่ยกเลิก) ในรูปแบบตาราง พร้อม KPI summary band (จำนวนลูกค้า, Order, ผู้เดินทาง, ยอดจอง, ส่วนลด, คอม, คอมสุทธิ)
- **FR42:** User filter ลูกค้าด้วย autocomplete (พิมพ์ ≥ 3 ตัวอักษร → API `/api/customers/search` แนะนำชื่อให้เลือก)
- **FR43:** User filter ตามจำนวนซื้อซ้ำ (dropdown แสดงเลขจริงที่มีในระบบ — dynamic จาก API `available_repeats`)
- **FR44:** User filter ตามช่วงเวลาแบบ rolling window ("ซื้อซ้ำภายใน 3/6/9 เดือน / 1/2 ปี") — แสดงช่วงวันจริงให้ยืนยัน
- **FR45:** User filter ตาม "เซลล์ผู้ขาย" (TS/CRM) — searchable dropdown โหลดจาก `/api/agency-members?roles=ts,crm`; label แสดง "Nickname [TS]" / "Nickname [CRM]"; ระบบกรองตามผู้ดูแล order ล่าสุดของลูกค้า
- **FR46:** User เห็นตาราง ranking สรุป Telesales / CRM ที่ลูกค้าซื้อซ้ำเยอะที่สุด — แยก 2 group ตาม `job_position`, top 3 มี trophy icon
- **FR47:** User toggle "นับเฉพาะ Order ที่ค่าคอมมากกว่า 0" เพื่อ filter ลูกค้าในตารางแบบ client-side
- **FR48:** User export ตารางเป็น CSV (ดาวน์โหลดเฉพาะแถวที่ visible หลัง filter+sort)
- **FR49:** ตารางมี frozen header + horizontal scroll พร้อม fade gradient ขวา (เหมือน /sales-report) เมื่อยังมีคอลัมน์ให้ดูต่อ

### Cross-cutting Filter Behaviors (Phase 3)

- **FR50:** ทุก filter "เริ่มใหม่" (reset) บนทุกหน้าต้อง clear state กลับ default เท่านั้น — ห้าม re-query หรือ reload หน้า; ผู้ใช้ต้องกด "ค้นหา" เองเพื่อยิง API ใหม่
- **FR51:** Period selector ต้องมี mode "ทั้งหมด" เป็น option แรก — เลือกแล้วซ่อน value dropdown และไม่ส่ง dateFrom/dateTo ไป API

### Canceled Orders + Sales Report by Seller Refinements (Phase 3 — ship 2026-05-05)

- **FR52:** /canceled-orders ตารางหลักต้องแสดงคอลัมน์ "วันที่ยกเลิก" (canceled_at) ที่มีค่าจริง และ filter ช่วงวันที่ยกเลิกใน period selector ต้องมีผลกับผลลัพธ์ (เดิม backend ส่ง `canceled_at_from/to` ไป แต่ไม่ filter จริง)
- **FR53:** /canceled-orders period filter row ต้องมี dropdown ที่ 3 "วันที่สร้าง Order" 2 ตัวเลือก: "ก่อนช่วงที่ยกเลิก" (default — `created_at < canceled_at_from`) และ "ตรงกับช่วงที่ยกเลิก" (created ในช่วงเดียวกัน); แสดงเฉพาะเมื่อ canceled period mode = รายปี / รายไตรมาส / รายเดือน, ซ่อนใน "ทั้งหมด" และ "กำหนดเอง"
- **FR54:** /canceled-orders ตารางหลัก default sort ตาม "จองวันที่" (created_at) descending — booking ล่าสุดอยู่บนสุด
- **FR55:** /sales-report-by-seller — CRM-role login ต้องเห็น ranking summary ของ CRM group (เดิมซ่อน); แสดงทุกคนในทีม unmasked (ต่างจาก TS ที่ peer rows ยัง redact name → `******`); ใช้เลขลำดับธรรมดาแทนถ้วยทอง/เงิน/ทองแดง; group title แสดง "CRM ทีม X" โดย X = `team_number` ของผู้ใช้ (จาก `agency_members.team_number`)
- **FR56:** /sales-report-by-seller — Admin ต้องเห็น CRM group rendered แบบเดียวกับ Telesales group (ถ้วยทอง/เงิน/ทองแดงบน top 3, title "CRM" plain ไม่มี ทีม X) เพื่อ visual consistency เวลาเทียบสองกล่องข้างกัน
- **FR57:** /sales-report-by-seller — เมื่อ TS หรือ CRM ดู ranking ของตัวเองคนเดียว (1 group) กล่อง summary ต้องคงความกว้าง ~ครึ่งจอ ชิดซ้าย (`flex: 0 1 calc(50% - 8px)`) ห้ามยืดเต็ม row; admin's two-box layout ไม่เปลี่ยน
- **FR58:** /sales-report-by-seller — order ที่ `room_quantity = 0` (ผู้เดินทาง = 0) ต้องถูกตัดออกตั้งแต่ต้นทาง (filter ใน `renderResults` entry) ครอบคลุมทุก consumer ที่ตามมา: KPI summary, seller ranking aggregate, main table, Excel/CSV/PDF exports; summary คำนวณ client-side (ไม่ใช้ backend's `summary` ที่ pre-filter)
- **FR59:** Cross-system terminology — คำว่า "ยอดขาย" ห้ามปรากฏเป็น user-facing label ใน UI / export / print / page meta อีก เปลี่ยนเป็น "ยอดจอง" ทั้งหมด (variable/field names เช่น `net_amount`, `total_net_amount` ไม่ต้องแก้ — เป็น internal identifier)

## Non-Functional Requirements

### Security

- **NFR1:** JWT Token ถูก clean ออกจาก URL หลัง extract เสร็จ — ไม่ expose ใน browser history
- **NFR2:** JWT Token ส่งผ่าน HTTPS เท่านั้น (Vercel enforce โดยอัตโนมัติ)
- **NFR3:** JWT Token inject เข้า Authorization header — ไม่ส่งผ่าน URL ของ API calls
- **NFR4:** ไม่เก็บข้อมูล sensitive อื่นนอกจาก JWT Token ใน client storage

### Reliability

- **NFR5:** API call failure แสดง error message ที่เข้าใจได้ — ไม่ crash ไม่แสดงหน้าว่าง
- **NFR6:** หน้าเดิมทำงานปกติหลัง deploy หน้าใหม่ (zero regression)

### Integration

- **NFR7:** API endpoints ทุกตัวที่หน้าใหม่เรียกต้องเป็น endpoint เดิมของ fe-2-project — ห้ามเปลี่ยน API contract
- **NFR8:** Authorization header format ตรงกับที่ backend ของ fe-2-project expect

### Maintainability

- **NFR9:** แต่ละหน้าแยกเป็น 3 ไฟล์: `.html`, `.js`, `.css` ตาม project pattern
- **NFR10:** ไม่ใช้ bundler, transpiler, หรือ build tool — code run ใน browser ได้โดยตรง
