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

### Growth (Phase 2)

- Retire fe-2-project เมื่อ Gap พร้อม
- Refactor shared utilities ให้ใช้ร่วมกันระหว่างหน้าใหม่และหน้าเดิม

### Vision (Phase 3)

- Finance Backoffice Report เป็น single consolidated reporting platform สำหรับ Tourwow ทั้งหมด

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
