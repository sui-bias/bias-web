import { Transaction } from "@mysten/sui/transactions"
import type { SuiObjectChange } from "@mysten/sui/jsonRpc"
import { PaidPlan, PLANS } from "./plans"

// 배포 후 환경변수로 주입.
export const SUBSCRIPTION_PKG = process.env.NEXT_PUBLIC_SUBSCRIPTION_PKG ?? ""
export const TREASURY_ID = process.env.NEXT_PUBLIC_SUBSCRIPTION_TREASURY ?? ""

// 데모는 SUI 로 결제. USDC 전환 시 COIN_TYPE 교체 + USDC coin 선택 로직 추가.
export const COIN_TYPE = "0x2::sui::SUI"
const CLOCK_ID = "0x6"

// 데모 결제 금액(MIST, 1 SUI = 1e9). 화면 표시 가격(원화)은 plans.ts 의 priceKrw 사용.
export const PRICE_MIST: Record<PaidPlan, bigint> = {
  plus: 500_000_000n, // 0.5 SUI
  pro: 1_000_000_000n, // 1 SUI
  max: 2_000_000_000n, // 2 SUI
}

// 데모 청구 주기: 1일 (스트리밍을 데모 중 관찰 가능). 프로덕션은 30일.
export const DURATION_MS = 24 * 60 * 60 * 1000

/** 구독 시작 트랜잭션 (gas 코인에서 결제분 분리 - SUI 기준). */
export function buildSubscribeTx(plan: PaidPlan): Transaction {
  const tx = new Transaction()
  const [coin] = tx.splitCoins(tx.gas, [PRICE_MIST[plan]])
  tx.moveCall({
    target: `${SUBSCRIPTION_PKG}::subscription::subscribe`,
    typeArguments: [COIN_TYPE],
    arguments: [
      tx.pure.u8(PLANS[plan].tier),
      coin,
      tx.pure.u64(DURATION_MS),
      tx.object(CLOCK_ID),
    ],
  })
  return tx
}

/** 구독 취소 트랜잭션 (미사용분 환불). */
export function buildCancelTx(subscriptionId: string): Transaction {
  const tx = new Transaction()
  tx.moveCall({
    target: `${SUBSCRIPTION_PKG}::subscription::cancel`,
    typeArguments: [COIN_TYPE],
    arguments: [
      tx.object(subscriptionId),
      tx.object(TREASURY_ID),
      tx.object(CLOCK_ID),
    ],
  })
  return tx
}

/** 트랜잭션 objectChanges 에서 생성된 Subscription 객체 ID 추출. */
export function extractSubscriptionId(
  changes: SuiObjectChange[] | null | undefined
): string | null {
  if (!changes) return null
  const created = changes.find(
    (c) => c.type === "created" && c.objectType.includes("::subscription::Subscription")
  )
  return created && created.type === "created" ? created.objectId : null
}
