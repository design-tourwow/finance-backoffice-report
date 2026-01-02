# 🎨 Tour Image Manager - Tourwow

ระบบจัดการรูปภาพทัวร์สำหรับ Tourwow พัฒนาด้วย HTML, CSS และ JavaScript ตาม Best Practices

## 🚀 Quick Start

```bash
# 1. Clone repository
git clone https://github.com/design-tourwow/finance-backoffice-report.git
cd finance-backoffice-report

# 2. ตั้งค่า Git
git config user.name "your-name"
git config user.email "your-email@example.com"

# 3. เริ่มทำงาน
git checkout staging
git pull origin staging
git checkout -b feature/my-feature-myname

# 4. เปิดโปรเจค
open index.html
# หรือใช้ development server
python -m http.server 8080
```

## 📚 เอกสาร

- **[WORKFLOW.md](WORKFLOW.md)** - Workflow การทำงาน 7 ขั้นตอน + การทำงาน 3 คน + Deployment
- **[TROUBLESHOOTING.md](TROUBLESHOOTING.md)** - แก้ปัญหา + FAQ + Pull vs PR
- **[CODEOWNERS.md](CODEOWNERS.md)** - คู่มือ CODEOWNERS และการจัดการสิทธิ์
- **[CHANGELOG.md](CHANGELOG.md)** - ประวัติการเปลี่ยนแปลง

## ✨ คุณสมบัติหลัก

### 🎯 Accessibility (A11Y)
- ✅ ARIA labels และ roles สำหรับ screen readers
- ✅ Keyboard navigation support (Tab, Enter, Space, Escape)
- ✅ Skip to main content link
- ✅ Focus indicators ที่ชัดเจน
- ✅ Semantic HTML5
- ✅ Alt text ที่มีความหมายสำหรับรูปภาพ
- ✅ High contrast mode support
- ✅ Reduced motion support

### 📱 Responsive & Mobile-First
- ✅ Mobile hamburger menu
- ✅ Touch targets ขนาดอย่างน้อย 44x44px
- ✅ Card layout สำหรับ mobile
- ✅ Responsive breakpoints: 768px, 1024px, 1400px

### ⚡ Performance
- ✅ Lazy loading สำหรับรูปภาพ
- ✅ Responsive images (srcset)
- ✅ Font optimization (เลือกเฉพาะ weights ที่ใช้)
- ✅ DNS prefetch
- ✅ Preconnect สำหรับ external resources

### 🎨 UX/UI Improvements
- ✅ Loading states
- ✅ Empty states
- ✅ Error states & validation
- ✅ Form validation แบบ real-time
- ✅ Confirmation dialogs
- ✅ Smooth animations & transitions
- ✅ Pagination
- ✅ Items per page selector

### 🔧 Code Quality
- ✅ Error handling
- ✅ Debounce สำหรับ event handlers
- ✅ IIFE pattern (ป้องกัน global scope pollution)
- ✅ Try-catch blocks
- ✅ Console logging สำหรับ debugging

### 🗓️ Custom Date Range Picker
- ✅ รองรับปีพุทธศักราช (พ.ศ.)
- ✅ แสดงผลเป็นภาษาไทย
- ✅ Dual calendar view
- ✅ Keyboard accessible
- ✅ Range selection with hover preview

## 🛠️ เทคโนโลจีที่ใช้

- HTML5 (Semantic)
- CSS3 (Flexbox, Grid, Custom Properties)
- Vanilla JavaScript (ES6+)
- Google Fonts (Kanit)
- SVG Icons (แทน Font Awesome เพื่อ performance)

## 📁 โครงสร้างไฟล์

```
tour-image-manager/
├── index.html          # หน้าหลัก (Semantic HTML + ARIA)
├── styles.css          # Stylesheet (Mobile-first + A11Y)
├── script.js           # JavaScript (Error handling + Validation)
└── README.md           # เอกสารนี้
```

## 🎯 Workflow สั้นๆ

```
Pull → Branch → Code → Commit → Push → PR → Merge
```

**อ่านเพิ่มเติม:** [WORKFLOW.md](WORKFLOW.md)

## 🛠️ Development

### เปิดโปรเจค

```bash
# เปิดไฟล์โดยตรง
open index.html

# หรือใช้ Development Server (แนะนำ)
python -m http.server 8080
# จากนั้นเปิด http://localhost:8080
```

### Scripts ช่วยเหลือ

```bash
./scripts/check-before-commit.sh  # เช็คก่อน commit
./scripts/safe-push.sh            # Push แบบปลอดภัย
./scripts/who-owns.sh <file>      # เช็คเจ้าของไฟล์
```

## 🎯 คุณสมบัติเด่น

### Form Validation
- Real-time validation พร้อม debounce
- Error messages ที่ชัดเจน
- Focus ไปที่ field แรกที่มี error
- Confirmation dialog เมื่อ reset

### Mobile Menu
- Hamburger menu สำหรับ mobile
- Overlay backdrop
- Smooth slide animation
- Close on escape key

### Pagination
- First, Previous, Next, Last buttons
- Page numbers with ellipsis
- Items per page selector
- Smooth scroll to top

### Loading & Empty States
- Spinner animation
- Empty state with icon
- Error handling
- Graceful fallbacks

## ⌨️ Keyboard Shortcuts

- `Tab` - Navigate between elements
- `Enter/Space` - Activate buttons/links
- `Escape` - Close modals/dropdowns
- `Arrow Keys` - Navigate in calendar

## 🌐 Browser Support

- ✅ Chrome 90+
- ✅ Firefox 88+
- ✅ Safari 14+
- ✅ Edge 90+

## 📱 Tested Devices

- iPhone (Safari)
- Android (Chrome)
- iPad (Safari)
- Desktop (Chrome, Firefox, Safari, Edge)

## 🎨 Design Principles

1. **Mobile-First** - เริ่มออกแบบจาก mobile ก่อน
2. **Accessibility** - ใช้งานได้สำหรับทุกคน
3. **Performance** - โหลดเร็ว ใช้งานลื่น
4. **Progressive Enhancement** - ทำงานได้แม้ JavaScript ปิด
5. **Semantic HTML** - ใช้ HTML tags ที่มีความหมาย

## 🔍 SEO Optimization

- Meta tags (description, keywords, author)
- Open Graph tags
- Semantic HTML structure
- Alt text สำหรับรูปภาพ
- Proper heading hierarchy

## 🖨️ Print Optimization

- ซ่อน UI elements ที่ไม่จำเป็น
- Optimize layout สำหรับการพิมพ์
- Black & white friendly
- Page break optimization

## 📊 Performance Metrics

- First Contentful Paint: < 1.5s
- Time to Interactive: < 3s
- Lighthouse Score: 95+

## 🔐 Security

- No external dependencies (ยกเว้น Google Fonts)
- Input validation
- XSS protection
- CSRF protection ready

## 🔑 API Configuration

### การตั้งค่า API Key

1. ไปที่ [NoCodeBackend.com](https://nocodebackend.com)
2. Login และเลือกโปรเจกต์ `54566_tourwow`
3. ไปที่เมนู **Settings** → **API Keys**
4. Copy API Key ของคุณ
5. แก้ไขไฟล์ `config.js`:

```javascript
const CONFIG = {
  API_BASE_URL: 'https://openapi.nocodebackend.com',
  INSTANCE_ID: '54566_tourwow',
  API_KEY: 'YOUR_ACTUAL_API_KEY_HERE',  // แทนที่ตรงนี้
};
```

⚠️ **อย่าแชร์ API Key กับใครก็ตาม!**

### การตั้งค่า CORS

ถ้าเจอ CORS Error:

1. เข้า NoCodeBackend Dashboard
2. ไปที่ **Settings** → **Secret Keys**
3. หาส่วน **Allowed domains**
4. ใส่ `*` (สำหรับ development) หรือ domain ของคุณ
5. กด **Save**

### โครงสร้างฐานข้อมูล

**Table: images**
```json
{
  "id": 1,
  "file_name": "ภูเขาไฟฟูจิ-1",
  "file_path": "https://...",
  "country_id": 1,
  "updated_at": "2024-11-15T10:30:00Z"
}
```

**Table: tour_images** (ความสัมพันธ์)
```json
{
  "id": 1,
  "tour_id": 10,
  "image_id": 1,
  "usage_type": "banner",  // "banner" หรือ "detail"
  "sequence": 1            // ลำดับที่
}
```

**หมายเหตุ:** UI แสดงข้อมูลที่คำนวณจาก relationships เหล่านี้

## 👥 Team Collaboration

โปรเจคนี้ใช้ระบบ **CODEOWNERS** เพื่อจัดการสิทธิ์การแก้ไขไฟล์:

- ✅ แต่ละคนรับผิดชอบไฟล์ของตัวเอง
- ✅ GitHub auto-assign reviewers อัตโนมัติ
- ✅ ต้องได้รับ approval ก่อน merge
- ✅ ป้องกันการแก้ไฟล์ผิดคน

**อ่านเพิ่มเติม:** [CODEOWNERS.md](CODEOWNERS.md)

## 🐛 Troubleshooting

เจอปัญหา? อ่าน [TROUBLESHOOTING.md](TROUBLESHOOTING.md) สำหรับ:

- Pull Code vs Pull Request
- แก้ปัญหา Sync
- ปัญหาที่พบบ่อย 13 ข้อ
- FAQ

## 📝 License

© 2024 Tourwow. All rights reserved.

## 👨‍💻 Development Team

พัฒนาโดยทีม Vibe Code ตาม Web Accessibility Guidelines (WCAG 2.1) และ Best Practices

---

**Version:** 2.0.0  
**Last Updated:** 2 มกราคม 2026
