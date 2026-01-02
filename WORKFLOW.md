# 🚀 Vibe Code Workflow Guide

## 📋 สารบัญ

1. [Workflow หลัก 7 ขั้นตอน](#workflow-หลัก-7-ขั้นตอน)
2. [การทำงาน 3 คนพร้อมกัน](#การทำงาน-3-คนพร้อมกัน)
3. [Deployment Workflow](#deployment-workflow)
4. [กรณีพิเศษ](#กรณีพิเศษ)
5. [Quick Reference](#quick-reference)

---

## 🎯 Workflow หลัก 7 ขั้นตอน

```
Pull → Branch → Code → Commit → Push → PR → Merge
```

### STEP 1: Pull Code ล่าสุด

```bash
git checkout staging
git pull origin staging
```

**ทำไมต้อง pull?**
- ได้ code ล่าสุดที่คนอื่นทำไว้
- ป้องกัน conflict

---

### STEP 2: สร้าง Branch

```bash
git checkout -b feature/[module]-[description]-[name]
```

**ตัวอย่าง:**
```bash
git checkout -b feature/payment-add-credit-card-john
git checkout -b feature/inventory-fix-search-jane
git checkout -b feature/tour-manager-upload-gap
```

**ตั้งชื่อให้ดี:**
- ระบุ module
- ระบุว่าทำอะไร
- ระบุชื่อคนทำ

---

### STEP 3: แก้ไขโค้ด

```bash
# แก้ไฟล์ที่ต้องการ
# ทดสอบว่าทำงานได้
```

**⚠️ ข้อควรระวัง:**

#### กรณีปกติ: แก้ไฟล์ของตัวเอง
```
✅ แก้ได้เลย
✅ ไม่ต้องถามใคร
```

#### กรณีพิเศษ 1: แก้ไฟล์ของคนอื่น
```
⚠️ ประสานกับเจ้าของไฟล์ก่อน
"John, ผมต้องแก้ payment.js ของคุณหน่อย เพราะ..."
```

#### กรณีพิเศษ 2: แก้ไฟล์ที่ทุกคนใช้ร่วมกัน
```
🚨 ประสานกับทีมก่อน!
"ทีม, ผมต้องแก้ auth.html เพราะ..."

ต้องทำ:
1. แจ้งทีมก่อน
2. ทดสอบให้ดี
3. แจ้งเตือนหลังแก้เสร็จ
```

---

### STEP 4: Commit

```bash
# ดูว่าแก้อะไรบ้าง
git status
git diff

# Commit
git add .
git commit -m "feat: add credit card payment"
```

**Commit Message ที่ดี:**
```bash
✅ "feat: add credit card payment"
✅ "fix: resolve upload error"
✅ "refactor: improve search performance"

❌ "update"
❌ "fix"
❌ "test"
```

---

### STEP 5: Push

```bash
# Pull staging อีกครั้ง (ป้องกัน conflict)
git checkout staging
git pull origin staging

# Merge เข้า branch ของตัวเอง
git checkout feature/my-feature
git merge staging

# Push
git push origin feature/my-feature
```

**ทำไมต้อง pull อีกครั้ง?**
- คนอื่นอาจ merge งานไปแล้วระหว่างที่คุณทำงาน
- ป้องกัน code ไม่ sync

**💡 ใช้ Script ช่วย (Optional):**
```bash
./scripts/safe-push.sh
```

---

### STEP 6: สร้าง Pull Request

**ไป GitHub:**
1. เห็นปุ่ม "Compare & pull request" → คลิก
2. กรอกข้อมูล:

```markdown
Title: feat: add credit card payment

Description:
## What changed?
- เพิ่ม credit card payment
- เพิ่ม form สำหรับกรอกข้อมูลบัตร

## Files modified:
- modules/payment/payment.js
- modules/payment/payment.html

## Testing:
- ทดสอบบน local แล้ว
- Payment ทำงานได้ปกติ
```

3. Create pull request

**GitHub จะ:**
- ✅ Auto-assign reviewers ตาม CODEOWNERS
- ✅ ส่ง notification ให้เจ้าของไฟล์
- ✅ เช็คว่า branch up-to-date หรือไม่

---

### STEP 7: Merge

**รอ Review:**
- Code owner จะ review
- อาจมี comment หรือขอแก้ไข
- ถ้าต้องแก้ → แก้แล้ว commit + push อีกครั้ง (PR จะอัพเดทอัตโนมัติ)

**เมื่อได้ Approval:**
- คลิก "Merge pull request"
- คลิก "Confirm merge"
- เสร็จแล้ว!

**หลัง Merge:**
```bash
# Pull code ล่าสุด
git checkout staging
git pull origin staging

# ลบ branch เก่า
git branch -d feature/my-feature

# พร้อมเริ่มงานใหม่
```

---

## 👥 การทำงาน 3 คนพร้อมกัน

### สมาชิกในทีม

```
├─ GAP    → Report A (report-a.js)
├─ Por    → Report B (report-b.js)
└─ Cherry → Report C (report-c.js)
```

### Timeline การทำงาน

```
09:00 - ทั้ง 3 คน Pull Staging พร้อมกัน
        → ทุกคนได้ code เวอร์ชันเดียวกัน (v1.0)

09:05 - แต่ละคนสร้าง Branch ของตัวเอง
        ├─ GAP:    git checkout -b feature/gap-report-a
        ├─ Por:    git checkout -b feature/por-report-b
        └─ Cherry: git checkout -b feature/cherry-report-c
        → แยกห้องทำงานกัน

09:10 - เริ่มเขียนโค้ดพร้อมกัน
        ├─ GAP:    แก้ report-a.js
        ├─ Por:    แก้ report-b.js
        └─ Cherry: แก้ report-c.js
        → ทำงานพร้อมกัน ไม่รบกวนกัน ✅

10:00 - GAP เสร็จก่อน
        GAP: Commit → Push → PR → Merge ✅
        → Staging ตอนนี้ v1.1 (มี Report A)

10:30 - Por เสร็จ
        Por: Pull Staging (ดึงงาน GAP มา) → Merge → Push → PR → Merge ✅
        → Staging ตอนนี้ v1.2 (มี Report A + B)

11:00 - Cherry เสร็จ
        Cherry: Pull Staging (ดึงงาน GAP + Por มา) → Merge → Push → PR → Merge ✅
        → Staging ตอนนี้ v1.3 (มี Report A + B + C)
```

### จุดเด่น

- ✅ ทำงานพร้อมกันได้โดยไม่รบกวนกัน
- ✅ แยกงานชัดเจน ลดโอกาส Conflict
- ✅ มี Code Review ป้องกันโค้ดผิดพลาด
- ✅ ปลอดภัย มี Branch Protection
- ✅ ง่ายต่อการ Rollback

---

## 🚀 Deployment Workflow

### Staging (Auto Deploy)

```
1. Merge PR เข้า staging
   → Vercel auto-deploy ทันที ✅

2. ทดสอบที่ Staging
   → https://staging.yourapp.com

3. ถ้า OK → ไป Step Production
   ถ้าพัง → แก้ไข → Push staging อีกครั้ง
```

### Production (Manual Deploy)

```
1. Merge staging → main
   git checkout main
   git merge staging
   git push origin main

2. สร้าง Version Tag (Backup)
   git tag -a v1.1.0 -m "Release v1.1.0"
   git push origin v1.1.0

3. Deploy Production (Manual)
   - เข้า Vercel Dashboard
   - Deployments → หา deployment ล่าสุดจาก staging
   - คลิก "Promote to Production"
   → Production deploy ✅
```

### Deployment Flow

```
Developer → Branch → PR → Merge to Staging
                              ↓
                    Vercel Auto Deploy (Staging)
                              ↓
                    ทดสอบบน Staging ✅
                              ↓
                    Merge Staging → Main
                              ↓
                    Vercel Manual Deploy (Production)
                              ↓
                    ตรวจสอบ Production ✅
```

---

## 🔥 กรณีพิเศษ

### Hotfix (Production มี Bug ด่วน)

```bash
# 1. สร้าง hotfix branch จาก main
git checkout main
git pull origin main
git checkout -b hotfix/critical-bug

# 2. แก้ bug
# ...

# 3. Push
git push origin hotfix/critical-bug

# 4. PR → main (ไม่ใช่ staging!)
# 5. Merge → Deploy production

# 6. Merge hotfix กลับไป staging
git checkout staging
git merge hotfix/critical-bug
git push origin staging
```

### Conflict Resolution

```bash
# เจอ conflict
$ git push origin feature/my-branch
# Error: Conflict detected!

# 1. Pull staging ล่าสุด
git checkout staging
git pull origin staging

# 2. Merge เข้า branch ของตัวเอง
git checkout feature/my-branch
git merge staging
# Conflict in: shared/utils.js

# 3. เปิดไฟล์ → เลือกว่าจะเอาโค้ดของใคร
<<<<<<< HEAD
// โค้ดของคุณ
=======
// โค้ดของคนอื่น
>>>>>>> staging

# 4. แก้ไขให้เหลือโค้ดที่ต้องการ
# 5. Commit อีกครั้ง
git add shared/utils.js
git commit -m "resolve: merge conflict"

# 6. Push ใหม่
git push origin feature/my-branch
```

---

## 📝 Quick Reference

### คำสั่งที่ใช้บ่อย

```bash
# เริ่มงานใหม่
git checkout staging
git pull origin staging
git checkout -b feature/my-feature-myname

# ทำงาน
git status                              # ดูว่าแก้อะไร
git diff                                # ดูรายละเอียด
git add .                               # เพิ่มไฟล์
./scripts/check-before-commit.sh        # ตรวจสอบ
git commit -m "feat: add feature"       # commit
git push origin feature/my-feature      # push

# เสร็จงาน (หลัง merge แล้ว)
git checkout staging
git pull origin staging
git branch -d feature/my-feature
```

### กฎทอง 5 ข้อ

```
1. Pull ก่อนเริ่มงานเสมอ
2. Pull ก่อน Push เสมอ
3. แก้ไฟล์คนอื่น → ประสานก่อน
4. แก้ไฟล์ที่ทุกคนใช้ → แจ้งทีมก่อน
5. ใช้ PR เสมอ (ห้าม push ตรง)
```

### Checklist

**ก่อนเริ่มงาน:**
```
☐ Pull code ล่าสุด
☐ สร้าง branch ใหม่
```

**ขณะทำงาน:**
```
☐ แก้เฉพาะไฟล์ที่ควรแก้
☐ ถ้าแก้ไฟล์คนอื่น → ประสาน
☐ ถ้าแก้ shared code → แจ้งทีม
```

**ก่อน Push:**
```
☐ git status (ดูว่าแก้อะไร)
☐ Pull staging อีกครั้ง
☐ Merge staging
☐ Test ว่าทำงานได้
```

**สร้าง PR:**
```
☐ Title ชัดเจน
☐ Description ครบถ้วน
☐ Create pull request
```

**หลัง Merge:**
```
☐ Pull staging ล่าสุด
☐ ลบ branch เก่า
```

---

## 🛡️ ระบบป้องกัน (ทำงานอัตโนมัติ)

### CODEOWNERS
```
ถ้าคุณแก้ไฟล์ของคนอื่น:
→ GitHub จะ auto-assign เจ้าของไฟล์เป็น reviewer
→ ต้องรอเจ้าของไฟล์ approve
→ ไม่สามารถ merge ได้จนกว่าจะได้รับ approval
```

### Branch Protection
```
ห้าม push ตรงเข้า staging:
→ ต้องสร้าง PR เสมอ
→ ต้องผ่าน review
→ ต้อง up-to-date กับ staging
```

### Auto-assign Reviewers
```
สร้าง PR แล้ว GitHub จะ:
→ ดูว่าแก้ไฟล์อะไรบ้าง
→ เช็ค CODEOWNERS
→ Auto-assign เจ้าของไฟล์
→ ส่ง notification
```

---

## 🔧 เครื่องมือช่วย (Optional)

### Scripts

```bash
./scripts/check-before-commit.sh  # เช็คก่อน commit
./scripts/safe-push.sh            # Push แบบปลอดภัย
./scripts/who-owns.sh             # เช็คเจ้าของไฟล์
```

### Web Tools

```bash
open codeowners-viewer.html       # ดู CODEOWNERS แบบ visual
open team-workflow-diagram.html   # ดู workflow แบบ visual
```

---

## 💡 Tips

### 1. Commit บ่อยๆ
```
ดีกว่า commit ครั้งเดียวใหญ่ๆ
```

### 2. Push ทุกวัน
```
เป็น backup ถ้าเครื่องพัง
```

### 3. ตั้งชื่อ Branch ให้ดี
```
✅ feature/payment-add-credit-card-john
❌ my-branch
```

### 4. อย่ากลัวที่จะถาม
```
ไม่แน่ใจ → ถาม
เจอปัญหา → ถาม
```

---

## 👥 ตัวอย่าง: การทำงาน 3 คนพร้อมกัน

### Timeline การทำงานจริง

**เช้า (09:00)**
```
GAP, Por, Cherry ทั้ง 3 คน:
1. Pull staging พร้อมกัน → ได้ code เวอร์ชันเดียวกัน
2. สร้าง branch แยกกัน:
   - GAP:    feature/gap-report-a
   - Por:    feature/por-report-b
   - Cherry: feature/cherry-report-c
3. เริ่มเขียนโค้ดพร้อมกัน (ไม่รบกวนกัน)
```

**สาย (10:00-11:00)**
```
10:00 - GAP เสร็จก่อน
        → Commit → Push → PR → Merge
        → Staging มี Report A แล้ว

10:30 - Por เสร็จ
        → Pull staging (ดึงงาน GAP มา)
        → Merge → Push → PR → Merge
        → Staging มี Report A + B แล้ว

11:00 - Cherry เสร็จ
        → Pull staging (ดึงงาน GAP + Por มา)
        → Merge → Push → PR → Merge
        → Staging มีงานครบทั้ง 3 Report!
```

**ผลลัพธ์:**
- ✅ ทำงานพร้อมกันได้โดยไม่รบกวนกัน
- ✅ ไม่มี Conflict (แต่ละคนแก้ไฟล์ต่างกัน)
- ✅ ประหยัดเวลา (ไม่ต้องรอกัน)

---

**สร้างโดย:** Vibe Code Team  
**อัพเดทล่าสุด:** 2 มกราคม 2026  
**เวอร์ชัน:** 2.1
