"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { signOut, useSession } from "next-auth/react"
import { LayoutDashboard, FileText, PlusCircle, LogOut } from "lucide-react"
import { Logo } from "@/components/logo"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const { data: session } = useSession()
  const role = session?.user?.role

  const links = [
    ...(role === "ADMIN"
      ? [{ href: "/dashboard", label: "Dashboard", icon: LayoutDashboard }]
      : []),
    { href: "/references", label: "References", icon: FileText },
    { href: "/references/new", label: "New Reference", icon: PlusCircle },
  ]

  return (
    <div className="flex min-h-screen w-full">
      <aside className="hidden w-64 shrink-0 flex-col justify-between bg-sidebar text-sidebar-foreground md:flex">
        <div >
          <div className="px-5 py-5">
            <Logo variant="dark" className="flex justify-center items-center"/>
          </div>
          <nav className="mt-4 flex flex-col gap-1 px-3">
            {links.map((link) => {
              const Icon = link.icon
              const active = pathname === link.href
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    "flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                    active
                      ? "bg-sidebar-primary text-sidebar-primary-foreground"
                      : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {link.label}
                </Link>
              )
            })}
          </nav>
        </div>
        <div className="px-5 py-4">
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
      </aside>
      <main className="flex-1 bg-background">
        <div className="flex items-center justify-between border-b px-4 py-3 md:hidden">
          <Logo />
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
