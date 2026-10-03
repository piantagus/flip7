-- Usuarios registrados: permisos + registro de actividad.
-- Aplicado en producción el 2026-10-03 (después de publicar la versión de la app con ingreso).

-- 1) Modificar y borrar: solo usuarios ingresados. Leer y crear siguen abiertos para todos.
drop policy if exists "actualizar_games" on public.games;
drop policy if exists "borrar_games" on public.games;
drop policy if exists "actualizar_players" on public.players;
drop policy if exists "borrar_players" on public.players;

create policy "actualizar_games" on public.games for update to authenticated using (true) with check (true);
create policy "borrar_games" on public.games for delete to authenticated using (true);
create policy "actualizar_players" on public.players for update to authenticated using (true) with check (true);
create policy "borrar_players" on public.players for delete to authenticated using (true);

-- 2) Registro de actividad: quién modificó o borró qué, y cuándo. Lo escribe la base (triggers),
--    así que no se puede saltear desde la app. Sin políticas: solo se ve desde el panel de Supabase.
create table if not exists public.activity_log (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  user_id uuid,
  user_email text,
  user_name text,
  action text not null,        -- UPDATE | DELETE
  table_name text not null,    -- games | players
  row_key text,                -- id de la partida o nombre del jugador
  old_data jsonb,              -- la fila antes del cambio (permite recuperar lo borrado)
  new_data jsonb               -- la fila después del cambio (solo en UPDATE)
);

alter table public.activity_log enable row level security;

create or replace function public.log_activity()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  claims jsonb := nullif(current_setting('request.jwt.claims', true), '')::jsonb;
  old_row jsonb := to_jsonb(old);
  new_row jsonb := case when tg_op = 'UPDATE' then to_jsonb(new) else null end;
begin
  insert into public.activity_log (user_id, user_email, user_name, action, table_name, row_key, old_data, new_data)
  values (
    nullif(claims->>'sub', '')::uuid,
    claims->>'email',
    claims->'user_metadata'->>'name',
    tg_op,
    tg_table_name,
    coalesce(old_row->>'id', old_row->>'name'),
    old_row,
    new_row
  );
  return null;
end;
$$;

revoke all on function public.log_activity() from public, anon, authenticated;

drop trigger if exists games_activity_log on public.games;
create trigger games_activity_log after update or delete on public.games
  for each row execute function public.log_activity();

drop trigger if exists players_activity_log on public.players;
create trigger players_activity_log after update or delete on public.players
  for each row execute function public.log_activity();
