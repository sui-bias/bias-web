// 채팅방 영속화 (Supabase). 테이블/정책은 supabase/migrations/0002_rooms.sql 참고.
// Room/Participant/Message/SenderRef 타입은 lib/types.ts.

import { supabase } from "./supabase"
import type {
  Message,
  Participant,
  Room,
  RoomType,
  SenderRef,
} from "./types"

type MemberRow = {
  room_id: string
  member_type: "user" | "character"
  member_id: string
  owner_address: string | null
}

function rowToParticipant(row: MemberRow): Participant {
  return row.member_type === "user"
    ? { type: "user", address: row.member_id }
    : {
        type: "character",
        characterId: row.member_id,
        ownerAddress: row.owner_address ?? "",
      }
}

function participantToRow(roomId: string, p: Participant): MemberRow {
  return p.type === "user"
    ? {
        room_id: roomId,
        member_type: "user",
        member_id: p.address,
        owner_address: null,
      }
    : {
        room_id: roomId,
        member_type: "character",
        member_id: p.characterId,
        owner_address: p.ownerAddress,
      }
}

/** 방 생성 + 참여자 등록. 생성된 roomId 반환. */
export async function createRoom(input: {
  type: RoomType
  name: string
  ownerAddress: string
  participants: Participant[]
}): Promise<string> {
  const { data, error } = await supabase
    .from("rooms")
    .insert({
      type: input.type,
      name: input.name,
      owner_address: input.ownerAddress,
    })
    .select("id")
    .single()
  if (error) throw new Error(error.message)

  const roomId = (data as { id: string }).id
  if (input.participants.length) {
    const rows = input.participants.map((p) => participantToRow(roomId, p))
    const { error: e2 } = await supabase.from("room_members").insert(rows)
    if (e2) throw new Error(e2.message)
  }
  return roomId
}

/** 나와 캐릭터의 1:1(direct) 방을 찾고, 없으면 생성. roomId 반환. */
export async function getOrCreateDirectRoom(
  myAddress: string,
  characterId: string,
  roomName: string
): Promise<string> {
  // 내가 속한 방들
  const { data: myLinks } = await supabase
    .from("room_members")
    .select("room_id")
    .eq("member_type", "user")
    .eq("member_id", myAddress)
  const myRoomIds = [
    ...new Set((myLinks ?? []).map((l) => (l as { room_id: string }).room_id)),
  ]

  if (myRoomIds.length) {
    // 그 중 이 캐릭터가 들어있는 방
    const { data: charLinks } = await supabase
      .from("room_members")
      .select("room_id")
      .eq("member_type", "character")
      .eq("member_id", characterId)
      .in("room_id", myRoomIds)
    const candidateIds = (charLinks ?? []).map(
      (l) => (l as { room_id: string }).room_id
    )
    if (candidateIds.length) {
      const { data: directRooms } = await supabase
        .from("rooms")
        .select("id")
        .eq("type", "direct")
        .in("id", candidateIds)
        .limit(1)
      const existing = (directRooms ?? [])[0] as { id: string } | undefined
      if (existing) return existing.id
    }
  }

  return createRoom({
    type: "direct",
    name: roomName,
    ownerAddress: myAddress,
    participants: [
      { type: "user", address: myAddress },
      { type: "character", characterId, ownerAddress: myAddress },
    ],
  })
}

/** 나와 다른 유저의 1:1(direct) 방을 찾고, 없으면 생성. 양쪽 모두 참여자로 들어가
 * 상대방 방 목록에도 나타난다(일방향 친구와 별개). */
export async function getOrCreateDirectUserRoom(
  myAddress: string,
  otherAddress: string,
  roomName: string
): Promise<string> {
  const { data: myLinks } = await supabase
    .from("room_members")
    .select("room_id")
    .eq("member_type", "user")
    .eq("member_id", myAddress)
  const myRoomIds = [
    ...new Set((myLinks ?? []).map((l) => (l as { room_id: string }).room_id)),
  ]

  if (myRoomIds.length) {
    const { data: otherLinks } = await supabase
      .from("room_members")
      .select("room_id")
      .eq("member_type", "user")
      .eq("member_id", otherAddress)
      .in("room_id", myRoomIds)
    const candidateIds = (otherLinks ?? []).map(
      (l) => (l as { room_id: string }).room_id
    )
    if (candidateIds.length) {
      const { data: directRooms } = await supabase
        .from("rooms")
        .select("id")
        .eq("type", "direct")
        .in("id", candidateIds)
        .limit(1)
      const existing = (directRooms ?? [])[0] as { id: string } | undefined
      if (existing) return existing.id
    }
  }

  return createRoom({
    type: "direct",
    name: roomName,
    ownerAddress: myAddress,
    participants: [
      { type: "user", address: myAddress },
      { type: "user", address: otherAddress },
    ],
  })
}

/** 방 단건 + 참여자. */
export async function getRoom(id: string): Promise<Room | null> {
  const { data: room, error } = await supabase
    .from("rooms")
    .select("*")
    .eq("id", id)
    .maybeSingle()
  if (error || !room) return null

  const { data: members } = await supabase
    .from("room_members")
    .select("*")
    .eq("room_id", id)

  const r = room as {
    id: string
    type: RoomType
    name: string
    owner_address: string
    created_at: string
  }
  return {
    id: r.id,
    type: r.type,
    name: r.name,
    ownerAddress: r.owner_address,
    participants: ((members as MemberRow[]) ?? []).map(rowToParticipant),
    createdAt: r.created_at,
  }
}

/** 내가 참여 중인 방 목록(최근순). */
export async function listRoomsForUser(address: string): Promise<Room[]> {
  const { data: links, error } = await supabase
    .from("room_members")
    .select("room_id")
    .eq("member_type", "user")
    .eq("member_id", address)
  if (error) return []

  const ids = [
    ...new Set((links ?? []).map((l) => (l as { room_id: string }).room_id)),
  ]
  if (!ids.length) return []

  const rooms = await Promise.all(ids.map((id) => getRoom(id)))
  return rooms
    .filter((r): r is Room => Boolean(r))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

/** 메시지 저장(말풍선 하나). */
export async function addMessage(
  roomId: string,
  sender: SenderRef,
  text: string,
  turnId?: string
): Promise<void> {
  const { error } = await supabase.from("chats").insert({
    room_id: roomId,
    sender_type: sender.type,
    sender_id: sender.type === "user" ? sender.address : sender.characterId,
    text,
    turn_id: turnId ?? null,
  })
  if (error) throw new Error(error.message)
}

/** 방의 메시지(시간순). */
export async function listMessages(roomId: string): Promise<Message[]> {
  const { data, error } = await supabase
    .from("chats")
    .select("*")
    .eq("room_id", roomId)
    .order("created_at", { ascending: true })
  if (error) return []

  return ((data as Array<Record<string, string>>) ?? []).map((row) => ({
    id: row.id,
    roomId: row.room_id,
    sender:
      row.sender_type === "user"
        ? { type: "user", address: row.sender_id }
        : { type: "character", characterId: row.sender_id },
    text: row.text,
    turnId: row.turn_id ?? undefined,
    createdAt: row.created_at,
  }))
}
