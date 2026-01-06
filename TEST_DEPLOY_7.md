# 🧪 Test Deploy Round 7

ทดสอบ workflow ครั้งที่ 7 - ทดสอบ [deploy] tag script

**วันที่:** 5 มกราคม 2026  
**เวลา:** 23:00 น.

## ✅ New Script with [deploy] tag

```bash
if [ "$VERCEL_GIT_COMMIT_REF" == "main" ] && [[ "$VERCEL_GIT_COMMIT_MESSAGE" != *"[deploy]"* ]]; then 
  exit 0
else 
  exit 1
fi
```

## 🎯 คาดหวัง

- Push staging → Auto-build + Auto-deploy ✅
- Push main (ไม่มี [deploy]) → ไม่ auto-deploy ❌
- Push main (มี [deploy]) → Auto-deploy ✅
- Manual deploy → Build ได้ ✅

## 🎉 Script นี้ควรทำงาน!

---

**Test by:** GAP + Kiro  
**Smart script with deploy tag!**
