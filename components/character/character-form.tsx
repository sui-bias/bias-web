"use client"

import { useMemo, useRef, useState } from "react"
import { ChevronDown, ImagePlus, Trash2, X } from "lucide-react"
import { cn } from "@/lib/utils"
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
  initial?: Partial<CharacterDraft>
  submitLabel?: string
  /** free / plus 한도초과 등 플랜 게이트. 사유가 있으면 저장 비활성. */
  blockedReason?: string
  /** edit 모드에서 삭제 버튼 노출 (소유자 전용) */
  deletable?: boolean
}

export function CharacterForm({
  mode = "create",
  initial,
  submitLabel,
  blockedReason,
  deletable,
}: CharacterFormProps) {
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
  const [saved, setSaved] = useState(false)

  const errors = useMemo(() => {
    const next: Record<string, string> = {}
    if (!name.trim()) next.name = "이름을 입력해 주세요."
    else if (name.trim().length > 20) next.name = "이름은 20자 이내여야 합니다."
    if (!intro.trim()) next.intro = "한 줄 소개를 입력해 주세요."
    else if (intro.trim().length > 40)
      next.intro = "한 줄 소개는 40자 이내여야 합니다."
    if (!traits.trim()) next.traits = "성격을 입력해 주세요."
    return next
  }, [name, intro, traits])

  const hasErrors = Object.keys(errors).length > 0
  const canSubmit = !hasErrors && !blockedReason

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

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setSubmitted(true)
    if (!canSubmit) return

    const draft = buildDraft()
    // TODO(api): 캐릭터 생성/수정 API 연동. 현재는 콘솔 출력으로 대체.
    console.log("character draft", draft)
    setSaved(true)
  }

  function handleImageChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (file) setImageUrl(URL.createObjectURL(file))
  }

  function handleDelete() {
    // TODO(api): 삭제/복구 가능 기간 처리. 현재는 확인 후 콘솔 출력만.
    if (!window.confirm("이 캐릭터를 삭제할까요? 진행 중인 방에는 삭제 안내가 표시됩니다.")) {
      return
    }
    console.log("delete character", initial?.display_name)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 px-4 pb-28">
      {/* 프로필 */}
      <SectionImage imageUrl={imageUrl} onChange={handleImageChange} />

      <Section title="프로필">
        <Field label="이름" required error={submitted ? errors.name : undefined}>
          <input
            className={INPUT}
            placeholder="캐릭터 이름"
            maxLength={20}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="나이">
            <input
              type="number"
              inputMode="numeric"
              className={INPUT}
              placeholder="20"
              value={age}
              onChange={(e) => setAge(e.target.value)}
            />
          </Field>
          <Field label="직업">
            <input
              className={INPUT}
              placeholder="대학생"
              value={job}
              onChange={(e) => setJob(e.target.value)}
            />
          </Field>
        </div>
        <Field
          label="한 줄 소개"
          required
          hint="프로필 상태 메시지로 보여집니다."
          error={submitted ? errors.intro : undefined}
        >
          <input
            className={INPUT}
            placeholder="밤마다 동네를 지키는 평범한 대학생"
            maxLength={40}
            value={intro}
            onChange={(e) => setIntro(e.target.value)}
          />
        </Field>
        <Field label="서사 / 배경 스토리">
          <textarea
            rows={3}
            className={TEXTAREA}
            placeholder="캐릭터의 서사를 적어주세요."
            value={narrative}
            onChange={(e) => setNarrative(e.target.value)}
          />
        </Field>
      </Section>

      {/* 기본 설정 */}
      <Section title="기본 설정">
        <Field label="출신 / 배경">
          <textarea
            rows={2}
            className={TEXTAREA}
            placeholder="뉴욕 퀸스에서 자랐고, 지금은 대학생."
            value={background}
            onChange={(e) => setBackground(e.target.value)}
          />
        </Field>
        <Field label="가족">
          <input
            className={INPUT}
            placeholder="메이 숙모와 함께 산다."
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
              <option value="">선택 안 함</option>
              {MBTI_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </Field>
          <Field label="키">
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
          고급 설정
          <ChevronDown
            size={14}
            className={cn("transition-transform", advancedOpen && "rotate-180")}
          />
        </button>
        {advancedOpen ? (
          <Field
            label="모국어 (말투 뉘앙스)"
            hint="출력 언어와 별개로 캐릭터의 말투 결을 정합니다."
          >
            <select
              className={cn(INPUT, "appearance-none")}
              value={nativeLanguage}
              onChange={(e) => setNativeLanguage(e.target.value)}
            >
              <option value="">선택 안 함</option>
              {NATIVE_LANGUAGE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </Field>
        ) : null}
      </Section>

      {/* 성격·말투 */}
      <Section title="성격 · 말투">
        <Field
          label="성격"
          required
          error={submitted ? errors.traits : undefined}
        >
          <textarea
            rows={3}
            className={TEXTAREA}
            placeholder="친해지면 밝고 수다스럽고 위트 있다. 책임감이 강하고 다정하다."
            value={traits}
            onChange={(e) => setTraits(e.target.value)}
          />
        </Field>
        <Field label="말투 / 언어 습관">
          <textarea
            rows={3}
            className={TEXTAREA}
            placeholder={
              "- 처음 본 사람에겐 정중하지만, 금세 편한 말투로 바뀐다.\n- 농담 뒤엔 'ㅎㅎ', 놀라면 '헐'."
            }
            value={speechHabits}
            onChange={(e) => setSpeechHabits(e.target.value)}
          />
        </Field>
        <Field label="채팅 스타일" hint="메시지 길이, 버블 분리 습관 등.">
          <textarea
            rows={2}
            className={TEXTAREA}
            placeholder="짧게 1~2줄. 신나면 3줄까지. 버블을 나눠 보낸다."
            value={textingStyle}
            onChange={(e) => setTextingStyle(e.target.value)}
          />
        </Field>
      </Section>

      {/* 디테일 */}
      <Section title="디테일">
        <Field label="좋아하는 것">
          <TagInput
            value={likes}
            onChange={setLikes}
            placeholder="입력 후 Enter로 추가"
          />
        </Field>
        <Field label="싫어하는 것">
          <TagInput
            value={dislikes}
            onChange={setDislikes}
            placeholder="입력 후 Enter로 추가"
          />
        </Field>
        <Field
          label="비밀 (드러내지 않음)"
          hint="친해져도 캐릭터가 직접 밝히지 않는 설정."
        >
          <input
            className={INPUT}
            placeholder="자신이 스파이더맨이라는 사실을 직접 말하지 않는다."
            value={hidden}
            onChange={(e) => setHidden(e.target.value)}
          />
        </Field>
        <Field label="금지 주제" hint="대화에서 피해야 할 주제.">
          <TagInput
            value={bannedTopics}
            onChange={setBannedTopics}
            placeholder="입력 후 Enter로 추가"
          />
        </Field>
      </Section>

      {/* 첫 대화 */}
      <Section title="첫 대화">
        <Field label="첫 상황">
          <textarea
            rows={2}
            className={TEXTAREA}
            placeholder="팀 프로젝트로 막 연락처를 교환한 상황. 아직 서먹하다."
            value={firstSituation}
            onChange={(e) => setFirstSituation(e.target.value)}
          />
        </Field>
        <Field label="첫 메시지" hint="방 입장 시 캐릭터가 먼저 보내는 말.">
          <textarea
            rows={2}
            className={TEXTAREA}
            placeholder="안녕! 아까 프로젝트 단톡에서 연락처 교환한 피터야. 잘 부탁해!"
            value={firstMessage}
            onChange={(e) => setFirstMessage(e.target.value)}
          />
        </Field>
      </Section>

      {/* 관계 */}
      <Section title="관계">
        <Field label="시작 친밀도">
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
        <Field label="공개 범위" required>
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
          캐릭터 삭제
        </button>
      ) : null}

      {/* 저장 (고정 하단) */}
      <div className="fixed inset-x-0 bottom-0 z-20 mx-auto w-full max-w-md border-t border-grey-200 bg-white/95 p-4 backdrop-blur dark:border-grey-800 dark:bg-grey-900/95">
        {blockedReason ? (
          <p className="mb-2 text-center text-xs text-brand">{blockedReason}</p>
        ) : null}
        {saved ? (
          <p className="mb-2 text-center text-xs text-grey-500 dark:text-grey-400">
            저장되었습니다. (API 연동 전 — 콘솔 확인)
          </p>
        ) : null}
        <button
          type="submit"
          disabled={!canSubmit}
          className="h-12 w-full rounded-xl bg-brand text-sm font-semibold text-white transition-opacity active:opacity-80 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {submitLabel ?? (mode === "edit" ? "변경 저장" : "캐릭터 만들기")}
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
}: {
  imageUrl: string
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)

  return (
    <div className="flex justify-center pt-2">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="relative flex size-24 items-center justify-center overflow-hidden rounded-full border border-grey-200 bg-grey-100 text-grey-400 dark:border-grey-700 dark:bg-grey-800"
        aria-label="캐릭터 이미지 추가"
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
                aria-label={`${tag} 삭제`}
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
