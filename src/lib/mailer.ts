import nodemailer from "nodemailer"

export const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT ?? 465),
  secure: Number(process.env.SMTP_PORT ?? 465) === 465,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
})

export async function sendReferenceEmail(input: {
  to: string
  refNumber: string
  title: string
  picName: string
  registerDate: Date
  attachment?: { filename: string; path: string }
}) {
  const html = `
    <p>Dear ${input.picName},</p>
    <p>A document reference number has been registered for you:</p>
    <p style="font-size:16px"><strong>${input.refNumber}</strong></p>
    <table cellpadding="4">
      <tr><td>Title</td><td>${input.title}</td></tr>
      <tr><td>Registered on</td><td>${input.registerDate.toDateString()}</td></tr>
    </table>
    <p>G7 Aerospace Sdn Bhd</p>
  `

  await transporter.sendMail({
    from: process.env.SMTP_FROM,
    to: input.to,
    subject: `Document Reference: ${input.refNumber}`,
    html,
    attachments: input.attachment ? [input.attachment] : undefined,
  })
}
