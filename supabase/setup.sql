-- ============================================================================
--  Bias · DB 셋업 (복붙 전용) — Supabase 대시보드 > SQL Editor 에 통째로 붙여넣고 Run
-- ----------------------------------------------------------------------------
--  ⚠️ drop-후-재생성이라 실행 시 users/subscriptions 데이터가 초기화된다.
--     (초기 셋업 / 스키마 갱신용. 데이터가 쌓인 뒤에는 함부로 재실행 금지.)
--  정식 정의·주석 버전은 schema.sql 참고. 이 파일은 셋업 편의용.
-- ============================================================================

drop table if exists public.subscriptions cascade;
drop table if exists public.users         cascade;

-- ── users (auth) ────────────────────────────────────────────────────────────
create table public.users (
  address             text        primary key
                      constraint users_address_format
                      check (address ~ '^0x[0-9a-fA-F]{64}$'),
  display_name        text        not null
                      constraint users_display_name_len
                      check (char_length(btrim(display_name)) between 1 and 20),
  username            text        not null
                      constraint users_username_format
                      check (username ~ '^[A-Za-z0-9_]{1,20}$'),
  genres              text[]      not null default '{}'
                      constraint users_genres_allowed
                      check (
                        genres <@ array[
                          'Romance','Fantasy','School','Slice of Life','Idol/Ent',
                          'Gaming','Sports','Mystery','Healing','Other'
                        ]::text[]
                        and cardinality(genres) <= 10
                      ),
  language            text        not null default 'en'
                      constraint users_language_allowed
                      check (language in ('en','kr')),
  age_group           text        not null
                      constraint users_age_group_allowed
                      check (age_group in ('Teens','20s','30s','40s+')),
  visibility          text        not null default 'public'
                      constraint users_visibility_allowed
                      check (visibility in ('public','followers','private')),
  agree_privacy       boolean     not null default false
                      constraint users_privacy_required
                      check (agree_privacy = true),
  agree_marketing     boolean     not null default false,
  onboarding_complete boolean     not null default false,
  plan                text        not null default 'free'
                      constraint users_plan_allowed
                      check (plan in ('free','plus','pro','max')),
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create unique index users_username_lower_key on public.users (lower(username));
create index        users_created_at_idx     on public.users (created_at desc);

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger users_set_updated_at
  before update on public.users
  for each row execute function public.set_updated_at();

alter table public.users enable row level security;
create policy "users_select_public" on public.users for select using (true);
create policy "users_demo_insert"   on public.users for insert with check (true);
create policy "users_demo_update"   on public.users for update using (true) with check (true);

-- ── subscriptions (결제, FK only) ────────────────────────────────────────────
create table public.subscriptions (
  object_id   text        primary key,
  address     text        not null references public.users(address) on delete cascade,
  plan        text        not null check (plan in ('plus','pro','max')),
  status      text        not null default 'active'
              check (status in ('active','cancelled','expired')),
  created_at  timestamptz not null default now()
);
create index subscriptions_address_idx on public.subscriptions(address);

alter table public.subscriptions enable row level security;
create policy "subs_demo_all" on public.subscriptions for all using (true) with check (true);
