'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function Home() {
  const [prompt, setPrompt] = useState('내 최근 게임 플레이 기록을 분석해 다음 주에 즐기기 좋은 게임을 추천해줘.');
  const [response, setResponse] = useState('');
  const [query, setQuery] = useState('최신 패치노트에서 중요 변경점 요약');
  const [searchResult, setSearchResult] = useState('');
  const [loading, setLoading] = useState<'generate' | 'search' | null>(null);
  const [error, setError] = useState('');

  async function handleGenerate() {
    setError(''); setLoading('generate'); setResponse('');
    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, max_tokens: 512 }),
      });
      const data = await res.json();
      setResponse(data.text ?? data.detail ?? data.error ?? '응답이 없습니다.');
    } catch (err) {
      setError('서버 호출 실패: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setLoading(null);
    }
  }

  async function handleSearch() {
    setError(''); setLoading('search'); setSearchResult('');
    try {
      const res = await fetch('/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, top_k: 5 }),
      });
      const data = await res.json();
      setSearchResult(JSON.stringify(data, null, 2));
    } catch (err) {
      setError('검색 호출 실패: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setLoading(null);
    }
  }

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 p-6">
      <div className="mx-auto max-w-4xl space-y-8">

        {/* 헤더 */}
        <div>
          <h1 className="text-4xl font-bold text-emerald-300">게임 플레이 어시스턴트</h1>
          <p className="mt-2 text-slate-400">AI 게임 추천, 벡터 검색, Steam · Riot Games 정보 통합</p>
        </div>

        {/* 에러 */}
        {error && (
          <div className="rounded-xl border border-red-700 bg-red-900/30 px-4 py-3 text-red-300 text-sm flex justify-between">
            {error}
            <button onClick={() => setError('')} className="text-red-400 hover:text-red-200">✕</button>
          </div>
        )}

        {/* 게임 플랫폼 바로가기 */}
        <div className="grid grid-cols-2 gap-4">
          <Link href="/steam"
            className="group rounded-2xl border border-blue-800/50 bg-blue-950/30 p-6 hover:bg-blue-950/60 hover:border-blue-600 transition-all">
            <div className="text-3xl mb-3">🎮</div>
            <h2 className="text-xl font-bold text-blue-300 group-hover:text-blue-200">Steam</h2>
            <p className="mt-1 text-slate-400 text-sm">프로필 · 게임 라이브러리 조회</p>
            <p className="mt-3 text-blue-500 text-sm group-hover:text-blue-400">바로가기 →</p>
          </Link>
          <Link href="/riot"
            className="group rounded-2xl border border-purple-800/50 bg-purple-950/30 p-6 hover:bg-purple-950/60 hover:border-purple-600 transition-all">
            <div className="text-3xl mb-3">⚔️</div>
            <h2 className="text-xl font-bold text-purple-300 group-hover:text-purple-200">Riot Games</h2>
            <p className="mt-1 text-slate-400 text-sm">소환사 정보 · 랭크 통계 조회</p>
            <p className="mt-3 text-purple-500 text-sm group-hover:text-purple-400">바로가기 →</p>
          </Link>
        </div>

        {/* AI 텍스트 생성 */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 space-y-4">
          <div>
            <h2 className="text-xl font-bold text-emerald-300">🤖 AI 텍스트 생성</h2>
            <p className="text-slate-500 text-sm mt-1">Groq 기반 qwen2.5 · llama3 모델</p>
          </div>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            disabled={loading !== null}
            className="w-full rounded-xl border border-slate-700 bg-slate-950 p-4 text-slate-100 outline-none focus:border-emerald-400 transition disabled:opacity-50 resize-none"
            rows={4}
            placeholder="프롬프트를 입력하세요..."
          />
          <button
            onClick={handleGenerate}
            disabled={loading !== null}
            className="rounded-xl bg-emerald-600 px-6 py-3 font-medium text-white hover:bg-emerald-500 disabled:opacity-50 transition"
          >
            {loading === 'generate' ? '생성 중...' : '생성 실행'}
          </button>
          {response && (
            <div className="rounded-xl border border-slate-700 bg-slate-950 p-4">
              <p className="text-xs text-slate-500 mb-2">응답</p>
              <pre className="whitespace-pre-wrap text-slate-200 text-sm max-h-80 overflow-auto leading-relaxed">
                {response}
              </pre>
            </div>
          )}
        </div>

        {/* 벡터 검색 */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 space-y-4">
          <div>
            <h2 className="text-xl font-bold text-sky-300">🔍 벡터 검색</h2>
            <p className="text-slate-500 text-sm mt-1">in-memory 키워드 검색 (Pinecone 연동 시 벡터 검색)</p>
          </div>
          <div className="flex gap-3">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              disabled={loading !== null}
              className="flex-1 rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-slate-100 outline-none focus:border-sky-400 transition disabled:opacity-50"
              placeholder="검색어를 입력하세요..."
            />
            <button
              onClick={handleSearch}
              disabled={loading !== null}
              className="rounded-xl bg-sky-600 px-6 py-3 font-medium text-white hover:bg-sky-500 disabled:opacity-50 transition"
            >
              {loading === 'search' ? '검색 중...' : '검색'}
            </button>
          </div>
          {searchResult && (
            <div className="rounded-xl border border-slate-700 bg-slate-950 p-4">
              <p className="text-xs text-slate-500 mb-2">검색 결과</p>
              <pre className="whitespace-pre-wrap text-slate-200 text-sm max-h-80 overflow-auto">
                {searchResult}
              </pre>
            </div>
          )}
        </div>

      </div>
    </main>
  );
}
