# vLLM + FastAPI + Next.js + Tailwind

AI 웹 애플리케이션 프로젝트입니다.

## Project Structure

```
.
├── webapp/
│   ├── backend/          # FastAPI 백엔드
│   │   ├── main.py
│   │   ├── requirements.txt
│   │   └── .env.example
│   ├── frontend/         # Next.js + Tailwind CSS 프론트엔드
│   └── README.md
├── images/               # 학습 이미지 데이터
│   ├── train/
│   └── val/
├── labels/               # 레이블 데이터
│   ├── train/
│   └── val/
├── labels2/              # 추가 레이블 데이터
├── chroma_store/         # ChromaDB 저장소
└── train.ipynb           # 학습 노트북
```

## Installation & Run

**Backend:**
```powershell
cd webapp/backend
python -m pip install -r requirements.txt
python -m uvicorn main:app --reload --host 127.0.0.1 --port 8000
```

**Frontend:**
```powershell
cd webapp/frontend
npm install
npm run dev -- --hostname 127.0.0.1 --port 3000
```

**Access:**
- Frontend: http://127.0.0.1:3000
- Backend: http://127.0.0.1:8000
