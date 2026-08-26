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
export type StampType = "ref" | "date"

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

const STAMP_LABELS: Record<StampType, string> = {
  ref: "Reference No.",
  date: "Date",
}

type DisplayBox = { px: number; py: number; pw: number; ph: number }
type StampSettings = { font: StampFont; bold: boolean; fontSize: number }

let boxId = 0

export function PositionPicker({
  fileUrl,
  pageWidth,
  pageHeight,
  stampTypes,
  previewText,
  onConfirm,
  loading,
}: {
  fileUrl: string
  pageWidth: number
  pageHeight: number
  /** Which stamps still need manual placement — e.g. only ["date"] if the ref
   * number was already auto-stamped. */
  stampTypes: StampType[]
  previewText: Record<StampType, string>
  onConfirm: (payload: {
    eraseBoxes: { x: number; y: number; width: number; height: number }[]
    inserts: {
      x: number
      y: number
      width: number
      height: number
      font: StampFont
      bold: boolean
      fontSize: number
      type: StampType
    }[]
  }) => void
  loading?: boolean
}) {
  const boxRef = useRef<HTMLDivElement>(null)
  const [mode, setMode] = useState<"erase" | StampType | null>("erase")
  const [dragStart, setDragStart] = useState<{ px: number; py: number } | null>(null)
  const [dragBox, setDragBox] = useState<DisplayBox | null>(null)
  const [eraseBoxes, setEraseBoxes] = useState<{ id: number; box: DisplayBox }[]>([])
  const [insertBoxes, setInsertBoxes] = useState<Partial<Record<StampType, DisplayBox>>>({})
  const [moveTarget, setMoveTarget] = useState<StampType | null>(null)
  const [moveOffset, setMoveOffset] = useState<{ x: number; y: number } | null>(null)
  const [settings, setSettings] = useState<Record<StampType, StampSettings>>({
    ref: { font: "Helvetica", bold: false, fontSize: 11 },
    date: { font: "Helvetica", bold: false, fontSize: 11 },
  })

  const displayWidth = 640
  const displayHeight = (displayWidth * pageHeight) / pageWidth
  const scale = pageWidth / displayWidth

  const activeType = mode === "erase" || mode === null ? null : mode
  const activeSettings = activeType ? settings[activeType] : null

  function updateActiveSettings(patch: Partial<StampSettings>) {
    if (!activeType) return
    setSettings((prev) => ({ ...prev, [activeType]: { ...prev[activeType], ...patch } }))
  }

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
    if (mode !== "erase") {
      const box = insertBoxes[mode]
      if (box && insideBox(p, box)) {
        setMoveTarget(mode)
        setMoveOffset({ x: p.px - box.px, y: p.py - box.py })
        return
      }
    }
    setDragStart(p)
    setDragBox(null)
  }

  function handleMove(e: React.MouseEvent<HTMLDivElement>) {
    const cur = toLocal(e)
    if (moveOffset && moveTarget) {
      const box = insertBoxes[moveTarget]
      if (box) {
        const maxX = Math.max(displayWidth - box.pw, 0)
        const maxY = Math.max(displayHeight - box.ph, 0)
        setInsertBoxes((prev) => ({
          ...prev,
          [moveTarget]: {
            ...box,
            px: Math.min(Math.max(cur.px - moveOffset.x, 0), maxX),
            py: Math.min(Math.max(cur.py - moveOffset.y, 0), maxY),
          },
        }))
      }
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
      setMoveTarget(null)
      return
    }
    setDragStart(null)
    if (!dragBox || dragBox.pw < 4 || dragBox.ph < 4) {
      setDragBox(null)
      return
    }
    if (mode === "erase") {
      setEraseBoxes((prev) => [...prev, { id: boxId++, box: dragBox }])
    } else if (mode) {
      setInsertBoxes((prev) => ({ ...prev, [mode]: dragBox }))
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

  const allPlaced = stampTypes.every((t) => insertBoxes[t])

  function confirm() {
    if (!allPlaced) return
    onConfirm({
      eraseBoxes: eraseBoxes.map((e) => toPdfBox(e.box)),
      inserts: stampTypes.map((type) => ({
        ...toPdfBox(insertBoxes[type]!),
        ...settings[type],
        type,
      })),
    })
  }

  return (
    <div className="grid gap-3">
      <p className="text-sm text-muted-foreground">
        Use <span className="font-medium text-foreground">Delete</span> to
        erase old text, then place each stamp (
        {stampTypes.map((t) => (
          <span key={t} className="font-medium text-foreground">
            {STAMP_LABELS[t]}
            {t !== stampTypes[stampTypes.length - 1] ? ", " : ""}
          </span>
        ))}
        ) where it should go. Click the active tool again to deselect it so
        you can scroll or move around the page underneath.
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
            {stampTypes.map((t) => (
              <Button
                key={t}
                type="button"
                variant={mode === t ? "default" : "outline"}
                size="sm"
                onClick={() => setMode((m) => (m === t ? null : t))}
              >
                Place {STAMP_LABELS[t]}
              </Button>
            ))}
          </div>
        </div>
        {activeType && activeSettings && (
          <>
            <div className="grid gap-1.5">
              <Label className="text-xs">Font</Label>
              <Select
                value={activeSettings.font}
                onValueChange={(v) => updateActiveSettings({ font: (v as StampFont) ?? "Helvetica" })}
              >
                <SelectTrigger className="w-44">
                  <SelectValue>{FONT_LABELS[activeSettings.font]}</SelectValue>
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
                value={activeSettings.fontSize}
                onChange={(e) => updateActiveSettings({ fontSize: Number(e.target.value) || 11 })}
              />
            </div>
            <Button
              type="button"
              variant={activeSettings.bold ? "default" : "outline"}
              size="sm"
              onClick={() => updateActiveSettings({ bold: !activeSettings.bold })}
              className="font-bold"
            >
              B
            </Button>
          </>
        )}
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
          mode && mode !== "erase" && "cursor-cell"
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

        {stampTypes.map((type) => {
          const box = insertBoxes[type]
          if (!box) return null
          const s = settings[type]
          const previewFontSize = s.fontSize / scale
          return (
            <div
              key={type}
              className={cn(
                "absolute flex items-center overflow-hidden border-2 border-primary bg-primary/10",
                mode === type && "cursor-move"
              )}
              style={{ left: box.px, top: box.py, width: box.pw, height: box.ph }}
            >
              <span
                className="truncate px-0.5 leading-none text-black"
                style={{
                  fontFamily: FONT_FAMILY[s.font],
                  fontWeight: s.bold ? 700 : 400,
                  fontSize: Math.max(previewFontSize, 4),
                }}
              >
                {previewText[type]}
              </span>
              <button
                type="button"
                aria-label={`Delete ${STAMP_LABELS[type]} stamp area`}
                title={`Delete ${STAMP_LABELS[type]} stamp area`}
                onMouseDown={(e) => e.stopPropagation()}
                onClick={() => setInsertBoxes((prev) => ({ ...prev, [type]: undefined }))}
                className="absolute -top-2 -right-2 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] leading-none text-white shadow"
              >
                ×
              </button>
            </div>
          )
        })}

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
        the × on a box to delete it. Drag a stamp preview to reposition it.
      </p>

      <Button onClick={confirm} disabled={!allPlaced || loading} className="w-fit">
        {loading ? "Stamping..." : "Apply stamp"}
      </Button>
    </div>
  )
}
