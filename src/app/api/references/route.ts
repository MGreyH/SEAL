import { NextResponse } from "next/server"
import { z } from "zod"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { allocateReference } from "@/lib/ref-number"
import { deleteReferenceFiles } from "@/lib/storage"

const schema = z.object({
  categoryId: z.string().min(1),
  title: z.string().min(1),
  registerDate: z.coerce.date(),
  picName: z.string().min(1),
  picEmployeeId: z.string().min(1),
  picEmail: z.string().email(),
})

export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const references = await prisma.documentReference.findMany({
    where: session.user.role === "ADMIN" ? {} : { createdById: session.user.id },
    include: { category: true, createdBy: { select: { name: true, email: true } } },
    orderBy: { createdAt: "desc" },
  })

  return NextResponse.json(references)
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const reference = await allocateReference({
    ...parsed.data,
    createdById: session.user.id,
  })

  return NextResponse.json(reference)
}

const deleteSchema = z.object({ ids: z.array(z.string().min(1)).min(1) })

export async function DELETE(req: Request) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json()
  const parsed = deleteSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 })
  }

  const where =
    session.user.role === "ADMIN"
      ? { id: { in: parsed.data.ids } }
      : { id: { in: parsed.data.ids }, createdById: session.user.id }

  const owned = await prisma.documentReference.findMany({
    where,
    select: { id: true, createdById: true },
  })
  await prisma.documentReference.deleteMany({ where })
  await Promise.all(owned.map((r) => deleteReferenceFiles(r.createdById, r.id)))

  return NextResponse.json({ ok: true, deleted: owned.length })
}
