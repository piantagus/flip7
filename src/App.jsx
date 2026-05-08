import React, { useState, useEffect } from 'react';
import { Trophy, Plus, X, ArrowLeft, Crown, Users, Target, BarChart3, RotateCcw, AlertTriangle, Zap, TrendingUp, History, Trash2, Calendar, Settings, UserPlus, Edit3, ChevronRight } from 'lucide-react';
import confetti from 'canvas-confetti';

const STORAGE_KEY = 'flip7-data-v1';

// ═══════════════════════════════════════════════
//  DESIGN SYSTEM — Flip 7 Retro Board Game
// ═══════════════════════════════════════════════

const C = {
  teal: '#6DB7B8',
  tealDark: '#5AA6A8',
  tealDeep: '#3D8E90',
  tealShadow: '#2C7072',
  yellow: '#F4D44D',
  yellowBright: '#FFD84D',
  yellowDark: '#E5C13C',
  yellowDeep: '#C4A020',
  red: '#E4574F',
  redDeep: '#D94A43',
  redDark: '#B03030',
  navy: '#2E3A8C',
  navyDark: '#1F2A6B',
  blueLight: '#8FB6D9',
  bluePale: '#A7C7E7',
  green: '#7CCB8A',
  cream: '#F5EBD7',
  creamLight: '#FFF8EC',
  creamDark: '#E8DCBE',
  white: '#FFFFFF',
  ink: '#2B2B2B',
  inkSoft: '#5A6070',
};

const F = {
  display: "'Bungee', 'Impact', sans-serif",
  body: "'DM Sans', system-ui, sans-serif",
  serif: "'DM Serif Display', Georgia, serif",
};

const shadow = (color = C.navyDark, x = 4, y = 4) => `${x}px ${y}px 0 ${color}`;
const shadowSm = (color = C.navyDark) => shadow(color, 3, 3);

// ═══════ STORAGE ═══════
async function loadData() {
  try { 
    const r = localStorage.getItem(STORAGE_KEY); 
    if (r) return JSON.parse(r); 
  } catch {}
  return { players: {}, games: [] };
}

async function saveData(data) {
  try { 
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); 
  } catch {}
}

function updatePlayerStats(players, game) {
  const out = { ...players };
  for (const name of game.players) {
    if (!out[name]) out[name] = { name, gamesPlayed: 0, wins: 0, totalPoints: 0, highestRound: 0, bestGameScore: 0, roundsPlayed: 0 };
    const p = { ...out[name] }; p.gamesPlayed++; if (game.winner === name) p.wins++;
    p.totalPoints += game.finalScores[name];
    if (game.finalScores[name] > p.bestGameScore) p.bestGameScore = game.finalScores[name];
    for (const round of game.rounds) { const r = round.scores[name] ?? 0; p.roundsPlayed++; if (r > p.highestRound) p.highestRound = r; }
    out[name] = p;
  }
  return out;
}
function recalculateStats(games) { let p = {}; for (const g of games) p = updatePlayerStats(p, g); return p; }
function fmtDate(iso) {
  try { const d = new Date(iso); return `${d.toLocaleDateString('es-AR', { day: 'numeric', month: 'short', year: 'numeric' })} · ${d.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}`; } catch { return ''; }
}

// ═══════ DESIGN ATOMS ═══════

function PageBg({ children }) {
  return (
    <div style={{ minHeight: '100vh', background: C.teal, fontFamily: F.body, color: C.ink, position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'fixed', inset: 8, border: `4px solid ${C.yellowDark}`, borderRadius: 20, pointerEvents: 'none', zIndex: 1, opacity: 0.5 }} />
      <div style={{ position: 'fixed', inset: 12, border: `2px solid ${C.navy}30`, borderRadius: 16, pointerEvents: 'none', zIndex: 1, opacity: 0.3 }} />
      <div style={{ position: 'fixed', inset: 0, backgroundImage: `radial-gradient(${C.tealDark} 1px, transparent 1px)`, backgroundSize: '16px 16px', opacity: 0.15, pointerEvents: 'none' }} />
      <div style={{ position: 'relative', maxWidth: 460, margin: '0 auto', padding: '24px 18px 50px', zIndex: 2 }}>
        {children}
      </div>
    </div>
  );
}

function Card({ children, style = {}, glow = false }) {
  return (
    <div style={{
      background: C.cream,
      border: `4px solid ${C.navy}`,
      borderRadius: 16,
      boxShadow: `${shadow(C.navyDark, 5, 5)}${glow ? `, 0 0 20px ${C.yellow}40` : ''}`,
      position: 'relative',
      ...style
    }}>
      <div style={{ position: 'absolute', inset: 3, border: `2px solid ${C.yellowDark}40`, borderRadius: 10, pointerEvents: 'none' }} />
      <div style={{ position: 'relative' }}>{children}</div>
    </div>
  );
}

function Btn({ children, onClick, disabled, variant = 'primary', style = {}, icon: Icon }) {
  const styles = {
    primary: {
      background: `linear-gradient(180deg, ${C.yellowBright} 0%, ${C.yellow} 50%, ${C.yellowDark} 100%)`,
      color: C.ink, border: `4px solid ${C.navy}`,
      boxShadow: shadow(C.navyDark),
      textShadow: `0 1px 0 ${C.yellowBright}`,
    },
    secondary: {
      background: C.cream,
      color: C.navy, border: `4px solid ${C.navy}`,
      boxShadow: shadow(C.navyDark),
    },
    danger: {
      background: `linear-gradient(180deg, ${C.red} 0%, ${C.redDeep} 100%)`,
      color: C.white, border: `4px solid ${C.navyDark}`,
      boxShadow: shadow(C.navyDark),
    }
  };
  const s = styles[variant] || styles.primary;
  return (
    <button onClick={onClick} disabled={disabled} style={{
      width: '100%', borderRadius: 14, padding: '14px 20px',
      fontFamily: F.display, fontSize: 16, letterSpacing: '1px',
      cursor: disabled ? 'not-allowed' : 'pointer',
      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
      opacity: disabled ? 0.5 : 1,
      transition: 'transform 0.1s',
      ...s, ...style
    }}>
      {Icon && <Icon size={20} strokeWidth={2.5} />}{children}
    </button>
  );
}

function HeaderBar({ onBack, title }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18 }}>
      {onBack && (
        <button onClick={onBack} style={{
          background: C.cream, border: `3px solid ${C.navy}`, borderRadius: 12, width: 42, height: 42,
          display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
          boxShadow: shadowSm(), color: C.navy
        }}><ArrowLeft size={22} strokeWidth={3} /></button>
      )}
      <div style={{
        fontFamily: F.display, fontSize: 20, color: C.cream, letterSpacing: '2px',
        textShadow: `2px 2px 0 ${C.navyDark}, -1px -1px 0 ${C.navy}`,
        WebkitTextStroke: `1px ${C.navy}`, paintOrder: 'stroke fill'
      }}>{title}</div>
    </div>
  );
}

function Badge({ text, color = C.red }) {
  return (
    <div style={{
      position: 'absolute', top: -10, left: '50%', transform: 'translateX(-50%)',
      background: color, color: C.white, fontSize: 8, padding: '3px 10px', borderRadius: 999,
      fontFamily: F.display, letterSpacing: '1.5px', border: `3px solid ${C.navyDark}`,
      whiteSpace: 'nowrap', boxShadow: '2px 2px 0 #00000040', zIndex: 5
    }}>{text}</div>
  );
}

function CardsIcon({ size = 30 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round">
      <rect x="8" y="4" width="8" height="15" rx="1.5" transform="rotate(-18 12 18)" fill={C.red} stroke={C.navy} strokeWidth="1.5" />
      <rect x="8" y="4" width="8" height="15" rx="1.5" transform="rotate(18 12 18)" fill={C.blueLight} stroke={C.navy} strokeWidth="1.5" />
      <rect x="8" y="4" width="8" height="15" rx="1.5" fill={C.cream} stroke={C.navy} strokeWidth="1.8" />
      <text x="12" y="14" textAnchor="middle" fontFamily={F.display} fontSize="7" fill={C.navy} fontWeight="bold">7</text>
    </svg>
  );
}

function OptionRow({ icon: Icon, title, subtitle, onClick, danger = false }) {
  return (
    <button onClick={onClick} style={{
      width: '100%', background: danger ? `${C.red}12` : C.creamLight,
      border: `3px solid ${danger ? C.red : C.navy}`, borderRadius: 12, padding: '12px 14px',
      cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 12,
      boxShadow: `3px 3px 0 ${danger ? C.redDark : C.navyDark}`
    }}>
      <div style={{
        width: 36, height: 36, borderRadius: 10,
        background: danger ? `${C.red}20` : C.yellow, border: `2px solid ${danger ? C.red : C.navy}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
      }}><Icon size={18} color={danger ? C.red : C.navy} strokeWidth={2.5} /></div>
      <div style={{ flex: 1 }}>
        <div style={{ fontFamily: F.display, fontSize: 11, color: danger ? C.red : C.navy, letterSpacing: '1px' }}>{title}</div>
        {subtitle && <div style={{ fontFamily: F.body, fontSize: 11, color: C.inkSoft, marginTop: 1 }}>{subtitle}</div>}
      </div>
      <ChevronRight size={16} color={danger ? C.red : C.inkSoft} />
    </button>
  );
}

function Overlay({ children }) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: '#00000080', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, zIndex: 50 }}>
      {children}
    </div>
  );
}

function RankBadge({ rank }) {
  const bg = rank === 1 ? `linear-gradient(135deg, ${C.yellowBright}, ${C.yellowDark})` : rank === 2 ? `linear-gradient(135deg, #d0d0d0, #a0a0a0)` : rank === 3 ? 'linear-gradient(135deg, #cd9b6a, #a07040)' : C.creamDark;
  return (
    <div style={{
      width: 32, height: 32, borderRadius: 999, background: bg,
      border: `3px solid ${C.navy}`, display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: F.display, fontSize: 14, color: C.navy, flexShrink: 0,
      boxShadow: rank === 1 ? `0 0 10px ${C.yellow}60` : '2px 2px 0 #00000020'
    }}>{rank}</div>
  );
}

// ═══════ SCREENS ═══════

function HomeScreen({ data, onNewGame, onRankings, onHistory }) {
  return (
    <PageBg>
      <div style={{ textAlign: 'center', padding: '16px 0 28px' }}>
        <div style={{
          display: 'inline-block', background: C.navy, color: C.cream, padding: '4px 16px',
          borderRadius: 999, fontFamily: F.display, fontSize: 9, letterSpacing: '3px',
          border: `2px solid ${C.yellow}`, marginBottom: 12
        }}>THE COMPANION FOR</div>

        <div style={{ position: 'relative', display: 'inline-block', margin: '8px 0' }}>
          <div style={{ position: 'absolute', top: -8, left: '50%', transform: 'translateX(-50%) rotate(-6deg)', width: 60, height: 80, background: C.red, borderRadius: 8, opacity: 0.6 }} />
          <div style={{ position: 'absolute', top: -8, left: '50%', transform: 'translateX(-42%) rotate(-12deg)', width: 50, height: 70, background: C.blueLight, borderRadius: 8, opacity: 0.4 }} />
          <div style={{ position: 'absolute', top: -8, right: '50%', transform: 'translateX(42%) rotate(12deg)', width: 50, height: 70, background: C.green, borderRadius: 8, opacity: 0.4 }} />

          <div style={{
            position: 'relative',
            fontFamily: F.display, fontSize: 100, lineHeight: 0.82,
            letterSpacing: '4px', transform: 'rotate(-2deg)',
          }}>
            <span style={{
              color: C.yellow,
              WebkitTextStroke: `4px ${C.navy}`,
              paintOrder: 'stroke fill',
              textShadow: `5px 5px 0 ${C.navyDark}`,
            }}>FLIP</span>
            <span style={{
              color: C.red,
              WebkitTextStroke: `4px ${C.navy}`,
              paintOrder: 'stroke fill',
              textShadow: `5px 5px 0 ${C.navyDark}`,
              marginLeft: 6
            }}>7</span>
          </div>
        </div>

        <div style={{
          fontFamily: F.display, fontSize: 11, color: C.cream, letterSpacing: '3px', marginTop: 20,
          textShadow: `1px 1px 0 ${C.navy}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10
        }}>
          <span style={{ color: C.yellow }}>★</span> PRESS YOUR LUCK · SINCE 1994 <span style={{ color: C.yellow }}>★</span>
        </div>
      </div>

      <Card style={{ padding: 16, marginBottom: 16 }} glow>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <div style={{ textAlign: 'center', padding: 8 }}>
            <Trophy size={22} color={C.yellow} fill={C.yellow} style={{ marginBottom: 4 }} />
            <div style={{ fontFamily: F.display, fontSize: 30, color: C.navy }}>{data.games.length}</div>
            <div style={{ fontFamily: F.display, fontSize: 9, color: C.inkSoft, letterSpacing: '2px' }}>PARTIDAS</div>
          </div>
          <div style={{ textAlign: 'center', padding: 8 }}>
            <Users size={22} color={C.yellow} strokeWidth={2.5} style={{ marginBottom: 4 }} />
            <div style={{ fontFamily: F.display, fontSize: 30, color: C.navy }}>{Object.keys(data.players).length}</div>
            <div style={{ fontFamily: F.display, fontSize: 9, color: C.inkSoft, letterSpacing: '2px' }}>JUGADORES</div>
          </div>
        </div>
      </Card>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 20 }}>
        <Btn onClick={onNewGame} icon={CardsIcon}>NUEVA PARTIDA</Btn>
        <Btn onClick={onRankings} variant="secondary" icon={Trophy}>RANKINGS</Btn>
        <Btn onClick={onHistory} variant="secondary" icon={History}>HISTORIAL</Btn>
      </div>

      <div style={{ textAlign: 'center', marginTop: 36, fontFamily: F.serif, fontSize: 12, color: C.tealDeep, lineHeight: 1.8 }}>
        A game by Eric Olsen<br /><span style={{ color: C.cream, fontFamily: F.display, fontSize: 10, letterSpacing: '1px' }}>Supported by @piantapp</span>
      </div>
    </PageBg>
  );
}

function SetupScreen({ data, selected, setSelected, onStart, onBack }) {
  const [name, setName] = useState('');
  const existing = Object.keys(data.players).sort();
  const available = existing.filter(p => !selected.includes(p));
  const lastGame = data.games.length > 0 ? data.games[data.games.length - 1] : null;
  const q = name.trim().toLowerCase();
  const suggestions = q ? available.filter(p => p.toLowerCase().includes(q)).slice(0, 5) : [];

  const addNew = () => {
    const t = name.trim(); if (!t) return;
    const match = existing.find(p => p.toLowerCase() === t.toLowerCase());
    const fn = match || t; if (selected.includes(fn)) { setName(''); return; }
    setSelected([...selected, fn]); setName('');
    
    // Setup UX Nuevo - Scroll + Teclado
    window.scrollTo(0, 0);
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
  };
  const remove = (p) => setSelected(selected.filter(x => x !== p));
  const add = (p) => { setSelected([...selected, p]); setName(''); };

  return (
    <PageBg>
      <HeaderBar title="NUEVA PARTIDA" onBack={onBack} />

      {lastGame && selected.length === 0 && (
        <button onClick={() => setSelected([...lastGame.players])} style={{
          width: '100%', background: C.tealDark, border: `3px dashed ${C.yellow}`, borderRadius: 14,
          padding: '12px 14px', marginBottom: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12, textAlign: 'left',
          boxShadow: `3px 3px 0 ${C.tealShadow}`
        }}>
          <RotateCcw size={20} color={C.yellow} strokeWidth={2.5} />
          <div>
            <div style={{ fontFamily: F.display, fontSize: 11, color: C.yellow, letterSpacing: '1.5px' }}>REPETIR ÚLTIMA PARTIDA</div>
            <div style={{ fontFamily: F.body, fontSize: 12, color: C.cream, marginTop: 2, opacity: 0.85 }}>{lastGame.players.join(' · ')}</div>
          </div>
        </button>
      )}

      <Card style={{ padding: 14, marginBottom: 12 }}>
        <div style={{ fontFamily: F.display, fontSize: 12, color: C.navy, letterSpacing: '2px', marginBottom: 10 }}>JUGADORES ({selected.length})</div>
        {selected.length === 0 ? (
          <div style={{ fontFamily: F.serif, fontStyle: 'italic', color: C.inkSoft, fontSize: 14, padding: '8px 0' }}>Sumá al menos 2 jugadores.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            {selected.map((p, i) => (
              <div key={p} style={{
                display: 'flex', alignItems: 'center', gap: 10,
                background: C.navy, padding: '7px 10px 7px 7px', borderRadius: 10,
                border: `2px solid ${C.yellow}60`
              }}>
                <div style={{ width: 24, height: 24, borderRadius: 999, background: C.yellow, color: C.navy, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: F.display, fontSize: 11, flexShrink: 0, border: `2px solid ${C.navyDark}` }}>{i + 1}</div>
                <div style={{ flex: 1, fontFamily: F.display, fontSize: 12, color: C.yellow }}>{p}</div>
                <button onClick={() => remove(p)} style={{ background: 'transparent', border: 'none', color: C.yellow, cursor: 'pointer', display: 'flex', padding: 3 }}><X size={16} strokeWidth={3} /></button>
              </div>
            ))}
          </div>
        )}
      </Card>

      {available.length > 0 && (
        <Card style={{ padding: 14, marginBottom: 12 }}>
          <div style={{ fontFamily: F.display, fontSize: 12, color: C.navy, letterSpacing: '2px', marginBottom: 10 }}>GUARDADOS</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
            {available.map(p => (
              <button key={p} onClick={() => add(p)} style={{
                background: C.cream, color: C.navy, border: `3px solid ${C.navy}`, borderRadius: 999,
                padding: '6px 14px', fontFamily: F.body, fontSize: 13, fontWeight: 600, cursor: 'pointer',
                display: 'inline-flex', alignItems: 'center', gap: 5, boxShadow: '2px 2px 0 #00000015'
              }}><Plus size={13} strokeWidth={3} /> {p}</button>
            ))}
          </div>
        </Card>
      )}

      <Card style={{ padding: 14, marginBottom: 14 }}>
        <div style={{ fontFamily: F.display, fontSize: 12, color: C.navy, letterSpacing: '2px', marginBottom: 10 }}>AGREGAR NUEVO</div>
        <div style={{ display: 'flex', gap: 8 }}>
          <input value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') addNew(); }}
            placeholder="Nombre…" style={{
              flex: 1, background: C.creamLight, border: `3px solid ${C.navy}`, borderRadius: 10, padding: '11px 14px',
              fontFamily: F.body, fontSize: 16, color: C.ink, outline: 'none', boxShadow: `inset 2px 2px 0 ${C.creamDark}`
          }} />
          <button onClick={addNew} style={{
            background: C.yellow, border: `3px solid ${C.navy}`, borderRadius: 10, padding: '0 16px', cursor: 'pointer',
            boxShadow: shadowSm(), color: C.navy, display: 'flex', alignItems: 'center'
          }}><Plus size={22} strokeWidth={3} /></button>
        </div>
        {suggestions.length > 0 && (
          <div style={{ marginTop: 8, background: C.white, border: `3px solid ${C.navy}`, borderRadius: 10, overflow: 'hidden' }}>
            {suggestions.map((s, i) => (
              <button key={s} onClick={() => add(s)} style={{
                display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '10px 14px',
                background: i % 2 === 0 ? C.creamLight : C.white, border: 'none',
                fontFamily: F.body, fontSize: 14, color: C.navy, textAlign: 'left', cursor: 'pointer'
              }}><Plus size={14} strokeWidth={3} color={C.yellow} /><span style={{ fontWeight: 600 }}>{s}</span></button>
            ))}
          </div>
        )}
      </Card>

      <Btn onClick={onStart} disabled={selected.length < 2}>
        {selected.length < 2 ? `FALTA${selected.length === 0 ? 'N 2 JUGADORES' : ' 1 JUGADOR'}` : 'EMPEZAR'}
      </Btn>
    </PageBg>
  );
}

function GameScreen({ game, scores, setScores, onCloseRound, onAbandon, onChangeTarget, onResetGame, onAddPlayer, onModifyRound, existingPlayers }) {
  const [tab, setTab] = useState('anotar');
  const [modal, setModal] = useState(null); 
  const [editingRound, setEditingRound] = useState(null);
  const [editScores, setEditScores] = useState({});
  const [newPlayerName, setNewPlayerName] = useState('');
  const [newPlayerPoints, setNewPlayerPoints] = useState('0');
  const [scoreWarningConfirmed, setScoreWarningConfirmed] = useState(false);

  const roundNum = game.rounds.length + 1;
  const target = game.targetScore;
  const allFilled = game.players.every(p => { const v = scores[p]; return v !== '' && v !== undefined && !isNaN(parseInt(v, 10)) && parseInt(v, 10) >= 0; });
  const ranked = [...game.players].sort((a, b) => game.totals[b] - game.totals[a]);

  const MAX_SCORE = 179;
  const WARN_SCORE = 100;

  const handleCloseRound = () => {
    const impossible = game.players.filter(p => parseInt(scores[p], 10) > MAX_SCORE);
    if (impossible.length > 0) {
      setModal('impossible');
      return;
    }
    const suspicious = game.players.filter(p => parseInt(scores[p], 10) >= WARN_SCORE);
    if (suspicious.length > 0 && !scoreWarningConfirmed) {
      setModal('scoreWarning');
      return;
    }
    setScoreWarningConfirmed(false);
    onCloseRound();
    setTab('resultados');
  };

  const confirmSuspiciousScore = () => {
    setScoreWarningConfirmed(true);
    setModal(null);
    onCloseRound();
    setTab('resultados');
    setTimeout(() => setScoreWarningConfirmed(false), 100);
  };

  return (
    <PageBg>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            background: C.yellow, border: `3px solid ${C.navy}`, borderRadius: 12,
            padding: '6px 14px', boxShadow: shadowSm()
          }}>
            <div style={{ fontFamily: F.display, fontSize: 8, color: C.navy, letterSpacing: '2px' }}>RONDA</div>
            <div style={{ fontFamily: F.display, fontSize: 28, color: C.navy, lineHeight: 1 }}>{String(roundNum).padStart(2, '0')}</div>
          </div>
          <div style={{ fontFamily: F.body, fontSize: 11, color: C.cream }}>
            OBJETIVO<br /><span style={{ fontFamily: F.display, fontSize: 18, color: C.yellow }}>{target}</span> <span style={{ fontSize: 10, color: C.cream }}>PTS</span>
          </div>
        </div>
        <button onClick={() => setModal('options')} style={{
          background: C.yellow, border: `3px solid ${C.navy}`, borderRadius: 12,
          padding: '12px 18px', cursor: 'pointer', boxShadow: shadowSm(),
          fontFamily: F.display, fontSize: 12, letterSpacing: '1.5px', color: C.navy,
          display: 'flex', alignItems: 'center', gap: 5
        }}><Settings size={15} strokeWidth={2.5} /> OPCIONES</button>
      </div>

      <div style={{ display: 'flex', gap: 0, marginBottom: -4, position: 'relative', zIndex: 3 }}>
        {[{ id: 'anotar', label: `RONDA ${String(roundNum).padStart(2, '0')}` }, { id: 'resultados', label: 'RANKING' }].map(t => {
          const active = tab === t.id;
          return (
            <button key={t.id} onClick={() => setTab(t.id)} style={{
              flex: 1, padding: '11px 8px',
              background: active ? C.cream : C.tealDark,
              color: active ? C.navy : C.cream,
              border: `4px solid ${C.navy}`,
              borderBottom: active ? `4px solid ${C.cream}` : `4px solid ${C.navy}`,
              borderRadius: '14px 14px 0 0',
              fontFamily: F.display, fontSize: 11, letterSpacing: '1.5px',
              cursor: 'pointer',
              transform: active ? 'translateY(0)' : 'translateY(4px)',
              zIndex: active ? 4 : 2,
              boxShadow: active ? 'none' : `inset 0 -3px 0 ${C.tealShadow}`,
            }}>{t.label}</button>
          );
        })}
      </div>

      <div style={{
        background: C.cream, border: `4px solid ${C.navy}`, borderRadius: '0 0 16px 16px',
        boxShadow: shadow(C.navyDark, 5, 5), padding: 12, position: 'relative', zIndex: 2
      }}>

      {tab === 'anotar' && (<>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {game.players.map(p => {
            const total = game.totals[p];
            const pct = Math.min(100, (total / target) * 100);
            const remaining = Math.max(0, target - total);
            const isLeader = total === Math.max(...Object.values(game.totals)) && total > 0;
            return (
              <div key={p} style={{
                background: C.creamLight, border: `3px solid ${C.navy}`, borderRadius: 12,
                padding: 12, boxShadow: '3px 3px 0 #00000010'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    {isLeader && <Crown size={14} color={C.yellow} fill={C.yellow} stroke={C.navy} strokeWidth={2} />}
                    <span style={{ fontFamily: F.display, fontSize: 14, color: C.navy }}>{p}</span>
                  </div>
                  <div style={{
                    background: C.red, color: C.white, fontFamily: F.display, fontSize: 12,
                    padding: '5px 12px', borderRadius: 999, letterSpacing: '1px',
                    border: `2px solid ${C.navyDark}`
                  }}>FALTAN {remaining}</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginBottom: 6 }}>
                  <span style={{ fontFamily: F.display, fontSize: 36, color: C.navy, textShadow: `2px 2px 0 ${C.yellowDark}40` }}>{total}</span>
                  <span style={{ fontFamily: F.body, fontSize: 12, color: C.inkSoft }}>/ {target}</span>
                </div>
                <div style={{ height: 10, background: C.creamDark, borderRadius: 999, border: `2px solid ${C.navy}`, overflow: 'hidden', marginBottom: 10 }}>
                  <div style={{ width: `${pct}%`, height: '100%', background: `linear-gradient(90deg, ${C.yellow}, ${C.yellowBright})`, transition: 'width 0.4s', borderRadius: 999 }} />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ fontFamily: F.display, fontSize: 9, color: C.inkSoft, letterSpacing: '2px', flexShrink: 0 }}>PTS</div>
                  <input type="text" inputMode="numeric" pattern="[0-9]*" value={scores[p] ?? ''}
                    onChange={(e) => setScores({ ...scores, [p]: e.target.value.replace(/[^0-9]/g, '') })}
                    placeholder="0" style={{
                      flex: 1, background: C.white, border: `3px solid ${C.navy}`, borderRadius: 8, padding: '8px 10px',
                      textAlign: 'center', fontFamily: F.display, fontSize: 20, color: C.navy, outline: 'none',
                      boxShadow: `inset 2px 2px 0 ${C.creamDark}`, minWidth: 50
                  }} />
                  <button onClick={() => setScores({ ...scores, [p]: '0' })} style={{
                    background: C.red, color: C.white, border: `3px solid ${C.navyDark}`, borderRadius: 8,
                    padding: '8px 10px', cursor: 'pointer', fontFamily: F.display, fontSize: 10, letterSpacing: '1px',
                    boxShadow: '2px 2px 0 #00000030', flexShrink: 0
                  }}>BUST</button>
                </div>
              </div>
            );
          })}
        </div>
        <div style={{ marginTop: 14 }}>
          <Btn onClick={handleCloseRound} disabled={!allFilled} icon={Zap}>AGREGAR RONDA</Btn>
        </div>
      </>)}

      {tab === 'resultados' && (<>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {ranked.map((p, i) => {
            const total = game.totals[p]; const remaining = Math.max(0, target - total);
            const pct = Math.min(100, (total / target) * 100);
            return (
              <div key={p} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 6px', borderBottom: i < ranked.length - 1 ? `2px dashed ${C.navy}15` : 'none' }}>
                <RankBadge rank={i + 1} />
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    {i === 0 && total > 0 && <Crown size={13} color={C.yellow} fill={C.yellow} stroke={C.navy} strokeWidth={2} />}
                    <span style={{ fontFamily: F.display, fontSize: 14, color: C.navy }}>{p}</span>
                  </div>
                  <div style={{ height: 5, background: C.creamDark, borderRadius: 999, marginTop: 4, border: `1px solid ${C.navy}30`, overflow: 'hidden' }}>
                    <div style={{ width: `${pct}%`, height: '100%', background: C.yellow, borderRadius: 999, transition: 'width 0.4s' }} />
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontFamily: F.display, fontSize: 22, color: C.navy }}>{total}</div>
                  <div style={{ fontFamily: F.display, fontSize: 8, color: C.red, letterSpacing: '1px' }}>FALTAN {remaining}</div>
                </div>
              </div>
            );
          })}
        </div>
        <div style={{ marginTop: 14 }}>
          <Btn onClick={() => setTab('anotar')} icon={Zap}>ANOTAR RONDA {String(roundNum).padStart(2, '0')}</Btn>
        </div>
      </>)}
      </div>

      {/* ═══ MODALS ═══ */}

      {modal === 'options' && (
        <Overlay><Card style={{ padding: 18, maxWidth: 340, width: '100%' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
            <Settings size={20} color={C.navy} strokeWidth={2.5} />
            <div style={{ fontFamily: F.display, fontSize: 16, color: C.navy }}>OPCIONES</div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <OptionRow icon={Target} title="MODIFICAR OBJETIVO" subtitle={`Actual: ${target} pts`} onClick={() => setModal('target')} />
            <OptionRow icon={Edit3} title="MODIFICAR PUNTAJE" subtitle="Corregir una ronda anterior" onClick={() => setModal('selectRound')} />
            <OptionRow icon={UserPlus} title="AGREGAR JUGADOR" subtitle="Sumar a la partida" onClick={() => { setModal('addPlayer'); setNewPlayerName(''); setNewPlayerPoints('0'); }} />
            <OptionRow icon={RotateCcw} title="RESETEAR PARTIDA" subtitle="Todo a 0, mismos jugadores" onClick={() => setModal('reset')} />
            <OptionRow icon={X} title="ABANDONAR" subtitle="No se guarda" onClick={() => setModal('confirmAbandon')} danger />
          </div>
          <div style={{ marginTop: 12 }}><Btn onClick={() => setModal(null)} variant="secondary" style={{ fontSize: 14 }}>CERRAR</Btn></div>
        </Card></Overlay>
      )}

      {modal === 'target' && (
        <Overlay><Card style={{ padding: 20, maxWidth: 360, width: '100%' }}>
          <div style={{ fontFamily: F.display, fontSize: 16, color: C.navy, marginBottom: 4 }}>NUEVO OBJETIVO</div>
          <div style={{ fontFamily: F.body, fontSize: 12, color: C.inkSoft, marginBottom: 16 }}>Actual: <strong>{target}</strong> pts · No reinicia puntajes</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
            {[{ v: 200, badge: 'OFICIAL' }, { v: 300, badge: 'RECOMENDADO' }, { v: 400 }, { v: 500 }].map(({ v, badge }) => (
              <button key={v} onClick={() => { onChangeTarget(v); setModal(null); }} style={{
                position: 'relative', background: v === target ? C.navy : C.yellow, color: v === target ? C.yellow : C.navy,
                border: `4px solid ${C.navy}`, borderRadius: 14, padding: '14px 0', cursor: 'pointer',
                boxShadow: shadow(C.navyDark), fontFamily: F.display,
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2
              }}>
                {badge && <Badge text={badge} />}
                <div style={{ fontSize: 30, lineHeight: 1 }}>{v}</div>
                <div style={{ fontSize: 9, letterSpacing: '2px' }}>{v === target ? 'ACTUAL' : 'PTS'}</div>
              </button>
            ))}
          </div>
          <Btn onClick={() => setModal(null)} variant="secondary" style={{ fontSize: 14 }}>CANCELAR</Btn>
        </Card></Overlay>
      )}

      {modal === 'selectRound' && (
        <Overlay><Card style={{ padding: 20, maxWidth: 360, width: '100%' }}>
          <div style={{ fontFamily: F.display, fontSize: 16, color: C.navy, marginBottom: 14 }}>¿QUÉ RONDA CORREGIR?</div>
          {game.rounds.length === 0 ? (
            <div style={{ fontFamily: F.serif, fontStyle: 'italic', color: C.inkSoft, padding: '16px 0', textAlign: 'center' }}>No hay rondas cargadas.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 280, overflowY: 'auto', marginBottom: 14 }}>
              {game.rounds.map((r, idx) => (
                <button key={idx} onClick={() => { setEditScores({ ...r.scores }); setEditingRound(idx); setModal('editRound'); }} style={{
                  width: '100%', background: C.creamLight, border: `3px solid ${C.navy}`, borderRadius: 10,
                  padding: '10px 12px', cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 10,
                  boxShadow: '2px 2px 0 #00000010'
                }}>
                  <div style={{ width: 30, height: 30, borderRadius: 999, background: C.yellow, border: `2px solid ${C.navy}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: F.display, fontSize: 12, color: C.navy, flexShrink: 0 }}>{String(idx + 1).padStart(2, '0')}</div>
                  <div style={{ flex: 1, fontFamily: F.body, fontSize: 11, color: C.inkSoft }}>{game.players.map(p => `${p}: ${r.scores[p] ?? 0}`).join(' · ')}</div>
                  <Edit3 size={14} color={C.navy} />
                </button>
              ))}
            </div>
          )}
          <Btn onClick={() => setModal(null)} variant="secondary" style={{ fontSize: 14 }}>CANCELAR</Btn>
        </Card></Overlay>
      )}

      {modal === 'editRound' && editingRound !== null && (
        <Overlay><Card style={{ padding: 20, maxWidth: 360, width: '100%' }}>
          <div style={{ fontFamily: F.display, fontSize: 16, color: C.navy, marginBottom: 16 }}>EDITAR RONDA {String(editingRound + 1).padStart(2, '0')}</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
            {game.players.map(p => (
              <div key={p} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ flex: 1, fontFamily: F.display, fontSize: 13, color: C.navy }}>{p}</div>
                <input type="text" inputMode="numeric" value={editScores[p] ?? ''}
                  onChange={(e) => setEditScores({ ...editScores, [p]: e.target.value.replace(/[^0-9]/g, '') })}
                  style={{ width: 80, background: C.white, border: `3px solid ${C.navy}`, borderRadius: 8, padding: '8px', textAlign: 'center', fontFamily: F.display, fontSize: 18, color: C.navy, outline: 'none' }}
                />
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <Btn onClick={() => { setModal(null); setEditingRound(null); }} variant="secondary" style={{ fontSize: 14 }}>CANCELAR</Btn>
            <Btn onClick={() => { const parsed = {}; for (const p of game.players) parsed[p] = parseInt(editScores[p], 10) || 0; onModifyRound(editingRound, parsed); setModal(null); setEditingRound(null); }} style={{ fontSize: 14 }}>GUARDAR</Btn>
          </div>
        </Card></Overlay>
      )}

      {modal === 'reset' && (
        <Overlay><Card style={{ padding: 20, maxWidth: 320, width: '100%' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}><AlertTriangle color={C.red} size={22} /><div style={{ fontFamily: F.display, fontSize: 16, color: C.navy }}>¿RESETEAR?</div></div>
          <div style={{ fontFamily: F.body, fontSize: 14, color: C.inkSoft, marginBottom: 16 }}>Todo vuelve a 0. Mismos jugadores, objetivo {target} pts.</div>
          <div style={{ display: 'flex', gap: 8 }}>
            <Btn onClick={() => setModal(null)} variant="secondary" style={{ fontSize: 14 }}>CANCELAR</Btn>
            <Btn onClick={() => { onResetGame(); setModal(null); setTab('anotar'); }} variant="danger" style={{ fontSize: 14 }}>RESETEAR</Btn>
          </div>
        </Card></Overlay>
      )}

      {modal === 'confirmAbandon' && (
        <Overlay><Card style={{ padding: 20, maxWidth: 340, width: '100%' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            <div style={{
              width: 40, height: 40, borderRadius: 999, background: C.red, border: `3px solid ${C.navyDark}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <AlertTriangle size={22} color={C.white} strokeWidth={2.5} />
            </div>
            <div style={{ fontFamily: F.display, fontSize: 16, color: C.red }}>¿ABANDONAR?</div>
          </div>
          <div style={{ fontFamily: F.body, fontSize: 14, color: C.ink, marginBottom: 10, lineHeight: 1.5 }}>
            Si abandonás la partida se pierden todos los puntos acumulados. Esta partida <strong>no se guarda</strong> en el historial ni en los rankings.
          </div>
          <div style={{
            background: C.creamLight, border: `2px solid ${C.navy}20`, borderRadius: 10,
            padding: '10px 12px', marginBottom: 16
          }}>
            <div style={{ fontFamily: F.display, fontSize: 10, color: C.inkSoft, letterSpacing: '2px', marginBottom: 6 }}>PUNTAJES ACTUALES</div>
            {game.players.map(p => (
              <div key={p} style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0', fontFamily: F.body, fontSize: 13, color: C.navy }}>
                <span>{p}</span>
                <span style={{ fontFamily: F.display }}>{game.totals[p]} pts</span>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <Btn onClick={() => setModal('options')} variant="secondary" style={{ fontSize: 14 }}>VOLVER</Btn>
            <Btn onClick={() => { setModal(null); onAbandon(); }} variant="danger" style={{ fontSize: 14 }}>ABANDONAR</Btn>
          </div>
        </Card></Overlay>
      )}

      {modal === 'addPlayer' && (() => {
        const q = newPlayerName.trim().toLowerCase();
        const available = (existingPlayers || []).filter(p => !game.players.includes(p));
        const suggestions = q ? available.filter(p => p.toLowerCase().includes(q)).slice(0, 5) : available.slice(0, 5);
        return (
        <Overlay><Card style={{ padding: 20, maxWidth: 360, width: '100%' }}>
          <div style={{ fontFamily: F.display, fontSize: 16, color: C.navy, marginBottom: 14 }}>AGREGAR JUGADOR</div>
          <div style={{ fontFamily: F.display, fontSize: 10, color: C.navy, letterSpacing: '2px', marginBottom: 6 }}>NOMBRE</div>
          <input value={newPlayerName} onChange={(e) => setNewPlayerName(e.target.value)} placeholder="Nombre…"
            style={{ width: '100%', background: C.white, border: `3px solid ${C.navy}`, borderRadius: 10, padding: '11px 14px', fontFamily: F.body, fontSize: 16, color: C.ink, outline: 'none', marginBottom: suggestions.length > 0 ? 0 : 14, boxSizing: 'border-box' }} />
          {suggestions.length > 0 && (
            <div style={{ background: C.white, border: `3px solid ${C.navy}`, borderTop: 'none', borderRadius: '0 0 10px 10px', overflow: 'hidden', marginBottom: 14 }}>
              {suggestions.map((s, i) => (
                <button key={s} onClick={() => { setNewPlayerName(s); }} style={{
                  display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '10px 14px',
                  background: i % 2 === 0 ? C.creamLight : C.white, border: 'none',
                  fontFamily: F.body, fontSize: 14, color: C.navy, textAlign: 'left', cursor: 'pointer'
                }}><Plus size={14} strokeWidth={3} color={C.yellow} /><span style={{ fontWeight: 600 }}>{s}</span></button>
              ))}
            </div>
          )}
          <div style={{ fontFamily: F.display, fontSize: 10, color: C.navy, letterSpacing: '2px', marginBottom: 6 }}>PUNTOS INICIALES</div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
            {['0', 'Promedio'].map(opt => {
              const isAvg = opt === 'Promedio';
              const avgVal = game.players.length > 0 ? Math.round(Object.values(game.totals).reduce((a, b) => a + b, 0) / game.players.length) : 0;
              const isSel = isAvg ? newPlayerPoints === 'avg' : newPlayerPoints === '0';
              return (
                <button key={opt} onClick={() => setNewPlayerPoints(isAvg ? 'avg' : '0')} style={{
                  flex: 1, background: isSel ? C.navy : C.creamLight, color: isSel ? C.yellow : C.navy,
                  border: `3px solid ${C.navy}`, borderRadius: 10, padding: '10px 6px', cursor: 'pointer',
                  fontFamily: F.display, fontSize: 10, textAlign: 'center', boxShadow: '2px 2px 0 #00000010'
                }}>
                  <div>{isAvg ? 'PROMEDIO' : '0 PTS'}</div>
                  {isAvg && <div style={{ fontFamily: F.body, fontSize: 10, marginTop: 2, opacity: 0.8 }}>({avgVal} pts)</div>}
                </button>
              );
            })}
            <input type="text" inputMode="numeric" value={newPlayerPoints !== '0' && newPlayerPoints !== 'avg' ? newPlayerPoints : ''}
              onChange={(e) => setNewPlayerPoints(e.target.value.replace(/[^0-9]/g, '') || '0')}
              onFocus={() => { if (newPlayerPoints === '0' || newPlayerPoints === 'avg') setNewPlayerPoints(''); }}
              placeholder="Custom" style={{
                flex: 1, background: C.creamLight, border: `3px solid ${C.navy}`, borderRadius: 10,
                padding: '10px 6px', textAlign: 'center', fontFamily: F.display, fontSize: 11, color: C.navy, outline: 'none'
            }} />
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <Btn onClick={() => setModal(null)} variant="secondary" style={{ fontSize: 14 }}>CANCELAR</Btn>
            <Btn disabled={!newPlayerName.trim() || game.players.includes(newPlayerName.trim())} onClick={() => {
              const nm = newPlayerName.trim(); if (!nm || game.players.includes(nm)) return;
              const avgVal = game.players.length > 0 ? Math.round(Object.values(game.totals).reduce((a, b) => a + b, 0) / game.players.length) : 0;
              onAddPlayer(nm, newPlayerPoints === 'avg' ? avgVal : parseInt(newPlayerPoints, 10) || 0);
              setModal(null);
            }} style={{ fontSize: 14 }}>AGREGAR</Btn>
          </div>
        </Card></Overlay>
        ); })()}

      {modal === 'scoreWarning' && (() => {
        const suspicious = game.players.filter(p => parseInt(scores[p], 10) >= WARN_SCORE);
        return (
        <Overlay><Card style={{ padding: 20, maxWidth: 340, width: '100%' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            <div style={{
              width: 40, height: 40, borderRadius: 999, background: C.yellow, border: `3px solid ${C.navy}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <AlertTriangle size={22} color={C.navy} strokeWidth={2.5} />
            </div>
            <div style={{ fontFamily: F.display, fontSize: 16, color: C.navy }}>¿SEGURO?</div>
          </div>
          <div style={{ fontFamily: F.body, fontSize: 14, color: C.ink, marginBottom: 10, lineHeight: 1.5 }}>
            {suspicious.length === 1 ? 'Un jugador tiene' : 'Algunos jugadores tienen'} un puntaje muy alto para una sola ronda. Revisá la suma de las cartas:
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 16 }}>
            {suspicious.map(p => (
              <div key={p} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                background: `${C.yellow}30`, border: `2px solid ${C.yellow}`, borderRadius: 10,
                padding: '10px 14px'
              }}>
                <span style={{ fontFamily: F.display, fontSize: 13, color: C.navy }}>{p}</span>
                <span style={{ fontFamily: F.display, fontSize: 20, color: C.red }}>{scores[p]} pts</span>
              </div>
            ))}
          </div>
          <div style={{
            background: C.creamLight, border: `2px dashed ${C.navy}30`, borderRadius: 10,
            padding: '10px 12px', marginBottom: 16, fontFamily: F.body, fontSize: 12, color: C.inkSoft, lineHeight: 1.5
          }}>
            El máximo teórico en Flip 7 es <strong style={{ color: C.navy }}>179 pts</strong> (7 cartas más altas + x2 + todos los modificadores + bonus). Un puntaje de 100+ es posible pero muy raro.
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <Btn onClick={() => setModal(null)} variant="secondary" style={{ fontSize: 13 }}>CORREGIR</Btn>
            <Btn onClick={confirmSuspiciousScore} style={{ fontSize: 13 }}>SÍ, ES CORRECTO</Btn>
          </div>
        </Card></Overlay>
        ); })()}

      {modal === 'impossible' && (() => {
        const impossible = game.players.filter(p => parseInt(scores[p], 10) > MAX_SCORE);
        return (
        <Overlay><Card style={{ padding: 20, maxWidth: 340, width: '100%' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            <div style={{
              width: 40, height: 40, borderRadius: 999, background: C.red, border: `3px solid ${C.navyDark}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <X size={22} color={C.white} strokeWidth={3} />
            </div>
            <div style={{ fontFamily: F.display, fontSize: 16, color: C.red }}>IMPOSIBLE</div>
          </div>
          <div style={{ fontFamily: F.body, fontSize: 14, color: C.ink, marginBottom: 10, lineHeight: 1.5 }}>
            {impossible.length === 1 ? 'Un jugador tiene' : 'Algunos jugadores tienen'} un puntaje que supera el máximo posible del juego:
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 16 }}>
            {impossible.map(p => (
              <div key={p} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                background: `${C.red}15`, border: `2px solid ${C.red}`, borderRadius: 10,
                padding: '10px 14px'
              }}>
                <span style={{ fontFamily: F.display, fontSize: 13, color: C.navy }}>{p}</span>
                <span style={{ fontFamily: F.display, fontSize: 20, color: C.red }}>{scores[p]} pts</span>
              </div>
            ))}
          </div>
          <div style={{
            background: `${C.red}10`, border: `2px solid ${C.red}40`, borderRadius: 10,
            padding: '10px 12px', marginBottom: 16, fontFamily: F.body, fontSize: 12, color: C.ink, lineHeight: 1.5
          }}>
            El puntaje máximo posible en una ronda de Flip 7 es <strong style={{ color: C.red }}>179 puntos</strong> (cartas 6-12 con x2, todos los modificadores y bonus Flip 7). Corregí el puntaje para continuar.
          </div>
          <Btn onClick={() => setModal(null)} style={{ fontSize: 14 }}>CORREGIR</Btn>
        </Card></Overlay>
        ); })()}

    </PageBg>
  );
}

function GameOverScreen({ game, onHome }) {
  const ranked = [...game.players].sort((a, b) => game.finalScores[b] - game.finalScores[a]);

  // (El "cerebro" del confetti):
  useEffect(() => {
    confetti({ particleCount: 150, spread: 80, origin: { y: 0.6 } });
    const t = setTimeout(() => {
      confetti({ particleCount: 150, spread: 80, origin: { y: 0.6 } });
    }, 250);
    return () => clearTimeout(t);
  }, []);

  return (
    <PageBg>
      <div style={{ textAlign: 'center', padding: '20px 0' }}>
        <div style={{
          display: 'inline-block', background: C.yellow, border: `4px solid ${C.navy}`,
          borderRadius: 999, padding: 18, boxShadow: `${shadow()}, 0 0 30px ${C.yellow}50`
        }}><Trophy size={44} color={C.navy} fill={C.navy} /></div>
        <div style={{ fontFamily: F.display, fontSize: 12, color: C.cream, letterSpacing: '5px', marginTop: 16 }}>GANADOR</div>
        <div style={{
          fontFamily: F.display, fontSize: 42, color: C.yellow, marginTop: 6,
          WebkitTextStroke: `2px ${C.navy}`, paintOrder: 'stroke fill',
          textShadow: `4px 4px 0 ${C.navyDark}`
        }}>{game.winner.toUpperCase()}</div>
        <div style={{ fontFamily: F.display, fontSize: 24, color: C.cream, marginTop: 6 }}>{game.finalScores[game.winner]} PTS</div>
      </div>
      <Card style={{ padding: 14, marginTop: 16, marginBottom: 20 }} glow>
        <div style={{ fontFamily: F.display, fontSize: 12, color: C.navy, letterSpacing: '2px', marginBottom: 10 }}>RESULTADO FINAL</div>
        {ranked.map((p, i) => (
          <div key={p} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: i < ranked.length - 1 ? `2px dashed ${C.navy}15` : 'none' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <RankBadge rank={i + 1} />
              <span style={{ fontFamily: F.display, fontSize: 14, color: C.navy }}>{p}</span>
            </div>
            <span style={{ fontFamily: F.display, fontSize: 20, color: i === 0 ? C.red : C.navy }}>{game.finalScores[p]}</span>
          </div>
        ))}
        <div style={{ marginTop: 10, paddingTop: 8, borderTop: `3px solid ${C.navy}15`, fontFamily: F.display, fontSize: 10, color: C.inkSoft, textAlign: 'center', letterSpacing: '2px' }}>
          {game.rounds.length} RONDAS · A {game.targetScore ?? 200} PTS
        </div>
      </Card>
      <Btn onClick={onHome} icon={CardsIcon}>NUEVA PARTIDA</Btn>
    </PageBg>
  );
}

function RankingsScreen({ data, onBack }) {
  const [tab, setTab] = useState('wins');
  const players = Object.values(data.players);
  const tabs = [
    { id: 'wins', label: 'GANADAS', icon: Trophy, sort: (a, b) => b.wins - a.wins, value: p => p.wins, suf: '' },
    { id: 'best', label: 'MEJOR', icon: Crown, sort: (a, b) => b.bestGameScore - a.bestGameScore, value: p => p.bestGameScore, suf: 'pts' },
    { id: 'round', label: 'RONDA', icon: Zap, sort: (a, b) => b.highestRound - a.highestRound, value: p => p.highestRound, suf: 'pts' },
    { id: 'avg', label: 'PROM.', icon: TrendingUp, sort: (a, b) => (b.gamesPlayed ? b.totalPoints / b.gamesPlayed : 0) - (a.gamesPlayed ? a.totalPoints / a.gamesPlayed : 0), value: p => p.gamesPlayed ? Math.round(p.totalPoints / p.gamesPlayed) : 0, suf: 'pts/p' },
    { id: 'games', label: 'JUGADAS', icon: BarChart3, sort: (a, b) => b.gamesPlayed - a.gamesPlayed, value: p => p.gamesPlayed, suf: '' }
  ];
  const at = tabs.find(t => t.id === tab);
  const sorted = [...players].sort(at.sort);

  return (
    <PageBg>
      <HeaderBar title="RANKINGS" onBack={onBack} />
      <div style={{ display: 'flex', gap: 5, overflowX: 'auto', marginBottom: 14, paddingBottom: 4, scrollbarWidth: 'none' }}>
        {tabs.map(t => {
          const active = t.id === tab; const I = t.icon;
          return (
            <button key={t.id} onClick={() => setTab(t.id)} style={{
              background: active ? C.yellow : C.tealDark, color: active ? C.navy : C.cream,
              border: `3px solid ${active ? C.navy : C.cream}40`, borderRadius: 10, padding: '7px 10px',
              fontFamily: F.display, fontSize: 9, letterSpacing: '1px', cursor: 'pointer', flexShrink: 0,
              display: 'flex', alignItems: 'center', gap: 4,
              boxShadow: active ? shadowSm() : 'none'
            }}><I size={12} strokeWidth={2.5} /> {t.label}</button>
          );
        })}
      </div>
      {sorted.length === 0 ? (
        <Card style={{ padding: 32, textAlign: 'center' }}><div style={{ fontFamily: F.serif, fontStyle: 'italic', color: C.inkSoft }}>No hay partidas aún.</div></Card>
      ) : (
        <Card style={{ padding: 10 }}>
          {sorted.map((p, i) => (
            <div key={p.name} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 4px', borderBottom: i < sorted.length - 1 ? `2px dashed ${C.navy}12` : 'none' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <RankBadge rank={i + 1} />
                <div>
                  <div style={{ fontFamily: F.display, fontSize: 13, color: C.navy }}>{p.name}</div>
                  <div style={{ fontFamily: F.body, fontSize: 10, color: C.inkSoft }}>{p.gamesPlayed} partidas · {p.wins} ganadas</div>
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontFamily: F.display, fontSize: 20, color: i === 0 && at.value(p) > 0 ? C.red : C.navy }}>{at.value(p)}</div>
                {at.suf && <div style={{ fontFamily: F.display, fontSize: 8, color: C.inkSoft, letterSpacing: '1px' }}>{at.suf.toUpperCase()}</div>}
              </div>
            </div>
          ))}
        </Card>
      )}
    </PageBg>
  );
}

function HistoryScreen({ data, onBack, onDelete }) {
  const games = [...data.games].reverse();
  const [confirmDelete, setConfirmDelete] = useState(null);
  return (
    <PageBg>
      <HeaderBar title="HISTORIAL" onBack={onBack} />
      {games.length === 0 ? (
        <Card style={{ padding: 32, textAlign: 'center' }}><div style={{ fontFamily: F.serif, fontStyle: 'italic', color: C.inkSoft }}>No hay partidas aún.</div></Card>
      ) : (<>
        <div style={{ fontFamily: F.display, fontSize: 10, color: C.cream, letterSpacing: '2px', marginBottom: 10, textAlign: 'center' }}>{games.length} PARTIDAS</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {games.map(g => {
            const r = [...g.players].sort((a, b) => g.finalScores[b] - g.finalScores[a]);
            return (
              <Card key={g.id} style={{ padding: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}><Calendar size={12} color={C.inkSoft} /><span style={{ fontFamily: F.body, fontSize: 11, color: C.inkSoft }}>{fmtDate(g.date)}</span></div>
                  <button onClick={() => setConfirmDelete(g)} style={{ background: 'transparent', border: `2px solid ${C.red}60`, borderRadius: 8, color: C.red, cursor: 'pointer', padding: 4, display: 'flex' }}><Trash2 size={14} strokeWidth={2.5} /></button>
                </div>
                {r.map((p, i) => (
                  <div key={p} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 6px', background: i === 0 ? `${C.yellow}25` : 'transparent', borderRadius: 6 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      {i === 0 ? <Crown size={12} color={C.yellow} fill={C.yellow} stroke={C.navy} strokeWidth={2} /> : <span style={{ width: 12, textAlign: 'center', fontFamily: F.body, fontSize: 10, color: C.inkSoft }}>{i + 1}</span>}
                      <span style={{ fontFamily: F.display, fontSize: 11, color: C.navy }}>{p}</span>
                    </div>
                    <span style={{ fontFamily: F.display, fontSize: 14, color: i === 0 ? C.red : C.navy }}>{g.finalScores[p]}</span>
                  </div>
                ))}
                <div style={{ marginTop: 8, paddingTop: 6, borderTop: `2px dashed ${C.navy}10`, fontFamily: F.display, fontSize: 9, color: C.inkSoft, textAlign: 'center', letterSpacing: '1.5px' }}>
                  {g.rounds.length} RONDAS · A {g.targetScore ?? 200} PTS
                </div>
              </Card>
            );
          })}
        </div>
      </>)}
      {confirmDelete && (
        <Overlay><Card style={{ padding: 20, maxWidth: 320, width: '100%' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}><AlertTriangle color={C.red} size={22} /><div style={{ fontFamily: F.display, fontSize: 16, color: C.navy }}>¿BORRAR?</div></div>
          <div style={{ fontFamily: F.body, fontSize: 14, color: C.inkSoft, marginBottom: 16 }}>Ganador: <strong>{confirmDelete.winner}</strong> · Se quita del ranking.</div>
          <div style={{ display: 'flex', gap: 8 }}>
            <Btn onClick={() => setConfirmDelete(null)} variant="secondary" style={{ fontSize: 14 }}>CANCELAR</Btn>
            <Btn onClick={() => { onDelete(confirmDelete.id); setConfirmDelete(null); }} variant="danger" style={{ fontSize: 14 }}>BORRAR</Btn>
          </div>
        </Card></Overlay>
      )}
    </PageBg>
  );
}

// ═══════ APP ═══════
export default function App() {
  const [screen, setScreen] = useState('home');
  const [data, setData] = useState({ players: {}, games: [] });
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState([]);
  const [game, setGame] = useState(null);
  const [scores, setScores] = useState({});
  const [completedGame, setCompletedGame] = useState(null);
  const [targetPickerOpen, setTargetPickerOpen] = useState(false);
// Esto hace que la pantalla suba al inicio cada vez que cambias de sección
useEffect(() => {
  window.scrollTo(0, 0);
}, [screen]);

  useEffect(() => { loadData().then(d => { setData(d); setLoading(false); }); }, []);

  const openTargetPicker = () => { if (selected.length < 2) return; setTargetPickerOpen(true); };
  const startGame = (target) => {
    setGame({ players: [...selected], rounds: [], totals: Object.fromEntries(selected.map(p => [p, 0])), targetScore: target });
    setScores(Object.fromEntries(selected.map(p => [p, '']))); setTargetPickerOpen(false); setScreen('game');
  };
  const closeRound = async () => {
    const rs = {}; for (const p of game.players) { const n = parseInt(scores[p], 10); if (isNaN(n) || n < 0) return; rs[p] = n; }
    const nt = { ...game.totals }; for (const p of game.players) nt[p] += rs[p];
    const nr = [...game.rounds, { scores: rs }]; const t = game.targetScore;
    if (game.players.some(p => nt[p] >= t)) {
      const sorted = [...game.players].sort((a, b) => nt[b] - nt[a]);
      const fin = { id: `g-${Date.now()}`, date: new Date().toISOString(), players: game.players, rounds: nr, finalScores: nt, targetScore: t, winner: sorted[0] };
      const nd = { players: updatePlayerStats(data.players, fin), games: [...data.games, fin] };
      setData(nd); await saveData(nd); setCompletedGame(fin); setGame(null); setScreen('gameover');
    } else { setGame({ ...game, rounds: nr, totals: nt }); setScores(Object.fromEntries(game.players.map(p => [p, '']))); }
  };
  const goHome = () => { setSelected([]); setGame(null); setScores({}); setCompletedGame(null); setScreen('home'); };
  const deleteGame = async (id) => { const ng = data.games.filter(g => g.id !== id); const nd = { players: recalculateStats(ng), games: ng }; setData(nd); await saveData(nd); };
  const changeTarget = (t) => { if (game) setGame({ ...game, targetScore: t }); };
  const resetGame = () => { if (game) { setGame({ ...game, rounds: [], totals: Object.fromEntries(game.players.map(p => [p, 0])) }); setScores(Object.fromEntries(game.players.map(p => [p, '']))); } };
  const addPlayerMidGame = (name, pts) => { if (game && !game.players.includes(name)) { setGame({ ...game, players: [...game.players, name], totals: { ...game.totals, [name]: pts }, rounds: game.rounds.map(r => ({ ...r, scores: { ...r.scores, [name]: 0 } })) }); setScores({ ...scores, [name]: '' }); } };
  const modifyRound = (idx, newScores) => {
    if (!game) return;
    const ur = game.rounds.map((r, i) => i === idx ? { ...r, scores: newScores } : r);
    const nt = Object.fromEntries(game.players.map(p => [p, 0]));
    for (const r of ur) for (const p of game.players) nt[p] += (r.scores[p] ?? 0);
    setGame({ ...game, rounds: ur, totals: nt });
  };

  if (loading) return <PageBg><div style={{ textAlign: 'center', padding: 60, fontFamily: F.display, color: C.yellow, fontSize: 18 }}>Cargando…</div></PageBg>;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bungee&family=DM+Sans:wght@400;500;700&family=DM+Serif+Display:ital@0;1&display=swap');
        * { box-sizing: border-box; }
        body { margin: 0; }
        button { transition: transform 0.08s; }
        button:active { transform: translateY(2px) !important; }
        input:focus { box-shadow: 0 0 0 3px ${C.yellow}60 !important; }
        ::-webkit-scrollbar { display: none; }
      `}</style>
      {screen === 'home' && <HomeScreen data={data} onNewGame={() => { setSelected([]); setScreen('setup'); }} onRankings={() => setScreen('rankings')} onHistory={() => setScreen('history')} />}
      {screen === 'setup' && (<>
        <SetupScreen data={data} selected={selected} setSelected={setSelected} onStart={openTargetPicker} onBack={() => setScreen('home')} />
        {targetPickerOpen && (
          <Overlay><Card style={{ padding: 20, maxWidth: 360, width: '100%' }}>
            <div style={{ fontFamily: F.display, fontSize: 16, color: C.navy, marginBottom: 4 }}>¿A CUÁNTOS PUNTOS?</div>
            <div style={{ fontFamily: F.serif, fontStyle: 'italic', fontSize: 13, color: C.inkSoft, marginBottom: 18 }}>Elegí el puntaje objetivo</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
              {[{ v: 200, badge: 'OFICIAL' }, { v: 300, badge: 'RECOMENDADO' }, { v: 400 }, { v: 500 }].map(({ v, badge }) => (
                <button key={v} onClick={() => startGame(v)} style={{
                  position: 'relative', background: C.yellow, color: C.navy,
                  border: `4px solid ${C.navy}`, borderRadius: 14, padding: '14px 0', cursor: 'pointer',
                  boxShadow: shadow(C.navyDark), fontFamily: F.display,
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2
                }}>
                  {badge && <Badge text={badge} />}
                  <div style={{ fontSize: 30, lineHeight: 1 }}>{v}</div>
                  <div style={{ fontSize: 9, letterSpacing: '2px' }}>PTS</div>
                </button>
              ))}
            </div>
            <Btn onClick={() => setTargetPickerOpen(false)} variant="secondary" style={{ fontSize: 14 }}>CANCELAR</Btn>
          </Card></Overlay>
        )}
      </>)}
      {screen === 'game' && game && <GameScreen game={game} scores={scores} setScores={setScores} onCloseRound={closeRound} onAbandon={goHome} onChangeTarget={changeTarget} onResetGame={resetGame} onAddPlayer={addPlayerMidGame} onModifyRound={modifyRound} existingPlayers={Object.keys(data.players)} />}
      {screen === 'gameover' && completedGame && <GameOverScreen game={completedGame} onHome={goHome} />}
      {screen === 'rankings' && <RankingsScreen data={data} onBack={() => setScreen('home')} />}
      {screen === 'history' && <HistoryScreen data={data} onBack={() => setScreen('home')} onDelete={deleteGame} />}
    </>
  );
}