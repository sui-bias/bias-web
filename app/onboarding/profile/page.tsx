"use client"

import { ChangeEvent, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { ChevronLeft, Camera } from "lucide-react"
import { useCurrentAccount } from "@mysten/dapp-kit"
import { cn } from "@/lib/utils"
import { AppHeader } from "@/components/app-header"
import { Button } from "@/components/ui/button"
import { isUsernameAvailable, saveProfile } from "@/lib/users"
import { supabase } from "@/lib/supabase"

// ── Constants ─────────────────────────────────────────────────
const GENRES = [
  "Romance",
  "Fantasy",
  "School",
  "Slice of Life",
  "Idol/Ent",
  "Gaming",
  "Sports",
  "Mystery",
  "Healing",
  "Other",
] as const

const AGE_GROUPS = ["Teens", "20s", "30s", "40s+"] as const

const STEP_COUNT = 3

const LANG_OPTIONS = [
  { value: "en", label: "English" },
  { value: "kr", label: "한국어" },
] as const
const PROFILE_IMAGE_BUCKET = "bias-storage"
const MAX_PROFILE_IMAGE_SIZE_BYTES = 5 * 1024 * 1024

// ── Form state type ───────────────────────────────────────────
interface ProfileForm {
  displayName: string
  nickname: string
  genres: string[]
  language: "en" | "kr"
  ageGroup: string
  visibility: "public" | "followers" | "private"
  agreePrivacy: boolean
  agreeMarketing: boolean
}

const DEFAULT_FORM: ProfileForm = {
  displayName: "",
  nickname: "",
  genres: [],
  language: "en",
  ageGroup: "",
  visibility: "public",
  agreePrivacy: false,
  agreeMarketing: false,
}

// ── Component ─────────────────────────────────────────────────
export default function ProfilePage() {
  const router = useRouter()
  const currentAccount = useCurrentAccount()
  const [step, setStep] = useState(1)
  const [form, setForm] = useState<ProfileForm>(DEFAULT_FORM)
  const [saving, setSaving] = useState(false)
  const [stepError, setStepError] = useState<string | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [profileImageFile, setProfileImageFile] = useState<File | null>(null)
  const [profileImagePreviewUrl, setProfileImagePreviewUrl] = useState<
    string | null
  >(null)

  function toggleGenre(genre: string) {
    setForm((f) => ({
      ...f,
      genres: f.genres.includes(genre)
        ? f.genres.filter((g) => g !== genre)
        : [...f.genres, genre],
    }))
  }

  function canNext() {
    if (step === 1)
      return (
        form.displayName.trim().length > 0 && form.nickname.trim().length > 0
      )
    if (step === 2) return form.genres.length > 0 && form.ageGroup !== ""
    if (step === 3) return form.agreePrivacy
    return false
  }

  function getStepError(currentStep: number): string | null {
    if (currentStep === 1) {
      if (form.displayName.trim().length === 0)
        return "Nickname is required."
      if (form.nickname.trim().length === 0) return "ID is required."
      return null
    }
    if (currentStep === 2) {
      if (form.genres.length === 0) return "Please select at least one genre."
      if (!form.ageGroup) return "Please select your age group."
      return null
    }
    if (currentStep === 3 && !form.agreePrivacy) {
      return "You must agree to the required privacy policy."
    }
    return null
  }

  useEffect(() => {
    setStepError(null)
  }, [step, form])

  useEffect(() => {
    return () => {
      if (profileImagePreviewUrl?.startsWith("blob:")) {
        URL.revokeObjectURL(profileImagePreviewUrl)
      }
    }
  }, [profileImagePreviewUrl])

  function handleProfileImagePick(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ""
    if (!file) return

    if (!file.type.startsWith("image/")) {
      setStepError("이미지 파일만 업로드할 수 있습니다.")
      return
    }
    if (file.size > MAX_PROFILE_IMAGE_SIZE_BYTES) {
      setStepError("이미지는 5MB 이하만 업로드할 수 있습니다.")
      return
    }

    setStepError(null)
    const nextPreviewUrl = URL.createObjectURL(file)
    setProfileImageFile(file)
    setProfileImagePreviewUrl((prev) => {
      if (prev?.startsWith("blob:")) URL.revokeObjectURL(prev)
      return nextPreviewUrl
    })
  }

  async function uploadProfileImage(address: string, file: File) {
    const extFromName = file.name.split(".").pop()?.toLowerCase()
    const extension =
      extFromName && /^[a-z0-9]+$/.test(extFromName) ? extFromName : "jpg"
    const path = `profiles/avatar/${address}/${Date.now()}-${crypto.randomUUID()}.${extension}`

    const { error } = await supabase.storage
      .from(PROFILE_IMAGE_BUCKET)
      .upload(path, file, { cacheControl: "3600", upsert: true })
    if (error) throw new Error(error.message)

    const { data } = supabase.storage.from(PROFILE_IMAGE_BUCKET).getPublicUrl(path)
    if (!data.publicUrl) throw new Error("프로필 이미지 URL을 생성하지 못했습니다.")
    return data.publicUrl
  }

  async function handleNext() {
    const validationError = getStepError(step)
    if (validationError) {
      setStepError(validationError)
      return
    }

    setStepError(null)
    setSaveError(null)

    if (step === 1) {
      setSaving(true)
      try {
        const available = await isUsernameAvailable(
          form.nickname,
          currentAccount?.address
        )
        if (!available) {
          setStepError("ID is already taken. Please choose another one.")
          return
        }
        setStep(2)
      } catch {
        setStepError("Failed to validate username. Please try again.")
      } finally {
        setSaving(false)
      }
      return
    }

    if (step < STEP_COUNT) {
      setStep((s) => s + 1)
      return
    }

    // 마지막 단계: 지갑 주소를 PK로 프로필을 Supabase에 저장 (= 회원가입 완료)
    const address = currentAccount?.address
    if (!address) {
      setSaveError("Wallet not connected. Please reconnect.")
      router.replace("/onboarding")
      return
    }

    setSaving(true)
    try {
      const uploadedProfileImageUrl =
        profileImageFile ?
          await uploadProfileImage(address, profileImageFile)
        : undefined

      await saveProfile(address, {
        display_name: form.displayName,
        image_url: uploadedProfileImageUrl,
        username: form.nickname,
        genres: form.genres,
        language: form.language,
        age_group: form.ageGroup,
        visibility: form.visibility,
        agree_privacy: form.agreePrivacy,
        agree_marketing: form.agreeMarketing,
      })
      router.push("/onboarding/account")
    } catch (e) {
      if (e instanceof Error && e.message === "USERNAME_TAKEN") {
        setSaveError("ID is already taken. Please choose another one.")
      } else {
        setSaveError("Failed to save profile. Please try again.")
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4 pt-6">
      {/* Header */}
      <AppHeader
        left={
          <button
            onClick={() => (step > 1 ? setStep((s) => s - 1) : router.back())}
            className="flex size-9 items-center justify-center rounded-full text-grey-700 hover:bg-grey-100 dark:text-grey-300 dark:hover:bg-grey-800"
            aria-label="Back"
          >
            <ChevronLeft size={20} />
          </button>
        }
        title="Set Up Profile"
        right={
          <span className="text-sm text-grey-400">
            {step}/{STEP_COUNT}
          </span>
        }
      />

      {/* Step progress bar */}
      <div className="flex gap-1.5 px-6 pb-6">
        {Array.from({ length: STEP_COUNT }).map((_, i) => (
          <div
            key={i}
            className={cn(
              "h-1 flex-1 rounded-full transition-colors duration-300",
              i < step ? "bg-brand" : "bg-grey-200 dark:bg-grey-700"
            )}
          />
        ))}
      </div>

      {/* Step content */}
      <div className="flex-1 overflow-y-auto px-6 pb-36">
        {step === 1 && (
          <Step1
            form={form}
            setForm={setForm}
            profileImagePreviewUrl={profileImagePreviewUrl}
            onPickProfileImage={handleProfileImagePick}
          />
        )}
        {step === 2 && (
          <Step2 form={form} setForm={setForm} toggleGenre={toggleGenre} />
        )}
        {step === 3 && <Step3 form={form} setForm={setForm} />}
      </div>

      {/* Bottom CTA */}
      <div className="fixed right-0 bottom-0 left-0 space-y-1 border-t border-grey-100 bg-white/90 px-6 pt-4 pb-8 backdrop-blur dark:border-grey-800 dark:bg-grey-900/90">
        {(stepError ?? saveError) && (
          <p className="text-center text-xs text-red-600 dark:text-red-400">
            {stepError ?? saveError}
          </p>
        )}
        <Button
          onClick={handleNext}
          disabled={saving}
          size="xl"
          className={cn(
            "w-full",
            canNext() && !saving
              ? "bg-brand active:opacity-80"
              : "bg-grey-300 dark:bg-grey-700"
          )}
        >
          {saving ? "Saving..." : step < STEP_COUNT ? "Continue" : "Done"}
        </Button>
      </div>
    </div>
  )
}

// ── Step 1: Basic info ────────────────────────────────────────
function Step1({
  form,
  setForm,
  profileImagePreviewUrl,
  onPickProfileImage,
}: {
  form: ProfileForm
  setForm: React.Dispatch<React.SetStateAction<ProfileForm>>
  profileImagePreviewUrl: string | null
  onPickProfileImage: (event: ChangeEvent<HTMLInputElement>) => void
}) {
  return (
    <div className="space-y-6">
      <div>
        <p className="text-xl font-bold text-grey-900 dark:text-white">
          Basic information
        </p>
        <p className="mt-1 text-sm text-grey-500">
          This is how others will see you in chats
        </p>
      </div>

      {/* Profile image */}
      <div className="flex justify-center">
        <div>
          <input
            id="profile-image-input"
            type="file"
            accept="image/*"
            className="hidden"
            onChange={onPickProfileImage}
          />
          <label
            htmlFor="profile-image-input"
            className="group relative flex size-20 cursor-pointer items-center justify-center overflow-hidden rounded-full bg-grey-100 dark:bg-grey-800"
          >
            {profileImagePreviewUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={profileImagePreviewUrl}
                alt="Profile preview"
                className="size-full object-cover"
              />
            ) : (
              <Camera
                size={24}
                className="text-grey-400 transition-colors group-hover:text-grey-600"
              />
            )}
            <div className="absolute inset-0 rounded-full ring-2 ring-grey-200 transition-all group-hover:ring-brand/50 dark:ring-grey-700" />
          </label>
        </div>
      </div>

      {/* Nickname (display_name) */}
      <div className="space-y-1.5">
        <label className="text-sm font-medium text-grey-700 dark:text-grey-300">
          Nickname <span className="text-brand">*</span>
        </label>
        <input
          value={form.displayName}
          onChange={(e) =>
            setForm((f) => ({ ...f, displayName: e.target.value }))
          }
          placeholder="Nickname shown to others"
          maxLength={20}
          className={cn(
            "h-12 w-full rounded-xl border border-grey-200 bg-grey-50 px-4 text-sm text-grey-900 placeholder-grey-400 transition-colors outline-none",
            "focus:border-brand focus:bg-white",
            "dark:border-grey-700 dark:bg-grey-800 dark:text-white dark:placeholder-grey-500 dark:focus:bg-grey-800"
          )}
        />
        <p className="text-right text-xs text-grey-400">
          {form.displayName.length}/20
        </p>
      </div>

      {/* ID (username) */}
      <div className="space-y-1.5">
        <label className="text-sm font-medium text-grey-700 dark:text-grey-300">
          ID <span className="text-brand">*</span>
        </label>
        <div
          className={cn(
            "flex h-12 items-center gap-1 rounded-xl border border-grey-200 bg-grey-50 px-4 transition-colors",
            "focus-within:border-brand focus-within:bg-white",
            "dark:border-grey-700 dark:bg-grey-800 dark:focus-within:bg-grey-800"
          )}
        >
          <span className="text-grey-400 select-none">@</span>
          <input
            value={form.nickname}
            onChange={(e) =>
              setForm((f) => ({
                ...f,
                nickname: e.target.value.replace(/[^a-zA-Z0-9_]/g, ""),
              }))
            }
            placeholder="letters, numbers, underscores only"
            maxLength={20}
            className="flex-1 bg-transparent text-sm text-grey-900 placeholder-grey-400 outline-none dark:text-white dark:placeholder-grey-500"
          />
        </div>
        <p className="text-xs text-grey-400">
          Letters, numbers, and underscores (_) only
        </p>
      </div>
    </div>
  )
}

// ── Step 2: Preferences ───────────────────────────────────────
function Step2({
  form,
  setForm,
  toggleGenre,
}: {
  form: ProfileForm
  setForm: React.Dispatch<React.SetStateAction<ProfileForm>>
  toggleGenre: (g: string) => void
}) {
  return (
    <div className="space-y-8">
      <div>
        <p className="text-xl font-bold text-grey-900 dark:text-white">
          Your preferences
        </p>
        <p className="mt-1 text-sm text-grey-500">
          We&apos;ll use this to recommend characters
        </p>
      </div>

      {/* Genres */}
      <div className="space-y-3">
        <label className="text-sm font-medium text-grey-700 dark:text-grey-300">
          Favorite genres <span className="text-brand">*</span>
          <span className="ml-1 font-normal text-grey-400">(pick any)</span>
        </label>
        <div className="flex flex-wrap gap-2">
          {GENRES.map((genre) => {
            const active = form.genres.includes(genre)
            return (
              <button
                key={genre}
                onClick={() => toggleGenre(genre)}
                className={cn(
                  "rounded-full px-4 py-2 text-sm font-medium transition-colors",
                  active
                    ? "bg-brand text-white"
                    : "bg-grey-100 text-grey-700 hover:bg-grey-200 dark:bg-grey-800 dark:text-grey-300 dark:hover:bg-grey-700"
                )}
              >
                {genre}
              </button>
            )
          })}
        </div>
      </div>

      {/* Language */}
      <div className="space-y-3">
        <label className="text-sm font-medium text-grey-700 dark:text-grey-300">
          Preferred language
        </label>
        <div className="flex gap-2">
          {LANG_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setForm((f) => ({ ...f, language: opt.value }))}
              className={cn(
                "h-11 flex-1 rounded-xl text-sm font-medium transition-colors",
                form.language === opt.value
                  ? "bg-brand text-white"
                  : "bg-grey-100 text-grey-700 dark:bg-grey-800 dark:text-grey-300"
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Age group */}
      <div className="space-y-3">
        <label className="text-sm font-medium text-grey-700 dark:text-grey-300">
          Age group <span className="text-brand">*</span>
        </label>
        <div className="grid grid-cols-4 gap-2">
          {AGE_GROUPS.map((age) => (
            <button
              key={age}
              onClick={() => setForm((f) => ({ ...f, ageGroup: age }))}
              className={cn(
                "h-11 rounded-xl text-sm font-medium transition-colors",
                form.ageGroup === age
                  ? "bg-brand text-white"
                  : "bg-grey-100 text-grey-700 dark:bg-grey-800 dark:text-grey-300"
              )}
            >
              {age}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── Step 3: Visibility & consent ──────────────────────────────
function Step3({
  form,
  setForm,
}: {
  form: ProfileForm
  setForm: React.Dispatch<React.SetStateAction<ProfileForm>>
}) {
  const VISIBILITY_OPTIONS = [
    {
      value: "public" as const,
      label: "Public",
      desc: "Anyone can view your profile",
    },
    {
      value: "followers" as const,
      label: "Followers only",
      desc: "Only people you follow can see it",
    },
    {
      value: "private" as const,
      label: "Private",
      desc: "Only you can see it",
    },
  ]

  return (
    <div className="space-y-8">
      <div>
        <p className="text-xl font-bold text-grey-900 dark:text-white">
          Almost there!
        </p>
        <p className="mt-1 text-sm text-grey-500">
          Set your visibility and agree to our terms
        </p>
      </div>

      {/* Visibility */}
      <div className="space-y-3">
        <label className="text-sm font-medium text-grey-700 dark:text-grey-300">
          Profile visibility
        </label>
        <div className="flex flex-col gap-2">
          {VISIBILITY_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setForm((f) => ({ ...f, visibility: opt.value }))}
              className={cn(
                "flex items-center gap-3 rounded-xl border p-4 text-left transition-colors",
                form.visibility === opt.value
                  ? "border-brand bg-brand-lightest dark:bg-brand/10"
                  : "border-grey-200 bg-grey-50 dark:border-grey-700 dark:bg-grey-800"
              )}
            >
              <div
                className={cn(
                  "flex size-5 flex-shrink-0 items-center justify-center rounded-full border-2",
                  form.visibility === opt.value
                    ? "border-brand bg-brand"
                    : "border-grey-300 dark:border-grey-600"
                )}
              >
                {form.visibility === opt.value && (
                  <div className="size-2 rounded-full bg-white" />
                )}
              </div>
              <div>
                <p className="text-sm font-semibold text-grey-900 dark:text-white">
                  {opt.label}
                </p>
                <p className="text-xs text-grey-500 dark:text-grey-400">
                  {opt.desc}
                </p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Consent */}
      <div className="space-y-3">
        <label className="text-sm font-medium text-grey-700 dark:text-grey-300">
          Agreements
        </label>
        <div className="divide-y divide-grey-100 overflow-hidden rounded-xl border border-grey-200 dark:divide-grey-800 dark:border-grey-700">
          {/* Required */}
          <button
            onClick={() =>
              setForm((f) => ({ ...f, agreePrivacy: !f.agreePrivacy }))
            }
            className="flex w-full items-center gap-3 px-4 py-4 text-left transition-colors hover:bg-grey-50 dark:hover:bg-grey-800"
          >
            <div
              className={cn(
                "flex size-5 flex-shrink-0 items-center justify-center rounded border transition-colors",
                form.agreePrivacy
                  ? "border-brand bg-brand"
                  : "border-grey-300 dark:border-grey-600"
              )}
            >
              {form.agreePrivacy && (
                <svg width="12" height="9" viewBox="0 0 12 9" fill="none">
                  <path
                    d="M1 4L4.5 7.5L11 1"
                    stroke="white"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <span className="text-sm text-grey-900 dark:text-white">
                <span className="font-medium text-brand">[Required]</span>{" "}
                Privacy Policy & Data Collection
              </span>
            </div>
            <span className="flex-shrink-0 text-xs text-grey-400">View</span>
          </button>

          {/* Optional */}
          <button
            onClick={() =>
              setForm((f) => ({ ...f, agreeMarketing: !f.agreeMarketing }))
            }
            className="flex w-full items-center gap-3 px-4 py-4 text-left transition-colors hover:bg-grey-50 dark:hover:bg-grey-800"
          >
            <div
              className={cn(
                "flex size-5 flex-shrink-0 items-center justify-center rounded border transition-colors",
                form.agreeMarketing
                  ? "border-brand bg-brand"
                  : "border-grey-300 dark:border-grey-600"
              )}
            >
              {form.agreeMarketing && (
                <svg width="12" height="9" viewBox="0 0 12 9" fill="none">
                  <path
                    d="M1 4L4.5 7.5L11 1"
                    stroke="white"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <span className="text-sm text-grey-900 dark:text-white">
                <span className="font-medium text-grey-500">[Optional]</span>{" "}
                Marketing communications
              </span>
            </div>
            <span className="flex-shrink-0 text-xs text-grey-400">View</span>
          </button>
        </div>
      </div>
    </div>
  )
}
