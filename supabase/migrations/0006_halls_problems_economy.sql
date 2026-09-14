-- Spectators: a host may list a hall on the public board.
alter table public.rooms add column listed boolean not null default false;
create index rooms_listed_updated_idx on public.rooms (listed, updated_at desc);

-- Live problem ratings for the bank (authored rating moves with real hall results).
create table public.problem_stats (
  problem_id text primary key,
  rating integer not null,
  attempts integer not null default 0,
  solves integer not null default 0,
  updated_at timestamptz not null default now()
);

-- Cosmetics and currency.
create table public.items (
  id text primary key,
  kind text not null check (kind in ('avatar', 'frame', 'title', 'theme', 'caret', 'badge', 'emote')),
  name text not null,
  description text not null default '',
  rarity text not null check (rarity in ('common', 'uncommon', 'rare', 'epic', 'legendary')),
  price_candles integer,
  season_id text,
  tier integer,
  created_at timestamptz not null default now()
);
create table public.wallets (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  candles integer not null default 0,
  xp integer not null default 0,
  updated_at timestamptz not null default now()
);
create table public.inventory (
  user_id uuid not null references public.profiles(id) on delete cascade,
  item_id text not null references public.items(id) on delete cascade,
  source text not null check (source in ('store', 'pass', 'quest', 'achievement', 'grant')),
  acquired_at timestamptz not null default now(),
  primary key (user_id, item_id)
);
create table public.loadouts (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  avatar text references public.items(id),
  frame text references public.items(id),
  title text references public.items(id),
  theme text references public.items(id),
  caret text references public.items(id),
  badge text references public.items(id),
  updated_at timestamptz not null default now()
);

-- Battle pass: one season per month, tiers as JSON [{tier, xp, free: item_id|null, paid: item_id|null}].
create table public.seasons (
  id text primary key,
  name text not null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  tiers jsonb not null
);
create table public.pass_progress (
  user_id uuid not null references public.profiles(id) on delete cascade,
  season_id text not null references public.seasons(id) on delete cascade,
  xp integer not null default 0,
  paid boolean not null default false,
  claimed integer[] not null default '{}',
  primary key (user_id, season_id)
);

-- Quests: definitions are code (src/server/economy/quests.ts); progress per period lives here.
create table public.quest_progress (
  user_id uuid not null references public.profiles(id) on delete cascade,
  quest_id text not null,
  period text not null,
  progress integer not null default 0,
  claimed boolean not null default false,
  updated_at timestamptz not null default now(),
  primary key (user_id, quest_id, period)
);

-- Real-money purchases (Stripe Checkout); status flips to paid by the webhook.
create table public.purchases (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  kind text not null check (kind in ('pass', 'candles')),
  season_id text,
  stripe_session_id text unique,
  amount_cents integer not null,
  status text not null check (status in ('pending', 'paid', 'failed')),
  created_at timestamptz not null default now()
);

alter table public.problem_stats enable row level security;
alter table public.items enable row level security;
alter table public.wallets enable row level security;
alter table public.inventory enable row level security;
alter table public.loadouts enable row level security;
alter table public.seasons enable row level security;
alter table public.pass_progress enable row level security;
alter table public.quest_progress enable row level security;
alter table public.purchases enable row level security;
grant select, insert, update, delete on all tables in schema public to service_role;
