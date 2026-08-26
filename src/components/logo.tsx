import { cn } from "@/lib/utils"

export function Logo({
  className,
  variant = "light",
}: {
  className?: string
  variant?: "light" | "dark"
}) {
  const dark = variant === "dark"

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div
        className={cn(
          "shrink-0 rounded-md",
          dark && "bg-white/95 px-2 py-1"
        )}
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- small static asset, next/image's optimizer isn't needed here */}
        <img
          src="/logo_g7aero.png"
          alt="G7 Aerospace"
          className="h-12 w-auto object-contain"
          onError={(e) => {
            e.currentTarget.style.display = "none"
          }}
        />
      </div>
    </div>
  )
}
