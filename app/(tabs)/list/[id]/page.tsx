import { ProfileDetailView } from "@/components/profile-detail-view"

export default function ListDetailPage({ params }: { params: { id: string } }) {
  return <ProfileDetailView id={params.id} source="profile" />
}
