-- Shared editor document: the latest full Yjs state as base64, written by the server on save.
alter table public.rooms add column doc text;
