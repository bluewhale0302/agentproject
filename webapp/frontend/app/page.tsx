'use client';

import { useState } from 'react';

export default function Home() {
  const [prompt, setPrompt] = useState('내 최근 게임 플레이 기록을 분석해 다음 주에 즐기기 좋은 게임을 추천해줘.');
  const [response, setResponse] = useState('');
  const [query, setQuery] = useState('최신 패치노트에서 중요 변경점 요약');
  const [searchResult, setSearchResult] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleGenerate() {
    setLoading(true);
    setResponse('');
    try {
      const res = await fetch('http://localhost:8000/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, max_tokens: 180 }),
      });
      const data = await res.json();
      setResponse(data.text ?? data.detail ?? data.error ?? '응답이 없습니다.');
    } catch (error) {
      setResponse('서버 호출 실패: ' + String(error));
    } finally {
      setLoading(false);
    }
  }

  async function handleSearch() {
    setLoading(true);
    setSearchResult('');
    try {
      const res = await fetch('http://localhost:8000/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, top_k: 5 }),
      });
      const data = await res.json();
      setSearchResult(JSON.stringify(data, null, 2));
    } catch (error) {
      setSearchResult('검색 호출 실패: ' + String(error));
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 p-6">
      <div className="mx-auto max-w-6xl rounded-3xl border border-slate-800 bg-slate-900/90 p-8 shadow-2xl shadow-slate-950/20">
        <h1 className="text-4xl font-semibold text-emerald-300">게임 플레이 어시스턴트</h1>
        <p className="mt-3 text-slate-400">
          플레이 기록을 분석해 맞춤형 게임을 추천하고, 방대한 패치노트와 공략 정보를 핵심만 정리해드립니다.
          게이머의 시간과 탐색 비용을 획기적으로 절감하는 개인화형 게임 어시스턴트입니다.
        </p>

        <div className="mt-8 grid gap-4 md:grid-cols-2">
          <div className="rounded-3xl border border-slate-800 bg-slate-950/80 p-6">
            <h2 className="text-xl font-semibold text-white">추천형 AI</h2>
            <p className="mt-3 text-slate-400">사용자의 플레이 히스토리를 반영한 게임 추천과 전략 가이드를 제공합니다.</p>
          </div>
          <div className="rounded-3xl border border-slate-800 bg-slate-950/80 p-6">
            <h2 className="text-xl font-semibold text-white">요약형 정보</h2>
            <p className="mt-3 text-slate-400">패치노트, 공략, 패치 영향까지 핵심만 골라 쉽고 빠르게 확인합니다.</p>
          </div>
          <div className="rounded-3xl border border-slate-800 bg-slate-950/80 p-6">
            <h2 className="text-xl font-semibold text-white">벡터 검색</h2>
            <p className="mt-3 text-slate-400">게임 데이터 검색과 유사 문서 탐색을 통해 필요한 정보에 빠르게 접근합니다.</p>
          </div>
          <div className="rounded-3xl border border-slate-800 bg-slate-950/80 p-6">
            <h2 className="text-xl font-semibold text-white">시간 절약</h2>
            <p className="mt-3 text-slate-400">분석과 요약 기반 콘텐츠로 탐색 비용을 크게 줄여줍니다.</p>
          </div>
        </div>

        <section className="mt-10 space-y-4">
          <div>
            <h2 className="text-2xl font-semibold text-white">맞춤형 질의</h2>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              className="mt-3 w-full rounded-2xl border border-slate-700 bg-slate-950 p-4 text-base text-slate-100 outline-none transition focus:border-emerald-400"
              rows={6}
            />
            <button
              onClick={handleGenerate}
              className="mt-4 rounded-2xl bg-emerald-500 px-6 py-3 font-medium text-slate-950 transition hover:bg-emerald-400 disabled:opacity-40"
              disabled={loading}
            >
              생성 실행
            </button>
            <pre className="mt-4 whitespace-pre-wrap rounded-2xl border border-slate-800 bg-slate-950 p-4 text-slate-200">
              {response || '응답이 여기에 표시됩니다.'}
            </pre>
          </div>

          <div className="mt-10">
            <h2 className="text-2xl font-semibold text-white">검색/벡터 검색</h2>
            <div className="mt-3 flex gap-3">
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="w-full rounded-2xl border border-slate-700 bg-slate-950 p-4 text-base text-slate-100 outline-none"
                placeholder="검색할 텍스트를 입력하세요"
              />
              <button
                onClick={handleSearch}
                className="rounded-2xl bg-sky-500 px-6 py-3 font-medium text-slate-950 transition hover:bg-sky-400 disabled:opacity-40"
                disabled={loading}
              >
                검색 실행
              </button>
            </div>
            <pre className="mt-4 whitespace-pre-wrap rounded-2xl border border-slate-800 bg-slate-950 p-4 text-slate-200">
              {searchResult || '검색 결과가 여기에 표시됩니다.'}
            </pre>
          </div>
        </section>
      </div>
    </main>
  );
}
