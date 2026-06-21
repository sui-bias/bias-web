-- 구독을 NFT 멤버십 패스로 전환하면서 subscriptions 테이블 보강.
-- ⚠️ 표시 캐시일 뿐, plan 의 진짜 소스는 온체인 MembershipPass 소유다.
-- 이미 만든 공용 Supabase 에 그대로 복붙 실행하면 된다(기존 행 보존).

-- 1) 만료 캐시 컬럼 추가
alter table public.subscriptions
  add column if not exists expires_at timestamptz;

-- 2) status 에 'sold'(판매로 이관됨) 허용
alter table public.subscriptions
  drop constraint if exists subscriptions_status_check;
alter table public.subscriptions
  add constraint subscriptions_status_check
  check (status in ('active','cancelled','expired','sold'));
