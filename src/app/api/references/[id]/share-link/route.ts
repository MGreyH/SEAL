import { NextResponse } from "next/server"
import { randomBytes } from "crypto"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const reference = await prisma.documentReference.findUnique({ where: { id } })
  if (!reference) return NextResponse.json({ error: "Not found" }, { status: 404 })
  if (session.user.role !== "ADMIN" && reference.createdById !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }
  if (!reference.stampedFilePath) {
    return NextResponse.json({ error: "Stamp the document first" }, { status: 400 })
  }

  const token = reference.shareToken ?? randomBytes(24).toString("hex")
  if (!reference.shareToken) {
    await prisma.documentReference.update({ where: { id }, data: { shareToken: token } })
  }

  const base = process.env.NEXTAUTH_URL ?? new URL(req.url).origin
  return NextResponse.json({ url: `${base}/api/share/${token}` })
}
