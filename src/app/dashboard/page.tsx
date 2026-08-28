import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { AppShell } from "@/components/app-shell"
import { StatCard } from "@/components/dashboard/stat-card"
import {
  MonthlyTrendChart,
  StatusPieChart,
  CategoryBarChart,
} from "@/components/dashboard/charts"
import { FileText, Send, Stamp, Users } from "lucide-react"

export default async function DashboardPage() {
  const session = await auth()
  if (!session) redirect("/login")
  if (session.user.role !== "ADMIN") redirect("/references")

  const [total, sent, stamped, guestCount, all] = await Promise.all([
    prisma.documentReference.count(),
    prisma.documentReference.count({ where: { status: "SENT" } }),
    prisma.documentReference.count({ where: { status: { in: ["STAMPED", "SENT"] } } }),
    prisma.user.count({ where: { role: "GUEST" } }),
    prisma.documentReference.findMany({
      select: { createdAt: true, status: true, category: { select: { code: true } } },
    }),
  ])

  const now = new Date()
  const months = Array.from({ length: 6 }).map((_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1)
    return { key: `${d.getFullYear()}-${d.getMonth()}`, label: d.toLocaleString("en", { month: "short" }) }
  })
  const monthlyTrend = months.map(({ key, label }) => ({
    month: label,
    count: all.filter((r) => {
      const d = new Date(r.createdAt)
      return `${d.getFullYear()}-${d.getMonth()}` === key
    }).length,
  }))

  const statusCounts = ["REGISTERED", "STAMPED", "SENT"].map((s) => ({
    name: s,
    value: all.filter((r) => r.status === s).length,
  }))

  const categoryCounts = Object.entries(
    all.reduce<Record<string, number>>((acc, r) => {
      acc[r.category.code] = (acc[r.category.code] ?? 0) + 1
      return acc
    }, {})
  ).map(([name, value]) => ({ name, value }))

  return (
    <AppShell>
      <h1 className="mb-1 text-2xl font-semibold tracking-tight">Dashboard</h1>
      <p className="mb-6 text-muted-foreground">
        Overview of document reference number usage.
      </p>

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Total references" value={total} icon={<FileText className="h-5 w-5" />} />
        <StatCard label="Stamped" value={stamped} icon={<Stamp className="h-5 w-5" />} accent="bg-chart-4" />
        <StatCard label="Sent to PIC" value={sent} icon={<Send className="h-5 w-5" />} accent="bg-chart-2" />
        <StatCard label="Employee users" value={guestCount} icon={<Users className="h-5 w-5" />} accent="bg-chart-3" />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <MonthlyTrendChart data={monthlyTrend} />
        <StatusPieChart data={statusCounts} />
        <div className="lg:col-span-2">
          <CategoryBarChart data={categoryCounts} />
        </div>
      </div>
    </AppShell>
  )
}
