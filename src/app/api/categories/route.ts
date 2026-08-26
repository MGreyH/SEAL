import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const categories = await prisma.documentCategory.findMany({ orderBy: { code: "asc" } })
  return NextResponse.json(categories)
}
