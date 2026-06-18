import { notFound } from "next/navigation"
import { CharacterChatRoom } from "@/components/character-chat-room"
import { PROVIDED_CHARACTERS } from "@/lib/provided-characters"

type CharacterChatPageProps = {
  params: Promise<{ roomId: string }>
}

export default async function CharacterChatPage({
  params,
}: CharacterChatPageProps) {
  const { roomId } = await params
  const character = PROVIDED_CHARACTERS.find((item) => item.id === roomId)
  console.log(character)

  if (!character) {
    notFound()
  }

  return (
    <CharacterChatRoom
      characterId={character.id}
      characterName={character.name}
      characterSource={character.source}
    />
  )
}
