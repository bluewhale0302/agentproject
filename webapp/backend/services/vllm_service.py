"""
LLM 서비스 — Ollama HTTP API 기반 텍스트 생성.

로컬 환경: Ollama가 localhost:11434에서 실행 중이어야 함.
Vercel 환경: OLLAMA_BASE_URL 환경변수로 외부 Ollama 서버 지정 가능.
"""

import logging
import os
from typing import Optional

import requests

logger = logging.getLogger(__name__)

# Ollama 서버 주소 (기본값: 로컬)
OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")


class VLLMService:
    def __init__(self, model_name: str = "qwen2.5"):
        self.model_name = model_name

    def generate(
        self,
        prompt: str,
        max_tokens: int = 256,
        temperature: float = 0.8,
        top_p: float = 0.95,
        model_name: Optional[str] = None,
    ) -> str:
        """Ollama HTTP API를 통해 텍스트 생성.

        Args:
            prompt: 입력 프롬프트
            max_tokens: 최대 생성 토큰 수
            temperature: 샘플링 온도 (0~2)
            top_p: Top-P 샘플링
            model_name: 사용할 모델명 (없으면 기본값 사용)

        Returns:
            생성된 텍스트

        Raises:
            RuntimeError: Ollama 서버 연결 실패 또는 생성 오류
        """
        model = model_name or self.model_name

        payload = {
            "model": model,
            "prompt": prompt,
            "stream": False,
            "options": {
                "num_predict": max_tokens,
                "temperature": temperature,
                "top_p": top_p,
            },
        }

        try:
            resp = requests.post(
                f"{OLLAMA_BASE_URL}/api/generate",
                json=payload,
                timeout=120,
            )
            resp.raise_for_status()
            data = resp.json()
            text = data.get("response", "").strip()
            if not text:
                raise RuntimeError("Ollama가 빈 응답을 반환했습니다.")
            return text

        except requests.exceptions.ConnectionError:
            raise RuntimeError(
                f"Ollama 서버에 연결할 수 없습니다 ({OLLAMA_BASE_URL}). "
                "로컬에서는 'ollama serve'를 실행하거나, "
                "OLLAMA_BASE_URL 환경변수로 외부 서버를 지정하세요."
            )
        except requests.exceptions.Timeout:
            raise RuntimeError("Ollama 응답 시간 초과 (120초). 모델이 너무 크거나 서버가 느립니다.")
        except requests.exceptions.HTTPError as exc:
            status = exc.response.status_code if exc.response is not None else "unknown"
            raise RuntimeError(f"Ollama HTTP 오류 {status}: {exc}")
        except Exception as exc:
            raise RuntimeError(f"텍스트 생성 실패: {exc}")
