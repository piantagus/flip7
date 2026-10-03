import React, { useState, useEffect, useLayoutEffect, useRef, useCallback } from 'react';
import { Trophy, Plus, X, ArrowLeft, Crown, Users, Target, BarChart3, RotateCcw, AlertTriangle, Zap, TrendingUp, History, Trash2, Calendar, Settings, UserPlus, Edit3, ChevronRight, ChevronDown, ChevronUp, Check, Search, Percent, Languages, Calculator, MoreVertical, Delete, BookOpen, Lock, User, ShieldCheck, LogOut } from 'lucide-react';
import confetti from 'canvas-confetti';
import { createClient } from '@supabase/supabase-js';
import { Tx, SPICY } from './i18n.js';

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

const INSTAGRAM_URL = 'https://www.instagram.com/piantagus/';

// Padding de página (simétrico). Cada elemento con sombra dura reserva el ancho de su sombra
// con marginRight, así todo (con o sin sombra) termina en la misma línea a la derecha.
const PAGE_PAD = { t: 20, r: 18, b: 20, l: 18 };
const PAGE_PAD_CSS = `${PAGE_PAD.t}px ${PAGE_PAD.r}px ${PAGE_PAD.b}px ${PAGE_PAD.l}px`;

/** Header sticky: en reposo no tapa el marco; al scrollear pasa a barra de borde a borde. */
const stickyHeaderStyle = (scrolled) => ({
  position: 'sticky', top: -PAGE_PAD.t,
  margin: scrolled ? `-10px -${PAGE_PAD.r}px 0 -${PAGE_PAD.l}px` : 0,
  padding: scrolled ? `10px ${PAGE_PAD.r}px 10px ${PAGE_PAD.l}px` : '0 0 6px',
});

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
  // ignoreDuplicates: si ya existe no hace UPDATE (que requiere usuario ingresado), solo lo deja como está.
  const { error } = await supabase.from('players').upsert({ name: trimmed }, { onConflict: 'name', ignoreDuplicates: true });
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

async function renamePlayerNameRow(oldName, newName) {
  if (!oldName || !newName) return false;
  const { error } = await supabase.from('players').update({ name: newName }).eq('name', oldName);
  if (error) {
    console.error('No se pudo renombrar jugador en Supabase:', error);
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
  // .select() para saber si realmente se borró: sin permiso, Supabase no da error pero borra 0 filas.
  const { data: deleted, error } = await supabase.from('games').delete().eq('id', id).select('id');
  if (error || !deleted?.length) {
    console.error('No se pudo borrar partida en Supabase:', error ?? 'sin permiso o no existe');
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

/** Reemplaza oldName por newName en todos los lugares de la partida donde aparece como clave/valor. */
function renamePlayerInGame(game, oldName, newName) {
  if (!game?.players?.includes(oldName)) return game;

  const players = game.players.map(p => (p === oldName ? newName : p));

  const finalScores = { ...game.finalScores };
  finalScores[newName] = finalScores[oldName];
  delete finalScores[oldName];

  const rounds = (game.rounds ?? []).map(round => {
    const scores = { ...(round.scores ?? {}) };
    scores[newName] = scores[oldName];
    delete scores[oldName];
    return { ...round, scores };
  });

  const winner = game.winner === oldName ? newName : game.winner;

  return { ...game, players, finalScores, rounds, winner };
}

async function executeCascadePlayerRename(oldName, newName) {
  const oldTrimmed = oldName?.trim();
  const newTrimmed = newName?.trim();
  if (!oldTrimmed || !newTrimmed) return false;

  const renamed = await renamePlayerNameRow(oldTrimmed, newTrimmed);
  if (!renamed) return false;

  const { data: gamesData, error: fetchError } = await supabase
    .from('games')
    .select('*')
    .order('created_at', { ascending: false });
  if (fetchError) {
    console.error('No se pudieron cargar partidas para renombrar en cascada:', fetchError);
    return false;
  }

  const affected = (gamesData ?? [])
    .map(normalizeGameRow)
    .filter(g => g.players.includes(oldTrimmed));

  for (const g of affected) {
    const patched = renamePlayerInGame(g, oldTrimmed, newTrimmed);
    const ok = await updateGame(patched);
    if (!ok) return false;
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

/**
 * Ceros de un jugador contando solo las rondas que jugó (se ignoran las rondas donde figura en
 * `absent`: anteriores a sumarse a la partida o desempates en los que no participó).
 * `consecutive` = ceros seguidos desde la última ronda jugada hacia atrás; `total` = ceros en la partida.
 */
function zeroStats(rounds, playerName) {
  const played = (rounds ?? []).filter(r => !(r.absent ?? []).includes(playerName));
  let consecutive = 0;
  for (let i = played.length - 1; i >= 0; i--) {
    if ((played[i]?.scores?.[playerName] ?? 0) !== 0) break;
    consecutive++;
  }
  const total = played.filter(r => (r.scores?.[playerName] ?? 0) === 0).length;
  return { consecutive, total };
}

/**
 * "Alertas Picantes": qué lista de frases le toca a un jugador que acaba de hacer 0.
 * 4+ ceros seguidos → 'hot'; 3 seguidos o 4+ en la partida → 'all'; si no, null.
 */
function spicyTierForZero(consecutive, total) {
  if (consecutive >= 4) return 'hot';
  if (consecutive === 3 || total >= 4) return 'all';
  return null;
}

let lastSpicyPhrase = null;

/** Frase al azar de la lista, sin repetir la última mostrada ni las ya usadas en esta alerta. */
function pickSpicyPhrase(list, used = []) {
  let options = list.filter(f => f !== lastSpicyPhrase && !used.includes(f));
  if (options.length === 0) options = list;
  const phrase = options[Math.floor(Math.random() * options.length)];
  lastSpicyPhrase = phrase;
  return phrase;
}

/** Lowercase + strip accents so typed text matches saved names with the same letters. */
function foldForMatch(s) {
  if (s == null || typeof s !== 'string') return '';
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

/** Display-only formatting: capitalize each word, don't touch the stored name used for matching/selection. */
function formatDisplayName(name) {
  return name.replace(/\S+/g, (word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase());
}

function savedPlayerInitialLetter(name) {
  const folded = foldForMatch(name.trim());
  const m = folded.match(/[a-z]/);
  return m ? m[0] : '';
}

/** Groups already-alphabetically-sorted players into one bucket per initial letter, each carrying its own count. */
function groupSavedPlayersByAlpha(players) {
  const groups = [];
  for (const p of players) {
    const ch = savedPlayerInitialLetter(p);
    const label = ch ? ch.toUpperCase() : '#';
    let bucket = groups[groups.length - 1];
    if (!bucket || bucket.label !== label) {
      bucket = { id: label, label, players: [] };
      groups.push(bucket);
    }
    bucket.players.push(p);
  }
  return groups;
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

/** Pie de cada fila de estadísticas: ganadas · partidas, sin abreviar. */
function formatWinsGamesEff(wins, gamesPlayed, lang) {
  if (!gamesPlayed) return '';
  if (lang === 'en') return `${wins} win${wins !== 1 ? 's' : ''} · ${gamesPlayed} game${gamesPlayed !== 1 ? 's' : ''}`;
  return `${wins} ganada${wins !== 1 ? 's' : ''} · ${gamesPlayed} partida${gamesPlayed !== 1 ? 's' : ''}`;
}

// ═══════ DESIGN ATOMS ═══════

function PageBg({ children, showEric = false, onScroll, hideFooter = false, scrollRef, footerLink = false }) {
  return (
    <div style={{ height: '100dvh', minHeight: '100dvh', background: C.teal, fontFamily: F.body, color: C.ink, position: 'relative', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      <div style={{ position: 'fixed', inset: 0, backgroundImage: `radial-gradient(${C.tealDark} 1px, transparent 1px)`, backgroundSize: '16px 16px', opacity: 0.15, pointerEvents: 'none' }} />
      <div ref={scrollRef} onScroll={onScroll} style={{
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
        padding: PAGE_PAD_CSS,
        zIndex: 2,
      }}>
        {/* El marco vive dentro del scroll (no fixed) para que se desplace con el contenido. */}
        <div style={{ position: 'relative', zIndex: 0, margin: `-${PAGE_PAD.t}px -${PAGE_PAD.r}px -${PAGE_PAD.b}px -${PAGE_PAD.l}px`, padding: PAGE_PAD_CSS, minHeight: `calc(100% + ${PAGE_PAD.t + PAGE_PAD.b}px)`, boxSizing: 'border-box' }}>
        <div style={{ position: 'absolute', inset: 5, border: `4px solid ${C.yellowDark}`, borderRadius: 20, pointerEvents: 'none', zIndex: -1, opacity: 0.5 }} />
        <div style={{ position: 'absolute', inset: 9, border: `2px solid ${C.navy}30`, borderRadius: 16, pointerEvents: 'none', zIndex: -1, opacity: 0.3 }} />
        {children}

        {/* Footer dinámico */}
        {!hideFooter && (
          <div style={{ textAlign: 'center', marginTop: 30, paddingBottom: 20 }}>
            {showEric && (
              <div style={{ fontFamily: F.serif, fontSize: 13, color: C.navy, lineHeight: 1.8, marginBottom: 4 }}>
                A game by Eric Olsen
              </div>
            )}
            <div style={{ color: C.yellow, fontFamily: F.display, fontSize: 11, letterSpacing: '1.5px', textShadow: `1px 1px 0 ${C.navy}80` }}>
              Supported by {footerLink
                ? <a href={INSTAGRAM_URL} target="_blank" rel="noopener noreferrer" style={{ color: 'inherit', textDecoration: 'underline', textUnderlineOffset: 3 }}>@piantapp</a>
                : '@piantapp'}
            </div>
          </div>
        )}
        </div>
      </div>
    </div>
  );
}

function Card({ children, style = {}, glow = false, depth = 5 }) {
  return (
    <div style={{
      background: C.cream,
      border: `4px solid ${C.navy}`,
      borderRadius: 16,
      boxShadow: `${shadow(C.navyDark, depth, depth)}${glow ? `, 0 0 20px ${C.yellow}40` : ''}`,
      marginRight: depth,
      position: 'relative',
      ...style
    }}>
      <div style={{ position: 'absolute', inset: 3, border: `2px solid ${C.yellowDark}40`, borderRadius: 10, pointerEvents: 'none' }} />
      <div style={{ position: 'relative' }}>{children}</div>
    </div>
  );
}

function Btn({ children, onClick, disabled, variant = 'primary', style = {}, icon: Icon, flat = false }) {
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
      width: flat ? '100%' : 'calc(100% - 4px)', marginRight: flat ? 0 : 4, borderRadius: 14, padding: '14px 20px',
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

function HeaderBar({ onBack, title, right }) {
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
        flex: 1, minWidth: 0,
        fontFamily: F.display, fontSize: 20, color: C.cream, letterSpacing: '2px',
        textShadow: `2px 2px 0 ${C.navyDark}, -1px -1px 0 ${C.navy}`,
        WebkitTextStroke: `1px ${C.navy}`, paintOrder: 'stroke fill'
      }}>{title}</div>
      {right}
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

function BustCardsIcon({ size = 20, color = 'currentColor' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="3.5" y="5" width="11" height="15" rx="2" transform="rotate(-12 9 12.5)" />
      <rect x="9.5" y="4" width="11" height="15" rx="2" transform="rotate(12 15 11.5)" />
      <line x1="4" y1="21" x2="20" y2="3" />
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

/** Nombre a mostrar del usuario ingresado: el nombre de jugador que cargó, o la parte local del mail. */
function authDisplayName(session) {
  const name = session?.user?.user_metadata?.name?.trim();
  return name ? formatDisplayName(name) : (session?.user?.email ?? '').split('@')[0];
}

/** Ingreso con código por mail (Supabase Auth). Con sesión activa muestra la cuenta y "Salir". */
function AuthOverlay({ session, onClose, tx, playerNames = [] }) {
  const [step, setStep] = useState('email');
  const [email, setEmail] = useState('');
  const [playerName, setPlayerName] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const inputStyle = {
    width: '100%', height: 46, boxSizing: 'border-box', marginBottom: 12,
    background: C.creamLight, border: `3px solid ${C.navy}`, borderRadius: 10,
    padding: '0 12px', fontFamily: F.body, fontSize: 16, color: C.ink, outline: 'none',
  };
  const titleStyle = { fontFamily: F.display, fontSize: 16, color: C.navy, textAlign: 'left' };
  const bodyStyle = { fontFamily: F.body, fontSize: 13, color: C.inkSoft, lineHeight: 1.5, marginBottom: 14, textAlign: 'left' };
  const linkStyle = { width: '100%', background: 'transparent', border: 'none', color: C.inkSoft, fontFamily: F.body, fontSize: 13, fontWeight: 600, padding: '6px 0', cursor: 'pointer' };

  const cleanEmail = email.trim().toLowerCase();
  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail);
  // El nombre de jugador se elige de los guardados: así coincide con el de las partidas.
  const nameQuery = foldForMatch(playerName.trim().replace(/\s+/g, ' '));
  const cleanName = playerNames.find(n => foldForMatch(n) === nameQuery) ?? '';
  const nameSuggestions = nameQuery && !cleanName
    ? playerNames.filter(n => foldForMatch(n).startsWith(nameQuery)).sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' })).slice(0, 5)
    : [];
  const formOk = emailOk && cleanName.length > 0;

  const sendCode = async () => {
    if (!formOk || busy) return;
    setBusy(true); setError(null);
    const { error: err } = await supabase.auth.signInWithOtp({ email: cleanEmail, options: { shouldCreateUser: true, data: { name: cleanName } } });
    setBusy(false);
    if (err) { setError(tx('auth_err_send')); return; }
    setCode(''); setStep('code');
  };

  const verifyCode = async () => {
    if (code.length < 6 || busy) return;
    setBusy(true); setError(null);
    const { error: err } = await supabase.auth.verifyOtp({ email: cleanEmail, token: code, type: 'email' });
    setBusy(false);
    if (err) { setError(tx('auth_err_code')); return; }
    // `data` del paso anterior solo se guarda al crear el usuario; si ya existía, se actualiza acá.
    await supabase.auth.updateUser({ data: { name: cleanName } });
    onClose();
  };

  const signOut = async () => {
    setBusy(true);
    await supabase.auth.signOut();
    setBusy(false);
    onClose();
  };

  return (
    <Overlay><Card style={{ padding: 20, maxWidth: 340, width: '100%' }}>
      {session ? (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
            <ShieldCheck size={22} color={C.navy} strokeWidth={2.5} />
            <div style={titleStyle}>{tx('auth_account_h')}</div>
          </div>
          <div style={{ fontFamily: F.display, fontSize: 18, color: C.navy, textAlign: 'left', marginBottom: 2 }}>{authDisplayName(session)}</div>
          <div style={{ ...bodyStyle, marginBottom: 8, wordBreak: 'break-all' }}>{session.user?.email}</div>
          <div style={bodyStyle}>{tx('auth_account_body')}</div>
          <Btn onClick={signOut} disabled={busy} variant="danger" icon={LogOut} style={{ marginBottom: 10, fontSize: 14, padding: '12px 10px' }}>{tx('auth_sign_out')}</Btn>
          <Btn onClick={onClose} variant="secondary" style={{ fontSize: 14, padding: '12px 10px' }}>{tx('game_close')}</Btn>
        </>
      ) : step === 'email' ? (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
            <User size={22} color={C.navy} strokeWidth={2.5} />
            <div style={titleStyle}>{tx('auth_h')}</div>
          </div>
          <div style={bodyStyle}>{tx('auth_email_body')}</div>
          <input
            type="email" inputMode="email" autoComplete="email" autoCapitalize="none" autoCorrect="off" spellCheck={false} autoFocus
            value={email}
            onChange={(e) => { setEmail(e.target.value); setError(null); }}
            onKeyDown={(e) => { if (e.key === 'Enter') sendCode(); }}
            placeholder={tx('auth_email_ph')}
            style={inputStyle}
          />
          <input
            type="text" autoComplete="nickname" autoCorrect="off" spellCheck={false} maxLength={24}
            value={playerName}
            onChange={(e) => { setPlayerName(e.target.value); setError(null); }}
            onKeyDown={(e) => { if (e.key === 'Enter') sendCode(); }}
            placeholder={tx('auth_name_ph')}
            style={{ ...inputStyle, marginBottom: 6, borderColor: cleanName ? C.green : C.navy }}
          />
          {nameSuggestions.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
              {nameSuggestions.map(n => (
                <button key={n} type="button" onClick={() => { setPlayerName(n); setError(null); }} style={{
                  background: C.creamLight, border: `2px solid ${C.navy}`, borderRadius: 999, padding: '5px 12px',
                  fontFamily: F.body, fontSize: 13, fontWeight: 700, color: C.navy, cursor: 'pointer',
                }}>{formatDisplayName(n)}</button>
              ))}
            </div>
          )}
          <div style={{ ...bodyStyle, fontSize: 12, marginBottom: 12 }}>
            {nameQuery && !cleanName && nameSuggestions.length === 0 ? tx('auth_name_none') : tx('auth_name_hint')}
          </div>
          {error && <div style={{ ...bodyStyle, color: C.red, fontWeight: 700, marginBottom: 10 }}>{error}</div>}
          <Btn onClick={sendCode} disabled={!formOk || busy} style={{ marginBottom: 10, fontSize: 14, padding: '12px 10px' }}>{busy ? tx('auth_sending') : tx('auth_send_code')}</Btn>
          <button type="button" onClick={onClose} style={linkStyle}>{tx('setup_cancel')}</button>
        </>
      ) : (
        <>
          <div style={{ ...titleStyle, marginBottom: 10 }}>{tx('auth_code_h')}</div>
          <div style={bodyStyle}>{tx('auth_code_body', { email: cleanEmail })}</div>
          <input
            type="text" inputMode="numeric" autoComplete="one-time-code" autoFocus
            value={code}
            onChange={(e) => { setCode(e.target.value.replace(/\D/g, '').slice(0, 8)); setError(null); }}
            onKeyDown={(e) => { if (e.key === 'Enter') verifyCode(); }}
            placeholder="000000"
            style={{ ...inputStyle, textAlign: 'center', fontFamily: F.display, fontSize: 24, letterSpacing: '6px', height: 54 }}
          />
          {error && <div style={{ ...bodyStyle, color: C.red, fontWeight: 700, marginBottom: 10 }}>{error}</div>}
          <Btn onClick={verifyCode} disabled={code.length < 6 || busy} style={{ marginBottom: 10, fontSize: 14, padding: '12px 10px' }}>{busy ? tx('auth_checking') : tx('auth_confirm')}</Btn>
          <button type="button" onClick={sendCode} disabled={busy} style={linkStyle}>{tx('auth_resend')}</button>
          <button type="button" onClick={() => { setStep('email'); setError(null); }} style={linkStyle}>{tx('auth_change_email')}</button>
        </>
      )}
    </Card></Overlay>
  );
}

// ═══════ SCREENS ═══════

function HomeScreen({ data, onNewGame, onRankings, onHistory, onPlayers, onRules, lang, setLang, tx, session, onOpenAuth }) {
  const [langOpen, setLangOpen] = useState(false);
  return (
    <PageBg showEric={true} footerLink>
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button type="button" onClick={onOpenAuth} style={{
          display: 'inline-flex', alignItems: 'center', gap: 6, maxWidth: '70%',
          background: session ? C.yellow : C.navy, color: session ? C.navy : C.cream,
          border: `2px solid ${session ? C.navy : C.yellow}`, borderRadius: 999,
          padding: '5px 12px', fontFamily: F.body, fontSize: 12, fontWeight: 700, cursor: 'pointer',
        }}>
          {session ? <ShieldCheck size={14} strokeWidth={2.5} style={{ flexShrink: 0 }} /> : <User size={14} strokeWidth={2.5} style={{ flexShrink: 0 }} />}
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{session ? authDisplayName(session) : tx('auth_sign_in')}</span>
        </button>
      </div>
      <div style={{ textAlign: 'center', padding: '10px 0 28px' }}>
        <div style={{
          display: 'inline-block', background: C.navy, color: C.cream, padding: '4px 16px',
          borderRadius: 999, fontFamily: F.display, fontSize: 9, letterSpacing: '3px',
          border: `2px solid ${C.yellow}`, marginBottom: 12
        }}>THE COMPANION FOR</div>

        <div style={{ position: 'relative', display: 'inline-block', margin: '36px 0 8px' }}>
          {/* Abanico de 3 cartas detrás del logo */}
          {[
            { rot: -20, dx: -42, dy: 10, bg: C.blueLight },
            { rot: 20, dx: 42, dy: 10, bg: C.green },
            { rot: 0, dx: 0, dy: 0, bg: C.red },
          ].map(({ rot, dx, dy, bg }) => (
            <div key={rot} style={{
              position: 'absolute', top: -40, left: '50%', width: 62, height: 90, marginLeft: -31,
              transform: `translate(${dx}px, ${dy}px) rotate(${rot}deg)`,
              background: bg, border: `3px solid ${C.navy}`, borderRadius: 9, boxSizing: 'border-box',
              boxShadow: `inset 0 0 0 3px ${C.creamLight}, 2px 2px 0 ${C.navyDark}60`,
            }} />
          ))}

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
        <Btn onClick={onPlayers} variant="secondary" icon={Users} style={{ fontSize: 18, padding: '12px 20px' }}>{tx('home_players')}</Btn>
        <Btn onClick={onRules} variant="secondary" icon={BookOpen} style={{ fontSize: 18, padding: '12px 20px' }}>{tx('home_rules')}</Btn>
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

function DeleteSavedPlayerConfirm({ info, onCancel, onConfirm, tx }) {
  const [countdown, setCountdown] = useState(2);
  const [step, setStep] = useState(1);

  useEffect(() => {
    if (countdown === 0) return;
    const t = setTimeout(() => setCountdown((c) => Math.max(0, c - 1)), 1000);
    return () => clearTimeout(t);
  }, [countdown]);

  if (step === 2) {
    const displayName = formatDisplayName(info.name);
    const [bodyBefore, bodyAfter] = tx('setup_delete_final_body').split('{name}');
    const [btnBefore, btnAfter] = tx('setup_delete_final_btn').split('{name}');
    return (
      <Overlay><Card style={{ padding: 16, maxWidth: 280, width: '100%' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <AlertTriangle color={C.red} size={18} />
          <div style={{ fontFamily: F.display, fontSize: 14, color: C.navy }}>{tx('setup_delete_final_title')}</div>
        </div>
        <div style={{ fontFamily: F.body, fontSize: 13, color: C.inkSoft, marginBottom: 14, lineHeight: 1.45 }}>
          {bodyBefore}<span style={{ fontWeight: 700, color: C.navy }}>{displayName}</span>{bodyAfter}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <Btn onClick={onConfirm} variant="danger" style={{ fontSize: 13, padding: '10px 14px', flexDirection: 'column', gap: 2, lineHeight: 1.3 }}>
            <span>{btnBefore.trim()}</span>
            <span style={{ fontWeight: 700 }}>{displayName}{btnAfter}</span>
          </Btn>
          <Btn onClick={onCancel} variant="secondary" style={{ fontSize: 13, padding: '10px 14px' }}>{tx('setup_cancel')}</Btn>
        </div>
      </Card></Overlay>
    );
  }

  const displayName = formatDisplayName(info.name);
  const bodyKey = info.gameCount > 0 ? 'setup_delete_cascade' : 'setup_delete_confirm';
  const [bodyBefore, bodyAfterRaw] = tx(bodyKey).split('{name}');
  const bodyAfter = bodyAfterRaw.split('{count}').join(String(info.gameCount));

  return (
    <Overlay><Card style={{ padding: 20, maxWidth: 320, width: '100%' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
        <AlertTriangle color={C.red} size={22} />
        <div style={{ fontFamily: F.display, fontSize: 16, color: C.navy }}>
          {info.gameCount > 0 ? tx('setup_delete_cascade_title') : tx('setup_sure')}
        </div>
      </div>
      <div style={{ fontFamily: F.body, fontSize: 14, color: C.inkSoft, marginBottom: 16, lineHeight: 1.5 }}>
        {bodyBefore}<span style={{ fontWeight: 700, color: C.navy }}>{displayName}</span>{bodyAfter}
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <Btn onClick={onCancel} variant="secondary">{tx('setup_cancel')}</Btn>
        <Btn onClick={() => setStep(2)} variant="danger" disabled={countdown > 0}>
          {countdown > 0 ? `${tx('setup_delete')} (${countdown})` : tx('setup_delete')}
        </Btn>
      </div>
    </Card></Overlay>
  );
}

const TARGET_PRESETS = [
  { v: 200, badgeKey: 'badge_official' },
  { v: 300, badgeKey: 'badge_rec' },
  { v: 400, badgeKey: null },
  { v: 500, badgeKey: null },
];

function TargetPickerOverlay({ onCancel, onConfirm, tx }) {
  const [selectedVal, setSelectedVal] = useState(300);
  const [customOpen, setCustomOpen] = useState(false);
  const [customVal, setCustomVal] = useState('');

  const customN = parseInt(customVal, 10);
  const confirmDisabled = customOpen && !(customN > 0);

  const handleConfirm = () => {
    if (confirmDisabled) return;
    onConfirm(customOpen ? customN : selectedVal);
  };

  return (
    <Overlay>
      <Card style={{ padding: 20, maxWidth: 360, width: '100%' }}>
        <div style={{ fontFamily: F.display, fontSize: 14, color: C.navy, letterSpacing: '1.5px', marginBottom: 14, textAlign: 'center' }}>{tx('pick_target')}</div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
          {TARGET_PRESETS.map(({ v, badgeKey }) => {
            const isSel = !customOpen && selectedVal === v;
            return (
              <button
                key={v}
                type="button"
                onClick={() => { setSelectedVal(v); setCustomOpen(false); }}
                style={{
                  position: 'relative',
                  background: isSel ? C.yellow : C.cream,
                  color: C.navy,
                  border: `3px solid ${isSel ? C.navy : `${C.navy}30`}`,
                  borderRadius: 14, padding: '14px 0', cursor: 'pointer', fontFamily: F.display,
                }}
              >
                {badgeKey && <Badge text={tx(badgeKey)} />}
                <div style={{ fontSize: 30, lineHeight: 1 }}>{v}</div>
              </button>
            );
          })}
        </div>

        {!customOpen ? (
          <button
            type="button"
            onClick={() => { setCustomOpen(true); setCustomVal(''); }}
            style={{
              width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              background: 'transparent', border: `2px dashed ${C.navy}60`, borderRadius: 10,
              padding: '7px 0', marginBottom: 14, cursor: 'pointer',
              fontFamily: F.display, fontSize: 11, color: C.navy,
            }}
          >
            {tx('pick_target_other')} <Edit3 size={12} strokeWidth={2.5} />
          </button>
        ) : (
          <input
            value={customVal}
            onChange={(e) => setCustomVal(e.target.value.replace(/[^0-9]/g, ''))}
            placeholder={tx('pick_target_other_ph')}
            inputMode="numeric"
            autoFocus
            style={{
              width: '100%', height: 44, minHeight: 44, boxSizing: 'border-box', marginBottom: 14,
              background: C.creamLight, border: '3px solid #000080', borderRadius: 10,
              padding: '0 12px', fontFamily: F.body, fontSize: 16, color: C.ink, textAlign: 'center', outline: 'none',
            }}
          />
        )}

        <Btn onClick={handleConfirm} disabled={confirmDisabled} style={{ marginBottom: 10, gap: 6, fontSize: 15 }}>
          {tx('setup_start')}
          <span style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            background: C.navy, color: C.yellow, borderRadius: 999, whiteSpace: 'nowrap',
            fontFamily: F.display, fontSize: 16, padding: '5px 12px',
          }}>{customOpen ? (customVal || '—') : selectedVal} {tx('go_pts')}</span>
        </Btn>
        <button type="button" onClick={onCancel} style={{ width: '100%', background: 'transparent', border: 'none', color: C.inkSoft, fontFamily: F.body, fontSize: 14, fontWeight: 600, padding: '4px 0', cursor: 'pointer' }}>{tx('setup_cancel')}</button>
      </Card>
    </Overlay>
  );
}

function SetupScreen({ data, selected, setSelected, onStart, onBack, onSavePlayer, tx, session }) {
  const [name, setName] = useState('');
  const [alertMessage, setAlertMessage] = useState(null);
  const [suppressSavedSuggestions, setSuppressSavedSuggestions] = useState(false);
  const [suggestionHoverIdx, setSuggestionHoverIdx] = useState(null);
  const [showSelectedList, setShowSelectedList] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [confirmLeave, setConfirmLeave] = useState(false);
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
  // "Repetir última partida": solo con sesión, y solo la última partida en la que jugó ese usuario
  // (su nombre de jugador figura entre los jugadores). Así no se ve la actividad de otros.
  const myName = foldForMatch(session?.user?.user_metadata?.name?.trim() ?? '');
  const lastGame = myName
    ? (data.games.find(g => (g.players ?? []).some(p => foldForMatch(p) === myName)) ?? null)
    : null;
  const showLastGameReplay = lastGame
    && lastGame.players?.length >= 2
    && selected.length === 0
    && isWithinLast24Hours(lastGame.date ?? lastGame.created_at);
  const savedPlayerGroups = groupSavedPlayersByAlpha(existing);

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
  const byName = (a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' });

  const addNew = () => {
    const t = name.trim(); if (!t) return;
    const match = existing.find(p => foldForMatch(p) === foldForMatch(t));
    const fn = match || t;
    if (selectedHasCi(fn)) {
      setAlertMessage(tx('setup_dup'));
      return;
    }
    setSelected([fn, ...selected].sort(byName)); setName('');
    setSuppressSavedSuggestions(true);
    if (!match) onSavePlayer(fn);
  };

  const add = (p) => {
    if (selectedHasCi(p)) {
      setAlertMessage(tx('setup_dup'));
      return;
    }
    setSelected([p, ...selected].sort(byName)); setName('');
    setSuppressSavedSuggestions(true);
  };

  const pickSavedSuggestion = (p) => {
    add(p);
  };

  const remove = (p) => setSelected(selected.filter(x => x !== p));

  const toggle = (p) => {
    if (selected.includes(p)) remove(p);
    else add(p);
  };

  const handleTryStart = () => {
    if (name.trim() !== '') {
      setAlertMessage(tx('setup_pending'));
      return;
    }
    onStart();
  };

  const handleBack = () => {
    if (selected.length > 0) { setConfirmLeave(true); return; }
    onBack();
  };

  let cardAnimIdx = 0;

  return (
    <PageBg showEric={false} onScroll={(e) => setScrolled(e.currentTarget.scrollTop > 4)}>
      {/* Header fijo al scrollear: título, botón de empezar y resumen de jugadores elegidos. */}
      <div style={{
        ...stickyHeaderStyle(scrolled), zIndex: 10,
        backgroundColor: scrolled ? C.teal : 'transparent', backgroundImage: scrolled ? 'radial-gradient(rgba(90,166,168,0.15) 1px, transparent 1px)' : 'none', backgroundSize: '16px 16px', backgroundAttachment: 'fixed',
        borderRadius: scrolled ? '0 0 20px 20px' : 0,
        boxShadow: scrolled ? `0 3px 6px ${C.navyDark}30` : 'none',
      }}>
      <HeaderBar title={tx('setup_title')} onBack={handleBack} />

      <Btn onClick={handleTryStart} disabled={selected.length < 2} style={{ marginTop: -10, marginBottom: 8, padding: '8px 18px', fontSize: 14, gap: 6, minHeight: 44, boxSizing: 'border-box' }}>
        {selected.length < 2 ? (
          selected.length === 0 ? tx('setup_need2') : tx('setup_need1')
        ) : (
          <>
            {tx('setup_start')}
            <span style={{
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              minWidth: 26, height: 26, boxSizing: 'border-box', borderRadius: 999, background: C.navy, color: C.yellow,
              fontFamily: F.body, fontWeight: 800, fontSize: 15, lineHeight: 1, padding: '0 7px', marginLeft: 2,
            }}>{selected.length}</span>
          </>
        )}
      </Btn>

      {selected.length === 0 ? (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10, width: '100%',
          background: `${C.navy}15`, border: `2px dashed ${C.navy}80`, borderRadius: 12,
          padding: '10px 14px', boxSizing: 'border-box',
        }}>
          <div style={{ width: 26, height: 26, borderRadius: 999, background: `${C.navy}25`, color: C.navy, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: F.display, fontSize: 12, flexShrink: 0 }}>0</div>
          <div style={{ flex: 1, minWidth: 0, color: C.navy, fontFamily: F.body, fontSize: 14, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textAlign: 'left' }}>
            {tx('setup_none_yet')}
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => { if (!scrolled) setShowSelectedList(v => !v); }}
          style={{
            display: 'flex', alignItems: 'center', gap: 10, width: '100%',
            background: C.navy, border: `3px solid ${C.cream}`, borderRadius: 12,
            padding: '10px 14px', cursor: scrolled ? 'default' : 'pointer', boxSizing: 'border-box',
          }}
        >
          <div style={{ width: 26, height: 26, borderRadius: 999, background: C.yellow, color: C.navy, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: F.display, fontSize: 12, flexShrink: 0, border: `2px solid ${C.navyDark}` }}>{selected.length}</div>
          <div style={{ flex: 1, minWidth: 0, color: C.cream, fontFamily: F.body, fontSize: 14, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textAlign: 'left' }}>
            {selected.map(formatDisplayName).join(' · ')}
          </div>
          {!scrolled && (showSelectedList ? <ChevronUp size={18} strokeWidth={2.5} color={C.cream} style={{ flexShrink: 0 }} /> : <ChevronDown size={18} strokeWidth={2.5} color={C.cream} style={{ flexShrink: 0 }} />)}
        </button>
      )}
      </div>

      {selected.length > 0 && showSelectedList && (
      <Card depth={2} style={{ padding: 8, marginBottom: 10 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {selected.map((p, i) => (
              <div key={p} style={{
                display: 'flex', alignItems: 'center', gap: 7,
                background: C.creamLight, padding: '4px 6px', borderRadius: 8,
                border: `1px solid ${C.navy}18`,
              }}>
                <div style={{ width: 16, height: 16, borderRadius: 999, background: C.navy, color: C.yellow, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: F.display, fontSize: 8, flexShrink: 0 }}>{i + 1}</div>
                <div style={{ flex: 1, minWidth: 0, fontFamily: F.body, fontWeight: 700, fontSize: 12, color: C.navy, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{formatDisplayName(p)}</div>
                <button type="button" onClick={() => remove(p)} style={{ background: 'transparent', border: 'none', color: C.red, cursor: 'pointer', display: 'flex', padding: 1, flexShrink: 0 }}><X size={12} strokeWidth={3} /></button>
              </div>
            ))}
          </div>
      </Card>
      )}

      <Card depth={2} style={{ padding: '10px 12px', marginBottom: 10 }}>
        <div ref={nameRowRef} style={{ display: 'flex', gap: 6, alignItems: 'stretch' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: 0, zIndex: showSavedSuggestions ? 70 : 1 }}>
            <Search size={16} strokeWidth={2.5} color={C.inkSoft} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
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
                padding: '0 12px 0 34px',
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
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{formatDisplayName(p)}</span>
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
              marginRight: 3,
              color: C.navy,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Plus size={22} strokeWidth={3} />
          </button>
        </div>
      </Card>

      {showLastGameReplay && (
        <button
          type="button"
          onClick={() => { setSelected([...lastGame.players].sort(byName)); setShowSelectedList(true); }}
          style={{
            display: 'flex', alignItems: 'center', gap: 10, width: 'calc(100% - 3px)', textAlign: 'left', cursor: 'pointer',
            background: C.cream, border: `3px solid ${C.navy}`, borderRadius: 12,
            padding: '10px 14px', marginBottom: 12, marginRight: 3, boxShadow: shadowSm(),
          }}
        >
          <div style={{
            width: 26, height: 26, borderRadius: 999, background: C.yellow, color: C.navy,
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            border: `2px solid ${C.navy}`,
          }}>
            <RotateCcw size={14} strokeWidth={2.5} />
          </div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ fontFamily: F.display, fontSize: 8, letterSpacing: '1.5px', color: C.navy, marginBottom: 2 }}>
              {tx('setup_last_title')}
            </div>
            <div style={{ display: 'flex', gap: 4, overflowX: 'auto', WebkitOverflowScrolling: 'touch', scrollbarWidth: 'none' }}>
              {lastGame.players.map(formatDisplayName).map((n, i) => (
                <span key={i} style={{ fontFamily: F.body, fontSize: 13, fontWeight: 700, color: C.navy, whiteSpace: 'nowrap', flexShrink: 0 }}>
                  {n}{i < lastGame.players.length - 1 ? ' ·' : ''}
                </span>
              ))}
            </div>
          </div>
        </button>
      )}

      {existing.length > 0 && (
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
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 5 }}>
                <div style={{
                  width: 18, height: 18, borderRadius: 5, flexShrink: 0,
                  background: C.navy, color: C.yellow,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontFamily: F.display, fontSize: 9,
                }}>{bucket.label}</div>
                <div style={{ flex: 1, height: 1, background: 'rgba(46, 58, 140, 0.15)' }} />
                <div style={{ fontFamily: F.body, fontSize: 9, fontWeight: 700, color: C.inkSoft }}>{bucket.players.length}</div>
              </div>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
                gap: 5,
                width: '100%',
              }}>
                {bucket.players.map(p => {
                  const isSel = selected.includes(p);
                  const animDelay = Math.min(cardAnimIdx++, 40) * 15;
                  return (
                    <button
                      key={p}
                      type="button"
                      onClick={() => toggle(p)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'flex-start',
                        textAlign: 'left',
                        paddingLeft: 7,
                        paddingRight: 6,
                        width: '100%',
                        minWidth: 0,
                        background: isSel ? C.yellow : C.cream,
                        border: `2px solid ${C.navy}`,
                        borderRadius: 999,
                        boxShadow: '1px 1px 0 #00000012',
                        overflow: 'hidden',
                        color: C.navy,
                        padding: '3px 6px 3px 7px',
                        fontFamily: F.body,
                        fontSize: 11,
                        fontWeight: 600,
                        cursor: 'pointer',
                        gap: 3,
                        animation: 'cardRiseIn 0.32s ease both',
                        animationDelay: `${animDelay}ms`,
                      }}
                    >
                      {isSel ? <Check size={9} strokeWidth={3} style={{ flexShrink: 0 }} /> : <Plus size={9} strokeWidth={3} style={{ flexShrink: 0 }} />}
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textAlign: 'left' }}>{formatDisplayName(p)}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </Card>
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

      {confirmLeave && (
        <Overlay><Card style={{ padding: 20, maxWidth: 320, width: '100%' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
            <AlertTriangle color={C.yellowDark} size={22} />
            <div style={{ fontFamily: F.display, fontSize: 16, color: C.navy }}>{tx('setup_leave_title')}</div>
          </div>
          <div style={{ fontFamily: F.body, fontSize: 14, color: C.inkSoft, marginBottom: 16, lineHeight: 1.5 }}>
            {tx('setup_leave_body')}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <Btn onClick={() => setConfirmLeave(false)} variant="secondary">{tx('setup_cancel')}</Btn>
            <Btn onClick={() => { setConfirmLeave(false); onBack(); }} variant="danger">{tx('setup_leave_confirm')}</Btn>
          </div>
        </Card></Overlay>
      )}
    </PageBg>
  );
}

function PlayersScreen({ data, onBack, onDeleteSavedPlayer, onRenameSavedPlayer, tx, canEdit, onRequireAuth }) {
  const [confirmDeleteSaved, setConfirmDeleteSaved] = useState(null);
  const [actionsFor, setActionsFor] = useState(null);
  const [renameTarget, setRenameTarget] = useState(null);
  const [renameValue, setRenameValue] = useState('');
  const [renameError, setRenameError] = useState(null);
  const [renameSaving, setRenameSaving] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const headerRef = useRef(null);
  const contentRef = useRef(null);
  const engageRef = useRef(0);
  useEffect(() => {
    if (headerRef.current && contentRef.current) {
      engageRef.current = contentRef.current.getBoundingClientRect().top - headerRef.current.getBoundingClientRect().bottom;
    }
  }, []);
  const names = Object.keys(data.players).sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
  const groups = groupSavedPlayersByAlpha(names);

  const handleTryDelete = (p) => {
    const gameCount = data.games.filter(g => g.players.includes(p)).length;
    setConfirmDeleteSaved({ name: p, gameCount });
  };

  const openRename = (p) => {
    setRenameTarget(p);
    setRenameValue(formatDisplayName(p));
    setRenameError(null);
  };

  const handleSaveRename = async () => {
    if (renameSaving) return;
    setRenameSaving(true);
    setRenameError(null);
    try {
      const result = await onRenameSavedPlayer(renameTarget, renameValue);
      if (result?.ok) {
        setRenameTarget(null);
      } else {
        setRenameError(result?.reason || 'error');
      }
    } finally {
      setRenameSaving(false);
    }
  };

  return (
    <PageBg showEric={false} onScroll={(e) => setScrolled(e.currentTarget.scrollTop > engageRef.current)}>
      <div ref={headerRef} style={{
        ...stickyHeaderStyle(scrolled), zIndex: 10,
        backgroundColor: scrolled ? C.teal : 'transparent', backgroundImage: scrolled ? 'radial-gradient(rgba(90,166,168,0.15) 1px, transparent 1px)' : 'none', backgroundSize: '16px 16px', backgroundAttachment: 'fixed',
        borderRadius: scrolled ? '0 0 20px 20px' : 0,
        boxShadow: scrolled ? `0 3px 6px ${C.navyDark}30` : 'none',
      }}>
        <HeaderBar title={tx('players_title')} onBack={onBack} />
      </div>

      <div ref={contentRef}>
      {names.length === 0 ? (
        <Card style={{ padding: 20 }}>
          <div style={{ fontFamily: F.body, fontSize: 14, color: C.inkSoft, textAlign: 'center' }}>{tx('players_empty')}</div>
        </Card>
      ) : (
        <Card style={{ padding: '8px 8px 6px' }}>
          {groups.map((bucket, bi) => (
            <div key={bucket.id} style={{ marginBottom: bi < groups.length - 1 ? 4 : 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 5 }}>
                <div style={{
                  width: 18, height: 18, borderRadius: 5, flexShrink: 0,
                  background: C.navy, color: C.yellow,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontFamily: F.display, fontSize: 9,
                }}>{bucket.label}</div>
                <div style={{ flex: 1, height: 1, background: 'rgba(46, 58, 140, 0.15)' }} />
                <div style={{ fontFamily: F.body, fontSize: 9, fontWeight: 700, color: C.inkSoft }}>{bucket.players.length}</div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 5, width: '100%' }}>
                {bucket.players.map(p => (
                  <span key={p} style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'flex-start', textAlign: 'left',
                    paddingLeft: 7, paddingRight: 1, width: '100%', minWidth: 0,
                    background: C.cream, border: `2px solid ${C.navy}`, borderRadius: 999,
                    boxShadow: '1px 1px 0 #00000012', overflow: 'hidden',
                  }}>
                    <span style={{
                      flex: 1, minWidth: 0, color: C.navy, padding: '5px 2px 5px 0',
                      fontFamily: F.body, fontSize: 11, fontWeight: 600,
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>{formatDisplayName(p)}</span>
                    <button
                      type="button"
                      onClick={() => (canEdit ? setActionsFor(p) : onRequireAuth())}
                      aria-label={canEdit ? tx('players_actions_edit') : tx('auth_locked')}
                      style={{
                        flexShrink: 0, border: 'none', borderLeft: `1px solid ${C.navy}18`,
                        background: 'transparent', color: C.navy, opacity: 0.55,
                        padding: '3px 4px', cursor: 'pointer',
                        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                      }}
                    >
                      {canEdit ? <MoreVertical size={12} strokeWidth={2.5} /> : <Lock size={11} strokeWidth={2.5} />}
                    </button>
                  </span>
                ))}
              </div>
            </div>
          ))}
        </Card>
      )}
      </div>

      {actionsFor && (
        <Overlay><Card style={{ padding: 18, maxWidth: 320, width: '100%' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
            <Users size={20} color={C.navy} strokeWidth={2.5} />
            <div style={{ fontFamily: F.display, fontSize: 16, color: C.navy }}>{formatDisplayName(actionsFor)}</div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <OptionRow icon={Edit3} title={tx('players_actions_edit')} subtitle={tx('players_actions_edit_sub')} onClick={() => { const p = actionsFor; setActionsFor(null); openRename(p); }} />
            <OptionRow icon={Trash2} title={tx('players_actions_delete')} onClick={() => { const p = actionsFor; setActionsFor(null); handleTryDelete(p); }} danger />
          </div>
          <div style={{ marginTop: 12 }}><Btn onClick={() => setActionsFor(null)} variant="secondary" style={{ fontSize: 14 }}>{tx('setup_cancel')}</Btn></div>
        </Card></Overlay>
      )}

      {renameTarget && (
        <Overlay><Card style={{ padding: 20, maxWidth: 340, width: '100%' }}>
          <div style={{ fontFamily: F.display, fontSize: 16, color: C.navy, marginBottom: 10 }}>{tx('players_rename_title')}</div>
          <div style={{ fontFamily: F.body, fontSize: 13, color: C.inkSoft, marginBottom: 14, lineHeight: 1.5 }}>
            {tx('players_rename_body', { name: formatDisplayName(renameTarget) })}
          </div>
          <input
            value={renameValue}
            onChange={(e) => { setRenameValue(e.target.value); setRenameError(null); }}
            placeholder={tx('players_rename_ph')}
            autoComplete="off" autoCorrect="off" spellCheck={false}
            style={{
              width: '100%', boxSizing: 'border-box', height: 44, minHeight: 44,
              background: C.creamLight, border: `3px solid ${C.navy}`, borderRadius: 10,
              padding: '0 12px', fontFamily: F.body, fontSize: 16, color: C.ink, outline: 'none',
              boxShadow: `inset 2px 2px 0 ${C.creamDark}`, marginBottom: renameError ? 8 : 16,
            }}
          />
          {renameError && (
            <div style={{ fontFamily: F.body, fontSize: 12, color: C.red, marginBottom: 12, lineHeight: 1.4 }}>
              {tx({ duplicate: 'players_rename_dup', activeGame: 'players_rename_active' }[renameError] || 'players_rename_error', { name: formatDisplayName(renameTarget) })}
            </div>
          )}
          <div style={{ display: 'flex', gap: 8 }}>
            <Btn onClick={() => { setActionsFor(renameTarget); setRenameTarget(null); setRenameError(null); }} variant="secondary" disabled={renameSaving}>{tx('setup_cancel')}</Btn>
            <Btn onClick={handleSaveRename} disabled={!renameValue.trim() || renameSaving}>
              {renameSaving ? tx('players_rename_saving') : tx('players_rename_save')}
            </Btn>
          </div>
        </Card></Overlay>
      )}

      {confirmDeleteSaved && (
        <DeleteSavedPlayerConfirm
          info={confirmDeleteSaved}
          onCancel={() => setConfirmDeleteSaved(null)}
          onConfirm={() => {
            const { name } = confirmDeleteSaved;
            setConfirmDeleteSaved(null);
            onDeleteSavedPlayer(name);
          }}
          tx={tx}
        />
      )}
    </PageBg>
  );
}

/** Renderiza los tramos entre **...** en negrita. */
function renderBold(text) {
  return text.split(/\*\*(.+?)\*\*/).map((part, i) => (i % 2 ? <strong key={i} style={{ color: C.navy }}>{part}</strong> : part));
}

function RulesSection({ icon: Icon, title, children }) {
  return (
    <Card style={{ padding: 16, marginBottom: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
        <div style={{
          width: 32, height: 32, borderRadius: 9, background: C.yellow, border: `2px solid ${C.navy}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}><Icon size={16} color={C.navy} strokeWidth={2.5} /></div>
        <div style={{ fontFamily: F.display, fontSize: 14, color: C.navy, letterSpacing: '1px' }}>{title}</div>
      </div>
      <div style={{ fontFamily: F.body, fontSize: 13.5, color: C.inkSoft, lineHeight: 1.55, whiteSpace: 'pre-line' }}>
        {typeof children === 'string' ? renderBold(children) : children}
      </div>
    </Card>
  );
}

function RulesActionCard({ color, title, children }) {
  return (
    <div style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
      <div style={{ width: 4, borderRadius: 4, background: color, flexShrink: 0 }} />
      <div>
        <div style={{ fontFamily: F.display, fontSize: 11.5, color: C.navy, letterSpacing: '0.5px', marginBottom: 2 }}>{title}</div>
        <div>{typeof children === 'string' ? renderBold(children) : children}</div>
      </div>
    </div>
  );
}

function RulesScreen({ onBack, tx, fromGame = false }) {
  const [scrolled, setScrolled] = useState(false);
  const headerRef = useRef(null);
  const contentRef = useRef(null);
  const engageRef = useRef(0);
  useEffect(() => {
    if (headerRef.current && contentRef.current) {
      engageRef.current = contentRef.current.getBoundingClientRect().top - headerRef.current.getBoundingClientRect().bottom;
    }
  }, []);

  return (
    <PageBg showEric={false} onScroll={(e) => setScrolled(e.currentTarget.scrollTop > engageRef.current)}>
      <div ref={headerRef} style={{
        ...stickyHeaderStyle(scrolled), zIndex: 10,
        backgroundColor: scrolled ? C.teal : 'transparent', backgroundImage: scrolled ? 'radial-gradient(rgba(90,166,168,0.15) 1px, transparent 1px)' : 'none', backgroundSize: '16px 16px', backgroundAttachment: 'fixed',
        borderRadius: scrolled ? '0 0 20px 20px' : 0,
        boxShadow: scrolled ? `0 3px 6px ${C.navyDark}30` : 'none',
      }}>
        {fromGame ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 18 }}>
            <div style={{
              flex: 1, minWidth: 0,
              fontFamily: F.display, fontSize: 20, color: C.cream, letterSpacing: '2px',
              textShadow: `2px 2px 0 ${C.navyDark}, -1px -1px 0 ${C.navy}`,
              WebkitTextStroke: `1px ${C.navy}`, paintOrder: 'stroke fill'
            }}>{tx('rules_title')}</div>
            <button type="button" onClick={onBack} style={{
              background: C.yellow, border: `3px solid ${C.navy}`, borderRadius: 12,
              padding: '9px 16px', fontFamily: F.display, fontSize: 12, letterSpacing: '1px',
              color: C.navy, cursor: 'pointer', boxShadow: shadowSm(), marginRight: 3, flexShrink: 0, whiteSpace: 'nowrap',
            }}>{tx('rules_back_to_game')}</button>
          </div>
        ) : (
          <HeaderBar onBack={onBack} title={tx('rules_title')} />
        )}
      </div>

      <div ref={contentRef}>
      <RulesSection icon={Target} title={tx('rules_objective_title')}>{tx('rules_objective_body')}</RulesSection>

      <RulesSection icon={CardsIcon} title={tx('rules_deck_title')}>
        <div style={{ marginBottom: 8 }}>{renderBold(tx('rules_deck_numbers'))}</div>
        <div style={{ marginBottom: 8 }}>{renderBold(tx('rules_deck_modifiers'))}</div>
        <div>{renderBold(tx('rules_deck_actions'))}</div>
      </RulesSection>

      <RulesSection icon={Zap} title={tx('rules_play_title')}>
        <div style={{ marginBottom: 12, whiteSpace: 'pre-line' }}>{renderBold(tx('rules_play_body'))}</div>
        <RulesActionCard color={C.blueLight} title={tx('rules_freeze_title')}>{tx('rules_freeze_body')}</RulesActionCard>
        <RulesActionCard color={C.yellowDark} title={tx('rules_flip3_title')}>{tx('rules_flip3_body')}</RulesActionCard>
        <RulesActionCard color={C.red} title={tx('rules_second_title')}>{tx('rules_second_body')}</RulesActionCard>
      </RulesSection>

      <RulesSection icon={Calculator} title={tx('rules_scoring_title')}>
        <ol style={{ margin: 0, padding: 0, listStyle: 'none', textAlign: 'left', display: 'flex', flexDirection: 'column', gap: 6 }}>
          {tx('rules_scoring_body').split(/\s*\d\)\s*/).filter(Boolean).map((step, i) => (
            <li key={i} style={{ display: 'flex', gap: 8 }}>
              <span style={{ flexShrink: 0, minWidth: 14, fontWeight: 700, color: C.navy }}>{i + 1}.</span>
              <span>{renderBold(step)}</span>
            </li>
          ))}
        </ol>
      </RulesSection>

      <RulesSection icon={Trophy} title={tx('rules_end_title')}>{tx('rules_end_body')}</RulesSection>
      </div>
    </PageBg>
  );
}

function GameScreen({ game, scores, setScores, onCloseRound, onAbandon, onChangeTarget, onResetGame, onAddPlayer, onModifyRound, onSetTiebreakMode, onViewRules, existingPlayers, tx, lang }) {
  const [modal, setModal] = useState(null);
  // Adónde vuelve "Cancelar" en la lista de rondas: al menú de opciones o cerrar (si se abrió desde el header).
  const [selectRoundBack, setSelectRoundBack] = useState('options');
  const [editingRound, setEditingRound] = useState(null);
  const [editScores, setEditScores] = useState({});
  const [newPlayerName, setNewPlayerName] = useState('');
  const [newPlayerPoints, setNewPlayerPoints] = useState('0');
  const [newPlayerCustomPts, setNewPlayerCustomPts] = useState('');
  const [suppressAddPlayerSuggestions, setSuppressAddPlayerSuggestions] = useState(false);
  const [addPlayerSuggestionHoverIdx, setAddPlayerSuggestionHoverIdx] = useState(null);
  const addPlayerNameRowRef = useRef(null);
  const [scoreWarningConfirmed, setScoreWarningConfirmed] = useState(false);
  const [flippeadorAlert, setFlippeadorAlert] = useState(null);
  const [spicyAlert, setSpicyAlert] = useState(null);
  const [tiebreakLeaders, setTiebreakLeaders] = useState([]);
  const [pendingTarget, setPendingTarget] = useState(null);
  const [confirmCountdown, setConfirmCountdown] = useState(0);
  const [activeScoreIdx, setActiveScoreIdx] = useState(null);
  const [keypadMode, setKeypadMode] = useState('digits');
  const [cardSelection, setCardSelection] = useState({ numbers: [], mods: [] });
  const scoreReplaceNextRef = useRef(false);
  const scrollContainerRef = useRef(null);
  const rowRefs = useRef([]);
  const keypadPanelRef = useRef(null);
  const keypadSpacerRef = useRef(null);

  useLayoutEffect(() => {
    const container = scrollContainerRef.current;
    const spacer = keypadSpacerRef.current;
    if (!container || !spacer) return;
    if (activeScoreIdx === null) {
      spacer.style.height = '0px';
      return;
    }
    const keypadEl = keypadPanelRef.current;
    const keypadHeight = keypadEl ? keypadEl.getBoundingClientRect().height : 0;
    spacer.style.height = `${keypadHeight}px`;
    const rowEl = rowRefs.current[activeScoreIdx];
    if (!rowEl || !keypadEl) return;
    const rowRect = rowEl.getBoundingClientRect();
    const keypadTop = keypadEl.getBoundingClientRect().top;
    const overlap = rowRect.bottom - keypadTop + 16;
    if (overlap > 0) {
      container.scrollTop += overlap;
    }
  }, [activeScoreIdx, keypadMode]);

  useEffect(() => {
    if (confirmCountdown <= 0) return;
    const t = setTimeout(() => setConfirmCountdown((c) => Math.max(0, c - 1)), 1000);
    return () => clearTimeout(t);
  }, [confirmCountdown]);
  const headerRef = useRef(null);
  const contentRef = useRef(null);

  useEffect(() => {
    const closeAddPlayerSuggestions = (e) => {
      if (!addPlayerNameRowRef.current?.contains(e.target)) setSuppressAddPlayerSuggestions(true);
    };
    document.addEventListener('mousedown', closeAddPlayerSuggestions);
    document.addEventListener('touchstart', closeAddPlayerSuggestions, { passive: true });
    return () => {
      document.removeEventListener('mousedown', closeAddPlayerSuggestions);
      document.removeEventListener('touchstart', closeAddPlayerSuggestions);
    };
  }, []);

  const roundNum = game.rounds.length + 1;
  const target = game.targetScore;

  const MAX_SCORE = 181;
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
    const last = g.rounds[g.rounds.length - 1];
    const phrases = SPICY[lang] ?? SPICY.es;
    const items = [];
    for (const p of g.players) {
      // Solo quien jugó la ronda recién cerrada y sacó 0.
      if ((last.absent ?? []).includes(p) || (last.scores?.[p] ?? 0) !== 0) continue;
      const { consecutive, total } = zeroStats(g.rounds, p);
      const tier = spicyTierForZero(consecutive, total);
      if (!tier) continue;
      // Con racha (3+ seguidos) sale siempre; por ceros sueltos acumulados (4+ en la partida), la mitad de las veces.
      if (consecutive < 3 && Math.random() >= 0.5) continue;
      const list = tier === 'hot' ? phrases.hot : [...phrases.soft, ...phrases.hot];
      items.push({ name: p, phrase: pickSpicyPhrase(list, items.map(it => it.phrase)) });
    }
    if (items.length > 0) setSpicyAlert({ items });
  };

  const applyCloseRoundResult = (result) => {
    if (!result?.status || result.status === 'invalid') return;
    if (result?.status === 'tie') {
      setTiebreakLeaders(result.leaders ?? game.tiebreak?.players ?? []);
      setModal('tiebreak');
      return;
    }
    if (result?.status === 'continued' && result.gameAfter) {
      maybeOpenSpicyAlert(result.gameAfter);
    }
  };

  const handleCloseRound = async () => {
    if (missingScoreCount > 0) return;
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
  const { sorted: scoringPlayersSorted, meta: scoringRankMeta } = buildDenseRanks(
    scoringPlayers,
    (p) => game.totals[p] ?? 0,
  );

  const missingScoreCount = scoringPlayersSorted.filter(p => scores[p] === '' || scores[p] === undefined).length;

  const activateScoreCell = (idx) => {
    scoreReplaceNextRef.current = true;
    setKeypadMode('digits');
    setCardSelection({ numbers: [], mods: [] });
    setActiveScoreIdx(idx);
  };

  const closeScoreKeypad = () => setActiveScoreIdx(null);

  const pressScoreDigit = (digit) => {
    if (activeScoreIdx === null) return;
    const p = scoringPlayersSorted[activeScoreIdx];
    const base = scoreReplaceNextRef.current ? '' : (scores[p] ?? '');
    let next = (base + digit).replace(/^0+(?=\d)/, '');
    if (next.length > 3) next = next.slice(0, 3);
    setScores({ ...scores, [p]: next });
    scoreReplaceNextRef.current = false;
  };

  const pressScoreBackspace = () => {
    if (activeScoreIdx === null) return;
    const p = scoringPlayersSorted[activeScoreIdx];
    setScores({ ...scores, [p]: (scores[p] ?? '').slice(0, -1) });
    scoreReplaceNextRef.current = false;
  };

  const CARD_FLIP7_BONUS = 25;
  const cardsNumberSum = cardSelection.numbers.reduce((a, b) => a + b, 0);
  const cardsHasX2 = cardSelection.mods.includes('x2');
  const cardsFlatModSum = cardSelection.mods.filter((m) => m !== 'x2').reduce((a, m) => a + parseInt(m, 10), 0);
  const cardsFlip7 = cardSelection.numbers.length === 7;
  const cardsTotal = (cardsHasX2 ? cardsNumberSum * 2 : cardsNumberSum) + cardsFlatModSum + (cardsFlip7 ? CARD_FLIP7_BONUS : 0);

  const toggleCardNumber = (n) => {
    setCardSelection((sel) => {
      const has = sel.numbers.includes(n);
      if (!has && sel.numbers.length >= 7) return sel;
      const numbers = has ? sel.numbers.filter((x) => x !== n) : [...sel.numbers, n];
      return { ...sel, numbers };
    });
  };

  const toggleCardMod = (key) => {
    setCardSelection((sel) => {
      const has = sel.mods.includes(key);
      const mods = has ? sel.mods.filter((x) => x !== key) : [...sel.mods, key];
      return { ...sel, mods };
    });
  };

  const pressScoreConfirm = () => {
    if (keypadMode === 'cards' && activeScoreIdx !== null) {
      const p = scoringPlayersSorted[activeScoreIdx];
      setScores({ ...scores, [p]: String(cardsTotal) });
    }
    closeScoreKeypad();
  };

  const handleScoresFormSubmit = (e) => {
    e.preventDefault();
  };

  const handleTiebreakChoice = (mode) => {
    onSetTiebreakMode(mode, tiebreakLeaders);
    setModal(null);
  };

  const headerIconBtn = {
    flexShrink: 0,
    alignSelf: 'center',
    width: 48,
    minWidth: 48,
    height: 48,
    background: C.yellow,
    border: `2px solid ${C.navy}`,
    boxSizing: 'border-box',
    borderRadius: 14,
    boxShadow: `0 3px 8px ${C.navyDark}59`,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 0,
  };
  const headerActionBtn = { ...headerIconBtn, boxShadow: shadowSm() };

  const keypadDimStyle = {
    opacity: activeScoreIdx !== null ? 0.35 : 1,
    filter: activeScoreIdx !== null ? 'grayscale(0.9)' : 'none',
    transition: 'opacity 0.2s ease, filter 0.2s ease',
  };

  return (
    <PageBg showEric={false} hideFooter scrollRef={scrollContainerRef}>
      <div style={{ paddingTop: 14 }}>
      <div ref={headerRef} style={keypadDimStyle}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 14, marginBottom: 8 }}>
        <button
          type="button"
          onClick={() => { setSelectRoundBack(null); setModal('selectRound'); }}
          aria-label={tx('game_opt_edit')}
          className="hdrBtn"
          style={{
            ...headerActionBtn, width: 'auto', minWidth: 0, padding: '0 16px', cursor: 'pointer',
            flexDirection: 'column', justifyContent: 'center', alignItems: 'flex-start', textAlign: 'left',
          }}
        >
          <div style={{ fontFamily: F.display, fontSize: 17, color: C.navy, letterSpacing: '1px', lineHeight: 1, whiteSpace: 'nowrap' }}>
            {tx('game_round')} {String(roundNum).padStart(2, '0')}
          </div>
          <div style={{ fontFamily: F.body, fontSize: 10, fontWeight: 700, color: C.navy, letterSpacing: '0.5px', marginTop: 4, lineHeight: 1, whiteSpace: 'nowrap', opacity: 0.85 }}>
            {tx('game_goal')}: {target} {tx('game_pts')}
          </div>
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          <button
            type="button"
            onClick={() => setModal('options')}
            aria-label={tx('game_options')}
            className="hdrBtn"
            style={{ ...headerActionBtn, marginRight: 3 }}
          >
            <Settings size={24} strokeWidth={2.5} color={C.navy} />
          </button>
        </div>
      </div>

      </div>

      <div ref={contentRef} style={{
        background: C.cream, border: `3px solid ${C.navy}`, borderRadius: 20,
        boxShadow: shadow(C.navyDark, 5, 5), marginRight: 5, padding: '6px 8px', position: 'relative', zIndex: 1
      }}>

      <form onSubmit={handleScoresFormSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {scoringPlayersSorted.map((p, idx) => {
          const total = game.totals[p];
          const remaining = Math.max(0, target - total);
          const pct = Math.min(100, (total / target) * 100);
          const { rank, isLeader } = scoringRankMeta[p];
          const barColor = pct <= 33 ? C.red : pct <= 66 ? C.yellow : C.green;
          const isZeroEntered = scores[p] === '0';

          const isDimmed = activeScoreIdx !== null && activeScoreIdx !== idx;

          return (
            <div key={p} ref={(el) => { rowRefs.current[idx] = el; }} style={{
              background: C.creamLight,
              border: `2px solid ${C.navy}`,
              borderRadius: 10,
              padding: '6px 8px',
              boxShadow: '1px 1px 0 #00000010',
              opacity: isDimmed ? 0.35 : 1,
              filter: isDimmed ? 'grayscale(0.9)' : 'none',
              transition: 'opacity 0.2s ease, filter 0.2s ease',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
                <div style={{ flex: 1, minWidth: 0, paddingRight: 4 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5, lineHeight: 1.1, minWidth: 0 }}>
                    <RankBadge rank={rank} />
                    {isLeader && <Crown size={14} color={C.yellow} fill={C.yellow} stroke={C.navy} strokeWidth={2} style={{ flexShrink: 0 }} />}
                    <span style={{ fontFamily: F.display, fontSize: 14, color: C.navy, textAlign: 'left', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, minWidth: 0 }}>{formatDisplayName(p)}</span>
                    <span style={{ fontFamily: F.display, fontSize: 17, color: C.navy, flexShrink: 0 }}>{total}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 5 }}>
                    <div style={{ flex: 1, height: 4, background: C.creamDark, borderRadius: 999, border: `1px solid ${C.navy}20`, overflow: 'hidden' }}>
                      <div style={{ width: `${pct}%`, height: '100%', background: barColor, borderRadius: 999, transition: 'width 0.4s' }} />
                    </div>
                    <div style={{
                      fontFamily: F.display, fontSize: 10, flexShrink: 0,
                      color: barColor === C.yellow ? C.yellowDeep : barColor, letterSpacing: '0.3px', fontWeight: 'bold', lineHeight: 1,
                    }}>{tx('game_faltan')} {remaining}</div>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                  <button
                    type="button"
                    onClick={() => activateScoreCell(idx)}
                    aria-label={`${tx('game_score_round')} ${formatDisplayName(p)}`}
                    style={{
                      width: 52,
                      height: 32,
                      boxSizing: 'border-box',
                      background: C.white,
                      border: `2px solid ${activeScoreIdx === idx ? C.yellowDeep : C.navy}`,
                      borderRadius: 7,
                      padding: '0 4px',
                      textAlign: 'center',
                      fontFamily: F.display,
                      fontSize: 15,
                      lineHeight: 1,
                      color: scores[p] ? C.navy : `${C.navy}70`,
                      outline: activeScoreIdx === idx ? `2px solid ${C.yellow}` : 'none',
                      outlineOffset: 1,
                      cursor: 'pointer',
                      boxShadow: `inset 1px 1px 0 ${C.creamDark}`,
                    }}
                  >{scores[p] || '-'}</button>
                  <button
                    type="button"
                    onClick={() => setScores({ ...scores, [p]: '0' })}
                    aria-label="0"
                    style={{
                      background: isZeroEntered ? C.red : C.cream,
                      color: isZeroEntered ? C.white : C.navy,
                      border: `2px solid ${isZeroEntered ? C.navyDark : `${C.navy}55`}`,
                      borderRadius: 7,
                      width: 40,
                      height: 32,
                      boxSizing: 'border-box',
                      padding: 0,
                      cursor: 'pointer',
                      boxShadow: isZeroEntered ? '1px 1px 0 #00000030' : 'none',
                      flexShrink: 0,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  ><BustCardsIcon size={20} /></button>
                </div>
              </div>
            </div>
          );
        })}
      </form>
      </div>

      {/* Lugar para que la última fila pueda scrollear por encima del botón flotante. */}
      <div style={{ height: 84 }} />

      {/* Botón de cerrar ronda: flota abajo, fuera de la tarjeta. Se oculta con el teclado abierto. */}
      {activeScoreIdx === null && (
        <div style={{
          position: 'fixed', left: '50%', transform: 'translateX(-50%)', zIndex: 40,
          bottom: 'calc(20px + env(safe-area-inset-bottom))',
          width: `calc(100% - ${PAGE_PAD.l + PAGE_PAD.r}px)`, maxWidth: 460 - PAGE_PAD.l - PAGE_PAD.r, boxSizing: 'border-box',
        }}>
          <div style={{ background: missingScoreCount > 0 ? C.cream : 'transparent', borderRadius: 14 }}>
          {missingScoreCount > 0 ? (
            <Btn
              onClick={handleCloseRound}
              disabled
              flat
              icon={Zap}
              style={{ padding: '12px 8px', gap: 6, background: 'transparent', boxShadow: 'none', border: `4px dashed ${C.navy}66`, color: C.navy, opacity: 0.75, textShadow: 'none', fontSize: 'clamp(10px, 3.3vw, 15px)', letterSpacing: '0.5px', whiteSpace: 'nowrap' }}
            >{missingScoreCount === 1 ? tx('game_missing_one') : tx('game_missing_many', { n: missingScoreCount })}</Btn>
          ) : (
            <Btn onClick={handleCloseRound} icon={Zap} style={{ padding: '10px' }}>{tx('game_add_round')} {String(roundNum).padStart(2, '0')}</Btn>
          )}
          </div>
        </div>
      )}

      <div ref={keypadSpacerRef} style={{ height: 0 }} />

      {/* Modales de alertas, empate, opciones se mantienen igual pero dentro de PageBg showEric=false */}

      {modal === 'flippeadorAlert' && flippeadorAlert && (
        <Overlay><Card style={{ padding: 25, maxWidth: 360, width: '90%', textAlign: 'center', border: `4px solid ${C.navy}` }}>
          <div style={{ fontFamily: F.display, fontSize: 22, color: C.red, marginBottom: 15 }}>{tx('game_flip_title')}</div>
          <div style={{ fontFamily: F.body, fontSize: 16, color: C.navy, lineHeight: 1.5, marginBottom: 20, fontWeight: 'bold' }}>
            {flippeadorAlert.type === 'single'
              ? <>{lang === 'es' ? '¡' : ''}<span style={{ color: C.red }}>{formatDisplayName(flippeadorAlert.name)}</span> {tx('game_flip_single_rest', { n: flippeadorAlert.remaining })}</>
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
            {tx('game_tie_body', { count: tiebreakLeaders.length, names: tiebreakLeaders.map(formatDisplayName).join(' · ') })}
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
            boxShadow: `${shadow(C.navyDark, 6, 6)}, 0 0 30px rgba(255, 122, 26, 0.45)`, marginRight: 6,
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
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20, position: 'relative' }}>
              {spicyAlert.items.map(({ name, phrase }) => (
                <div key={name} style={{
                  background: C.creamLight, border: `3px solid ${C.navyDark}`, borderRadius: 12,
                  padding: '10px 12px', textAlign: 'left',
                }}>
                  <div style={{ fontFamily: F.body, fontSize: 16, fontWeight: 800, color: C.red, marginBottom: 2 }}>{formatDisplayName(name)}</div>
                  <div style={{ fontFamily: F.body, fontSize: 15, lineHeight: 1.4, fontWeight: 600, color: C.navy }}>{phrase}</div>
                </div>
              ))}
            </div>
            <button onClick={() => setSpicyAlert(null)} style={{
              width: 'calc(100% - 3px)', marginRight: 3, padding: '12px 16px',
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
            <OptionRow icon={Target} title={tx('game_opt_target')} subtitle={tx('game_opt_target_sub', { n: target })} onClick={() => { setPendingTarget(null); setModal('target'); }} />
            <OptionRow icon={Edit3} title={tx('game_opt_edit')} subtitle={tx('game_opt_edit_sub')} onClick={() => { setSelectRoundBack('options'); setModal('selectRound'); }} />
            <OptionRow icon={UserPlus} title={tx('game_opt_add')} subtitle={tx('game_opt_add_sub')} onClick={() => { setModal('addPlayer'); setNewPlayerName(''); setNewPlayerPoints('0'); setNewPlayerCustomPts(''); setSuppressAddPlayerSuggestions(false); setAddPlayerSuggestionHoverIdx(null); }} />
            <OptionRow icon={RotateCcw} title={tx('game_opt_reset')} subtitle={tx('game_opt_reset_sub')} onClick={() => { setConfirmCountdown(2); setModal('reset'); }} />
            <OptionRow icon={BookOpen} title={tx('game_opt_rules')} subtitle={tx('game_opt_rules_sub')} onClick={() => { setModal(null); onViewRules(); }} />
            <OptionRow icon={X} title={tx('game_opt_leave')} subtitle={tx('game_opt_leave_sub')} onClick={() => { setConfirmCountdown(1); setModal('confirmAbandon'); }} danger />
          </div>
          <div style={{ marginTop: 12 }}><Btn onClick={() => setModal(null)} variant="secondary" style={{ fontSize: 14 }}>{tx('game_close')}</Btn></div>
        </Card></Overlay>
      )}

      {modal === 'target' && (
        <Overlay><Card style={{ padding: 20, maxWidth: 360, width: '100%' }}>
          <div style={{ fontFamily: F.display, fontSize: 16, color: C.navy, marginBottom: 4 }}>{tx('game_new_target')}</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
            {[200, 300, 400, 500].map(v => {
              const selected = pendingTarget !== null ? pendingTarget === v : v === target;
              return (
                <button key={v} onClick={() => setPendingTarget(v)} style={{ position: 'relative', background: selected ? C.navy : C.yellow, color: selected ? C.yellow : C.navy, border: `4px solid ${C.navy}`, borderRadius: 14, padding: '14px 0', cursor: 'pointer', fontFamily: F.display }}>
                  <div style={{ fontSize: 30 }}>{v}</div>
                </button>
              );
            })}
          </div>
          {pendingTarget !== null && pendingTarget !== target ? (() => {
            const [confirmBefore, confirmAfter] = tx('game_confirm_target').split('{n}');
            return (
              <Btn onClick={() => { onChangeTarget(pendingTarget); setModal(null); setPendingTarget(null); }} style={{ marginBottom: 10, padding: '10px 8px', gap: 8, fontSize: 14, whiteSpace: 'nowrap' }}>
                {confirmBefore.trim()}
                <span style={{
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  minWidth: 26, height: 26, borderRadius: 999, background: C.navy, color: C.yellow,
                  fontFamily: F.display, fontSize: 13, padding: '0 8px', textShadow: 'none',
                }}>{pendingTarget}</span>
                {confirmAfter}
              </Btn>
            );
          })() : (
            <Btn
              disabled
              flat
              style={{ marginBottom: 10, padding: '10px 8px', fontSize: 14, whiteSpace: 'nowrap', background: 'transparent', boxShadow: 'none', border: `4px dashed ${C.navy}66`, color: C.navy, opacity: 0.75, textShadow: 'none' }}
            >{tx('game_opt_target')}</Btn>
          )}
          <Btn onClick={() => { setModal('options'); setPendingTarget(null); }} variant="secondary">{tx('setup_cancel')}</Btn>
        </Card></Overlay>
      )}

      {modal === 'selectRound' && (
        <Overlay><Card style={{ padding: 20, maxWidth: 360, width: '100%' }}>
          {game.rounds.length === 0 ? (
            <>
              <div style={{ fontFamily: F.body, fontSize: 14, color: C.inkSoft, marginBottom: 16, lineHeight: 1.5 }}>{tx('game_no_rounds_yet')}</div>
              <Btn onClick={() => setModal(selectRoundBack)}>{tx('game_accept')}</Btn>
            </>
          ) : (
            <>
              <div style={{ fontFamily: F.display, fontSize: 16, color: C.navy, marginBottom: 14 }}>{tx('game_which_round')}</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 280, overflowY: 'auto', marginBottom: 14 }}>
                {game.rounds.map((r, idx) => ({ r, idx })).reverse().map(({ r, idx }) => (
                  <button key={idx} onClick={() => { setEditScores({ ...r.scores }); setEditingRound(idx); setModal('editRound'); }} style={{ width: '100%', background: C.creamLight, border: `3px solid ${C.navy}`, borderRadius: 10, padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 30, height: 30, borderRadius: 999, background: C.yellow, border: `2px solid ${C.navy}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: F.display, fontSize: 12, color: C.navy }}>#{idx + 1}</div>
                    <div style={{ flex: 1, fontFamily: F.body, fontSize: 11, textAlign: 'left', color: C.ink }}>{game.players.map(p => `${formatDisplayName(p)}: ${r.scores[p] ?? 0}`).join(' · ')}</div>
                    <Edit3 size={14} color={C.navy} />
                  </button>
                ))}
              </div>
              <Btn onClick={() => setModal(selectRoundBack)} variant="secondary">{tx('setup_cancel')}</Btn>
            </>
          )}
        </Card></Overlay>
      )}

      {modal === 'editRound' && editingRound !== null && (
        <Overlay><Card style={{ padding: 20, maxWidth: 360, width: '100%' }}>
          <div style={{ fontFamily: F.display, fontSize: 16, color: C.navy, marginBottom: 16 }}>{tx('game_edit_round')} {editingRound + 1}</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
            {game.players.map(p => (
              <div key={p} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ flex: 1, fontFamily: F.display, fontSize: 14, color: C.navy }}>{formatDisplayName(p)}</div>
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
            <Btn onClick={() => setModal('selectRound')} variant="secondary">{tx('setup_cancel')}</Btn>
            <Btn onClick={() => { const parsed = {}; for (const p of game.players) parsed[p] = parseInt(editScores[p], 10) || 0; onModifyRound(editingRound, parsed); setModal(null); }}>{tx('game_save')}</Btn>
          </div>
        </Card></Overlay>
      )}

      {modal === 'reset' && (
        <Overlay><Card style={{ padding: 20, maxWidth: 320, width: '100%' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}><AlertTriangle color={C.red} size={22} /><div style={{ fontFamily: F.display, fontSize: 16, color: C.navy }}>{tx('game_reset_q')}</div></div>
          <div style={{ display: 'flex', gap: 8 }}>
            <Btn onClick={() => setModal('options')} variant="secondary" style={{ flex: 1, minWidth: 0, padding: '14px 8px', fontSize: 14 }}>{tx('setup_cancel')}</Btn>
            <Btn onClick={() => { onResetGame(); setModal(null); }} variant="danger" disabled={confirmCountdown > 0} style={{ flex: 1, minWidth: 0, padding: '14px 8px', fontSize: 14 }}>
              {confirmCountdown > 0 ? `${tx('game_reset')} (${confirmCountdown})` : tx('game_reset')}
            </Btn>
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
            <Btn onClick={() => setModal('options')} variant="secondary" style={{ flex: 1, minWidth: 0, padding: '14px 8px', fontSize: 14 }}>{tx('game_back')}</Btn>
            <Btn onClick={() => { setModal(null); onAbandon(); }} variant="danger" disabled={confirmCountdown > 0} style={{ flex: 1, minWidth: 0, padding: '14px 8px', fontSize: 14 }}>
              {confirmCountdown > 0 ? `${tx('game_abandon')} (${confirmCountdown})` : tx('game_abandon')}
            </Btn>
          </div>
        </Card></Overlay>
      )}

      {modal === 'addPlayer' && (() => {
        const qq = foldForMatch(newPlayerName.trim());
        let savedMatchSuggestions = [];
        if (qq) {
          savedMatchSuggestions = (existingPlayers || [])
            .filter(p => !game.players.includes(p) && foldForMatch(p).startsWith(qq));
          savedMatchSuggestions.sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
          savedMatchSuggestions = savedMatchSuggestions.slice(0, 12);
        }
        const showAddPlayerSuggestions = qq.length > 0 && savedMatchSuggestions.length > 0 && !suppressAddPlayerSuggestions;
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
          <div ref={addPlayerNameRowRef} style={{ position: 'relative', marginBottom: 10, zIndex: showAddPlayerSuggestions ? 70 : 1 }}>
            <input
              value={newPlayerName}
              onChange={(e) => { setNewPlayerName(e.target.value); setSuppressAddPlayerSuggestions(false); setAddPlayerSuggestionHoverIdx(null); }}
              placeholder={tx('setup_ph_name')}
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
              style={addPlayerInputStyle}
            />
            {showAddPlayerSuggestions && (
              <div
                role="listbox"
                aria-label={tx('setup_saved')}
                onMouseLeave={() => setAddPlayerSuggestionHoverIdx(null)}
                style={{
                  position: 'absolute', left: 0, right: 0, top: 'calc(100% + 2px)', zIndex: 80,
                  background: C.creamLight, border: `3px solid ${C.navy}`, borderRadius: 10,
                  boxShadow: '0 4px 14px rgba(0, 0, 128, 0.18), 0 2px 6px rgba(0, 0, 0, 0.08)',
                  maxHeight: 220, overflowY: 'auto', WebkitOverflowScrolling: 'touch',
                }}
              >
                {savedMatchSuggestions.map((p, idx) => (
                  <button
                    key={p}
                    type="button"
                    role="option"
                    aria-selected={addPlayerSuggestionHoverIdx === idx}
                    onMouseEnter={() => setAddPlayerSuggestionHoverIdx(idx)}
                    onTouchStart={() => setAddPlayerSuggestionHoverIdx(idx)}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => { setNewPlayerName(p); setSuppressAddPlayerSuggestions(true); setAddPlayerSuggestionHoverIdx(null); }}
                    style={{
                      width: '100%', textAlign: 'left', border: 'none',
                      borderBottom: idx === savedMatchSuggestions.length - 1 ? 'none' : `1px solid ${C.navy}1f`,
                      background: addPlayerSuggestionHoverIdx === idx ? 'rgba(244, 212, 77, 0.42)' : 'transparent',
                      padding: '11px 14px', fontFamily: F.body, fontSize: 15, fontWeight: 600, color: C.navy,
                      cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, transition: 'background 0.12s ease',
                    }}
                  >
                    <Users size={16} strokeWidth={2.5} color={C.inkSoft} style={{ flexShrink: 0 }} />
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{formatDisplayName(p)}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
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
            <Btn onClick={() => setModal('options')} variant="secondary">{tx('setup_cancel')}</Btn>
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
                <span style={{ fontFamily: F.display, fontSize: 13, color: C.navy }}>{formatDisplayName(p)}</span>
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
                <span style={{ fontFamily: F.display, fontSize: 13, color: C.navy }}>{formatDisplayName(p)}</span>
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

      {activeScoreIdx !== null && (() => {
        const cardNumColors = [C.redDeep, C.inkSoft, C.green, C.red, C.tealDeep, C.tealShadow, C.navy, C.redDark, C.tealDeep, C.yellowDeep];
        const cardKeyStyle = (color) => ({
          height: 56, background: C.creamLight, border: `2px solid ${C.bluePale}`, borderRadius: 12,
          boxShadow: `0 4px 0 ${C.blueLight}`,
          fontFamily: F.display, fontSize: 24, color, cursor: 'pointer',
        });
        const tabStyle = (active) => ({
          flex: 1, height: active ? 38 : 32, padding: '0 10px',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: active ? C.cream : C.tealDark,
          color: active ? C.navy : C.creamLight,
          border: `3px solid ${C.navy}`,
          borderBottom: active ? `3px solid ${C.cream}` : `3px solid ${C.navy}`,
          borderRadius: '12px 12px 0 0',
          fontFamily: F.display, fontSize: 13, letterSpacing: '1.5px',
          textShadow: active ? 'none' : `0 1px 2px ${C.tealShadow}, 0 0 1px ${C.navyDark}`,
          cursor: 'pointer', zIndex: active ? 3 : 1,
          boxShadow: active ? 'none' : `inset 0 -3px 0 ${C.tealShadow}`,
        });
        const numbersSorted = [...cardSelection.numbers].sort((a, b) => a - b);
        const flatModsSorted = cardSelection.mods.filter((m) => m !== 'x2').sort((a, b) => parseInt(a, 10) - parseInt(b, 10));
        const miniKeyStyle = (color, selected) => ({
          height: 42, background: selected ? C.yellow : C.creamLight,
          border: `2px solid ${selected ? C.yellowDeep : C.bluePale}`, borderRadius: 10,
          boxShadow: `0 ${selected ? 1 : 3}px 0 ${selected ? C.yellowDeep : C.blueLight}`,
          fontFamily: F.display, fontSize: 16, color: selected ? C.navy : color, cursor: 'pointer',
        });
        const modKeyStyle = (selected) => ({
          height: 38, background: selected ? C.yellow : C.creamLight,
          border: `2px solid ${selected ? C.yellowDeep : C.bluePale}`, borderRadius: 10,
          boxShadow: `0 ${selected ? 1 : 3}px 0 ${selected ? C.yellowDeep : C.blueLight}`,
          fontFamily: F.display, fontSize: 13, color: C.navy, cursor: 'pointer',
        });
        return (
        <>
          <div onClick={closeScoreKeypad} style={{ position: 'fixed', inset: 0, background: 'transparent', zIndex: 89 }} />
          <div ref={keypadPanelRef} style={{
            position: 'fixed', left: 'calc(50% - 2.5px)', bottom: 0, transform: 'translateX(-50%)',
            width: `calc(100% - ${PAGE_PAD.l + PAGE_PAD.r + 5}px)`, maxWidth: 460 - PAGE_PAD.l - PAGE_PAD.r - 5, boxSizing: 'border-box', zIndex: 90,
            boxShadow: `5px 0 0 ${C.navyDark}`,
          }}>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 0, marginBottom: -3, position: 'relative', zIndex: 2 }}>
              <button type="button" onClick={() => setKeypadMode('digits')} style={tabStyle(keypadMode === 'digits')}>123</button>
              <button type="button" onClick={() => setKeypadMode('cards')} style={tabStyle(keypadMode === 'cards')} aria-label="Anotador de cartas">
                <Calculator size={15} strokeWidth={2.5} color={keypadMode === 'cards' ? C.navy : C.creamLight} />
              </button>
            </div>

            <div style={{
              background: C.cream, borderWidth: '0 3px 3px 3px', borderStyle: 'solid', borderColor: C.navy,
              boxShadow: `0 -4px 14px ${C.navyDark}40`, padding: '10px 10px calc(10px + env(safe-area-inset-bottom))',
              position: 'relative', zIndex: 1,
            }}>
            {keypadMode === 'cards' && (
              <div style={{
                background: C.navy, border: `3px solid ${C.navyDark}`, borderRadius: 10,
                padding: '10px 12px', marginBottom: 10, height: 40,
                display: 'flex', alignItems: 'baseline', justifyContent: 'flex-end', gap: 6,
                overflow: 'hidden', whiteSpace: 'nowrap',
              }}>
                <span style={{
                  fontFamily: F.body, fontSize: 13, color: C.yellow, opacity: 0.9,
                  overflow: 'hidden', textOverflow: 'ellipsis', minWidth: 0,
                }}>
                  ({numbersSorted.length ? numbersSorted.join(' + ') : '0'})
                  {cardsHasX2 && <strong style={{ fontWeight: 800 }}> x2</strong>}
                  {(flatModsSorted.length > 0 || cardsFlip7) && (
                    <span> ({[...flatModsSorted.map((m) => `+${m}`), ...(cardsFlip7 ? ['+25'] : [])].join(' ')})</span>
                  )}
                </span>
                <span style={{ fontFamily: F.display, fontSize: 18, color: C.yellow, flexShrink: 0 }}>= {cardsTotal}</span>
              </div>
            )}

            {keypadMode === 'digits' ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((d) => (
                  <button
                    key={d}
                    type="button"
                    className="numKey"
                    onClick={() => pressScoreDigit(String(d))}
                    style={cardKeyStyle(cardNumColors[d % cardNumColors.length])}
                  >{d}</button>
                ))}
                <button
                  type="button"
                  className="numKey"
                  onClick={pressScoreBackspace}
                  aria-label="Borrar"
                  style={{
                    height: 56, background: C.creamLight, border: `2px solid ${C.red}80`, borderRadius: 12,
                    boxShadow: `0 4px 0 ${C.red}80`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.red, cursor: 'pointer',
                  }}
                ><Delete size={22} strokeWidth={2.5} /></button>
                <button
                  type="button"
                  className="numKey"
                  onClick={() => pressScoreDigit('0')}
                  style={cardKeyStyle(cardNumColors[0])}
                >0</button>
                <button
                  type="button"
                  className="numKey"
                  onClick={pressScoreConfirm}
                  aria-label="Confirmar"
                  style={{
                    height: 56, background: C.green, border: `2px solid ${C.green}`, borderRadius: 12,
                    boxShadow: '0 4px 0 #5BAE6A', display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.navy, cursor: 'pointer',
                  }}
                ><Check size={24} strokeWidth={3} /></button>
              </div>
            ) : (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 5, marginBottom: 6 }}>
                  {[0, 1, 2, 3, 4, 5, 6].map((n) => (
                    <button
                      key={n}
                      type="button"
                      className="numKey"
                      onClick={() => toggleCardNumber(n)}
                      style={miniKeyStyle(cardNumColors[n % cardNumColors.length], cardSelection.numbers.includes(n))}
                    >{n}</button>
                  ))}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 5, marginBottom: 8 }}>
                  {[7, 8, 9, 10, 11, 12].map((n) => (
                    <button
                      key={n}
                      type="button"
                      className="numKey"
                      onClick={() => toggleCardNumber(n)}
                      style={miniKeyStyle(cardNumColors[n % cardNumColors.length], cardSelection.numbers.includes(n))}
                    >{n}</button>
                  ))}
                  <div
                    aria-label={cardsFlip7 ? 'Bonus Flip 7 activado' : 'Bonus Flip 7 (seleccioná 7 cartas)'}
                    style={{
                      height: 42, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontFamily: F.display, fontSize: 12,
                      border: `3px solid ${cardsFlip7 ? C.navyDark : C.navy}`,
                      background: cardsFlip7 ? `linear-gradient(180deg, ${C.yellowBright} 0%, ${C.yellow} 50%, ${C.yellowDark} 100%)` : C.creamDark,
                      color: cardsFlip7 ? C.navyDark : `${C.inkSoft}90`,
                      boxShadow: cardsFlip7 ? shadowSm() : 'none',
                      opacity: cardsFlip7 ? 1 : 0.6,
                    }}
                  >+25</div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 5, marginBottom: 8 }}>
                  {['2', '4', '6', '8', '10'].map((m) => (
                    <button
                      key={m}
                      type="button"
                      className="numKey"
                      onClick={() => toggleCardMod(m)}
                      style={modKeyStyle(cardSelection.mods.includes(m))}
                    >+{m}</button>
                  ))}
                  <button
                    type="button"
                    className="numKey"
                    onClick={() => toggleCardMod('x2')}
                    style={modKeyStyle(cardSelection.mods.includes('x2'))}
                  >x2</button>
                </div>

                <button
                  type="button"
                  className="numKey"
                  onClick={pressScoreConfirm}
                  aria-label="Confirmar"
                  style={{
                    width: '100%', height: 48, background: C.green, border: `2px solid ${C.green}`, borderRadius: 12,
                    boxShadow: '0 4px 0 #5BAE6A', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: C.navy, cursor: 'pointer',
                  }}
                ><Check size={22} strokeWidth={3} /></button>
              </>
            )}
            </div>
          </div>
        </>
        );
      })()}
    </PageBg>
  );
}

function GameOverScreen({ game, onHome, onRematchSame, onRematchEdit, tx }) {
  const ranked = [...game.players].sort((a, b) => game.finalScores[b] - game.finalScores[a]);
  const [rematchMenuOpen, setRematchMenuOpen] = useState(false);
  useEffect(() => {
    confetti({ particleCount: 150, spread: 80, origin: { y: 0.6 } });
    const t = setTimeout(() => { confetti({ particleCount: 150, spread: 80, origin: { y: 0.6 } }); }, 250);
    return () => clearTimeout(t);
  }, []);

  return (
    <PageBg showEric={false} footerLink>
      <div style={{ textAlign: 'center', padding: '20px 0' }}>
        <div style={{ display: 'inline-block', background: C.yellow, border: `4px solid ${C.navy}`, borderRadius: 999, padding: 18, boxShadow: `${shadow()}, 0 0 30px ${C.yellow}50` }}><Trophy size={44} color={C.navy} fill={C.navy} /></div>
        <div style={{ fontFamily: F.display, fontSize: 42, color: C.yellow, marginTop: 16, textShadow: `4px 4px 0 ${C.navyDark}` }}>{game.winner.toUpperCase()}</div>
        <div style={{ fontFamily: F.display, fontSize: 24, color: C.cream }}>{game.finalScores[game.winner]} {tx('go_pts')}</div>
      </div>
      <Card style={{ padding: 8, marginBottom: 20 }} glow>
        {ranked.map((p, i) => (
          <div key={p} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 0', borderBottom: i < ranked.length - 1 ? `2px dashed ${C.navy}15` : 'none' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}><RankBadge rank={i + 1} size="lg" /><span style={{ fontFamily: F.display, fontSize: 17, color: C.navy }}>{formatDisplayName(p)}</span></div>
            <span style={{ fontFamily: F.display, fontSize: 24 }}>{game.finalScores[p]}</span>
          </div>
        ))}
      </Card>
      <Btn onClick={() => setRematchMenuOpen(true)} icon={RotateCcw} style={{ marginBottom: 10 }}>{tx('go_replay')}</Btn>
      <Btn onClick={onHome} variant="secondary" icon={CardsIcon}>{tx('go_new')}</Btn>

      {rematchMenuOpen && (
        <Overlay>
          <Card style={{ padding: 20, maxWidth: 340, width: '100%' }}>
            <div style={{ fontFamily: F.display, fontSize: 16, color: C.navy, marginBottom: 14 }}>{tx('go_replay')}</div>
            <Btn onClick={() => { setRematchMenuOpen(false); onRematchSame(); }} icon={RotateCcw} style={{ marginBottom: 10 }}>{tx('go_same_players')}</Btn>
            <Btn onClick={() => { setRematchMenuOpen(false); onRematchEdit(); }} variant="secondary" icon={Edit3} style={{ marginBottom: 10 }}>{tx('go_edit_players')}</Btn>
            <Btn onClick={() => setRematchMenuOpen(false)} variant="secondary" style={{ fontSize: 14 }}>{tx('setup_cancel')}</Btn>
          </Card>
        </Overlay>
      )}
    </PageBg>
  );
}

function EditPlayersOverlay({ initialPlayers, data, onSavePlayer, onConfirm, onClose, tx }) {
  const [roster, setRoster] = useState(() => [...initialPlayers]);
  const [name, setName] = useState('');
  const [suppressSavedSuggestions, setSuppressSavedSuggestions] = useState(false);
  const [suggestionHoverIdx, setSuggestionHoverIdx] = useState(null);
  const [alertMessage, setAlertMessage] = useState(null);
  const nameRowRef = useRef(null);

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
  const rosterHasCi = (nm) => roster.some(s => foldForMatch(s) === foldForMatch(nm));

  const qq = foldForMatch(name.trim());
  let savedMatchSuggestions = [];
  if (qq) {
    savedMatchSuggestions = existing.filter(p => !roster.includes(p) && foldForMatch(p).startsWith(qq));
    savedMatchSuggestions.sort((a, b) => {
      const ap = foldForMatch(a).startsWith(qq);
      const bp = foldForMatch(b).startsWith(qq);
      if (ap !== bp) return ap ? -1 : 1;
      return a.localeCompare(b, undefined, { sensitivity: 'base' });
    });
    savedMatchSuggestions = savedMatchSuggestions.slice(0, 12);
  }
  const showSavedSuggestions = qq.length > 0 && savedMatchSuggestions.length > 0 && !suppressSavedSuggestions;

  const addNew = () => {
    const t = name.trim(); if (!t) return;
    const match = existing.find(p => foldForMatch(p) === foldForMatch(t));
    const fn = match || t;
    if (rosterHasCi(fn)) { setAlertMessage(tx('setup_dup')); return; }
    setRoster([...roster, fn]); setName('');
    setSuppressSavedSuggestions(true);
    setSuggestionHoverIdx(null);
    if (!match) onSavePlayer(fn);
  };

  const pickSuggestion = (p) => {
    if (rosterHasCi(p)) { setAlertMessage(tx('setup_dup')); return; }
    setRoster([...roster, p]); setName('');
    setSuppressSavedSuggestions(true);
    setSuggestionHoverIdx(null);
  };

  const removeFromRoster = (p) => setRoster(roster.filter(x => x !== p));

  const handleConfirm = () => {
    if (roster.length < 2) { setAlertMessage(tx('go_edit_need2')); return; }
    onConfirm([...roster]);
  };

  return (
    <Overlay>
      <Card style={{ padding: 18, maxWidth: 340, width: '100%' }}>
        <div style={{ fontFamily: F.display, fontSize: 16, color: C.navy, marginBottom: 12 }}>{tx('go_edit_players_title')}</div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 3, marginBottom: 12, maxHeight: 240, overflowY: 'auto' }}>
          {roster.map((p, i) => (
            <div key={p} style={{ display: 'flex', alignItems: 'center', gap: 7, background: C.creamLight, padding: '4px 6px', borderRadius: 8, border: `1px solid ${C.navy}18` }}>
              <div style={{ width: 16, height: 16, borderRadius: 999, background: C.navy, color: C.yellow, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: F.display, fontSize: 8, flexShrink: 0 }}>{i + 1}</div>
              <div style={{ flex: 1, minWidth: 0, fontFamily: F.body, fontWeight: 700, fontSize: 12, color: C.navy, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{formatDisplayName(p)}</div>
              <button type="button" onClick={() => removeFromRoster(p)} style={{ background: 'transparent', border: 'none', color: C.red, cursor: 'pointer', display: 'flex', padding: 1, flexShrink: 0 }}>
                <Trash2 size={12} strokeWidth={3} />
              </button>
            </div>
          ))}
        </div>

        <div ref={nameRowRef} style={{ display: 'flex', gap: 6, alignItems: 'stretch', marginBottom: 4 }}>
          <div style={{ position: 'relative', flex: 1, minWidth: 0, zIndex: showSavedSuggestions ? 70 : 1 }}>
            <input
              value={name}
              onChange={(e) => { setName(e.target.value); setSuppressSavedSuggestions(false); setSuggestionHoverIdx(null); }}
              onKeyDown={(e) => { if (e.key === 'Enter') addNew(); }}
              placeholder={tx('setup_ph_name')}
              autoComplete="off" autoCorrect="off" spellCheck={false}
              style={{ width: '100%', height: 44, minHeight: 44, boxSizing: 'border-box', background: C.creamLight, border: '3px solid #000080', borderRadius: 10, padding: '0 12px', fontFamily: F.body, fontSize: 16, lineHeight: '22px', color: C.ink, outline: 'none', boxShadow: `inset 2px 2px 0 ${C.creamDark}` }}
            />
            {showSavedSuggestions && (
              <div role="listbox" aria-label={tx('setup_saved')} onMouseLeave={() => setSuggestionHoverIdx(null)}
                style={{ position: 'absolute', left: 0, right: 0, top: 'calc(100% + 2px)', zIndex: 80, background: C.creamLight, border: '3px solid #000080', borderRadius: 10, boxShadow: '0 4px 14px rgba(0, 0, 128, 0.18), 0 2px 6px rgba(0, 0, 0, 0.08)', maxHeight: 220, overflowY: 'auto', WebkitOverflowScrolling: 'touch' }}>
                {savedMatchSuggestions.map((p, idx) => (
                  <button key={p} type="button" role="option" aria-selected={suggestionHoverIdx === idx}
                    onMouseEnter={() => setSuggestionHoverIdx(idx)} onTouchStart={() => setSuggestionHoverIdx(idx)}
                    onMouseDown={(e) => e.preventDefault()} onClick={() => pickSuggestion(p)}
                    style={{ width: '100%', textAlign: 'left', border: 'none', borderBottom: idx === savedMatchSuggestions.length - 1 ? 'none' : '1px solid rgba(0, 0, 128, 0.12)', background: suggestionHoverIdx === idx ? 'rgba(244, 212, 77, 0.42)' : 'transparent', padding: '11px 14px', fontFamily: F.body, fontSize: 15, fontWeight: 600, color: '#000080', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, transition: 'background 0.12s ease' }}>
                    <Users size={16} strokeWidth={2.5} color={C.inkSoft} style={{ flexShrink: 0 }} />
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{formatDisplayName(p)}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
          <button type="button" onClick={addNew} style={{ flexShrink: 0, height: 44, minHeight: 44, minWidth: 48, boxSizing: 'border-box', padding: '0 12px', background: C.yellow, border: '3px solid #000080', borderRadius: 10, cursor: 'pointer', boxShadow: shadowSm(), marginRight: 3, color: C.navy, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Plus size={22} strokeWidth={3} />
          </button>
        </div>

        <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
          <Btn onClick={onClose} variant="secondary" style={{ fontSize: 14 }}>{tx('setup_cancel')}</Btn>
          <Btn onClick={handleConfirm} disabled={roster.length < 2}>{tx('go_edit_confirm')}</Btn>
        </div>

        {alertMessage && (
          <Overlay><Card style={{ padding: 20, maxWidth: 300, width: '100%' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
              <AlertTriangle color={C.yellowDark} size={22} />
              <div style={{ fontFamily: F.display, fontSize: 16, color: C.navy }}>{tx('setup_notice')}</div>
            </div>
            <div style={{ fontFamily: F.body, fontSize: 14, color: C.inkSoft, marginBottom: 16, lineHeight: 1.5 }}>{alertMessage}</div>
            <Btn onClick={() => setAlertMessage(null)}>{tx('setup_ok')}</Btn>
          </Card></Overlay>
        )}
      </Card>
    </Overlay>
  );
}

function efficaciaPct(p) {
  if (!p.gamesPlayed) return -1;
  return (100 * p.wins) / p.gamesPlayed;
}

function RankingsScreen({ data, onBack, tx, lang }) {
  const [tab, setTab] = useState('wins');
  const [query, setQuery] = useState('');
  const [selectedNames, setSelectedNames] = useState([]);
  const [suppressSuggestions, setSuppressSuggestions] = useState(false);
  const queryRowRef = useRef(null);
  const [scrolled, setScrolled] = useState(false);
  const headerRef = useRef(null);
  const contentRef = useRef(null);
  const engageRef = useRef(0);
  const players = Object.values(data.players);

  useEffect(() => {
    if (headerRef.current && contentRef.current) {
      engageRef.current = contentRef.current.getBoundingClientRect().top - headerRef.current.getBoundingClientRect().bottom;
    }
  }, []);

  useEffect(() => {
    const closeSuggestions = (e) => {
      if (!queryRowRef.current?.contains(e.target)) setSuppressSuggestions(true);
    };
    document.addEventListener('mousedown', closeSuggestions);
    document.addEventListener('touchstart', closeSuggestions, { passive: true });
    return () => {
      document.removeEventListener('mousedown', closeSuggestions);
      document.removeEventListener('touchstart', closeSuggestions);
    };
  }, []);
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
  const filtered = selectedNames.length > 0 ? sorted.filter(p => selectedNames.includes(p.name)) : sorted;

  const qq = foldForMatch(query.trim());
  let matchSuggestions = [];
  if (qq) {
    matchSuggestions = players
      .map(p => p.name)
      .filter(nm => !selectedNames.includes(nm) && foldForMatch(nm).startsWith(qq))
      .sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }))
      .slice(0, 12);
  }
  const showSuggestions = qq.length > 0 && matchSuggestions.length > 0 && !suppressSuggestions;

  const pickName = (nm) => {
    setSelectedNames(prev => [...prev, nm]);
    setQuery('');
    setSuppressSuggestions(true);
  };
  const removeName = (nm) => setSelectedNames(prev => prev.filter(x => x !== nm));

  return (
    <PageBg showEric={false} onScroll={(e) => setScrolled(e.currentTarget.scrollTop > engageRef.current)}>
      <div ref={headerRef} style={{
        ...stickyHeaderStyle(scrolled), zIndex: 60,
        backgroundColor: scrolled ? C.teal : 'transparent', backgroundImage: scrolled ? 'radial-gradient(rgba(90,166,168,0.15) 1px, transparent 1px)' : 'none', backgroundSize: '16px 16px', backgroundAttachment: 'fixed',
        borderRadius: scrolled ? '0 0 20px 20px' : 0,
        boxShadow: scrolled ? `0 3px 6px ${C.navyDark}30` : 'none',
      }}>
      <HeaderBar title={tx('rk_title')} onBack={onBack} />
      <div ref={queryRowRef} style={{ position: 'relative', marginBottom: selectedNames.length > 0 ? 8 : 12, zIndex: showSuggestions ? 70 : 1 }}>
        <Search size={16} strokeWidth={2.5} color={C.inkSoft} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
        <input
          value={query}
          onChange={(e) => { setQuery(e.target.value); setSuppressSuggestions(false); }}
          placeholder={tx('rk_filter_ph')}
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          style={{
            width: '100%', height: 44, minHeight: 44, boxSizing: 'border-box',
            background: C.creamLight, border: '3px solid #000080', borderRadius: 10,
            padding: '0 12px 0 34px', fontFamily: F.body, fontSize: 16, lineHeight: '22px',
            color: C.ink, outline: 'none', boxShadow: `inset 2px 2px 0 ${C.creamDark}`,
          }}
        />
        {showSuggestions && (
          <div
            role="listbox"
            style={{
              position: 'absolute', left: 0, right: 0, top: 'calc(100% + 2px)', zIndex: 80,
              background: C.creamLight, border: '3px solid #000080', borderRadius: 10,
              boxShadow: '0 4px 14px rgba(0, 0, 128, 0.18), 0 2px 6px rgba(0, 0, 0, 0.08)',
              maxHeight: 220, overflowY: 'auto', WebkitOverflowScrolling: 'touch',
            }}
          >
            {matchSuggestions.map((nm, idx) => (
              <button
                key={nm}
                type="button"
                role="option"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => pickName(nm)}
                style={{
                  width: '100%', textAlign: 'left', border: 'none',
                  borderBottom: idx === matchSuggestions.length - 1 ? 'none' : '1px solid rgba(0, 0, 128, 0.12)',
                  background: 'transparent', padding: '11px 14px', fontFamily: F.body, fontSize: 15,
                  fontWeight: 600, color: '#000080', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: 8,
                }}
              >
                <Users size={16} strokeWidth={2.5} color={C.inkSoft} style={{ flexShrink: 0 }} />
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{formatDisplayName(nm)}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {selectedNames.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 14 }}>
          {selectedNames.map(nm => (
            <button key={nm} type="button" onClick={() => removeName(nm)} style={{
              display: 'flex', alignItems: 'center', gap: 4,
              background: C.yellow, border: `2px solid ${C.navy}`, borderRadius: 999,
              padding: '8px 10px 8px 12px', boxShadow: '1px 1px 0 #00000012',
              fontFamily: F.body, fontSize: 13, fontWeight: 600, color: C.navy, cursor: 'pointer',
            }}>
              {formatDisplayName(nm)}
              <X size={12} strokeWidth={3} />
            </button>
          ))}
          <button type="button" onClick={() => setSelectedNames([])} style={{
            display: 'flex', alignItems: 'center', gap: 4,
            background: 'transparent', border: `2px dashed ${C.cream}`, borderRadius: 999,
            padding: '8px 12px', fontFamily: F.body, fontSize: 13, fontWeight: 600, color: C.cream, cursor: 'pointer',
          }}>
            {tx('rk_filter_clear')}
          </button>
        </div>
      )}
      <div style={{ display: 'flex', gap: 5, overflowX: 'auto', paddingBottom: 4, scrollbarWidth: 'none' }}>
        {tabs.map(t => {
          const active = t.id === tab; const I = t.icon;
          return (
            <button key={t.id} onClick={() => setTab(t.id)} style={{ background: active ? C.yellow : C.tealDark, color: active ? C.navy : C.cream, border: `3px solid ${active ? C.navy : C.cream}40`, borderRadius: 10, padding: '10px 14px', fontFamily: F.display, fontSize: 13, cursor: 'pointer', flexShrink: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
              <I size={16} strokeWidth={2.5} /> {t.label}
            </button>
          );
        })}
      </div>
      </div>
      <div ref={contentRef} style={{ marginTop: 14 }}>
      <Card style={{ padding: 6 }}>
        {filtered.length === 0 && (
          <div style={{ padding: '14px 6px', textAlign: 'center', fontFamily: F.body, fontSize: 13, color: C.inkSoft }}>{tx('rk_filter_empty')}</div>
        )}
        {filtered.map((p, i) => (
          <div key={p.name} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 2px', borderBottom: i < filtered.length - 1 ? `1.5px dashed ${C.navy}12` : 'none' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <RankBadge rank={i + 1} />
              <div style={{ fontFamily: F.display, fontSize: 13, color: C.navy, textAlign: 'left', minWidth: 0 }}>{formatDisplayName(p.name)}</div>
            </div>
            {/* Mismo formato en todas las pestañas: valor grande a la derecha y debajo ganadas · partidas. */}
            <div style={{ textAlign: 'right', flexShrink: 0 }}>
              <div style={{ fontFamily: F.display, fontSize: 17, color: tab === 'eff' && !p.gamesPlayed ? C.inkSoft : C.navy }}>
                {tab === 'eff'
                  ? (p.gamesPlayed ? `${Math.round(efficaciaPct(p))}%` : tx('rk_na'))
                  : <>{at.value(p)}{at.suf && <span style={{ fontSize: 9, color: C.inkSoft, marginLeft: 3 }}>{at.suf.toUpperCase()}</span>}</>}
              </div>
              <div style={{ fontFamily: F.display, fontSize: 9, color: C.inkSoft, marginTop: 2, lineHeight: 1.2 }}>
                {formatWinsGamesEff(p.wins, p.gamesPlayed, lang)}
              </div>
            </div>
          </div>
        ))}
      </Card>
      </div>
    </PageBg>
  );
}

function HistoryScreen({ data, onBack, onDelete, tx, lang, canEdit, onRequireAuth }) {
  const allGames = data.games;
  const [confirmDelete, setConfirmDelete] = useState(null);
  // Borrado en dos pasos; solo el primero tiene 2s de espera antes de habilitar el botón.
  const [deleteStep, setDeleteStep] = useState(1);
  const [deleteCountdown, setDeleteCountdown] = useState(0);
  useEffect(() => {
    if (deleteCountdown <= 0) return;
    const t = setTimeout(() => setDeleteCountdown((c) => Math.max(0, c - 1)), 1000);
    return () => clearTimeout(t);
  }, [deleteCountdown]);
  const [scrolled, setScrolled] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [filterPlayers, setFilterPlayers] = useState([]);
  const [filterQuery, setFilterQuery] = useState('');
  const [suppressFilterSuggestions, setSuppressFilterSuggestions] = useState(false);
  const [filterSuggestionHoverIdx, setFilterSuggestionHoverIdx] = useState(null);
  const filterRowRef = useRef(null);
  const headerRef = useRef(null);
  const contentRef = useRef(null);
  const engageRef = useRef(0);
  useEffect(() => {
    if (headerRef.current && contentRef.current) {
      engageRef.current = contentRef.current.getBoundingClientRect().top - headerRef.current.getBoundingClientRect().bottom;
    }
  }, []);
  useEffect(() => {
    const closeSuggestions = (e) => {
      if (!filterRowRef.current?.contains(e.target)) setSuppressFilterSuggestions(true);
    };
    document.addEventListener('mousedown', closeSuggestions);
    document.addEventListener('touchstart', closeSuggestions, { passive: true });
    return () => {
      document.removeEventListener('mousedown', closeSuggestions);
      document.removeEventListener('touchstart', closeSuggestions);
    };
  }, []);

  const existingPlayerNames = Object.keys(data.players).sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
  const qq = foldForMatch(filterQuery.trim());
  let filterSuggestions = [];
  if (qq) {
    filterSuggestions = existingPlayerNames.filter(p => !filterPlayers.includes(p) && foldForMatch(p).startsWith(qq)).slice(0, 12);
  }
  const showFilterSuggestions = qq.length > 0 && filterSuggestions.length > 0 && !suppressFilterSuggestions;

  const addFilterPlayer = (p) => {
    if (!filterPlayers.includes(p)) setFilterPlayers([...filterPlayers, p]);
    setFilterQuery('');
    setSuppressFilterSuggestions(true);
    setFilterSuggestionHoverIdx(null);
  };
  const removeFilterPlayer = (p) => setFilterPlayers(filterPlayers.filter(x => x !== p));

  const games = filterPlayers.length === 0
    ? allGames
    : allGames.filter(g => filterPlayers.every(p => g.players.includes(p)));

  const winStats = filterPlayers.length >= 2 && games.length > 0
    ? filterPlayers
        .map(p => {
          const wins = games.filter(g => g.winner === p).length;
          return { name: p, wins, pct: Math.round((wins / games.length) * 100) };
        })
        .sort((a, b) => b.wins - a.wins)
    : [];

  return (
    <PageBg showEric={false} onScroll={(e) => setScrolled(e.currentTarget.scrollTop > engageRef.current)}>
      <div ref={headerRef} style={{
        ...stickyHeaderStyle(scrolled), zIndex: 10,
        backgroundColor: scrolled ? C.teal : 'transparent', backgroundImage: scrolled ? 'radial-gradient(rgba(90,166,168,0.15) 1px, transparent 1px)' : 'none', backgroundSize: '16px 16px', backgroundAttachment: 'fixed',
        borderRadius: scrolled ? '0 0 20px 20px' : 0,
        boxShadow: scrolled ? `0 3px 6px ${C.navyDark}30` : 'none',
      }}>
        <HeaderBar title={tx('hist_title')} onBack={onBack} right={
          <button
            type="button"
            onClick={() => setFilterOpen(v => !v)}
            aria-label={tx('hist_filter_ph')}
            style={{
              flexShrink: 0, width: 42, height: 42, borderRadius: 12,
              background: filterOpen || filterPlayers.length > 0 ? C.yellow : C.cream,
              border: `3px solid ${C.navy}`, boxShadow: shadowSm(), marginRight: 3,
              display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: C.navy,
            }}
          ><Search size={18} strokeWidth={3} /></button>
        } />

        {filterOpen && (
          <div style={{ marginBottom: 10 }}>
            <div ref={filterRowRef} style={{ position: 'relative', zIndex: showFilterSuggestions ? 70 : 1 }}>
              <input
                value={filterQuery}
                onChange={(e) => { setFilterQuery(e.target.value); setSuppressFilterSuggestions(false); setFilterSuggestionHoverIdx(null); }}
                placeholder={tx('hist_filter_ph')}
                autoComplete="off" autoCorrect="off" spellCheck={false}
                style={{
                  width: '100%', boxSizing: 'border-box', height: 44, minHeight: 44,
                  background: C.creamLight, border: `3px solid ${C.navy}`, borderRadius: 10,
                  padding: '0 12px', fontFamily: F.body, fontSize: 15, color: C.ink, outline: 'none',
                  boxShadow: `inset 2px 2px 0 ${C.creamDark}`,
                }}
              />
              {showFilterSuggestions && (
                <div role="listbox" onMouseLeave={() => setFilterSuggestionHoverIdx(null)} style={{
                  position: 'absolute', left: 0, right: 0, top: 'calc(100% + 2px)', zIndex: 80,
                  background: C.creamLight, border: `3px solid ${C.navy}`, borderRadius: 10,
                  boxShadow: '0 4px 14px rgba(0, 0, 128, 0.18), 0 2px 6px rgba(0, 0, 0, 0.08)',
                  maxHeight: 220, overflowY: 'auto', WebkitOverflowScrolling: 'touch',
                }}>
                  {filterSuggestions.map((p, idx) => (
                    <button key={p} type="button" role="option" aria-selected={filterSuggestionHoverIdx === idx}
                      onMouseEnter={() => setFilterSuggestionHoverIdx(idx)} onTouchStart={() => setFilterSuggestionHoverIdx(idx)}
                      onMouseDown={(e) => e.preventDefault()} onClick={() => addFilterPlayer(p)}
                      style={{
                        width: '100%', textAlign: 'left', border: 'none',
                        borderBottom: idx === filterSuggestions.length - 1 ? 'none' : `1px solid ${C.navy}1f`,
                        background: filterSuggestionHoverIdx === idx ? 'rgba(244, 212, 77, 0.42)' : 'transparent',
                        padding: '11px 14px', fontFamily: F.body, fontSize: 15, fontWeight: 600, color: C.navy,
                        cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8,
                      }}
                    >
                      <Users size={16} strokeWidth={2.5} color={C.inkSoft} style={{ flexShrink: 0 }} />
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{formatDisplayName(p)}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            {filterPlayers.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
                {filterPlayers.map(p => (
                  <span key={p} style={{
                    display: 'inline-flex', alignItems: 'center', gap: 6,
                    background: C.navy, color: C.cream, border: `2px solid ${C.navyDark}`, borderRadius: 999,
                    padding: '4px 6px 4px 10px', fontFamily: F.body, fontSize: 12, fontWeight: 700,
                  }}>
                    {formatDisplayName(p)}
                    <button type="button" onClick={() => removeFilterPlayer(p)} style={{ background: 'transparent', border: 'none', color: C.cream, cursor: 'pointer', display: 'flex', padding: 1 }}>
                      <X size={12} strokeWidth={3} />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {winStats.length > 0 && (
        <Card style={{ padding: '10px 12px', marginBottom: 10 }}>
          <div style={{ fontFamily: F.display, fontSize: 11, color: C.navy, letterSpacing: '1px', marginBottom: 8 }}>
            {tx('hist_win_rate_title', { count: games.length })}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {winStats.map(s => (
              <div key={s.name} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ flex: 1, minWidth: 0, fontFamily: F.body, fontWeight: 700, fontSize: 13, color: C.navy, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{formatDisplayName(s.name)}</div>
                <div style={{ flex: 2, height: 10, background: C.creamDark, borderRadius: 999, overflow: 'hidden' }}>
                  <div style={{ width: `${s.pct}%`, height: '100%', background: C.green }} />
                </div>
                <div style={{ width: 44, textAlign: 'right', fontFamily: F.display, fontSize: 13, color: C.navy, flexShrink: 0 }}>{s.pct}%</div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {filterPlayers.length > 0 && games.length === 0 && (
        <Card style={{ padding: 16, marginBottom: 10, textAlign: 'center' }}>
          <div style={{ fontFamily: F.body, fontSize: 14, color: C.inkSoft, lineHeight: 1.5 }}>{tx('hist_filter_empty')}</div>
        </Card>
      )}

      <div ref={contentRef} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {games.map(g => {
          const r = [...g.players].sort((a, b) => g.finalScores[b] - g.finalScores[a]);
          return (
            <Card key={g.id} style={{ padding: 6 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}><Calendar size={11} /><span style={{ fontSize: 11, fontFamily: F.body, color: C.inkSoft }}>{fmtDate(g.date, lang)}</span></div>
                {canEdit ? (
                  <button onClick={() => { setDeleteStep(1); setDeleteCountdown(2); setConfirmDelete(g); }} style={{ background: 'transparent', border: 'none', color: C.red }}><Trash2 size={14} /></button>
                ) : (
                  <button onClick={onRequireAuth} aria-label={tx('auth_locked')} style={{ background: 'transparent', border: 'none', color: C.inkSoft, opacity: 0.7 }}><Lock size={14} /></button>
                )}
              </div>
              {r.map((p, i) => (
                <div key={p} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1px 0', gap: 6 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                    <RankBadge rank={i + 1} size="lg" />
                    <span style={{ fontFamily: F.display, fontSize: 16, color: C.navy, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{formatDisplayName(p)}</span>
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
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
            <AlertTriangle color={C.red} size={22} />
            <div style={{ fontFamily: F.display, fontSize: 16, color: deleteStep === 2 ? C.red : C.navy, textAlign: 'left' }}>{tx(deleteStep === 2 ? 'setup_delete_final_title' : 'hist_del')}</div>
          </div>
          {deleteStep === 2 && (
            <div style={{ fontFamily: F.body, fontSize: 13, color: C.inkSoft, lineHeight: 1.5, marginBottom: 14, textAlign: 'left' }}>{tx('hist_del_final_body')}</div>
          )}
          <div style={{ display: 'flex', gap: 8 }}>
            <Btn onClick={() => setConfirmDelete(null)} variant="secondary" style={{ flex: 1, minWidth: 0, padding: '14px 8px', fontSize: 14 }}>{tx('setup_cancel')}</Btn>
            <Btn
              onClick={() => {
                if (deleteStep === 1) { setDeleteStep(2); return; }
                onDelete(confirmDelete.id); setConfirmDelete(null);
              }}
              variant="danger"
              disabled={deleteCountdown > 0}
              style={{ flex: 1, minWidth: 0, padding: '14px 8px', fontSize: 14, whiteSpace: 'nowrap' }}
            >
              {tx(deleteStep === 2 ? 'hist_del_final_btn' : 'setup_delete')}{deleteCountdown > 0 ? ` (${deleteCountdown})` : ''}
            </Btn>
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

  // Sesión de Supabase Auth: solo con sesión se puede borrar/editar (además lo exige la base con RLS).
  const [session, setSession] = useState(null);
  const [authOpen, setAuthOpen] = useState(false);
  useEffect(() => {
    supabase.auth.getSession().then(({ data: d }) => setSession(d?.session ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((_event, sess) => setSession(sess));
    return () => sub?.subscription?.unsubscribe();
  }, []);
  const canEdit = !!session;
  const openAuth = () => setAuthOpen(true);

  const [screen, setScreen] = useState('home');
  const [rulesFromGame, setRulesFromGame] = useState(false);
  const [data, setData] = useState({ players: {}, games: [] });
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState([]);
  const [game, setGame] = useState(null);
  const [scores, setScores] = useState({});
  const [completedGame, setCompletedGame] = useState(null);
  const [targetPickerOpen, setTargetPickerOpen] = useState(false);
  const [editPlayersOpen, setEditPlayersOpen] = useState(false);
  const [deletingPlayer, setDeletingPlayer] = useState(false);
  const [renamingPlayer, setRenamingPlayer] = useState(false);
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
  const rematchSame = () => {
    if (!completedGame) return;
    setSelected([...completedGame.players]);
    setEditPlayersOpen(false);
    openTargetPicker();
  };
  const rematchWithRoster = (roster) => {
    setSelected(roster);
    setEditPlayersOpen(false);
    openTargetPicker();
  };
  const startGame = (targetVal) => {
    const newGame = { players: [...selected], rounds: [], totals: Object.fromEntries(selected.map(p => [p, 0])), targetScore: targetVal };
    setGame(newGame);
    setScores(Object.fromEntries(selected.map(p => [p, ''])));
    setTargetPickerOpen(false);
    setScreen('game');
  };

  const closeRound = async () => {
    const rs = {};
    const absent = []; // no juegan esta ronda (desempate solo entre empatados)
    for (const p of game.players) {
      if (game.tiebreak?.mode === 'tied_only' && !(game.tiebreak?.players ?? []).includes(p)) {
        rs[p] = 0;
        absent.push(p);
      } else {
        rs[p] = parseInt(scores[p], 10) || 0;
      }
    }
    const nt = { ...game.totals }; for (const p of game.players) nt[p] += rs[p];
    const nr = [...game.rounds, absent.length > 0 ? { scores: rs, absent } : { scores: rs }]; const t = game.targetScore;
    const gameAfter = { ...game, rounds: nr, totals: nt };
    const outcome = resolveEndGame(nt, game.players, t, game.tiebreak);

    if (outcome.type === 'tie') {
      const leaders = outcome.leaders;
      setGame({
        ...gameAfter,
        tiebreak: { players: leaders, mode: game.tiebreak?.mode ?? null },
      });
      setScores(Object.fromEntries(game.players.map(p => [p, ''])));
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
    setScores(Object.fromEntries(game.players.map(p => [p, ''])));
    return { status: 'continued', gameAfter };
  };

  const setTiebreakMode = (mode, leaders) => {
    setGame(g => (g ? { ...g, tiebreak: { players: leaders ?? g.tiebreak?.players ?? [], mode } } : g));
  };

  const goHome = () => {
    setSelected([]); setGame(null); setScores({}); setCompletedGame(null); setScreen('home');
  };

  const deleteGame = async (id) => {
    if (!(await removeGame(id))) return;
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

  const renameSavedPlayer = async (oldName, newNameRaw) => {
    if (!oldName || renamingPlayer) return { ok: false, reason: 'error' };
    const newName = newNameRaw?.trim();
    if (!newName) return { ok: false, reason: 'empty' };
    if (foldForMatch(newName) === foldForMatch(oldName)) return { ok: true };

    const existingNames = Object.keys(data.players);
    const duplicate = existingNames.some(n => n !== oldName && foldForMatch(n) === foldForMatch(newName));
    if (duplicate) return { ok: false, reason: 'duplicate' };

    if (game && game.players.includes(oldName)) return { ok: false, reason: 'activeGame' };

    setRenamingPlayer(true);
    try {
      const ok = await executeCascadePlayerRename(oldName, newName);
      if (!ok) return { ok: false, reason: 'error' };
      const refreshed = await loadData();
      setData(refreshed);
      setSelected(prev => prev.map(p => (p === oldName ? newName : p)));
      return { ok: true };
    } catch (e) {
      console.error('Error al renombrar jugador en cascada:', e);
      return { ok: false, reason: 'error' };
    } finally {
      setRenamingPlayer(false);
    }
  };

  const changeTarget = (t) => { if (game) setGame({ ...game, targetScore: t }); };
  const resetGame = () => { if (game) { setGame({ ...game, rounds: [], totals: Object.fromEntries(game.players.map(p => [p, 0])), tiebreak: undefined }); setScores(Object.fromEntries(game.players.map(p => [p, '']))); } };
  const addPlayerMidGame = (name, pts) => { if (game && !game.players.includes(name)) { setGame({ ...game, players: [...game.players, name], totals: { ...game.totals, [name]: pts }, rounds: game.rounds.map(r => ({ ...r, scores: { ...r.scores, [name]: 0 }, absent: [...(r.absent ?? []), name] })) }); setScores({ ...scores, [name]: '' }); } };
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
        .hdrBtn:active { transform: translate(2px, 2px); box-shadow: 1px 1px 0 #1F2A6B !important; }
        .numKey:active { transform: translateY(3px); box-shadow: 0 1px 0 #8FB6D9 !important; }
        @keyframes cardRiseIn {
          from { opacity: 0; transform: translateY(16px); }
          to { opacity: 1; transform: translateY(0); }
        }
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
      {screen === 'home' && <HomeScreen data={data} lang={lang} setLang={setLang} tx={tx} session={session} onOpenAuth={openAuth} onNewGame={() => { setSelected([]); setScreen('setup'); }} onRankings={() => setScreen('rankings')} onHistory={() => setScreen('history')} onPlayers={() => setScreen('players')} onRules={() => { setRulesFromGame(false); setScreen('rules'); }} />}
      {screen === 'setup' && (
        <SetupScreen data={data} selected={selected} setSelected={setSelected} onStart={openTargetPicker} onBack={() => setScreen('home')} onSavePlayer={savePlayerName} tx={tx} session={session} />
      )}
      {screen === 'players' && <PlayersScreen data={data} onBack={() => setScreen('home')} onDeleteSavedPlayer={deleteSavedPlayer} onRenameSavedPlayer={renameSavedPlayer} tx={tx} canEdit={canEdit} onRequireAuth={openAuth} />}
      {screen === 'rules' && <RulesScreen onBack={() => setScreen(rulesFromGame ? 'game' : 'home')} fromGame={rulesFromGame} tx={tx} />}
      {targetPickerOpen && (
        <TargetPickerOverlay
          onCancel={() => setTargetPickerOpen(false)}
          onConfirm={(v) => startGame(v)}
          tx={tx}
        />
      )}
      {screen === 'game' && game && <GameScreen game={game} scores={scores} setScores={setScores} onCloseRound={closeRound} onAbandon={goHome} onChangeTarget={changeTarget} onResetGame={resetGame} onAddPlayer={addPlayerMidGame} onModifyRound={modifyRound} onSetTiebreakMode={setTiebreakMode} onViewRules={() => { setRulesFromGame(true); setScreen('rules'); }} existingPlayers={Object.keys(data.players)} tx={tx} lang={lang} />}
      {screen === 'gameover' && completedGame && <GameOverScreen game={completedGame} onHome={goHome} onRematchSame={rematchSame} onRematchEdit={() => setEditPlayersOpen(true)} tx={tx} />}
      {editPlayersOpen && completedGame && (
        <EditPlayersOverlay
          initialPlayers={completedGame.players}
          data={data}
          onSavePlayer={savePlayerName}
          onConfirm={rematchWithRoster}
          onClose={() => setEditPlayersOpen(false)}
          tx={tx}
        />
      )}
      {screen === 'rankings' && <RankingsScreen data={data} onBack={() => setScreen('home')} tx={tx} lang={lang} />}
      {screen === 'history' && <HistoryScreen data={data} onBack={() => setScreen('home')} onDelete={deleteGame} tx={tx} lang={lang} canEdit={canEdit} onRequireAuth={openAuth} />}
      {authOpen && <AuthOverlay session={session} onClose={() => setAuthOpen(false)} tx={tx} playerNames={Object.keys(data.players)} />}
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