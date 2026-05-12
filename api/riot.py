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

class RiotRequest(BaseModel):
    summoner_name: str
    tag: str
    region: str = 'na1'

# 게임 서비스 (지연 로딩)
game_service = None

def get_game_service():
    global game_service
    if game_service is None:
        game_service = GameService()
    return game_service

@app.post('/riot/summoner')
def get_riot_summoner(request: RiotRequest):
    """Riot Games 소환사 정보 조회"""
    if not request.summoner_name or not request.summoner_name.strip():
        raise HTTPException(status_code=400, detail='소환사명이 필요합니다.')

    if not request.tag or not request.tag.strip():
        raise HTTPException(status_code=400, detail='태그가 필요합니다.')

    try:
        service = get_game_service()
        result = service.get_riot_summoner_info(request.summoner_name, request.tag, request.region)
        return result
    except Exception as exc:
        logger.error(f'Riot 소환사 조회 오류: {exc}')
        raise HTTPException(status_code=500, detail=f'조회 실패: {str(exc)}')

@app.post('/riot/ranked')
def get_riot_ranked(request: RiotRequest):
    """Riot Games 랭크 정보 조회"""
    if not request.summoner_name or not request.summoner_name.strip():
        raise HTTPException(status_code=400, detail='소환사명이 필요합니다.')

    if not request.tag or not request.tag.strip():
        raise HTTPException(status_code=400, detail='태그가 필요합니다.')

    try:
        service = get_game_service()
        # 먼저 소환사 정보를 조회해서 summoner_id 얻기
        summoner_info = service.get_riot_summoner_info(request.summoner_name, request.tag, request.region)
        if 'error' in summoner_info:
            return summoner_info

        summoner_id = summoner_info.get('summoner_id')
        if not summoner_id:
            raise ValueError('소환사 ID를 얻을 수 없습니다.')

        result = service.get_riot_ranked_stats(summoner_id, request.region)
        return result
    except Exception as exc:
        logger.error(f'Riot 랭크 조회 오류: {exc}')
        raise HTTPException(status_code=500, detail=f'조회 실패: {str(exc)}')