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
  object_id: string // 온체인 MembershipPass NFT id
  address: string
  plan: Plan
  status: "active" | "cancelled" | "expired" | "sold"
  expires_at?: string | null
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

/** 프로필 편집(표시이름·닉네임·사진). username 중복 시 USERNAME_TAKEN throw. */
export async function updateProfile(
  address: string,
  fields: {
    display_name: string
    username: string
    image_url?: string | null
  }
): Promise<void> {
  const available = await isUsernameAvailable(fields.username, address)
  if (!available) throw new Error("USERNAME_TAKEN")

  const { error } = await supabase
    .from("users")
    .update({
      display_name: fields.display_name,
      username: fields.username,
      image_url: fields.image_url ?? null,
    })
    .eq("address", address)
  if (error) {
    if (error.code === "23505") throw new Error("USERNAME_TAKEN")
    throw new Error(error.message)
  }
}

/**
 * 구독 캐시 동기화: 온체인이 진짜 소스이고, 이건 표시 가속용 캐시일 뿐이다.
 * mint/renew/upgrade/buy 성공 후 호출해 users.plan + subscriptions 를 맞춘다.
 */
export async function cacheSubscription(
  address: string,
  plan: Plan,
  passObjectId: string,
  expiresMs?: number
): Promise<void> {
  const { error: e1 } = await supabase
    .from("users")
    .update({ plan })
    .eq("address", address)
  if (e1) throw new Error(e1.message)

  const { error: e2 } = await supabase.from("subscriptions").upsert(
    {
      object_id: passObjectId,
      address,
      plan,
      status: "active",
      expires_at: expiresMs ? new Date(expiresMs).toISOString() : null,
    },
    { onConflict: "object_id" }
  )
  if (e2) throw new Error(e2.message)
}

/** 판매/소각 등으로 Pass 가 떠난 경우 캐시 정리: plan=free + status 갱신. */
export async function clearSubscription(
  address: string,
  passObjectId: string,
  status: "cancelled" | "sold" | "expired" = "cancelled"
): Promise<void> {
  await supabase.from("users").update({ plan: "free" }).eq("address", address)
  await supabase
    .from("subscriptions")
    .update({ status })
    .eq("object_id", passObjectId)
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
