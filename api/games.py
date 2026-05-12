import os
import logging
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from dotenv import load_dotenv

from webapp.backend.services.game_service import GameService

load_dotenv()

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI()

class SteamRequest(BaseModel):
    steam_id: str

# 게임 서비스 (지연 로딩)
game_service = None

def get_game_service():
    global game_service
    if game_service is None:
        game_service = GameService()
    return game_service

@app.post('/steam/user')
def get_steam_user(request: SteamRequest):
    """Steam 사용자 정보 조회"""
    if not request.steam_id or not request.steam_id.strip():
        raise HTTPException(status_code=400, detail='Steam ID가 필요합니다.')

    try:
        service = get_game_service()
        result = service.get_steam_user_info(request.steam_id)
        return result
    except Exception as exc:
        logger.error(f'Steam 사용자 조회 오류: {exc}')
        raise HTTPException(status_code=500, detail=f'조회 실패: {str(exc)}')

@app.post('/steam/games')
def get_steam_games(request: SteamRequest):
    """Steam 게임 목록 조회"""
    if not request.steam_id or not request.steam_id.strip():
        raise HTTPException(status_code=400, detail='Steam ID가 필요합니다.')

    try:
        service = get_game_service()
        result = service.get_steam_games(request.steam_id)
        return result
    except Exception as exc:
        logger.error(f'Steam 게임 조회 오류: {exc}')
        raise HTTPException(status_code=500, detail=f'조회 실패: {str(exc)}')