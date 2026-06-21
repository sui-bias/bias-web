"use client"

import { useMemo, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { ChevronDown, ImagePlus, Trash2, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { useCurrentUser } from "@/hooks/use-current-user"
import { resizeAndUpload } from "@/lib/storage"
import {
  createCharacter,
  deleteCharacter,
  updateCharacter,
} from "@/lib/characters"
import {
  AFFINITY_LEVELS,
  MBTI_TYPES,
  NATIVE_LANGUAGE_OPTIONS,
  VISIBILITY_OPTIONS,
  type Affinity,
  type CharacterDraft,
  type Visibility,
} from "@/lib/types"

const INPUT =
  "h-11 w-full rounded-xl border border-grey-200 bg-white px-3 text-sm text-grey-900 outline-none focus:border-brand dark:border-grey-700 dark:bg-grey-800 dark:text-white"
const TEXTAREA =
  "w-full rounded-xl border border-grey-200 bg-white px-3 py-2 text-sm text-grey-900 outline-none focus:border-brand dark:border-grey-700 dark:bg-grey-800 dark:text-white"

// 동적 클래스가 Tailwind 스캔에 잡히도록 레벨별 전체 리터럴을 둔다.
const AFFINITY_STYLES: Record<Affinity, string> = {
  1: "border-affinity-1 bg-affinity-1-bg text-affinity-1",
  2: "border-affinity-2 bg-affinity-2-bg text-affinity-2",
  3: "border-affinity-3 bg-affinity-3-bg text-affinity-3",
  4: "border-affinity-4 bg-affinity-4-bg text-affinity-4",
}

type CharacterFormProps = {
  mode?: "create" | "edit"
  /** edit 모드일 때 대상 캐릭터 id (update/delete 용) */
  characterId?: string
  initial?: Partial<CharacterDraft>
  submitLabel?: string
  /** free / plus 한도초과 등 플랜 게이트. 사유가 있으면 저장 비활성. */
  blockedReason?: string
  /** edit 모드에서 삭제 버튼 노출 (소유자 전용) */
  deletable?: boolean
}

export function CharacterForm({
  mode = "create",
  characterId,
  initial,
  submitLabel,
  blockedReason,
  deletable,
}: CharacterFormProps) {
  const router = useRouter()
  const { address } = useCurrentUser()
  const [imageUrl, setImageUrl] = useState(initial?.imageUrl ?? "")
  const [name, setName] = useState(initial?.display_name ?? "")
  const [age, setAge] = useState(initial?.age ? String(initial.age) : "")
  const [job, setJob] = useState(initial?.job ?? "")
  const [intro, setIntro] = useState(initial?.intro ?? "")
  const [narrative, setNarrative] = useState(initial?.narrative ?? "")

  const [background, setBackground] = useState(initial?.background ?? "")
  const [family, setFamily] = useState(initial?.family ?? "")
  const [mbti, setMbti] = useState(initial?.mbti ?? "")
  const [height, setHeight] = useState(initial?.height ?? "")
  const [nativeLanguage, setNativeLanguage] = useState(
    initial?.nativeLanguage ?? ""
  )

  const [traits, setTraits] = useState(initial?.traits ?? "")
  const [speechHabits, setSpeechHabits] = useState(initial?.speechHabits ?? "")
  const [textingStyle, setTextingStyle] = useState(initial?.textingStyle ?? "")

  const [likes, setLikes] = useState<string[]>(initial?.likes ?? [])
  const [dislikes, setDislikes] = useState<string[]>(initial?.dislikes ?? [])
  const [hidden, setHidden] = useState(initial?.hidden ?? "")
  const [bannedTopics, setBannedTopics] = useState<string[]>(
    initial?.bannedTopics ?? []
  )

  const [firstSituation, setFirstSituation] = useState(
    initial?.firstSituation ?? ""
  )
  const [firstMessage, setFirstMessage] = useState(initial?.firstMessage ?? "")

  const [affinityStart, setAffinityStart] = useState<Affinity>(
    initial?.affinityStart ?? 1
  )
  const [visibility, setVisibility] = useState<Visibility>(
    initial?.visibility ?? "public"
  )

  const [advancedOpen, setAdvancedOpen] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [saving, setSaving] = useState(false)
  const [imgUploading, setImgUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const errors = useMemo(() => {
    const next: Record<string, string> = {}
    if (!name.trim()) next.name = "Please enter a name."
    else if (name.trim().length > 20) next.name = "Name must be 20 characters or fewer."
    if (!intro.trim()) next.intro = "Please enter a short intro."
    else if (intro.trim().length > 40)
      next.intro = "Intro must be 40 characters or fewer."
    if (!traits.trim()) next.traits = "Please enter a personality."
    return next
  }, [name, intro, traits])

  const hasErrors = Object.keys(errors).length > 0
  const canSubmit = !hasErrors && !blockedReason && !imgUploading

  function buildDraft(): CharacterDraft {
    return {
      display_name: name.trim(),
      imageUrl: imageUrl || undefined,
      age: age ? Number(age) : undefined,
      job: job.trim() || undefined,
      nativeLanguage: nativeLanguage || undefined,
      narrative: narrative.trim() || undefined,
      intro: intro.trim(),
      background: background.trim() || undefined,
      family: family.trim() || undefined,
      mbti: mbti || undefined,
      height: height.trim() || undefined,
      traits: traits.trim(),
      speechHabits: speechHabits.trim() || undefined,
      textingStyle: textingStyle.trim() || undefined,
      likes,
      dislikes,
      hidden: hidden.trim() || undefined,
      bannedTopics,
      firstSituation: firstSituation.trim() || undefined,
      firstMessage: firstMessage.trim() || undefined,
      affinityStart,
      visibility,
    }
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setSubmitted(true)
    if (!canSubmit || saving) return
    if (!address) {
      setError("Connect your wallet to save a character.")
      return
    }

    setSaving(true)
    setError(null)
    const draft = buildDraft()
    try {
      if (mode === "edit" && characterId) {
        await updateCharacter(characterId, draft)
      } else {
        await createCharacter(draft, address)
      }
      router.push("/character")
      router.refresh()
    } catch (e) {
      setSaving(false)
      setError(e instanceof Error ? e.message : "Failed to save.")
    }
  }

  async function handleImageChange(
    event: React.ChangeEvent<HTMLInputElement>
  ) {
    const file = event.target.files?.[0]
    if (!file) return
    setImgUploading(true)
    setError(null)
    try {
      const url = await resizeAndUpload(file, "characters")
      setImageUrl(url)
    } catch {
      setError("Failed to upload image.")
    } finally {
      setImgUploading(false)
    }
  }

  async function handleDelete() {
    if (!characterId) return
    if (
      !window.confirm(
        "Delete this character? Active rooms will show a deletion notice."
      )
    ) {
      return
    }
    setSaving(true)
    setError(null)
    try {
      await deleteCharacter(characterId)
      router.push("/character")
      router.refresh()
    } catch (e) {
      setSaving(false)
      setError(e instanceof Error ? e.message : "Failed to delete.")
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 px-4 pb-40">
      {/* Profile */}
      <SectionImage
        imageUrl={imageUrl}
        onChange={handleImageChange}
        uploading={imgUploading}
      />

      <Section title="Profile">
        <Field label="Name" required error={submitted ? errors.name : undefined}>
          <input
            className={INPUT}
            placeholder="Character name"
            maxLength={20}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Age">
            <input
              type="number"
              inputMode="numeric"
              className={INPUT}
              placeholder="20"
              value={age}
              onChange={(e) => setAge(e.target.value)}
            />
          </Field>
          <Field label="Job">
            <input
              className={INPUT}
              placeholder="College student"
              value={job}
              onChange={(e) => setJob(e.target.value)}
            />
          </Field>
        </div>
        <Field
          label="Short intro"
          required
          hint="Shown as your profile status message."
          error={submitted ? errors.intro : undefined}
        >
          <input
            className={INPUT}
            placeholder="An ordinary student who watches over the neighborhood at night"
            maxLength={40}
            value={intro}
            onChange={(e) => setIntro(e.target.value)}
          />
        </Field>
        <Field label="Story / background">
          <textarea
            rows={3}
            className={TEXTAREA}
            placeholder="Write the character's backstory."
            value={narrative}
            onChange={(e) => setNarrative(e.target.value)}
          />
        </Field>
      </Section>

      {/* Basics */}
      <Section title="Basics">
        <Field label="Origin / background">
          <textarea
            rows={2}
            className={TEXTAREA}
            placeholder="Grew up in Queens, now a college student."
            value={background}
            onChange={(e) => setBackground(e.target.value)}
          />
        </Field>
        <Field label="Family">
          <input
            className={INPUT}
            placeholder="Lives with Aunt May."
            value={family}
            onChange={(e) => setFamily(e.target.value)}
          />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="MBTI">
            <select
              className={cn(INPUT, "appearance-none")}
              value={mbti}
              onChange={(e) => setMbti(e.target.value)}
            >
              <option value="">None</option>
              {MBTI_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Height">
            <input
              className={INPUT}
              placeholder="178cm"
              value={height}
              onChange={(e) => setHeight(e.target.value)}
            />
          </Field>
        </div>

        <button
          type="button"
          onClick={() => setAdvancedOpen((v) => !v)}
          className="flex items-center gap-1 text-xs font-semibold text-grey-500 dark:text-grey-400"
        >
          Advanced
          <ChevronDown
            size={14}
            className={cn("transition-transform", advancedOpen && "rotate-180")}
          />
        </button>
        {advancedOpen ? (
          <Field
            label="Native language (voice nuance)"
            hint="Sets speech nuance, separate from output language."
          >
            <select
              className={cn(INPUT, "appearance-none")}
              value={nativeLanguage}
              onChange={(e) => setNativeLanguage(e.target.value)}
            >
              <option value="">None</option>
              {NATIVE_LANGUAGE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </Field>
        ) : null}
      </Section>

      {/* Personality·말투 */}
      <Section title="Personality & speech">
        <Field
          label="Personality"
          required
          error={submitted ? errors.traits : undefined}
        >
          <textarea
            rows={3}
            className={TEXTAREA}
            placeholder="Once warmed up, bright, chatty, and witty. Responsible and caring."
            value={traits}
            onChange={(e) => setTraits(e.target.value)}
          />
        </Field>
        <Field label="Speech / verbal habits">
          <textarea
            rows={3}
            className={TEXTAREA}
            placeholder={
              "- Polite with strangers, quickly warms up to a casual tone.\n- 'haha' after jokes, 'whoa' when surprised."
            }
            value={speechHabits}
            onChange={(e) => setSpeechHabits(e.target.value)}
          />
        </Field>
        <Field label="Texting style" hint="Message length, bubble splitting, etc.">
          <textarea
            rows={2}
            className={TEXTAREA}
            placeholder="Short, 1-2 lines. Up to 3 when excited. Splits into bubbles."
            value={textingStyle}
            onChange={(e) => setTextingStyle(e.target.value)}
          />
        </Field>
      </Section>

      {/* Details */}
      <Section title="Details">
        <Field label="Likes">
          <TagInput
            value={likes}
            onChange={setLikes}
            placeholder="Type and press Enter to add"
          />
        </Field>
        <Field label="Dislikes">
          <TagInput
            value={dislikes}
            onChange={setDislikes}
            placeholder="Type and press Enter to add"
          />
        </Field>
        <Field
          label="Secret (never revealed)"
          hint="Something the character never reveals, even when close."
        >
          <input
            className={INPUT}
            placeholder="Never directly admits being Spider-Man."
            value={hidden}
            onChange={(e) => setHidden(e.target.value)}
          />
        </Field>
        <Field label="Banned topics" hint="Topics to avoid in conversation.">
          <TagInput
            value={bannedTopics}
            onChange={setBannedTopics}
            placeholder="Type and press Enter to add"
          />
        </Field>
      </Section>

      {/* First chat */}
      <Section title="First chat">
        <Field label="Opening situation">
          <textarea
            rows={2}
            className={TEXTAREA}
            placeholder="Just exchanged contacts for a team project. Still a bit awkward."
            value={firstSituation}
            onChange={(e) => setFirstSituation(e.target.value)}
          />
        </Field>
        <Field label="First message" hint="The character's opening line when you enter the room.">
          <textarea
            rows={2}
            className={TEXTAREA}
            placeholder="Hey! This is Peter, we swapped contacts in the project group. Looking forward to it!"
            value={firstMessage}
            onChange={(e) => setFirstMessage(e.target.value)}
          />
        </Field>
      </Section>

      {/* Relationship */}
      <Section title="Relationship">
        <Field label="Starting affinity">
          <div className="grid grid-cols-4 gap-2">
            {AFFINITY_LEVELS.map((lv) => {
              const active = affinityStart === lv.value
              return (
                <button
                  key={lv.value}
                  type="button"
                  onClick={() => setAffinityStart(lv.value)}
                  className={cn(
                    "h-10 rounded-xl border text-sm font-semibold transition-colors",
                    active
                      ? AFFINITY_STYLES[lv.value]
                      : "border-grey-200 text-grey-500 dark:border-grey-700 dark:text-grey-400"
                  )}
                >
                  {lv.label}
                </button>
              )
            })}
          </div>
        </Field>
        <Field label="Visibility" required>
          <div className="grid grid-cols-3 gap-2">
            {VISIBILITY_OPTIONS.map((opt) => {
              const active = visibility === opt.value
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setVisibility(opt.value)}
                  className={cn(
                    "h-10 rounded-xl border text-sm font-semibold transition-colors",
                    active
                      ? "border-brand bg-brand-lightest text-brand dark:bg-brand/10"
                      : "border-grey-200 text-grey-500 dark:border-grey-700 dark:text-grey-400"
                  )}
                >
                  {opt.label}
                </button>
              )
            })}
          </div>
        </Field>
      </Section>

      {/* 삭제 (edit 모드) */}
      {deletable ? (
        <button
          type="button"
          onClick={handleDelete}
          className="flex h-11 w-full items-center justify-center gap-1.5 rounded-xl border border-destructive/30 text-sm font-semibold text-destructive transition-colors hover:bg-destructive/10"
        >
          <Trash2 size={16} />
          Delete character
        </button>
      ) : null}

      {/* 저장 (고정 하단) */}
      <div className="fixed inset-x-0 bottom-16 z-30 mx-auto w-full max-w-md border-t border-grey-200 bg-white/95 p-4 backdrop-blur dark:border-grey-800 dark:bg-grey-900/95">
        {blockedReason ? (
          <p className="mb-2 text-center text-xs text-brand">{blockedReason}</p>
        ) : null}
        {error ? (
          <p className="mb-2 text-center text-xs text-brand">{error}</p>
        ) : null}
        <button
          type="submit"
          disabled={!canSubmit || saving}
          className="h-12 w-full rounded-xl bg-brand text-sm font-semibold text-white transition-opacity active:opacity-80 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {saving
            ? "Saving…"
            : (submitLabel ?? (mode === "edit" ? "Save changes" : "Create character"))}
        </button>
      </div>
    </form>
  )
}

function Section({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <section className="space-y-4">
      <h2 className="text-sm font-bold text-grey-900 dark:text-white">
        {title}
      </h2>
      {children}
    </section>
  )
}

function Field({
  label,
  required,
  hint,
  error,
  children,
}: {
  label: string
  required?: boolean
  hint?: string
  error?: string
  children: React.ReactNode
}) {
  return (
    <div className="space-y-1.5">
      <label className="flex items-center gap-1 text-xs font-semibold text-grey-600 dark:text-grey-300">
        {label}
        {required ? <span className="text-brand">*</span> : null}
      </label>
      {children}
      {error ? (
        <p className="text-xs text-brand">{error}</p>
      ) : hint ? (
        <p className="text-xs text-grey-400 dark:text-grey-500">{hint}</p>
      ) : null}
    </div>
  )
}

function SectionImage({
  imageUrl,
  onChange,
  uploading,
}: {
  imageUrl: string
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => void
  uploading?: boolean
}) {
  const inputRef = useRef<HTMLInputElement>(null)

  return (
    <div className="flex justify-center pt-2">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="relative flex size-24 items-center justify-center overflow-hidden rounded-full border border-grey-200 bg-grey-100 text-grey-400 dark:border-grey-700 dark:bg-grey-800"
        aria-label="Add character photo"
      >
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imageUrl}
            alt=""
            className="size-full object-cover"
          />
        ) : (
          <ImagePlus size={24} />
        )}
        {uploading ? (
          <span className="absolute inset-0 flex items-center justify-center bg-black/40">
            <span className="size-5 animate-spin rounded-full border-2 border-white/70 border-t-white" />
          </span>
        ) : null}
        <span className="absolute right-0 bottom-0 flex size-7 items-center justify-center rounded-full border-2 border-white bg-brand text-white dark:border-grey-900">
          <ImagePlus size={14} />
        </span>
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={onChange}
      />
    </div>
  )
}

function TagInput({
  value,
  onChange,
  placeholder,
}: {
  value: string[]
  onChange: (next: string[]) => void
  placeholder?: string
}) {
  const [draft, setDraft] = useState("")

  function add() {
    const trimmed = draft.trim()
    if (!trimmed || value.includes(trimmed)) {
      setDraft("")
      return
    }
    onChange([...value, trimmed])
    setDraft("")
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    // 한글/일어 IME 조합 중 Enter는 글자 확정용 → add 하지 않는다(중복 입력 방지).
    if (event.nativeEvent.isComposing) return
    if (event.key === "Enter" || event.key === ",") {
      event.preventDefault()
      add()
    } else if (event.key === "Backspace" && !draft && value.length) {
      onChange(value.slice(0, -1))
    }
  }

  return (
    <div className="space-y-2">
      <input
        className={INPUT}
        placeholder={placeholder}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={add}
      />
      {value.length ? (
        <div className="flex flex-wrap gap-2">
          {value.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center gap-1 rounded-full bg-brand-lightest px-3 py-1 text-xs font-medium text-brand dark:bg-brand/10"
            >
              {tag}
              <button
                type="button"
                onClick={() => onChange(value.filter((t) => t !== tag))}
                aria-label={`Remove ${tag}`}
                className="text-brand/70 hover:text-brand"
              >
                <X size={12} />
              </button>
            </span>
          ))}
        </div>
      ) : null}
    </div>
  )
}
