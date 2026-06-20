# bias_subscription 배포 가이드 (NFT 멤버십 패스)

구독권을 `MembershipPass` NFT 로 발급하고, 내장 마켓으로 유저간 거래까지 하는 컨트랙트.
plan 검증은 "지갑이 보유한 미만료 Pass 중 최고 tier"를 **온체인 소유 조회**로 한다.

## 0. 사전 준비

```bash
# Sui CLI 설치 (미설치 시)
brew install sui            # 또는 https://docs.sui.io/guides/developer/getting-started/sui-install

sui client active-env       # testnet 인지 확인 (앱 .env.local: NEXT_PUBLIC_SUI_NETWORK=testnet)
sui client switch --env testnet
sui client faucet           # 가스용 테스트 SUI 받기
```

## 1. 빌드 & 배포

```bash
cd bias-web/move/bias_subscription
sui move build              # 컴파일 확인
sui client publish --gas-budget 200000000
```

publish 결과에서 다음 두 개를 기록한다:
- **packageId** (`Published Objects` 의 PackageID)
- **AdminCap** objectId (`Created Objects` 중 `...::subscription::AdminCap`, 배포자 지갑 소유)

## 2. Config 생성 (가격·기간 설정)

가격은 **반드시 `lib/subscription.ts` 의 `PRICE_MIST` 와 일치**시켜야 한다.
현재 값: plus=0.1 / pro=0.25 / max=0.5 SUI, 데모 기간 = 1일.

```bash
PKG=<packageId>
ADMIN=<AdminCap objectId>

sui client call \
  --package $PKG --module subscription --function create_config \
  --args $ADMIN 100000000 250000000 500000000 86400000 \
  --gas-budget 50000000
#            ▲plus      ▲pro      ▲max      ▲period_ms(1일)
# 프로덕션 30일: period_ms = 2592000000
```

결과 `Created Objects` 중 `...::subscription::Config` (shared) 의 objectId 를 기록 → **CONFIG_ID**.

## 3. 앱 환경변수 주입

`bias-web/.env.local`:

```
NEXT_PUBLIC_SUBSCRIPTION_PKG=<packageId>
NEXT_PUBLIC_SUBSCRIPTION_CONFIG=<Config objectId>
```

개발 서버 재시작 후 `/pricing` 에서 구독, `/market` 에서 거래 동작 확인.

## 4. (선택) 수익 출금

```bash
sui client call --package $PKG --module subscription --function withdraw \
  --args $ADMIN $CONFIG <amount_mist> --gas-budget 50000000
```

## 엔트리 함수 요약

| 함수 | 용도 | 결제 |
|---|---|---|
| `mint(config, tier, payment, clock)` | 1차 구독(Pass 발급) | tier 가격 |
| `renew(config, pass, payment, clock)` | 만료 연장(같은 NFT in-place, 안 쌓임) | tier 가격 |
| `upgrade(config, pass, new_tier, payment)` | tier 상향(old 소각+new 발급, 만료 이관) | 차액 |
| `list_pass(pass, price)` | 마켓 판매 등록(에스크로) | — |
| `buy_pass(listing, payment)` | 구매(SUI→판매자, NFT→구매자) | 등록가 |
| `delist(listing)` | 등록 취소(회수) | — |
| `withdraw(admin, config, amount)` | 운영 수익 출금 | — |

## 설계 메모
- `MembershipPass { tier, issued_ms, expires_ms }` — `key, store` 라 양도/거래 가능.
- `tier` 는 변경 entry 미노출(`upgrade` 제외) → **policy-level 불변**. 마켓 거래 신뢰 보장.
- `renew` 는 `expires_ms` 만 in-place 갱신 → 매달 NFT 가 쌓이지 않음.
- 마켓 등록 중에는 Pass 가 `Listing` 에스크로에 들어가 tier·만료가 freeze.
