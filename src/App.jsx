import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Trophy, Plus, X, ArrowLeft, Crown, Users, Target, BarChart3, RotateCcw, AlertTriangle, Zap, TrendingUp, History, Trash2, Calendar, Settings, UserPlus, Edit3, ChevronRight, Percent, Languages, Calculator } from 'lucide-react';
import confetti from 'canvas-confetti';
import { createClient } from '@supabase/supabase-js';
import { Tx } from './i18n.js';

const SUPABASE_URL = 'https://bztyusclkfsydrrbpdey.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ6dHl1c2Nsa2ZzeWRycmJwZGV5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc5Mzk1NjEsImV4cCI6MjA5MzUxNTU2MX0.on73TbG44Xqsu6D6FEtgUaILhKikdZlCO9kExqHBl8g';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

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
function emptyPlayerStats(name) {
  return { name, gamesPlayed: 0, wins: 0, totalPoints: 0, highestRound: 0, bestGameScore: 0, roundsPlayed: 0 };
}

function normalizeGameRow(row) {
  return {
    id: row.id,
    date: row.date ?? row.created_at ?? null,
    players: row.players ?? [],
    rounds: row.rounds ?? [],
    finalScores: row.final_scores ?? {},
    targetScore: row.target_score ?? 200,
    winner: row.winner ?? ''
  };
}

function sortGamesNewestFirst(games) {
  return [...games].sort((a, b) => {
    const aTs = a.date ? Date.parse(a.date) : Number.NEGATIVE_INFINITY;
    const bTs = b.date ? Date.parse(b.date) : Number.NEGATIVE_INFINITY;
    const safeATs = Number.isFinite(aTs) ? aTs : Number.NEGATIVE_INFINITY;
    const safeBTs = Number.isFinite(bTs) ? bTs : Number.NEGATIVE_INFINITY;
    return safeBTs - safeATs;
  });
}

function toGameInsertRow(game) {
  return {
    players: game.players,
    rounds: game.rounds,
    final_scores: game.finalScores,
    winner: game.winner,
    target_score: game.targetScore,
    date: game.date
  };
}

function mergeStatsWithSavedNames(statsByName, names) {
  const merged = { ...statsByName };
  for (const name of names) {
    if (!merged[name]) merged[name] = emptyPlayerStats(name);
  }
  return merged;
}

async function loadData() {
  try {
    let gamesRows = [];
    const { data: gamesData, error } = await supabase.from('games').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    gamesRows = gamesData ?? [];
    const games = sortGamesNewestFirst(gamesRows.map(normalizeGameRow));
    const stats = recalculateStats(games);
    const savedNames = await loadSavedPlayerNames();
    return { players: mergeStatsWithSavedNames(stats, savedNames), games };
  } catch (e) {
    console.error('No se pudo cargar datos desde Supabase:', e);
    return { players: {}, games: [] };
  }
}

async function loadSavedPlayerNames() {
  const { data: playerRows, error } = await supabase.from('players').select('name');
  if (error) throw error;
  return (playerRows ?? []).map(p => p.name).filter(Boolean);
}

async function savePlayerName(name) {
  const trimmed = name?.trim();
  if (!trimmed) return;
  const { error } = await supabase.from('players').upsert({ name: trimmed }, { onConflict: 'name' });
  if (error) console.error('No se pudo guardar jugador en Supabase:', error);
}

async function removePlayerName(name) {
  if (!name) return false;
  const { error } = await supabase.from('players').delete().eq('name', name);
  if (error) {
    console.error('No se pudo borrar jugador en Supabase:', error);
    return false;
  }
  return true;
}

async function insertGame(game) {
  try {
    const { data: inserted, error } = await supabase
      .from('games')
      .insert([toGameInsertRow(game)])
      .select()
      .single();
    if (error) {
      console.error('Error de Supabase:', error);
      alert('Error técnico de la nube: ' + error.message + '\nDetalle: ' + (error.details || 'ninguno'));
      return null;
    }
    return normalizeGameRow(inserted);
  } catch (err) {
    console.error('Error inesperado:', err);
    alert('Error inesperado: ' + err.message);
    return null;
  }
}

async function removeGame(id) {
  if (!id) return false;
  const { error } = await supabase.from('games').delete().eq('id', id);
  if (error) {
    console.error('No se pudo borrar partida en Supabase:', error);
    return false;
  }
  return true;
}

async function updateGame(game) {
  if (!game?.id) return false;
  const { error } = await supabase.from('games').update(toGameInsertRow(game)).eq('id', game.id);
  if (error) {
    console.error('No se pudo actualizar partida en Supabase:', error);
    return false;
  }
  return true;
}

function computeWinnerFromFinalScores(finalScores, players) {
  if (!players?.length) return '';
  let winner = players[0];
  let top = finalScores[winner] ?? 0;
  for (const p of players) {
    const s = finalScores[p] ?? 0;
    if (s > top) {
      top = s;
      winner = p;
    }
  }
  return winner;
}

/** Devuelve null si la partida debe eliminarse (< 2 jugadores); si no, la partida sin el jugador. */
function stripPlayerFromGame(game, playerName) {
  if (!game?.players?.includes(playerName)) return game;
  const remainingPlayers = game.players.filter(p => p !== playerName);
  if (remainingPlayers.length < 2) return null;

  const finalScores = { ...game.finalScores };
  delete finalScores[playerName];

  const rounds = (game.rounds ?? []).map(round => {
    const scores = { ...(round.scores ?? {}) };
    delete scores[playerName];
    return { ...round, scores };
  });

  const winner = computeWinnerFromFinalScores(finalScores, remainingPlayers);

  return {
    ...game,
    players: remainingPlayers,
    finalScores,
    rounds,
    winner,
  };
}

async function executeCascadePlayerDelete(playerName) {
  const trimmed = playerName?.trim();
  if (!trimmed) return false;

  const removedPlayer = await removePlayerName(trimmed);
  if (!removedPlayer) return false;

  const { data: gamesData, error: fetchError } = await supabase
    .from('games')
    .select('*')
    .order('created_at', { ascending: false });
  if (fetchError) {
    console.error('No se pudieron cargar partidas para borrado en cascada:', fetchError);
    return false;
  }

  const affected = (gamesData ?? [])
    .map(normalizeGameRow)
    .filter(g => g.players.includes(trimmed));

  for (const g of affected) {
    const patched = stripPlayerFromGame(g, trimmed);
    if (patched === null) {
      const ok = await removeGame(g.id);
      if (!ok) return false;
    } else {
      const ok = await updateGame(patched);
      if (!ok) return false;
    }
  }

  return true;
}

function updatePlayerStats(players, game) {
  const out = { ...players };
  for (const name of game.players) {
    if (!out[name]) out[name] = emptyPlayerStats(name);
    const p = { ...out[name] }; p.gamesPlayed++; if (game.winner === name) p.wins++;
    p.totalPoints += (game.finalScores[name] || 0);
    if ((game.finalScores[name] || 0) > p.bestGameScore) p.bestGameScore = game.finalScores[name];
    for (const round of game.rounds) { const r = round.scores[name] ?? 0; p.roundsPlayed++; if (r > p.highestRound) p.highestRound = r; }
    out[name] = p;
  }
  return out;
}
function recalculateStats(games) { let p = {}; for (const g of games) p = updatePlayerStats(p, g); return p; }

/** Rank denso: empates comparten puesto; el siguiente puntaje distinto ocupa el siguiente entero (1,1,2,3…). */
function buildDenseRanks(players, getScore) {
  const sorted = [...players].sort((a, b) => getScore(b) - getScore(a));
  const maxScore = sorted.length ? getScore(sorted[0]) : 0;
  const meta = {};
  let rank = 0;
  let prevScore = null;
  for (let i = 0; i < sorted.length; i++) {
    const p = sorted[i];
    const score = getScore(p);
    if (i === 0 || score !== prevScore) {
      rank += 1;
      prevScore = score;
    }
    meta[p] = { rank, isLeader: maxScore > 0 && score === maxScore };
  }
  return { sorted, meta };
}

/** Resuelve fin de partida: empate entre quienes alcanzaron el objetivo, o ganador único. */
function resolveEndGame(totals, players, target, tiebreak) {
  if (tiebreak?.mode) {
    const topScore = Math.max(...players.map(p => totals[p] || 0));
    const leaders = players.filter(p => (totals[p] || 0) === topScore);
    if (leaders.length > 1) return { type: 'tie', leaders };
    return { type: 'win', winner: leaders[0] };
  }
  const qualified = players.filter(p => (totals[p] || 0) >= target);
  if (qualified.length === 0) return { type: 'continue' };
  const topScore = Math.max(...qualified.map(p => totals[p] || 0));
  const leaders = qualified.filter(p => (totals[p] || 0) === topScore);
  if (leaders.length > 1) return { type: 'tie', leaders };
  return { type: 'win', winner: leaders[0] };
}

/** Cuenta cuántas rondas consecutivas con 0 puntos lleva ese jugador desde la última hacia atrás. */
function trailingZeroStreakRounds(rounds, playerName) {
  let n = 0;
  for (let i = rounds.length - 1; i >= 0; i--) {
    const s = rounds[i]?.scores?.[playerName] ?? 0;
    if (s !== 0) break;
    n++;
  }
  return n;
}

// "Alertas Picantes": frases irónicas para 3 rondas seguidas en cero.
const SPICY_PHRASES_SINGLE = [
  '¿{name}, estás jugando al Flip 7 o contando moscas?',
  '¡Alguien que le explique las reglas a {name}!',
  '{name}, tres ceros seguidos... ¿Estás bien?',
  '{name}, la baraja no es la enemiga. ¿O sí?',
  '{name}: 3 rondas, 0 puntos. La constancia importa, eh.',
];

const SPICY_PHRASES_MULTI = [
  '¿Seguro que saben jugar, chicos?',
  'Tres ceros seguidos cada uno. {names}, ¿están jugando o de visita?',
  '{names}: equipo "todavía no me cae la ficha".',
  'Si esto fuera una clase de Flip 7, hoy aplazan: {names}.',
];

function pickSpicyMessage(players) {
  if (!players?.length) return '';
  const arr = players.length === 1 ? SPICY_PHRASES_SINGLE : SPICY_PHRASES_MULTI;
  const tpl = arr[Math.floor(Math.random() * arr.length)];
  return tpl
    .split('{name}').join(players[0] ?? '')
    .split('{names}').join(players.join(' · '));
}

/** Lowercase + strip accents so typed text matches saved names with the same letters. */
function foldForMatch(s) {
  if (s == null || typeof s !== 'string') return '';
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

const SAVED_PLAYER_ALPHA_BUCKETS = [
  { id: 'ag', label: 'A - G', test: (ch) => ch >= 'a' && ch <= 'g' },
  { id: 'hm', label: 'H - M', test: (ch) => ch >= 'h' && ch <= 'm' },
  { id: 'ns', label: 'N - S', test: (ch) => ch >= 'n' && ch <= 's' },
  { id: 'tz', label: 'T - Z', test: (ch) => ch >= 't' && ch <= 'z' },
];

function savedPlayerInitialLetter(name) {
  const folded = foldForMatch(name.trim());
  const m = folded.match(/[a-z]/);
  return m ? m[0] : '';
}

function groupSavedPlayersByAlpha(players) {
  const buckets = SAVED_PLAYER_ALPHA_BUCKETS.map((b) => ({ ...b, players: [] }));
  for (const p of players) {
    const ch = savedPlayerInitialLetter(p);
    const bucket = buckets.find((b) => b.test(ch));
    (bucket ?? buckets[0]).players.push(p);
  }
  return buckets.filter((b) => b.players.length > 0);
}

const MS_24H = 24 * 60 * 60 * 1000;

function isWithinLast24Hours(isoDate) {
  if (!isoDate) return false;
  const ts = Date.parse(isoDate);
  if (!Number.isFinite(ts)) return false;
  return Date.now() - ts < MS_24H;
}

function fmtDate(iso, lang = 'es') {
  if (!iso) return '';
  try {
    const loc = lang === 'en' ? 'en-US' : 'es-AR';
    const d = new Date(iso);
    return d.toLocaleDateString(loc, { day: 'numeric', month: 'short', year: 'numeric' });
  } catch { return ''; }
}

/** Subtítulo en pestaña Ganadas: partidas y victorias en palabras (plural correcto). */
function formatGamesWinsLine(stats, lang) {
  const g = stats.gamesPlayed;
  const w = stats.wins;
  if (lang === 'en') return `${g} game${g !== 1 ? 's' : ''} · ${w} win${w !== 1 ? 's' : ''}`;
  return `${g} partida${g !== 1 ? 's' : ''} · ${w} ganada${w !== 1 ? 's' : ''}`;
}

/** Pie EFICAZ: mismas palabras sin abreviar. */
function formatWinsGamesEff(wins, gamesPlayed, lang) {
  if (!gamesPlayed) return '';
  if (lang === 'en') return `${wins} win${wins !== 1 ? 's' : ''} · ${gamesPlayed} game${gamesPlayed !== 1 ? 's' : ''}`;
  return `${wins} ganada${wins !== 1 ? 's' : ''} · ${gamesPlayed} partida${gamesPlayed !== 1 ? 's' : ''}`;
}

// ═══════ DESIGN ATOMS ═══════

function PageBg({ children, showEric = false }) {
  return (
    <div style={{ height: '100dvh', minHeight: '100dvh', background: C.teal, fontFamily: F.body, color: C.ink, position: 'relative', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      <div style={{ position: 'fixed', inset: 8, border: `4px solid ${C.yellowDark}`, borderRadius: 20, pointerEvents: 'none', zIndex: 1, opacity: 0.5 }} />
      <div style={{ position: 'fixed', inset: 12, border: `2px solid ${C.navy}30`, borderRadius: 16, pointerEvents: 'none', zIndex: 1, opacity: 0.3 }} />
      <div style={{ position: 'fixed', inset: 0, backgroundImage: `radial-gradient(${C.tealDark} 1px, transparent 1px)`, backgroundSize: '16px 16px', opacity: 0.15, pointerEvents: 'none' }} />
      <div style={{
        position: 'relative',
        flex: 1,
        minHeight: 0,
        overflowY: 'auto',
        overflowX: 'hidden',
        overscrollBehavior: 'none',
        WebkitOverflowScrolling: 'touch',
        maxWidth: 460,
        width: '100%',
        margin: '0 auto',
        padding: '10px 18px 20px',
        zIndex: 2,
      }}>
        {children}
        
        {/* Footer dinámico */}
        <div style={{ textAlign: 'center', marginTop: 30, paddingBottom: 20 }}>
          {showEric && (
            <div style={{ fontFamily: F.serif, fontSize: 13, color: C.navy, lineHeight: 1.8, marginBottom: 4 }}>
              A game by Eric Olsen
            </div>
          )}
          <div style={{ color: C.yellow, fontFamily: F.display, fontSize: 11, letterSpacing: '1.5px', textShadow: `1px 1px 0 ${C.navy}80` }}>
            Supported by @piantapp
          </div>
        </div>
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

function Overlay({ children }) {
  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 20,
      zIndex: 50
    }}>
      {children}
    </div>
  );
}

function Badge({ text, color = C.red }) {
  return (
    <div style={{
      position: 'absolute',
      top: -10,
      left: '50%',
      transform: 'translateX(-50%) rotate(-8deg)',
      background: color,
      color: C.white,
      fontSize: 8,
      padding: '3px 10px',
      borderRadius: 6,
      fontFamily: F.display,
      letterSpacing: '1.5px',
      border: `3px solid ${C.navyDark}`,
      whiteSpace: 'nowrap',
      boxShadow: '2px 2px 0 #00000040',
      zIndex: 5
    }}>{text}</div>
  );
}

function OptionRow({ icon: Icon, title, subtitle, onClick, danger = false }) {
  return (
    <button type="button" onClick={onClick} style={{
      width: '100%',
      background: danger ? `${C.red}12` : C.creamLight,
      border: `3px solid ${danger ? C.red : C.navy}`,
      borderRadius: 12,
      padding: '12px 14px',
      cursor: 'pointer',
      textAlign: 'left',
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      boxShadow: `3px 3px 0 ${danger ? C.redDark : C.navyDark}`
    }}>
      <div style={{
        width: 36,
        height: 36,
        borderRadius: 10,
        background: danger ? `${C.red}20` : C.yellow,
        border: `2px solid ${danger ? C.red : C.navy}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0
      }}><Icon size={18} color={danger ? C.red : C.navy} strokeWidth={2.5} /></div>
      <div style={{ flex: 1 }}>
        <div style={{ fontFamily: F.display, fontSize: 11, color: danger ? C.red : C.navy, letterSpacing: '1px' }}>{title}</div>
        {subtitle && <div style={{ fontFamily: F.body, fontSize: 11, color: C.inkSoft, marginTop: 1 }}>{subtitle}</div>}
      </div>
      <ChevronRight size={16} color={danger ? C.red : C.inkSoft} />
    </button>
  );
}

function CardsIcon({ size = 30 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="8" y="4" width="8" height="15" rx="1.5" transform="rotate(-18 12 18)" fill={C.red} stroke={C.navy} strokeWidth="1.5" />
      <rect x="8" y="4" width="8" height="15" rx="1.5" transform="rotate(18 12 18)" fill={C.blueLight} stroke={C.navy} strokeWidth="1.5" />
      <rect x="8" y="4" width="8" height="15" rx="1.5" fill={C.cream} stroke={C.navy} strokeWidth="1.8" />
      <text x="12" y="14" textAnchor="middle" fontFamily={F.display} fontSize="7" fill={C.navy} fontWeight="bold">7</text>
    </svg>
  );
}

function RankBadge({ rank, size = 'sm' }) {
  const bg = rank === 1 ? `linear-gradient(135deg, ${C.yellowBright}, ${C.yellowDark})` : rank === 2 ? `linear-gradient(135deg, #d0d0d0, #a0a0a0)` : rank === 3 ? 'linear-gradient(135deg, #cd9b6a, #a07040)' : C.creamDark;
  const dim = size === 'lg' ? { box: 32, font: 14 } : { box: 24, font: 10 };
  return (
    <div style={{
      width: dim.box, height: dim.box, borderRadius: 999, background: bg,
      border: `2px solid ${C.navy}`, display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: F.display, fontSize: dim.font, color: C.navy, flexShrink: 0,
      boxShadow: rank === 1 ? `0 0 8px ${C.yellow}60` : '2px 2px 0 #00000020'
    }}>{rank}</div>
  );
}

/** Calculadora auxiliar de puntos (no modifica la partida). */
function QuickCalcOverlay({ open, onClose, tx }) {
  const [entry, setEntry] = useState('0');
  const [accum, setAccum] = useState(0);
  const [formula, setFormula] = useState('');

  useEffect(() => {
    if (!open) return;
    setEntry('0');
    setAccum(0);
    setFormula('');
  }, [open]);

  if (!open) return null;

  const parseEntry = () => parseInt(entry, 10) || 0;

  const appendDigit = (d) => {
    setEntry((e) => (e === '0' ? String(d) : `${e}${d}`));
  };

  const clearAll = () => {
    setEntry('0');
    setAccum(0);
    setFormula('');
  };

  const handlePlus = () => {
    const v = parseEntry();
    const next = accum + v;
    setAccum(next);
    setFormula((f) => (f ? `${f} + ${v}` : String(v)));
    setEntry('0');
  };

  const handleEquals = () => {
    const total = accum + parseEntry();
    setAccum(0);
    setEntry(String(total));
    setFormula('');
  };

  const handleMul2 = () => {
    setEntry((e) => String((parseInt(e, 10) || 0) * 2));
  };

  const handlePlus15 = () => {
    setEntry((e) => String((parseInt(e, 10) || 0) + 15));
  };

  const keyStyle = {
    background: C.creamLight,
    border: `3px solid ${C.navy}`,
    borderRadius: 10,
    fontFamily: F.display,
    fontSize: 18,
    color: C.navy,
    cursor: 'pointer',
    padding: '10px 4px',
    minHeight: 44,
    boxShadow: shadowSm(),
  };
  const actionStyle = { ...keyStyle, background: C.yellow };
  const opKeyStyle = {
    ...actionStyle,
    gridColumn: 4,
    gridRow: 'auto',
    alignSelf: 'stretch',
    minHeight: 0,
    fontSize: 20,
    padding: '12px 4px',
  };

  return (
    <Overlay>
      <Card style={{ padding: 16, maxWidth: 320, width: '100%' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Calculator size={20} color={C.navy} strokeWidth={2.5} />
            <div style={{ fontFamily: F.display, fontSize: 14, color: C.navy, letterSpacing: '1px' }}>{tx('game_calc_title')}</div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={tx('game_close')}
            style={{
              background: 'transparent',
              border: 'none',
              color: C.navy,
              cursor: 'pointer',
              padding: 4,
              display: 'flex',
            }}
          >
            <X size={22} strokeWidth={3} />
          </button>
        </div>
        <div style={{
          background: C.navy,
          border: `3px solid ${C.navyDark}`,
          borderRadius: 10,
          padding: '10px 12px',
          marginBottom: 12,
          minHeight: 56,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'flex-end',
        }}>
          {formula ? (
            <div style={{
              fontFamily: F.body,
              fontSize: 11,
              color: C.yellow,
              opacity: 0.85,
              textAlign: 'right',
              marginBottom: 4,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}>{formula}</div>
          ) : null}
          <div style={{
            fontFamily: F.display,
            fontSize: 32,
            color: C.yellow,
            textAlign: 'right',
            lineHeight: 1,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}>{entry}</div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}>
          <button type="button" onClick={clearAll} style={actionStyle}>C</button>
          <button type="button" onClick={handlePlus15} style={actionStyle}>+15</button>
          <button type="button" onClick={handleMul2} style={actionStyle}>×2</button>
          {[7, 8, 9].map((d) => (
            <button key={d} type="button" onClick={() => appendDigit(d)} style={keyStyle}>{d}</button>
          ))}
          {[4, 5, 6].map((d) => (
            <button key={d} type="button" onClick={() => appendDigit(d)} style={keyStyle}>{d}</button>
          ))}
          {[1, 2, 3].map((d) => (
            <button key={d} type="button" onClick={() => appendDigit(d)} style={keyStyle}>{d}</button>
          ))}
          <button type="button" onClick={() => appendDigit(0)} style={{ ...keyStyle, gridColumn: 'span 3' }}>0</button>
          <button type="button" onClick={handlePlus} style={{ ...opKeyStyle, gridRow: '1 / 3' }}>+</button>
          <button type="button" onClick={handleEquals} style={{ ...opKeyStyle, gridRow: '3 / 6' }}>=</button>
        </div>
      </Card>
    </Overlay>
  );
}

// ═══════ SCREENS ═══════

function HomeScreen({ data, onNewGame, onRankings, onHistory, lang, setLang, tx }) {
  const [langOpen, setLangOpen] = useState(false);
  return (
    <PageBg showEric={true}>
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

      <Card style={{ padding: 10, marginBottom: 16 }} glow>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
          <div style={{ textAlign: 'center', padding: '4px 4px 2px' }}>
            <Trophy size={20} color={C.yellow} fill={C.yellow} style={{ marginBottom: 2 }} />
            <div style={{ fontFamily: F.display, fontSize: 30, color: C.navy, lineHeight: 1.05 }}>{data.games.length}</div>
            <div style={{ fontFamily: F.display, fontSize: 14, color: C.inkSoft, letterSpacing: '1.5px', lineHeight: 1.15, marginTop: 2 }}>{tx('home_stat_games')}</div>
          </div>
          <div style={{ textAlign: 'center', padding: '4px 4px 2px' }}>
            <Users size={20} color={C.yellow} strokeWidth={2.5} style={{ marginBottom: 2 }} />
            <div style={{ fontFamily: F.display, fontSize: 30, color: C.navy, lineHeight: 1.05 }}>{Object.keys(data.players).length}</div>
            <div style={{ fontFamily: F.display, fontSize: 14, color: C.inkSoft, letterSpacing: '1.5px', lineHeight: 1.15, marginTop: 2 }}>{tx('home_stat_players')}</div>
          </div>
        </div>
      </Card>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 20 }}>
        <Btn onClick={onNewGame} icon={CardsIcon} style={{ fontSize: 18, padding: '12px 20px' }}>{tx('home_new_game')}</Btn>
        <Btn onClick={onRankings} variant="secondary" icon={Trophy} style={{ fontSize: 18, padding: '12px 20px' }}>{tx('home_rankings')}</Btn>
        <Btn onClick={onHistory} variant="secondary" icon={History} style={{ fontSize: 18, padding: '12px 20px' }}>{tx('home_history')}</Btn>
        <Btn onClick={() => setLangOpen(true)} variant="secondary" icon={Languages} style={{ fontSize: 18, padding: '12px 20px' }}>{tx('home_language')}</Btn>
      </div>

      {langOpen && (
        <Overlay><Card style={{ padding: 20, maxWidth: 320, width: '100%' }}>
          <div style={{ fontFamily: F.display, fontSize: 16, color: C.navy, marginBottom: 14 }}>{tx('home_lang_title')}</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <Btn onClick={() => { setLang('es'); setLangOpen(false); }} variant={lang === 'es' ? undefined : 'secondary'}>{tx('home_lang_es')}</Btn>
            <Btn onClick={() => { setLang('en'); setLangOpen(false); }} variant={lang === 'en' ? undefined : 'secondary'}>{tx('home_lang_en')}</Btn>
          </div>
          <div style={{ marginTop: 12 }}><Btn onClick={() => setLangOpen(false)} variant="secondary">{tx('setup_cancel')}</Btn></div>
        </Card></Overlay>
      )}
    </PageBg>
  );
}

function SetupScreen({ data, selected, setSelected, onStart, onBack, onDeleteSavedPlayer, onSavePlayer, tx }) {
  const [name, setName] = useState('');
  const [confirmDeleteSaved, setConfirmDeleteSaved] = useState(null);
  const [alertMessage, setAlertMessage] = useState(null);
  const [suppressSavedSuggestions, setSuppressSavedSuggestions] = useState(false);
  const [suggestionHoverIdx, setSuggestionHoverIdx] = useState(null);
  const nameRowRef = useRef(null);

  useEffect(() => {
    setSuggestionHoverIdx(null);
  }, [name]);

  useEffect(() => {
    const closeSuggestions = (e) => {
      if (!nameRowRef.current?.contains(e.target)) setSuppressSavedSuggestions(true);
    };
    document.addEventListener('mousedown', closeSuggestions);
    document.addEventListener('touchstart', closeSuggestions, { passive: true });
    return () => {
      document.removeEventListener('mousedown', closeSuggestions);
      document.removeEventListener('touchstart', closeSuggestions);
    };
  }, []);

  const existing = Object.keys(data.players).sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
  const available = existing
    .filter(p => !selected.includes(p))
    .sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
  const lastGame = data.games.length > 0 ? data.games[0] : null;
  const showLastGameReplay = lastGame
    && lastGame.players?.length >= 2
    && selected.length === 0
    && isWithinLast24Hours(lastGame.date ?? lastGame.created_at);
  const savedPlayerGroups = groupSavedPlayersByAlpha(available);

  const qq = foldForMatch(name.trim());
  let savedMatchSuggestions = [];
  if (qq) {
    savedMatchSuggestions = existing.filter(p => !selected.includes(p) && foldForMatch(p).startsWith(qq));
    savedMatchSuggestions.sort((a, b) => {
      const ap = foldForMatch(a).startsWith(qq);
      const bp = foldForMatch(b).startsWith(qq);
      if (ap !== bp) return ap ? -1 : 1;
      return a.localeCompare(b, undefined, { sensitivity: 'base' });
    });
    savedMatchSuggestions = savedMatchSuggestions.slice(0, 12);
  }

  const showSavedSuggestions = qq.length > 0 && savedMatchSuggestions.length > 0 && !suppressSavedSuggestions;

  const selectedHasCi = (nm) => selected.some(s => foldForMatch(s) === foldForMatch(nm));

  const addNew = () => {
    const t = name.trim(); if (!t) return;
    const match = existing.find(p => foldForMatch(p) === foldForMatch(t));
    const fn = match || t;
    if (selectedHasCi(fn)) {
      setAlertMessage(tx('setup_dup'));
      return;
    }
    setSelected([...selected, fn]); setName('');
    setSuppressSavedSuggestions(true);
    if (!match) onSavePlayer(fn);
  };

  const add = (p) => {
    if (selectedHasCi(p)) {
      setAlertMessage(tx('setup_dup'));
      return;
    }
    setSelected([...selected, p]); setName('');
    setSuppressSavedSuggestions(true);
  };

  const pickSavedSuggestion = (p) => {
    add(p);
  };

  const remove = (p) => setSelected(selected.filter(x => x !== p));

  const handleTryStart = () => {
    if (name.trim() !== '') {
      setAlertMessage(tx('setup_pending'));
      return;
    }
    onStart();
  };

  const handleTryDelete = (p) => {
    const gameCount = data.games.filter(g => g.players.includes(p)).length;
    setConfirmDeleteSaved({ name: p, gameCount });
  };

  return (
    <PageBg showEric={false}>
      <HeaderBar title={tx('setup_title')} onBack={onBack} />

      {showLastGameReplay && (
        <Card style={{ padding: 14, marginBottom: 12, background: C.creamLight, border: `3px dashed ${C.yellow}` }}>
          <div style={{ fontFamily: F.body, fontSize: 14, color: C.inkSoft, marginBottom: 12, lineHeight: 1.4 }}>
            {tx('setup_last_q_before')}
            <span style={{ color: C.navyDark, fontWeight: 700 }}>{tx('setup_last_q_em')}</span>
            {tx('setup_last_q_after')}
          </div>
          <div style={{ fontFamily: F.body, fontSize: 12, color: C.navy, marginBottom: 12, fontWeight: 600 }}>
            {lastGame.players.join(' · ')}
          </div>
          <Btn onClick={() => setSelected([...lastGame.players])} icon={RotateCcw} style={{ fontSize: 14, padding: '12px 16px' }}>
            {tx('setup_use')}
          </Btn>
        </Card>
      )}

      {selected.length > 0 && (
      <Card style={{ padding: 14, marginBottom: 12 }}>
        <div style={{ fontFamily: F.display, fontSize: 12, color: C.navy, letterSpacing: '2px', marginBottom: 10 }}>{tx('setup_players')} ({selected.length})</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            {selected.map((p, i) => (
              <div key={p} style={{
                display: 'flex', alignItems: 'center', gap: 10,
                background: C.navy, padding: '7px 10px 7px 7px', borderRadius: 10,
                border: `2px solid ${C.yellow}60`
              }}>
                <div style={{ width: 24, height: 24, borderRadius: 999, background: C.yellow, color: C.navy, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: F.display, fontSize: 11, flexShrink: 0, border: `2px solid ${C.navyDark}` }}>{i + 1}</div>
                <div style={{ flex: 1, fontFamily: F.display, fontSize: 12, color: C.yellow }}>{p}</div>
                <button type="button" onClick={() => remove(p)} style={{ background: 'transparent', border: 'none', color: C.yellow, cursor: 'pointer', display: 'flex', padding: 3 }}><X size={16} strokeWidth={3} /></button>
              </div>
            ))}
          </div>
      </Card>
      )}

      <Card style={{ padding: '10px 12px', marginBottom: 10 }}>
        <div style={{
          fontFamily: F.display,
          fontSize: 14,
          color: C.navy,
          letterSpacing: '2.5px',
          marginBottom: 4,
          textAlign: 'center',
        }}>{tx('setup_add_new')}</div>
        <div ref={nameRowRef} style={{ display: 'flex', gap: 6, alignItems: 'stretch' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: 0, zIndex: showSavedSuggestions ? 70 : 1 }}>
            <input
              value={name}
              onChange={(e) => { setName(e.target.value); setSuppressSavedSuggestions(false); }}
              onKeyDown={(e) => { if (e.key === 'Enter') addNew(); }}
              placeholder={tx('setup_ph_name')}
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
              style={{
                width: '100%',
                height: 44,
                minHeight: 44,
                boxSizing: 'border-box',
                background: C.creamLight,
                border: '3px solid #000080',
                borderRadius: 10,
                padding: '0 12px',
                fontFamily: F.body,
                fontSize: 16,
                lineHeight: '22px',
                color: C.ink,
                outline: 'none',
                boxShadow: `inset 2px 2px 0 ${C.creamDark}`,
              }}
            />
            {showSavedSuggestions && (
              <div
                role="listbox"
                aria-label={tx('setup_saved')}
                onMouseLeave={() => setSuggestionHoverIdx(null)}
                style={{
                  position: 'absolute',
                  left: 0,
                  right: 0,
                  top: 'calc(100% + 2px)',
                  zIndex: 80,
                  background: C.creamLight,
                  border: '3px solid #000080',
                  borderRadius: 10,
                  boxShadow: '0 4px 14px rgba(0, 0, 128, 0.18), 0 2px 6px rgba(0, 0, 0, 0.08)',
                  maxHeight: 220,
                  overflowY: 'auto',
                  WebkitOverflowScrolling: 'touch',
                }}
              >
                {savedMatchSuggestions.map((p, idx) => (
                  <button
                    key={p}
                    type="button"
                    role="option"
                    aria-selected={suggestionHoverIdx === idx}
                    onMouseEnter={() => setSuggestionHoverIdx(idx)}
                    onTouchStart={() => setSuggestionHoverIdx(idx)}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => pickSavedSuggestion(p)}
                    style={{
                      width: '100%',
                      textAlign: 'left',
                      border: 'none',
                      borderBottom: idx === savedMatchSuggestions.length - 1 ? 'none' : '1px solid rgba(0, 0, 128, 0.12)',
                      background: suggestionHoverIdx === idx ? 'rgba(244, 212, 77, 0.42)' : 'transparent',
                      padding: '11px 14px',
                      fontFamily: F.body,
                      fontSize: 15,
                      fontWeight: 600,
                      color: '#000080',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      transition: 'background 0.12s ease',
                    }}
                  >
                    <Users size={16} strokeWidth={2.5} color={C.inkSoft} style={{ flexShrink: 0 }} />
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={addNew}
            style={{
              flexShrink: 0,
              height: 44,
              minHeight: 44,
              minWidth: 48,
              boxSizing: 'border-box',
              padding: '0 12px',
              background: C.yellow,
              border: '3px solid #000080',
              borderRadius: 10,
              cursor: 'pointer',
              boxShadow: shadowSm(),
              color: C.navy,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Plus size={22} strokeWidth={3} />
          </button>
        </div>
        <Btn onClick={handleTryStart} disabled={selected.length < 2} style={{ marginTop: 8, padding: '8px 16px' }}>
          {selected.length < 2 ? (selected.length === 0 ? tx('setup_need2') : tx('setup_need1')) : tx('setup_start')}
        </Btn>
      </Card>

      {available.length > 0 && (
        <Card style={{ padding: '8px 8px 6px', marginBottom: 12 }}>
          <div style={{
            fontFamily: F.display,
            fontSize: 12,
            color: C.navy,
            letterSpacing: '2px',
            marginBottom: 4,
            textAlign: 'center',
          }}>{tx('setup_saved')}</div>
          {savedPlayerGroups.map((bucket, bi) => (
            <div key={bucket.id} style={{ marginBottom: bi < savedPlayerGroups.length - 1 ? 4 : 0 }}>
              <div style={{
                borderTop: `1px solid rgba(46, 58, 140, 0.15)`,
                paddingTop: 5,
                marginBottom: 4,
              }}>
                <div style={{
                  fontFamily: F.body,
                  fontSize: 8,
                  fontWeight: 600,
                  color: C.inkSoft,
                  letterSpacing: '0.8px',
                  lineHeight: 1,
                }}>{bucket.label}</div>
              </div>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
                gap: 5,
                width: '100%',
              }}>
                {bucket.players.map(p => (
                  <span
                    key={p}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'flex-start',
                      textAlign: 'left',
                      paddingLeft: 7,
                      paddingRight: 1,
                      width: '100%',
                      minWidth: 0,
                      background: C.cream,
                      border: `2px solid ${C.navy}`,
                      borderRadius: 999,
                      boxShadow: '1px 1px 0 #00000012',
                      overflow: 'hidden',
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => add(p)}
                      style={{
                        flex: 1,
                        minWidth: 0,
                        border: 'none',
                        background: 'transparent',
                        color: C.navy,
                        padding: '3px 2px 3px 0',
                        fontFamily: F.body,
                        fontSize: 11,
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'flex-start',
                        gap: 3,
                        textAlign: 'left',
                      }}
                    >
                      <Plus size={9} strokeWidth={3} style={{ flexShrink: 0 }} />
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textAlign: 'left' }}>{p}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleTryDelete(p)}
                      aria-label={tx('setup_delete')}
                      style={{
                        flexShrink: 0,
                        border: 'none',
                        borderLeft: `1px solid ${C.navy}18`,
                        background: 'transparent',
                        color: C.red,
                        opacity: 0.55,
                        padding: '3px 4px',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Trash2 size={9} strokeWidth={2.5} />
                    </button>
                  </span>
                ))}
              </div>
            </div>
          ))}
        </Card>
      )}

      {confirmDeleteSaved && (
        <Overlay><Card style={{ padding: 20, maxWidth: 320, width: '100%' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
            <AlertTriangle color={C.red} size={22} />
            <div style={{ fontFamily: F.display, fontSize: 16, color: C.navy }}>
              {confirmDeleteSaved.gameCount > 0 ? tx('setup_delete_cascade_title') : tx('setup_sure')}
            </div>
          </div>
          <div style={{ fontFamily: F.body, fontSize: 14, color: C.inkSoft, marginBottom: 16, lineHeight: 1.5 }}>
            {confirmDeleteSaved.gameCount > 0
              ? tx('setup_delete_cascade', { name: confirmDeleteSaved.name, count: confirmDeleteSaved.gameCount })
              : tx('setup_delete_confirm', { name: confirmDeleteSaved.name })}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <Btn onClick={() => setConfirmDeleteSaved(null)} variant="secondary">{tx('setup_cancel')}</Btn>
            <Btn
              onClick={() => {
                const { name } = confirmDeleteSaved;
                setConfirmDeleteSaved(null);
                onDeleteSavedPlayer(name);
              }}
              variant="danger"
            >{tx('setup_delete')}</Btn>
          </div>
        </Card></Overlay>
      )}

      {alertMessage && (
        <Overlay><Card style={{ padding: 20, maxWidth: 320, width: '100%' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
            <AlertTriangle color={C.yellowDark} size={22} />
            <div style={{ fontFamily: F.display, fontSize: 16, color: C.navy }}>{tx('setup_notice')}</div>
          </div>
          <div style={{ fontFamily: F.body, fontSize: 14, color: C.inkSoft, marginBottom: 16, lineHeight: 1.5 }}>
            {alertMessage}
          </div>
          <Btn onClick={() => setAlertMessage(null)}>{tx('setup_ok')}</Btn>
        </Card></Overlay>
      )}
    </PageBg>
  );
}

function GameScreen({ game, scores, setScores, onCloseRound, onAbandon, onChangeTarget, onResetGame, onAddPlayer, onModifyRound, onSetTiebreakMode, existingPlayers, tx, lang }) {
  const [tab, setTab] = useState('anotar');
  const [modal, setModal] = useState(null); 
  const [editingRound, setEditingRound] = useState(null);
  const [editScores, setEditScores] = useState({});
  const [newPlayerName, setNewPlayerName] = useState('');
  const [newPlayerPoints, setNewPlayerPoints] = useState('0');
  const [newPlayerCustomPts, setNewPlayerCustomPts] = useState('');
  const [scoreWarningConfirmed, setScoreWarningConfirmed] = useState(false);
  const [flippeadorAlert, setFlippeadorAlert] = useState(null);
  const [spicyAlert, setSpicyAlert] = useState(null);
  const [tiebreakLeaders, setTiebreakLeaders] = useState([]);
  const [isCalcOpen, setIsCalcOpen] = useState(false);
  const inputRefs = useRef([]);

  const roundNum = game.rounds.length + 1;
  const target = game.targetScore;
  const { sorted: ranked, meta: rankMeta } = buildDenseRanks(game.players, p => game.totals[p] ?? 0);

  const MAX_SCORE = 179;
  const WARN_SCORE = 70;
  const FLIP_NEAR_PTS = 40;

  const computeRoundProjection = () => {
    const projectedTotals = {};
    for (const p of game.players) {
      const roundScore = parseInt(scores[p], 10) || 0;
      projectedTotals[p] = (game.totals[p] || 0) + roundScore;
    }
    const someOneWon = game.players.some(p => projectedTotals[p] >= target);
    const nearWin = game.players.filter(p => {
      const pt = projectedTotals[p];
      const rem = target - pt;
      return !someOneWon && pt < target && rem > 0 && rem <= FLIP_NEAR_PTS;
    });
    return { projectedTotals, someOneWon, nearWin };
  };

  const maybeOpenSpicyAlert = (g) => {
    if (!g?.rounds?.length || !g.players?.length) return;
    const offenders = g.players.filter(p => trailingZeroStreakRounds(g.rounds, p) >= 3);
    if (offenders.length === 0) return;
    if (Math.random() < 0.5) {
      setSpicyAlert({ players: offenders, message: pickSpicyMessage(offenders) });
    }
  };

  const applyCloseRoundResult = (result) => {
    if (!result?.status || result.status === 'invalid') return;
    if (result?.status === 'tie') {
      setTiebreakLeaders(result.leaders ?? game.tiebreak?.players ?? []);
      setModal('tiebreak');
      setTab('resultados');
      return;
    }
    if (result?.status === 'continued' || result?.status === 'finished') {
      setTab('resultados');
    }
    if (result?.status === 'continued' && result.gameAfter) {
      maybeOpenSpicyAlert(result.gameAfter);
    }
  };

  const handleCloseRound = async () => {
    const roundPts = (p) => {
      const raw = scores[p];
      if (raw === '' || raw === undefined) return 0;
      const n = parseInt(raw, 10);
      return isNaN(n) ? 0 : n;
    };
    const impossible = game.players.filter(p => roundPts(p) > MAX_SCORE);
    if (impossible.length > 0) {
      setModal('impossible');
      return;
    }
    const suspicious = game.players.filter(p => roundPts(p) >= WARN_SCORE);
    if (suspicious.length > 0 && !scoreWarningConfirmed) {
      setModal('scoreWarning');
      return;
    }

    const { projectedTotals, someOneWon, nearWin } = computeRoundProjection();

    if (nearWin.length > 0 && !someOneWon) {
      if (nearWin.length > 1) {
        setFlippeadorAlert({ type: 'multiple' });
      } else {
        const name = nearWin[0];
        const rem = Math.max(0, target - projectedTotals[name]);
        setFlippeadorAlert({ type: 'single', name, remaining: rem });
      }
      setModal('flippeadorAlert');
    } else {
      setScoreWarningConfirmed(false);
      const result = await onCloseRound();
      applyCloseRoundResult(result);
    }
  };

  const confirmSuspiciousScore = async () => {
    setScoreWarningConfirmed(true);
    setModal(null);
    const { projectedTotals, someOneWon, nearWin } = computeRoundProjection();
    if (nearWin.length > 0 && !someOneWon) {
      if (nearWin.length > 1) {
        setFlippeadorAlert({ type: 'multiple' });
      } else {
        const name = nearWin[0];
        const rem = Math.max(0, target - projectedTotals[name]);
        setFlippeadorAlert({ type: 'single', name, remaining: rem });
      }
      setModal('flippeadorAlert');
      return;
    }
    setScoreWarningConfirmed(false);
    const result = await onCloseRound();
    applyCloseRoundResult(result);
    setTimeout(() => setScoreWarningConfirmed(false), 100);
  };

  const scoringPlayers = game.tiebreak?.mode === 'tied_only'
    ? game.players.filter(p => (game.tiebreak?.players ?? []).includes(p))
    : game.players;

  const focusScoreInputAt = (idx) => {
    const el = inputRefs.current[idx];
    if (!el) return;
    setTimeout(() => {
      el.focus({ preventScroll: true });
      el.select();
    }, 0);
  };

  const handleScoreKeyDown = (e, currentIdx) => {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    e.stopPropagation();

    const nextIdx = currentIdx + 1;
    if (nextIdx < scoringPlayers.length) {
      focusScoreInputAt(nextIdx);
      return;
    }
    e.currentTarget.blur();
    handleCloseRound();
  };

  const handleScoresFormSubmit = (e) => {
    e.preventDefault();
  };

  const handleTiebreakChoice = (mode) => {
    onSetTiebreakMode(mode, tiebreakLeaders);
    setModal(null);
    setTab('anotar');
  };

  const headerStatLabel = { fontFamily: F.display, fontSize: 7, color: C.navy, letterSpacing: '1.5px', lineHeight: 1.1 };
  const headerStatValue = { fontFamily: F.display, fontSize: 20, color: C.navy, lineHeight: 1 };
  const headerStatCard = {
    flex: 1,
    minWidth: 0,
    background: C.yellow,
    border: `2.5px solid ${C.navy}`,
    borderRadius: 8,
    padding: '3px 8px',
    boxShadow: shadowSm(),
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
  };

  return (
    <PageBg showEric={false}>
      <div style={{ paddingTop: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'stretch', marginBottom: 26, gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'stretch', gap: 10, flex: 1, minWidth: 0 }}>
          <div style={{ ...headerStatCard, flex: 1, padding: '4px 10px' }}>
            <div style={headerStatLabel}>{tx('game_round')}</div>
            <div style={headerStatValue}>{String(roundNum).padStart(2, '0')}</div>
            <div style={{
              fontFamily: F.body,
              fontSize: 9,
              fontWeight: 600,
              color: C.navy,
              lineHeight: 1.2,
              marginTop: 2,
              letterSpacing: '0.3px',
            }}>
              {tx('game_goal')}: {target} {tx('game_pts')}
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsCalcOpen(true)}
            aria-label={tx('game_calc_title')}
            style={{
              flexShrink: 0,
              alignSelf: 'stretch',
              width: 52,
              minWidth: 52,
              background: C.yellow,
              border: `3px solid ${C.navy}`,
              borderRadius: 12,
              boxShadow: shadowSm(),
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 0,
            }}
          >
            <Calculator size={24} strokeWidth={2.5} color={C.navy} />
          </button>
        </div>
        <button type="button" onClick={() => setModal('options')} style={{
          alignSelf: 'stretch',
          background: C.yellow, border: `2.5px solid ${C.navy}`, borderRadius: 8,
          padding: '8px 12px', cursor: 'pointer', boxShadow: shadowSm(),
          fontFamily: F.display, fontSize: 9, letterSpacing: '1px', color: C.navy,
          display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0,
        }}><Settings size={14} strokeWidth={2.5} /> {tx('game_options')}</button>
      </div>

      <div style={{ display: 'flex', gap: 0, marginBottom: -4, position: 'relative', zIndex: 3 }}>
        {[{ id: 'anotar', label: `${tx('game_round')} ${String(roundNum).padStart(2, '0')}` }, { id: 'resultados', label: tx('game_ranking') }].map((tb) => {
          const active = tab === tb.id;
          return (
            <button key={tb.id} onClick={() => { setTab(tb.id); }} style={{
              flex: 1, padding: '12px 10px',
              background: active ? C.cream : C.tealDark,
              color: active ? C.navy : C.creamLight,
              border: `4px solid ${C.navy}`,
              borderBottom: active ? `4px solid ${C.cream}` : `4px solid ${C.navy}`,
              borderRadius: '14px 14px 0 0',
              fontFamily: F.display, fontSize: 15, letterSpacing: '1.5px',
              fontWeight: active ? 400 : 600,
              textShadow: active ? 'none' : `0 1px 2px ${C.tealShadow}, 0 0 1px ${C.navyDark}`,
              cursor: 'pointer',
              transform: active ? 'translateY(0)' : 'translateY(4px)',
              zIndex: active ? 4 : 2,
              boxShadow: active ? 'none' : `inset 0 -3px 0 ${C.tealShadow}`,
            }}>{tb.label}</button>
          );
        })}
      </div>

      <div style={{
        background: C.cream, border: `4px solid ${C.navy}`, borderRadius: '0 0 16px 16px',
        boxShadow: shadow(C.navyDark, 5, 5), padding: '6px 8px', position: 'relative', zIndex: 2
      }}>

      {tab === 'anotar' && (<>
        <form onSubmit={handleScoresFormSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {scoringPlayers.map((p, idx) => {
            const total = game.totals[p];
            const pct = Math.min(100, (total / target) * 100);
            const isLeader = rankMeta[p]?.isLeader;
            const barColor = pct < 40 ? C.red : pct < 75 ? C.yellow : C.green;
            const isBustDisabled = (scores[p] === '0' || scores[p] === '');

            return (
              <div key={p} style={{
                position: 'relative',
                background: C.creamLight,
                border: `2px solid ${C.navy}`,
                borderRadius: 10,
                padding: '5px 8px 8px',
                boxShadow: '1px 1px 0 #00000010',
                overflow: 'hidden',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
                  <div style={{ flex: 1, minWidth: 0, paddingRight: 4 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, lineHeight: 1.1, minWidth: 0 }}>
                      {isLeader && <Crown size={13} color={C.yellow} fill={C.yellow} stroke={C.navy} strokeWidth={2} style={{ flexShrink: 0 }} />}
                      <span style={{ fontFamily: F.display, fontSize: 14, color: C.navy, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, minWidth: 0 }}>{p}</span>
                      <span style={{ fontFamily: F.display, fontSize: 17, color: C.navy, flexShrink: 0 }}>{total}</span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                    <input
                      ref={(el) => {
                        if (el) inputRefs.current[idx] = el;
                        else delete inputRefs.current[idx];
                      }}
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      enterKeyHint={idx < scoringPlayers.length - 1 ? 'next' : 'done'}
                      autoComplete="off"
                      name={`score-${p}`}
                      value={scores[p] ?? ''}
                      onFocus={(e) => { if (e.target.value === '0') setScores({ ...scores, [p]: '' }); }}
                      onBlur={(e) => { if (e.target.value === '') setScores({ ...scores, [p]: '0' }); }}
                      onChange={(e) => setScores({ ...scores, [p]: e.target.value.replace(/[^0-9]/g, '') })}
                      onKeyDown={(e) => handleScoreKeyDown(e, idx)}
                      placeholder="0"
                      style={{
                        width: 120,
                        height: 32,
                        boxSizing: 'border-box',
                        background: C.white,
                        border: `2px solid ${C.navy}`,
                        borderRadius: 7,
                        padding: '0 8px',
                        textAlign: 'center',
                        fontFamily: F.display,
                        fontSize: 15,
                        lineHeight: 1,
                        color: C.navy,
                        outline: 'none',
                        boxShadow: `inset 1px 1px 0 ${C.creamDark}`,
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => { if (!isBustDisabled) setScores({ ...scores, [p]: '0' }); }}
                      style={{
                        background: isBustDisabled ? `${C.red}40` : C.red,
                        color: C.white,
                        border: `2px solid ${C.navyDark}`,
                        borderRadius: 7,
                        height: 32,
                        boxSizing: 'border-box',
                        padding: '0 8px',
                        cursor: isBustDisabled ? 'default' : 'pointer',
                        fontFamily: F.display,
                        fontSize: 8,
                        letterSpacing: '0.5px',
                        boxShadow: isBustDisabled ? 'none' : '1px 1px 0 #00000030',
                        flexShrink: 0,
                        opacity: isBustDisabled ? 0.7 : 1,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >BUST</button>
                  </div>
                </div>
                <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 3, background: C.creamDark }}>
                  <div style={{ width: `${pct}%`, height: '100%', background: barColor, transition: 'width 0.4s' }} />
                </div>
              </div>
            );
          })}
        </form>
        <div style={{ marginTop: 12 }}>
          <Btn onClick={handleCloseRound} icon={Zap} style={{ padding: '10px' }}>{tx('game_add_round')}</Btn>
        </div>
      </>)}

      {tab === 'resultados' && (<>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
          {ranked.map((p) => {
            const total = game.totals[p]; const remaining = Math.max(0, target - total);
            const pct = Math.min(100, (total / target) * 100);
            const barColor = pct < 40 ? C.red : pct < 75 ? C.yellow : C.green;
            const { rank, isLeader } = rankMeta[p];
            return (
              <div key={p} style={{ 
                display: 'flex', alignItems: 'center', gap: 8, padding: '8px 8px', 
                background: C.creamLight, borderRadius: 10, borderBottom: `1.5px solid ${C.navy}10` 
              }}>
                <RankBadge rank={rank} />
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    {isLeader && <Crown size={12} color={C.yellow} fill={C.yellow} stroke={C.navy} strokeWidth={2} />}
                    <span style={{ fontFamily: F.display, fontSize: 21, color: C.navy }}>{p}</span> {/* -1 pt */}
                  </div>
                  <div style={{ height: 4, background: C.creamDark, borderRadius: 999, marginTop: 3, border: `1px solid ${C.navy}20`, overflow: 'hidden' }}>
                    <div style={{ width: `${pct}%`, height: '100%', background: barColor, borderRadius: 999, transition: 'width 0.4s' }} />
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontFamily: F.display, fontSize: 21, color: C.navy, lineHeight: 1 }}>{total}</div> {/* -1 pt */}
                  <div style={{ 
                    fontFamily: F.display, fontSize: 14,
                    color: barColor === C.yellow ? C.yellowDeep : barColor, letterSpacing: '0.5px', fontWeight: 'bold', marginTop: 2, lineHeight: 1.2,
                  }}>{tx('game_faltan')} {remaining}</div>
                </div>
              </div>
            );
          })}
        </div>
        <div style={{ marginTop: 16 }}>
          <Btn onClick={() => { setTab('anotar'); }} icon={Zap} style={{ padding: '10px' }}>{tx('game_score_round')} {String(roundNum).padStart(2, '0')}</Btn>
        </div>
      </>)}
      </div>

      {/* Modales de alertas, empate, opciones se mantienen igual pero dentro de PageBg showEric=false */}
      <QuickCalcOverlay open={isCalcOpen} onClose={() => setIsCalcOpen(false)} tx={tx} />

      {modal === 'flippeadorAlert' && flippeadorAlert && (
        <Overlay><Card style={{ padding: 25, maxWidth: 360, width: '90%', textAlign: 'center', border: `4px solid ${C.navy}` }}>
          <div style={{ fontFamily: F.display, fontSize: 22, color: C.red, marginBottom: 15 }}>{tx('game_flip_title')}</div>
          <div style={{ fontFamily: F.body, fontSize: 16, color: C.navy, lineHeight: 1.5, marginBottom: 20, fontWeight: 'bold' }}>
            {flippeadorAlert.type === 'single'
              ? <>{lang === 'es' ? '¡' : ''}<span style={{ color: C.red }}>{flippeadorAlert.name}</span> {tx('game_flip_single_rest', { n: flippeadorAlert.remaining })}</>
              : tx('game_flip_multi', { m: FLIP_NEAR_PTS })}
          </div>
          <Btn onClick={() => {
            setModal(null);
            setScoreWarningConfirmed(false);
            onCloseRound().then(applyCloseRoundResult);
          }}>{tx('game_understood')}</Btn>
        </Card></Overlay>
      )}

      {modal === 'tiebreak' && tiebreakLeaders.length > 0 && (
        <Overlay><Card style={{ padding: 22, maxWidth: 380, width: '100%' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            <AlertTriangle color={C.red} size={24} />
            <div style={{ fontFamily: F.display, fontSize: 18, color: C.red, letterSpacing: '1px' }}>{tx('game_tie_attn')}</div>
          </div>
          <div style={{ fontFamily: F.body, fontSize: 14, color: C.ink, marginBottom: 18, lineHeight: 1.5 }}>
            {tx('game_tie_body', { count: tiebreakLeaders.length, names: tiebreakLeaders.join(' · ') })}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <Btn onClick={() => handleTiebreakChoice('all')} icon={Users} style={{ fontSize: 13, padding: '12px 10px' }}>
              {tx('game_tie_all')}
            </Btn>
            <Btn onClick={() => handleTiebreakChoice('tied_only')} icon={Zap} variant="secondary" style={{ fontSize: 13, padding: '12px 10px' }}>
              {tx('game_tie_tied_only')}
            </Btn>
          </div>
        </Card></Overlay>
      )}

      {spicyAlert && (
        <Overlay>
          <div style={{
            maxWidth: 380, width: '100%',
            borderRadius: 18,
            background: 'linear-gradient(135deg, #FF7A1A 0%, #FF3B86 55%, #8B2AC8 100%)',
            border: `4px solid ${C.navyDark}`,
            boxShadow: `${shadow(C.navyDark, 6, 6)}, 0 0 30px rgba(255, 122, 26, 0.45)`,
            padding: 24,
            color: C.white,
            position: 'relative',
            overflow: 'hidden',
          }}>
            <div style={{
              position: 'absolute', inset: 6, border: '2px dashed rgba(255,255,255,0.4)',
              borderRadius: 12, pointerEvents: 'none'
            }} />
            <div style={{
              fontFamily: F.display, fontSize: 22, letterSpacing: '2px',
              textShadow: '3px 3px 0 rgba(0,0,0,0.35)', marginBottom: 14,
              display: 'flex', alignItems: 'center', gap: 8, position: 'relative'
            }}>
              <span style={{ fontSize: 26 }}>🌶️</span>
              ¡ALERTA PICANTE!
            </div>
            <div style={{
              fontFamily: F.body, fontSize: 16, lineHeight: 1.45, fontWeight: 700,
              textShadow: '1px 1px 0 rgba(0,0,0,0.35)', marginBottom: 20, position: 'relative'
            }}>
              {spicyAlert.message}
            </div>
            <button onClick={() => setSpicyAlert(null)} style={{
              width: '100%', padding: '12px 16px',
              background: C.yellow, color: C.navyDark,
              border: `3px solid ${C.navyDark}`, borderRadius: 12,
              fontFamily: F.display, fontSize: 15, letterSpacing: '1.5px',
              boxShadow: shadow(C.navyDark, 3, 3), cursor: 'pointer', position: 'relative'
            }}>PROMETO MEJORAR</button>
          </div>
        </Overlay>
      )}

      {modal === 'options' && (
        <Overlay><Card style={{ padding: 18, maxWidth: 340, width: '100%' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
            <Settings size={20} color={C.navy} strokeWidth={2.5} />
            <div style={{ fontFamily: F.display, fontSize: 16, color: C.navy }}>{tx('game_opt_h')}</div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <OptionRow icon={Target} title={tx('game_opt_target')} subtitle={tx('game_opt_target_sub', { n: target })} onClick={() => setModal('target')} />
            <OptionRow icon={Edit3} title={tx('game_opt_edit')} subtitle={tx('game_opt_edit_sub')} onClick={() => setModal('selectRound')} />
            <OptionRow icon={UserPlus} title={tx('game_opt_add')} subtitle={tx('game_opt_add_sub')} onClick={() => { setModal('addPlayer'); setNewPlayerName(''); setNewPlayerPoints('0'); setNewPlayerCustomPts(''); }} />
            <OptionRow icon={RotateCcw} title={tx('game_opt_reset')} subtitle={tx('game_opt_reset_sub')} onClick={() => setModal('reset')} />
            <OptionRow icon={X} title={tx('game_opt_leave')} subtitle={tx('game_opt_leave_sub')} onClick={() => setModal('confirmAbandon')} danger />
          </div>
          <div style={{ marginTop: 12 }}><Btn onClick={() => setModal(null)} variant="secondary" style={{ fontSize: 14 }}>{tx('game_close')}</Btn></div>
        </Card></Overlay>
      )}

      {modal === 'target' && (
        <Overlay><Card style={{ padding: 20, maxWidth: 360, width: '100%' }}>
          <div style={{ fontFamily: F.display, fontSize: 16, color: C.navy, marginBottom: 4 }}>{tx('game_new_target')}</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
            {[200, 300, 400, 500].map(v => (
              <button key={v} onClick={() => { onChangeTarget(v); setModal(null); }} style={{ position: 'relative', background: v === target ? C.navy : C.yellow, color: v === target ? C.yellow : C.navy, border: `4px solid ${C.navy}`, borderRadius: 14, padding: '14px 0', cursor: 'pointer', fontFamily: F.display }}>
                <div style={{ fontSize: 30 }}>{v}</div>
              </button>
            ))}
          </div>
          <Btn onClick={() => setModal(null)} variant="secondary">{tx('setup_cancel')}</Btn>
        </Card></Overlay>
      )}

      {modal === 'selectRound' && (
        <Overlay><Card style={{ padding: 20, maxWidth: 360, width: '100%' }}>
          <div style={{ fontFamily: F.display, fontSize: 16, color: C.navy, marginBottom: 14 }}>{tx('game_which_round')}</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 280, overflowY: 'auto', marginBottom: 14 }}>
            {game.rounds.map((r, idx) => (
              <button key={idx} onClick={() => { setEditScores({ ...r.scores }); setEditingRound(idx); setModal('editRound'); }} style={{ width: '100%', background: C.creamLight, border: `3px solid ${C.navy}`, borderRadius: 10, padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 30, height: 30, borderRadius: 999, background: C.yellow, border: `2px solid ${C.navy}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: F.display, fontSize: 12 }}>{idx + 1}</div>
                <div style={{ flex: 1, fontFamily: F.body, fontSize: 11, textAlign: 'left' }}>{game.players.map(p => `${p}: ${r.scores[p] ?? 0}`).join(' · ')}</div>
                <Edit3 size={14} />
              </button>
            ))}
          </div>
          <Btn onClick={() => setModal(null)} variant="secondary">{tx('setup_cancel')}</Btn>
        </Card></Overlay>
      )}

      {modal === 'editRound' && editingRound !== null && (
        <Overlay><Card style={{ padding: 20, maxWidth: 360, width: '100%' }}>
          <div style={{ fontFamily: F.display, fontSize: 16, color: C.navy, marginBottom: 16 }}>{tx('game_edit_round')} {editingRound + 1}</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
            {game.players.map(p => (
              <div key={p} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ flex: 1, fontFamily: F.display, fontSize: 14, color: C.navy }}>{p}</div>
                <input
                  type="text"
                  inputMode="numeric"
                  value={editScores[p] ?? ''}
                  onChange={(e) => setEditScores({ ...editScores, [p]: e.target.value.replace(/[^0-9]/g, '') })}
                  style={{
                    width: 80,
                    border: `3px solid ${C.navy}`,
                    borderRadius: 8,
                    padding: '8px',
                    textAlign: 'center',
                    fontFamily: F.display,
                    fontSize: 15,
                    color: C.navy,
                    background: C.yellow,
                    outline: 'none',
                  }}
                />
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <Btn onClick={() => setModal(null)} variant="secondary">{tx('setup_cancel')}</Btn>
            <Btn onClick={() => { const parsed = {}; for (const p of game.players) parsed[p] = parseInt(editScores[p], 10) || 0; onModifyRound(editingRound, parsed); setModal(null); }}>{tx('game_save')}</Btn>
          </div>
        </Card></Overlay>
      )}

      {modal === 'reset' && (
        <Overlay><Card style={{ padding: 20, maxWidth: 320, width: '100%' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}><AlertTriangle color={C.red} size={22} /><div style={{ fontFamily: F.display, fontSize: 16, color: C.navy }}>{tx('game_reset_q')}</div></div>
          <div style={{ display: 'flex', gap: 8 }}>
            <Btn onClick={() => setModal(null)} variant="secondary">{tx('setup_cancel')}</Btn>
            <Btn onClick={() => { onResetGame(); setModal(null); setTab('anotar'); }} variant="danger">{tx('game_reset')}</Btn>
          </div>
        </Card></Overlay>
      )}

      {modal === 'confirmAbandon' && (
        <Overlay><Card style={{ padding: 20, maxWidth: 340, width: '100%' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            <AlertTriangle size={22} color={C.red} />
            <div style={{ fontFamily: F.display, fontSize: 16, color: C.red }}>{tx('game_abandon_q')}</div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <Btn onClick={() => setModal(null)} variant="secondary">{tx('game_back')}</Btn>
            <Btn onClick={() => { setModal(null); onAbandon(); }} variant="danger">{tx('game_abandon')}</Btn>
          </div>
        </Card></Overlay>
      )}

      {modal === 'addPlayer' && (() => {
        const available = (existingPlayers || []).filter(p => !game.players.includes(p));
        const resolveStartPts = () => {
          const minVal = game.players.length > 0 ? Math.min(...Object.values(game.totals)) : 0;
          if (newPlayerPoints === 'min') return minVal;
          if (newPlayerPoints === 'custom') return Math.max(0, parseInt(newPlayerCustomPts, 10) || 0);
          return 0;
        };
        const addResolvedPlayer = (nm) => {
          const name = nm.trim();
          if (!name || game.players.includes(name)) return;
          onAddPlayer(name, resolveStartPts());
          setModal(null);
        };
        const addPlayerInputStyle = {
          width: '100%',
          boxSizing: 'border-box',
          background: C.white,
          color: C.ink,
          border: `3px solid ${C.navy}`,
          borderRadius: 10,
          padding: '12px 14px',
          fontFamily: F.body,
          fontSize: 16,
          outline: 'none',
          WebkitAppearance: 'none',
          appearance: 'none',
          WebkitTextFillColor: C.ink,
          WebkitTextSizeAdjust: '100%',
          touchAction: 'manipulation',
          boxShadow: `inset 1px 1px 0 ${C.creamDark}`,
        };
        return (
        <Overlay><Card style={{ padding: 20, maxWidth: 360, width: '100%' }}>
          <div style={{ fontFamily: F.display, fontSize: 16, color: C.navy, marginBottom: 14 }}>{tx('game_add_p')}</div>
          <input
            value={newPlayerName}
            onChange={(e) => setNewPlayerName(e.target.value)}
            placeholder={tx('setup_ph_name')}
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
            style={{ ...addPlayerInputStyle, marginBottom: available.length > 0 ? 8 : 10 }}
          />
          {available.length > 0 && (
            <>
              <div style={{
                fontFamily: F.display,
                fontSize: 10,
                color: C.navy,
                letterSpacing: '1.5px',
                marginBottom: 6,
              }}>{tx('setup_saved')}</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
                {available.map(p => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setNewPlayerName(p)}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4,
                      background: C.creamLight,
                      color: C.navy,
                      border: `2px solid ${C.navy}`,
                      borderRadius: 999,
                      padding: '4px 10px',
                      fontFamily: F.body,
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: 'pointer',
                      boxShadow: '1px 1px 0 #00000012',
                      maxWidth: '100%',
                    }}
                  >
                    <Plus size={11} strokeWidth={3} style={{ flexShrink: 0 }} />
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p}</span>
                  </button>
                ))}
              </div>
            </>
          )}
          <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
            {(() => {
              const minVal = game.players.length > 0 ? Math.min(...Object.values(game.totals)) : 0;
              const btnStyle = (sel) => ({
                flex: 1,
                background: sel ? C.navy : C.creamLight,
                color: sel ? C.yellow : C.navy,
                border: `3px solid ${C.navy}`,
                borderRadius: 10,
                padding: '10px 6px',
                fontFamily: F.display,
                cursor: 'pointer',
                minHeight: 0,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 2,
                lineHeight: 1.15,
              });
              return (
                <>
                  <button type="button" onClick={() => setNewPlayerPoints('0')} style={btnStyle(newPlayerPoints === '0')}>
                    <div style={{ fontSize: 12 }}>{tx('game_pts0')}</div>
                  </button>
                  <button type="button" onClick={() => setNewPlayerPoints('min')} style={btnStyle(newPlayerPoints === 'min')}>
                    <div style={{ fontSize: 12 }}>{tx('game_match_low')}</div>
                    <div style={{ fontSize: 11, opacity: 0.9 }}>({minVal} {tx('game_pts_abbr')})</div>
                  </button>
                  <button type="button" onClick={() => setNewPlayerPoints('custom')} style={btnStyle(newPlayerPoints === 'custom')}>
                    <div style={{ fontSize: 12 }}>{tx('game_custom')}</div>
                  </button>
                </>
              );
            })()}
          </div>
          {newPlayerPoints === 'custom' && (
            <input
              type="text"
              inputMode="numeric"
              value={newPlayerCustomPts}
              onChange={(e) => setNewPlayerCustomPts(e.target.value.replace(/[^0-9]/g, ''))}
              placeholder={tx('game_ph_start')}
              style={{
                ...addPlayerInputStyle,
                marginBottom: 14,
                fontFamily: F.display,
                textAlign: 'center',
              }}
            />
          )}
          <div style={{ display: 'flex', gap: 8 }}>
            <Btn onClick={() => setModal(null)} variant="secondary">{tx('setup_cancel')}</Btn>
            <Btn disabled={!newPlayerName.trim() || game.players.includes(newPlayerName.trim())} onClick={() => addResolvedPlayer(newPlayerName)}>{tx('game_add_btn')}</Btn>
          </div>
        </Card></Overlay>
        ); })()}

      {modal === 'scoreWarning' && (() => {
        const suspicious = game.players.filter(p => {
          const raw = scores[p];
          if (raw === '' || raw === undefined) return false;
          const n = parseInt(raw, 10);
          return !isNaN(n) && n >= WARN_SCORE;
        });
        return (
        <Overlay><Card style={{ padding: 20, maxWidth: 340, width: '100%' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            <div style={{
              width: 40, height: 40, borderRadius: 999, background: C.yellow, border: `3px solid ${C.navy}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <AlertTriangle size={22} color={C.navy} strokeWidth={2.5} />
            </div>
            <div style={{ fontFamily: F.display, fontSize: 16, color: C.navy }}>{tx('game_score_sure')}</div>
          </div>
          <div style={{ fontFamily: F.body, fontSize: 14, color: C.ink, marginBottom: 10, lineHeight: 1.5 }}>
            {suspicious.length === 1 ? tx('game_score_1') : tx('game_score_n')}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 16 }}>
            {suspicious.map(p => (
              <div key={p} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                background: `${C.yellow}30`, border: `2px solid ${C.yellow}`, borderRadius: 10,
                padding: '10px 14px'
              }}>
                <span style={{ fontFamily: F.display, fontSize: 13, color: C.navy }}>{p}</span>
                <span style={{ fontFamily: F.display, fontSize: 20, color: C.red }}>{scores[p]} {tx('game_pts_abbr')}</span>
              </div>
            ))}
          </div>
          <div style={{
            background: C.creamLight, border: `2px dashed ${C.navy}30`, borderRadius: 10,
            padding: '10px 12px', marginBottom: 16, fontFamily: F.body, fontSize: 12, color: C.inkSoft, lineHeight: 1.5
          }}>
            {tx('game_score_foot')}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <Btn onClick={() => setModal(null)} variant="secondary" style={{ fontSize: 13 }}>{tx('game_score_fix')}</Btn>
            <Btn onClick={confirmSuspiciousScore} style={{ fontSize: 13 }}>{tx('game_score_yes')}</Btn>
          </div>
        </Card></Overlay>
        );
      })()}

      {modal === 'impossible' && (() => {
        const impossible = game.players.filter(p => {
          const raw = scores[p];
          if (raw === '' || raw === undefined) return false;
          const n = parseInt(raw, 10);
          return !isNaN(n) && n > MAX_SCORE;
        });
        return (
        <Overlay><Card style={{ padding: 20, maxWidth: 340, width: '100%' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            <div style={{
              width: 40, height: 40, borderRadius: 999, background: C.red, border: `3px solid ${C.navyDark}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <X size={22} color={C.white} strokeWidth={3} />
            </div>
            <div style={{ fontFamily: F.display, fontSize: 16, color: C.red }}>{tx('game_imp_h')}</div>
          </div>
          <div style={{ fontFamily: F.body, fontSize: 14, color: C.ink, marginBottom: 10, lineHeight: 1.5 }}>
            {impossible.length === 1 ? tx('game_imp_1') : tx('game_imp_n')}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 16 }}>
            {impossible.map(p => (
              <div key={p} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                background: `${C.red}15`, border: `2px solid ${C.red}`, borderRadius: 10,
                padding: '10px 14px'
              }}>
                <span style={{ fontFamily: F.display, fontSize: 13, color: C.navy }}>{p}</span>
                <span style={{ fontFamily: F.display, fontSize: 20, color: C.red }}>{scores[p]} {tx('game_pts_abbr')}</span>
              </div>
            ))}
          </div>
          <div style={{
            background: `${C.red}10`, border: `2px solid ${C.red}40`, borderRadius: 10,
            padding: '10px 12px', marginBottom: 16, fontFamily: F.body, fontSize: 12, color: C.ink, lineHeight: 1.5
          }}>
            {tx('game_imp_foot')}
          </div>
          <Btn onClick={() => setModal(null)} style={{ fontSize: 14 }}>{tx('game_imp_ok')}</Btn>
        </Card></Overlay>
        );
      })()}
      </div>
    </PageBg>
  );
}

function GameOverScreen({ game, onHome, tx }) {
  const ranked = [...game.players].sort((a, b) => game.finalScores[b] - game.finalScores[a]);
  useEffect(() => {
    confetti({ particleCount: 150, spread: 80, origin: { y: 0.6 } });
    const t = setTimeout(() => { confetti({ particleCount: 150, spread: 80, origin: { y: 0.6 } }); }, 250);
    return () => clearTimeout(t);
  }, []);

  return (
    <PageBg showEric={false}>
      <div style={{ textAlign: 'center', padding: '20px 0' }}>
        <div style={{ display: 'inline-block', background: C.yellow, border: `4px solid ${C.navy}`, borderRadius: 999, padding: 18, boxShadow: `${shadow()}, 0 0 30px ${C.yellow}50` }}><Trophy size={44} color={C.navy} fill={C.navy} /></div>
        <div style={{ fontFamily: F.display, fontSize: 42, color: C.yellow, marginTop: 16, textShadow: `4px 4px 0 ${C.navyDark}` }}>{game.winner.toUpperCase()}</div>
        <div style={{ fontFamily: F.display, fontSize: 24, color: C.cream }}>{game.finalScores[game.winner]} {tx('go_pts')}</div>
      </div>
      <Card style={{ padding: 8, marginBottom: 20 }} glow>
        {ranked.map((p, i) => (
          <div key={p} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 0', borderBottom: i < ranked.length - 1 ? `2px dashed ${C.navy}15` : 'none' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}><RankBadge rank={i + 1} size="lg" /><span style={{ fontFamily: F.display, fontSize: 17, color: C.navy }}>{p}</span></div>
            <span style={{ fontFamily: F.display, fontSize: 24 }}>{game.finalScores[p]}</span>
          </div>
        ))}
      </Card>
      <Btn onClick={onHome} icon={CardsIcon}>{tx('go_new')}</Btn>
    </PageBg>
  );
}

function efficaciaPct(p) {
  if (!p.gamesPlayed) return -1;
  return (100 * p.wins) / p.gamesPlayed;
}

function RankingsScreen({ data, onBack, tx, lang }) {
  const [tab, setTab] = useState('wins');
  const players = Object.values(data.players);
  const tabs = [
    { id: 'wins', label: tx('rk_wins'), icon: Trophy, sort: (a, b) => b.wins - a.wins, value: p => p.wins, suf: '' },
    {
      id: 'eff',
      label: tx('rk_eff'),
      icon: Percent,
      sort: (a, b) => {
        const d = efficaciaPct(b) - efficaciaPct(a);
        if (d !== 0) return d;
        return b.wins - a.wins;
      },
      value: p => (p.gamesPlayed ? Math.round(efficaciaPct(p)) : 0),
      suf: '%',
    },
    { id: 'best', label: tx('rk_best'), icon: Crown, sort: (a, b) => b.bestGameScore - a.bestGameScore, value: p => p.bestGameScore, suf: 'pts' },
    { id: 'round', label: tx('rk_round'), icon: Zap, sort: (a, b) => b.highestRound - a.highestRound, value: p => p.highestRound, suf: 'pts' },
    { id: 'avg', label: tx('rk_avg'), icon: TrendingUp, sort: (a, b) => (b.gamesPlayed ? b.totalPoints / b.gamesPlayed : 0) - (a.gamesPlayed ? a.totalPoints / a.gamesPlayed : 0), value: p => p.gamesPlayed ? Math.round(p.totalPoints / p.gamesPlayed) : 0, suf: 'pts/p' },
  ];
  const at = tabs.find(t => t.id === tab);
  const sorted = [...players].sort(at.sort);

  return (
    <PageBg showEric={false}>
      <HeaderBar title={tx('rk_title')} onBack={onBack} />
      <div style={{ display: 'flex', gap: 5, overflowX: 'auto', marginBottom: 14, paddingBottom: 4, scrollbarWidth: 'none' }}>
        {tabs.map(t => {
          const active = t.id === tab; const I = t.icon;
          return (
            <button key={t.id} onClick={() => setTab(t.id)} style={{ background: active ? C.yellow : C.tealDark, color: active ? C.navy : C.cream, border: `3px solid ${active ? C.navy : C.cream}40`, borderRadius: 10, padding: '10px 14px', fontFamily: F.display, fontSize: 13, cursor: 'pointer', flexShrink: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
              <I size={16} strokeWidth={2.5} /> {t.label}
            </button>
          );
        })}
      </div>
      <Card style={{ padding: 6 }}>
        {sorted.map((p, i) => (
          <div key={p.name} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 2px', borderBottom: i < sorted.length - 1 ? `1.5px dashed ${C.navy}12` : 'none' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <RankBadge rank={i + 1} />
              <div>
                <div style={{ fontFamily: F.display, fontSize: 13, color: C.navy }}>{p.name}</div>
                {tab !== 'eff' && (
                  <div style={{ fontFamily: F.body, fontSize: 10, lineHeight: 1.25 }}>{formatGamesWinsLine(p, lang)}</div>
                )}
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              {tab === 'eff' ? (
                <>
                  <div style={{ fontFamily: F.display, fontSize: 17, color: p.gamesPlayed ? C.navy : C.inkSoft }}>
                    {p.gamesPlayed ? `${Math.round(efficaciaPct(p))}%` : tx('rk_na')}
                  </div>
                  <div style={{ fontFamily: F.display, fontSize: 9, color: C.inkSoft, marginTop: 2, lineHeight: 1.2 }}>
                    {formatWinsGamesEff(p.wins, p.gamesPlayed, lang)}
                  </div>
                </>
              ) : (
                <>
                  <div style={{ fontFamily: F.display, fontSize: 17, color: i === 0 && at.value(p) > 0 ? C.red : C.navy }}>{at.value(p)}</div>
                  {at.suf && <div style={{ fontFamily: F.display, fontSize: 7, color: C.inkSoft }}>{at.suf.toUpperCase()}</div>}
                </>
              )}
            </div>
          </div>
        ))}
      </Card>
    </PageBg>
  );
}

function HistoryScreen({ data, onBack, onDelete, tx, lang }) {
  const games = data.games;
  const [confirmDelete, setConfirmDelete] = useState(null);
  return (
    <PageBg showEric={false}>
      <HeaderBar title={tx('hist_title')} onBack={onBack} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {games.map(g => {
          const r = [...g.players].sort((a, b) => g.finalScores[b] - g.finalScores[a]);
          return (
            <Card key={g.id} style={{ padding: 6 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}><Calendar size={11} /><span style={{ fontSize: 11, fontFamily: F.body, color: C.inkSoft }}>{fmtDate(g.date, lang)}</span></div>
                <button onClick={() => setConfirmDelete(g)} style={{ background: 'transparent', border: 'none', color: C.red }}><Trash2 size={14} /></button>
              </div>
              {r.map((p, i) => (
                <div key={p} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1px 0', gap: 6 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                    <RankBadge rank={i + 1} size="lg" />
                    <span style={{ fontFamily: F.display, fontSize: 16, color: C.navy, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p}</span>
                  </div>
                  <span style={{ fontFamily: F.display, fontSize: 20, color: C.navy, flexShrink: 0 }}>{g.finalScores[p]}</span>
                </div>
              ))}
            </Card>
          );
        })}
      </div>
      {confirmDelete && (
        <Overlay><Card style={{ padding: 20, maxWidth: 320, width: '100%' }}>
          <div style={{ fontFamily: F.display, fontSize: 16, color: C.navy, marginBottom: 10 }}>{tx('hist_del')}</div>
          <div style={{ display: 'flex', gap: 8 }}>
            <Btn onClick={() => setConfirmDelete(null)} variant="secondary">{tx('setup_cancel')}</Btn>
            <Btn onClick={() => { onDelete(confirmDelete.id); setConfirmDelete(null); }} variant="danger">{tx('setup_delete')}</Btn>
          </div>
        </Card></Overlay>
      )}
    </PageBg>
  );
}

// ═══════ APP ═══════
export default function App() {
  const [lang, setLang] = useState(() => { try { return localStorage.getItem('flip7_lang') || 'es'; } catch { return 'es'; } });
  const tx = useCallback((key, rep) => Tx(lang, key, rep || {}), [lang]);
  useEffect(() => { try { localStorage.setItem('flip7_lang', lang); } catch (_) {} }, [lang]);

  const [screen, setScreen] = useState('home');
  const [data, setData] = useState({ players: {}, games: [] });
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState([]);
  const [game, setGame] = useState(null);
  const [scores, setScores] = useState({});
  const [completedGame, setCompletedGame] = useState(null);
  const [targetPickerOpen, setTargetPickerOpen] = useState(false);
  const [deletingPlayer, setDeletingPlayer] = useState(false);
  const wakeLockRef = useRef(null);

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, [screen]);

  useEffect(() => {
    loadData().then(d => { setData(d); setLoading(false); });
    const savedGame = localStorage.getItem('flip7_active_game');
    const savedScores = localStorage.getItem('flip7_active_scores');
    if (savedGame && savedScores) {
      setGame(JSON.parse(savedGame));
      setScores(JSON.parse(savedScores));
      setScreen('game');
    }
  }, []);

  useEffect(() => {
    if (game && screen === 'game') {
      localStorage.setItem('flip7_active_game', JSON.stringify(game));
      localStorage.setItem('flip7_active_scores', JSON.stringify(scores));
    } else if (screen === 'home' || screen === 'gameover') {
      localStorage.removeItem('flip7_active_game');
      localStorage.removeItem('flip7_active_scores');
    }
  }, [game, scores, screen]);

  useEffect(() => {
    if (!('wakeLock' in navigator)) return;

    const requestWakeLock = async () => {
      if (document.visibilityState !== 'visible') return;
      try {
        wakeLockRef.current = await navigator.wakeLock.request('screen');
      } catch (err) {
        console.error(err);
      }
    };

    const releaseWakeLock = () => {
      if (wakeLockRef.current) {
        wakeLockRef.current.release().catch(() => {});
        wakeLockRef.current = null;
      }
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') requestWakeLock();
    };

    requestWakeLock();
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', onVisibilityChange);
      releaseWakeLock();
    };
  }, []);

  const openTargetPicker = () => { if (selected.length < 2) return; setTargetPickerOpen(true); };
  const startGame = (targetVal) => {
    const newGame = { players: [...selected], rounds: [], totals: Object.fromEntries(selected.map(p => [p, 0])), targetScore: targetVal };
    setGame(newGame);
    setScores(Object.fromEntries(selected.map(p => [p, '0'])));
    setTargetPickerOpen(false);
    setScreen('game');
  };

  const closeRound = async () => {
    const rs = {};
    for (const p of game.players) {
      if (game.tiebreak?.mode === 'tied_only' && !(game.tiebreak?.players ?? []).includes(p)) {
        rs[p] = 0;
      } else {
        rs[p] = parseInt(scores[p], 10) || 0;
      }
    }
    const nt = { ...game.totals }; for (const p of game.players) nt[p] += rs[p];
    const nr = [...game.rounds, { scores: rs }]; const t = game.targetScore;
    const gameAfter = { ...game, rounds: nr, totals: nt };
    const outcome = resolveEndGame(nt, game.players, t, game.tiebreak);

    if (outcome.type === 'tie') {
      const leaders = outcome.leaders;
      setGame({
        ...gameAfter,
        tiebreak: { players: leaders, mode: game.tiebreak?.mode ?? null },
      });
      setScores(Object.fromEntries(game.players.map(p => [p, '0'])));
      return { status: 'tie', leaders, gameAfter };
    }
    if (outcome.type === 'win') {
      const fin = {
        id: `g-${Date.now()}`,
        date: new Date().toISOString(),
        players: game.players,
        rounds: nr,
        finalScores: nt,
        targetScore: t,
        winner: outcome.winner,
      };
      const savedGame = await insertGame(fin);
      if (!savedGame) return { status: 'save_error' };
      setData({ players: updatePlayerStats(data.players, savedGame), games: [savedGame, ...data.games] });
      setCompletedGame(savedGame);
      setGame(null);
      setScreen('gameover');
      return { status: 'finished' };
    }
    setGame(gameAfter);
    setScores(Object.fromEntries(game.players.map(p => [p, '0'])));
    return { status: 'continued', gameAfter };
  };

  const setTiebreakMode = (mode, leaders) => {
    setGame(g => (g ? { ...g, tiebreak: { players: leaders ?? g.tiebreak?.players ?? [], mode } } : g));
  };

  const goHome = () => { 
    if (game && screen === 'game' && !window.confirm(Tx(lang, 'confirm_abandon'))) return;
    setSelected([]); setGame(null); setScores({}); setCompletedGame(null); setScreen('home'); 
  };

  const deleteGame = async (id) => {
    await removeGame(id);
    const ng = data.games.filter(g => g.id !== id);
    const stats = recalculateStats(ng);
    const savedNames = await loadSavedPlayerNames();
    setData({ players: mergeStatsWithSavedNames(stats, savedNames), games: ng });
  };

  const deleteSavedPlayer = async (name) => {
    if (!name || deletingPlayer) return;
    setDeletingPlayer(true);
    try {
      const ok = await executeCascadePlayerDelete(name);
      if (!ok) return;
      const refreshed = await loadData();
      setData(refreshed);
      setSelected(prev => prev.filter(p => p !== name));
    } catch (e) {
      console.error('Error en borrado en cascada:', e);
    } finally {
      setDeletingPlayer(false);
    }
  };

  const changeTarget = (t) => { if (game) setGame({ ...game, targetScore: t }); };
  const resetGame = () => { if (game) { setGame({ ...game, rounds: [], totals: Object.fromEntries(game.players.map(p => [p, 0])), tiebreak: undefined }); setScores(Object.fromEntries(game.players.map(p => [p, '0']))); } };
  const addPlayerMidGame = (name, pts) => { if (game && !game.players.includes(name)) { setGame({ ...game, players: [...game.players, name], totals: { ...game.totals, [name]: pts }, rounds: game.rounds.map(r => ({ ...r, scores: { ...r.scores, [name]: 0 } })) }); setScores({ ...scores, [name]: '0' }); } };
  const modifyRound = (idx, newScores) => {
    if (!game) return;
    const ur = game.rounds.map((r, i) => i === idx ? { ...r, scores: newScores } : r);
    const nt = Object.fromEntries(game.players.map(p => [p, 0]));
    for (const r of ur) for (const p of game.players) nt[p] += (r.scores[p] ?? 0);
    setGame({ ...game, rounds: ur, totals: nt });
  };

  if (loading) return <PageBg showEric={false}><div style={{ textAlign: 'center', padding: 60, fontFamily: F.display, color: C.yellow, fontSize: 18 }}>{tx('loading')}</div></PageBg>;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bungee&family=DM+Sans:wght@400;500;700&family=DM+Serif+Display:ital@0;1&display=swap');
        * { box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
        html {
          touch-action: manipulation;
          -webkit-text-size-adjust: 100%;
          text-size-adjust: 100%;
          overscroll-behavior: none;
          overscroll-behavior-y: none;
          height: 100%;
        }
        body {
          margin: 0;
          touch-action: manipulation;
          overscroll-behavior: none;
          overscroll-behavior-y: none;
          overscroll-behavior-x: none;
          overflow: hidden;
          height: 100%;
        }
        #root {
          height: 100%;
          overflow: hidden;
        }
        button { transition: transform 0.08s; }
        button:active { transform: translateY(2px) !important; }
        input:focus { box-shadow: 0 0 0 3px ${C.yellow}60 !important; }
        input::placeholder { color: ${C.inkSoft}; opacity: 1; }
        input::-webkit-input-placeholder { color: ${C.inkSoft}; opacity: 1; }
        ::-webkit-scrollbar { display: none; }
        input::-webkit-outer-spin-button, input::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
      `}</style>
      {screen === 'home' && <HomeScreen data={data} lang={lang} setLang={setLang} tx={tx} onNewGame={() => { setSelected([]); setScreen('setup'); }} onRankings={() => setScreen('rankings')} onHistory={() => setScreen('history')} />}
      {screen === 'setup' && (<>
        <SetupScreen data={data} selected={selected} setSelected={setSelected} onStart={openTargetPicker} onBack={() => setScreen('home')} onDeleteSavedPlayer={deleteSavedPlayer} onSavePlayer={savePlayerName} tx={tx} />
        {targetPickerOpen && (
          <Overlay><Card style={{ padding: 20, maxWidth: 360, width: '100%' }}>
            <div style={{ fontFamily: F.display, fontSize: 16, color: C.navy, marginBottom: 4 }}>{tx('pick_target')}</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
              {[{ v: 200, badgeKey: 'badge_official' }, { v: 300, badgeKey: 'badge_rec' }, { v: 400, badgeKey: null }, { v: 500, badgeKey: null }].map(({ v, badgeKey }) => (
                <button key={v} onClick={() => startGame(v)} style={{ position: 'relative', background: C.yellow, color: C.navy, border: `4px solid ${C.navy}`, borderRadius: 14, padding: '14px 0', cursor: 'pointer', fontFamily: F.display }}>
                  {badgeKey && <Badge text={tx(badgeKey)} />}
                  <div style={{ fontSize: 30, lineHeight: 1 }}>{v}</div>
                </button>
              ))}
            </div>
            <Btn onClick={() => setTargetPickerOpen(false)} variant="secondary" style={{ fontSize: 14 }}>{tx('setup_cancel')}</Btn>
          </Card></Overlay>
        )}
      </>)}
      {screen === 'game' && game && <GameScreen game={game} scores={scores} setScores={setScores} onCloseRound={closeRound} onAbandon={goHome} onChangeTarget={changeTarget} onResetGame={resetGame} onAddPlayer={addPlayerMidGame} onModifyRound={modifyRound} onSetTiebreakMode={setTiebreakMode} existingPlayers={Object.keys(data.players)} tx={tx} lang={lang} />}
      {screen === 'gameover' && completedGame && <GameOverScreen game={completedGame} onHome={goHome} tx={tx} />}
      {screen === 'rankings' && <RankingsScreen data={data} onBack={() => setScreen('home')} tx={tx} lang={lang} />}
      {screen === 'history' && <HistoryScreen data={data} onBack={() => setScreen('home')} onDelete={deleteGame} tx={tx} lang={lang} />}
      {deletingPlayer && (
        <Overlay>
          <div style={{ textAlign: 'center', padding: 24, fontFamily: F.display, fontSize: 16, color: C.yellow, letterSpacing: '1.5px' }}>
            {tx('setup_deleting')}
          </div>
        </Overlay>
      )}
    </>
  );
}