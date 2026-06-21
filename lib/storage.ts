// 이미지 스토리지 (Supabase Storage, 공개 버킷 bias-storage).
// 프로필/캐릭터 사진을 업로드하고 공개 URL 을 돌려준다.

import { supabase } from "./supabase"

const BUCKET = "bias-storage"

/** 압축된 이미지 Blob 을 업로드하고 공개 URL 반환. folder: "profiles" | "characters" */
export async function uploadImage(
  blob: Blob,
  folder: "profiles" | "characters"
): Promise<string> {
  const path = `${folder}/${crypto.randomUUID()}.jpg`
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, blob, { contentType: "image/jpeg", upsert: false })
  if (error) throw new Error(error.message)
  return supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl
}

/**
 * <input type=file> 의 File 을 384px JPEG 로 줄여 업로드 → 공개 URL.
 * 브라우저(canvas) 전용.
 */
export function resizeAndUpload(
  file: File,
  folder: "profiles" | "characters"
): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error("read failed"))
    reader.onload = () => {
      const img = new Image()
      img.onerror = () => reject(new Error("decode failed"))
      img.onload = () => {
        const MAX = 384
        const scale = Math.min(1, MAX / Math.max(img.width, img.height))
        const canvas = document.createElement("canvas")
        canvas.width = Math.round(img.width * scale)
        canvas.height = Math.round(img.height * scale)
        const ctx = canvas.getContext("2d")
        if (!ctx) return reject(new Error("canvas unavailable"))
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
        canvas.toBlob(
          (blob) => {
            if (!blob) return reject(new Error("encode failed"))
            uploadImage(blob, folder).then(resolve).catch(reject)
          },
          "image/jpeg",
          0.8
        )
      }
      img.src = reader.result as string
    }
    reader.readAsDataURL(file)
  })
}
