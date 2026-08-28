import { prisma } from "@/lib/prisma"

/**
 * Allocates the lowest unused reference number for a category+year (filling
 * gaps left by deleted references before continuing past the max) and
 * inserts the DocumentReference row in one transaction. The `FOR UPDATE`
 * row lock on every existing row for that category+year serializes
 * concurrent requests so two simultaneous submissions can't collide.
 */
export async function allocateReference(input: {
  categoryId: string
  title: string
  registerDate: Date
  picName: string
  picEmployeeId: string
  picEmail: string
  createdById: string
}) {
  const category = await prisma.documentCategory.findUniqueOrThrow({
    where: { id: input.categoryId },
  })
  const year = input.registerDate.getFullYear()

  return prisma.$transaction(async (tx) => {
    const rows = await tx.$queryRaw<{ seqNumber: number }[]>`
      SELECT seqNumber FROM DocumentReference
      WHERE categoryId = ${input.categoryId} AND year = ${year}
      ORDER BY seqNumber ASC
      FOR UPDATE
    `
    let nextSeq = 1
    for (const row of rows) {
      if (row.seqNumber !== nextSeq) break
      nextSeq++
    }
    const yy = String(year).slice(-2)
    const refNumber = `G7/${category.code}/${String(nextSeq).padStart(3, "0")}/${yy}`

    return tx.documentReference.create({
      data: {
        categoryId: input.categoryId,
        year,
        seqNumber: nextSeq,
        refNumber,
        title: input.title,
        registerDate: input.registerDate,
        picName: input.picName,
        picEmployeeId: input.picEmployeeId,
        picEmail: input.picEmail,
        createdById: input.createdById,
      },
    })
  })
}
