# 🎮 게임 플레이 어시스턴트

Steam 계정 정보를 불러오고, AI 고스야와 게임 이야기를 나눌 수 있는 웹 서비스입니다.

**라이브**: [agentproject.vercel.app](https://agentproject.vercel.app)

---

## 주요 기능

- **Steam 계정 조회** — Steam ID로 프로필, 온라인 상태, 게임 라이브러리(플레이타임 순) 확인
- **고스야 AI 채팅** — Steam 정보를 바탕으로 게임 추천, 플레이 분석 등 맞춤형 대화
- **Groq 기반 LLM** — qwen2.5 / llama3 / mixtral 등 무료 고속 모델 사용

---

## 기술 스택

| 영역 | 기술 |
|------|------|
| 프론트엔드 | Next.js 14, React 18, Tailwind CSS, TypeScript |
| 백엔드 | FastAPI, Python 3.12 |
| AI | Groq API (OpenAI 호환, qwen2.5-coder-7b-instruct) |
| 게임 API | Steam Web API |
| 배포 | Vercel |

---

## 프로젝트 구조

```
agentproject/
├── webapp/
│   ├── frontend/          # Next.js 앱
│   │   └── app/
│   │       ├── page.tsx   # 메인 페이지 (Steam 조회 + 고스야 채팅)
│   │       ├── layout.tsx
│   │       └── globals.css
│   └── backend/
│       ├── main.py        # FastAPI 앱 (단일 파일, Vercel 서버리스 호환)
│       ├── requirements.txt
│       └── .env.example
└── vercel.json            # Vercel 배포 설정
```

---

## 로컬 실행

### 사전 준비

- Python 3.12+
- Node.js 18+
- [Groq API 키](https://console.groq.com) (무료)
- [Steam API 키](https://steamcommunity.com/dev/apikey) (무료)

### 백엔드

```bash
cd webapp/backend
python -m venv .venv
.venv\Scripts\activate        # Windows
# source .venv/bin/activate   # macOS/Linux

pip install -r requirements.txt

# .env 파일 생성
copy .env.example .env
# .env에 GROQ_API_KEY, STEAM_API_KEY 입력

uvicorn main:app --reload --host 127.0.0.1 --port 8000
```

### 프론트엔드

```bash
cd webapp/frontend
npm install
npm run dev
```

접속: [http://localhost:3000](http://localhost:3000)  
API 문서: [http://localhost:8000/docs](http://localhost:8000/docs)

---

## 환경변수

`webapp/backend/.env` 파일에 설정합니다.

| 변수 | 설명 | 필수 |
|------|------|------|
| `GROQ_API_KEY` | Groq API 키 ([발급](https://console.groq.com)) | ✅ |
| `STEAM_API_KEY` | Steam Web API 키 ([발급](https://steamcommunity.com/dev/apikey)) | ✅ |
| `DEFAULT_MODEL` | 기본 AI 모델 (기본값: `qwen2.5`) | ❌ |
| `CORS_ORIGINS` | 추가 허용 도메인 (쉼표 구분) | ❌ |

Vercel 배포 시 **Settings → Environment Variables**에 동일하게 추가하세요.

---

## API 엔드포인트

| 메서드 | 경로 | 설명 |
|--------|------|------|
| `GET` | `/` | 헬스체크 |
| `POST` | `/api/generate` | AI 텍스트 생성 (고스야 채팅) |
| `POST` | `/api/games/steam/user` | Steam 프로필 조회 |
| `POST` | `/api/games/steam/games` | Steam 게임 목록 조회 |

---

## Vercel 배포

1. GitHub 저장소를 Vercel에 연결
2. **Settings → Environment Variables**에 `GROQ_API_KEY`, `STEAM_API_KEY` 추가
3. Redeploy
