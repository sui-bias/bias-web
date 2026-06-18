import { notFound } from "next/navigation"
import { getFriend } from "@/lib/mock"
import { CharacterProfileView } from "@/components/profile/character-profile-view"
import { UserProfileView } from "@/components/profile/user-profile-view"

export default async function ListDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const friend = getFriend(id)

  if (!friend) notFound()

  return friend.kind === "character" ? (
    <CharacterProfileView character={friend.data} />
  ) : (
    <UserProfileView user={friend.data} />
  )
}
