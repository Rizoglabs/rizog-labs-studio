-- Product Registry V1.1 metadata and lifecycle.
-- Review against the hosted schema before applying.
-- Product operations remain behind rizogkey-admin; keep direct Data API access locked.
begin;

alter table public.products
  add column if not exists display_name text not null default '',
  add column if not exists brand text not null default 'RizogLabs',
  add column if not exists platform text not null default 'UNKNOWN',
  add column if not exists description text,
  add column if not exists current_version text,
  add column if not exists rizogkey_engine_version text,
  add column if not exists rizogkey_protocol_version text;

update public.products
set display_name = coalesce(nullif(btrim(display_name), ''), name),
    brand = coalesce(nullif(btrim(brand), ''), 'RizogLabs'),
    platform = coalesce(nullif(btrim(platform), ''), 'UNKNOWN')
where display_name is null or btrim(display_name) = ''
   or brand is null or btrim(brand) = ''
   or platform is null or btrim(platform) = '';

alter table public.products
  drop constraint if exists products_status_check;
alter table public.products
  add constraint products_status_check
  check (status = any (array['ACTIVE'::text, 'INACTIVE'::text, 'ARCHIVED'::text]));

alter table public.products
  drop constraint if exists products_platform_check;
alter table public.products
  add constraint products_platform_check
  check (platform = any (array['ANDROID'::text, 'IOS'::text, 'WEB'::text, 'DESKTOP'::text, 'UNKNOWN'::text]));

commit;
