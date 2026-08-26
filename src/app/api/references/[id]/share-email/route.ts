import { NextResponse } from "next/server"
import path from "path"
import { z } from "zod"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { sendReferenceEmail } from "@/lib/mailer"

const schema = z.object({ to: z.string().email() })

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

  const parsed = schema.safeParse(await req.json())
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid email" }, { status: 400 })
  }

  const filePath = reference.stampedFilePath ?? reference.originalFilePath

  try {
    await sendReferenceEmail({
      to: parsed.data.to,
      refNumber: reference.refNumber,
      title: reference.title,
      picName: reference.picName,
      registerDate: reference.registerDate,
      attachment: filePath
        ? { filename: `${reference.refNumber.replace(/\//g, "-")}.pdf`, path: path.resolve(filePath) }
        : undefined,
    })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: "Failed to send email" }, { status: 502 })
  }

  return NextResponse.json({ ok: true })
}
