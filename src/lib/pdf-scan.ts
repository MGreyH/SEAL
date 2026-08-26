import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs"
import type { TextItem } from "pdfjs-dist/types/src/display/api"
import path from "path"

const standardFontDataUrl =
  path.join(process.cwd(), "node_modules/pdfjs-dist/standard_fonts").replace(/\\/g, "/") + "/"

const LABEL = "our ref.:"
const LINE_TOLERANCE = 2
const DEFAULT_WIDTH = 200

type Item = { str: string; x: number; y: number; width: number; height: number }

/**
 * Scans page 1 of a PDF for a line containing "Our ref.:" and returns the box
 * spanning from the end of that label to the end of the line — i.e. the
 * region to erase and restamp with the reference number. Returns null if the
 * label isn't found.
 */
export async function scanForOurRef(pdfBytes: Uint8Array) {
  // pdfjs rejects Node Buffer instances outright (even though Buffer is a
  // Uint8Array subclass) and detaches the ArrayBuffer it's given — copy
  // into a fresh Uint8Array so the caller's original bytes stay intact.
  const data = new Uint8Array(pdfBytes)
  const doc = await getDocument({ data, standardFontDataUrl }).promise
  const page = await doc.getPage(1)
  const textContent = await page.getTextContent()

  const items: Item[] = (textContent.items as (TextItem | { str?: undefined })[])
    .filter((it): it is TextItem => !!it.str?.trim())
    .map((it) => ({
      str: it.str,
      x: it.transform[4],
      y: it.transform[5],
      width: it.width,
      height: it.height || Math.hypot(it.transform[1], it.transform[3]) || 10,
    }))

  const lines: Item[][] = []
  for (const item of items) {
    const line = lines.find((l) => Math.abs(l[0].y - item.y) <= LINE_TOLERANCE)
    if (line) line.push(item)
    else lines.push([item])
  }
  for (const line of lines) line.sort((a, b) => a.x - b.x)

  for (const line of lines) {
    let text = ""
    const offsets: number[] = []
    for (const item of line) {
      offsets.push(text.length)
      text += item.str
    }
    const idx = text.toLowerCase().indexOf(LABEL)
    if (idx === -1) continue

    const matchEnd = idx + LABEL.length
    let endX: number | null = null
    let fontSize = line[0].height
    let baseY = line[0].y

    for (let i = 0; i < line.length; i++) {
      const item = line[i]
      const start = offsets[i]
      const end = start + item.str.length
      fontSize = item.height
      baseY = item.y
      if (matchEnd <= end) {
        const frac = item.str.length > 0 ? (matchEnd - start) / item.str.length : 1
        endX = item.x + item.width * frac
        break
      }
    }
    if (endX === null) continue

    const lastItem = line[line.length - 1]
    const lineEndX = lastItem.x + lastItem.width
    const width = Math.max(lineEndX - endX, DEFAULT_WIDTH * 0.1) || DEFAULT_WIDTH

    return {
      x: endX,
      y: baseY - 2,
      width: lineEndX > endX ? width : DEFAULT_WIDTH,
      height: fontSize + 4,
      fontSize: Math.round(fontSize) || 11,
    }
  }

  return null
}
