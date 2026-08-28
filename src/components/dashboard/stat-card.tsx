"use client"

import { useEffect, useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"

function useCountUp(value: number, durationMs = 700) {
  const [display, setDisplay] = useState(0)

  useEffect(() => {
    const start = performance.now()
    let raf: number
    const tick = (now: number) => {
      const progress = Math.min((now - start) / durationMs, 1)
      setDisplay(Math.round(value * (1 - Math.pow(1 - progress, 3))))
      if (progress < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [value, durationMs])

  return display
}

export function StatCard({
  label,
  value,
  icon,
  accent,
}: {
  label: string
  value: number
  icon: React.ReactNode
  accent?: string
}) {
  const display = useCountUp(value)

  return (
    <Card className="relative overflow-hidden">
      <div
        className={cn(
          "pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full opacity-10 blur-2xl",
          accent ?? "bg-primary"
        )}
      />
      <CardContent className="flex items-center justify-between p-5">
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="text-3xl font-semibold tracking-tight">{display}</p>
        </div>
        <div
          className={cn(
            "rounded-lg p-3 text-primary-foreground",
            accent ?? "bg-primary"
          )}
        >
          {icon}
        </div>
      </CardContent>
    </Card>
  )
}
