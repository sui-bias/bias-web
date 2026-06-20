// 캐릭터 DB 연동 (Supabase `characters` 테이블, snake_case).
// 쓰기는 RLS 정책 필요(supabase/migrations/0003_characters.sql).
// 컬럼은 lib/types.ts 의 Character 와 1:1 매핑.

import { supabase } from "./supabase"
import type { Affinity, Character, CharacterDraft, Visibility } from "./types"

export interface OfficialCharacterCard {
  id: string
  display_name: string
  intro: string
  imageUrl?: string
  genre?: string
  chatCharacterId?: string
}

type CharacterRow = {
  id: string
  display_name: string
  image_url: string | null
  age: number | null
  job: string | null
  native_language: string | null
  narrative: string | null
  intro: string
  genre: string[] | null
  background: string | null
  family: string | null
  mbti: string | null
  height: string | null
  traits: string
  speech_habits: string | null
  texting_style: string | null
  likes: string[] | null
  dislikes: string[] | null
  hidden: string | null
  banned_topics: string[] | null
  first_situation: string | null
  first_message: string | null
  affinity_start: number | null
  visibility: Visibility
  owner_id: string | null
  is_official: boolean | null
  chat_character_id: string | null
}

function rowToCharacter(r: CharacterRow): Character {
  return {
    id: String(r.id),
    display_name: r.display_name,
    imageUrl: r.image_url ?? undefined,
    age: r.age ?? undefined,
    job: r.job ?? undefined,
    nativeLanguage: r.native_language ?? undefined,
    narrative: r.narrative ?? undefined,
    intro: r.intro,
    genre: r.genre ?? undefined,
    background: r.background ?? undefined,
    family: r.family ?? undefined,
    mbti: r.mbti ?? undefined,
    height: r.height ?? undefined,
    traits: r.traits,
    speechHabits: r.speech_habits ?? undefined,
    textingStyle: r.texting_style ?? undefined,
    likes: r.likes ?? [],
    dislikes: r.dislikes ?? [],
    hidden: r.hidden ?? undefined,
    bannedTopics: r.banned_topics ?? [],
    firstSituation: r.first_situation ?? undefined,
    firstMessage: r.first_message ?? undefined,
    affinityStart: (r.affinity_start ?? 1) as Affinity,
    visibility: r.visibility,
    ownerId: r.owner_id ?? "",
    isOfficial: r.is_official ?? false,
    chatCharacterId: r.chat_character_id ?? undefined,
  }
}

// 생성/수정 시 DB 컬럼으로 변환 (id/owner_id/is_official 제외 — 호출부에서 지정)
function draftToRow(d: CharacterDraft) {
  return {
    display_name: d.display_name,
    image_url: d.imageUrl ?? null,
    age: d.age ?? null,
    job: d.job ?? null,
    native_language: d.nativeLanguage ?? null,
    narrative: d.narrative ?? null,
    intro: d.intro,
    genre: d.genre ?? null,
    background: d.background ?? null,
    family: d.family ?? null,
    mbti: d.mbti ?? null,
    height: d.height ?? null,
    traits: d.traits,
    speech_habits: d.speechHabits ?? null,
    texting_style: d.textingStyle ?? null,
    likes: d.likes,
    dislikes: d.dislikes,
    hidden: d.hidden ?? null,
    banned_topics: d.bannedTopics,
    first_situation: d.firstSituation ?? null,
    first_message: d.firstMessage ?? null,
    affinity_start: d.affinityStart,
    visibility: d.visibility,
  }
}

/** 공개 캐릭터 + (있으면) 내 캐릭터 목록. */
export async function listCharacters(): Promise<Character[]> {
  const { data, error } = await supabase.from("characters").select("*")
  if (error) {
    console.error("[characters] list error:", error.message)
    return []
  }
  return ((data as CharacterRow[]) ?? []).map(rowToCharacter)
}

/** 내가 만든 캐릭터. */
export async function listMyCharacters(ownerId: string): Promise<Character[]> {
  const { data, error } = await supabase
    .from("characters")
    .select("*")
    .eq("owner_id", ownerId)
  if (error) return []
  return ((data as CharacterRow[]) ?? []).map(rowToCharacter)
}

export async function getCharacter(id: string): Promise<Character | null> {
  const { data, error } = await supabase
    .from("characters")
    .select("*")
    .eq("id", id)
    .maybeSingle()
  if (error || !data) return null
  return rowToCharacter(data as CharacterRow)
}

/** 캐릭터 생성. 생성된 id 반환. */
export async function createCharacter(
  draft: CharacterDraft,
  ownerId: string
): Promise<string> {
  const { data, error } = await supabase
    .from("characters")
    .insert({ ...draftToRow(draft), owner_id: ownerId, is_official: false })
    .select("id")
    .single()
  if (error) throw new Error(error.message)
  return String((data as { id: string }).id)
}

/** 캐릭터 수정. */
export async function updateCharacter(
  id: string,
  draft: CharacterDraft
): Promise<void> {
  const { error } = await supabase
    .from("characters")
    .update(draftToRow(draft))
    .eq("id", id)
  if (error) throw new Error(error.message)
}

export async function deleteCharacter(id: string): Promise<void> {
  const { error } = await supabase.from("characters").delete().eq("id", id)
  if (error) throw new Error(error.message)
}
// 공식 캐릭터 카드(온보딩 선택용 요약)
function toOfficialCharacterCard(row: CharacterRow): OfficialCharacterCard {
  const genre = Array.isArray(row.genre)
    ? row.genre.find((g) => typeof g === "string" && g.trim().length > 0)
    : undefined
  const chatCharacterId = row.chat_character_id?.trim() || undefined
  const imageUrl = row.image_url ?? undefined

  return {
    id: String(row.id),
    display_name: row.display_name,
    intro: row.intro,
    imageUrl,
    genre,
    chatCharacterId,
  }
}

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
