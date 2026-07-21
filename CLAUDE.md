# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A mobile-first companion web app for scoring games of the card game **Flip 7** ("PRESS YOUR LUCK · SINCE 1994"). Players enter round-by-round scores, the app tracks totals, detects wins/ties, and persists game history and player stats to Supabase. UI copy is in Spanish and English via a small custom i18n layer.

## Commands

```bash
npm run dev       # start Vite dev server (host: true, port 5173 — reachable from LAN/phone for testing)
npm run build     # production build
npm run preview   # preview the production build
npm run lint      # eslint over the whole repo
```

There is no test suite configured.

## Architecture

This is a small React 19 + Vite app with almost all logic in a **single file**, [src/App.jsx](src/App.jsx) (~2400 lines). Do not assume there are separate component/hook files to find — check here first.

### Layout of App.jsx

The file is organized top-to-bottom as: design tokens → Supabase data layer → pure game-logic helpers → shared UI primitives → one function-component per screen → the root `App` component that owns all state and switches screens. Roughly:

1. **Design system constants** — `C` (color palette) and `F` (font stacks: `Bungee` display font, `DM Sans` body, `DM Serif Display`) plus `shadow`/`shadowSm` helpers for the hard-drop-shadow retro-board-game look used everywhere.
2. **Supabase data layer** (top of file, module-level `async` functions, no React): `loadData`, `loadSavedPlayerNames`, `savePlayerName`, `removePlayerName`, `insertGame`, `removeGame`, `updateGame`, `executeCascadePlayerDelete`. Two tables: `games` (one row per finished game — `players`, `rounds`, `final_scores`, `winner`, `target_score`, `date`) and `players` (saved player names for autocomplete/reuse across games). Row shapes are converted with `normalizeGameRow`/`toGameInsertRow` at the DB boundary.
3. **Pure game-logic helpers** — no side effects, easy to reason about/unit-test in isolation if ever needed: `computeWinnerFromFinalScores`, `stripPlayerFromGame` (used when cascade-deleting a saved player from historical games), `updatePlayerStats`/`recalculateStats` (derive per-player stats from the full games list — stats are *not* stored separately, they're recomputed from `games` on load/mutation), `buildDenseRanks` (1,1,2,3-style dense ranking with ties), `resolveEndGame` (decides win/tie/continue after a round), `trailingZeroStreakRounds`, `pickSpicyMessage`.
4. **Shared UI primitives**: `PageBg`, `Card`, `Btn`, `HeaderBar`, `Overlay`, `Badge`, `OptionRow`, `CardsIcon`, `RankBadge`, `QuickCalcOverlay` (the in-app calculator modal).
5. **Screens**, each a top-level function component taking plain props (no context/router): `HomeScreen`, `SetupScreen` (player selection + saved-player management), `GameScreen` (the core round-entry screen — score inputs, BUST button, tiebreak handling, mid-round validation for impossible/suspicious scores), `GameOverScreen`, `RankingsScreen`, `HistoryScreen`.
6. **`App()`** (bottom of file) — the only stateful "controller". Holds `screen` (a string used as a manual switch — `'home' | 'setup' | 'game' | 'gameover' | 'rankings' | 'history'`, no router library), the in-progress `game`/`scores`, `data` (`{ players, games }` loaded from Supabase), and `lang`. Persists the in-progress game to `localStorage` (`flip7_active_game` / `flip7_active_scores`) so a page reload resumes mid-game; `lang` is persisted under `flip7_lang`. Also manages a screen **Wake Lock** while playing so the phone screen doesn't sleep mid-round.

### i18n

[src/i18n.js](src/i18n.js) exports a flat `LEX` dict keyed by `lang` (`es`/`en`) → `key` → string, plus `Tx(lang, key, rep)` which does `{placeholder}` substitution. Screens receive a bound `tx` callback (see `App()`) rather than importing `Tx` directly — follow that pattern when adding new UI strings (add the key to both `es` and `en` in `LEX`).

### Data flow / persistence model

- Source of truth for finished games is Supabase (`games` table); player stats shown in Rankings are **derived**, not stored — `recalculateStats`/`updatePlayerStats` recompute from the full `games` array whenever it changes (new game finished, game deleted, player cascade-deleted).
- Saved player names (`players` table) are separate from stats — deleting a saved player triggers `executeCascadePlayerDelete`, which also strips that player out of (or deletes) every historical game that included them, then stats are recalculated.
- The in-progress `game` object (players, `rounds`, running `totals`, `targetScore`, optional `tiebreak`) lives only in React state + `localStorage` until it's finished, at which point it's shape-shifted via `toGameInsertRow` and inserted into Supabase.

### Supabase credentials

`SUPABASE_URL` / `SUPABASE_ANON_KEY` are hardcoded at the top of `App.jsx` (anon/public key, intentional for a client-only app with a public anon key policy) — not read from env vars.

## Git workflow

For new features/fixes, create a branch (`fix/...`, `feat/...`) and push it rather than committing straight to `main`.

The `gh` CLI is **not installed** in this environment — don't run `gh pr create` or other `gh` commands. After pushing, `git push` prints a PR-creation URL (`https://github.com/<owner>/<repo>/pull/new/<branch>`); hand that link to the user so they can open the PR themselves.
