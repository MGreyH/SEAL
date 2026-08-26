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

export type Insert = StampBox & { text: string }

export async function stampPdf(
  sourceBytes: Uint8Array,
  { eraseBoxes, inserts }: { eraseBoxes: Box[]; inserts: Insert[] }
) {
  const pdfDoc = await PDFDocument.load(sourceBytes)
  const page = pdfDoc.getPages()[0]

  // Whiteout each selected area (covers existing stamped text) before
  // drawing the new values in their place — a visual redaction, not a true
  // text-stream deletion.
  for (const box of eraseBoxes) {
    page.drawRectangle({ ...box, color: rgb(1, 1, 1) })
  }

  const embeddedFonts = new Map<string, Awaited<ReturnType<typeof pdfDoc.embedFont>>>()
  for (const insert of inserts) {
    const fontKey = `${insert.font}:${insert.bold}`
    let embeddedFont = embeddedFonts.get(fontKey)
    if (!embeddedFont) {
      embeddedFont = await pdfDoc.embedFont(FONT_MAP[insert.font][insert.bold ? "bold" : "regular"])
      embeddedFonts.set(fontKey, embeddedFont)
    }

    const { x, y, height, fontSize, text } = insert
    const textY = y + (height - fontSize) / 2
    page.drawText(text, {
      x: x + 2,
      y: textY > y ? textY : y,
      size: fontSize,
      font: embeddedFont,
      color: rgb(0, 0, 0),
    })
  }

  return pdfDoc.save()
}
