import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

type AppHeaderProps = {
  left?: ReactNode
  right?: ReactNode
  center?: ReactNode
  title?: ReactNode
  subtitle?: ReactNode
  className?: string
  centerClassName?: string
  titleClassName?: string
  subtitleClassName?: string
}

export function AppHeader({
  left,
  right,
  center,
  title,
  subtitle,
  className,
  centerClassName,
  titleClassName,
  subtitleClassName,
}: AppHeaderProps) {
  return (
    <header
      className={cn("flex items-center justify-between gap-2 px-4", className)}
    >
      {left ? <div className="shrink-0">{left}</div> : null}

      {center ? (
        <div className={cn("min-w-0 flex-1", centerClassName)}>{center}</div>
      ) : title || subtitle ? (
        <div className={cn("min-w-0 flex-1", centerClassName)}>
          {title ? (
            <h1
              className={cn(
                "text-xl font-bold text-grey-900 dark:text-white",
                titleClassName
              )}
            >
              {title}
            </h1>
          ) : null}
          {subtitle ? (
            <p
              className={cn(
                "mt-1 text-sm text-grey-500 dark:text-grey-400",
                subtitleClassName
              )}
            >
              {subtitle}
            </p>
          ) : null}
        </div>
      ) : null}

      {right ? <div className="shrink-0">{right}</div> : null}
    </header>
  )
}
