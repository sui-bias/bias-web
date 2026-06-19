import { supabase } from "./supabase"

export interface OfficialCharacterCard {
  id: string
  display_name: string
  intro: string
  imageUrl?: string
  genre?: string
  chatCharacterId?: string
}

type CharacterRow = {
  id: string | number
  display_name: string
  intro: string
  image_url?: string | null
  imageUrl?: string | null
  genre?: string[] | string | null
  chat_character_id?: string | null
  chatCharacterId?: string | null
}

function toOfficialCharacterCard(row: CharacterRow): OfficialCharacterCard {
  const genre =
    Array.isArray(row.genre) && row.genre.length > 0
      ? row.genre[0]
      : typeof row.genre === "string" && row.genre.trim().length > 0
        ? row.genre
        : undefined

  const chatCharacterId =
    row.chat_character_id?.trim() || row.chatCharacterId?.trim() || undefined
  const imageUrl = row.image_url ?? row.imageUrl ?? undefined

  return {
    id: String(row.id),
    display_name: row.display_name,
    intro: row.intro,
    imageUrl,
    genre,
    chatCharacterId,
  }
}

/** 공식 캐릭터 목록을 가져온다. 실패 시 빈 배열을 반환한다. */
export async function getOfficialCharacters(): Promise<
  OfficialCharacterCard[]
> {
  const { data, error } = await supabase
    .from("characters")
    .select("*")
    .eq("is_official", true)
    .order("id", { ascending: true })

  if (error || !data) {
    console.error("[characters] getOfficialCharacters error:", error?.message)
    return []
  }

  return (data as CharacterRow[]).map(toOfficialCharacterCard)
}
