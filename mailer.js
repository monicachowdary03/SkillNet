const nodemailer = require('nodemailer');

async function sendOtpEmail(toEmail, otp, username) {
  // Build transporter based on env config
  const transporter = nodemailer.createTransport({
    host:   process.env.MAIL_HOST || 'smtp.gmail.com',
    port:   parseInt(process.env.MAIL_PORT || '587'),
    secure: process.env.MAIL_SECURE === 'true',
    auth: {
      user: process.env.MAIL_USER,
      pass: process.env.MAIL_PASS
    }
  });

  await transporter.sendMail({
    from: `"SkillNet" <${process.env.MAIL_USER}>`,
    to:   toEmail,
    subject: 'Your SkillNet Login OTP',
    html: `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; background: #f4f6fb; margin: 0; padding: 0; }
    .wrap { max-width: 480px; margin: 40px auto; background: #fff; border-radius: 12px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.08); overflow: hidden; }
    .head { background: linear-gradient(135deg,#6366f1,#4f46e5); padding: 32px 40px; text-align: center; }
    .head h1 { color:#fff; margin:0; font-size:22px; }
    .head p  { color:rgba(255,255,255,.8); margin:6px 0 0; font-size:13px; }
    .body { padding: 36px 40px; }
    .otp-box { background:#f0f0ff; border:2px dashed #6366f1; border-radius:10px;
               text-align:center; padding:24px 16px; margin:24px 0; }
    .otp { font-size:42px; font-weight:700; letter-spacing:12px; color:#4f46e5; font-family:monospace; }
    .note { color:#6b7280; font-size:13px; margin-top:8px; }
    .foot { background:#f9fafb; padding:18px 40px; text-align:center;
            color:#9ca3af; font-size:12px; border-top:1px solid #e5e7eb; }
  </style>
</head>
<body>
  <div class="wrap">
    <div class="head"><h1>🧩 SkillNet</h1><p>Academic Q&amp;A Platform</p></div>
    <div class="body">
      <p>Hi <strong>${username}</strong>,</p>
      <p>Use the OTP below to complete your login:</p>
      <div class="otp-box">
        <div class="otp">${otp}</div>
        <div class="note">⏱ Valid for <strong>10 minutes</strong></div>
      </div>
      <p style="color:#374151;font-size:14px;">If you didn't try to log in, ignore this email — your account is safe.</p>
    </div>
    <div class="foot">&copy; ${new Date().getFullYear()} SkillNet &bull; Do not reply</div>
  </div>
</body>
</html>`
  });
}

module.exports = { sendOtpEmail };
