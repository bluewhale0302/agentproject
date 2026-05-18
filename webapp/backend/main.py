import os
import logging
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv

load_dotenv()

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

app = FastAPI(title='Game Play Assistant', version='0.1.0')

_CORS_ORIGINS = [
    'http://localhost:3000',
    'http://127.0.0.1:3000',
]
_extra = os.getenv('CORS_ORIGINS', '')
if _extra:
    _CORS_ORIGINS.extend([o.strip() for o in _extra.split(',') if o.strip()])

app.add_middleware(
    CORSMiddleware,
    allow_origins=_CORS_ORIGINS,
    allow_origin_regex=r'https://.*\.vercel\.app',
    allow_methods=['*'],
    allow_headers=['*'],
)

# ── 요청 모델 ──────────────────────────────────────────────────────────────────

class GenerateRequest(BaseModel):
    prompt: str
    max_tokens: int = 256
    temperature: float = 0.8
    top_p: float = 0.95
    model: str | None = None

class GenerateResponse(BaseModel):
    text: str

class SearchRequest(BaseModel):
    query: str
    top_k: int = 5

class SearchResponse(BaseModel):
    engine: str
    matches: list[dict]

class SteamRequest(BaseModel):
    steam_id: str

# ── Lazy 싱글톤 (모듈 로드 시 초기화 안 함 → Vercel cold start 안전) ──────────

_vllm_service = None
_vector_store = None
_game_service = None

def get_vllm_service():
    global _vllm_service
    if _vllm_service is None:
        from services.vllm_service import VLLMService
        _vllm_service = VLLMService(model_name=os.getenv('DEFAULT_MODEL', 'qwen2.5'))
    return _vllm_service

def get_vector_store():
    global _vector_store
    if _vector_store is None:
        from services.vector_store import VectorStore
        _vector_store = VectorStore(embedding_model=os.getenv('EMBEDDING_MODEL', 'all-MiniLM-L6-v2'))
    return _vector_store

def get_game_service():
    global _game_service
    if _game_service is None:
        from services.game_service import GameService
        _game_service = GameService()
    return _game_service

# ── 엔드포인트 ─────────────────────────────────────────────────────────────────

@app.get('/')
def root():
    return {'message': 'Game Play Assistant API ready'}

@app.post('/api/generate', response_model=GenerateResponse)
def generate(request: GenerateRequest):
    if not request.prompt or not request.prompt.strip():
        raise HTTPException(status_code=400, detail='프롬프트가 비어있습니다.')
    if request.max_tokens <= 0:
        raise HTTPException(status_code=400, detail='max_tokens는 0보다 커야 합니다.')
    if not (0 <= request.temperature <= 2):
        raise HTTPException(status_code=400, detail='온도는 0~2 사이여야 합니다.')

    try:
        text = get_vllm_service().generate(
            prompt=request.prompt,
            max_tokens=request.max_tokens,
            temperature=request.temperature,
            top_p=request.top_p,
            model_name=request.model,
        )
        if not text or not str(text).strip():
            raise HTTPException(status_code=500, detail='모델이 빈 응답을 반환했습니다.')
        return {'text': text}
    except HTTPException:
        raise
    except Exception as exc:
        logger.error(f'텍스트 생성 오류: {exc}')
        raise HTTPException(status_code=500, detail=str(exc))

@app.post('/api/search', response_model=SearchResponse)
def search(request: SearchRequest):
    if not request.query or not request.query.strip():
        raise HTTPException(status_code=400, detail='검색어가 비어있습니다.')
    if not (0 < request.top_k <= 100):
        raise HTTPException(status_code=400, detail='top_k는 1~100 사이여야 합니다.')
    try:
        return get_vector_store().query(request.query, top_k=request.top_k)
    except Exception as exc:
        logger.error(f'벡터 검색 오류: {exc}')
        raise HTTPException(status_code=500, detail=str(exc))

@app.post('/api/games/steam/user')
def get_steam_user(request: SteamRequest):
    if not request.steam_id or not request.steam_id.strip():
        raise HTTPException(status_code=400, detail='Steam ID가 필요합니다.')
    try:
        result = get_game_service().get_steam_user_info(request.steam_id.strip())
        # game_service가 error 딕셔너리를 반환하면 400으로 올려줌
        if isinstance(result, dict) and 'error' in result:
            raise HTTPException(status_code=400, detail=result['error'])
        return result
    except HTTPException:
        raise
    except Exception as exc:
        logger.error(f'Steam 사용자 조회 오류: {exc}')
        raise HTTPException(status_code=500, detail=str(exc))

@app.post('/api/games/steam/games')
def get_steam_games(request: SteamRequest):
    if not request.steam_id or not request.steam_id.strip():
        raise HTTPException(status_code=400, detail='Steam ID가 필요합니다.')
    try:
        result = get_game_service().get_steam_games(request.steam_id.strip())
        if isinstance(result, dict) and 'error' in result:
            raise HTTPException(status_code=400, detail=result['error'])
        return result
    except HTTPException:
        raise
    except Exception as exc:
        logger.error(f'Steam 게임 조회 오류: {exc}')
        raise HTTPException(status_code=500, detail=str(exc))

if __name__ == '__main__':
    import uvicorn
    uvicorn.run('main:app', host='0.0.0.0', port=8000, reload=True)
