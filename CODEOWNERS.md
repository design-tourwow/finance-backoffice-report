# 🛡️ CODEOWNERS Guide

## 📋 สารบัญ

1. [CODEOWNERS คืออะไร](#codeowners-คืออะไร)
2. [วิธีการทำงาน](#วิธีการทำงาน)
3. [ตั้งค่า CODEOWNERS](#ตั้งค่า-codeowners)
4. [การใช้งาน](#การใช้งาน)
5. [เครื่องมือช่วย](#เครื่องมือช่วย)

---

## 🎯 CODEOWNERS คืออะไร

**CODEOWNERS** คือระบบที่กำหนดว่า**ใครเป็นเจ้าของไฟล์ไหน**

### ทำไมต้องมี CODEOWNERS?

**ปัญหาที่เคยเจอ:**
```
❌ John แก้ไฟล์ของ Jane โดยไม่ตั้งใจ
❌ AI แก้ไฟล์ที่ไม่ควรแก้
❌ ไม่รู้ว่าต้องถามใคร
❌ Code ถูกแก้โดยไม่มีการ review
```

**หลังมี CODEOWNERS:**
```
✅ GitHub รู้ว่าไฟล์ไหนใครเป็นเจ้าของ
✅ Auto-assign reviewer อัตโนมัติ
✅ ต้องได้รับ approval จากเจ้าของไฟล์
✅ ป้องกันการแก้ไฟล์ผิดคน
```

---

## 🔄 วิธีการทำงาน

### ขั้นตอนที่ 1: กำหนดเจ้าของไฟล์

```
# ไฟล์: .github/CODEOWNERS

# Default owner (ทุกไฟล์)
* @team-lead

# Tour Image Manager
tour-image-manager*.* @gapntt
tour-image-manager-api.js @gapntt

# Payment Module
modules/payment/ @john

# Inventory Module
modules/inventory/ @jane

# Shared Code (ต้อง approve จาก team lead)
shared/ @team-lead
auth.html @team-lead
```

### ขั้นตอนที่ 2: สร้าง Pull Request

```
1. คุณแก้ไฟล์ tour-image-manager.js
2. Push และสร้าง PR
3. GitHub เห็นว่าคุณแก้ tour-image-manager.js
4. GitHub เช็ค CODEOWNERS
5. GitHub เห็นว่า @gapntt เป็นเจ้าของ
6. GitHub auto-assign @gapntt เป็น reviewer
```

### ขั้นตอนที่ 3: Review & Approve

```
1. @gapntt ได้รับ notification
2. @gapntt review code
3. @gapntt approve (หรือ request changes)
4. เมื่อได้ approval → สามารถ merge ได้
```

---

## 🔧 ตั้งค่า CODEOWNERS

### 1. สร้างไฟล์ CODEOWNERS

```bash
# สร้างไฟล์
touch .github/CODEOWNERS
```

### 2. กำหนดเจ้าของไฟล์

```
# .github/CODEOWNERS

# Default owner (ทุกไฟล์ที่ไม่ระบุ)
* @team-lead

# Tour Image Manager
tour-image-manager*.* @gapntt
tour-image-manager-api.js @gapntt

# Payment Module
modules/payment/ @john
modules/payment/*.js @john
modules/payment/*.html @john

# Inventory Module
modules/inventory/ @jane

# Analytics Module
modules/analytics/ @bob

# Shared Code (ต้อง approve จาก team lead)
shared/ @team-lead
auth.html @team-lead

# Configuration Files
*.json @team-lead
vercel.json @team-lead
package.json @team-lead

# Documentation
*.md @team-lead
README.md @team-lead

# Scripts
scripts/ @team-lead
```

### 3. ตั้งค่า Branch Protection

```
GitHub → Settings → Branches → Add rule

Branch name pattern: staging

☑️ Require a pull request before merging
☑️ Require approvals: 1
☑️ Require review from Code Owners
☑️ Dismiss stale pull request approvals when new commits are pushed
☑️ Require branches to be up to date before merging
☑️ Include administrators
```

---

## 📖 Syntax ของ CODEOWNERS

### Pattern Matching

```
# ไฟล์เดียว
tour-image-manager.js @gapntt

# ทุกไฟล์ที่ขึ้นต้นด้วย
tour-image-manager*.* @gapntt

# ทุกไฟล์ใน folder
modules/payment/ @john

# ทุกไฟล์ .js ใน folder
modules/payment/*.js @john

# ทุกไฟล์ .js ใน repo
*.js @team-lead

# ทุกไฟล์
* @team-lead
```

### Multiple Owners

```
# หลายคนเป็นเจ้าของร่วมกัน
shared/ @team-lead @senior-dev

# ต้องได้ approval จากทุกคน
```

### Comments

```
# นี่คือ comment
# ใช้ # ข้างหน้า

# Tour Image Manager
tour-image-manager*.* @gapntt
```

---

## 🚀 การใช้งาน

### สถานการณ์ที่ 1: แก้ไฟล์ของตัวเอง

```
คุณ: แก้ tour-image-manager.js
GitHub: เห็นว่าคุณเป็นเจ้าของ
GitHub: Auto-assign คุณเป็น reviewer
ผลลัพธ์: ✅ คุณ approve เอง → merge ได้
```

### สถานการณ์ที่ 2: แก้ไฟล์ของคนอื่น

```
คุณ: แก้ modules/payment/payment.js (ของ John)
GitHub: เห็นว่า John เป็นเจ้าของ
GitHub: Auto-assign John เป็น reviewer
ผลลัพธ์: ⏳ รอ John approve → ถึงจะ merge ได้
```

### สถานการณ์ที่ 3: แก้หลายไฟล์

```
คุณ: แก้ tour-image-manager.js (ของคุณ)
     + modules/payment/payment.js (ของ John)
     + shared/utils.js (ของ Team Lead)

GitHub: Auto-assign reviewers:
        - @gapntt (คุณ)
        - @john
        - @team-lead

ผลลัพธ์: ⏳ รอทุกคน approve → ถึงจะ merge ได้
```

### สถานการณ์ที่ 4: แก้ Shared Code

```
คุณ: แก้ shared/auth.js
GitHub: เห็นว่า Team Lead เป็นเจ้าของ
GitHub: Auto-assign Team Lead
ผลลัพธ์: 🚨 ต้องรอ Team Lead approve (ระวังมาก!)
```

---

## 🔍 เครื่องมือช่วย

### 1. เช็คว่าไฟล์ใครเป็นเจ้าของ

```bash
# เช็คไฟล์เดียว
./scripts/who-owns.sh tour-image-manager.js

# Output:
# tour-image-manager.js is owned by: @gapntt
```

### 2. เช็คก่อน Commit

```bash
# เช็คว่าแก้ไฟล์ของใครบ้าง
git add .
./scripts/check-before-commit.sh

# Output:
# ✅ Your files: 2
# ❌ Other's files: 1
# ⚠️  WARNING: You're modifying files owned by others!
```

### 3. ดู CODEOWNERS แบบ Visual

```bash
# เปิด web viewer
open codeowners-viewer.html
```

### 4. เช็คสิทธิ์ทั้งหมด

```bash
# ดูว่าใครเป็นเจ้าของไฟล์อะไรบ้าง
./scripts/check-ownership.sh
```

---

## 📋 Best Practices

### 1. กำหนดเจ้าของชัดเจน

```
✅ ดี: แต่ละคนรับผิดชอบไฟล์ต่างกัน
❌ ไม่ดี: หลายคนเป็นเจ้าของไฟล์เดียวกัน
```

### 2. Shared Code ต้องระวัง

```
✅ ดี: Team Lead เป็นเจ้าของ Shared Code
✅ ดี: ต้องแจ้งก่อนแก้
❌ ไม่ดี: ทุกคนแก้ได้
```

### 3. ใช้ Script ตรวจสอบ

```bash
# ก่อน commit ทุกครั้ง
./scripts/check-before-commit.sh
```

### 4. ประสานก่อนแก้ไฟล์คนอื่น

```
ถ้าต้องแก้ไฟล์ของคนอื่น:
1. แจ้งเจ้าของไฟล์ก่อน
2. อธิบายเหตุผล
3. รอ approval
4. ค่อยแก้
```

### 5. อัพเดท CODEOWNERS เมื่อมีคนใหม่

```bash
# เพิ่มคนใหม่เข้า CODEOWNERS
# แก้ไฟล์ .github/CODEOWNERS
```

---

## 🛡️ ระบบป้องกัน

### Layer 1: Script Warning

```bash
./scripts/check-before-commit.sh
→ เตือนก่อน commit
```

### Layer 2: CODEOWNERS

```
.github/CODEOWNERS
→ Auto-assign reviewers
→ ต้อง approve ก่อน merge
```

### Layer 3: Branch Protection

```
GitHub Settings
→ Require PR
→ Require review from Code Owners
→ Require branches to be up to date
```

---

## 📊 ตัวอย่าง CODEOWNERS

### ตัวอย่างที่ 1: โปรเจคเล็ก

```
# Default
* @team-lead

# Modules
tour-image-manager*.* @gapntt
modules/payment/ @john
modules/inventory/ @jane

# Shared
shared/ @team-lead
auth.html @team-lead
```

### ตัวอย่างที่ 2: โปรเจคใหญ่

```
# Default
* @team-lead

# Frontend
src/components/ @frontend-team
src/pages/ @frontend-team
*.css @frontend-team
*.html @frontend-team

# Backend
src/api/ @backend-team
src/services/ @backend-team
*.js @backend-team

# Database
src/models/ @database-team
migrations/ @database-team

# DevOps
.github/ @devops-team
vercel.json @devops-team
package.json @devops-team

# Documentation
*.md @tech-writer
README.md @team-lead

# Shared Code
shared/ @team-lead @senior-dev
```

---

## ❓ FAQ

### Q: ถ้าไม่มี CODEOWNERS จะเกิดอะไรขึ้น?

**A:** ทุกคนแก้ไฟล์ได้หมด ไม่มีการ review

```
❌ ไม่มีการป้องกัน
❌ ไม่มี auto-assign reviewer
❌ แก้ไฟล์คนอื่นได้โดยไม่ต้องถาม
```

---

### Q: ถ้าแก้ไฟล์ของตัวเองต้อง review ไหม?

**A:** ขึ้นอยู่กับ Branch Protection

```
ถ้าตั้ง "Require approvals: 1"
→ ต้อง review (แม้แต่ไฟล์ของตัวเอง)

ถ้าตั้ง "Require review from Code Owners"
→ ไม่ต้อง review (ถ้าคุณเป็นเจ้าของ)
```

---

### Q: ถ้าเจ้าของไฟล์ไม่ approve จะทำยังไง?

**A:** ไม่สามารถ merge ได้

```
⏳ รอ approval
💬 ถามเจ้าของไฟล์
🔄 แก้ไขตามที่ขอ
```

---

### Q: ถ้าเจ้าของไฟล์ลาหรือไม่อยู่?

**A:** มี 2 ทางเลือก

```
1. รอให้กลับมา
2. ให้ Team Lead approve แทน
```

---

### Q: ถ้าต้องแก้ไฟล์หลายคน?

**A:** ต้องได้ approval จากทุกคน

```
แก้ไฟล์ 3 คน
→ ต้องได้ approval จาก 3 คน
→ ถึงจะ merge ได้
```

---

### Q: วิธีเพิ่มคนใหม่เข้า CODEOWNERS?

**A:** แก้ไฟล์ .github/CODEOWNERS

```bash
# 1. แก้ไฟล์
vi .github/CODEOWNERS

# 2. เพิ่มคนใหม่
modules/analytics/ @new-person

# 3. Commit และ push
git add .github/CODEOWNERS
git commit -m "docs: add new code owner"
git push origin staging
```

---

### Q: CODEOWNERS ใช้ได้กับ GitHub เท่านั้นหรือ?

**A:** ใช่ เป็น feature ของ GitHub

```
✅ GitHub: ใช้ได้
❌ GitLab: ใช้ไม่ได้ (ใช้ CODEOWNERS ของ GitLab แทน)
❌ Bitbucket: ใช้ไม่ได้
```

---

## 📞 ติดต่อ & ช่วยเหลือ

**ต้องการความช่วยเหลือ:**
- อ่าน CODEOWNERS.md (ไฟล์นี้)
- ใช้ `./scripts/who-owns.sh`
- ถาม team lead

**ต้องการแก้ไข CODEOWNERS:**
- แจ้ง team lead
- สร้าง PR แก้ไฟล์ .github/CODEOWNERS

---

**สร้างโดย:** Vibe Code Team  
**อัพเดทล่าสุด:** 2 มกราคม 2026  
**เวอร์ชัน:** 2.0
