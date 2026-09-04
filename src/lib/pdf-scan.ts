import type { TextItem } from "pdfjs-dist/types/src/display/api"
import path from "path"

declare global {
  // eslint-disable-next-line no-var
  var pdfjsWorker: unknown
}

const standardFontDataUrl =
  path.join(process.cwd(), "node_modules/pdfjs-dist/standard_fonts").replace(/\\/g, "/") + "/"

const REF_LABELS = ["our ref.:", "rujukan kami:"]
const DATE_LABELS = ["date:", "tarikh:"]
const LINE_TOLERANCE = 2
const DEFAULT_WIDTH = 200

type Item = { str: string; x: number; y: number; width: number; height: number }
export type LabelBox = {
  x: number
  y: number
  width: number
  height: number
  fontSize: number
}

/**
 * Finds a line among the pre-grouped `lines` containing `label` and returns
 * the box spanning from the end of that label to the end of the line — i.e.
 * the region to erase and restamp. Returns null if the label isn't found.
 */
function findLabelBox(lines: Item[][], labels: string[]): LabelBox | null {
  for (const line of lines) {
    let text = ""
    const offsets: number[] = []
    for (const item of line) {
      offsets.push(text.length)
      text += item.str
    }
    const lowerText = text.toLowerCase()
    let idx = -1
    let matchedLabel = ""
    for (const label of labels) {
      let searchFrom = 0
      // require a word boundary before the match, e.g. "date:" must not match
      // inside "Update:"
      while (true) {
        const found = lowerText.indexOf(label, searchFrom)
        if (found === -1) break
        if (found === 0 || !/[a-z]/.test(lowerText[found - 1])) {
          idx = found
          matchedLabel = label
          break
        }
        searchFrom = found + 1
      }
      if (idx !== -1) break
    }
    if (idx === -1) continue

    const matchEnd = idx + matchedLabel.length
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

/**
 * Scans page 1 of a PDF for lines containing "Our ref.:" and "Date:" and
 * returns the erase/insert box for each, independently. Either can be null
 * if that label isn't found.
 */
export async function scanForLabels(
  pdfBytes: Uint8Array
): Promise<{ ref: LabelBox | null; date: LabelBox | null }> {
  // pdfjs rejects Node Buffer instances outright (even though Buffer is a
  // Uint8Array subclass) and detaches the ArrayBuffer it's given — copy
  // into a fresh Uint8Array so the caller's original bytes stay intact.
  // pdfjs-dist's legacy build references the browser-only DOMMatrix API at
  // module load time. Node has no such global, so polyfill it before pdfjs
  // is imported.
  if (typeof globalThis.DOMMatrix === "undefined") {
    const { default: DOMMatrixPolyfill } = await import("dommatrix")
    globalThis.DOMMatrix = DOMMatrixPolyfill
  }

  // pdfjs also spawns a "fake worker" by dynamically resolving its own
  // pdf.worker.mjs file path at runtime — a lookup Vercel's build tracer
  // can't see statically, so the file gets dropped from the deployment.
  // Pre-registering it on globalThis makes pdfjs skip that lookup entirely,
  // and this static-string dynamic import is something the tracer *can* see.
  if (typeof globalThis.pdfjsWorker === "undefined") {
    // @ts-expect-error pdf.worker.mjs has no published type declarations
    globalThis.pdfjsWorker = await import("pdfjs-dist/legacy/build/pdf.worker.mjs")
  }

  const { getDocument } = await import("pdfjs-dist/legacy/build/pdf.mjs")
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

  return {
    ref: findLabelBox(lines, REF_LABELS),
    date: findLabelBox(lines, DATE_LABELS),
  }
}
