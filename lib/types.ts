// 핵심 도메인 타입. 생성/프로필/리스트 화면이 모두 이 타입을 공유한다.
// spiderman.yaml 캐릭터 카드를 1:1 매핑한 결과. 자세한 배경은 docs/DEVELOPMENT.md 참고.

// 실제 사람 친구(상호 팔로우). 캐릭터와 함께 친구 목록에 나타난다.
export type Genres =
  | "Romance"
  | "Fantasy"
  | "School"
  | "Slice of Life"
  | "Idol/Ent"
  | "Gaming"
  | "Sports"
  | "Mystery"
  | "Healing"
  | "Other"

export type AgeGroups = "Teens" | "20s" | "30s" | "40s+"

export const MEMWAL_STEPS = [
  "pending",
  "creating",
  "delegate_memwal",
  "delegate_seal",
  "done",
  "failed",
] as const

export type MemwalStep = (typeof MEMWAL_STEPS)[number]

export interface User {
  id: string
  address: string
  display_name: string
  username: string
  genres: Genres[]
  language: string
  age_group: AgeGroups
  visibility: string
  plan?: string
  memwal_step?: MemwalStep
  memwal_account_id?: string
  memwal_delegate_pubkey?: string
  seal_delegate_pubkey?: string
  memwal_error?: string | null
  imageUrl?: string
  intro?: string // 상태 메시지
}

// -------------------------------

// 캐릭터

export type Affinity = 1 | 2 | 3 | 4
export type Visibility = "public" | "friends" | "private"
// 생성/수정 폼이 다루는 값. id/ownerId/isOfficial은 서버가 채운다.
export type CharacterDraft = Omit<Character, "id" | "ownerId" | "isOfficial">

export interface Character {
  id: string
  // profile
  display_name: string
  imageUrl?: string
  age?: number
  job?: string
  nativeLanguage?: string // 말투 뉘앙스용(출력 언어와 별개)
  narrative?: string // 서사/백스토리
  intro: string // 한 줄 소개 (status message로도 사용)
  genre?: string[] // 피드/배지 표시용 장르
  // basic
  background?: string
  family?: string
  mbti?: string
  height?: string
  // personality
  traits: string // 성격
  speechHabits?: string // 말투/언어 습관
  textingStyle?: string // 채팅 스타일(버블 길이 등)
  // details
  likes: string[]
  dislikes: string[]
  hidden?: string // 안 드러내는 비밀 (프로필에 노출 안 함)
  bannedTopics: string[] // 금지 주제 (프로필에 노출 안 함)
  // opening
  firstSituation?: string
  firstMessage?: string
  // relationship & meta
  affinityStart: Affinity // lv1~4, 기본 1
  visibility: Visibility
  ownerId: string
  isOfficial: boolean // 플랫폼 제공 캐릭터 여부
  // 1:1 채팅 가능 캐릭터의 방 라우트 id (= lib/provided-characters.ts의 id, 예: "spider_man").
  // 값이 있으면 /chat/{chatCharacterId} 로 실제 대화 가능. 없으면 아직 채팅 미지원("준비중").
  chatCharacterId?: string
}

export const MBTI_TYPES = [
  "INTJ",
  "INTP",
  "ENTJ",
  "ENTP",
  "INFJ",
  "INFP",
  "ENFJ",
  "ENFP",
  "ISTJ",
  "ISFJ",
  "ESTJ",
  "ESFJ",
  "ISTP",
  "ISFP",
  "ESTP",
  "ESFP",
] as const

export const VISIBILITY_OPTIONS: { value: Visibility; label: string }[] = [
  { value: "public", label: "Public" },
  { value: "friends", label: "Friends only" },
  { value: "private", label: "Private" },
]

export const AFFINITY_LEVELS: { value: Affinity; label: string }[] = [
  { value: 1, label: "Lv.1" },
  { value: 2, label: "Lv.2" },
  { value: 3, label: "Lv.3" },
  { value: 4, label: "Lv.4" },
]

export const NATIVE_LANGUAGE_OPTIONS = [
  { value: "ko", label: "Korean" },
  { value: "en", label: "English" },
  { value: "ja", label: "日本語" },
] as const

export function visibilityLabel(visibility: Visibility): string {
  return (
    VISIBILITY_OPTIONS.find((option) => option.value === visibility)?.label ??
    visibility
  )
}

// ── 채팅방 ──
// 참여자는 사람+캐릭터를 하나의 배열에 판별 유니온으로 담는다(입장 순서 유지).
// 캐릭터만 "데려온 사람(ownerAddress)"을 가진다.
export type RoomType = "direct" | "group"

export type Participant =
  | { type: "user"; address: string }
  | { type: "character"; characterId: string; ownerAddress: string }

export interface Room {
  id: string
  type: RoomType // direct(1:1) / group(2:2)
  name: string
  ownerAddress: string // 방 생성자
  participants: Participant[]
  createdAt: string
}

// 누가 보냈는지 — 유저/캐릭터 구분
export type SenderRef =
  | { type: "user"; address: string }
  | { type: "character"; characterId: string }

// 사진의 Chat = 말풍선 하나. AI 한 턴이 여러 말풍선이면 turnId 로 묶는다.
export interface Message {
  id: string
  roomId: string
  sender: SenderRef
  text: string
  turnId?: string
  createdAt: string
}

// 정원 헬퍼: group MVP = 사람 ≤2 + 캐릭터 ≤2
export function countParticipants(participants: Participant[]) {
  return {
    users: participants.filter((p) => p.type === "user").length,
    characters: participants.filter((p) => p.type === "character").length,
  }
}
