"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { format } from "date-fns"
import { toast } from "sonner"
import { Button, buttonVariants } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { PlusCircle, Trash2 } from "lucide-react"

const statusVariant: Record<string, "default" | "secondary" | "outline"> = {
  REGISTERED: "outline",
  STAMPED: "secondary",
  SENT: "default",
}

type Reference = {
  id: string
  refNumber: string
  title: string
  picName: string
  registerDate: Date
  status: "REGISTERED" | "STAMPED" | "SENT"
}

export function ReferencesTable({
  references,
  subtitle,
}: {
  references: Reference[]
  subtitle: string
}) {
  const router = useRouter()
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [deleting, setDeleting] = useState(false)

  const allSelected = references.length > 0 && selected.size === references.length

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleAll() {
    setSelected(allSelected ? new Set() : new Set(references.map((r) => r.id)))
  }

  async function handleBulkDelete() {
    if (selected.size === 0) return
    if (!window.confirm(`Delete ${selected.size} reference(s)? This cannot be undone.`)) return

    setDeleting(true)
    const res = await fetch("/api/references", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: Array.from(selected) }),
    })
    setDeleting(false)

    if (!res.ok) {
      toast.error("Failed to delete references")
      return
    }
    toast.success("References deleted")
    setSelected(new Set())
    router.refresh()
  }

  return (
    <>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Document References
          </h1>
          <p className="text-muted-foreground">{subtitle}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="destructive"
            size="icon"
            onClick={handleBulkDelete}
            disabled={selected.size === 0 || deleting}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
          <Link href="/references/new" className={buttonVariants()}>
            <PlusCircle className="mr-1 h-4 w-4" />
            New Reference
          </Link>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">All references</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-8">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={toggleAll}
                    aria-label="Select all"
                  />
                </TableHead>
                <TableHead>Reference No.</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>PIC</TableHead>
                <TableHead>Registered</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {references.map((r) => (
                <TableRow key={r.id}>
                  <TableCell>
                    <input
                      type="checkbox"
                      checked={selected.has(r.id)}
                      onChange={() => toggle(r.id)}
                      aria-label={`Select ${r.refNumber}`}
                    />
                  </TableCell>
                  <TableCell>
                    <Link
                      href={`/references/${r.id}`}
                      className="font-mono text-sm font-medium text-primary hover:underline"
                    >
                      {r.refNumber}
                    </Link>
                  </TableCell>
                  <TableCell className="max-w-xs truncate">{r.title}</TableCell>
                  <TableCell>{r.picName}</TableCell>
                  <TableCell>{format(r.registerDate, "dd/MM/yyyy")}</TableCell>
                  <TableCell>
                    <Badge variant={statusVariant[r.status]}>{r.status}</Badge>
                  </TableCell>
                </TableRow>
              ))}
              {references.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                    No references yet. Create your first one.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </>
  )
}
