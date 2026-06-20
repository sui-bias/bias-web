import { UserPlus } from "lucide-react"
import { visibilityLabel, type Character } from "@/lib/types"
import { ProfileActionButton, ProfileHero } from "./profile-hero"
import { StartChatButton } from "./start-chat-button"
import { CharacterEditButton } from "./character-edit-button"

// 캐릭터 Profile = 유저 Profile 레이아웃 + '친구 정보' 섹션.
// hidden / bannedTopics 같은 내부 Settings은 노출하지 않는다.
export function CharacterProfileView({
  character,
}: {
  character: Character
}) {
  const meta = [
    character.age ? `${character.age}` : null,
    character.job,
    character.mbti,
  ].filter(Boolean)

  return (
    <div>
      <ProfileHero
        name={character.display_name}
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
            {/* 클릭 시 나+캐릭터 direct 방을 만들고 /rooms/{id} 로 이동 */}
            <StartChatButton
              characterId={character.id}
              characterName={character.display_name}
              chatReady={Boolean(character.chatCharacterId)}
            />
            {/* TODO: 그룹 기능(M5) 연동 전까지 비활성 */}
            <ProfileActionButton icon={UserPlus} label="Add to group" disabled />
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
              Likes
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
            <dt>Creator</dt>
            <dd>{character.isOfficial ? "By Bias" : "My characters"}</dd>
          </div>
          <div className="flex justify-between">
            <dt>Visibility</dt>
            <dd>{visibilityLabel(character.visibility)}</dd>
          </div>
          <div className="flex justify-between">
            <dt>Groups</dt>
            {/* TODO(api): 실제 Groups 수 */}
            <dd>—</dd>
          </div>
        </dl>

        {character.isOfficial ? (
          <p className="text-center text-xs text-grey-400 dark:text-grey-500">
            Provided characters can&apos;t be edited.
          </p>
        ) : (
          // Creator 본인에게만 수정 버튼 노출
          <CharacterEditButton
            characterId={character.id}
            ownerId={character.ownerId}
          />
        )}
      </section>
    </div>
  )
}
