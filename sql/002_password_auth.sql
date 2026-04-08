alter table public.leaderboard_players
  add column if not exists password_hash text;

create index if not exists leaderboard_players_handle_idx
  on public.leaderboard_players (handle);
