import { getCharacter } from "@/lib/characters"
import { CharacterProfileView } from "@/components/profile/character-profile-view"
import { RealUserProfileView } from "@/components/profile/real-user-profile-view"

// id 가 DB 캐릭터면 캐릭터 프로필, 아니면 지갑 주소로 보고 실유저 프로필.
export default async function ListDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const character = await getCharacter(id)

  if (character) {
    return <CharacterProfileView character={character} />
  }

  return <RealUserProfileView address={id} />
}
