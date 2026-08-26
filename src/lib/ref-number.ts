import { prisma } from "@/lib/prisma"

/**
 * Allocates the next sequential reference number for a category+year and
 * inserts the DocumentReference row in one transaction. The `FOR UPDATE`
 * row lock on the current max seqNumber serializes concurrent requests for
 * the same category+year so two simultaneous submissions can't collide.
 */
export async function allocateReference(input: {
  categoryId: string
  title: string
  registerDate: Date
  picName: string
  picPosition: string
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
      ORDER BY seqNumber DESC
      LIMIT 1
      FOR UPDATE
    `
    const nextSeq = (rows[0]?.seqNumber ?? 0) + 1
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
        picPosition: input.picPosition,
        picEmail: input.picEmail,
        createdById: input.createdById,
      },
    })
  })
}
