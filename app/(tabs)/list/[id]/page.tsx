import { getCharacter as getDbCharacter } from "@/lib/characters"
import { getCharacter as getMockCharacter } from "@/lib/mock"
import { CharacterProfileView } from "@/components/profile/character-profile-view"
import { RealUserProfileView } from "@/components/profile/real-user-profile-view"

// id 가 DB 캐릭터(explore) → mock 캐릭터(list) → 둘 다 아니면 지갑 주소로 보고 실유저.
export default async function ListDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const character = (await getDbCharacter(id)) ?? getMockCharacter(id)

  if (character) {
    return <CharacterProfileView character={character} />
  }

  return <RealUserProfileView address={id} />
}
