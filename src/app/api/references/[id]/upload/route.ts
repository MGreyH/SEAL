import { NextResponse } from "next/server"
import { PDFDocument } from "pdf-lib"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { saveUploadedFile } from "@/lib/storage"

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

  const form = await req.formData()
  const file = form.get("file")
  if (!(file instanceof File) || file.type !== "application/pdf") {
    return NextResponse.json({ error: "A PDF file is required" }, { status: 400 })
  }

  const bytes = new Uint8Array(await file.arrayBuffer())
  const filePath = await saveUploadedFile(id, "original", bytes)

  const pdfDoc = await PDFDocument.load(bytes)
  const firstPage = pdfDoc.getPages()[0]

  const updated = await prisma.documentReference.update({
    where: { id },
    data: { originalFilePath: filePath },
    include: { category: true },
  })

  return NextResponse.json({
    ...updated,
    pageWidth: firstPage.getWidth(),
    pageHeight: firstPage.getHeight(),
  })
}
