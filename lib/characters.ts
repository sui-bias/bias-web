// 캐릭터 DB 연동 (Supabase `characters` 테이블, snake_case).
// 쓰기는 RLS 정책 필요(supabase/migrations/0003_characters.sql).
// 컬럼은 lib/types.ts 의 Character 와 1:1 매핑.

import { supabase } from "./supabase"
import type { Affinity, Character, CharacterDraft, Visibility } from "./types"

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
export function draftToRow(d: CharacterDraft) {
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

/** 모두가 만든 공개 캐릭터 (탐색용). */
export async function listPublicCharacters(): Promise<Character[]> {
  const { data, error } = await supabase
    .from("characters")
    .select("*")
    .eq("visibility", "public")
  if (error) {
    console.error("[characters] listPublic error:", error.message)
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

/**
 * 캐릭터 생성. 서버 라우트(/api/characters)를 거친다 — 서버가 온체인 plan +
 * 보유 개수를 검증하므로, 클라 UI 게이트를 우회한 직접 호출도 차단된다.
 */
export async function createCharacter(
  draft: CharacterDraft,
  ownerId: string
): Promise<string> {
  const res = await fetch("/api/characters", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ownerId, draft }),
  })
  const json = (await res.json().catch(() => ({}))) as {
    id?: string
    error?: string
  }
  if (!res.ok) throw new Error(json.error ?? "캐릭터 생성에 실패했습니다.")
  return String(json.id)
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

export async function getOfficialCharacters(): Promise<Character[]> {
  const { data, error } = await supabase
    .from("characters")
    .select("*")
    .eq("is_official", true)
    .order("id", { ascending: true })

  if (error || !data) {
    console.error("[characters] getOfficialCharacters error:", error?.message)
    return []
  }

  return (data as CharacterRow[]).map(rowToCharacter)
}
