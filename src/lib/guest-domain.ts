export function allowedGuestDomains() {
  return (process.env.GUEST_EMAIL_DOMAINS ?? "")
    .split(",")
    .map((d) => d.trim().toLowerCase())
    .filter(Boolean)
}

export function isAllowedGuestEmail(email: string) {
  const domain = email.split("@")[1]?.toLowerCase()
  return !!domain && allowedGuestDomains().includes(domain)
}
