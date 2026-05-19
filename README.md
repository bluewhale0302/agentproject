# 게임 플레이 어시스턴트

Steam 계정 정보를 기반으로 AI와 게임 이야기를 나눌 수 있는 웹 서비스입니다.

**라이브 데모**: [agentproject-nu.vercel.app](https://agentproject-nu.vercel.app)

---

## 프로젝트 소개

Steam ID를 입력하면 프로필과 게임 라이브러리를 불러오고, AI 어시스턴트 고스야가 해당 정보를 바탕으로 게임 추천, 가격 조회, 리뷰 분석 등 맞춤형 대화를 제공합니다. 단순한 챗봇이 아니라 실시간 Steam API 데이터를 AI 컨텍스트에 주입해 실용적인 게임 정보를 제공하는 것이 핵심입니다.

---

## 주요 기능

**Steam 계정 조회**
- Steam ID로 프로필, 온라인 상태, 보유 게임 목록 조회
- 플레이타임 기준 정렬, 게임 아이콘 표시

**AI 어시스턴트 고스야**
- 조회된 Steam 정보를 컨텍스트로 활용한 맞춤형 게임 추천
- 게임 이름 입력 시 Steam Store에서 실시간으로 가격, 별점, 사용자 리뷰(긍정/부정 각 5개), 메타크리틱 점수 조회 후 카드 형태로 표시
- 게임 외 주제나 비속어에 대한 자연스러운 거절 처리
- 강아지 같은 친근하고 착한 말투

**Steam 인기 게임 슬라이드**
- SteamSpy API 기반 실시간 인기 게임 TOP 20 자동 슬라이드
- 게임 헤더 이미지, 동시접속자 수, 순위 표시

**탱탱볼 미니게임**
- 클릭 위치에 물리 기반 공 생성 (중력, 반사, 마찰 시뮬레이션)
- 10번 클릭마다 특별 이벤트 8종 순환
  - 게임 이미지 공, 무지개 폭발, 거대 공, 무중력 모드, 대폭발, 눈 내리기, 소용돌이, 미니 공 폭탄
- 흔들기 버튼, 다음 이벤트 진행바

---

## 기술 스택

| 분류 | 기술 |
|------|------|
| Frontend | Next.js 14, React 18, TypeScript, Tailwind CSS |
| Backend | FastAPI, Python 3.12 |
| AI | Groq API — llama-3.3-70b-versatile |
| 외부 API | Steam Web API, Steam Store API, SteamSpy API |
| 배포 | Vercel (Frontend + Serverless Functions) |
| 물리 엔진 | 직접 구현 (requestAnimationFrame + SVG 렌더링) |

---

## 아키텍처

```
Browser
  ├── Next.js (Frontend)
  │     ├── Steam 계정 조회 UI
  │     ├── 고스야 채팅 UI
  │     ├── Steam 인기 게임 슬라이드
  │     └── 탱탱볼 물리 시뮬레이션
  │
  └── FastAPI (Vercel Serverless)
        ├── /api/generate        → Groq LLM 호출
        ├── /api/games/steam/user  → Steam 프로필
        ├── /api/games/steam/games → 게임 목록
        ├── /api/games/steam/search → 게임 상세 + 리뷰
        └── /api/games/steam/top   → SteamSpy 인기 순위
```

---

## 구현 포인트

- **컨텍스트 주입**: Steam 유저 데이터를 LLM 시스템 프롬프트에 동적으로 삽입해 개인화된 응답 생성
- **게임 정보 자동 감지**: 사용자 입력에서 게임 이름 패턴을 감지해 Steam Store API를 자동 호출, 결과를 카드 UI로 렌더링
- **단일 파일 서버리스**: Vercel Python Lambda의 모듈 경로 제약을 해결하기 위해 모든 백엔드 로직을 `main.py` 하나로 통합
- **물리 시뮬레이션**: 외부 라이브러리 없이 RAF 루프 + SVG로 중력, 벽 반사, 소용돌이, 무중력 등 구현

---

## 환경변수

| 변수 | 설명 |
|------|------|
| `GROQ_API_KEY` | Groq API 키 (groq.com) |
| `STEAM_API_KEY` | Steam Web API 키 (steamcommunity.com/dev/apikey) |
