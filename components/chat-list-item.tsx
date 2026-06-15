type ChatType = "direct" | "group"

type ChatListItemProps = {
  title: string
  preview: string
  time: string
  type: ChatType
  members?: string[]
}

export function ChatListItem({
  title,
  preview,
  time,
  type,
  members = [],
}: ChatListItemProps) {
  const visibleMembers = members.slice(0, 4)

  return (
    <li className="flex items-center gap-2 py-3">
      {type === "group" ? (
        <div className="grid size-10 shrink-0 grid-cols-2 grid-rows-2 overflow-hidden rounded-xl bg-grey-200 dark:bg-grey-700">
          {Array.from({ length: 4 }).map((_, index) => {
            const member = visibleMembers[index]

            return (
              <div
                key={`${title}-${index}`}
                className="flex items-center justify-center border border-white/60 text-[9px] font-semibold text-grey-700 dark:border-grey-900 dark:text-grey-100"
              >
                {member ? member.slice(0, 1) : ""}
              </div>
            )
          })}
        </div>
      ) : (
        <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-grey-200 text-sm font-medium text-grey-700 dark:bg-grey-700 dark:text-grey-100">
          {title.slice(0, 1)}
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
    </li>
  )
}

export type { ChatType, ChatListItemProps }
