-- characters 테이블 쓰기 정책 (생성/수정/삭제).
-- 이미 RLS 켜져 있고 SELECT 는 되지만 INSERT/UPDATE/DELETE 가 막혀 있어 추가한다.
-- 역할(anon, authenticated) 명시 + 테이블 권한 grant 까지(권한 누락 대비).
-- friendships/rooms 와 동일한 데모용 permissive. 운영 전 서버 API + 지갑서명으로 강화.
-- Supabase 대시보드 > SQL Editor 에서 1회 실행.

alter table public.characters enable row level security;

drop policy if exists characters_insert on public.characters;
drop policy if exists characters_update on public.characters;
drop policy if exists characters_delete on public.characters;

create policy characters_insert on public.characters
  for insert to anon, authenticated with check (true);
create policy characters_update on public.characters
  for update to anon, authenticated using (true) with check (true);
create policy characters_delete on public.characters
  for delete to anon, authenticated using (true);

grant insert, update, delete on public.characters to anon, authenticated;
