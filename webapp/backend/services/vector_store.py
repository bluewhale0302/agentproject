import importlib
import os
import uuid
from typing import Any, Dict, List, Optional

USE_PINECONE = bool(os.getenv('PINECONE_API_KEY')) and bool(os.getenv('PINECONE_ENVIRONMENT'))
PINECONE_AVAILABLE = False
CHROMADB_AVAILABLE = False

if USE_PINECONE:
    try:
        import pinecone
        PINECONE_AVAILABLE = True
    except ImportError:
        PINECONE_AVAILABLE = False
else:
    try:
        import chromadb
        from chromadb.config import Settings
        CHROMADB_AVAILABLE = True
    except ImportError:
        CHROMADB_AVAILABLE = False

DEFAULT_EMBEDDING_DIMENSIONS = {
    'all-MiniLM-L6-v2': 384,
    'sentence-transformers/all-MiniLM-L6-v2': 384,
    'all-mpnet-base-v2': 768,
}


class VectorStore:
    def __init__(self, embedding_model: str = 'all-MiniLM-L6-v2'):
        self.embedding_model = embedding_model
        self.embedder: Optional[Any] = None
        self.collection: Optional[Any] = None
        self.client: Optional[Any] = None
        self.index: Optional[Any] = None

        if USE_PINECONE and not PINECONE_AVAILABLE:
            raise RuntimeError(
                'Pinecone 환경이 설정되어 있지만 pinecone 패키지가 설치되지 않았습니다. pip install pinecone-client'
            )

        if not USE_PINECONE and not CHROMADB_AVAILABLE:
            raise RuntimeError(
                'ChromaDB를 사용하려면 chromadb 패키지가 설치되어야 합니다. pip install chromadb'
            )

        if USE_PINECONE:
            self._init_pinecone()
        else:
            self._init_chroma()

    def _load_embedder(self) -> None:
        if self.embedder is not None:
            return

        local_only = os.getenv('HF_LOCAL_FILES_ONLY', '0').lower() in ('1', 'true', 'yes')
        if os.getenv('HUGGINGFACE_HUB_DISABLE_SSL_VERIFY', '0').lower() in ('1', 'true', 'yes'):
            os.environ['HUGGINGFACE_HUB_DISABLE_SSL_VERIFY'] = '1'

        try:
            sentence_transformers = importlib.import_module('sentence_transformers')
            SentenceTransformer = getattr(sentence_transformers, 'SentenceTransformer')
        except ImportError as exc:
            raise RuntimeError(
                'sentence-transformers 패키지가 필요합니다. pip install sentence-transformers'
            ) from exc

        try:
            self.embedder = SentenceTransformer(self.embedding_model, local_files_only=local_only)
        except Exception as exc:
            raise RuntimeError(
                'SentenceTransformer 로드에 실패했습니다. '
                '인터넷 연결 또는 SSL 인증서 문제를 확인하거나, '
                'HF_LOCAL_FILES_ONLY=1을 설정하여 로컬 모델 캐시를 사용하세요. '
                f'원본 오류: {exc}'
            ) from exc

    def _init_pinecone(self) -> None:
        import pinecone

        pinecone.init(
            api_key=os.environ['PINECONE_API_KEY'],
            environment=os.environ['PINECONE_ENVIRONMENT'],
        )
        index_name = os.getenv('PINECONE_INDEX_NAME', 'vllm-search')
        dimension = DEFAULT_EMBEDDING_DIMENSIONS.get(self.embedding_model)
        if index_name not in pinecone.list_indexes():
            if dimension is None:
                self._load_embedder()
                dimension = self.embedder.get_sentence_embedding_dimension()
            pinecone.create_index(index_name, dimension=dimension)
        self.index = pinecone.Index(index_name)

    def _init_chroma(self) -> None:
        if not CHROMADB_AVAILABLE:
            raise RuntimeError('ChromaDB 패키지가 설치되어 있지 않습니다. pip install chromadb')

        import chromadb
        from pathlib import Path

        persist_directory = os.getenv('CHROMA_PERSIST_DIR', './chroma_store')
        persist_path = Path(persist_directory)
        persist_path.mkdir(parents=True, exist_ok=True)

        self.client = chromadb.PersistentClient(str(persist_path))
        self.collection = self.client.get_or_create_collection(
            name=os.getenv('CHROMA_COLLECTION_NAME', 'vllm-collection'),
        )

    def _embed_texts(self, texts: List[str]) -> List[List[float]]:
        self._load_embedder()
        try:
            import numpy as np  # lazy import so backend does not fail before embeddings are used
        except ImportError as exc:
            raise RuntimeError(
                'numpy 패키지가 필요합니다. pip install numpy'
            ) from exc

        return self.embedder.encode(texts, show_progress_bar=False, convert_to_numpy=True).tolist()

    def add_documents(self, documents: List[dict]) -> dict:
        if not documents:
            return {'status': 'empty'}

        texts = [doc['text'] for doc in documents]
        ids = [doc.get('id', str(uuid.uuid4())) for doc in documents]
        metadata = [doc.get('metadata', {}) for doc in documents]

        if USE_PINECONE:
            vectors = self._embed_texts(texts)
            self.index.upsert(vectors=list(zip(ids, vectors, metadata)))
            return {'status': 'pinecone_upserted', 'count': len(ids)}

        self.collection.add(ids=ids, metadatas=metadata, documents=texts)
        self.client.persist()
        return {'status': 'chroma_upserted', 'count': len(ids)}

    def query(self, query_text: str, top_k: int = 5) -> dict:
        if USE_PINECONE:
            query_vector = self._embed_texts([query_text])[0]
            results = self.index.query(top_k=top_k, include_metadata=True, include_values=False, vector=query_vector)
            items = []
            for match in results['matches']:
                items.append({
                    'id': match['id'],
                    'score': match['score'],
                    'metadata': match.get('metadata'),
                })
            return {'engine': 'pinecone', 'matches': items}

        results = self.collection.query(
            query_texts=[query_text],
            n_results=top_k,
            include=['metadatas', 'documents', 'distances'],
        )

        ids = results.get('ids') or [[]]
        documents = results.get('documents') or [[]]
        metadatas = results.get('metadatas') or [[]]
        distances = results.get('distances') or [[]]

        matches = []
        num_results = min(
            len(ids[0]) if ids and ids[0] is not None else 0,
            len(documents[0]) if documents and documents[0] is not None else 0,
            len(metadatas[0]) if metadatas and metadatas[0] is not None else 0,
            len(distances[0]) if distances and distances[0] is not None else 0,
        )

        for i in range(num_results):
            matches.append({
                'id': ids[0][i],
                'score': float(distances[0][i]),
                'document': documents[0][i],
                'metadata': metadatas[0][i],
            })
        return {'engine': 'chroma', 'matches': matches}
