import nodemailer from "nodemailer";

// Lazy getter — transporter is created on first call so env vars are always loaded
const getTransporter = () =>
  nodemailer.createTransport({
    host: process.env.SMTP_HOST || "smtp.gmail.com",
    port: Number(process.env.SMTP_PORT || 465),
    secure: process.env.SMTP_SECURE === "true",   // true = SSL on port 465
    auth: process.env.SMTP_USER
      ? {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS
        }
      : undefined,
    tls: {
      rejectUnauthorized: false   // avoids cert-chain issues on some hosts
    }
  });

/** Call this at startup to verify SMTP config is working. */
export const testEmailConnection = async () => {
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.log("⚠️  Email: SMTP not configured — skipping connection test.");
    return;
  }
  try {
    await getTransporter().verify();
    console.log("✅ Email: SMTP connection verified successfully.");
  } catch (err) {
    console.error("❌ Email: SMTP connection FAILED —", err.message);
    console.error("   Check SMTP_USER / SMTP_PASS in .env (Gmail → use an App Password).");
  }
};

export const sendInterviewInvitation = async ({ to, candidateName, title, link, pin, scheduledAt }) => {
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
    return { sent: false, reason: "SMTP is not configured" };
  }

  const dateStr = new Date(scheduledAt).toLocaleString("en-IN", {
    dateStyle: "full",
    timeStyle: "short",
    timeZone: "Asia/Kolkata"
  });

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Interview Invitation</title>
</head>
<body style="margin:0;padding:0;background:#f4f7fb;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f7fb;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #dbe3ea;">
          <!-- Header -->
          <tr>
            <td style="background:#101828;padding:28px 36px;">
              <p style="margin:0 0 4px;color:#9db0c8;font-size:11px;text-transform:uppercase;letter-spacing:1px;">Interview operations</p>
              <h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:700;">HireTrack</h1>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:36px;">
              <p style="color:#607080;font-size:14px;margin:0 0 8px;">Hello ${candidateName},</p>
              <h2 style="margin:0 0 20px;color:#17202a;font-size:20px;">You have been invited for an interview</h2>
              <table cellpadding="0" cellspacing="0" style="width:100%;background:#f4f7fb;border-radius:8px;overflow:hidden;margin-bottom:24px;">
                <tr>
                  <td style="padding:16px 20px;border-bottom:1px solid #dbe3ea;">
                    <p style="margin:0;font-size:12px;color:#607080;text-transform:uppercase;letter-spacing:0.5px;">Position</p>
                    <p style="margin:4px 0 0;font-size:16px;font-weight:600;color:#17202a;">${title}</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding:16px 20px;border-bottom:1px solid #dbe3ea;">
                    <p style="margin:0;font-size:12px;color:#607080;text-transform:uppercase;letter-spacing:0.5px;">Scheduled at</p>
                    <p style="margin:4px 0 0;font-size:16px;font-weight:600;color:#17202a;">${dateStr}</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding:16px 20px;">
                    <p style="margin:0;font-size:12px;color:#607080;text-transform:uppercase;letter-spacing:0.5px;">Your PIN</p>
                    <p style="margin:4px 0 0;font-size:28px;font-weight:700;color:#2457f5;letter-spacing:6px;">${pin}</p>
                  </td>
                </tr>
              </table>
              <p style="color:#607080;font-size:14px;margin:0 0 20px;">Click the button below to join your interview room at the scheduled time. You will need to register on the platform if you haven't already, then enter your PIN.</p>
              <a href="${link}" style="display:inline-block;background:#2457f5;color:#ffffff;text-decoration:none;padding:14px 28px;border-radius:8px;font-weight:600;font-size:15px;">Join Interview Room</a>
              <p style="margin:24px 0 0;font-size:12px;color:#607080;">Or copy this link: <a href="${link}" style="color:#2457f5;">${link}</a></p>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding:20px 36px;background:#f4f7fb;border-top:1px solid #dbe3ea;">
              <p style="margin:0;font-size:12px;color:#9db0c8;">This email was sent by HireTrack. If you were not expecting this invitation, you can ignore it.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  const text = `Hello ${candidateName},\n\nYou are invited for ${title}.\nInterview time: ${dateStr}\nJoin link: ${link}\nPIN: ${pin}\n\nRegards,\nHireTrack`;

  try {
    await getTransporter().sendMail({
      from: process.env.EMAIL_FROM || "HireTrack <no-reply@hiretrack.local>",
      to,
      subject: `Interview invitation: ${title}`,
      text,
      html
    });

    return { sent: true };
  } catch (error) {
    return {
      sent: false,
      reason: error.response || error.message
    };
  }
};
