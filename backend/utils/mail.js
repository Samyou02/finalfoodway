import nodemailer from "nodemailer"
import dotenv from "dotenv"
dotenv.config()

// Mailer initialization state
const hasMailerCreds = !!(process.env.EMAIL && process.env.PASS)
let transporter = null
let mailerInitialized = false
let mailerDisabledWarned = false

// Attempt to create a Gmail transporter when creds exist
if (hasMailerCreds) {
  transporter = nodemailer.createTransport({
    service: "Gmail",
    port: 465,
    secure: true,
    auth: {
      user: process.env.EMAIL,
      pass: process.env.PASS,
    },
  })
}

const getTransporter = async () => {
  // Verify existing transporter once to avoid repeated login attempts
  if (transporter && !mailerInitialized) {
    try {
      await transporter.verify()
      mailerInitialized = true
    } catch (err) {
      console.warn(
        `[MAILER] Transport verify failed: ${err?.message || err}. Disabling mail send.`
      )
      transporter = null
    }
  }

  // Dev/test fallback using Ethereal if explicitly requested
  if (!transporter && process.env.USE_TEST_MAIL === "1") {
    try {
      const testAccount = await nodemailer.createTestAccount()
      transporter = nodemailer.createTransport({
        host: "smtp.ethereal.email",
        port: 587,
        secure: false,
        auth: {
          user: testAccount.user,
          pass: testAccount.pass,
        },
      })
      mailerInitialized = true
      console.log("[DEV] Using Ethereal test SMTP for emails.")
    } catch (e) {
      console.warn(
        `[MAILER] Failed to create Ethereal test account: ${e?.message || e}`
      )
    }
  }

  if (!transporter && !mailerDisabledWarned) {
    mailerDisabledWarned = true
    console.warn(
      "Email sending disabled. Provide valid EMAIL/PASS or set USE_TEST_MAIL=1 in .env for dev."
    )
  }

  return transporter
}

const safeSendMail = async (mailOptions) => {
  const activeTransporter = await getTransporter()
  if (!activeTransporter) {
    const to = Array.isArray(mailOptions.to)
      ? mailOptions.to.join(", ")
      : mailOptions.to
    console.log(
      `[DEV] Skipping email send. Intended to: ${to}. Subject: ${mailOptions.subject}`
    )
    return Promise.resolve()
  }
  try {
    const info = await activeTransporter.sendMail(mailOptions)
    const previewUrl = nodemailer.getTestMessageUrl(info)
    if (previewUrl) {
      console.log(`[DEV] Email preview: ${previewUrl}`)
    }
    return info
  } catch (err) {
    // Do not propagate mail errors; log once and continue to avoid noisy logs/500s
    console.warn(`[MAILER] sendMail failed: ${err?.message || err}`)
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
  // Also log OTP in dev for ease of testing when real mail is disabled
  if (!hasMailerCreds && process.env.USE_TEST_MAIL !== "1") {
    console.log(`[DEV] Delivery OTP for ${user.email}: ${otp}`)
  }
}
