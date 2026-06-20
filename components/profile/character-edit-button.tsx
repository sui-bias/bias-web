"use client"

import Link from "next/link"
import { Pencil } from "lucide-react"
import { useCurrentUser } from "@/hooks/use-current-user"

// 캐릭터 제작자(owner) 본인에게만 수정 버튼을 노출한다.
export function CharacterEditButton({
  characterId,
  ownerId,
}: {
  characterId: string
  ownerId: string
}) {
  const { address } = useCurrentUser()
  if (!address || address !== ownerId) return null

  return (
    <Link
      href={`/character/${characterId}`}
      className="flex h-11 w-full items-center justify-center gap-1.5 rounded-xl border border-grey-200 text-sm font-semibold text-grey-700 transition-colors hover:bg-grey-100 dark:border-grey-700 dark:text-grey-200 dark:hover:bg-grey-800"
    >
      <Pencil size={16} />
      Edit character
    </Link>
  )
}
