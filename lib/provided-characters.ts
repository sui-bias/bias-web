export const PROVIDED_CHARACTERS = [
  {
    id: "spider_man",
    name: "Peter Parker",
    source: "Marvel",
    desc: "Friendly neighborhood college student. Witty, warm, and weirdly busy at night.",
    firstMessage:
      "Hey! This is Peter, we just swapped contacts in the project group earlier. Looking forward to working together!",
    color: "from-red-500 to-blue-700",
    textColor: "text-red-100",
    genre: ["action", "fantasy"],
  },
  {
    id: "tony_stark",
    name: "Tony Stark",
    source: "Marvel",
    desc: "Genius, billionaire. Texted you personally because FRIDAY flagged your proposal.",
    firstMessage:
      "FRIDAY flagged your proposal. Either you're actually smart or you got very lucky with the formatting. Which is it?",
    color: "from-yellow-400 via-orange-500 to-red-700",
    textColor: "text-yellow-100",
    genre: ["action", "fantasy"],
  },
] as const

export type ProvidedCharacter = (typeof PROVIDED_CHARACTERS)[number]
export type ProvidedCharacterId = ProvidedCharacter["id"]
