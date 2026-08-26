import { NextResponse } from "next/server"
import { readFile } from "fs/promises"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { saveUploadedFile } from "@/lib/storage"
import { stampPdf } from "@/lib/stamp-pdf"
import { scanForOurRef } from "@/lib/pdf-scan"

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
  if (!reference.originalFilePath) {
    return NextResponse.json({ error: "Upload a document first" }, { status: 400 })
  }

  const sourceBytes = await readFile(reference.originalFilePath)
  const box = await scanForOurRef(sourceBytes)
  if (!box) {
    return NextResponse.json({ found: false })
  }

  const stampedBytes = await stampPdf(sourceBytes, reference.refNumber, {
    eraseBoxes: [box],
    insert: { ...box, font: "Helvetica", bold: false },
  })
  const stampedPath = await saveUploadedFile(id, "stamped", stampedBytes)

  const updated = await prisma.documentReference.update({
    where: { id },
    data: { stampedFilePath: stampedPath, status: "STAMPED" },
    include: { category: true },
  })

  return NextResponse.json({ ...updated, found: true })
}
