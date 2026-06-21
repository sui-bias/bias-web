"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowLeft, ImagePlus } from "lucide-react"
import { AppHeader } from "@/components/app-header"
import { useCurrentUser } from "@/hooks/use-current-user"
import { resizeAndUpload } from "@/lib/storage"
import { updateProfile } from "@/lib/users"

export default function ProfileEditPage() {
  const router = useRouter()
  const { address, user, loading, refresh } = useCurrentUser()
  const fileRef = useRef<HTMLInputElement>(null)

  const [displayName, setDisplayName] = useState("")
  const [username, setUsername] = useState("")
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // 유저 로드되면 폼 초기화 (props → 로컬 폼 상태 동기화)
  useEffect(() => {
    if (!user) return
    /* eslint-disable react-hooks/set-state-in-effect */
    setDisplayName(user.display_name ?? "")
    setUsername(user.username ?? "")
    setImageUrl(user.image_url ?? null)
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [user])

  async function handleImageChange(
    event: React.ChangeEvent<HTMLInputElement>
  ) {
    const file = event.target.files?.[0]
    if (!file) return
    setUploading(true)
    setError(null)
    try {
      const url = await resizeAndUpload(file, "profiles")
      setImageUrl(url)
    } catch {
      setError("Failed to upload image.")
    } finally {
      setUploading(false)
    }
  }

  async function handleSave() {
    if (!address) {
      setError("Connect your wallet first.")
      return
    }
    if (!displayName.trim() || !username.trim()) {
      setError("Please enter a nickname and ID.")
      return
    }
    setSaving(true)
    setError(null)
    try {
      await updateProfile(address, {
        display_name: displayName.trim(),
        username: username.trim(),
        image_url: imageUrl,
      })
      await refresh()
      router.push("/mypage")
    } catch (e) {
      setSaving(false)
      setError(
        e instanceof Error && e.message === "USERNAME_TAKEN"
          ? "That ID is already taken."
          : "Failed to save."
      )
    }
  }

  return (
    <div className="space-y-6 pt-6 pb-6">
      <AppHeader
        left={
          <Link
            href="/mypage"
            aria-label="Back to My Page"
            className="flex size-9 items-center justify-center rounded-full text-grey-700 transition-colors hover:bg-grey-100 dark:text-grey-200 dark:hover:bg-grey-800"
          >
            <ArrowLeft size={20} />
          </Link>
        }
        title="Edit profile"
      />

      {/* 사진 */}
      <div className="flex justify-center">
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="relative flex size-24 items-center justify-center overflow-hidden rounded-full border border-grey-200 bg-grey-100 text-grey-400 dark:border-grey-700 dark:bg-grey-800"
          aria-label="Change profile photo"
        >
          {imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={imageUrl} alt="" className="size-full object-cover" />
          ) : (
            <ImagePlus size={24} />
          )}
          <span className="absolute right-0 bottom-0 flex size-7 items-center justify-center rounded-full border-2 border-white bg-brand text-white dark:border-grey-900">
            <ImagePlus size={14} />
          </span>
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleImageChange}
        />
      </div>

      {/* 필드 */}
      <div className="space-y-4 px-4">
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-grey-600 dark:text-grey-300">
            Nickname
          </label>
          <input
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            maxLength={20}
            placeholder="Nickname shown to others"
            className="h-11 w-full rounded-xl border border-grey-200 bg-white px-3 text-sm text-grey-900 outline-none focus:border-brand dark:border-grey-700 dark:bg-grey-800 dark:text-white"
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-grey-600 dark:text-grey-300">
            ID
          </label>
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            maxLength={20}
            placeholder="Unique ID (@handle)"
            className="h-11 w-full rounded-xl border border-grey-200 bg-white px-3 text-sm text-grey-900 outline-none focus:border-brand dark:border-grey-700 dark:bg-grey-800 dark:text-white"
          />
        </div>

        {error ? <p className="text-xs text-brand">{error}</p> : null}

        <button
          onClick={handleSave}
          disabled={saving || loading || uploading}
          className="h-12 w-full rounded-xl bg-brand text-sm font-semibold text-white transition-opacity active:opacity-80 disabled:opacity-40"
        >
          {saving ? "Saving…" : uploading ? "Uploading…" : "Save"}
        </button>
      </div>
    </div>
  )
}
