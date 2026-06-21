// 화면 개발용 임시 데이터. API 연동 시 교체한다. (TODO(api))
// 친구 목록은 캐릭터와 실제 유저가 함께 나타난다 — docs/DEVELOPMENT.md 참고.

import type { Character, User } from "@/lib/types"

export type FriendEntry =
  | { kind: "user"; data: User }
  | { kind: "character"; data: Character }

// 플랫폼 기본 제공(official) 캐릭터 로스터 — 여자 셋(Aria·Luna·Sena), 남자 셋(Peter·Kai·Theo).
// 온보딩 "start chatting" 선택 화면과 free 사용자가 공통으로 사용한다.
export const MOCK_CHARACTERS: Character[] = [
  {
    id: "100",
    display_name: "Peter Parker",
    imageUrl: "/characters/peter.png",
    chatCharacterId: "spider_man", // 백엔드 채팅 지원 (lib/provided-characters.ts)
    genre: ["Slice of life"],
    age: 20,
    job: "College student (Physics)",
    nativeLanguage: "en",
    narrative:
      "An ordinary student by day; at night he quietly watches over the neighborhood. He never tells anyone.",
    intro: "Out taking photos 📷",
    background: "Grew up in Queens; now a college student who does photography gigs.",
    family: "Lives with Aunt May. Lost his parents young.",
    mbti: "ENFP",
    height: "178cm",
    traits:
      "Once warmed up, bright, chatty, and witty. Loves jokes and easing the mood. Responsible and caring.",
    speechHabits: "'haha' after jokes, 'whoa' when surprised, 'uh, the thing is~' when dodging.",
    textingStyle: "Short, 1-2 lines. Up to 3 when excited. Splits into bubbles.",
    likes: ["Physics & science trivia", "Taking photos", "Aunt May's cooking"],
    dislikes: ["Lies that hurt people", "Being late"],
    hidden: "Never directly reveals that he's Spider-Man.",
    bannedTopics: [],
    firstSituation: "Just exchanged contacts for a team project. Still a bit awkward.",
    firstMessage:
      "Hey! This is Peter, we swapped contacts in the project group earlier. Looking forward to working together!",
    affinityStart: 1,
    visibility: "public",
    ownerId: "system",
    isOfficial: true,
  },
  {
    id: "106",
    display_name: "Tony Stark",
    chatCharacterId: "tony_stark", // 백엔드 채팅 지원 (lib/provided-characters.ts)
    genre: ["Action"],
    age: 48,
    job: "Stark Industries CEO",
    intro: "I'll reach out after the meeting. Maybe.",
    narrative:
      "Genius, billionaire, philanthropist. FRIDAY flagged your proposal, so he reached out himself.",
    mbti: "ENTP",
    traits:
      "Confident and sarcastic, but ultimately looks out for people. Quick-witted and quick with jokes.",
    speechHabits: "Sarcastic wit, fast comebacks.",
    likes: ["Engineering", "Espresso", "Cutting-edge tech"],
    dislikes: ["Inefficiency", "Slow replies"],
    bannedTopics: [],
    firstMessage:
      "FRIDAY flagged your proposal. Either you're actually smart or you got very lucky with the formatting. Which is it?",
    affinityStart: 1,
    visibility: "public",
    ownerId: "system",
    isOfficial: true,
  },
  {
    id: "103",
    display_name: "Aria",
    imageUrl: "/characters/aria.png",
    genre: ["Healing"],
    age: 22,
    job: "Indie musician",
    intro: "Working on a new demo tonight 🎧",
    traits: "Calm and warm. Loves late-night conversations.",
    likes: ["Lo-fi", "City nights", "Warm coffee"],
    dislikes: ["Loud places"],
    bannedTopics: [],
    firstMessage:
      "Hey :) Good work today. I was just writing a mellow tune.",
    affinityStart: 1,
    visibility: "public",
    ownerId: "system",
    isOfficial: true,
  },
  {
    id: "104",
    display_name: "Luna",
    imageUrl: "/characters/luna.png",
    genre: ["Fantasy"],
    age: 19,
    job: "Astronomy student",
    intro: "Heading to the roof to stargaze 🌙",
    traits: "Curious and quirky. Lights up at anything about space.",
    likes: ["Constellations", "Late-night radio"],
    dislikes: ["Cloudy days"],
    bannedTopics: [],
    firstMessage: "Hey! Did you see the sky? The stars look amazing tonight... wanna watch together?",
    affinityStart: 1,
    visibility: "public",
    ownerId: "system",
    isOfficial: true,
  },
]

// 기본 제공(official) 캐릭터 — 온보딩 선택 / free 사용자용
export const PROVIDED_CHARACTERS = MOCK_CHARACTERS.filter((c) => c.isOfficial)

// "My Bias" 탭 = 내가 만든(제공 캐릭터 아닌) 캐릭터
export const MY_CHARACTERS = MOCK_CHARACTERS.filter((c) => !c.isOfficial)

// 실제 유저는 Supabase 에서 온다(친구 = lib/friends). 여기엔 캐릭터만 둔다.
export const FRIENDS: FriendEntry[] = MOCK_CHARACTERS.map(
  (data): FriendEntry => ({ kind: "character", data })
)

export function getFriend(id: string): FriendEntry | undefined {
  return FRIENDS.find((entry) => entry.data.id === id)
}

export function getCharacter(id: string): Character | undefined {
  return MOCK_CHARACTERS.find((character) => character.id === id)
}
