import { ProfileDetailView } from "@/components/profile-detail-view"

export default function CharacterDetailPage({
  params,
}: {
  params: { id: string }
}) {
  return <ProfileDetailView id={params.id} source="group" />
}
