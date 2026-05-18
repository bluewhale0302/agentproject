'use client';

import { useState } from 'react';
import Link from 'next/link';

interface RiotSummoner {
  summoner_name: string;
  tag: string;
  summoner_id: string;
  puuid: string;
  summoner_level: number;
  profile_icon_id: number;
}

interface RankedEntry {
  queueType: string;
  tier: string;
  rank: string;
  leaguePoints: number;
  wins: number;
  losses: number;
  hotStreak: boolean;
  veteran: boolean;
  freshBlood: boolean;
}

interface RiotRanked {
  summoner_id: string;
  ranked_queues: RankedEntry[];
}

const TIER_COLOR: Record<string, string> = {
  IRON: 'text-slate-400',
  BRONZE: 'text-orange-700',
  SILVER: 'text-slate-300',
  GOLD: 'text-yellow-400',
  PLATINUM: 'text-emerald-400',
  EMERALD: 'text-emerald-300',
  DIAMOND: 'text-blue-400',
  MASTER: 'text-purple-400',
  GRANDMASTER: 'text-red-400',
  CHALLENGER: 'text-yellow-300',
};

const QUEUE_LABEL: Record<string, string> = {
  RANKED_SOLO_5x5: '솔로 랭크',
  RANKED_FLEX_SR: '자유 랭크',
  RANKED_TFT: 'TFT 랭크',
};

const REGIONS = [
  { value: 'kr', label: 'KR (한국)' },
  { value: 'na1', label: 'NA (북미)' },
  { value: 'euw1', label: 'EUW (유럽 서부)' },
  { value: 'eun1', label: 'EUNE (유럽 북동)' },
  { value: 'jp1', label: 'JP (일본)' },
  { value: 'br1', label: 'BR (브라질)' },
  { value: 'la1', label: 'LAN' },
  { value: 'la2', label: 'LAS' },
];

export default function RiotPage() {
  const [summonerName, setSummonerName] = useState('');
  const [tag, setTag] = useState('');
  const [region, setRegion] = useState('kr');
  const [summoner, setSummoner] = useState<RiotSummoner | null>(null);
  const [ranked, setRanked] = useState<RiotRanked | null>(null);
  const [loading, setLoading] = useState<'summoner' | 'ranked' | null>(null);
  const [error, setError] = useState('');

  async function fetchSummoner() {
    if (!summonerName.trim() || !tag.trim()) { setError('소환사명과 태그를 모두 입력하세요.'); return; }
    setError(''); setLoading('summoner'); setSummoner(null); setRanked(null);
    try {
      const res = await fetch('/api/games/riot/summoner', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ summoner_name: summonerName.trim(), tag: tag.trim(), region }),
      });
      const data = await res.json();
      if (data.error) { setError(data.error); return; }
      setSummoner(data);
    } catch (e) {
      setError('요청 실패: ' + (e instanceof Error ? e.message : String(e)));
    } finally {
      setLoading(null);
    }
  }

  async function fetchRanked() {
    if (!summonerName.trim() || !tag.trim()) { setError('소환사명과 태그를 모두 입력하세요.'); return; }
    setError(''); setLoading('ranked'); setRanked(null);
    try {
      const res = await fetch('/api/games/riot/ranked', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ summoner_name: summonerName.trim(), tag: tag.trim(), region }),
      });
      const data = await res.json();
      if (data.error) { setError(data.error); return; }
      setRanked(data);
    } catch (e) {
      setError('요청 실패: ' + (e instanceof Error ? e.message : String(e)));
    } finally {
      setLoading(null);
    }
  }

  const winRate = (wins: number, losses: number) =>
    wins + losses > 0 ? Math.round((wins / (wins + losses)) * 100) : 0;

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 p-6">
      <div className="mx-auto max-w-3xl space-y-6">

        {/* 헤더 */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-purple-300">⚔️ Riot Games 정보 조회</h1>
            <p className="mt-1 text-slate-400 text-sm">소환사명과 태그로 LOL 프로필과 랭크를 조회합니다</p>
          </div>
          <Link href="/" className="rounded-xl border border-slate-700 px-4 py-2 text-sm text-slate-300 hover:bg-slate-800 transition">
            ← 홈으로
          </Link>
        </div>

        {/* 입력 */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-300">소환사명</label>
              <input
                value={summonerName}
                onChange={(e) => setSummonerName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && fetchSummoner()}
                placeholder="예: Faker"
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-slate-100 outline-none focus:border-purple-400 transition"
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-300">태그</label>
              <input
                value={tag}
                onChange={(e) => setTag(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && fetchSummoner()}
                placeholder="예: KR1"
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-slate-100 outline-none focus:border-purple-400 transition"
              />
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium text-slate-300">서버</label>
            <select
              value={region}
              onChange={(e) => setRegion(e.target.value)}
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-slate-100 outline-none focus:border-purple-400 transition"
            >
              {REGIONS.map((r) => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
          </div>
          <div className="flex gap-3">
            <button
              onClick={fetchSummoner}
              disabled={loading !== null}
              className="flex-1 rounded-xl bg-purple-600 py-3 font-medium text-white hover:bg-purple-500 disabled:opacity-50 transition"
            >
              {loading === 'summoner' ? '조회 중...' : '소환사 정보'}
            </button>
            <button
              onClick={fetchRanked}
              disabled={loading !== null}
              className="flex-1 rounded-xl bg-slate-700 py-3 font-medium text-white hover:bg-slate-600 disabled:opacity-50 transition"
            >
              {loading === 'ranked' ? '조회 중...' : '랭크 정보'}
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

        {/* 소환사 정보 결과 */}
        {summoner && (
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <h2 className="text-lg font-semibold text-slate-200 mb-4">소환사 프로필</h2>
            <div className="flex items-center gap-5">
              <div className="relative">
                <img
                  src={`https://ddragon.leagueoflegends.com/cdn/14.12.1/img/profileicon/${summoner.profile_icon_id}.png`}
                  alt="profile icon"
                  className="w-20 h-20 rounded-2xl border border-slate-700"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                />
              </div>
              <div className="space-y-1">
                <p className="text-2xl font-bold text-white">
                  {summoner.summoner_name}
                  <span className="text-slate-500 text-lg font-normal"> #{summoner.tag}</span>
                </p>
                <p className="text-slate-400 text-sm">레벨 <span className="text-white font-semibold">{summoner.summoner_level}</span></p>
                <p className="text-slate-600 text-xs font-mono">{summoner.puuid.slice(0, 24)}...</p>
              </div>
            </div>
          </div>
        )}

        {/* 랭크 정보 결과 */}
        {ranked && ranked.ranked_queues.length > 0 && (
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 space-y-3">
            <h2 className="text-lg font-semibold text-slate-200 mb-2">랭크 정보</h2>
            {ranked.ranked_queues.map((entry) => {
              const tierColor = TIER_COLOR[entry.tier] ?? 'text-slate-300';
              const wr = winRate(entry.wins, entry.losses);
              return (
                <div key={entry.queueType} className="rounded-xl border border-slate-800 bg-slate-950 p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-slate-400 text-sm">{QUEUE_LABEL[entry.queueType] ?? entry.queueType}</span>
                    <div className="flex gap-2">
                      {entry.hotStreak && <span className="text-xs bg-red-900/50 text-red-300 px-2 py-0.5 rounded-full">🔥 연승</span>}
                      {entry.veteran && <span className="text-xs bg-yellow-900/50 text-yellow-300 px-2 py-0.5 rounded-full">베테랑</span>}
                    </div>
                  </div>
                  <p className={`text-2xl font-bold ${tierColor}`}>
                    {entry.tier} {entry.rank}
                    <span className="text-slate-400 text-base font-normal ml-2">{entry.leaguePoints} LP</span>
                  </p>
                  <div className="mt-2 flex items-center gap-3 text-sm">
                    <span className="text-emerald-400">{entry.wins}승</span>
                    <span className="text-red-400">{entry.losses}패</span>
                    <span className="text-slate-400">승률 {wr}%</span>
                    {/* 승률 바 */}
                    <div className="flex-1 h-1.5 rounded-full bg-slate-800 overflow-hidden">
                      <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${wr}%` }} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {ranked && ranked.ranked_queues.length === 0 && (
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 text-center text-slate-500">
            랭크 기록이 없습니다.
          </div>
        )}

      </div>
    </main>
  );
}
