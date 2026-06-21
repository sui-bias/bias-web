// 친구 기능 (단방향 추가: 요청/수락 없음).
// user_address 가 friend_address 를 추가 → 내 친구 목록에 바로 들어온다.
// 테이블/정책은 supabase/migrations/0001_friendships.sql 참고.

import { supabase } from "./supabase"
import type { UserRow } from "./users"

const SUI_ADDRESS = /^0x[0-9a-fA-F]{64}$/

/**
 * user id(=username) 또는 지갑 주소로 유저 검색.
 * 본인(excludeAddress)은 결과에서 제외.
 */
export async function searchUsers(
  query: string,
  excludeAddress?: string
): Promise<UserRow[]> {
  const q = query.trim()
  if (!q) return []

  let req = supabase.from("users").select("*").limit(20)
  req = SUI_ADDRESS.test(q)
    ? req.eq("address", q)
    : req.ilike("username", `%${q}%`)

  const { data, error } = await req
  if (error) {
    console.error("[friends] searchUsers error:", error.message)
    return []
  }
  const rows = (data as UserRow[]) ?? []
  return excludeAddress ? rows.filter((u) => u.address !== excludeAddress) : rows
}

/** 친구 추가(단방향). 이미 있으면 무시(upsert). */
export async function addFriend(
  me: string,
  friendAddress: string
): Promise<void> {
  if (me === friendAddress) throw new Error("자기 자신은 추가할 수 없습니다.")
  const { error } = await supabase
    .from("friendships")
    .upsert(
      { user_address: me, friend_address: friendAddress },
      { onConflict: "user_address,friend_address" }
    )
  if (error) throw new Error(error.message)
}

/** 친구 삭제. */
export async function removeFriend(
  me: string,
  friendAddress: string
): Promise<void> {
  const { error } = await supabase
    .from("friendships")
    .delete()
    .eq("user_address", me)
    .eq("friend_address", friendAddress)
  if (error) throw new Error(error.message)
}

/** 내가 이 유저를 이미 친구로 추가했는지. */
export async function isFriend(
  me: string,
  friendAddress: string
): Promise<boolean> {
  const { data, error } = await supabase
    .from("friendships")
    .select("friend_address")
    .eq("user_address", me)
    .eq("friend_address", friendAddress)
    .maybeSingle()
  if (error) {
    console.error("[friends] isFriend error:", error.message)
    return false
  }
  return Boolean(data)
}

/** 내 친구 목록(유저 프로필 포함). */
export async function listFriends(me: string): Promise<UserRow[]> {
  const { data: links, error } = await supabase
    .from("friendships")
    .select("friend_address")
    .eq("user_address", me)
  if (error) {
    console.error("[friends] listFriends error:", error.message)
    return []
  }

  const addresses = (links ?? []).map(
    (l) => (l as { friend_address: string }).friend_address
  )
  if (addresses.length === 0) return []

  const { data: users, error: e2 } = await supabase
    .from("users")
    .select("*")
    .in("address", addresses)
  if (e2) {
    console.error("[friends] listFriends users error:", e2.message)
    return []
  }
  return (users as UserRow[]) ?? []
}
