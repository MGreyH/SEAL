import { NextResponse } from "next/server"
import { readFile } from "fs/promises"
import { PDFDocument } from "pdf-lib"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const reference = await prisma.documentReference.findUnique({ where: { id } })
  if (!reference?.originalFilePath) {
    return NextResponse.json({ error: "No document" }, { status: 404 })
  }

  const bytes = await readFile(reference.originalFilePath)
  const pdfDoc = await PDFDocument.load(bytes)
  const page = pdfDoc.getPages()[0]

  return NextResponse.json({ pageWidth: page.getWidth(), pageHeight: page.getHeight() })
}
