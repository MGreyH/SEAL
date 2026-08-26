"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { format } from "date-fns"
import { toast } from "sonner"
import { Button, buttonVariants } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { PlusCircle, Trash2, ArrowUp, ArrowDown, ArrowUpDown } from "lucide-react"

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

type SortKey = "refNumber" | "title" | "picName" | "registerDate" | "status"
type SortDir = "asc" | "desc"

const COLUMNS: { key: SortKey; label: string }[] = [
  { key: "refNumber", label: "Reference No." },
  { key: "title", label: "Title" },
  { key: "picName", label: "PIC" },
  { key: "registerDate", label: "Registered" },
  { key: "status", label: "Status" },
]

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
  const [search, setSearch] = useState("")
  const [sortKey, setSortKey] = useState<SortKey | null>(null)
  const [sortDir, setSortDir] = useState<SortDir>("asc")

  const displayed = useMemo(() => {
    const q = search.trim().toLowerCase()
    const filtered = q
      ? references.filter((r) =>
          [r.refNumber, r.title, r.picName, format(r.registerDate, "dd/MM/yyyy")]
            .join(" ")
            .toLowerCase()
            .includes(q)
        )
      : references

    if (!sortKey) return filtered

    const sorted = [...filtered].sort((a, b) => {
      if (sortKey === "registerDate") {
        return a.registerDate.getTime() - b.registerDate.getTime()
      }
      return a[sortKey].localeCompare(b[sortKey])
    })
    return sortDir === "asc" ? sorted : sorted.reverse()
  }, [references, search, sortKey, sortDir])

  const allSelected = displayed.length > 0 && displayed.every((r) => selected.has(r.id))

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleAll() {
    setSelected((prev) => {
      if (allSelected) {
        const next = new Set(prev)
        for (const r of displayed) next.delete(r.id)
        return next
      }
      const next = new Set(prev)
      for (const r of displayed) next.add(r.id)
      return next
    })
  }

  function toggleSort(key: SortKey) {
    if (sortKey !== key) {
      setSortKey(key)
      setSortDir("asc")
    } else {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"))
    }
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
    <div className="flex flex-col">
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

      <Input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search by reference no., title, PIC, or date"
        className="mb-4 max-w-md shrink-0"
      />

      <Card className="flex flex-col">
        <CardHeader className="shrink-0">
          <CardTitle className="text-base">All references</CardTitle>
        </CardHeader>
        <CardContent className="max-h-[calc(100vh-19rem)] overflow-y-auto">
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
                {COLUMNS.map((col) => (
                  <TableHead key={col.key}>
                    <button
                      type="button"
                      onClick={() => toggleSort(col.key)}
                      className="flex items-center gap-1 font-medium hover:text-foreground"
                    >
                      {col.label}
                      {sortKey === col.key ? (
                        sortDir === "asc" ? (
                          <ArrowUp className="h-3.5 w-3.5" />
                        ) : (
                          <ArrowDown className="h-3.5 w-3.5" />
                        )
                      ) : (
                        <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground/50" />
                      )}
                    </button>
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {displayed.map((r) => (
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
              {displayed.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                    {references.length === 0
                      ? "No references yet. Create your first one."
                      : "No references match your search."}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
