# 🧪 Test Deploy Round 6

ทดสอบ workflow ครั้งที่ 6 - ทดสอบ Gemini script

**วันที่:** 5 มกราคม 2026  
**เวลา:** 22:50 น.

## ✅ Gemini Script

```bash
if [ "$VERCEL_GIT_COMMIT_REF" == "main" ]; then exit 0; else exit 1; fi
```

## 🎯 คาดหวัง

- Push staging → Auto-build + Auto-deploy ✅
- Push main → ไม่ auto-deploy ❌
- Manual deploy main → Build ได้ ✅

## 🤞 ขอให้ทำงาน!

---

**Test by:** GAP + Kiro + Gemini  
**Script from:** Gemini AI
