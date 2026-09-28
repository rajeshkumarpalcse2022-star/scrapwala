import nodemailer from "nodemailer"

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
})

interface SendOtpEmailParams {
  to: string
  otp: string
  purpose: "signup" | "collector_first_login"
}

export async function sendOtpEmail({ to, otp, purpose }: SendOtpEmailParams): Promise<boolean> {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    if (process.env.NODE_ENV === "development" && process.env.AUTH_OTP_DEV_MODE === "true") {
      return true
    }
    return false
  }

  const isSignup = purpose === "signup"
  const subject = isSignup
    ? "ScrapWala - Verify Your Email"
    : "ScrapWala - Verify Your Identity"

  const introText = isSignup
    ? "Please use the OTP below to verify your email and complete your ScrapWala signup."
    : "Please use the OTP below to verify your identity for first-time login."

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin:0;padding:0;background-color:#f4f4f4;font-family:Arial,sans-serif;">
      <div style="max-width:600px;margin:0 auto;background-color:#ffffff;padding:40px 30px;border-radius:8px;margin-top:20px;margin-bottom:20px;">
        <div style="text-align:center;margin-bottom:30px;">
          <h1 style="color:#16a34a;margin:0;font-size:28px;">♻️ ScrapWala</h1>
        </div>
        <h2 style="color:#1f2937;font-size:22px;text-align:center;margin-bottom:10px;">
          ${isSignup ? "Email Verification" : "Identity Verification"}
        </h2>
        <p style="color:#6b7280;font-size:15px;text-align:center;margin-bottom:30px;">
          ${introText}
        </p>
        <div style="text-align:center;margin-bottom:30px;">
          <div style="display:inline-block;background-color:#f0fdf4;border:2px solid #16a34a;border-radius:12px;padding:16px 40px;">
            <span style="font-size:32px;font-weight:bold;color:#16a34a;letter-spacing:8px;">${otp}</span>
          </div>
        </div>
        <p style="color:#9ca3af;font-size:13px;text-align:center;margin-bottom:5px;">
          This OTP is valid for <strong>40 seconds</strong>.
        </p>
        <p style="color:#9ca3af;font-size:13px;text-align:center;">
          If you did not request this verification, you can ignore this email.
        </p>
        <hr style="border:none;border-top:1px solid #e5e7eb;margin:30px 0;">
        <p style="color:#9ca3af;font-size:12px;text-align:center;margin:0;">
          &copy; ${new Date().getFullYear()} ScrapWala. All rights reserved.
        </p>
      </div>
    </body>
    </html>
  `

  try {
    await transporter.sendMail({
      from: `"ScrapWala" <${process.env.SMTP_USER}>`,
      to,
      subject,
      html,
    })
    return true
  } catch {
    return false
  }
}
