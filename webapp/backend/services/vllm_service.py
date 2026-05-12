"""
LLM 서비스 — Groq API 기반 텍스트 생성 (Vercel 서버리스 호환).

Groq은 무료 tier 제공, OpenAI 호환 API, qwen2.5 / llama3 등 지원.
API 키 발급: https://console.groq.com

환경변수:
  GROQ_API_KEY   : Groq API 키 (필수)
  DEFAULT_MODEL  : 사용할 모델명 (기본값: qwen2.5-coder-7b-instruct)
"""

import logging
import os
from typing import Optional

logger = logging.getLogger(__name__)

# Groq에서 지원하는 모델명 매핑
# 사용자가 'qwen2.5' 등 짧은 이름을 써도 동작하도록
MODEL_ALIASES = {
    "qwen2.5": "qwen2.5-coder-7b-instruct",
    "qwen": "qwen2.5-coder-7b-instruct",
    "llama3": "llama3-8b-8192",
    "llama3.2": "llama-3.2-3b-preview",
    "llama3.1": "llama-3.1-8b-instant",
    "mixtral": "mixtral-8x7b-32768",
    "gemma": "gemma2-9b-it",
}

DEFAULT_GROQ_MODEL = "qwen2.5-coder-7b-instruct"


class VLLMService:
    def __init__(self, model_name: str = "qwen2.5"):
        self.model_name = model_name

    def _resolve_model(self, model_name: str) -> str:
        """짧은 모델명을 Groq 실제 모델명으로 변환."""
        return MODEL_ALIASES.get(model_name.lower(), model_name)

    def generate(
        self,
        prompt: str,
        max_tokens: int = 256,
        temperature: float = 0.8,
        top_p: float = 0.95,
        model_name: Optional[str] = None,
    ) -> str:
        """Groq API를 통해 텍스트 생성.

        Args:
            prompt: 입력 프롬프트
            max_tokens: 최대 생성 토큰 수
            temperature: 샘플링 온도 (0~2)
            top_p: Top-P 샘플링
            model_name: 사용할 모델명

        Returns:
            생성된 텍스트

        Raises:
            RuntimeError: API 키 미설정 또는 호출 실패
        """
        api_key = os.getenv("GROQ_API_KEY", "")
        if not api_key:
            raise RuntimeError(
                "GROQ_API_KEY 환경변수가 설정되지 않았습니다. "
                "https://console.groq.com 에서 무료 API 키를 발급받아 "
                "Vercel 환경변수에 추가하세요."
            )

        try:
            from openai import OpenAI
        except ImportError as exc:
            raise RuntimeError("openai 패키지가 필요합니다: pip install openai") from exc

        model = self._resolve_model(model_name or self.model_name)

        client = OpenAI(
            api_key=api_key,
            base_url="https://api.groq.com/openai/v1",
        )

        try:
            response = client.chat.completions.create(
                model=model,
                messages=[{"role": "user", "content": prompt}],
                max_tokens=max_tokens,
                temperature=temperature,
                top_p=top_p,
            )
            text = response.choices[0].message.content or ""
            if not text.strip():
                raise RuntimeError("Groq API가 빈 응답을 반환했습니다.")
            return text.strip()

        except RuntimeError:
            raise
        except Exception as exc:
            # openai 라이브러리 예외 처리
            err = str(exc)
            if "authentication" in err.lower() or "api_key" in err.lower():
                raise RuntimeError(f"Groq API 인증 실패. API 키를 확인하세요: {exc}")
            if "model" in err.lower() and "not found" in err.lower():
                raise RuntimeError(
                    f"모델 '{model}'을 찾을 수 없습니다. "
                    f"지원 모델: {', '.join(MODEL_ALIASES.values())}"
                )
            raise RuntimeError(f"텍스트 생성 실패: {exc}")
