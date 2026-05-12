import os
import logging
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv

from webapp.backend.services.vector_store import VectorStore
from webapp.backend.services.vllm_service import VLLMService
from webapp.backend.services.game_service import GameService

load_dotenv()

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title='Game Assistant API', version='0.1.0')
app.add_middleware(
    CORSMiddleware,
    allow_origins=['*'],
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

DEFAULT_MODEL = os.getenv('DEFAULT_MODEL', 'microsoft/DialoGPT-medium')

# 서비스 초기화 (지연 로딩)
vllm_service = None
vector_store = None
game_service = None

def get_vllm_service():
    global vllm_service
    if vllm_service is None:
        vllm_service = VLLMService(model_name=DEFAULT_MODEL)
    return vllm_service

def get_vector_store():
    global vector_store
    if vector_store is None:
        vector_store = VectorStore(embedding_model=os.getenv('EMBEDDING_MODEL', 'all-MiniLM-L6-v2'))
    return vector_store

def get_game_service():
    global game_service
    if game_service is None:
        game_service = GameService()
    return game_service

@app.post('/generate', response_model=GenerateResponse)
def generate(request: GenerateRequest):
    """AI 모델을 사용하여 텍스트 생성"""
    if not request.prompt or not request.prompt.strip():
        raise HTTPException(status_code=400, detail='프롬프트가 비어있습니다.')

    if request.max_tokens <= 0:
        raise HTTPException(status_code=400, detail='max_tokens는 0보다 커야 합니다.')

    model_name = request.model or DEFAULT_MODEL
    try:
        service = get_vllm_service()
        text = service.generate(
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