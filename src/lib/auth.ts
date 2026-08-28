import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import bcrypt from "bcryptjs"
import { prisma } from "@/lib/prisma"
import { isAllowedGuestEmail } from "@/lib/guest-domain"

export const { handlers, signIn, signOut, auth } = NextAuth({
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [
    Credentials({
      id: "credentials",
      name: "Admin",
      credentials: {
        identifier: { label: "Username or Email", type: "text" },
        password: { label: "Password", type: "password" },
      },
      authorize: async (credentials) => {
        const identifier = credentials?.identifier as string | undefined
        const password = credentials?.password as string | undefined
        if (!identifier?.trim() || !password) return null

        // ponytail: "admin" (no @) picks the first ADMIN row; fine for one admin account, add a username column if there are several
        const user = identifier.includes("@")
          ? await prisma.user.findUnique({ where: { email: identifier.trim() } })
          : identifier.trim().toLowerCase() === "admin"
            ? await prisma.user.findFirst({ where: { role: "ADMIN" } })
            : null
        if (!user || user.role !== "ADMIN" || !user.passwordHash) return null

        const valid = await bcrypt.compare(password, user.passwordHash)
        if (!valid) return null

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        }
      },
    }),
    Credentials({
      id: "guest",
      name: "Guest",
      credentials: {
        email: { label: "Email", type: "email" },
      },
      authorize: async (credentials) => {
        const email = credentials?.email as string | undefined
        if (!email || !isAllowedGuestEmail(email)) return null

        const name = email.split("@")[0]
        const user = await prisma.user.upsert({
          where: { email },
          update: {},
          create: { email, name, role: "GUEST" },
        })
        if (user.role !== "GUEST") return null

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        }
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.role = user.role
        token.id = user.id
      }
      return token
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string
        session.user.role = token.role as "ADMIN" | "GUEST"
      }
      return session
    },
  },
})
