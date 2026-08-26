import { Client } from "basic-ftp"
import { Readable, Writable } from "stream"

const FTP_BASE_DIR = process.env.FTP_BASE_DIR ?? ""

async function withFtpClient<T>(fn: (client: Client) => Promise<T>) {
  const client = new Client()
  try {
    await client.access({
      host: process.env.FTP_HOST,
      user: process.env.FTP_USER,
      password: process.env.FTP_PASSWORD,
      secure: true,
      secureOptions: { rejectUnauthorized: false },
    })
    return await fn(client)
  } finally {
    client.close()
  }
}

function remoteDir(userId: string, referenceId: string) {
  return [FTP_BASE_DIR, userId, referenceId].filter(Boolean).join("/")
}

export async function saveUploadedFile(
  userId: string,
  referenceId: string,
  kind: "original" | "stamped",
  bytes: Uint8Array
) {
  const dir = remoteDir(userId, referenceId)
  const key = `${userId}/${referenceId}/${kind}.pdf`

  await withFtpClient(async (client) => {
    await client.ensureDir(dir)
    await client.uploadFrom(Readable.from(Buffer.from(bytes)), `${kind}.pdf`)
  })

  return key
}

export async function readStoredFile(relativeKey: string) {
  const chunks: Buffer[] = []
  const sink = new Writable({
    write(chunk, _enc, callback) {
      chunks.push(chunk)
      callback()
    },
  })
  const remotePath = [FTP_BASE_DIR, relativeKey].filter(Boolean).join("/")

  await withFtpClient(async (client) => {
    await client.downloadTo(sink, remotePath)
  })

  return Buffer.concat(chunks)
}

export async function deleteReferenceFiles(userId: string, referenceId: string) {
  const dir = remoteDir(userId, referenceId)
  await withFtpClient(async (client) => {
    await client.removeDir(dir).catch(() => {})
  })
}
