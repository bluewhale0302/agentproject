# 🎮 Game Play Assistant

간단하고 빠르게 볼 수 있는 프로젝트 요약입니다.

## 핵심 기능
- AI 텍스트 생성
- 벡터 검색
- Steam 사용자/게임 정보 조회
- Riot Games 소환사/랭크 정보 조회

## 구조
```
archive/
├── webapp/
│   ├── backend/          # FastAPI 백엔드
│   │   ├── main.py
│   │   ├── requirements.txt
│   │   ├── .env.example
│   │   └── ...
│   └── frontend/         # Next.js 프론트엔드
│       ├── app/page.tsx
│       ├── package.json
│       └── ...
└── README.md
```

## 빠른 실행

### 1. 백엔드
```powershell
cd webapp/backend
python -m venv env
env\Scripts\activate
pip install -r requirements.txt
python -m uvicorn main:app --reload --host 127.0.0.1 --port 8000
```

### 2. 프론트엔드
```powershell
cd webapp/frontend
npm install
npm run dev
```

### 접속 주소
- 프론트: `http://127.0.0.1:3000`
- API: `http://127.0.0.1:8000`
- Swagger: `http://127.0.0.1:8000/docs`

## 환경 변수
`webapp/backend/.env`에 기본 설정 추가:
```env
DEFAULT_MODEL=qwen2.5
EMBEDDING_MODEL=all-MiniLM-L6-v2
CHROMA_PERSIST_DIR=./chroma_store
STEAM_API_KEY=
RIOT_API_KEY=
```

- `STEAM_API_KEY`, `RIOT_API_KEY`는 선택 사항
- 키가 없으면 AI 생성 / 벡터 검색은 정상 작동

## 중요 엔드포인트
| 메서드 | 경로 | 설명 |
|-------|------|------|
| POST | `/api/generate` | AI 텍스트 생성 |
| POST | `/api/search` | 벡터 검색 |
| POST | `/api/games/steam/user` | Steam 사용자 정보 |
| POST | `/api/games/steam/games` | Steam 게임 목록 |
| POST | `/api/games/riot/summoner` | Riot 소환사 정보 |
| POST | `/api/games/riot/ranked` | Riot 랭크 정보 |
```

## 요약
- 로컬 Ollama/LLM 기반 AI 생성
- ChromaDB 벡터 검색
- Steam / Riot API 통합
- 빠르게 실행 가능한 Next.js + FastAPI 구조
