-- Local `supabase db reset` creates tables without the service_role grants the hosted project
-- applies by default, so state them explicitly. RLS with no policies still closes anon/authenticated.
grant select, insert, update, delete on all tables in schema public to service_role;
alter default privileges in schema public grant select, insert, update, delete on tables to service_role;
