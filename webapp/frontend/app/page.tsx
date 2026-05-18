'use client';

import { useState, useRef, useEffect } from 'react';

// ─── 타입 ────────────────────────────────────────────────────────────────────

interface SteamUser {
  steam_id: string;
  username: string;
  avatar: string;
  profile_url: string;
  real_name: string;
  location: string;
  persona_state: number;
}

interface SteamGame {
  appid: number;
  name: string;
  playtime_forever: number;
  img_icon_url: string;
}

interface SteamGamesResult {
  total_games: number;
  games: SteamGame[];
}

interface ChatMessage {
  role: 'user' | 'gosya';
  content: string;
}

// ─── 상수 ────────────────────────────────────────────────────────────────────

const PERSONA_STATE: Record<number, { label: string; color: string }> = {
  0: { label: '오프라인', color: 'text-slate-400' },
  1: { label: '온라인', color: 'text-emerald-400' },
  2: { label: '바쁨', color: 'text-yellow-400' },
  3: { label: '자리비움', color: 'text-yellow-400' },
  4: { label: '수면', color: 'text-blue-400' },
  5: { label: '교환 대기', color: 'text-purple-400' },
  6: { label: '게임 대기', color: 'text-purple-400' },
};

// ─── 유틸 ────────────────────────────────────────────────────────────────────

function buildSteamContext(user: SteamUser | null, games: SteamGamesResult | null): string {
  if (!user) return '';
  const topGames = games?.games
    .slice(0, 10)
    .map((g) => `${g.name}(${Math.round(g.playtime_forever / 60)}시간)`)
    .join(', ');
  return [
    `[Steam 유저 정보]`,
    `닉네임: ${user.username}`,
    user.real_name ? `실명: ${user.real_name}` : '',
    user.location ? `국가: ${user.location}` : '',
    games ? `보유 게임 수: ${games.total_games}개` : '',
    topGames ? `많이 플레이한 게임(상위 10개): ${topGames}` : '',
  ]
    .filter(Boolean)
    .join('\n');
}

// ─── 컴포넌트 ─────────────────────────────────────────────────────────────────

export default function Home() {
  // Steam 상태
  const [steamId, setSteamId] = useState('');
  const [user, setUser] = useState<SteamUser | null>(null);
  const [games, setGames] = useState<SteamGamesResult | null>(null);
  const [steamLoading, setSteamLoading] = useState<'user' | 'games' | null>(null);
  const [steamError, setSteamError] = useState('');

  // 채팅 상태
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: 'gosya',
      content: '안녕하세요! 저는 고스야예요 🎮\nSteam 정보를 불러오면 게임 취향에 맞는 추천이나 이야기를 나눌 수 있어요. 위에서 Steam ID를 조회해보세요!',
    },
  ]);
  const [input, setInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  // 채팅창 자동 스크롤
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // ── Steam 조회 ──────────────────────────────────────────────────────────────

  async function fetchAll() {
    if (!steamId.trim()) { setSteamError('Steam ID를 입력하세요.'); return; }
    setSteamError('');
    setSteamLoading('user');
    setUser(null);
    setGames(null);

    try {
      const [userRes, gamesRes] = await Promise.all([
        fetch('/api/games/steam/user', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ steam_id: steamId.trim() }),
        }),
        fetch('/api/games/steam/games', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ steam_id: steamId.trim() }),
        }),
      ]);

      // 에러 응답도 JSON으로 파싱해서 detail 메시지 표시
      const userData = await userRes.json();
      const gamesData = await gamesRes.json();

      if (!userRes.ok) {
        setSteamError(userData.detail ?? userData.error ?? `서버 오류 (${userRes.status})`);
        return;
      }
      if (userData.error) { setSteamError(userData.error); return; }
      setUser(userData);
      if (gamesRes.ok && !gamesData.error) setGames(gamesData);

      // 조회 성공 시 고스야 인사
      setMessages((prev) => [
        ...prev,
        {
          role: 'gosya',
          content: `${userData.username}님의 Steam 정보를 불러왔어요! 🎉\n${gamesData.total_games ? `총 ${gamesData.total_games}개의 게임을 보유하고 계시네요. ` : ''}게임 추천이나 플레이 스타일에 대해 물어보세요!`,
        },
      ]);
    } catch (e) {
      setSteamError('요청 실패: ' + (e instanceof Error ? e.message : String(e)));
    } finally {
      setSteamLoading(null);
    }
  }

  // ── 고스야 채팅 ─────────────────────────────────────────────────────────────

  async function sendMessage() {
    const text = input.trim();
    if (!text || chatLoading) return;

    const userMsg: ChatMessage = { role: 'user', content: text };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setChatLoading(true);

    const steamContext = buildSteamContext(user, games);
    const systemPrompt = [
      '당신은 고스야(Gosya)라는 이름의 게임 전문 AI 어시스턴트입니다.',
      '친근하고 유쾌한 말투로 대화하며, 게임 추천과 플레이 분석을 잘합니다.',
      '한국어로 대화합니다.',
      steamContext ? `\n아래는 현재 유저의 Steam 정보입니다. 이를 바탕으로 맞춤형 답변을 해주세요:\n${steamContext}` : '\n아직 Steam 정보가 없습니다. 정보가 있으면 더 맞춤형 추천이 가능하다고 안내해주세요.',
    ].join('\n');

    const fullPrompt = `${systemPrompt}\n\n유저: ${text}\n고스야:`;

    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: fullPrompt, max_tokens: 512, temperature: 0.85 }),
      });
      const data = await res.json();
      if (!res.ok) {
        const errMsg = data.detail ?? data.error ?? `서버 오류 (${res.status})`;
        setMessages((prev) => [...prev, { role: 'gosya', content: `오류: ${errMsg}` }]);
        return;
      }
      const reply = data.text ?? '응답을 받지 못했어요.';
      setMessages((prev) => [...prev, { role: 'gosya', content: reply }]);
    } catch (e) {
      setMessages((prev) => [
        ...prev,
        { role: 'gosya', content: '앗, 오류가 발생했어요. 잠시 후 다시 시도해주세요.' },
      ]);
    } finally {
      setChatLoading(false);
    }
  }

  // ── 렌더 ────────────────────────────────────────────────────────────────────

  const personaState = user ? (PERSONA_STATE[user.persona_state] ?? { label: '알 수 없음', color: 'text-slate-400' }) : null;

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto max-w-3xl px-4 py-8 space-y-6">

        {/* ── 헤더 ── */}
        <div className="text-center">
          <h1 className="text-3xl font-bold text-blue-300">🎮 게임 플레이 어시스턴트</h1>
          <p className="mt-1 text-slate-500 text-sm">Steam 정보를 불러오고 AI 고스야와 대화해보세요</p>
        </div>

        {/* ── Steam 정보 조회 ── */}
        <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6 space-y-4">
          <h2 className="text-lg font-bold text-blue-300">Steam 계정 정보</h2>

          <div className="flex gap-3">
            <input
              value={steamId}
              onChange={(e) => setSteamId(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && fetchAll()}
              placeholder="Steam ID 입력 (예: 76561198000000000)"
              className="flex-1 rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-slate-100 outline-none focus:border-blue-400 transition text-sm"
            />
            <button
              onClick={fetchAll}
              disabled={steamLoading !== null}
              className="rounded-xl bg-blue-600 px-5 py-3 font-medium text-white hover:bg-blue-500 disabled:opacity-50 transition text-sm whitespace-nowrap"
            >
              {steamLoading ? '조회 중...' : '조회'}
            </button>
          </div>

          {steamError && (
            <div className="rounded-xl border border-red-800 bg-red-900/30 px-4 py-2 text-red-300 text-sm flex justify-between">
              {steamError}
              <button onClick={() => setSteamError('')} className="text-red-400 ml-3">✕</button>
            </div>
          )}

          {/* 프로필 카드 */}
          {user && (
            <div className="rounded-xl border border-slate-700 bg-slate-950 p-4 flex items-center gap-4">
              {user.avatar && (
                <img src={user.avatar} alt="avatar" className="w-16 h-16 rounded-xl border border-slate-700 shrink-0" />
              )}
              <div className="min-w-0">
                <p className="font-bold text-white text-lg truncate">{user.username}</p>
                {user.real_name && <p className="text-slate-400 text-sm truncate">{user.real_name}</p>}
                <div className="flex items-center gap-3 mt-1 flex-wrap">
                  {personaState && (
                    <span className={`text-xs font-medium ${personaState.color}`}>● {personaState.label}</span>
                  )}
                  {user.location && <span className="text-slate-500 text-xs">📍 {user.location}</span>}
                  {user.profile_url && (
                    <a href={user.profile_url} target="_blank" rel="noopener noreferrer"
                      className="text-blue-400 text-xs hover:underline">프로필 열기 →</a>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* 게임 목록 */}
          {games && (
            <div>
              <p className="text-slate-400 text-sm mb-2">
                보유 게임 <span className="text-white font-semibold">{games.total_games}개</span>
                <span className="text-slate-600"> (상위 20개 표시)</span>
              </p>
              <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                {games.games.map((game) => (
                  <div key={game.appid}
                    className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-900 px-3 py-2">
                    <div className="flex items-center gap-2 min-w-0">
                      {game.img_icon_url && (
                        <img
                          src={`https://media.steampowered.com/steamcommunity/public/images/apps/${game.appid}/${game.img_icon_url}.jpg`}
                          alt={game.name}
                          className="w-7 h-7 rounded shrink-0"
                        />
                      )}
                      <span className="text-slate-200 text-sm truncate">{game.name}</span>
                    </div>
                    <span className="text-slate-500 text-xs shrink-0 ml-2">
                      {Math.round(game.playtime_forever / 60)}시간
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>

        {/* ── 고스야 채팅 ── */}
        <section className="rounded-2xl border border-slate-800 bg-slate-900 flex flex-col" style={{ minHeight: '480px' }}>
          {/* 채팅 헤더 */}
          <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-800">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-violet-500 to-blue-500 flex items-center justify-center text-lg shrink-0">
              🦊
            </div>
            <div>
              <p className="font-bold text-white text-sm">고스야</p>
              <p className="text-slate-500 text-xs">게임 전문 AI 어시스턴트</p>
            </div>
            {user && (
              <span className="ml-auto text-xs text-emerald-400 bg-emerald-900/30 border border-emerald-800 px-2 py-0.5 rounded-full">
                Steam 연동됨
              </span>
            )}
          </div>

          {/* 메시지 목록 */}
          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4" style={{ maxHeight: '400px' }}>
            {messages.map((msg, i) => (
              <div key={i} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                {/* 아바타 */}
                {msg.role === 'gosya' && (
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-blue-500 flex items-center justify-center text-sm shrink-0 mt-0.5">
                    🦊
                  </div>
                )}
                {/* 말풍선 */}
                <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap ${
                  msg.role === 'gosya'
                    ? 'bg-slate-800 text-slate-100 rounded-tl-sm'
                    : 'bg-blue-600 text-white rounded-tr-sm'
                }`}>
                  {msg.content}
                </div>
              </div>
            ))}

            {/* 로딩 버블 */}
            {chatLoading && (
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-blue-500 flex items-center justify-center text-sm shrink-0">
                  🦊
                </div>
                <div className="bg-slate-800 rounded-2xl rounded-tl-sm px-4 py-3 flex gap-1.5 items-center">
                  <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            )}
            <div ref={chatBottomRef} />
          </div>

          {/* 입력창 */}
          <div className="px-4 py-4 border-t border-slate-800 flex gap-3">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
              disabled={chatLoading}
              placeholder={user ? `${user.username}님의 게임에 대해 물어보세요...` : '고스야에게 무엇이든 물어보세요...'}
              className="flex-1 rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-slate-100 outline-none focus:border-violet-400 transition text-sm disabled:opacity-50"
            />
            <button
              onClick={sendMessage}
              disabled={chatLoading || !input.trim()}
              className="rounded-xl bg-violet-600 px-5 py-3 font-medium text-white hover:bg-violet-500 disabled:opacity-40 transition text-sm"
            >
              전송
            </button>
          </div>
        </section>

      </div>
    </main>
  );
}
