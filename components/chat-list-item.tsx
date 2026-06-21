import Link from "next/link"

type ChatType = "direct" | "group"
type ChatMember = {
  name: string
  imageUrl?: string
}

type ChatListItemProps = {
  title: string
  preview: string
  time: string
  type: ChatType
  members?: ChatMember[]
  href?: string
}

export function ChatListItem({
  title,
  preview,
  time,
  type,
  members = [],
  href,
}: ChatListItemProps) {
  const visibleMembers = members.slice(0, 4)
  const directMember = visibleMembers[0]
  const content = (
    <>
      {type === "group" ? (
        <div className="grid size-10 shrink-0 grid-cols-2 grid-rows-2 overflow-hidden rounded-xl bg-grey-200 dark:bg-grey-700">
          {Array.from({ length: visibleMembers.length }).map((_, index) => {
            const member = visibleMembers[index]

            return (
              <div
                key={`${title}-${index}`}
                className="flex items-center justify-center overflow-hidden border border-white/60 text-[9px] font-semibold text-grey-700 dark:border-grey-900 dark:text-grey-100"
              >
                {member?.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={member.imageUrl}
                    alt=""
                    className="size-full object-cover"
                  />
                ) : (
                  (member?.name.slice(0, 1) ?? "")
                )}
              </div>
            )
          })}
        </div>
      ) : (
        <div className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-grey-200 text-sm font-medium text-grey-700 dark:bg-grey-700 dark:text-grey-100">
          {directMember?.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={directMember.imageUrl}
              alt=""
              className="size-full object-cover"
            />
          ) : (
            (directMember?.name ?? title).slice(0, 1)
          )}
        </div>
      )}

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-grey-900 dark:text-white">
          {title}
        </p>
        <p className="truncate text-xs text-grey-500 dark:text-grey-400">
          {preview}
        </p>
      </div>

      <span className="shrink-0 text-xs text-grey-500 dark:text-grey-400">
        {time}
      </span>
    </>
  )

  return (
    <li className="flex items-center gap-3 py-1">
      {href ? (
        <Link
          href={href}
          className="flex w-full items-center gap-3 rounded-xl px-1 py-1 transition-colors hover:bg-grey-50 dark:hover:bg-grey-800/80"
        >
          {content}
        </Link>
      ) : (
        <div className="flex items-center gap-2 py-3">{content}</div>
      )}
    </li>
  )
}

export type { ChatType, ChatListItemProps }
