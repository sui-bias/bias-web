import { BottomTabNav } from "@/components/bottom-tab-nav"

export default function TabsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="mx-auto flex min-h-svh w-full max-w-md flex-col bg-white dark:bg-grey-900">
      <main className="flex-1 pb-20">{children}</main>
      <BottomTabNav />
    </div>
  )
}
