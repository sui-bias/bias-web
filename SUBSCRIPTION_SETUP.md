# 구독(스트림 결제) 셋업 & 배포 가이드

스트림 정기결제(Move) + 프론트 결제/플랜 게이팅을 mainnet에서 동작시키는 절차.

## 구조

```
유저 ─subscribe(SUI 예치)→ Subscription<SUI> (공유 객체, 스트림)
                                │  시간(Clock 0x6)에 비례해 vest
서비스 ─claim(AdminCap)──────────┘→ Treasury<SUI>
유저 ─cancel──→ 미사용분 환불 + plan=free 강등
```

- 컨트랙트: `move/bias_subscription/`
- 프론트 결제: `lib/subscription.ts` (tx 빌더), `app/(tabs)/mypage/page.tsx` (UI)
- 플랜 게이팅: `lib/plans.ts`, `hooks/use-current-user.ts`, `app/(tabs)/character/create/page.tsx`
- 권한 반영: 결제/취소 성공 시 `lib/users.ts` 가 Supabase `users.plan` + `subscriptions` 갱신

## 1. 컨트랙트 배포 (mainnet)

Sui CLI 필요. (`sui` 설치 후 `sui client` 가 mainnet 가리키는지 확인)

```bash
cd move/bias_subscription
sui move build                         # 컴파일 확인
sui client publish --gas-budget 200000000
```

publish 출력에서 두 가지를 기록:
- **packageId** (Published Objects)
- **AdminCap** 객체 ID (Created Objects, owner = 본인)

## 2. Treasury 생성 (코인 타입별 1회)

데모는 SUI로 결제하므로 SUI Treasury를 만든다.

```bash
sui client call \
  --package <PACKAGE_ID> \
  --module subscription \
  --function create_treasury \
  --type-args 0x2::sui::SUI \
  --args <ADMIN_CAP_ID> \
  --gas-budget 50000000
```

출력의 **Treasury 공유 객체 ID**(Shared)를 기록.

## 3. 환경변수

`.env.local` 에 추가:

```
NEXT_PUBLIC_SUBSCRIPTION_PKG=<PACKAGE_ID>
NEXT_PUBLIC_SUBSCRIPTION_TREASURY=<TREASURY_ID>
```

## 4. DB 갱신

`supabase/schema.sql` 를 다시 실행하면 `users.plan` 컬럼과 `subscriptions` 테이블이 추가된다.
(이미 users 테이블이 있으면 아래만 실행해도 됨)

```sql
alter table public.users add column if not exists plan text not null default 'free';
-- 그리고 schema.sql 의 subscriptions 테이블/정책 블록 실행
```

## 5. 동작 확인 (데모 시나리오)

1. `npm run dev` → 지갑 연결 → My 탭
2. Free 상태에서 Create 탭 → 캐릭터 생성 잠김 + "플랜 업그레이드" 안내 확인
3. My 탭 → Plus **구독하기** → Slush 서명 → 트랜잭션 성공
4. My 탭 현재 플랜이 Plus로 바뀌고, Create 탭 잠금 해제 확인
5. **구독 취소** → 미사용분 환불 트랜잭션 → 다시 Free로 강등 확인

온체인 확인: Sui 익스플로러에서 packageId의 `SubscriptionCreated` / `Cancelled` 이벤트와
Treasury 잔액 변화를 볼 수 있다.

## 설계 메모 / 결정사항

- **결제 통화**: 데모는 SUI(`COIN_TYPE`). 프로덕션은 `lib/subscription.ts` 의 `COIN_TYPE`을
  USDC 타입으로 바꾸고, gas 분리 대신 보유 USDC 코인을 선택하는 로직을 추가하면 된다.
  컨트랙트는 제네릭(`<T>`)이라 재배포 불필요(해당 코인 Treasury만 추가 생성).
- **청구 주기**: 데모 `DURATION_MS = 1일`(스트리밍 관찰용). 프로덕션은 30일로.
- **claim 주체**: 데모는 만료/취소 시점 정산(lazy)만으로 충분. 정기 청구가 필요하면
  AdminCap을 가진 백엔드 스케줄러가 `claim` 을 주기 호출.
- **권한 동기화**: 현재는 프론트가 결제 성공 직후 Supabase를 낙관적 갱신한다.
  견고하게 하려면 `SubscriptionCreated/Cancelled/Expired` 이벤트를 백엔드 인덱서가 구독해
  `users.plan` 을 확정하도록 보강.

## ⚠️ 검증 메모

이 환경(샌드박스)은 npm 레지스트리 접근이 막혀 `sui move build` / `next build` 를 실행하지 못했다.
로컬에서 `sui move build` 와 `npm run build` 로 최종 컴파일 확인 권장.
Move 에디션 경고 시 `Move.toml` 의 `edition` 을 `"2024"` 로 조정.
