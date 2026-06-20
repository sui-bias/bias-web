import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { notFound } from "next/navigation"
import { AppHeader } from "@/components/app-header"
import { CharacterForm } from "@/components/character/character-form"
import { getCharacter } from "@/lib/characters"

export default async function CharacterEditPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const character = await getCharacter(id)

  if (!character) notFound()

  // 제공 캐릭터는 수정/삭제 불가
  const blockedReason = character.isOfficial
    ? "제공 캐릭터는 수정할 수 없습니다."
    : undefined

  return (
    <div className="space-y-4 pt-6">
      <AppHeader
        left={
          <Link
            href="/character"
            aria-label="캐릭터 목록으로 돌아가기"
            className="flex size-9 items-center justify-center rounded-full text-grey-700 transition-colors hover:bg-grey-100 dark:text-grey-200 dark:hover:bg-grey-800"
          >
            <ArrowLeft size={20} />
          </Link>
        }
        title="Edit Character"
      />

      <CharacterForm
        mode="edit"
        characterId={id}
        initial={character}
        blockedReason={blockedReason}
        deletable={!character.isOfficial}
      />
    </div>
  )
}
