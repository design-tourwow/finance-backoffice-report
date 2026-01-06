# 🚀 Deployment Workflow - Finance Backoffice Report

## 📋 สรุป Workflow

### 🔵 Staging (Auto-Deploy)
- **Branch:** `staging`
- **URL:** https://finance-backoffice-report-git-staging-tourwows-projects.vercel.app
- **การ Deploy:** Auto-deploy ทุกครั้งที่ push

### 🟢 Production (Manual Deploy Only)
- **Branch:** `main`
- **URL:** https://finance-backoffice-report-tourwows-projects.vercel.app
- **การ Deploy:** Manual deploy ด้วย `vercel --prod` เท่านั้น

---

## 📝 ขั้นตอนการทำงานปกติ

### 1️⃣ พัฒนาและทดสอบบน Staging

```bash
# แก้ไขโค้ดตามต้องการ
git add .
git commit -m "feat: add new feature"

# Push ไป staging
git checkout staging
git merge main
git push origin staging
```

**ผลลัพธ์:** Vercel จะ auto-deploy ไปที่ staging ทันที ✅

---

### 2️⃣ Merge ไป Main (ไม่ Deploy)

```bash
# กลับไปที่ main
git checkout main

# Push main (จะไม่ deploy เลย)
git push origin main
```

**ผลลัพธ์:** Git อัปเดต แต่ Vercel ไม่ deploy เลย ❌

---

### 3️⃣ Deploy Production (Manual เท่านั้น)

```bash
# ตรวจสอบว่าอยู่ที่ main branch
git checkout main

# Deploy ด้วย Vercel CLI (Build + Deploy ทันที)
vercel --prod
```

**ผลลัพธ์:** 
- Vercel จะ Build โค้ดจากเครื่องคุณ
- Deploy ไป production ทันที 🚀

---

## ⚙️ การตั้งค่าที่สำคัญ

### 1. Vercel Production Branch Settings
- **ตั้งค่าใน:** Vercel Dashboard > Settings > Git > Production Branch
- **เลือก:** ✅ **Only build pre-production** (ไม่ build production อัตโนมัติ)
- **ผลลัพธ์:** Push ไป main จะไม่ trigger build/deploy เลย

### 2. Vercel CLI Configuration
- **ติดตั้ง:** `npm i -g vercel`
- **Login:** `vercel login` (ใช้บัญชีที่มี access Tourwow's projects)
- **Link Project:** `vercel link`
  - เลือก scope: **Tourwow's projects**
  - เลือกโปรเจค: **finance-backoffice-report**
- **Config File:** `.vercel/project.json`

```json
{
  "projectId": "prj_lclFvQ7OQdxl0y4sVSZ4yZGSI702",
  "orgId": "team_Omd0c3mPKkYe2ic0kQFljCQB"
}
```

---

## 🎯 สรุปการทำงาน

| Action | Staging | Production |
|--------|---------|------------|
| Push to staging | ✅ Auto-deploy | - |
| Push to main | - | ❌ ไม่ deploy |
| `vercel --prod` | - | ✅ Manual build + deploy |

---

## 💡 ข้อดีของ Workflow นี้

✅ **ปลอดภัย:** Production ไม่มีทาง deploy โดยไม่ตั้งใจ  
✅ **ควบคุมได้:** Deploy production เมื่อพร้อมเท่านั้น  
✅ **ง่าย:** ไม่ต้องจัดการ script หรือ commit message พิเศษ  
✅ **รวดเร็ว:** `vercel --prod` build + deploy ในคำสั่งเดียว

---

## �  Troubleshooting

### ปัญหา: vercel --prod ไปผิดโปรเจค
```bash
# ลบ config เก่า
rm -rf .vercel

# Link ใหม่
vercel link
# เลือก: Tourwow's projects > finance-backoffice-report
```

### ปัญหา: Staging ไม่ auto-deploy
- เช็คว่า Vercel Dashboard เชื่อม GitHub repo ถูกต้อง
- เช็คว่า staging branch ไม่ได้ถูกตั้งเป็น production branch

### ปัญหา: vercel --prod ช้า
- ปกติครับ เพราะต้อง upload + build + deploy
- ใช้เวลาประมาณ 30-60 วินาที

### ปัญหา: vercel teams ไม่เห็น Tourwow's projects
```bash
# Logout แล้ว login ใหม่
vercel logout
vercel login
# เลือกบัญชีที่มี access Tourwow's projects
```

---

**อัปเดตล่าสุด:** 7 มกราคม 2026  
**โดย:** GAP + Kiro
