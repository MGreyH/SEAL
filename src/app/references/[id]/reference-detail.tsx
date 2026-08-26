"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { format } from "date-fns"
import { Button, buttonVariants } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { PositionPicker, type StampFont, type StampType } from "@/components/references/position-picker"
import { Eye, MessageCircle, Send, Trash2 } from "lucide-react"

type CarriedInsert = {
  x: number
  y: number
  width: number
  height: number
  fontSize: number
  font: StampFont
  bold: boolean
  type: StampType
}

type Reference = {
  id: string
  refNumber: string
  title: string
  registerDate: string
  picName: string
  picPosition: string
  picEmail: string
  status: "REGISTERED" | "STAMPED" | "SENT"
  originalFilePath: string | null
  stampedFilePath: string | null
  category: { code: string; name: string }
}

export function ReferenceDetail({ initial }: { initial: Reference }) {
  const router = useRouter()
  const [reference, setReference] = useState(initial)
  const [pageSize, setPageSize] = useState<{ w: number; h: number } | null>(null)
  const [uploading, setUploading] = useState(false)
  const [stamping, setStamping] = useState(false)
  const [sending, setSending] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [restamping, setRestamping] = useState(false)
  const [autoStamping, setAutoStamping] = useState(false)
  const [shareEmail, setShareEmail] = useState("")
  const [sharingEmail, setSharingEmail] = useState(false)
  const [sharingWhatsapp, setSharingWhatsapp] = useState(false)
  const [manualStampTypes, setManualStampTypes] = useState<StampType[]>(["ref", "date"])
  const [carriedStamp, setCarriedStamp] = useState<{
    eraseBoxes: { x: number; y: number; width: number; height: number }[]
    inserts: CarriedInsert[]
  } | null>(null)
  const autoAttempted = useRef(false)

  useEffect(() => {
    if (!reference.originalFilePath || reference.stampedFilePath || autoAttempted.current) {
      return
    }
    autoAttempted.current = true
    ;(async () => {
      const found = await autoStamp()
      const missing = (["ref", "date"] as StampType[]).filter((t) => !found[t])
      if (missing.length > 0) {
        setManualStampTypes(missing)
        const res = await fetch(`/api/references/${reference.id}/dims`)
        const data = await res.json()
        if (res.ok) setPageSize({ w: data.pageWidth, h: data.pageHeight })
      }
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reference.id, reference.originalFilePath, reference.stampedFilePath])

  async function handleUpload(file: File) {
    setUploading(true)
    const fd = new FormData()
    fd.append("file", file)
    const res = await fetch(`/api/references/${reference.id}/upload`, {
      method: "POST",
      body: fd,
    })
    const data = await res.json()
    setUploading(false)

    if (!res.ok) {
      toast.error(data.error ?? "Upload failed")
      return
    }
    setReference(data)
    router.refresh()
  }

  async function autoStamp(): Promise<{ ref: boolean; date: boolean }> {
    setAutoStamping(true)
    const res = await fetch(`/api/references/${reference.id}/auto-stamp`, { method: "POST" })
    const data = await res.json()
    setAutoStamping(false)

    if (!res.ok) {
      toast.error(data.error ?? "Auto-stamp failed")
      return { ref: false, date: false }
    }
    const found = data.found as { ref: boolean; date: boolean }
    if (!found.ref && !found.date) {
      toast.info(
        "Couldn't find \"Our ref.:\" or \"Date:\" on the document — position them manually below"
      )
      return found
    }

    setReference(data)
    if (found.ref && found.date) {
      setRestamping(false)
      setCarriedStamp(null)
      toast.success("Auto-detected \"Our ref.:\" and \"Date:\" and stamped them")
    } else {
      setRestamping(true)
      setCarriedStamp(data.applied)
      const missingLabel = found.ref ? "\"Date:\"" : "\"Our ref.:\""
      toast.info(`Stamped what was found — couldn't find ${missingLabel}, position it manually below`)
    }
    router.refresh()
    return found
  }

  async function handleStamp(payload: {
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
  }) {
    setStamping(true)
    const merged = carriedStamp
      ? {
          eraseBoxes: [...carriedStamp.eraseBoxes, ...payload.eraseBoxes],
          inserts: [...carriedStamp.inserts, ...payload.inserts],
        }
      : payload
    const res = await fetch(`/api/references/${reference.id}/stamp`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(merged),
    })
    const data = await res.json()
    setStamping(false)

    if (!res.ok) {
      toast.error(data.error ?? "Stamping failed")
      return
    }
    setReference(data)
    setRestamping(false)
    setCarriedStamp(null)
    setManualStampTypes(["ref", "date"])
    toast.success("Stamped onto document")
    router.refresh()
  }

  async function handleSend() {
    setSending(true)
    const res = await fetch(`/api/references/${reference.id}/send`, { method: "POST" })
    const data = await res.json()
    setSending(false)

    if (!res.ok) {
      toast.error(data.error ?? "Failed to send email")
      return
    }
    setReference(data)
    toast.success(`Sent to ${reference.picEmail}`)
    router.refresh()
  }

  async function handleDelete() {
    if (!window.confirm("Delete this reference? This cannot be undone.")) return
    setDeleting(true)
    const res = await fetch(`/api/references/${reference.id}`, { method: "DELETE" })
    setDeleting(false)

    if (!res.ok) {
      toast.error("Failed to delete reference")
      return
    }
    toast.success("Reference deleted")
    router.push("/references")
  }

  async function startRestamp() {
    if (!pageSize) {
      const res = await fetch(`/api/references/${reference.id}/dims`)
      const data = await res.json()
      if (res.ok) setPageSize({ w: data.pageWidth, h: data.pageHeight })
    }
    setManualStampTypes(["ref", "date"])
    setCarriedStamp(null)
    setRestamping(true)
  }

  async function getShareLink() {
    const res = await fetch(`/api/references/${reference.id}/share-link`, { method: "POST" })
    const data = await res.json()
    if (!res.ok) {
      toast.error(data.error ?? "Couldn't create a share link")
      return null
    }
    return data.url as string
  }

  async function handleShareEmail() {
    if (!shareEmail) return
    setSharingEmail(true)
    const res = await fetch(`/api/references/${reference.id}/share-email`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ to: shareEmail }),
    })
    const data = await res.json()
    setSharingEmail(false)

    if (!res.ok) {
      toast.error(data.error ?? "Failed to send")
      return
    }
    toast.success(`Sent to ${shareEmail}`)
    setShareEmail("")
  }

  async function handleShareWhatsapp() {
    setSharingWhatsapp(true)
    try {
      const fileRes = await fetch(stampedUrl)
      if (fileRes.ok) {
        const blob = await fileRes.blob()
        const file = new File([blob], `${reference.refNumber.replace(/\//g, "-")}.pdf`, {
          type: "application/pdf",
        })
        if (navigator.canShare?.({ files: [file] })) {
          await navigator.share({
            files: [file],
            title: reference.refNumber,
            text: reference.title,
          })
          return
        }
      }
    } catch (err) {
      // AbortError means the user cancelled the share sheet — not a failure.
      if (err instanceof Error && err.name === "AbortError") return
    } finally {
      setSharingWhatsapp(false)
    }

    toast.info("This browser can't attach the file directly — download it below and attach it in WhatsApp manually")
    const url = await getShareLink()
    if (!url) return
    const text = `${reference.refNumber} — ${reference.title}\n${url}`
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank")
  }

  const previewUrl = `/api/references/${reference.id}/file?kind=original`
  const stampedUrl = `/api/references/${reference.id}/file?kind=stamped`

  return (
    <div className="mx-auto grid max-w-3xl gap-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="font-mono text-2xl font-semibold text-primary">
            {reference.refNumber}
          </p>
          <p className="text-muted-foreground">{reference.title}</p>
        </div>
        <Badge variant={reference.status === "SENT" ? "default" : "secondary"}>
          {reference.status}
        </Badge>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Details</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4 text-sm">
          <div className="col-span-2">
            <p className="text-muted-foreground">Reference No.</p>
            <p className="font-mono font-medium">{reference.refNumber}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Category</p>
            <p className="font-medium">{reference.category.code}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Registered on</p>
            <p className="font-medium">{format(reference.registerDate, "dd/MM/yyyy")}</p>
          </div>
          <div>
            <p className="text-muted-foreground">PIC</p>
            <p className="font-medium">
              {reference.picName} — {reference.picPosition}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground">PIC email</p>
            <p className="font-medium">{reference.picEmail}</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Document</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          {!reference.originalFilePath && (
            <div className="grid gap-2">
              <Input
                type="file"
                accept="application/pdf"
                onChange={(e) => {
                  const f = e.target.files?.[0]
                  if (f) handleUpload(f)
                }}
                disabled={uploading}
              />
              <p className="text-xs text-muted-foreground">
                Optional — upload the PDF you want the reference number
                stamped onto.
              </p>
            </div>
          )}

          {reference.originalFilePath && (!reference.stampedFilePath || restamping) && (
            <>
              {pageSize ? (
                <PositionPicker
                  fileUrl={previewUrl}
                  pageWidth={pageSize.w}
                  pageHeight={pageSize.h}
                  stampTypes={manualStampTypes}
                  previewText={{
                    ref: reference.refNumber,
                    date: format(new Date(reference.registerDate), "d MMM yyyy"),
                  }}
                  onConfirm={handleStamp}
                  loading={stamping}
                />
              ) : (
                <p className="text-sm text-muted-foreground">Loading document…</p>
              )}
            </>
          )}

          {reference.stampedFilePath && !restamping && (
            <div className="flex flex-wrap items-center gap-3">
              <Dialog>
                <DialogTrigger
                  render={
                    <Button variant="secondary">
                      <Eye className="mr-2 h-4 w-4" />
                      Preview document
                    </Button>
                  }
                />
                <DialogContent className="max-w-4xl sm:max-w-4xl">
                  <DialogHeader>
                    <DialogTitle className="font-mono">{reference.refNumber}</DialogTitle>
                  </DialogHeader>
                  <iframe src={stampedUrl} className="h-[75vh] w-full rounded-md border" title="Stamped document preview" />
                </DialogContent>
              </Dialog>
              <a
                href={stampedUrl}
                target="_blank"
                className="text-sm font-medium text-primary hover:underline"
              >
                Download
              </a>
              <Button variant="secondary" size="sm" onClick={autoStamp} disabled={autoStamping}>
                {autoStamping ? "Scanning..." : "Auto re-stamp (AI scan)"}
              </Button>
              <Button variant="ghost" size="sm" onClick={startRestamp}>
                Re-stamp position
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {reference.stampedFilePath && !restamping && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Share</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="flex flex-wrap items-center gap-2">
              <Input
                type="email"
                placeholder="someone@example.com"
                value={shareEmail}
                onChange={(e) => setShareEmail(e.target.value)}
                className="max-w-xs"
              />
              <Button
                variant="secondary"
                size="sm"
                onClick={handleShareEmail}
                disabled={!shareEmail || sharingEmail}
              >
                {sharingEmail ? "Sending..." : "Email"}
              </Button>
              <a
                href={stampedUrl}
                target="_blank"
                className={buttonVariants({ variant: "secondary", size: "sm" })}
              >
                Download
              </a>
              <Button
                variant="secondary"
                size="sm"
                onClick={handleShareWhatsapp}
                disabled={sharingWhatsapp}
              >
                <MessageCircle className="mr-1.5 h-4 w-4" />
                {sharingWhatsapp ? "Preparing..." : "WhatsApp"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Separator />

      <div className="flex justify-between">
        <Button variant="destructive" size="icon" onClick={handleDelete} disabled={deleting}>
          <Trash2 className="h-4 w-4" />
        </Button>
        <Button onClick={handleSend} disabled={sending || reference.status === "SENT"}>
          <Send className="mr-2 h-4 w-4" />
          {reference.status === "SENT" ? "Already sent" : sending ? "Sending..." : "Send to PIC email"}
        </Button>
      </div>
    </div>
  )
}
