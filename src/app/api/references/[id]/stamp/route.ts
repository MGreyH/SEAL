import { NextResponse } from "next/server"
import { z } from "zod"
import { format } from "date-fns"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { saveUploadedFile, readStoredFile } from "@/lib/storage"
import { stampPdf, type Insert } from "@/lib/stamp-pdf"

const boxSchema = z.object({
  x: z.number(),
  y: z.number(),
  width: z.number().min(1),
  height: z.number().min(1),
})

const schema = z.object({
  eraseBoxes: z.array(boxSchema).default([]),
  inserts: z
    .array(
      boxSchema.extend({
        fontSize: z.number().min(6).max(36).default(11),
        font: z.enum(["Helvetica", "Times", "Courier"]).default("Helvetica"),
        bold: z.boolean().default(false),
        type: z.enum(["ref", "date"]),
      })
    )
    .min(1),
})

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

  const body = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid position" }, { status: 400 })
  }

  const inserts: Insert[] = parsed.data.inserts.map(({ type, ...box }) => ({
    ...box,
    text:
      type === "ref"
        ? reference.refNumber
        : format(reference.registerDate, "d MMM yyyy"),
  }))

  const sourceBytes = await readStoredFile(reference.originalFilePath)
  const stampedBytes = await stampPdf(sourceBytes, { eraseBoxes: parsed.data.eraseBoxes, inserts })
  const stampedPath = await saveUploadedFile(reference.createdById, id, "stamped", stampedBytes)

  const updated = await prisma.documentReference.update({
    where: { id },
    data: { stampedFilePath: stampedPath, status: "STAMPED" },
    include: { category: true },
  })

  return NextResponse.json(updated)
}
