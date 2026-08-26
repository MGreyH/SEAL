import { mkdir, writeFile } from "fs/promises"
import path from "path"

export const UPLOADS_DIR = path.join(process.cwd(), "uploads")

export async function saveUploadedFile(
  referenceId: string,
  kind: "original" | "stamped",
  bytes: Uint8Array
) {
  const dir = path.join(UPLOADS_DIR, referenceId)
  await mkdir(dir, { recursive: true })
  const filePath = path.join(dir, `${kind}.pdf`)
  await writeFile(filePath, bytes)
  return filePath
}
