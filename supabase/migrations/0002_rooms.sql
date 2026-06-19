-- 채팅방 + 참여자 + 메시지 (Arch B: 방을 Supabase 에 영속화).
-- 참여자는 정규화 테이블 room_members 로(사람/캐릭터 한 테이블, 판별 컬럼).
-- Supabase 대시보드 > SQL Editor 에서 1회 실행.

create table if not exists public.rooms (
  id            uuid primary key default gen_random_uuid(),
  type          text not null check (type in ('direct', 'group')),
  name          text not null,
  owner_address text not null, -- 방 생성자
  created_at    timestamptz not null default now()
);

create table if not exists public.room_members (
  room_id       uuid not null references public.rooms(id) on delete cascade,
  member_type   text not null check (member_type in ('user', 'character')),
  member_id     text not null,  -- user: 지갑주소 / character: 캐릭터 id
  owner_address text,           -- character 를 데려온 사람(user 는 null)
  joined_at     timestamptz not null default now(),
  primary key (room_id, member_type, member_id)
);
create index if not exists room_members_member_idx
  on public.room_members (member_type, member_id);

create table if not exists public.chats (
  id          uuid primary key default gen_random_uuid(),
  room_id     uuid not null references public.rooms(id) on delete cascade,
  sender_type text not null check (sender_type in ('user', 'character')),
  sender_id   text not null,
  text        text not null,
  turn_id     text,  -- AI 한 턴이 여러 말풍선이면 묶는 용도
  created_at  timestamptz not null default now()
);
create index if not exists chats_room_idx on public.chats (room_id, created_at);

-- RLS: friendships 와 동일하게 anon 허용(데모). 운영 전 서버 API + 지갑서명으로 강화.
alter table public.rooms enable row level security;
alter table public.room_members enable row level security;
alter table public.chats enable row level security;
create policy rooms_rw on public.rooms for all using (true) with check (true);
create policy room_members_rw on public.room_members for all using (true) with check (true);
create policy chats_rw on public.chats for all using (true) with check (true);
