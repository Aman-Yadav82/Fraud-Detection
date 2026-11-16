@echo off
echo Starting ML Inference Service (FastAPI on port 8000)...
cd ml-service
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
pause
