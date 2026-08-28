"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { signOut, useSession } from "next-auth/react"
import { LayoutDashboard, FileText, LogOut, Menu, X } from "lucide-react"
import { Logo } from "@/components/logo"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const { data: session } = useSession()
  const role = session?.user?.role
  const [menuOpen, setMenuOpen] = useState(false)

  const links = [
    ...(role === "ADMIN"
      ? [{ href: "/dashboard", label: "Dashboard", icon: LayoutDashboard }]
      : []),
    { href: "/references", label: "Document References", icon: FileText },
    // { href: "/references/new", label: "New Reference", icon: PlusCircle },
  ]

  function renderLinks(onNavigate?: () => void) {
    return links.map((link) => {
      const Icon = link.icon
      const active = pathname === link.href
      return (
        <Link
          key={link.href}
          href={link.href}
          onClick={onNavigate}
          className={cn(
            "flex items-center gap-2 rounded-md border-l-2 px-3 py-2 text-sm font-medium transition-colors",
            active
              ? "border-l-primary bg-sidebar-primary text-sidebar-primary-foreground"
              : "border-l-transparent text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          )}
        >
          <Icon className="h-4 w-4" />
          {link.label}
        </Link>
      )
    })
  }

  function sidebarBody(onNavigate?: () => void) {
    return (
      <>
        <div>
          <div className="border-b border-sidebar-border px-5 py-5">
            <Logo variant="dark" className="flex justify-center items-center"/>
            <div className="mt-2 text-center text-sm font-medium text-sidebar-foreground/80">
              System for E-Document Allocation and Logging (SEAL)
            </div>
          </div>
          <nav className="mt-4 flex flex-col gap-1 px-3">{renderLinks(onNavigate)}</nav>
        </div>
        <div className="border-t border-sidebar-border px-5 py-4">
          <p className="truncate text-xs text-sidebar-foreground/60">
            {session?.user?.email}
          </p>
          <p className="mb-3 text-xs font-medium text-sidebar-foreground/80">
            {role === "ADMIN" ? "Administrator" : "Guest"}
          </p>
          <Button
            variant="secondary"
            size="sm"
            className="w-full justify-start gap-2"
            onClick={() => signOut({ callbackUrl: "/login" })}
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </Button>
        </div>
      </>
    )
  }

  return (
    <div className="flex min-h-screen w-full">
      <aside className="hidden w-64 shrink-0 flex-col justify-between border-r border-sidebar-border bg-sidebar text-sidebar-foreground md:flex">
        {sidebarBody()}
      </aside>

      {/* Mobile drawer: overlays the page instead of pushing content down */}
      {menuOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setMenuOpen(false)}
            aria-hidden
          />
          <aside className="absolute inset-y-0 left-0 flex w-64 flex-col justify-between border-r border-sidebar-border bg-sidebar text-sidebar-foreground shadow-xl">
            {sidebarBody(() => setMenuOpen(false))}
          </aside>
        </div>
      )}

      <main className="min-w-0 flex-1 bg-background">
        <div className="flex items-center justify-between border-b px-4 py-3 md:hidden">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              aria-label={menuOpen ? "Close menu" : "Open menu"}
              onClick={() => setMenuOpen((o) => !o)}
            >
              {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
            <Logo />
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => signOut({ callbackUrl: "/login" })}
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
        <div className="p-4 md:p-8">{children}</div>
      </main>
    </div>
  )
}
