"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { toast } from "sonner"
import { AppShell } from "@/components/app-shell"
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
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"

type Category = { id: string; code: string; name: string }

export default function NewReferencePage() {
  const router = useRouter()
  const { data: session } = useSession()
  const [categories, setCategories] = useState<Category[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [form, setForm] = useState({
    categoryId: "",
    title: "",
    registerDate: new Date().toISOString().slice(0, 10),
    picName: "",
    picEmployeeId: "",
    picEmail: "",
  })
  const [file, setFile] = useState<File | null>(null)

  useEffect(() => {
    fetch("/api/categories")
      .then((r) => r.json())
      .then((data: Category[]) => {
        setCategories(data)
        if (data[0]) setForm((f) => ({ ...f, categoryId: data[0].id }))
      })
  }, [])

  useEffect(() => {
    if (session?.user?.role === "GUEST" && session.user.email) {
      setForm((f) => (f.picEmail ? f : { ...f, picEmail: session.user.email! }))
    }
  }, [session])

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)

    const res = await fetch("/api/references", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    })
    const data = await res.json()

    if (!res.ok) {
      toast.error("Failed to create reference number")
      setSubmitting(false)
      return
    }

    if (file) {
      const fd = new FormData()
      fd.append("file", file)
      const uploadRes = await fetch(`/api/references/${data.id}/upload`, { method: "POST", body: fd })
      if (!uploadRes.ok) {
        toast.warning(`Reference number ${data.refNumber} created, but the document failed to attach`)
        router.push(`/references/${data.id}`)
        return
      }
    }

    toast.success(`Reference number ${data.refNumber} created`)
    router.push(`/references/${data.id}`)
  }

  return (
    <AppShell>
      <div className="mx-auto max-w-xl">
        <h1 className="mb-1 text-2xl font-semibold tracking-tight">
          New Document Reference
        </h1>
        <p className="mb-6 text-muted-foreground">
          Fill in the details below to register a new reference number.
        </p>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Document details</CardTitle>
            <CardDescription>
              A reference number in the form G7/CODE/NNN/YYYY will be
              generated automatically once submitted.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={onSubmit} className="grid gap-4">
              <div className="grid gap-2">
                <Label>Document category</Label>
                <Select
                  value={form.categoryId}
                  onValueChange={(v) => setForm({ ...form, categoryId: v ?? "" })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select category">
                      {(id: string) => {
                        const c = categories.find((cat) => cat.id === id)
                        return c ? `${c.code} — ${c.name}` : ""
                      }}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.code} — {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="title">Document title</Label>
                <Input
                  id="title"
                  required
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="registerDate">Register date</Label>
                <Input
                  id="registerDate"
                  type="date"
                  required
                  value={form.registerDate}
                  onChange={(e) => setForm({ ...form, registerDate: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="picName">PIC name</Label>
                  <Input
                    id="picName"
                    required
                    value={form.picName}
                    onChange={(e) => setForm({ ...form, picName: e.target.value })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="picEmployeeId">PIC Employee ID</Label>
                  <Input
                    id="picEmployeeId"
                    required
                    value={form.picEmployeeId}
                    onChange={(e) => setForm({ ...form, picEmployeeId: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="picEmail">PIC email</Label>
                <Input
                  id="picEmail"
                  type="email"
                  required
                  value={form.picEmail}
                  onChange={(e) => setForm({ ...form, picEmail: e.target.value })}
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="file">Upload document (PDF)</Label>
                <Input
                  id="file"
                  type="file"
                  accept="application/pdf"
                  onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                />
              </div>

              <Button type="submit" disabled={submitting || !form.categoryId}>
                {submitting ? "Generating..." : "Generate reference number"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  )
}
