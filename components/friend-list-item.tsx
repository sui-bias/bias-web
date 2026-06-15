import Link from "next/link"

type FriendKind = "user" | "character"

type FriendListItemProps = {
  name: string
  description?: string
  kind: FriendKind
  href?: string
}

export function FriendListItem({
  name,
  description,
  kind,
  href,
}: FriendListItemProps) {
  const content = (
    <>
      <div className="relative flex size-10 shrink-0 items-center justify-center rounded-xl bg-grey-200 text-sm font-medium text-grey-700 dark:bg-grey-700 dark:text-grey-100">
        {name.slice(0, 1)}
        {kind === "character" && (
          <span className="absolute top-[-4] right-[-4] flex h-4 w-4 items-center justify-center rounded-full border bg-brand text-[8px] text-white">
            C
          </span>
        )}
      </div>
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <p className="truncate text-sm font-semibold text-grey-900 dark:text-white">
            {name}
          </p>
        </div>
        {description ? (
          <p className="truncate text-xs text-grey-500 dark:text-grey-400">
            {description}
          </p>
        ) : null}
      </div>
    </>
  )

  return (
    <li className="flex items-center gap-2 py-3">
      {href ? (
        <Link
          href={href}
          className="flex w-full items-center gap-2 rounded-xl px-1 py-1 transition-colors hover:bg-grey-50 dark:hover:bg-grey-800/80"
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
