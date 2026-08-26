import { notFound, redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { AppShell } from "@/components/app-shell"
import { ReferenceDetail } from "./reference-detail"

export default async function ReferenceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const session = await auth()
  if (!session) redirect("/login")

  const { id } = await params
  const reference = await prisma.documentReference.findUnique({
    where: { id },
    include: { category: true },
  })

  if (!reference) notFound()
  if (session.user.role !== "ADMIN" && reference.createdById !== session.user.id) {
    redirect("/references")
  }

  return (
    <AppShell>
      <ReferenceDetail
        initial={{
          id: reference.id,
          refNumber: reference.refNumber,
          title: reference.title,
          registerDate: reference.registerDate.toISOString(),
          picName: reference.picName,
          picEmployeeId: reference.picEmployeeId,
          picEmail: reference.picEmail,
          status: reference.status,
          originalFilePath: reference.originalFilePath,
          stampedFilePath: reference.stampedFilePath,
          category: { code: reference.category.code, name: reference.category.name },
        }}
      />
    </AppShell>
  )
}
