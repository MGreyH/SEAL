"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { signIn } from "next-auth/react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Logo } from "@/components/logo"

export default function LoginPage() {
  const router = useRouter()

  function goHome() {
    router.push("/")
    router.refresh()
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-primary/5 via-background to-background px-4">
      <Card className="w-full max-w-sm shadow-lg">
        <CardHeader className="items-center text-center">
          <Logo className="mb-2 justify-center flex" />
          <CardTitle>Sign in</CardTitle>
          <CardDescription>SEAL — System for E-document Allocation and Logging</CardDescription>
        </CardHeader>
        <CardContent>
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
        </CardContent>
      </Card>
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
        {loading ? "Signing in..." : "Continue as guest"}
      </Button>
    </form>
  )
}

function AdminLoginForm({ onSuccess }: { onSuccess: () => void }) {
  const [loading, setLoading] = useState(false)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const res = await signIn("credentials", { email, password, redirect: false })
    setLoading(false)

    if (res?.error) {
      toast.error("Invalid email or password")
      return
    }
    onSuccess()
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-4">
      <div className="grid gap-2">
        <Label htmlFor="admin-email">Email</Label>
        <Input
          id="admin-email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
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
