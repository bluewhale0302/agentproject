# vLLM + FastAPI + Next.js + Tailwind + Vector Search

이 프로젝트는 다음 기술 스택을 결합합니다:

- Next.js + Tailwind CSS 프론트엔드
- FastAPI 백엔드
- vLLM 기반 텍스트 생성
- Pinecone 또는 ChromaDB 기반 검색

## 실행 순서

1. `webapp/frontend`에서:
   - `npm install`
   - `npm run dev`

2. `webapp/backend`에서:
   - `python -m pip install -r requirements.txt`
   - `.env` 파일 설정
   - `uvicorn main:app --reload --host 0.0.0.0 --port 8000`

## 환경 변수

`webapp/backend/.env.example` 파일을 참고하세요.

- `DEFAULT_MODEL`에 `qwen2.5` 또는 로컬 모델 경로를 설정하면 해당 모델을 사용합니다.
- 로컬에 `qwen2.5` 모델을 설치했다면 `HF_LOCAL_FILES_ONLY=1`을 추가로 설정하면 네트워크가 차단된 환경에서도 로컬 모델을 사용합니다.

## 주의

- Windows 네이티브에서는 `vllm`이 바로 실행되지 않을 수 있습니다. 이 경우 WSL/Linux 환경에서 실행하거나 `torch`와 `transformers`를 설치하여 로컬 CPU 생성으로 동작하도록 설정하세요.
- Pinecone 사용 시 `PINECONE_API_KEY`와 `PINECONE_ENVIRONMENT`를 설정하세요.
