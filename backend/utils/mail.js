import nodemailer from "nodemailer"
import dotenv from "dotenv"
dotenv.config()

// Create transporter only if credentials exist; otherwise fall back gracefully
const hasMailerCreds = !!(process.env.EMAIL && process.env.PASS)
let transporter = null
if (hasMailerCreds) {
  transporter = nodemailer.createTransport({
    service: "Gmail",
    port: 465,
    secure: true, // true for 465, false for other ports
    auth: {
      user: process.env.EMAIL,
      pass: process.env.PASS,
    },
  })
} else {
  console.warn(
    "Email credentials missing. Mail sending is disabled in this environment."
  )
}

const safeSendMail = async (mailOptions) => {
  if (!transporter) {
    // In non-mail environments, do not throw; just log and resolve
    const to = Array.isArray(mailOptions.to)
      ? mailOptions.to.join(", ")
      : mailOptions.to
    console.log(
      `[DEV] Skipping email send. Intended to: ${to}. Subject: ${mailOptions.subject}`
    )
    return Promise.resolve()
  }
  try {
    return await transporter.sendMail(mailOptions)
  } catch (err) {
    // Do not propagate mail errors; log and continue to avoid 500 responses
    console.error(`[MAILER] sendMail failed: ${err?.message || err}`)
    return Promise.resolve()
  }
}

export const sendOtpMail = async (to, otp) => {
  await safeSendMail({
    from: process.env.EMAIL || "no-reply@foodway.dev",
    to,
    subject: "Reset Your Password",
    html: `<p>Your OTP for password reset is <b>${otp}</b>. It expires in 5 minutes.</p>`,
  })
}

export const sendDeliveryOtpMail = async (user, otp) => {
  await safeSendMail({
    from: process.env.EMAIL || "no-reply@foodway.dev",
    to: user.email,
    subject: "Delivery OTP",
    html: `<p>Your OTP for delivery is <b>${otp}</b>. It expires in 2 hours.</p>`,
  })
  // Also log OTP in dev for ease of testing
  if (!hasMailerCreds) {
    console.log(`[DEV] Delivery OTP for ${user.email}: ${otp}`)
  }
}
