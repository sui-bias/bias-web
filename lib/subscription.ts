import { Transaction } from "@mysten/sui/transactions"
import type { SuiObjectChange } from "@mysten/sui/jsonRpc"
import { PaidPlan, PLANS } from "./plans"

// 배포 후 환경변수로 주입. PKG = publish 결과 packageId, CONFIG = create_config 로
// 만든 공유 Config 객체 id.
export const SUBSCRIPTION_PKG = process.env.NEXT_PUBLIC_SUBSCRIPTION_PKG ?? ""
export const CONFIG_ID = process.env.NEXT_PUBLIC_SUBSCRIPTION_CONFIG ?? ""

// 온체인 struct 풀네임(이벤트/소유객체 필터에 사용).
export const PASS_TYPE = `${SUBSCRIPTION_PKG}::subscription::MembershipPass`
export const LISTING_TYPE = `${SUBSCRIPTION_PKG}::subscription::Listing`

// 데모는 SUI 로 결제. USDC 전환 시 COIN_TYPE 교체 + USDC coin 선택 로직 추가.
export const COIN_TYPE = "0x2::sui::SUI"
const CLOCK_ID = "0x6"

// 데모 결제 금액(MIST, 1 SUI = 1e9). 화면 표시 가격(원화)은 plans.ts 의 priceLabel 사용.
// 온체인 Config 의 *_price 와 반드시 일치시켜 배포해야 한다(create_config 인자).
export const PRICE_MIST: Record<PaidPlan, bigint> = {
  plus: 100_000_000n, // 0.1 SUI
  pro: 250_000_000n, // 0.25 SUI
  max: 500_000_000n, // 0.5 SUI
}

export const SubscriptionConfigured = Boolean(SUBSCRIPTION_PKG && CONFIG_ID)

/** 구독 시작(1차 발급) 트랜잭션. gas 코인에서 결제분 분리(SUI 기준). */
export function buildMintTx(plan: PaidPlan): Transaction {
  const tx = new Transaction()
  const [coin] = tx.splitCoins(tx.gas, [PRICE_MIST[plan]])
  tx.moveCall({
    target: `${SUBSCRIPTION_PKG}::subscription::mint`,
    arguments: [
      tx.object(CONFIG_ID),
      tx.pure.u8(PLANS[plan].tier),
      coin,
      tx.object(CLOCK_ID),
    ],
  })
  return tx
}

/** 갱신(만료 연장) 트랜잭션. 보유한 passId 의 expires_ms 를 in-place 연장. */
export function buildRenewTx(passId: string, plan: PaidPlan): Transaction {
  const tx = new Transaction()
  const [coin] = tx.splitCoins(tx.gas, [PRICE_MIST[plan]])
  tx.moveCall({
    target: `${SUBSCRIPTION_PKG}::subscription::renew`,
    arguments: [
      tx.object(CONFIG_ID),
      tx.object(passId),
      coin,
      tx.object(CLOCK_ID),
    ],
  })
  return tx
}

/** 업그레이드(tier 상향) 트랜잭션. 차액만 결제, 기존 Pass 소각 후 상위 tier 재발급. */
export function buildUpgradeTx(
  passId: string,
  fromPlan: PaidPlan,
  toPlan: PaidPlan
): Transaction {
  const tx = new Transaction()
  const diff = PRICE_MIST[toPlan] - PRICE_MIST[fromPlan]
  const [coin] = tx.splitCoins(tx.gas, [diff])
  tx.moveCall({
    target: `${SUBSCRIPTION_PKG}::subscription::upgrade`,
    arguments: [
      tx.object(CONFIG_ID),
      tx.object(passId),
      tx.pure.u8(PLANS[toPlan].tier),
      coin,
    ],
  })
  return tx
}

/** 마켓 판매 등록. priceMist 가격으로 Pass 를 에스크로 Listing 으로 래핑. */
export function buildListTx(passId: string, priceMist: bigint): Transaction {
  const tx = new Transaction()
  tx.moveCall({
    target: `${SUBSCRIPTION_PKG}::subscription::list_pass`,
    arguments: [tx.object(passId), tx.pure.u64(priceMist)],
  })
  return tx
}

/** 마켓 구매. listingId 의 Pass 를 priceMist 결제하고 인수. */
export function buildBuyTx(listingId: string, priceMist: bigint): Transaction {
  const tx = new Transaction()
  const [coin] = tx.splitCoins(tx.gas, [priceMist])
  tx.moveCall({
    target: `${SUBSCRIPTION_PKG}::subscription::buy_pass`,
    arguments: [tx.object(listingId), coin],
  })
  return tx
}

/** 마켓 등록 취소(판매자 회수). */
export function buildDelistTx(listingId: string): Transaction {
  const tx = new Transaction()
  tx.moveCall({
    target: `${SUBSCRIPTION_PKG}::subscription::delist`,
    arguments: [tx.object(listingId)],
  })
  return tx
}

/** 트랜잭션 objectChanges 에서 새로 생성된 Pass 객체 ID 추출(mint/upgrade 후). */
export function extractPassId(
  changes: SuiObjectChange[] | null | undefined
): string | null {
  if (!changes) return null
  const created = changes.find(
    (c) => c.type === "created" && c.objectType.includes("::subscription::MembershipPass")
  )
  return created && created.type === "created" ? created.objectId : null
}
