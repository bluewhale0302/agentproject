import os
import logging
import requests
from typing import Optional, Dict, Any

logger = logging.getLogger(__name__)

class GameService:
    """Steam 및 Riot Games API를 통합한 게임 정보 조회 서비스"""
    
    def __init__(self):
        self.steam_api_key = os.getenv('STEAM_API_KEY', '')
        self.riot_api_key = os.getenv('RIOT_API_KEY', '')
        
        if not self.steam_api_key:
            logger.warning('Steam API 키가 설정되지 않았습니다.')
        if not self.riot_api_key:
            logger.warning('Riot API 키가 설정되지 않았습니다.')
    
    def get_steam_user_info(self, steam_id: str) -> Dict[str, Any]:
        """Steam 사용자 정보 조회
        
        Args:
            steam_id: Steam 사용자 ID (숫자)
            
        Returns:
            사용자 정보 또는 에러 메시지
        """
        if not self.steam_api_key:
            return {'error': 'Steam API 키가 설정되지 않았습니다.', 'code': 'NO_API_KEY'}
        
        try:
            # Steam User Info API
            url = 'http://api.steampowered.com/ISteamUser/GetPlayerSummaries/v0002/'
            params = {
                'key': self.steam_api_key,
                'steamids': steam_id,
                'format': 'json'
            }
            response = requests.get(url, params=params, timeout=10)
            response.raise_for_status()
            data = response.json()
            
            if data.get('response', {}).get('players'):
                player = data['response']['players'][0]
                return {
                    'steam_id': steam_id,
                    'username': player.get('personaname', 'Unknown'),
                    'avatar': player.get('avatarfull', ''),
                    'profile_url': player.get('profileurl', ''),
                    'last_logoff': player.get('lastlogoff', 0),
                    'persona_state': player.get('personastate', 0),
                    'real_name': player.get('realname', ''),
                    'location': player.get('loccountrycode', ''),
                }
            return {'error': '해당 Steam 사용자를 찾을 수 없습니다.', 'code': 'USER_NOT_FOUND'}
        except requests.exceptions.RequestException as e:
            logger.error(f'Steam API 요청 실패: {e}')
            return {'error': f'Steam API 요청 실패: {str(e)}', 'code': 'API_ERROR'}
        except Exception as e:
            logger.error(f'Steam 사용자 정보 조회 오류: {e}')
            return {'error': f'오류 발생: {str(e)}', 'code': 'INTERNAL_ERROR'}
    
    def get_steam_games(self, steam_id: str) -> Dict[str, Any]:
        """Steam 사용자의 게임 목록 조회
        
        Args:
            steam_id: Steam 사용자 ID
            
        Returns:
            게임 목록 또는 에러 메시지
        """
        if not self.steam_api_key:
            return {'error': 'Steam API 키가 설정되지 않았습니다.', 'code': 'NO_API_KEY'}
        
        try:
            url = 'http://api.steampowered.com/IPlayerService/GetOwnedGames/v1/'
            params = {
                'key': self.steam_api_key,
                'steamid': steam_id,
                'include_appinfo': 1,
                'include_played_free_games': 1,
                'format': 'json'
            }
            response = requests.get(url, params=params, timeout=10)
            response.raise_for_status()
            data = response.json()
            
            if data.get('response', {}).get('games'):
                games = data['response']['games']
                return {
                    'steam_id': steam_id,
                    'total_games': len(games),
                    'games': games[:20]  # 상위 20개만
                }
            return {'error': '게임 정보를 찾을 수 없습니다.', 'code': 'NO_GAMES'}
        except requests.exceptions.RequestException as e:
            logger.error(f'Steam 게임 조회 API 요청 실패: {e}')
            return {'error': f'Steam API 요청 실패: {str(e)}', 'code': 'API_ERROR'}
        except Exception as e:
            logger.error(f'Steam 게임 조회 오류: {e}')
            return {'error': f'오류 발생: {str(e)}', 'code': 'INTERNAL_ERROR'}
    
    def get_riot_summoner_info(self, summoner_name: str, tag: str, region: str = 'na1') -> Dict[str, Any]:
        """Riot Games 소환사 정보 조회
        
        Args:
            summoner_name: 소환사명
            tag: 소환사 태그 (예: KR1)
            region: 지역 (na1, euw1, kr 등)
            
        Returns:
            소환사 정보 또는 에러 메시지
        """
        if not self.riot_api_key:
            return {'error': 'Riot API 키가 설정되지 않았습니다.', 'code': 'NO_API_KEY'}
        
        try:
            # Riot Account API
            url = f'https://americas.api.riotgames.com/riot/account/v1/accounts/by-riot-id/{summoner_name}/{tag}'
            headers = {'X-Riot-Token': self.riot_api_key}
            response = requests.get(url, headers=headers, timeout=10)
            response.raise_for_status()
            account = response.json()
            
            # Summoner Info API
            summoner_url = f'https://{region}.api.riotgames.com/lol/summoner/v4/summoners/by-account/{account["id"]}'
            summoner_response = requests.get(summoner_url, headers=headers, timeout=10)
            summoner_response.raise_for_status()
            summoner = summoner_response.json()
            
            return {
                'summoner_name': summoner_name,
                'tag': tag,
                'summoner_id': summoner.get('id', ''),
                'account_id': account.get('id', ''),
                'puuid': account.get('puuid', ''),
                'summoner_level': summoner.get('summonerLevel', 0),
                'profile_icon_id': summoner.get('profileIconId', 0),
            }
        except requests.exceptions.HTTPError as e:
            if e.response.status_code == 404:
                logger.warning(f'Riot 소환사를 찾을 수 없음: {summoner_name}#{tag}')
                return {'error': '해당 소환사를 찾을 수 없습니다.', 'code': 'SUMMONER_NOT_FOUND'}
            logger.error(f'Riot API HTTP 에러: {e}')
            return {'error': f'Riot API 오류: {e.response.status_code}', 'code': 'API_HTTP_ERROR'}
        except requests.exceptions.RequestException as e:
            logger.error(f'Riot API 요청 실패: {e}')
            return {'error': f'Riot API 요청 실패: {str(e)}', 'code': 'API_ERROR'}
        except Exception as e:
            logger.error(f'Riot 소환사 정보 조회 오류: {e}')
            return {'error': f'오류 발생: {str(e)}', 'code': 'INTERNAL_ERROR'}
    
    def get_riot_ranked_stats(self, summoner_id: str, region: str = 'na1') -> Dict[str, Any]:
        """Riot Games 랭크 정보 조회
        
        Args:
            summoner_id: 소환사 ID
            region: 지역
            
        Returns:
            랭크 정보 또는 에러 메시지
        """
        if not self.riot_api_key:
            return {'error': 'Riot API 키가 설정되지 않았습니다.', 'code': 'NO_API_KEY'}
        
        try:
            url = f'https://{region}.api.riotgames.com/lol/league/v4/entries/by-summoner/{summoner_id}'
            headers = {'X-Riot-Token': self.riot_api_key}
            response = requests.get(url, headers=headers, timeout=10)
            response.raise_for_status()
            ranked_data = response.json()
            
            return {
                'summoner_id': summoner_id,
                'ranked_queues': ranked_data
            }
        except requests.exceptions.RequestException as e:
            logger.error(f'Riot 랭크 조회 API 요청 실패: {e}')
            return {'error': f'Riot API 요청 실패: {str(e)}', 'code': 'API_ERROR'}
        except Exception as e:
            logger.error(f'Riot 랭크 조회 오류: {e}')
            return {'error': f'오류 발생: {str(e)}', 'code': 'INTERNAL_ERROR'}
