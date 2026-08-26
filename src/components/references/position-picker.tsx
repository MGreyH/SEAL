"use client"

import { useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"

export type StampFont = "Helvetica" | "Times" | "Courier"

const FONT_LABELS: Record<StampFont, string> = {
  Helvetica: "Helvetica (sans-serif)",
  Times: "Times (serif)",
  Courier: "Courier (monospace)",
}

const FONT_FAMILY: Record<StampFont, string> = {
  Helvetica: "Arial, Helvetica, sans-serif",
  Times: "'Times New Roman', Times, serif",
  Courier: "'Courier New', Courier, monospace",
}

type DisplayBox = { px: number; py: number; pw: number; ph: number }

let boxId = 0

export function PositionPicker({
  fileUrl,
  pageWidth,
  pageHeight,
  refNumber,
  onConfirm,
  loading,
}: {
  fileUrl: string
  pageWidth: number
  pageHeight: number
  refNumber: string
  onConfirm: (payload: {
    eraseBoxes: { x: number; y: number; width: number; height: number }[]
    insert: {
      x: number
      y: number
      width: number
      height: number
      font: StampFont
      bold: boolean
      fontSize: number
    }
  }) => void
  loading?: boolean
}) {
  const boxRef = useRef<HTMLDivElement>(null)
  const [mode, setMode] = useState<"erase" | "insert" | null>("erase")
  const [dragStart, setDragStart] = useState<{ px: number; py: number } | null>(null)
  const [dragBox, setDragBox] = useState<DisplayBox | null>(null)
  const [eraseBoxes, setEraseBoxes] = useState<{ id: number; box: DisplayBox }[]>([])
  const [insertBox, setInsertBox] = useState<DisplayBox | null>(null)
  const [moveOffset, setMoveOffset] = useState<{ x: number; y: number } | null>(null)
  const [font, setFont] = useState<StampFont>("Helvetica")
  const [bold, setBold] = useState(false)
  const [fontSize, setFontSize] = useState(11)

  const displayWidth = 640
  const displayHeight = (displayWidth * pageHeight) / pageWidth
  const scale = pageWidth / displayWidth

  function toLocal(e: { clientX: number; clientY: number }) {
    const rect = boxRef.current?.getBoundingClientRect()
    if (!rect) return { px: 0, py: 0 }
    return { px: e.clientX - rect.left, py: e.clientY - rect.top }
  }

  function insideBox(p: { px: number; py: number }, box: DisplayBox) {
    return (
      p.px >= box.px && p.px <= box.px + box.pw && p.py >= box.py && p.py <= box.py + box.ph
    )
  }

  function handleDown(e: React.MouseEvent<HTMLDivElement>) {
    if (!mode) return
    const p = toLocal(e)
    if (mode === "insert" && insertBox && insideBox(p, insertBox)) {
      setMoveOffset({ x: p.px - insertBox.px, y: p.py - insertBox.py })
      return
    }
    setDragStart(p)
    setDragBox(null)
  }

  function handleMove(e: React.MouseEvent<HTMLDivElement>) {
    const cur = toLocal(e)
    if (moveOffset && insertBox) {
      const maxX = Math.max(displayWidth - insertBox.pw, 0)
      const maxY = Math.max(displayHeight - insertBox.ph, 0)
      setInsertBox({
        ...insertBox,
        px: Math.min(Math.max(cur.px - moveOffset.x, 0), maxX),
        py: Math.min(Math.max(cur.py - moveOffset.y, 0), maxY),
      })
      return
    }
    if (!dragStart) return
    setDragBox({
      px: Math.min(dragStart.px, cur.px),
      py: Math.min(dragStart.py, cur.py),
      pw: Math.abs(cur.px - dragStart.px),
      ph: Math.abs(cur.py - dragStart.py),
    })
  }

  function handleUp() {
    if (moveOffset) {
      setMoveOffset(null)
      return
    }
    setDragStart(null)
    if (!dragBox || dragBox.pw < 4 || dragBox.ph < 4) {
      setDragBox(null)
      return
    }
    if (mode === "erase") {
      setEraseBoxes((prev) => [...prev, { id: boxId++, box: dragBox }])
    } else {
      setInsertBox(dragBox)
    }
    setDragBox(null)
  }

  function toPdfBox(box: DisplayBox) {
    const x = box.px * scale
    const width = box.pw * scale
    const height = box.ph * scale
    // PDF y-axis is bottom-up; flip the top-down box position.
    const y = pageHeight - (box.py + box.ph) * scale
    return { x, y, width, height }
  }

  function confirm() {
    if (!insertBox) return
    onConfirm({
      eraseBoxes: eraseBoxes.map((e) => toPdfBox(e.box)),
      insert: { ...toPdfBox(insertBox), font, bold, fontSize },
    })
  }

  const previewFontSize = fontSize / scale

  return (
    <div className="grid gap-3">
      <p className="text-sm text-muted-foreground">
        Use <span className="font-medium text-foreground">Delete</span> to
        erase old text, then <span className="font-medium text-foreground">Insert stamp</span>{" "}
        to place <span className="font-medium text-foreground">{refNumber}</span>{" "}
        where it should go. Click the active tool again to deselect it so you
        can scroll or move around the page underneath.
      </p>

      <div className="flex flex-wrap items-end gap-3">
        <div className="grid gap-1.5">
          <Label className="text-xs">Tool</Label>
          <div className="flex gap-1">
            <Button
              type="button"
              variant={mode === "erase" ? "default" : "outline"}
              size="sm"
              onClick={() => setMode((m) => (m === "erase" ? null : "erase"))}
            >
              Delete
            </Button>
            <Button
              type="button"
              variant={mode === "insert" ? "default" : "outline"}
              size="sm"
              onClick={() => setMode((m) => (m === "insert" ? null : "insert"))}
            >
              Insert stamp
            </Button>
          </div>
        </div>
        <div className="grid gap-1.5">
          <Label className="text-xs">Font</Label>
          <Select value={font} onValueChange={(v) => setFont((v as StampFont) ?? "Helvetica")}>
            <SelectTrigger className="w-44">
              <SelectValue>{FONT_LABELS[font]}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(FONT_LABELS) as StampFont[]).map((f) => (
                <SelectItem key={f} value={f}>
                  {FONT_LABELS[f]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-1.5">
          <Label className="text-xs">Size</Label>
          <Input
            type="number"
            min={6}
            max={36}
            className="w-20"
            value={fontSize}
            onChange={(e) => setFontSize(Number(e.target.value) || 11)}
          />
        </div>
        <Button
          type="button"
          variant={bold ? "default" : "outline"}
          size="sm"
          onClick={() => setBold((b) => !b)}
          className="font-bold"
        >
          B
        </Button>
      </div>

      <div
        ref={boxRef}
        onMouseDown={handleDown}
        onMouseMove={handleMove}
        onMouseUp={handleUp}
        onMouseLeave={handleUp}
        className={cn(
          "relative overflow-hidden rounded-md border select-none",
          mode === "erase" && "cursor-crosshair",
          mode === "insert" && "cursor-cell"
        )}
        style={{ width: displayWidth, height: displayHeight, maxWidth: "100%" }}
      >
        <iframe
          src={`${fileUrl}#toolbar=0&navpanes=0`}
          className={cn("h-full w-full", mode && "pointer-events-none")}
          title="Document preview"
        />

        {eraseBoxes.map(({ id, box }) => (
          <div
            key={id}
            className="absolute border-2 border-dashed border-destructive bg-destructive/15"
            style={{ left: box.px, top: box.py, width: box.pw, height: box.ph }}
          >
            <button
              type="button"
              aria-label="Delete erase area"
              title="Delete this erase area"
              onMouseDown={(e) => e.stopPropagation()}
              onClick={() => setEraseBoxes((prev) => prev.filter((e) => e.id !== id))}
              className="absolute -top-2 -right-2 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] leading-none text-white shadow"
            >
              ×
            </button>
          </div>
        ))}

        {insertBox && (
          <div
            className={cn(
              "absolute flex items-center overflow-hidden border-2 border-primary bg-primary/10",
              mode === "insert" && "cursor-move"
            )}
            style={{ left: insertBox.px, top: insertBox.py, width: insertBox.pw, height: insertBox.ph }}
          >
            <span
              className="truncate px-0.5 leading-none text-black"
              style={{
                fontFamily: FONT_FAMILY[font],
                fontWeight: bold ? 700 : 400,
                fontSize: Math.max(previewFontSize, 4),
              }}
            >
              {refNumber}
            </span>
            <button
              type="button"
              aria-label="Delete stamp area"
              title="Delete stamp area"
              onMouseDown={(e) => e.stopPropagation()}
              onClick={() => setInsertBox(null)}
              className="absolute -top-2 -right-2 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] leading-none text-white shadow"
            >
              ×
            </button>
          </div>
        )}

        {dragBox && (
          <div
            className={cn(
              "absolute border-2 border-dashed",
              mode === "erase" ? "border-destructive bg-destructive/15" : "border-primary bg-primary/15"
            )}
            style={{ left: dragBox.px, top: dragBox.py, width: dragBox.pw, height: dragBox.ph }}
          />
        )}
      </div>

      <p className="text-xs text-muted-foreground">
        {eraseBoxes.length} erase area{eraseBoxes.length === 1 ? "" : "s"} — use
        the × on a box to delete it. Drag the stamp preview to reposition it.
      </p>

      <Button onClick={confirm} disabled={!insertBox || loading} className="w-fit">
        {loading ? "Stamping..." : "Apply stamp"}
      </Button>
    </div>
  )
}
