'use client';

import { useState } from 'react';
import Link from 'next/link';

interface SteamUser {
  steam_id: string;
  username: string;
  avatar: string;
  profile_url: string;
  real_name: string;
  location: string;
  persona_state: number;
  last_logoff: number;
}

interface SteamGame {
  appid: number;
  name: string;
  playtime_forever: number;
  img_icon_url: string;
}

interface SteamGamesResult {
  steam_id: string;
  total_games: number;
  games: SteamGame[];
}

const PERSONA_STATE: Record<number, { label: string; color: string }> = {
  0: { label: '오프라인', color: 'text-slate-400' },
  1: { label: '온라인', color: 'text-emerald-400' },
  2: { label: '바쁨', color: 'text-yellow-400' },
  3: { label: '자리비움', color: 'text-yellow-400' },
  4: { label: '수면', color: 'text-blue-400' },
  5: { label: '교환 대기', color: 'text-purple-400' },
  6: { label: '게임 대기', color: 'text-purple-400' },
};

export default function SteamPage() {
  const [steamId, setSteamId] = useState('');
  const [userResult, setUserResult] = useState<SteamUser | null>(null);
  const [gamesResult, setGamesResult] = useState<SteamGamesResult | null>(null);
  const [loading, setLoading] = useState<'user' | 'games' | null>(null);
  const [error, setError] = useState('');

  async function fetchUser() {
    if (!steamId.trim()) { setError('Steam ID를 입력하세요.'); return; }
    setError(''); setLoading('user'); setUserResult(null);
    try {
      const res = await fetch('/api/games/steam/user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ steam_id: steamId.trim() }),
      });
      const data = await res.json();
      if (data.error) { setError(data.error); return; }
      setUserResult(data);
    } catch (e) {
      setError('요청 실패: ' + (e instanceof Error ? e.message : String(e)));
    } finally {
      setLoading(null);
    }
  }

  async function fetchGames() {
    if (!steamId.trim()) { setError('Steam ID를 입력하세요.'); return; }
    setError(''); setLoading('games'); setGamesResult(null);
    try {
      const res = await fetch('/api/games/steam/games', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ steam_id: steamId.trim() }),
      });
      const data = await res.json();
      if (data.error) { setError(data.error); return; }
      setGamesResult(data);
    } catch (e) {
      setError('요청 실패: ' + (e instanceof Error ? e.message : String(e)));
    } finally {
      setLoading(null);
    }
  }

  const state = userResult ? (PERSONA_STATE[userResult.persona_state] ?? { label: '알 수 없음', color: 'text-slate-400' }) : null;

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 p-6">
      <div className="mx-auto max-w-3xl space-y-6">

        {/* 헤더 */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-blue-300">🎮 Steam 정보 조회</h1>
            <p className="mt-1 text-slate-400 text-sm">Steam ID로 프로필과 게임 라이브러리를 조회합니다</p>
          </div>
          <Link href="/" className="rounded-xl border border-slate-700 px-4 py-2 text-sm text-slate-300 hover:bg-slate-800 transition">
            ← 홈으로
          </Link>
        </div>

        {/* 입력 */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 space-y-4">
          <label className="block text-sm font-medium text-slate-300">Steam ID</label>
          <input
            value={steamId}
            onChange={(e) => setSteamId(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && fetchUser()}
            placeholder="예: 76561198000000000"
            className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-slate-100 outline-none focus:border-blue-400 transition"
          />
          <div className="flex gap-3">
            <button
              onClick={fetchUser}
              disabled={loading !== null}
              className="flex-1 rounded-xl bg-blue-600 py-3 font-medium text-white hover:bg-blue-500 disabled:opacity-50 transition"
            >
              {loading === 'user' ? '조회 중...' : '프로필 조회'}
            </button>
            <button
              onClick={fetchGames}
              disabled={loading !== null}
              className="flex-1 rounded-xl bg-slate-700 py-3 font-medium text-white hover:bg-slate-600 disabled:opacity-50 transition"
            >
              {loading === 'games' ? '조회 중...' : '게임 목록 조회'}
            </button>
          </div>
        </div>

        {/* 에러 */}
        {error && (
          <div className="rounded-xl border border-red-700 bg-red-900/30 px-4 py-3 text-red-300 text-sm flex justify-between">
            {error}
            <button onClick={() => setError('')} className="text-red-400 hover:text-red-200">✕</button>
          </div>
        )}

        {/* 프로필 결과 */}
        {userResult && (
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <h2 className="text-lg font-semibold text-slate-200 mb-4">프로필</h2>
            <div className="flex items-center gap-5">
              {userResult.avatar && (
                <img src={userResult.avatar} alt="avatar" className="w-20 h-20 rounded-2xl border border-slate-700" />
              )}
              <div className="space-y-1">
                <p className="text-xl font-bold text-white">{userResult.username}</p>
                {userResult.real_name && <p className="text-slate-400 text-sm">{userResult.real_name}</p>}
                {state && <p className={`text-sm font-medium ${state.color}`}>● {state.label}</p>}
                {userResult.location && <p className="text-slate-500 text-sm">📍 {userResult.location}</p>}
                {userResult.profile_url && (
                  <a href={userResult.profile_url} target="_blank" rel="noopener noreferrer"
                    className="text-blue-400 text-sm hover:underline">
                    Steam 프로필 열기 →
                  </a>
                )}
              </div>
            </div>
          </div>
        )}

        {/* 게임 목록 결과 */}
        {gamesResult && (
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <h2 className="text-lg font-semibold text-slate-200 mb-1">게임 라이브러리</h2>
            <p className="text-slate-500 text-sm mb-4">총 {gamesResult.total_games}개 보유 (상위 20개 표시)</p>
            <div className="space-y-2 max-h-[480px] overflow-y-auto pr-1">
              {gamesResult.games.map((game) => (
                <div key={game.appid} className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950 px-4 py-3">
                  <div className="flex items-center gap-3">
                    {game.img_icon_url && (
                      <img
                        src={`https://media.steampowered.com/steamcommunity/public/images/apps/${game.appid}/${game.img_icon_url}.jpg`}
                        alt={game.name}
                        className="w-8 h-8 rounded"
                      />
                    )}
                    <span className="text-slate-200 text-sm">{game.name}</span>
                  </div>
                  <span className="text-slate-500 text-xs whitespace-nowrap">
                    {Math.round(game.playtime_forever / 60)}시간
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </main>
  );
}
