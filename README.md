# 🎮 Game Play Assistant - 게임 플레이 어시스턴트

AI 기반 게임 정보 분석 및 추천 시스템입니다. Ollama 로컬 모델(Qwen2.5, Llama3, Llama3.2)을 활용하여 텍스트 생성, 벡터 검색, 그리고 Steam/Riot Games API 통합을 제공합니다.

## 📋 목차

- [기능](#-기능)
- [프로젝트 구조](#-프로젝트-구조)
- [설치 및 실행](#-설치-및-실행)
- [API 키 설정](#-api-키-설정)
- [사용 방법](#-사용-방법)
- [기술 스택](#-기술-스택)

---

## 🎮 기능

### 1. **AI 텍스트 생성**
- ✅ Ollama를 통한 로컬 LLM 모델 실행 (Qwen2.5, Llama3, Llama3.2)
- ✅ 게임 플레이 분석, 전략 수립, 추천 제공
- ✅ UTF-8 인코딩 처리로 Windows 환경 최적화

### 2. **벡터 검색**
- ✅ ChromaDB 기반 문서 저장 및 검색
- ✅ Sentence-Transformers 임베딩
- ✅ 유사도 기반 패치노트, 공략 정보 조회

### 3. **Steam 정보 조회**
- ✅ Steam 사용자 프로필 정보 조회
- ✅ 게임 라이브러리 및 플레이 통계
- ⚠️ API 키 필수 (설정 가능)

### 4. **Riot Games 정보 조회**
- ✅ League of Legends 소환사 정보 조회
- ✅ 랭크 정보 및 전적 통계
- ✅ 멀티 리전 지원 (NA, EU, KR 등)
- ⚠️ API 키 필수 (설정 가능)

---

## 📁 프로젝트 구조

```
archive/
├── webapp/
│   ├── backend/                    # FastAPI 백엔드
│   │   ├── main.py                 # API 서버 진입점
│   │   ├── requirements.txt         # Python 의존성
│   │   ├── .env                    # 환경 변수 (API 키)
│   │   ├── .env.example            # 환경 변수 예시
│   │   └── services/
│   │       ├── vllm_service.py     # Ollama & LLM 관리
│   │       ├── game_service.py     # Steam/Riot API
│   │       └── vector_store.py     # ChromaDB 검색
│   └── frontend/                   # Next.js 프론트엔드
│       ├── app/page.tsx            # 메인 페이지
│       ├── package.json
│       └── tailwind.config.js
├── images/                         # 이미지 데이터
├── labels/                         # 레이블 데이터
└── README.md
```

---

## 🚀 설치 및 실행

### 사전 요구사항

- **Python 3.9+**
- **Node.js 18+**
- **Ollama** (로컬 모델 실행용)

### 1️⃣ Ollama 설치 및 모델 다운로드

```bash
# Ollama 설치 (https://ollama.ai)
ollama pull qwen2.5
ollama pull llama3.2
ollama pull llama3
```

### 2️⃣ 백엔드 설정

```powershell
cd webapp/backend

# 가상 환경 생성
python -m venv env
env\Scripts\activate

# 의존성 설치
pip install -r requirements.txt

# 환경 변수 설정 (선택사항)
copy .env.example .env
# .env 파일에서 API 키 설정

# 서버 실행
python -m uvicorn main:app --reload --host 127.0.0.1 --port 8000
```

**백엔드 접속:**
- API: `http://127.0.0.1:8000`
- Swagger 문서: `http://127.0.0.1:8000/docs`

### 3️⃣ 프론트엔드 설정

```powershell
cd webapp/frontend

# 의존성 설치
npm install

# 개발 서버 실행
npm run dev
```

**프론트엔드 접속:** `http://127.0.0.1:3000`

---

## 🔑 API 키 설정 (선택사항)

### Steam API 키

1. [Steam 개발자 페이지](https://steamcommunity.com/dev/apikey) 접속
2. API 키 복사
3. `webapp/backend/.env` 수정:
   ```env
   STEAM_API_KEY=your_steam_api_key_here
   ```

### Riot Games API 키

1. [Riot Developer 포털](https://developer.riotgames.com/) 접속
2. API 키 생성 및 복사
3. `webapp/backend/.env` 수정:
   ```env
   RIOT_API_KEY=your_riot_api_key_here
   ```

> 💡 API 키 없이도 **AI 텍스트 생성**과 **벡터 검색**은 정상 작동합니다!

---

## 📖 사용 방법

### 🤖 AI 텍스트 생성

1. 프론트엔드에서 프롬프트 입력
2. "생성 실행" 클릭
3. Ollama 모델이 자동으로 응답 생성

**예시 프롬프트:**
```
FPS 게임을 주 30시간 플레이하는데, 
한국 서버가 있고 팀 게임인 게임을 추천해줘.
```

### 🔍 벡터 검색

1. 검색어 입력
2. "검색" 버튼 클릭
3. 유사한 문서 조회

**예시 쿼리:**
```
최신 패치에서 성능 개선된 캐릭터
```

### 🎮 Steam 정보 조회 (API 키 필요)

1. Steam ID 입력
2. "사용자 정보" 또는 "게임 목록" 선택
3. 결과 확인

**Steam ID 찾기:**
- 프로필 URL: `https://steamcommunity.com/profiles/STEAM_ID`
- [steamid.xyz](https://steamid.xyz) 활용

### ⚔️ Riot Games 정보 조회 (API 키 필요)

1. 소환사명, 태그, 지역 입력 (예: Faker, KR1, KR)
2. "소환사 정보" 또는 "랭크 정보" 선택
3. 결과 확인

**지역 코드:**
| 코드 | 지역 |
|------|------|
| na1 | 북미 |
| euw1 | 유럽 |
| kr | 한국 |
| br1 | 브라질 |

---

## 🛠️ 기술 스택

### 백엔드
```
FastAPI + Uvicorn
├── Ollama (Qwen2.5, Llama3, Llama3.2)
├── ChromaDB (벡터 DB)
├── Sentence-Transformers (임베딩)
├── requests (API 호출)
└── python-dotenv (환경 설정)
```

### 프론트엔드
```
Next.js 14 + React 18
├── TypeScript
├── Tailwind CSS
└── React Hooks (상태 관리)
```

### 외부 서비스
```
Steam Web API
Riot Games API
Ollama (로컬)
```

---

## 📊 API 엔드포인트

| 메서드 | 경로 | 설명 |
|--------|------|------|
| POST | `/api/generate` | AI 텍스트 생성 |
| POST | `/api/search` | 벡터 검색 |
| POST | `/api/documents/upsert` | 문서 추가/수정 |
| POST | `/api/games/steam/user` | Steam 사용자 정보 |
| POST | `/api/games/steam/games` | Steam 게임 목록 |
| POST | `/api/games/riot/summoner` | Riot 소환사 정보 |
| POST | `/api/games/riot/ranked` | Riot 랭크 정보 |

---

## ⚙️ 환경 변수 설정

`webapp/backend/.env`:
```env
# 서버 설정
API_HOST=0.0.0.0
API_PORT=8000

# 기본 모델 (qwen2.5, llama3, llama3.2 중 선택)
DEFAULT_MODEL=qwen2.5

# Game API (선택사항)
STEAM_API_KEY=
RIOT_API_KEY=

# ChromaDB 설정
CHROMA_PERSIST_DIR=./chroma_store
CHROMA_COLLECTION_NAME=vllm-collection

# 임베딩 모델
EMBEDDING_MODEL=all-MiniLM-L6-v2
```

---

## 🔄 모델 변경

**기본 모델 변경:**
```env
DEFAULT_MODEL=llama3.2  # qwen2.5, llama3, llama3.2
```

**API 요청 시 모델 지정:**
```json
{
  "prompt": "게임 추천해줘",
  "max_tokens": 256,
  "model": "llama3"
}
```

---

## ⚠️ 주의사항

### Windows 환경

✅ **Ollama 권장** - 가장 안정적
- UTF-8 인코딩 자동 처리
- 모든 모델 지원

### 오류 해결

| 오류 | 해결방법 |
|------|--------|
| "Ollama CLI 설치 안됨" | Ollama 설치 후 모델 다운로드 |
| "Steam API 키 필요" | `.env`에 `STEAM_API_KEY` 추가 |
| "Riot API 키 필요" | `.env`에 `RIOT_API_KEY` 추가 |
| 모델 로드 실패 | 로컬 모델 캐시 확인 또는 인터넷 연결 확인 |

---

## 📝 개선 사항 & TODO

- [ ] 여러 모델 동시 비교 기능
- [ ] 사용자 입력 기록 저장
- [ ] API 응답 캐싱
- [ ] 실시간 스트리밍 응답
- [ ] Docker 컨테이너 지원
- [ ] 데이터베이스 연동

---

## 🤝 기여

버그 보고나 기능 제안은 [GitHub Issues](https://github.com/bluewhale0302/agentproject/issues)에서 환영합니다!

---

## 📄 라이센스

MIT License

---

## 🚀 빠른 시작 (한 줄 요약)

```bash
# 백엔드
cd webapp/backend && python -m uvicorn main:app --reload --host 127.0.0.1 --port 8000

# 프론트엔드 (새 터미널)
cd webapp/frontend && npm run dev

# 브라우저
http://127.0.0.1:3000 방문
```

---

**최종 업데이트**: 2026년 5월 12일
