import { supabase } from "./supabase"
import { Plan } from "./plans"
import type { MemwalStep } from "./types"

// users 테이블 1행 = 한 계정. PK는 Sui 지갑 주소.
export interface UserRow {
  address: string
  display_name: string
  image_url?: string | null
  username: string
  genres: string[]
  language: "en" | "kr"
  age_group: string
  visibility: "public" | "followers" | "private"
  agree_privacy: boolean
  agree_marketing: boolean
  onboarding_complete: boolean
  plan?: Plan // DB 기본값 'free'
  memwal_step?: MemwalStep
  memwal_account_id?: string
  memwal_delegate_pubkey?: string
  seal_delegate_pubkey?: string
  memwal_error?: string | null
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
  | "address"
  | "created_at"
  | "onboarding_complete"
  | "memwal_step"
  | "memwal_account_id"
  | "memwal_delegate_pubkey"
  | "seal_delegate_pubkey"
  | "memwal_error"
>

/** username 사용 가능 여부 확인. excludeAddress가 있으면 본인 주소는 제외한다. */
export async function isUsernameAvailable(
  username: string,
  excludeAddress?: string
): Promise<boolean> {
  const normalized = username.trim()
  if (!normalized) return false

  let query = supabase.from("users").select("address").eq("username", normalized)
  if (excludeAddress) {
    query = query.neq("address", excludeAddress)
  }

  const { data, error } = await query.limit(1).maybeSingle()
  if (error) {
    console.error("[users] isUsernameAvailable error:", error.message)
    throw new Error(error.message)
  }
  return !data
}

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

export async function updateMemwalState(
  address: string,
  state: Pick<
    UserRow,
    | "memwal_step"
    | "memwal_account_id"
    | "memwal_delegate_pubkey"
    | "seal_delegate_pubkey"
    | "memwal_error"
  >
): Promise<UserRow> {
  const { data, error } = await supabase
    .from("users")
    .update(state)
    .eq("address", address)
    .select("*")
    .single()

  if (error || !data) {
    throw new Error(error?.message ?? "failed to update memwal state")
  }
  return data as UserRow
}

/** 회원가입/프로필 저장. 주소 기준 upsert 후 onboarding 완료 표시. */
export async function saveProfile(
  address: string,
  profile: ProfileInput
): Promise<UserRow | null> {
  const { data: usernameMatches, error: usernameCheckError } = await supabase
    .from("users")
    .select("address")
    .eq("username", profile.username)
    .neq("address", address)
    .limit(1)

  if (usernameCheckError) {
    console.error("[users] username check error:", usernameCheckError.message)
    throw new Error(usernameCheckError.message)
  }

  if (usernameMatches && usernameMatches.length > 0) {
    throw new Error("USERNAME_TAKEN")
  }

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
    if (error.code === "23505") {
      throw new Error("USERNAME_TAKEN")
    }
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
