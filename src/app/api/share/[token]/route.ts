import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { readStoredFile } from "@/lib/storage"

export async function GET(
  req: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params
  const reference = await prisma.documentReference.findUnique({ where: { shareToken: token } })
  if (!reference?.stampedFilePath) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  const bytes = await readStoredFile(reference.stampedFilePath)
  return new NextResponse(new Uint8Array(bytes), {
    headers: { "Content-Type": "application/pdf" },
  })
}
