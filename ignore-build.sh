#!/bin/bash

# เช็คว่าเป็น branch main ไหม
if [ "$VERCEL_GIT_COMMIT_REF" == "main" ]; then
  # ถ้าเป็น main ให้เช็คคำว่า [deploy] ในข้อความไหม
  if [[ "$VERCEL_GIT_COMMIT_MESSAGE" == *"[deploy]"* ]]; then
    # ถ้ามี [deploy] -> สั่ง exit 1 (เพื่อให้ Build ได้เลย)
    exit 1
  else
    # ถ้าไม่มี [deploy] -> สั่ง exit 0 (เพื่อ Ignore/Cancel)
    exit 0
  fi
fi

# ถ้าไม่ใช่ main (เช่น staging) -> สั่ง exit 1 (Build ตามปกติ)
exit 1
