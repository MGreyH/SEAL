import { NextResponse } from "next/server"
import { readFile } from "fs/promises"
import { prisma } from "@/lib/prisma"

export async function GET(
  req: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params
  const reference = await prisma.documentReference.findUnique({ where: { shareToken: token } })
  if (!reference?.stampedFilePath) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  const bytes = await readFile(reference.stampedFilePath)
  return new NextResponse(new Uint8Array(bytes), {
    headers: { "Content-Type": "application/pdf" },
  })
}
