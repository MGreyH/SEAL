"use client"

import { useState } from "react"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { signIn } from "next-auth/react"
import { toast } from "sonner"
import { Briefcase, TrendingUp, Users } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Logo } from "@/components/logo"

const FEATURES = [
  {
    icon: Briefcase,
    color: "bg-primary",
    title: "Track References Efficiently",
    desc: "Register, stamp, and manage document references on time.",
  },
  {
    icon: TrendingUp,
    color: "bg-chart-3",
    title: "Monitor Progress in Real-time",
    desc: "Get real-time insights and reporting.",
  },
  {
    icon: Users,
    color: "bg-chart-4",
    title: "Collaborate with Your Team",
    desc: "Work together and achieve more.",
  },
]

export default function LoginPage() {
  const router = useRouter()

  function goHome() {
    router.push("/")
    router.refresh()
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-y-auto px-4 py-8">
      {/* TODO: swap in a real background image at public/login-bg.jpg */}
      <Image
        src="/login-bg.jpg"
        alt=""
        aria-hidden
        fill
        priority
        sizes="100vw"
        className="-z-10 object-cover"
        onError={(e) => {
          e.currentTarget.style.display = "none"
        }}
      />

      <div className="my-auto grid w-full max-w-4xl overflow-hidden rounded-2xl border shadow-lg md:grid-cols-2">
        {/* Left panel */}
        <div className="flex flex-col justify-between bg-sidebar p-6 text-sidebar-foreground md:p-8">
          <div>
            <Logo variant="dark" />
            <h1 className="mt-6 text-2xl font-bold tracking-tight">
              Register. Stamp. Deliver.
            </h1>
            <p className="mt-2 text-sm text-sidebar-foreground/70">
              SEAL — System for E-document Allocation and Logging. An
              integrated platform to manage, track, and log document
              references.
            </p>

            <div className="mt-8 hidden flex-col gap-3 md:flex">
              {FEATURES.map((f) => (
                <div
                  key={f.title}
                  className="flex items-start gap-3 rounded-lg bg-sidebar-accent/60 p-3"
                >
                  <div className={`shrink-0 rounded-md ${f.color} p-2 text-primary-foreground`}>
                    <f.icon className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold">{f.title}</p>
                    <p className="text-xs text-sidebar-foreground/60">{f.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* TODO: add G7 Marine / G7 Aerospace partner logos to public/ and render here */}
          <p className="mt-8 text-xs text-sidebar-foreground/50 text-center">
            © {new Date().getFullYear()} G7 Group of Companies. All rights reserved.
          </p>
        </div>

        {/* Right panel */}
        <div className="flex flex-col justify-center bg-card p-6 md:p-8">
          <h2 className="text-xl font-bold tracking-tight">Welcome Back!</h2>
          <p className="mb-6 text-sm text-muted-foreground">
            Please sign in to your account
          </p>

          <Tabs defaultValue="guest">
            <TabsList className="w-full">
              <TabsTrigger value="guest" className="flex-1">
                Guest
              </TabsTrigger>
              <TabsTrigger value="admin" className="flex-1">
                Admin
              </TabsTrigger>
            </TabsList>
            <TabsContent value="guest" className="pt-4">
              <GuestLoginForm onSuccess={goHome} />
            </TabsContent>
            <TabsContent value="admin" className="pt-4">
              <AdminLoginForm onSuccess={goHome} />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  )
}

function GuestLoginForm({ onSuccess }: { onSuccess: () => void }) {
  const [loading, setLoading] = useState(false)
  const [email, setEmail] = useState("")

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const res = await signIn("guest", { email, redirect: false })
    setLoading(false)

    if (res?.error) {
      toast.error("Email must be @g7aerospace.com.my or @gmail.com")
      return
    }
    onSuccess()
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-4">
      <div className="grid gap-2">
        <Label htmlFor="guest-email">Email</Label>
        <Input
          id="guest-email"
          type="email"
          required
          placeholder="you@g7aerospace.com.my"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <p className="text-xs text-muted-foreground">
          No password needed — just use a @g7aerospace.com.my or @gmail.com
          address to register document reference numbers.
        </p>
      </div>
      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? "Signing in..." : "Sign In"}
      </Button>
    </form>
  )
}

function AdminLoginForm({ onSuccess }: { onSuccess: () => void }) {
  const [loading, setLoading] = useState(false)
  const [identifier, setIdentifier] = useState("")
  const [password, setPassword] = useState("")

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const res = await signIn("credentials", { identifier, password, redirect: false })
    setLoading(false)

    if (res?.error) {
      toast.error("Invalid username/email or password")
      return
    }
    onSuccess()
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-4">
      <div className="grid gap-2">
        <Label htmlFor="admin-identifier">Username or Email</Label>
        <Input
          id="admin-identifier"
          type="text"
          required
          value={identifier}
          onChange={(e) => setIdentifier(e.target.value)}
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="admin-password">Password</Label>
        <Input
          id="admin-password"
          type="password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </div>
      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? "Signing in..." : "Sign in"}
      </Button>
    </form>
  )
}
