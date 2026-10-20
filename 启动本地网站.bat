@echo off
chcp 65001 >nul
title kuizFit - 本地网站
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo 未找到 Node.js，请先安装 Node.js 后重试。
  pause
  exit /b 1
)
node scripts/start-local.mjs
if errorlevel 1 (
  echo.
  echo 启动失败，请查看上方提示。若端口已被占用，请先关闭之前的启动窗口。
  pause
)
