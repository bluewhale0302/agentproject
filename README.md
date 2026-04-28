# vLLM + FastAPI + Next.js + Tailwind 프로젝트

이 저장소는 Windows 환경에서 실행 가능한 AI 웹 애플리케이션을 포함합니다.
프론트엔드와 백엔드가 분리되어 있으며, vLLM/transformers 기반 텍스트 생성과 ChromaDB/Pinecone 검색을 지원합니다.

## 구성

- `webapp/frontend` - Next.js + Tailwind CSS UI
- `webapp/backend` - FastAPI 백엔드 API
- `webapp/backend/requirements.txt` - Python 의존성
- `webapp/backend/.env.example` - 실행 환경 변수 예시
- `webapp/README.md` - 프로젝트 상세 실행 가이드

## 빠른 시작

1. 백엔드 설치
```powershell
cd webapp/backend
env\Scripts\activate  # 또는 사용 중인 Python 가상환경 활성화
python -m pip install -r requirements.txt
```

2. 프론트엔드 설치
```powershell
cd webapp/frontend
npm install
npm run dev -- --hostname 127.0.0.1 --port 3000
```

> 만약 `npm`이 PATH에 없으면, 설치된 Node.js 실행 파일 위치를 사용하세요.
> 예: `"C:\Program Files\Microsoft Visual Studio\18\Community\MSBuild\Microsoft\VisualStudio\NodeJs\node.exe" node_modules\next\dist\bin\next dev --hostname 127.0.0.1 --port 3000`

3. 백엔드 실행
```powershell
cd webapp/backend
python -m uvicorn main:app --reload --host 127.0.0.1 --port 8000
```

4. 브라우저 열기
- 프론트엔드: `http://127.0.0.1:3000`
- 백엔드: `http://127.0.0.1:8000`

## GitHub 업로드 준비

1. Git 설치 확인
   - Windows: https://git-scm.com/downloads

2. 저장소 초기화 및 커밋
```powershell
cd c:\Users\pc\Downloads\archive
git init
git add .
git commit -m "Initial commit"
```

3. GitHub 원격 추가
```powershell
git remote add origin https://github.com/<사용자명>/<저장소명>.git
git branch -M main
git push -u origin main
```

## 주의사항

- `webapp/backend/.env` 파일은 Git에 커밋되지 않아야 합니다. `.env.example` 파일을 복사해서 사용하세요.
- `images/`, `labels/`, `labels2/`, `tmp_chroma*` 등의 데이터 폴더는 일반적으로 대용량이므로 GitHub에 포함하지 않는 것이 좋습니다.
- GitHub에 데이터까지 업로드하려면 Git LFS를 사용하는 것이 안전합니다.

## Windows 관련 참고

- `vllm`은 Windows 네이티브에서 바로 실행되지 않을 수 있습니다. 문제 발생 시 WSL 또는 Linux 환경에서 실행하세요.
- `qwen2.5` 모델을 사용할 때는 `DEFAULT_MODEL`에 모델 이름 또는 로컬 경로를 설정하고, 필요한 경우 `HF_LOCAL_FILES_ONLY=1`을 추가하세요.
