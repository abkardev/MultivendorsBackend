@echo off
set NODE_ENV=development
set PAYMENT_MODE=test
set MONGODB_URI=mongodb://127.0.0.1:27018/seed_verify2
set PORT=9112
cd /d C:\Users\Abkar\Desktop\MVE\manus\backend_latest
C:\nvm4w\nodejs\node.exe index.js > boot_out.log 2>&1