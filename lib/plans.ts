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
    features: ["공개 캐릭터 1:1 채팅", "짧은 기억 retention", "캐릭터 생성 불가"],
    available: false,
  },
  plus: {
    id: "plus",
    name: "Plus",
    tier: 1,
    priceKrw: 9900,
    priceLabel: "₩9,900/월",
    characterLimit: 2,
    features: ["1:1 장기 기억 확장", "캐릭터 생성 최대 2개"],
    available: true, // 현재 유일하게 구매 가능
  },
  pro: {
    id: "pro",
    name: "Pro",
    tier: 2,
    priceKrw: 25900,
    priceLabel: "₩25,900/월",
    characterLimit: 5,
    features: ["높은 토큰/기억 한도", "캐릭터 생성 최대 5개", "캐릭터 간 관계 기억"],
    available: false, // 추후 공개
  },
  max: {
    id: "max",
    name: "Max",
    tier: 3,
    priceKrw: 59000,
    priceLabel: "₩59,000/월",
    characterLimit: 10,
    features: ["최고 기억 한도", "캐릭터 생성 최대 10개", "유저 간 맥락 일부 기억"],
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
      reason: "캐릭터 생성은 Plus 플랜부터 가능해요",
    }
  }
  if (count >= limit) {
    return {
      allowed: false,
      reason: `${PLANS[plan].name} 플랜은 캐릭터 ${limit}개까지 만들 수 있어요`,
    }
  }
  return { allowed: true }
}
