# SEAL — System for E-document Allocation and Logging

SEAL is G7 Aerospace's internal reference number registry. It issues sequential, category-coded document references (e.g. `G7/ST-LT/009/26`), auto-detects and stamps the reference number and registration date directly onto uploaded PDFs, tracks each document's status end-to-end, and lets staff search, sort, and share sealed documents securely.

## Features

- **Reference number allocation** — sequential, category-coded numbers generated per category+year, collision-safe under concurrent requests.
- **Auto-stamp** — scans page 1 of an uploaded PDF for "Our ref.:" and "Date:" labels and stamps the reference number and formatted registration date (`d MMM yyyy`) into place, independently of each other.
- **Manual stamp positioning** — a drag-and-position picker for when auto-detection misses a label, or for re-stamping.
- **Status tracking** — Registered → Stamped → Sent, with admin-only inline editing of the reference number (rejecting duplicates).
- **Sharing** — email the stamped PDF to the PIC, share a public download link, or hand off via WhatsApp.
- **Search, sort, and role-based access** — searchable/sortable reference list; guests only see their own references, admins see and manage all of them.

## Tech stack

- [Next.js](https://nextjs.org) (App Router, Turbopack) + [React](https://react.dev) + [TypeScript](https://www.typescriptlang.org)
- [Prisma ORM](https://www.prisma.io) over MySQL/MariaDB
- [NextAuth.js](https://authjs.dev) (credentials + guest email-domain login)
- [Tailwind CSS](https://tailwindcss.com) + [shadcn/ui](https://ui.shadcn.com)
- [pdf-lib](https://pdf-lib.js.org) / [pdfjs-dist](https://mozilla.github.io/pdf.js/) for PDF stamping and text scanning
- [nodemailer](https://nodemailer.com) for email delivery
- FTP-backed file storage (uploaded/stamped PDFs live on the hosting server, not the app server's local disk — required for serverless deployment on Vercel)

## Getting started

Install dependencies and run the dev server:

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Environment variables

Copy `.env` and fill in:

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | MySQL/MariaDB connection string |
| `NEXTAUTH_SECRET` | NextAuth session secret |
| `NEXTAUTH_URL` | Public URL of the deployment (optional — NextAuth v5 can auto-detect it) |
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / `SMTP_PASS` / `SMTP_FROM` | Outbound email for sharing/notifications |
| `GUEST_EMAIL_DOMAINS` | Comma-separated email domains allowed to self-register as Guest |
| `SEED_ADMIN_NAME` / `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` | Used once by `prisma/seed.ts` to create the initial admin account |
| `FTP_HOST` / `FTP_USER` / `FTP_PASSWORD` / `FTP_BASE_DIR` | FTP credentials for stored document files |

### Database

```bash
npx prisma migrate deploy   # apply migrations
npx prisma db seed          # create initial category + admin user
```

## Deployment

Deployed on [Vercel](https://vercel.com), with the database and file storage (via FTP) hosted separately on cPanel. Because Vercel's serverless functions have an ephemeral filesystem, uploaded/stamped PDFs are never written to local disk — they're read and written directly over FTP through `src/lib/storage.ts`.

Set the environment variables above in the Vercel project's settings before deploying.
