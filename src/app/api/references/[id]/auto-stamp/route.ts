import { NextResponse } from "next/server"
import { format } from "date-fns"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { saveUploadedFile, readStoredFile } from "@/lib/storage"
import { stampPdf, type Insert } from "@/lib/stamp-pdf"
import { scanForLabels } from "@/lib/pdf-scan"

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

  const sourceBytes = await readStoredFile(reference.originalFilePath)
  const { ref: refBox, date: dateBox } = await scanForLabels(sourceBytes)

  if (!refBox && !dateBox) {
    return NextResponse.json({ found: { ref: false, date: false } })
  }

  const eraseBoxes = [refBox, dateBox].filter((b) => b !== null)
  const inserts: Insert[] = []
  // Also echoed back to the client (with `type` instead of `text`) so it can
  // carry these positions forward into a later manual /stamp call for
  // whichever label wasn't found here — that route always re-sources from
  // the original file, so a partial auto-stamp must be re-applied alongside
  // the user's manual placement or it would be lost.
  const applied: { eraseBoxes: typeof eraseBoxes; inserts: (Insert & { type: "ref" | "date" })[] } = {
    eraseBoxes,
    inserts: [],
  }
  if (refBox) {
    const insert: Insert = { ...refBox, font: "Helvetica", bold: false, text: reference.refNumber }
    inserts.push(insert)
    applied.inserts.push({ ...insert, type: "ref" })
  }
  if (dateBox) {
    const insert: Insert = {
      ...dateBox,
      font: "Helvetica",
      bold: false,
      text: format(reference.registerDate, "d MMM yyyy"),
    }
    inserts.push(insert)
    applied.inserts.push({ ...insert, type: "date" })
  }

  const stampedBytes = await stampPdf(sourceBytes, { eraseBoxes, inserts })
  const stampedPath = await saveUploadedFile(reference.createdById, id, "stamped", stampedBytes)

  const updated = await prisma.documentReference.update({
    where: { id },
    data: { stampedFilePath: stampedPath, status: "STAMPED" },
    include: { category: true },
  })

  return NextResponse.json({
    ...updated,
    found: { ref: !!refBox, date: !!dateBox },
    applied,
  })
}
