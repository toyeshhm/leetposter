-- Accounts are optional. A profile is created by the server after Supabase Auth sign-up.
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null unique check (username ~ '^[a-z0-9_]{3,20}$'),
  created_at timestamptz not null default now()
);

-- One row per (player with an account, hall). Written by the server when a hall reaches the reveal.
create table public.game_results (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  code text not null,
  played_at timestamptz not null default now(),
  seats text[] not null,
  was_imposter boolean not null,
  won boolean not null,
  reason text not null,
  cards_played integer not null default 0,
  cards_altered integer not null default 0,
  ejected boolean not null default false,
  players integer not null,
  unique (user_id, code)
);
create index game_results_user_played_idx on public.game_results (user_id, played_at desc);

-- Friend requests: requester -> addressee; accepted flips status. One row per pair direction.
create table public.friendships (
  requester uuid not null references public.profiles(id) on delete cascade,
  addressee uuid not null references public.profiles(id) on delete cascade,
  status text not null check (status in ('pending', 'accepted')),
  created_at timestamptz not null default now(),
  primary key (requester, addressee),
  check (requester <> addressee)
);
create index friendships_addressee_idx on public.friendships (addressee);

-- RLS on, no policies: the server (service role) is the only writer and reader.
alter table public.profiles enable row level security;
alter table public.game_results enable row level security;
alter table public.friendships enable row level security;
