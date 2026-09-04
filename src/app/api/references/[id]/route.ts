import { NextResponse } from "next/server"
import { z } from "zod"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { deleteReferenceFiles } from "@/lib/storage"

const patchSchema = z.object({
  refNumber: z.string().trim().min(1).optional(),
  title: z.string().trim().min(1).optional(),
  registerDate: z.coerce.date().optional(),
  picName: z.string().trim().min(1).optional(),
  picEmployeeId: z.string().trim().min(1).optional(),
  picEmail: z.string().trim().email().optional(),
})

export async function PATCH(
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

  const parsed = patchSchema.safeParse(await req.json())
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid details" }, { status: 400 })
  }

  if (parsed.data.refNumber) {
    const existing = await prisma.documentReference.findUnique({
      where: { refNumber: parsed.data.refNumber },
      select: { id: true },
    })
    if (existing && existing.id !== id) {
      return NextResponse.json({ error: "Reference number already in use" }, { status: 409 })
    }
  }

  const data: typeof parsed.data & { seqNumber?: null } = { ...parsed.data }
  if (parsed.data.refNumber && parsed.data.refNumber !== reference.refNumber) {
    data.seqNumber = null
  }

  const updated = await prisma.documentReference.update({
    where: { id },
    data,
    include: { category: true },
  })

  return NextResponse.json(updated)
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

  await prisma.documentReference.delete({ where: { id } })
  await deleteReferenceFiles(reference.createdById, id)

  return NextResponse.json({ ok: true })
}
