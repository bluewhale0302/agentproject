"""
벡터 스토어 서비스.

Pinecone API 키가 있으면 Pinecone 사용.
없으면 간단한 in-memory 키워드 검색으로 fallback (Vercel 서버리스 호환).

무거운 ML 라이브러리(torch, sentence-transformers, chromadb)를 사용하지 않음.
"""

import logging
import os
import uuid
from typing import Any, Dict, List, Optional

logger = logging.getLogger(__name__)

USE_PINECONE = bool(os.getenv("PINECONE_API_KEY")) and bool(os.getenv("PINECONE_ENVIRONMENT"))


class VectorStore:
    def __init__(self, embedding_model: str = "all-MiniLM-L6-v2"):
        self.embedding_model = embedding_model
        # in-memory 문서 저장소 (Pinecone 미사용 시)
        self._documents: List[Dict[str, Any]] = []

        if USE_PINECONE:
            self._init_pinecone()
            logger.info("VectorStore: Pinecone 모드")
        else:
            logger.info("VectorStore: in-memory 키워드 검색 모드 (Pinecone 미설정)")

    # ------------------------------------------------------------------
    # Pinecone 초기화
    # ------------------------------------------------------------------

    def _init_pinecone(self) -> None:
        try:
            import pinecone  # type: ignore

            pinecone.init(
                api_key=os.environ["PINECONE_API_KEY"],
                environment=os.environ["PINECONE_ENVIRONMENT"],
            )
            index_name = os.getenv("PINECONE_INDEX_NAME", "vllm-search")
            if index_name not in pinecone.list_indexes():
                pinecone.create_index(index_name, dimension=384)
            self._pinecone_index = pinecone.Index(index_name)
        except ImportError as exc:
            raise RuntimeError(
                "Pinecone 환경이 설정되어 있지만 pinecone 패키지가 없습니다. "
                "pip install pinecone-client"
            ) from exc

    # ------------------------------------------------------------------
    # 공개 API
    # ------------------------------------------------------------------

    def add_documents(self, documents: List[dict]) -> dict:
        """문서 추가."""
        if not documents:
            return {"status": "empty"}

        if USE_PINECONE:
            return self._pinecone_upsert(documents)

        # in-memory 저장
        added = 0
        for doc in documents:
            doc_id = doc.get("id") or str(uuid.uuid4())
            # 중복 id 업데이트
            existing = next((d for d in self._documents if d["id"] == doc_id), None)
            if existing:
                existing.update({"id": doc_id, "text": doc["text"], "metadata": doc.get("metadata", {})})
            else:
                self._documents.append({"id": doc_id, "text": doc["text"], "metadata": doc.get("metadata", {})})
            added += 1

        return {"status": "memory_upserted", "count": added}

    def query(self, query_text: str, top_k: int = 5) -> dict:
        """문서 검색."""
        if USE_PINECONE:
            return self._pinecone_query(query_text, top_k)

        return self._memory_search(query_text, top_k)

    # ------------------------------------------------------------------
    # Pinecone 구현
    # ------------------------------------------------------------------

    def _pinecone_upsert(self, documents: List[dict]) -> dict:
        vectors = self._embed_texts([d["text"] for d in documents])
        ids = [d.get("id") or str(uuid.uuid4()) for d in documents]
        metadata = [d.get("metadata") or {} for d in documents]
        self._pinecone_index.upsert(vectors=list(zip(ids, vectors, metadata)))
        return {"status": "pinecone_upserted", "count": len(ids)}

    def _pinecone_query(self, query_text: str, top_k: int) -> dict:
        query_vector = self._embed_texts([query_text])[0]
        results = self._pinecone_index.query(
            top_k=top_k, include_metadata=True, include_values=False, vector=query_vector
        )
        matches = [
            {"id": m["id"], "score": m["score"], "metadata": m.get("metadata")}
            for m in results["matches"]
        ]
        return {"engine": "pinecone", "matches": matches}

    def _embed_texts(self, texts: List[str]) -> List[List[float]]:
        """Pinecone용 임베딩 — sentence-transformers 사용 (로컬 전용)."""
        try:
            from sentence_transformers import SentenceTransformer  # type: ignore

            model = SentenceTransformer(self.embedding_model)
            return model.encode(texts, convert_to_numpy=True).tolist()
        except ImportError as exc:
            raise RuntimeError(
                "Pinecone 모드에서는 sentence-transformers가 필요합니다. "
                "pip install sentence-transformers"
            ) from exc

    # ------------------------------------------------------------------
    # In-memory 키워드 검색 (Vercel 서버리스 호환)
    # ------------------------------------------------------------------

    def _memory_search(self, query_text: str, top_k: int) -> dict:
        """간단한 키워드 기반 유사도 검색."""
        if not self._documents:
            return {"engine": "memory", "matches": []}

        query_words = set(query_text.lower().split())
        scored: List[Dict[str, Any]] = []

        for doc in self._documents:
            doc_words = set(doc["text"].lower().split())
            if not doc_words:
                continue
            # Jaccard 유사도
            intersection = len(query_words & doc_words)
            union = len(query_words | doc_words)
            score = intersection / union if union > 0 else 0.0
            scored.append({
                "id": doc["id"],
                "score": round(score, 4),
                "document": doc["text"],
                "metadata": doc.get("metadata", {}),
            })

        scored.sort(key=lambda x: x["score"], reverse=True)
        return {"engine": "memory", "matches": scored[:top_k]}
