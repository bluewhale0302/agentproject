import os
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv

from services.vector_store import VectorStore
from services.vllm_service import VLLMService

load_dotenv()

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

DEFAULT_MODEL = os.getenv('DEFAULT_MODEL', 'qwen2.5')

try:
    vllm_service = VLLMService(model_name=DEFAULT_MODEL)
except Exception as exc:
    raise RuntimeError(f'vLLM 서비스 초기화 실패: {exc}')

vector_store = None

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
    model_name = request.model or DEFAULT_MODEL
    try:
        text = vllm_service.generate(
            prompt=request.prompt,
            max_tokens=request.max_tokens,
            temperature=request.temperature,
            top_p=request.top_p,
            model_name=model_name,
        )
        return {'text': text}
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))

@app.post('/api/search', response_model=SearchResponse)
def search(request: SearchRequest):
    try:
        result = get_vector_store().query(request.query, top_k=request.top_k)
        return result
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))

@app.post('/api/documents/upsert')
def upsert_documents(request: UpsertRequest):
    try:
        docs = [doc.dict(exclude_none=True) for doc in request.documents]
        return get_vector_store().add_documents(docs)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


if __name__ == '__main__':
    import uvicorn

    uvicorn.run('main:app', host='0.0.0.0', port=8000, reload=True)
