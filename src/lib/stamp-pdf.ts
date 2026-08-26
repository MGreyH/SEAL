import { PDFDocument, rgb, StandardFonts } from "pdf-lib"

export const FONT_MAP = {
  Helvetica: { regular: StandardFonts.Helvetica, bold: StandardFonts.HelveticaBold },
  Times: { regular: StandardFonts.TimesRoman, bold: StandardFonts.TimesRomanBold },
  Courier: { regular: StandardFonts.Courier, bold: StandardFonts.CourierBold },
} as const

export type StampFont = keyof typeof FONT_MAP

export type Box = {
  x: number
  y: number
  width: number
  height: number
}

export type StampBox = Box & {
  fontSize: number
  font: StampFont
  bold: boolean
}

export async function stampPdf(
  sourceBytes: Uint8Array,
  refNumber: string,
  { eraseBoxes, insert }: { eraseBoxes: Box[]; insert: StampBox }
) {
  const pdfDoc = await PDFDocument.load(sourceBytes)
  const page = pdfDoc.getPages()[0]
  const embeddedFont = await pdfDoc.embedFont(FONT_MAP[insert.font][insert.bold ? "bold" : "regular"])

  // Whiteout each selected area (covers existing ref number text) before
  // drawing the new one in its place — a visual redaction, not a true
  // text-stream deletion.
  for (const box of eraseBoxes) {
    page.drawRectangle({ ...box, color: rgb(1, 1, 1) })
  }

  const { x, y, width, height, fontSize } = insert
  const textY = y + (height - fontSize) / 2
  page.drawText(refNumber, {
    x: x + 2,
    y: textY > y ? textY : y,
    size: fontSize,
    font: embeddedFont,
    color: rgb(0, 0, 0),
  })

  return pdfDoc.save()
}
