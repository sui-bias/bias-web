-- ============================================================================
--  Bias · users (auth / 회원가입·프로필)  — mainnet 데모용 스키마
-- ----------------------------------------------------------------------------
--  • 1행 = 1계정. PK는 Sui 지갑 주소(= 로그인 식별자, 별도 비밀번호 없음).
--  • Supabase 대시보드 > SQL Editor 에 붙여넣고 실행.
--  • ⚠️ 새 DB 기준 1회 실행용. 이미 테이블이 있으면 제약이 반영되지 않으니
--    아래 `drop table` 두 줄의 주석을 풀고 재실행할 것(데이터 초기화됨).
--  • 앱 코드(lib/users.ts UserRow / saveProfile / getUser)와 컬럼·값이 1:1.
--    enum 후보값을 바꾸려면 앱 상수(app/onboarding/profile/page.tsx)와
--    아래 CHECK 제약을 함께 수정해야 한다.
-- ============================================================================

-- drop table if exists public.subscriptions cascade;
-- drop table if exists public.users         cascade;

-- ── users ───────────────────────────────────────────────────────────────────
create table if not exists public.users (
  -- Sui 지갑 주소 = 계정 식별자. dapp-kit이 주는 정규화 주소(0x + 64 hex).
  address             text        primary key
                      constraint users_address_format
                      check (address ~ '^0x[0-9a-fA-F]{64}$'),

  -- 화면 표시명. 앱 입력 maxLength 20.
  display_name        text        not null
                      constraint users_display_name_len
                      check (char_length(btrim(display_name)) between 1 and 20),

  -- @username. 영문/숫자/언더스코어만, 1~20자. 대소문자 무시 유니크(아래 인덱스).
  username            text        not null
                      constraint users_username_format
                      check (username ~ '^[A-Za-z0-9_]{1,20}$'),

  -- 선호 장르(다중 선택). 앱 상수 집합의 부분집합, 최대 10개.
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

  -- 필수 동의(개인정보). 가입 완료 조건이므로 DB에서도 true 만 허용.
  agree_privacy       boolean     not null default false
                      constraint users_privacy_required
                      check (agree_privacy = true),
  -- 선택 동의(마케팅).
  agree_marketing     boolean     not null default false,

  onboarding_complete boolean     not null default false,

  -- 결제 플랜. users 기준 조회(useCurrentUser)는 auth 소관이지만,
  -- 값 갱신은 결제 흐름(lib/users.ts setSubscription)이 담당.
  plan                text        not null default 'free'
                      constraint users_plan_allowed
                      check (plan in ('free','plus','pro','max')),

  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

-- 대소문자 무시 유니크: 'Leon' 과 'leon' 중복 가입 차단 + username 조회 가속.
create unique index if not exists users_username_lower_key
  on public.users (lower(username));

-- 최신 가입자 정렬/조회용.
create index if not exists users_created_at_idx
  on public.users (created_at desc);

-- updated_at 자동 갱신 트리거.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists users_set_updated_at on public.users;
create trigger users_set_updated_at
  before update on public.users
  for each row execute function public.set_updated_at();

-- 공유 DB 문서화(대시보드에서 컬럼 설명으로 보임).
comment on table  public.users               is 'Bias 계정 1행=1유저. PK=Sui 지갑 주소.';
comment on column public.users.address       is 'Sui 지갑 주소(0x+64hex). 로그인 식별자.';
comment on column public.users.username      is '@핸들. 영문/숫자/_ 1~20자, 대소문자 무시 유니크.';
comment on column public.users.plan          is 'free|plus|pro|max. 값 갱신은 결제 흐름 담당.';
comment on column public.users.updated_at    is '트리거로 자동 갱신.';

-- ── RLS (Row Level Security) ────────────────────────────────────────────────
-- ⚠️ 보안 한계 명시:
--   현재 앱은 클라이언트에서 anon key 로 직접 read/write 한다. RLS에는
--   "요청자가 이 지갑 주소의 소유자인가"를 검증할 컨텍스트(auth.uid 등)가 없다.
--   따라서 아래 정책은 '데모에서 동작'을 보장할 뿐, 소유권을 강제하지 못한다.
--   → 주소만 알면 타인 프로필 수정이 가능(=진짜 auth 아님).
--
--   [프로덕션 강화 경로] 클라이언트 직접 쓰기를 막고, 지갑 서명을 검증하는
--   Edge Function / RPC 를 두어 service_role 로만 insert/update 하게 한 뒤,
--   아래 insert/update 정책을 `to authenticated` + 소유자 조건으로 교체한다.
alter table public.users enable row level security;

drop policy if exists "users_select_public" on public.users;
drop policy if exists "users_demo_insert"   on public.users;
drop policy if exists "users_demo_update"   on public.users;

-- 프로필은 공개 정보로 간주(앱이 임의 주소를 조회). 읽기 허용.
create policy "users_select_public" on public.users
  for select using (true);

-- 데모: anon 가입/수정 허용. (강화 시 to authenticated + 소유자 조건으로 교체)
create policy "users_demo_insert" on public.users
  for insert with check (true);
create policy "users_demo_update" on public.users
  for update using (true) with check (true);


-- ============================================================================
--  subscriptions (결제) — auth 소관 아님. 온체인 MembershipPass NFT 와 1:1.
--  ⚠️ 표시 캐시일 뿐, plan 의 진짜 소스는 온체인 Pass 소유다(NFT 양도 시 stale).
--  결제 담당자가 관리. users(address) FK 로만 연결.
-- ============================================================================
create table if not exists public.subscriptions (
  object_id   text        primary key,                    -- 온체인 MembershipPass NFT id
  address     text        not null references public.users(address) on delete cascade,
  plan        text        not null check (plan in ('plus','pro','max')),
  status      text        not null default 'active'
              check (status in ('active','cancelled','expired','sold')),
  expires_at  timestamptz,                                -- 온체인 expires_ms 캐시
  created_at  timestamptz not null default now()
);
create index if not exists subscriptions_address_idx on public.subscriptions(address);

alter table public.subscriptions enable row level security;
drop policy if exists "subs_demo_all" on public.subscriptions;
create policy "subs_demo_all" on public.subscriptions
  for all using (true) with check (true);
