import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { deleteReferenceFiles, readStoredFile } from "@/lib/storage"

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const kind = new URL(req.url).searchParams.get("kind") === "stamped" ? "stamped" : "original"

  const reference = await prisma.documentReference.findUnique({ where: { id } })
  if (!reference) return NextResponse.json({ error: "Not found" }, { status: 404 })
  if (session.user.role !== "ADMIN" && reference.createdById !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const filePath = kind === "stamped" ? reference.stampedFilePath : reference.originalFilePath
  if (!filePath) return NextResponse.json({ error: "No file" }, { status: 404 })

  const bytes = await readStoredFile(filePath)
  return new NextResponse(new Uint8Array(bytes), {
    headers: { "Content-Type": "application/pdf" },
  })
}

export async function DELETE(
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
  if (!reference.originalFilePath) return NextResponse.json({ error: "No file" }, { status: 404 })

  await deleteReferenceFiles(reference.createdById, id)

  const updated = await prisma.documentReference.update({
    where: { id },
    data: { originalFilePath: null, stampedFilePath: null, status: "REGISTERED" },
    include: { category: true },
  })

  return NextResponse.json(updated)
}
