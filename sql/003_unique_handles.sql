with ranked as (
  select
    id,
    handle,
    points,
    level,
    streak,
    updated_at,
    password_hash,
    row_number() over (
      partition by handle
      order by
        points desc,
        level desc,
        streak desc,
        updated_at desc,
        id asc
    ) as row_num
  from public.leaderboard_players
  where handle is not null and handle <> ''
),
aggregated as (
  select
    handle,
    max(points) as max_points,
    max(level) as max_level,
    max(streak) as max_streak,
    (
      array_remove(
        array_agg(password_hash order by (password_hash is not null) desc, updated_at desc),
        null
      )
    )[1] as chosen_password_hash
  from ranked
  group by handle
)
update public.leaderboard_players as players
set
  name = players.handle,
  points = greatest(players.points, aggregated.max_points),
  level = greatest(players.level, aggregated.max_level),
  streak = greatest(players.streak, aggregated.max_streak),
  password_hash = coalesce(players.password_hash, aggregated.chosen_password_hash)
from ranked
join aggregated on aggregated.handle = ranked.handle
where players.id = ranked.id
  and ranked.row_num = 1;

with ranked as (
  select
    id,
    row_number() over (
      partition by handle
      order by
        points desc,
        level desc,
        streak desc,
        updated_at desc,
        id asc
    ) as row_num
  from public.leaderboard_players
  where handle is not null and handle <> ''
)
delete from public.leaderboard_players as players
using ranked
where players.id = ranked.id
  and ranked.row_num > 1;

create unique index if not exists leaderboard_players_handle_unique_idx
  on public.leaderboard_players (handle)
  where handle is not null and handle <> '';
