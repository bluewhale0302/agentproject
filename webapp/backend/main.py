import os
import logging
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv

from services.vector_store import VectorStore
from services.vllm_service import VLLMService
from services.game_service import GameService

load_dotenv()

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

app = FastAPI(title='vLLM FastAPI', version='0.1.0')
app.add_middleware(
    CORSMiddleware,
    allow_origins=['http://localhost:3000', 'http://127.0.0.1:3000'],
    allow_methods=['*'],
    allow_headers=['*'],
)

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

class UpsertDocument(BaseModel):
    id: str | None = None
    text: str
    metadata: dict | None = None

class UpsertRequest(BaseModel):
    documents: list[UpsertDocument]

class SteamRequest(BaseModel):
    steam_id: str

class RiotRequest(BaseModel):
    summoner_name: str
    tag: str
    region: str = 'na1'

DEFAULT_MODEL = os.getenv('DEFAULT_MODEL', 'qwen2.5')

try:
    vllm_service = VLLMService(model_name=DEFAULT_MODEL)
    logger.info(f'vLLM 서비스 초기화 완료: {DEFAULT_MODEL}')
except Exception as exc:
    logger.error(f'vLLM 서비스 초기화 실패: {exc}')
    raise RuntimeError(f'vLLM 서비스 초기화 실패: {exc}')

vector_store = None
game_service = GameService()

def get_vector_store() -> VectorStore:
    global vector_store
    if vector_store is None:
        vector_store = VectorStore(embedding_model=os.getenv('EMBEDDING_MODEL', 'all-MiniLM-L6-v2'))
    return vector_store

@app.get('/')
def root():
    return {'message': 'vLLM FastAPI ready'}

@app.post('/api/generate', response_model=GenerateResponse)
def generate(request: GenerateRequest):
    """AI 모델을 사용하여 텍스트 생성
    
    Args:
        request: 생성 요청 (프롬프트, 최대 토큰, 온도 등)
        
    Returns:
        생성된 텍스트
        
    Raises:
        HTTPException: 입력 검증 실패 또는 모델 실행 실패
    """
    if not request.prompt or not request.prompt.strip():
        raise HTTPException(status_code=400, detail='프롬프트가 비어있습니다.')
    
    if request.max_tokens <= 0:
        raise HTTPException(status_code=400, detail='max_tokens는 0보다 커야 합니다.')
    
    if not (0 <= request.temperature <= 2):
        raise HTTPException(status_code=400, detail='온도는 0~2 사이여야 합니다.')
    
    model_name = request.model or DEFAULT_MODEL
    try:
        text = vllm_service.generate(
            prompt=request.prompt,
            max_tokens=request.max_tokens,
            temperature=request.temperature,
            top_p=request.top_p,
            model_name=model_name,
        )
        if not text or not str(text).strip():
            raise HTTPException(status_code=500, detail='모델이 빈 응답을 반환했습니다.')
        return {'text': text}
    except HTTPException:
        raise
    except Exception as exc:
        logger.error(f'텍스트 생성 오류: {exc}')
        raise HTTPException(status_code=500, detail=f'생성 실패: {str(exc)}')

@app.post('/api/search', response_model=SearchResponse)
def search(request: SearchRequest):
    """벡터 기반 문서 검색
    
    Args:
        request: 검색 요청 (쿼리, 상위 K개)
        
    Returns:
        매칭된 문서 목록
        
    Raises:
        HTTPException: 입력 검증 실패 또는 검색 실패
    """
    if not request.query or not request.query.strip():
        raise HTTPException(status_code=400, detail='검색어가 비어있습니다.')
    
    if request.top_k <= 0:
        raise HTTPException(status_code=400, detail='top_k는 0보다 커야 합니다.')
    
    if request.top_k > 100:
        raise HTTPException(status_code=400, detail='top_k는 100 이하여야 합니다.')
    
    try:
        result = get_vector_store().query(request.query, top_k=request.top_k)
        if not result:
            logger.warning(f'검색 결과 없음: {request.query}')
        return result
    except Exception as exc:
        logger.error(f'벡터 검색 오류: {exc}')
        raise HTTPException(status_code=500, detail=f'검색 실패: {str(exc)}')

@app.post('/api/documents/upsert')
def upsert_documents(request: UpsertRequest):
    """문서 추가 또는 업데이트
    
    Args:
        request: 업로드 요청 (문서 목록)
        
    Returns:
        업로드 결과
        
    Raises:
        HTTPException: 입력 검증 실패 또는 업로드 실패
    """
    if not request.documents:
        raise HTTPException(status_code=400, detail='문서가 없습니다.')
    
    if len(request.documents) > 1000:
        raise HTTPException(status_code=400, detail='한 번에 최대 1000개 문서만 업로드할 수 있습니다.')
    
    for doc in request.documents:
        if not doc.text or not doc.text.strip():
            raise HTTPException(status_code=400, detail='빈 문서 텍스트가 있습니다.')
    
    try:
        docs = [doc.dict(exclude_none=True) for doc in request.documents]
        result = get_vector_store().add_documents(docs)
        logger.info(f'문서 업로드 완료: {result}')
        return result
    except Exception as exc:
        logger.error(f'문서 업로드 오류: {exc}')
        raise HTTPException(status_code=500, detail=f'업로드 실패: {str(exc)}')

@app.post('/api/games/steam/user')
def get_steam_user(request: SteamRequest):
    """Steam 사용자 정보 조회
    
    Args:
        request: Steam ID
        
    Returns:
        사용자 정보 또는 에러 메시지
        
    Raises:
        HTTPException: 입력 검증 실패
    """
    if not request.steam_id or not request.steam_id.strip():
        raise HTTPException(status_code=400, detail='Steam ID가 필요합니다.')
    
    try:
        result = game_service.get_steam_user_info(request.steam_id)
        return result
    except Exception as exc:
        logger.error(f'Steam 사용자 조회 오류: {exc}')
        raise HTTPException(status_code=500, detail=f'조회 실패: {str(exc)}')

@app.post('/api/games/steam/games')
def get_steam_games(request: SteamRequest):
    """Steam 게임 목록 조회
    
    Args:
        request: Steam ID
        
    Returns:
        게임 목록 또는 에러 메시지
        
    Raises:
        HTTPException: 입력 검증 실패
    """
    if not request.steam_id or not request.steam_id.strip():
        raise HTTPException(status_code=400, detail='Steam ID가 필요합니다.')
    
    try:
        result = game_service.get_steam_games(request.steam_id)
        return result
    except Exception as exc:
        logger.error(f'Steam 게임 조회 오류: {exc}')
        raise HTTPException(status_code=500, detail=f'조회 실패: {str(exc)}')

@app.post('/api/games/riot/summoner')
def get_riot_summoner(request: RiotRequest):
    """Riot Games 소환사 정보 조회
    
    Args:
        request: 소환사명, 태그, 지역
        
    Returns:
        소환사 정보 또는 에러 메시지
        
    Raises:
        HTTPException: 입력 검증 실패
    """
    if not request.summoner_name or not request.summoner_name.strip():
        raise HTTPException(status_code=400, detail='소환사명이 필요합니다.')
    
    if not request.tag or not request.tag.strip():
        raise HTTPException(status_code=400, detail='태그가 필요합니다.')
    
    try:
        result = game_service.get_riot_summoner_info(request.summoner_name, request.tag, request.region)
        return result
    except Exception as exc:
        logger.error(f'Riot 소환사 조회 오류: {exc}')
        raise HTTPException(status_code=500, detail=f'조회 실패: {str(exc)}')

@app.post('/api/games/riot/ranked')
def get_riot_ranked(request: RiotRequest):
    """Riot Games 랭크 정보 조회
    
    Args:
        request: 소환사명, 태그, 지역
        
    Returns:
        랭크 정보 또는 에러 메시지
        
    Raises:
        HTTPException: 입력 검증 실패
    """
    if not request.summoner_name or not request.summoner_name.strip():
        raise HTTPException(status_code=400, detail='소환사명이 필요합니다.')
    
    if not request.tag or not request.tag.strip():
        raise HTTPException(status_code=400, detail='태그가 필요합니다.')
    
    try:
        # 먼저 소환사 정보를 조회해서 summoner_id 얻기
        summoner_info = game_service.get_riot_summoner_info(request.summoner_name, request.tag, request.region)
        if 'error' in summoner_info:
            return summoner_info
        
        summoner_id = summoner_info.get('summoner_id')
        if not summoner_id:
            raise ValueError('소환사 ID를 얻을 수 없습니다.')
        
        result = game_service.get_riot_ranked_stats(summoner_id, request.region)
        return result
    except Exception as exc:
        logger.error(f'Riot 랭크 조회 오류: {exc}')
        raise HTTPException(status_code=500, detail=f'조회 실패: {str(exc)}')


if __name__ == '__main__':
    import uvicorn

    uvicorn.run('main:app', host='0.0.0.0', port=8000, reload=True)
