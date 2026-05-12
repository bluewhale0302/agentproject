import os
import logging
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from dotenv import load_dotenv

from webapp.backend.services.vector_store import VectorStore

load_dotenv()

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI()

class SearchRequest(BaseModel):
    query: str
    top_k: int = 5

class SearchResponse(BaseModel):
    engine: str
    matches: list[dict]

# 벡터 스토어 (지연 로딩)
vector_store = None

def get_vector_store():
    global vector_store
    if vector_store is None:
        vector_store = VectorStore(embedding_model=os.getenv('EMBEDDING_MODEL', 'all-MiniLM-L6-v2'))
    return vector_store

@app.post('/search', response_model=SearchResponse)
def search(request: SearchRequest):
    """벡터 기반 문서 검색"""
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