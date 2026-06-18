import Link from "next/link"

type FriendKind = "user" | "character"

type FriendListItemProps = {
  name: string
  intro?: string
  imageUrl?: string
  kind: FriendKind
  href?: string
}

// 카카오톡 친구목록 행: 원형 아바타 + 이름 + 상태 메시지. 캐릭터는 "C" 배지로 구분.
export function FriendListItem({
  name,
  intro,
  imageUrl,
  kind,
  href,
}: FriendListItemProps) {
  const content = (
    <>
      <div className="relative size-10 shrink-0">
        <div className="flex size-10 items-center justify-center overflow-hidden rounded-full bg-grey-200 text-sm font-medium text-grey-700 dark:bg-grey-700 dark:text-grey-100">
          {imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={imageUrl} alt="" className="size-full object-cover" />
          ) : (
            name.slice(0, 1)
          )}
        </div>
        {kind === "character" && (
          <span className="absolute -top-1 -right-1 flex size-4 items-center justify-center rounded-full border border-white bg-brand text-[8px] font-bold text-white dark:border-grey-900">
            C
          </span>
        )}
      </div>
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-grey-900 dark:text-white">
          {name}
        </p>
        {intro ? (
          <p className="truncate text-xs text-grey-500 dark:text-grey-400">
            {intro}
          </p>
        ) : null}
      </div>
    </>
  )

  return (
    <li className="flex items-center gap-3 py-3">
      {href ? (
        <Link
          href={href}
          className="flex w-full items-center gap-3 rounded-xl px-1 py-1 transition-colors hover:bg-grey-50 dark:hover:bg-grey-800/80"
        >
          {content}
        </Link>
      ) : (
        content
      )}
    </li>
  )
}

export type { FriendKind, FriendListItemProps }
