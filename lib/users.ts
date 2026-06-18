import { supabase } from "./supabase"
import { Plan } from "./plans"

// users 테이블 1행 = 한 계정. PK는 Sui 지갑 주소.
export interface UserRow {
  address: string
  display_name: string
  username: string
  genres: string[]
  language: "en" | "kr"
  age_group: string
  visibility: "public" | "followers" | "private"
  agree_privacy: boolean
  agree_marketing: boolean
  onboarding_complete: boolean
  plan?: Plan // DB 기본값 'free'
  created_at?: string
}

export interface SubscriptionRow {
  object_id: string
  address: string
  plan: Plan
  status: "active" | "cancelled" | "expired"
}

export type ProfileInput = Omit<
  UserRow,
  "address" | "created_at" | "onboarding_complete"
>

/** 주소로 기존 유저 조회. 없으면 null. */
export async function getUser(address: string): Promise<UserRow | null> {
  const { data, error } = await supabase
    .from("users")
    .select("*")
    .eq("address", address)
    .maybeSingle()

  if (error) {
    console.error("[users] getUser error:", error.message)
    return null
  }
  return (data as UserRow) ?? null
}

/** 회원가입/프로필 저장. 주소 기준 upsert 후 onboarding 완료 표시. */
export async function saveProfile(
  address: string,
  profile: ProfileInput
): Promise<UserRow | null> {
  const row: UserRow = {
    address,
    onboarding_complete: true,
    ...profile,
  }

  const { data, error } = await supabase
    .from("users")
    .upsert(row, { onConflict: "address" })
    .select()
    .single()

  if (error) {
    console.error("[users] saveProfile error:", error.message)
    throw new Error(error.message)
  }
  return data as UserRow
}

/** 구독 성공 반영: users.plan 갱신 + subscriptions upsert. */
export async function setSubscription(
  address: string,
  plan: Plan,
  subscriptionObjectId: string
): Promise<void> {
  const { error: e1 } = await supabase
    .from("users")
    .update({ plan })
    .eq("address", address)
  if (e1) throw new Error(e1.message)

  const { error: e2 } = await supabase.from("subscriptions").upsert(
    { object_id: subscriptionObjectId, address, plan, status: "active" },
    { onConflict: "object_id" }
  )
  if (e2) throw new Error(e2.message)
}

/** 구독 취소 반영: plan=free 강등 + subscriptions status=cancelled. */
export async function endSubscription(
  address: string,
  subscriptionObjectId: string
): Promise<void> {
  await supabase.from("users").update({ plan: "free" }).eq("address", address)
  await supabase
    .from("subscriptions")
    .update({ status: "cancelled" })
    .eq("object_id", subscriptionObjectId)
}

/** 현재 활성 구독 1건 조회. */
export async function getActiveSubscription(
  address: string
): Promise<SubscriptionRow | null> {
  const { data, error } = await supabase
    .from("subscriptions")
    .select("*")
    .eq("address", address)
    .eq("status", "active")
    .maybeSingle()
  if (error) {
    console.error("[users] getActiveSubscription error:", error.message)
    return null
  }
  return (data as SubscriptionRow) ?? null
}
