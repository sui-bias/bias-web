-- characters 테이블 쓰기 정책 (생성/수정/삭제).
-- 이미 RLS 켜져 있고 SELECT 는 되지만 INSERT/UPDATE/DELETE 가 막혀 있어 추가한다.
-- friendships/rooms 와 동일하게 데모용 permissive. 운영 전 서버 API + 지갑서명으로 강화.
-- Supabase 대시보드 > SQL Editor 에서 1회 실행.

drop policy if exists characters_insert on public.characters;
drop policy if exists characters_update on public.characters;
drop policy if exists characters_delete on public.characters;

create policy characters_insert on public.characters
  for insert with check (true);
create policy characters_update on public.characters
  for update using (true) with check (true);
create policy characters_delete on public.characters
  for delete using (true);
