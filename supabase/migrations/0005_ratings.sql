-- One Elo row per (player, ladder). Updated by the server when a hall reaches the reveal.
create table public.ratings (
  user_id uuid not null references public.profiles(id) on delete cascade,
  ladder text not null check (ladder in ('overall', 'crew', 'changeling')),
  rating integer not null default 1200,
  games integer not null default 0,
  wins integer not null default 0,
  updated_at timestamptz not null default now(),
  primary key (user_id, ladder)
);
create index ratings_ladder_rating_idx on public.ratings (ladder, rating desc);
alter table public.ratings enable row level security;
grant select, insert, update, delete on public.ratings to service_role;
