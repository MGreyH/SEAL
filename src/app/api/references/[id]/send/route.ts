import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { sendReferenceEmail } from "@/lib/mailer"
import { readStoredFile } from "@/lib/storage"

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

  const filePath = reference.stampedFilePath ?? reference.originalFilePath

  try {
    await sendReferenceEmail({
      to: reference.picEmail,
      refNumber: reference.refNumber,
      title: reference.title,
      picName: reference.picName,
      registerDate: reference.registerDate,
      attachment: filePath
        ? {
            filename: `${reference.refNumber.replace(/\//g, "-")}.pdf`,
            content: await readStoredFile(filePath),
          }
        : undefined,
    })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: "Failed to send email" }, { status: 502 })
  }

  const updated = await prisma.documentReference.update({
    where: { id },
    data: { status: "SENT", sentAt: new Date() },
    include: { category: true },
  })

  return NextResponse.json(updated)
}
