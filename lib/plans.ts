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
  },
  plus: {
    id: "plus",
    name: "Plus",
    tier: 1,
    priceKrw: 9900,
    priceLabel: "₩9,900/월",
    characterLimit: 2,
    features: ["1:1 장기 기억 확장", "캐릭터 생성 최대 2개"],
  },
  pro: {
    id: "pro",
    name: "Pro",
    tier: 2,
    priceKrw: 25900,
    priceLabel: "₩25,900/월",
    characterLimit: 5,
    features: ["높은 토큰/기억 한도", "캐릭터 생성 최대 5개", "캐릭터 간 관계 기억"],
  },
  max: {
    id: "max",
    name: "Max",
    tier: 3,
    priceKrw: 59000,
    priceLabel: "₩59,000/월",
    characterLimit: 10,
    features: ["최고 기억 한도", "캐릭터 생성 최대 10개", "유저 간 맥락 일부 기억"],
  },
}

export type PaidPlan = Exclude<Plan, "free">
export const PAID_PLANS: PaidPlan[] = ["plus", "pro", "max"]

export function planByTier(tier: number): Plan {
  return tier === 1 ? "plus" : tier === 2 ? "pro" : tier === 3 ? "max" : "free"
}

export function canCreateCharacter(plan: Plan): boolean {
  return PLANS[plan].characterLimit > 0
}
