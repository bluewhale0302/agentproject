'use client';

import { useState, useRef, useEffect, useCallback } from 'react';

// ─── 타입 ────────────────────────────────────────────────────────────────────

interface SteamUser {
  steam_id: string; username: string; avatar: string;
  profile_url: string; real_name: string; location: string; persona_state: number;
}
interface SteamGame {
  appid: number; name: string; playtime_forever: number; img_icon_url: string;
}
interface SteamGamesResult { total_games: number; games: SteamGame[]; }
interface ChatMessage { role: 'user' | 'gosya'; content: string; }
interface TopGame { rank: number; appid: number; name: string; players: number; owners: string; }

interface Ball {
  id: number; x: number; y: number;
  vx: number; vy: number;
  r: number; color: string;
  imageUrl?: string; // 게임 이미지 공
  label?: string;
}

// ─── 상수 ────────────────────────────────────────────────────────────────────

const PERSONA_STATE: Record<number, { label: string; color: string }> = {
  0: { label: '오프라인', color: 'text-slate-400' },
  1: { label: '온라인',   color: 'text-emerald-400' },
  2: { label: '바쁨',     color: 'text-yellow-400' },
  3: { label: '자리비움', color: 'text-yellow-400' },
  4: { label: '수면',     color: 'text-blue-400' },
  5: { label: '교환 대기',color: 'text-purple-400' },
  6: { label: '게임 대기',color: 'text-purple-400' },
};

const BALL_COLORS = [
  '#f87171','#fb923c','#fbbf24','#a3e635',
  '#34d399','#38bdf8','#818cf8','#e879f9',
];

function buildSteamContext(user: SteamUser | null, games: SteamGamesResult | null) {
  if (!user) return '';
  const top = games?.games.slice(0, 10)
    .map(g => `${g.name}(${Math.round(g.playtime_forever / 60)}시간)`).join(', ');
  return [
    '[Steam 유저 정보]',
    `닉네임: ${user.username}`,
    user.real_name  ? `실명: ${user.real_name}`   : '',
    user.location   ? `국가: ${user.location}`    : '',
    games           ? `보유 게임: ${games.total_games}개` : '',
    top             ? `많이 플레이한 게임(상위 10): ${top}` : '',
  ].filter(Boolean).join('\n');
}

// ─── 탱탱볼 박스 ─────────────────────────────────────────────────────────────

const BOX_W = 260;
const BOX_H = 400;

function BallBox({ topGames }: { topGames: TopGame[] }) {
  const [balls, setBalls]         = useState<Ball[]>([]);
  const [clickCount, setClickCount] = useState(0);
  const [shaking, setShaking]     = useState(false);
  const [eventMsg, setEventMsg]   = useState('');
  const rafRef   = useRef<number>(0);
  const ballsRef = useRef<Ball[]>([]);
  const countRef = useRef(0);
  const boxRef   = useRef<HTMLDivElement>(null);

  // ── 물리 루프 ──
  useEffect(() => {
    const tick = () => {
      ballsRef.current = ballsRef.current.map(b => {
        let { x, y, vx, vy, r } = b;
        x += vx; y += vy;
        vy += 0.3;
        if (x - r < 0)     { x = r;         vx =  Math.abs(vx) * 0.82; }
        if (x + r > BOX_W) { x = BOX_W - r; vx = -Math.abs(vx) * 0.82; }
        if (y - r < 0)     { y = r;         vy =  Math.abs(vy) * 0.82; }
        if (y + r > BOX_H) { y = BOX_H - r; vy = -Math.abs(vy) * 0.82; vx *= 0.97; }
        return { ...b, x, y, vx, vy };
      });
      setBalls([...ballsRef.current]);
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  // ── 공 추가 ──
  const spawnBall = useCallback((x: number, y: number, isGame = false) => {
    const r     = isGame ? 22 : 10 + Math.random() * 12;
    const speed = isGame ? 5 + Math.random() * 3 : 3 + Math.random() * 3;
    const angle = Math.random() * Math.PI * 2;
    const game  = isGame && topGames.length > 0
      ? topGames[Math.floor(Math.random() * Math.min(topGames.length, 10))]
      : null;
    const ball: Ball = {
      id: Date.now() + Math.random(),
      x, y, r,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      color: BALL_COLORS[Math.floor(Math.random() * BALL_COLORS.length)],
      imageUrl: game ? `https://cdn.cloudflare.steamstatic.com/steam/apps/${game.appid}/capsule_sm_120.jpg` : undefined,
      label: game?.name,
    };
    ballsRef.current = [...ballsRef.current, ball];
    setBalls([...ballsRef.current]);
  }, [topGames]);

  // ── 클릭 ──
  const handleClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    countRef.current += 1;
    setClickCount(countRef.current);
    const n = countRef.current;

    // 10개마다 이벤트
    if (n % 10 === 0) {
      // 게임 이미지 공 3개 폭발
      for (let i = 0; i < 3; i++) {
        setTimeout(() => spawnBall(
          BOX_W / 2 + (Math.random() - 0.5) * 60,
          BOX_H / 2 + (Math.random() - 0.5) * 60,
          true
        ), i * 80);
      }
      const msgs = ['🎮 게임 공 등장!', '🔥 인기 게임 폭발!', '⭐ 스팀 차트 공!', '🚀 레벨업!'];
      setEventMsg(msgs[Math.floor(Math.random() * msgs.length)]);
      setTimeout(() => setEventMsg(''), 2000);
    } else {
      spawnBall(x, y);
    }
  }, [spawnBall]);

  // ── 흔들기 (마우스 드래그로 박스 흔들기) ──
  const shakeRef = useRef(false);
  const handleShake = useCallback(() => {
    if (shakeRef.current || ballsRef.current.length === 0) return;
    shakeRef.current = true;
    setShaking(true);
    // 모든 공에 랜덤 충격
    ballsRef.current = ballsRef.current.map(b => ({
      ...b,
      vx: (Math.random() - 0.5) * 18,
      vy: -Math.random() * 14 - 4,
    }));
    setBalls([...ballsRef.current]);
    setTimeout(() => { setShaking(false); shakeRef.current = false; }, 500);
  }, []);

  const clearBalls = (e: React.MouseEvent) => {
    e.stopPropagation();
    ballsRef.current = [];
    setBalls([]);
    countRef.current = 0;
    setClickCount(0);
  };

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4 flex flex-col gap-3">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold text-slate-300">🎱 탱탱볼</h2>
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500">{balls.length}개</span>
          <button onClick={handleShake} disabled={balls.length === 0}
            title="흔들기"
            className="text-xs px-2 py-0.5 rounded-lg border border-slate-700 text-slate-400 hover:text-white hover:border-slate-500 disabled:opacity-30 transition">
            🫨 흔들기
          </button>
          {balls.length > 0 && (
            <button onClick={clearBalls}
              className="text-xs text-slate-500 hover:text-red-400 transition">초기화</button>
          )}
        </div>
      </div>

      {/* 이벤트 메시지 */}
      {eventMsg && (
        <div className="text-center text-xs font-bold text-yellow-300 animate-bounce bg-yellow-900/30 rounded-lg py-1">
          {eventMsg} ({clickCount}번째 클릭)
        </div>
      )}

      {/* 다음 이벤트까지 */}
      {clickCount > 0 && !eventMsg && (
        <div className="flex items-center gap-1.5">
          <div className="flex-1 h-1 rounded-full bg-slate-800 overflow-hidden">
            <div className="h-full bg-violet-500 rounded-full transition-all"
              style={{ width: `${(clickCount % 10) * 10}%` }} />
          </div>
          <span className="text-xs text-slate-600">{10 - (clickCount % 10)}번 남음</span>
        </div>
      )}

      {/* 박스 */}
      <div
        ref={boxRef}
        onClick={handleClick}
        className={`relative rounded-xl border border-slate-700 bg-slate-950 cursor-crosshair overflow-hidden select-none transition-transform ${shaking ? 'animate-[shake_0.5s_ease-in-out]' : ''}`}
        style={{ width: BOX_W, height: BOX_H }}
      >
        {balls.length === 0 && (
          <p className="absolute inset-0 flex items-center justify-center text-slate-600 text-xs pointer-events-none text-center px-4">
            클릭하면 공이 생겨요<br/>
            <span className="text-slate-700">10번마다 게임 공 이벤트!</span>
          </p>
        )}
        <svg width={BOX_W} height={BOX_H} className="absolute inset-0">
          <defs>
            {balls.filter(b => b.imageUrl).map(b => (
              <clipPath key={`clip-${b.id}`} id={`clip-${b.id}`}>
                <circle cx={b.x} cy={b.y} r={b.r} />
              </clipPath>
            ))}
          </defs>
          {balls.map(b => b.imageUrl ? (
            <g key={b.id}>
              <circle cx={b.x} cy={b.y} r={b.r} fill="#1e293b" stroke="#818cf8" strokeWidth={2} />
              <image
                href={b.imageUrl}
                x={b.x - b.r} y={b.y - b.r}
                width={b.r * 2} height={b.r * 2}
                clipPath={`url(#clip-${b.id})`}
                preserveAspectRatio="xMidYMid slice"
              />
            </g>
          ) : (
            <circle key={b.id} cx={b.x} cy={b.y} r={b.r} fill={b.color} opacity={0.92} />
          ))}
        </svg>
      </div>
    </div>
  );
}

// ─── Steam 인기 게임 슬라이드 ─────────────────────────────────────────────────

function TopGamesSlide({ onGamesLoaded }: { onGamesLoaded?: (games: TopGame[]) => void }) {
  const [games, setGames] = useState<TopGame[]>([]);
  const [loading, setLoading] = useState(true);
  const [idx, setIdx] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    fetch('/api/games/steam/top')
      .then(r => r.json())
      .then(d => {
        const g = d.games ?? [];
        setGames(g);
        setLoading(false);
        onGamesLoaded?.(g);
      })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (games.length === 0) return;
    timerRef.current = setInterval(() => {
      setIdx(i => (i + 1) % games.length);
    }, 3000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [games]);

  const go = (dir: 1 | -1) => {
    if (timerRef.current) clearInterval(timerRef.current);
    setIdx(i => (i + dir + games.length) % games.length);
  };

  const formatPlayers = (n: number) =>
    n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n);

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4 flex flex-col gap-3">
      <h2 className="text-sm font-bold text-slate-300">🔥 Steam 인기 게임</h2>

      {loading ? (
        <div className="flex items-center justify-center h-[400px]">
          <span className="text-slate-500 text-xs animate-pulse">불러오는 중...</span>
        </div>
      ) : games.length === 0 ? (
        <div className="flex items-center justify-center h-[400px]">
          <span className="text-slate-500 text-xs">데이터를 불러올 수 없어요</span>
        </div>
      ) : (
        <div className="flex flex-col gap-3" style={{ width: BOX_W }}>
          {/* 메인 카드 */}
          <div className="relative rounded-xl border border-slate-700 bg-slate-950 overflow-hidden"
            style={{ height: 220 }}>
            <img
              src={`https://cdn.cloudflare.steamstatic.com/steam/apps/${games[idx].appid}/header.jpg`}
              alt={games[idx].name}
              className="w-full h-full object-cover opacity-80"
              onError={(e) => { (e.target as HTMLImageElement).src = ''; }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 p-3">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-bold text-yellow-400 bg-yellow-900/50 px-1.5 py-0.5 rounded">
                  #{games[idx].rank}
                </span>
                {games[idx].players > 0 && (
                  <span className="text-xs text-emerald-400">
                    🟢 {formatPlayers(games[idx].players)} 동접
                  </span>
                )}
              </div>
              <p className="text-white font-bold text-sm leading-tight line-clamp-2">
                {games[idx].name}
              </p>
            </div>
            {/* 좌우 버튼 */}
            <button onClick={() => go(-1)}
              className="absolute left-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-black/50 text-white text-xs hover:bg-black/80 transition flex items-center justify-center">
              ‹
            </button>
            <button onClick={() => go(1)}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-black/50 text-white text-xs hover:bg-black/80 transition flex items-center justify-center">
              ›
            </button>
          </div>

          {/* 인디케이터 */}
          <div className="flex justify-center gap-1">
            {games.map((_, i) => (
              <button key={i} onClick={() => setIdx(i)}
                className={`rounded-full transition-all ${i === idx ? 'w-4 h-1.5 bg-blue-400' : 'w-1.5 h-1.5 bg-slate-600 hover:bg-slate-400'}`} />
            ))}
          </div>

          {/* 목록 */}
          <div className="space-y-1 max-h-[148px] overflow-y-auto pr-1">
            {games.map((g, i) => (
              <button key={g.appid} onClick={() => setIdx(i)}
                className={`w-full flex items-center gap-2 rounded-lg px-2 py-1.5 text-left transition ${i === idx ? 'bg-blue-900/40 border border-blue-800/50' : 'hover:bg-slate-800'}`}>
                <span className={`text-xs font-bold w-5 shrink-0 ${i === idx ? 'text-yellow-400' : 'text-slate-500'}`}>
                  {g.rank}
                </span>
                <img
                  src={`https://cdn.cloudflare.steamstatic.com/steam/apps/${g.appid}/capsule_sm_120.jpg`}
                  alt={g.name}
                  className="w-8 h-5 rounded object-cover shrink-0"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                />
                <span className="text-slate-200 text-xs truncate flex-1">{g.name}</span>
                {g.players > 0 && (
                  <span className="text-emerald-500 text-xs shrink-0">{formatPlayers(g.players)}</span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── 메인 페이지 ──────────────────────────────────────────────────────────────

export default function Home() {
  const [steamId, setSteamId]   = useState('');
  const [user, setUser]         = useState<SteamUser | null>(null);
  const [games, setGames]       = useState<SteamGamesResult | null>(null);
  const [steamLoading, setSteamLoading] = useState(false);
  const [steamError, setSteamError]     = useState('');
  const [topGames, setTopGames] = useState<TopGame[]>([]);

  const [messages, setMessages] = useState<ChatMessage[]>([{
    role: 'gosya',
    content: '안녕하세요! 저는 고스야예요 🎮\nSteam 정보를 불러오면 게임 취향에 맞는 추천이나 이야기를 나눌 수 있어요!',
  }]);
  const [input, setInput]       = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function fetchAll() {
    if (!steamId.trim()) { setSteamError('Steam ID를 입력하세요.'); return; }
    setSteamError(''); setSteamLoading(true); setUser(null); setGames(null);
    try {
      const [uRes, gRes] = await Promise.all([
        fetch('/api/games/steam/user',  { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ steam_id: steamId.trim() }) }),
        fetch('/api/games/steam/games', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ steam_id: steamId.trim() }) }),
      ]);
      const uData = await uRes.json();
      const gData = await gRes.json();
      if (!uRes.ok) { setSteamError(uData.detail ?? `오류 (${uRes.status})`); return; }
      setUser(uData);
      if (gRes.ok) setGames(gData);
      setMessages(prev => [...prev, {
        role: 'gosya',
        content: `${uData.username}님 반가워요! 🎉\n${gData.total_games ? `게임 ${gData.total_games}개 보유 중이시네요. ` : ''}뭐든 물어보세요!`,
      }]);
    } catch (e) {
      setSteamError('요청 실패: ' + (e instanceof Error ? e.message : String(e)));
    } finally {
      setSteamLoading(false);
    }
  }

  async function sendMessage() {
    const text = input.trim();
    if (!text || chatLoading) return;
    setMessages(prev => [...prev, { role: 'user', content: text }]);
    setInput(''); setChatLoading(true);

    const ctx = buildSteamContext(user, games);
    const prompt = [
      '당신은 고스야(Gosya)라는 게임 전문 AI 어시스턴트입니다. 친근하고 유쾌한 한국어로 대화합니다.',
      ctx ? `\n[Steam 정보]\n${ctx}` : '\n아직 Steam 정보가 없습니다.',
      `\n유저: ${text}\n고스야:`,
    ].join('');

    try {
      const res  = await fetch('/api/generate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ prompt, max_tokens: 512, temperature: 0.85 }) });
      const data = await res.json();
      if (!res.ok) { setMessages(prev => [...prev, { role: 'gosya', content: `오류: ${data.detail ?? res.status}` }]); return; }
      setMessages(prev => [...prev, { role: 'gosya', content: data.text ?? '응답 없음' }]);
    } catch {
      setMessages(prev => [...prev, { role: 'gosya', content: '앗, 오류가 발생했어요. 잠시 후 다시 시도해주세요.' }]);
    } finally {
      setChatLoading(false);
    }
  }

  const ps = user ? (PERSONA_STATE[user.persona_state] ?? { label: '알 수 없음', color: 'text-slate-400' }) : null;

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 px-4 py-6">
      {/* 헤더 */}
      <div className="text-center mb-6">
        <h1 className="text-3xl font-bold text-blue-300">🎮 게임 플레이 어시스턴트</h1>
        <p className="mt-1 text-slate-500 text-sm">Steam 정보를 불러오고 AI 고스야와 대화해보세요</p>
      </div>

      {/* 3열 레이아웃 */}
      <div className="flex gap-4 items-start justify-center flex-wrap xl:flex-nowrap">

        {/* ── 왼쪽: 탱탱볼 ── */}
        <div className="shrink-0">
          <BallBox topGames={topGames} />
        </div>

        {/* ── 가운데: Steam + 고스야 ── */}
        <div className="flex-1 min-w-0 max-w-2xl space-y-4">

          {/* Steam 조회 */}
          <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5 space-y-3">
            <h2 className="text-base font-bold text-blue-300">Steam 계정 정보</h2>
            <div className="flex gap-2">
              <input
                value={steamId}
                onChange={e => setSteamId(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && fetchAll()}
                placeholder="Steam ID (예: 76561198000000000)"
                className="flex-1 rounded-xl border border-slate-700 bg-slate-950 px-4 py-2.5 text-slate-100 outline-none focus:border-blue-400 transition text-sm"
              />
              <button onClick={fetchAll} disabled={steamLoading}
                className="rounded-xl bg-blue-600 px-4 py-2.5 font-medium text-white hover:bg-blue-500 disabled:opacity-50 transition text-sm whitespace-nowrap">
                {steamLoading ? '조회 중...' : '조회'}
              </button>
            </div>

            {steamError && (
              <div className="rounded-xl border border-red-800 bg-red-900/30 px-3 py-2 text-red-300 text-sm flex justify-between">
                {steamError}
                <button onClick={() => setSteamError('')} className="ml-2 text-red-400">✕</button>
              </div>
            )}

            {user && (
              <div className="rounded-xl border border-slate-700 bg-slate-950 p-3 flex items-center gap-3">
                {user.avatar && <img src={user.avatar} alt="avatar" className="w-14 h-14 rounded-xl border border-slate-700 shrink-0" />}
                <div className="min-w-0">
                  <p className="font-bold text-white truncate">{user.username}</p>
                  {user.real_name && <p className="text-slate-400 text-xs truncate">{user.real_name}</p>}
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    {ps && <span className={`text-xs ${ps.color}`}>● {ps.label}</span>}
                    {user.location && <span className="text-slate-500 text-xs">📍 {user.location}</span>}
                    {user.profile_url && <a href={user.profile_url} target="_blank" rel="noopener noreferrer" className="text-blue-400 text-xs hover:underline">프로필 →</a>}
                  </div>
                </div>
              </div>
            )}

            {games && (
              <div>
                <p className="text-slate-400 text-xs mb-2">
                  보유 게임 <span className="text-white font-semibold">{games.total_games}개</span>
                  <span className="text-slate-600"> · 상위 20개</span>
                </p>
                <div className="space-y-1 max-h-48 overflow-y-auto pr-1">
                  {games.games.map(g => (
                    <div key={g.appid} className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-900 px-3 py-1.5">
                      <div className="flex items-center gap-2 min-w-0">
                        {g.img_icon_url && (
                          <img src={`https://media.steampowered.com/steamcommunity/public/images/apps/${g.appid}/${g.img_icon_url}.jpg`}
                            alt={g.name} className="w-6 h-6 rounded shrink-0" />
                        )}
                        <span className="text-slate-200 text-xs truncate">{g.name}</span>
                      </div>
                      <span className="text-slate-500 text-xs shrink-0 ml-2">{Math.round(g.playtime_forever / 60)}h</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>

          {/* 고스야 채팅 */}
          <section className="rounded-2xl border border-slate-800 bg-slate-900 flex flex-col" style={{ minHeight: 420 }}>
            <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-800">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-blue-500 flex items-center justify-center text-base shrink-0">🦊</div>
              <div>
                <p className="font-bold text-white text-sm">고스야</p>
                <p className="text-slate-500 text-xs">게임 전문 AI 어시스턴트</p>
              </div>
              {user && <span className="ml-auto text-xs text-emerald-400 bg-emerald-900/30 border border-emerald-800 px-2 py-0.5 rounded-full">Steam 연동됨</span>}
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3" style={{ maxHeight: 360 }}>
              {messages.map((msg, i) => (
                <div key={i} className={`flex gap-2 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                  {msg.role === 'gosya' && (
                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-violet-500 to-blue-500 flex items-center justify-center text-xs shrink-0 mt-0.5">🦊</div>
                  )}
                  <div className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm leading-relaxed whitespace-pre-wrap ${
                    msg.role === 'gosya' ? 'bg-slate-800 text-slate-100 rounded-tl-sm' : 'bg-blue-600 text-white rounded-tr-sm'
                  }`}>{msg.content}</div>
                </div>
              ))}
              {chatLoading && (
                <div className="flex gap-2">
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-violet-500 to-blue-500 flex items-center justify-center text-xs shrink-0">🦊</div>
                  <div className="bg-slate-800 rounded-2xl rounded-tl-sm px-3 py-2.5 flex gap-1 items-center">
                    {[0, 150, 300].map(d => (
                      <span key={d} className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: `${d}ms` }} />
                    ))}
                  </div>
                </div>
              )}
              <div ref={chatBottomRef} />
            </div>

            <div className="px-4 py-3 border-t border-slate-800 flex gap-2">
              <input
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                disabled={chatLoading}
                placeholder={user ? `${user.username}님의 게임에 대해 물어보세요...` : '고스야에게 무엇이든 물어보세요...'}
                className="flex-1 rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-slate-100 outline-none focus:border-violet-400 transition text-sm disabled:opacity-50"
              />
              <button onClick={sendMessage} disabled={chatLoading || !input.trim()}
                className="rounded-xl bg-violet-600 px-4 py-2.5 font-medium text-white hover:bg-violet-500 disabled:opacity-40 transition text-sm">
                전송
              </button>
            </div>
          </section>
        </div>

        {/* ── 오른쪽: Steam 인기 게임 ── */}
        <div className="shrink-0">
          <TopGamesSlide onGamesLoaded={setTopGames} />
        </div>

      </div>
    </main>
  );
}
