create extension if not exists pgcrypto;

create table if not exists public.leaderboard_players (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 40),
  handle text,
  password_hash text,
  points integer not null default 0 check (points >= 0),
  level integer not null default 0 check (level >= 0),
  streak integer not null default 0 check (streak >= 0),
  upload_token_hash text not null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists leaderboard_players_points_idx
  on public.leaderboard_players (points desc, level desc, streak desc, updated_at asc);

create index if not exists leaderboard_players_handle_idx
  on public.leaderboard_players (handle);

create unique index if not exists leaderboard_players_handle_unique_idx
  on public.leaderboard_players (handle)
  where handle is not null and handle <> '';

create or replace function public.set_leaderboard_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists set_leaderboard_updated_at on public.leaderboard_players;
create trigger set_leaderboard_updated_at
before update on public.leaderboard_players
for each row
execute function public.set_leaderboard_updated_at();

create or replace view public.leaderboard_public as
select
  row_number() over (
    order by
      points desc,
      level desc,
      streak desc,
      updated_at asc,
      id asc
  ) as rank,
  id as player_id,
  name,
  handle,
  points,
  level,
  streak,
  updated_at
from public.leaderboard_players;
