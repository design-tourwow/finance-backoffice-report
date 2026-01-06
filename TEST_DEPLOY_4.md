# 🧪 Test Deploy Round 4

ทดสอบ workflow ครั้งที่ 4 - ทดสอบ script ใหม่

**วันที่:** 5 มกราคม 2026  
**เวลา:** 22:35 น.

## ✅ Script ใหม่

```bash
if [ "$VERCEL_GIT_COMMIT_REF" != "main" ]; then exit 1; fi
```

## 🎯 คาดหวัง

- Push staging → Auto-deploy ✅
- Push main → ไม่ auto-deploy ❌
- Manual deploy main → Build ได้ ✅

---

**Test by:** GAP + Kiro
