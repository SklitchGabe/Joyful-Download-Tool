@echo off
start "Flask Backend" cmd /k "py -3 backend/app.py"
start "Vite Frontend" cmd /k "cd frontend && npm run dev"
