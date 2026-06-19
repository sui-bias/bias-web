-- 친구 관계 테이블 (단방향 추가: 요청/수락 없음).
-- user_address 가 friend_address 를 친구로 추가한다. 내 친구 목록 = user_address = 나.
-- Supabase 대시보드 > SQL Editor 에서 1회 실행.

create table if not exists public.friendships (
  user_address   text not null,
  friend_address text not null,
  created_at     timestamptz not null default now(),
  primary key (user_address, friend_address),
  constraint no_self_friend check (user_address <> friend_address)
);

-- 조회 성능
create index if not exists friendships_user_idx on public.friendships (user_address);

-- RLS: 현재 클라이언트는 Supabase Auth 세션 없이 publishable(anon) 키로 접근하므로
-- (지갑 서명 인증은 Supabase 외부) auth.uid() 기반 정책을 쓸 수 없다.
-- users 테이블과 동일하게 anon 접근을 허용하되, 운영 단계에서는 쓰기를 API 라우트(서버 키)로
-- 옮기고 지갑 서명으로 본인 확인하도록 강화할 것. (TODO: 보안 강화)
alter table public.friendships enable row level security;

drop policy if exists friendships_rw on public.friendships;
create policy friendships_rw on public.friendships
  for all using (true) with check (true);
