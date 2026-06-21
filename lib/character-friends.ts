import { supabase } from "./supabase"
import type { Character } from "./types"
import { getCharacter } from "./characters"

type CharacterFriendRow = {
  user_address: string
  character_id: string
}

/** 캐릭터를 내 /list 에 추가(중복은 무시). */
export async function addCharacterFriend(
  userAddress: string,
  characterId: string
): Promise<void> {
  const { error } = await supabase
    .from("character_friendships")
    .upsert(
      { user_address: userAddress, character_id: characterId },
      { onConflict: "user_address,character_id" }
    )
  if (error) throw new Error(error.message)
}

/** 이미 추가한 캐릭터인지 확인. */
export async function isCharacterFriend(
  userAddress: string,
  characterId: string
): Promise<boolean> {
  const { data, error } = await supabase
    .from("character_friendships")
    .select("character_id")
    .eq("user_address", userAddress)
    .eq("character_id", characterId)
    .maybeSingle()
  if (error) {
    console.error("[character-friends] isCharacterFriend error:", error.message)
    return false
  }
  return Boolean(data)
}

/** 내가 추가한 캐릭터 목록. */
export async function listCharacterFriends(
  userAddress: string
): Promise<Character[]> {
  const { data, error } = await supabase
    .from("character_friendships")
    .select("character_id")
    .eq("user_address", userAddress)
  if (error) {
    console.error("[character-friends] listCharacterFriends error:", error.message)
    return []
  }

  const ids = ((data as CharacterFriendRow[]) ?? []).map((row) => row.character_id)
  if (!ids.length) return []

  const rows = await Promise.all(ids.map((id) => getCharacter(id)))
  return rows.filter((row): row is Character => Boolean(row))
}
