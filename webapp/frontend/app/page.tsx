'use client';

import { useState } from 'react';

type TabType = 'generate' | 'search' | 'steam' | 'riot';

export default function Home() {
  const [activeTab, setActiveTab] = useState<TabType>('generate');
  const [prompt, setPrompt] = useState('내 최근 게임 플레이 기록을 분석해 다음 주에 즐기기 좋은 게임을 추천해줘.');
  const [response, setResponse] = useState('');
  const [query, setQuery] = useState('최신 패치노트에서 중요 변경점 요약');
  const [searchResult, setSearchResult] = useState('');
  const [steamId, setSteamId] = useState('');
  const [steamResult, setSteamResult] = useState('');
  const [riotSummonerName, setRiotSummonerName] = useState('');
  const [riotTag, setRiotTag] = useState('');
  const [riotRegion, setRiotRegion] = useState('na1');
  const [riotResult, setRiotResult] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const clearError = () => setError('');

  async function handleGenerate() {
    clearError();
    setLoading(true);
    setResponse('');
    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, max_tokens: 512 }),
      });
      const data = await res.json();
      setResponse(data.text ?? data.detail ?? data.error ?? '응답이 없습니다.');
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError('서버 호출 실패: ' + msg);
      setResponse('');
    } finally {
      setLoading(false);
    }
  }

  async function handleSearch() {
    clearError();
    setLoading(true);
    setSearchResult('');
    try {
      const res = await fetch('/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, top_k: 5 }),
      });
      const data = await res.json();
      setSearchResult(JSON.stringify(data, null, 2));
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError('검색 호출 실패: ' + msg);
      setSearchResult('');
    } finally {
      setLoading(false);
    }
  }

  async function handleSteamUser() {
    clearError();
    if (!steamId.trim()) {
      setError('Steam ID를 입력하세요.');
      return;
    }
    setLoading(true);
    setSteamResult('');
    try {
      const res = await fetch('/api/games/steam/user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ steam_id: steamId }),
      });
      const data = await res.json();
      setSteamResult(JSON.stringify(data, null, 2));
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError('Steam API 호출 실패: ' + msg);
    } finally {
      setLoading(false);
    }
  }

  async function handleSteamGames() {
    clearError();
    if (!steamId.trim()) {
      setError('Steam ID를 입력하세요.');
      return;
    }
    setLoading(true);
    setSteamResult('');
    try {
      const res = await fetch('/api/games/steam/games', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ steam_id: steamId }),
      });
      const data = await res.json();
      setSteamResult(JSON.stringify(data, null, 2));
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError('Steam 게임 조회 실패: ' + msg);
    } finally {
      setLoading(false);
    }
  }

  async function handleRiotSummoner() {
    clearError();
    if (!riotSummonerName.trim() || !riotTag.trim()) {
      setError('소환사명과 태그를 입력하세요.');
      return;
    }
    setLoading(true);
    setRiotResult('');
    try {
      const res = await fetch('/api/riot/summoner', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ summoner_name: riotSummonerName, tag: riotTag, region: riotRegion }),
      });
      const data = await res.json();
      setRiotResult(JSON.stringify(data, null, 2));
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError('Riot API 호출 실패: ' + msg);
    } finally {
      setLoading(false);
    }
  }

  async function handleRiotRanked() {
    clearError();
    if (!riotSummonerName.trim() || !riotTag.trim()) {
      setError('소환사명과 태그를 입력하세요.');
      return;
    }
    setLoading(true);
    setRiotResult('');
    try {
      const res = await fetch('/api/riot/ranked', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ summoner_name: riotSummonerName, tag: riotTag, region: riotRegion }),
      });
      const data = await res.json();
      setRiotResult(JSON.stringify(data, null, 2));
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError('Riot 랭크 조회 실패: ' + msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 p-6">
      <div className="mx-auto max-w-6xl">
        <div className="rounded-3xl border border-slate-800 bg-slate-900/90 p-8 shadow-2xl shadow-slate-950/20">
          <h1 className="text-4xl font-semibold text-emerald-300">게임 플레이 어시스턴트</h1>
          <p className="mt-3 text-slate-400">
            AI 모델을 활용한 게임 추천, 벡터 검색 기반 정보 조회, Steam과 Riot Games API 통합
          </p>

          {error && (
            <div className="mt-6 rounded-2xl border border-red-700 bg-red-900/30 p-4 text-red-200">
              {error}
              <button onClick={clearError} className="ml-4 text-red-100 underline">닫기</button>
            </div>
          )}

          <div className="mt-8 grid gap-4 md:grid-cols-2">
            <div className="rounded-3xl border border-slate-800 bg-slate-950/80 p-6">
              <h2 className="text-xl font-semibold text-white">🤖 AI 텍스트 생성</h2>
              <p className="mt-3 text-slate-400">Qwen2.5, Llama3, Llama3.2 모델을 사용한 텍스트 생성</p>
            </div>
            <div className="rounded-3xl border border-slate-800 bg-slate-950/80 p-6">
              <h2 className="text-xl font-semibold text-white">🔍 벡터 검색</h2>
              <p className="mt-3 text-slate-400">ChromaDB 기반 문서 검색 및 유사도 분석</p>
            </div>
            <div className="rounded-3xl border border-slate-800 bg-slate-950/80 p-6">
              <h2 className="text-xl font-semibold text-white">🎮 Steam 정보</h2>
              <p className="mt-3 text-slate-400">Steam 사용자 프로필과 게임 라이브러리 조회</p>
            </div>
            <div className="rounded-3xl border border-slate-800 bg-slate-950/80 p-6">
              <h2 className="text-xl font-semibold text-white">⚔️ Riot Games</h2>
              <p className="mt-3 text-slate-400">LOL 소환사 정보 및 랭크 통계 조회</p>
            </div>
          </div>

          <section className="mt-10 space-y-8">
            {/* AI 생성 */}
            <div className="rounded-2xl border border-slate-800 bg-slate-950/50 p-6">
              <h2 className="text-2xl font-semibold text-emerald-300">AI 텍스트 생성</h2>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                disabled={loading}
                className="mt-4 w-full rounded-xl border border-slate-700 bg-slate-950 p-4 text-slate-100 outline-none transition disabled:opacity-50 focus:border-emerald-400"
                rows={5}
                placeholder="생성할 텍스트에 대해 설명하세요..."
              />
              <button
                onClick={handleGenerate}
                disabled={loading}
                className="mt-4 rounded-xl bg-emerald-500 px-6 py-3 font-medium text-slate-950 transition hover:bg-emerald-400 disabled:opacity-50"
              >
                {loading ? '생성 중...' : '생성 실행'}
              </button>
              {response && (
                <div className="mt-4 rounded-xl border border-slate-700 bg-slate-950 p-4">
                  <p className="text-sm text-slate-400">응답:</p>
                  <pre className="mt-2 whitespace-pre-wrap text-slate-200 text-sm max-h-96 overflow-auto">
                    {response}
                  </pre>
                </div>
              )}
            </div>

            {/* 벡터 검색 */}
            <div className="rounded-2xl border border-slate-800 bg-slate-950/50 p-6">
              <h2 className="text-2xl font-semibold text-sky-300">벡터 검색</h2>
              <div className="mt-4 flex gap-3">
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  disabled={loading}
                  className="flex-1 rounded-xl border border-slate-700 bg-slate-950 p-4 text-slate-100 outline-none transition disabled:opacity-50 focus:border-sky-400"
                  placeholder="검색할 텍스트를 입력하세요..."
                />
                <button
                  onClick={handleSearch}
                  disabled={loading}
                  className="rounded-xl bg-sky-500 px-6 py-3 font-medium text-slate-950 transition hover:bg-sky-400 disabled:opacity-50"
                >
                  {loading ? '검색 중...' : '검색'}
                </button>
              </div>
              {searchResult && (
                <div className="mt-4 rounded-xl border border-slate-700 bg-slate-950 p-4">
                  <p className="text-sm text-slate-400">검색 결과:</p>
                  <pre className="mt-2 whitespace-pre-wrap text-slate-200 text-sm max-h-96 overflow-auto">
                    {searchResult}
                  </pre>
                </div>
              )}
            </div>

            {/* Steam 조회 */}
            <div className="rounded-2xl border border-slate-800 bg-slate-950/50 p-6">
              <h2 className="text-2xl font-semibold text-blue-300">Steam 정보 조회</h2>
              <input
                value={steamId}
                onChange={(e) => setSteamId(e.target.value)}
                disabled={loading}
                className="mt-4 w-full rounded-xl border border-slate-700 bg-slate-950 p-4 text-slate-100 outline-none transition disabled:opacity-50 focus:border-blue-400"
                placeholder="Steam ID 입력 (예: 76561198000000000)"
              />
              <div className="mt-4 flex gap-3">
                <button
                  onClick={handleSteamUser}
                  disabled={loading}
                  className="rounded-xl bg-blue-500 px-6 py-3 font-medium text-slate-950 transition hover:bg-blue-400 disabled:opacity-50"
                >
                  {loading ? '조회 중...' : '사용자 정보'}
                </button>
                <button
                  onClick={handleSteamGames}
                  disabled={loading}
                  className="rounded-xl bg-blue-500 px-6 py-3 font-medium text-slate-950 transition hover:bg-blue-400 disabled:opacity-50"
                >
                  {loading ? '조회 중...' : '게임 목록'}
                </button>
              </div>
              {steamResult && (
                <div className="mt-4 rounded-xl border border-slate-700 bg-slate-950 p-4">
                  <p className="text-sm text-slate-400">Steam 정보:</p>
                  <pre className="mt-2 whitespace-pre-wrap text-slate-200 text-sm max-h-96 overflow-auto">
                    {steamResult}
                  </pre>
                </div>
              )}
            </div>

            {/* Riot Games 조회 */}
            <div className="rounded-2xl border border-slate-800 bg-slate-950/50 p-6">
              <h2 className="text-2xl font-semibold text-purple-300">Riot Games (LOL) 정보 조회</h2>
              <div className="mt-4 grid gap-3 md:grid-cols-3">
                <input
                  value={riotSummonerName}
                  onChange={(e) => setRiotSummonerName(e.target.value)}
                  disabled={loading}
                  className="rounded-xl border border-slate-700 bg-slate-950 p-4 text-slate-100 outline-none transition disabled:opacity-50 focus:border-purple-400"
                  placeholder="소환사명 (예: Faker)"
                />
                <input
                  value={riotTag}
                  onChange={(e) => setRiotTag(e.target.value)}
                  disabled={loading}
                  className="rounded-xl border border-slate-700 bg-slate-950 p-4 text-slate-100 outline-none transition disabled:opacity-50 focus:border-purple-400"
                  placeholder="태그 (예: KR1)"
                />
                <select
                  value={riotRegion}
                  onChange={(e) => setRiotRegion(e.target.value)}
                  disabled={loading}
                  className="rounded-xl border border-slate-700 bg-slate-950 p-4 text-slate-100 outline-none transition disabled:opacity-50 focus:border-purple-400"
                >
                  <option value="na1">NA</option>
                  <option value="euw1">EU</option>
                  <option value="kr">KR</option>
                  <option value="br1">BR</option>
                  <option value="la1">LA1</option>
                  <option value="la2">LA2</option>
                </select>
              </div>
              <div className="mt-4 flex gap-3">
                <button
                  onClick={handleRiotSummoner}
                  disabled={loading}
                  className="rounded-xl bg-purple-500 px-6 py-3 font-medium text-slate-950 transition hover:bg-purple-400 disabled:opacity-50"
                >
                  {loading ? '조회 중...' : '소환사 정보'}
                </button>
                <button
                  onClick={handleRiotRanked}
                  disabled={loading}
                  className="rounded-xl bg-purple-500 px-6 py-3 font-medium text-slate-950 transition hover:bg-purple-400 disabled:opacity-50"
                >
                  {loading ? '조회 중...' : '랭크 정보'}
                </button>
              </div>
              {riotResult && (
                <div className="mt-4 rounded-xl border border-slate-700 bg-slate-950 p-4">
                  <p className="text-sm text-slate-400">Riot Games 정보:</p>
                  <pre className="mt-2 whitespace-pre-wrap text-slate-200 text-sm max-h-96 overflow-auto">
                    {riotResult}
                  </pre>
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
