"""
Game Play Assistant — FastAPI 백엔드
모든 서비스를 단일 파일로 통합 (Vercel 서버리스 호환)
"""

import logging
import os
import uuid
from typing import Any, Dict, List, Optional

import requests
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

load_dotenv()

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(name)s %(levelname)s %(message)s",
)
logger = logging.getLogger(__name__)

# ── FastAPI 앱 ────────────────────────────────────────────────────────────────

app = FastAPI(title="Game Play Assistant", version="1.0.0")

_cors_origins = ["http://localhost:3000", "http://127.0.0.1:3000"]
_extra = os.getenv("CORS_ORIGINS", "")
if _extra:
    _cors_origins.extend([o.strip() for o in _extra.split(",") if o.strip()])

app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins,
    allow_origin_regex=r"https://.*\.vercel\.app",
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── 요청/응답 모델 ────────────────────────────────────────────────────────────

class GenerateRequest(BaseModel):
    prompt: str
    max_tokens: int = 512
    temperature: float = 0.8
    top_p: float = 0.95
    model: Optional[str] = None

class GenerateResponse(BaseModel):
    text: str

class SteamRequest(BaseModel):
    steam_id: str

# ── LLM 서비스 (Groq) ─────────────────────────────────────────────────────────

# Groq 모델 별칭 (짧은 이름 → 실제 모델명)
_MODEL_ALIASES: Dict[str, str] = {
    "qwen2.5":  "qwen2.5-coder-7b-instruct",
    "qwen":     "qwen2.5-coder-7b-instruct",
    "llama3":   "llama3-8b-8192",
    "llama3.1": "llama-3.1-8b-instant",
    "llama3.2": "llama-3.2-3b-preview",
    "mixtral":  "mixtral-8x7b-32768",
    "gemma":    "gemma2-9b-it",
}
_DEFAULT_MODEL = os.getenv("DEFAULT_MODEL", "qwen2.5")


def _groq_generate(
    prompt: str,
    max_tokens: int = 512,
    temperature: float = 0.8,
    top_p: float = 0.95,
    model_name: Optional[str] = None,
) -> str:
    """Groq API로 텍스트 생성."""
    api_key = os.getenv("GROQ_API_KEY", "")
    if not api_key:
        raise RuntimeError(
            "GROQ_API_KEY가 설정되지 않았습니다. "
            "Vercel 환경변수에 GROQ_API_KEY를 추가하세요. "
            "키 발급: https://console.groq.com"
        )

    raw_model = model_name or _DEFAULT_MODEL
    model = _MODEL_ALIASES.get(raw_model.lower(), raw_model)

    try:
        from openai import OpenAI  # openai 패키지로 Groq 호출
    except ImportError:
        raise RuntimeError("openai 패키지가 없습니다. requirements.txt를 확인하세요.")

    client = OpenAI(api_key=api_key, base_url="https://api.groq.com/openai/v1")

    try:
        resp = client.chat.completions.create(
            model=model,
            messages=[{"role": "user", "content": prompt}],
            max_tokens=max_tokens,
            temperature=temperature,
            top_p=top_p,
        )
        text = (resp.choices[0].message.content or "").strip()
        if not text:
            raise RuntimeError("Groq API가 빈 응답을 반환했습니다.")
        return text
    except RuntimeError:
        raise
    except Exception as exc:
        err = str(exc)
        if "authentication" in err.lower() or "api_key" in err.lower():
            raise RuntimeError(f"Groq 인증 실패 — API 키를 확인하세요: {exc}")
        if "model" in err.lower() and "not found" in err.lower():
            raise RuntimeError(
                f"모델 '{model}'을 찾을 수 없습니다. "
                f"지원 모델: {', '.join(set(_MODEL_ALIASES.values()))}"
            )
        raise RuntimeError(f"Groq 호출 실패: {exc}")


# ── Steam 서비스 ──────────────────────────────────────────────────────────────

def _steam_get_user(steam_id: str) -> Dict[str, Any]:
    """Steam 사용자 프로필 조회."""
    api_key = os.getenv("STEAM_API_KEY", "")
    if not api_key:
        raise HTTPException(
            status_code=503,
            detail="STEAM_API_KEY가 설정되지 않았습니다. Vercel 환경변수에 추가하세요.",
        )

    resp = requests.get(
        "https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v0002/",
        params={"key": api_key, "steamids": steam_id, "format": "json"},
        timeout=10,
    )
    resp.raise_for_status()
    players = resp.json().get("response", {}).get("players", [])
    if not players:
        raise HTTPException(status_code=404, detail="Steam 사용자를 찾을 수 없습니다.")

    p = players[0]
    return {
        "steam_id":     steam_id,
        "username":     p.get("personaname", ""),
        "avatar":       p.get("avatarfull", ""),
        "profile_url":  p.get("profileurl", ""),
        "real_name":    p.get("realname", ""),
        "location":     p.get("loccountrycode", ""),
        "persona_state": p.get("personastate", 0),
        "last_logoff":  p.get("lastlogoff", 0),
    }


def _steam_get_games(steam_id: str) -> Dict[str, Any]:
    """Steam 게임 목록 조회."""
    api_key = os.getenv("STEAM_API_KEY", "")
    if not api_key:
        raise HTTPException(
            status_code=503,
            detail="STEAM_API_KEY가 설정되지 않았습니다. Vercel 환경변수에 추가하세요.",
        )

    resp = requests.get(
        "https://api.steampowered.com/IPlayerService/GetOwnedGames/v1/",
        params={
            "key": api_key,
            "steamid": steam_id,
            "include_appinfo": 1,
            "include_played_free_games": 1,
            "format": "json",
        },
        timeout=10,
    )
    resp.raise_for_status()
    games = resp.json().get("response", {}).get("games", [])

    # 플레이타임 내림차순 정렬
    games_sorted = sorted(games, key=lambda g: g.get("playtime_forever", 0), reverse=True)

    return {
        "steam_id":    steam_id,
        "total_games": len(games),
        "games":       games_sorted[:20],
    }


# ── In-memory 벡터 스토어 ─────────────────────────────────────────────────────

_documents: List[Dict[str, Any]] = []


def _memory_search(query: str, top_k: int = 5) -> Dict[str, Any]:
    if not _documents:
        return {"engine": "memory", "matches": []}
    q_words = set(query.lower().split())
    scored = []
    for doc in _documents:
        d_words = set(doc["text"].lower().split())
        union = len(q_words | d_words)
        score = len(q_words & d_words) / union if union else 0.0
        scored.append({**doc, "score": round(score, 4)})
    scored.sort(key=lambda x: x["score"], reverse=True)
    return {"engine": "memory", "matches": scored[:top_k]}


# ── 엔드포인트 ────────────────────────────────────────────────────────────────

@app.get("/")
def root():
    return {"status": "ok", "message": "Game Play Assistant API"}


@app.post("/api/generate", response_model=GenerateResponse)
def generate(req: GenerateRequest):
    if not req.prompt.strip():
        raise HTTPException(status_code=400, detail="프롬프트가 비어있습니다.")
    if req.max_tokens <= 0:
        raise HTTPException(status_code=400, detail="max_tokens는 0보다 커야 합니다.")
    if not (0.0 <= req.temperature <= 2.0):
        raise HTTPException(status_code=400, detail="temperature는 0~2 사이여야 합니다.")
    try:
        text = _groq_generate(
            prompt=req.prompt,
            max_tokens=req.max_tokens,
            temperature=req.temperature,
            top_p=req.top_p,
            model_name=req.model,
        )
        return {"text": text}
    except HTTPException:
        raise
    except Exception as exc:
        logger.error(f"텍스트 생성 오류: {exc}")
        raise HTTPException(status_code=500, detail=str(exc))


@app.post("/api/games/steam/user")
def steam_user(req: SteamRequest):
    if not req.steam_id.strip():
        raise HTTPException(status_code=400, detail="Steam ID가 필요합니다.")
    try:
        return _steam_get_user(req.steam_id.strip())
    except HTTPException:
        raise
    except requests.exceptions.HTTPError as exc:
        status = exc.response.status_code if exc.response is not None else 500
        raise HTTPException(status_code=status, detail=f"Steam API 오류: {exc}")
    except Exception as exc:
        logger.error(f"Steam 사용자 조회 오류: {exc}")
        raise HTTPException(status_code=500, detail=str(exc))


@app.post("/api/games/steam/games")
def steam_games(req: SteamRequest):
    if not req.steam_id.strip():
        raise HTTPException(status_code=400, detail="Steam ID가 필요합니다.")
    try:
        return _steam_get_games(req.steam_id.strip())
    except HTTPException:
        raise
    except requests.exceptions.HTTPError as exc:
        status = exc.response.status_code if exc.response is not None else 500
        raise HTTPException(status_code=status, detail=f"Steam API 오류: {exc}")
    except Exception as exc:
        logger.error(f"Steam 게임 조회 오류: {exc}")
        raise HTTPException(status_code=500, detail=str(exc))


@app.get("/api/games/steam/top")
def steam_top_games():
    """Steam 글로벌 인기 게임 순위 (SteamSpy 무료 API 사용, 키 불필요)."""
    try:
        resp = requests.get(
            "https://steamspy.com/api.php",
            params={"request": "top100in2weeks"},
            timeout=10,
        )
        resp.raise_for_status()
        data = resp.json()
        games = []
        for rank, (appid, info) in enumerate(list(data.items())[:20], start=1):
            games.append({
                "rank":    rank,
                "appid":   int(appid),
                "name":    info.get("name", ""),
                "players": info.get("ccu", 0),          # 현재 동시접속자
                "owners":  info.get("owners", ""),
            })
        return {"games": games}
    except Exception as exc:
        logger.error(f"Steam 인기 게임 조회 오류: {exc}")
        raise HTTPException(status_code=500, detail=str(exc))


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
