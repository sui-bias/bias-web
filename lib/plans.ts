// Bias 요금제 정의 (docs/bm.md 기준)

export type Plan = "free" | "plus" | "pro" | "max"

export interface PlanDef {
  id: Plan
  name: string
  tier: number // 0=free, 1=plus, 2=pro, 3=max (온체인 tier)
  priceKrw: number
  priceLabel: string
  characterLimit: number
  features: string[]
  available: boolean // 지금 구매 가능한가. false = "추후 공개"
}

export const PLANS: Record<Plan, PlanDef> = {
  free: {
    id: "free",
    name: "Free",
    tier: 0,
    priceKrw: 0,
    priceLabel: "₩0",
    characterLimit: 0,
    features: ["1:1 chat with public characters", "Short memory retention", "No character creation"],
    available: false,
  },
  plus: {
    id: "plus",
    name: "Plus",
    tier: 1,
    priceKrw: 9900,
    priceLabel: "₩9,900/mo",
    characterLimit: 2,
    features: ["Extended 1:1 long-term memory", "Up to 2 characters"],
    available: true, // 현재 유일하게 구매 가능
  },
  pro: {
    id: "pro",
    name: "Pro",
    tier: 2,
    priceKrw: 25900,
    priceLabel: "₩25,900/mo",
    characterLimit: 5,
    features: ["Higher token/memory limits", "Up to 5 characters", "Cross-character relationship memory"],
    available: false, // 추후 공개
  },
  max: {
    id: "max",
    name: "Max",
    tier: 3,
    priceKrw: 59000,
    priceLabel: "₩59,000/mo",
    characterLimit: 10,
    features: ["Maximum memory limits", "Up to 10 characters", "Partial cross-user context memory"],
    available: false, // 추후 공개
  },
}

export type PaidPlan = Exclude<Plan, "free">
export const PAID_PLANS: PaidPlan[] = ["plus", "pro", "max"]

/** 현재 실제로 구매 가능한 플랜(나머지는 "추후 공개"). */
export const PURCHASABLE_PLANS: PaidPlan[] = PAID_PLANS.filter(
  (p) => PLANS[p].available
)

export function isPurchasable(plan: Plan): boolean {
  return PLANS[plan].available
}

export function planByTier(tier: number): Plan {
  return tier === 1 ? "plus" : tier === 2 ? "pro" : tier === 3 ? "max" : "free"
}

export function canCreateCharacter(plan: Plan): boolean {
  return PLANS[plan].characterLimit > 0
}

/** 캐릭터 생성 가능 여부 + 사유. count = 현재 보유 캐릭터 수. */
export function characterCreateGate(
  plan: Plan,
  count: number
): { allowed: boolean; reason?: string; needUpgrade?: boolean } {
  const limit = PLANS[plan].characterLimit
  if (limit <= 0) {
    return {
      allowed: false,
      needUpgrade: true,
      reason: "Character creation requires the Plus plan",
    }
  }
  if (count >= limit) {
    return {
      allowed: false,
      reason: `${PLANS[plan].name} plan allows up to ${limit} characters`,
    }
  }
  return { allowed: true }
}
