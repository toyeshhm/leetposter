create table public.rooms (
  code text primary key,
  state jsonb not null,
  version integer not null default 0,
  updated_at timestamptz not null default now()
);
-- RLS on with no policies: only the service-role key (server-side) can touch rooms.
alter table public.rooms enable row level security;
create index rooms_updated_at_idx on public.rooms (updated_at);
