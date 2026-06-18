import Link from "next/link"
import { MessageCircle, Pencil, UserPlus } from "lucide-react"
import { visibilityLabel, type Character } from "@/lib/types"
import { ProfileActionButton, ProfileHero } from "./profile-hero"

// 캐릭터 프로필 = 유저 프로필 레이아웃 + '친구 정보' 섹션.
// hidden / bannedTopics 같은 내부 설정은 노출하지 않는다.
export function CharacterProfileView({
  character,
}: {
  character: Character
}) {
  const meta = [
    character.age ? `${character.age}세` : null,
    character.job,
    character.mbti,
  ].filter(Boolean)

  return (
    <div>
      <ProfileHero
        name={character.name}
        intro={character.intro}
        imageUrl={character.imageUrl}
        backHref="/list"
        badge={
          <span className="flex size-4 items-center justify-center rounded-full bg-brand text-[9px] font-bold text-white">
            C
          </span>
        }
        actions={
          <>
            {/* chatCharacterId 있으면 실제 1:1 방으로, 없으면 준비중 */}
            <ProfileActionButton
              icon={MessageCircle}
              label={character.chatCharacterId ? "1:1 채팅" : "준비중"}
              href={
                character.chatCharacterId
                  ? `/chat/${character.chatCharacterId}`
                  : undefined
              }
              disabled={!character.chatCharacterId}
            />
            {/* TODO: 그룹 기능(M5) 연동 전까지 비활성 */}
            <ProfileActionButton icon={UserPlus} label="그룹에 추가" disabled />
          </>
        }
      />

      <section className="space-y-5 p-4">
        {/* 친구 정보 */}
        {meta.length ? (
          <p className="text-sm text-grey-600 dark:text-grey-300">
            {meta.join(" · ")}
          </p>
        ) : null}

        {character.narrative ? (
          <p className="text-sm leading-relaxed text-grey-700 dark:text-grey-200">
            {character.narrative}
          </p>
        ) : null}

        {character.likes.length ? (
          <div className="space-y-2">
            <p className="text-xs font-semibold text-grey-500 dark:text-grey-400">
              좋아하는 것
            </p>
            <div className="flex flex-wrap gap-2">
              {character.likes.map((like) => (
                <span
                  key={like}
                  className="rounded-full bg-brand-lightest px-3 py-1 text-xs font-medium text-brand dark:bg-brand/10"
                >
                  {like}
                </span>
              ))}
            </div>
          </div>
        ) : null}

        {/* 메타 */}
        <dl className="space-y-2 rounded-xl bg-grey-100 p-3 text-xs text-grey-600 dark:bg-grey-800 dark:text-grey-300">
          <div className="flex justify-between">
            <dt>제작자</dt>
            <dd>{character.isOfficial ? "Bias 제공" : "내 캐릭터"}</dd>
          </div>
          <div className="flex justify-between">
            <dt>공개 범위</dt>
            <dd>{visibilityLabel(character.visibility)}</dd>
          </div>
          <div className="flex justify-between">
            <dt>소속 그룹</dt>
            {/* TODO(api): 실제 소속 그룹 수 */}
            <dd>—</dd>
          </div>
        </dl>

        {character.isOfficial ? (
          <p className="text-center text-xs text-grey-400 dark:text-grey-500">
            제공 캐릭터는 수정하거나 삭제할 수 없습니다.
          </p>
        ) : (
          /* TODO: 소유자 확인 후 노출 (현재는 내 캐릭터 가정) */
          <Link
            href={`/character/${character.id}`}
            className="flex h-11 w-full items-center justify-center gap-1.5 rounded-xl border border-grey-200 text-sm font-semibold text-grey-700 transition-colors hover:bg-grey-100 dark:border-grey-700 dark:text-grey-200 dark:hover:bg-grey-800"
          >
            <Pencil size={16} />
            캐릭터 수정
          </Link>
        )}
      </section>
    </div>
  )
}
