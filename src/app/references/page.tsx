import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { AppShell } from "@/components/app-shell"
import { ReferencesTable } from "./references-table"

export default async function ReferencesPage() {
  const session = await auth()
  if (!session) return null

  const references = await prisma.documentReference.findMany({
    where: session.user.role === "ADMIN" ? {} : { createdById: session.user.id },
    include: { category: true },
    orderBy: { createdAt: "desc" },
  })

  return (
    <AppShell>
      <ReferencesTable
        references={references}
        subtitle={
          session.user.role === "ADMIN"
            ? "All registered reference numbers."
            : "Reference numbers you've registered."
        }
      />
    </AppShell>
  )
}
