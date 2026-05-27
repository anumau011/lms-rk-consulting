const nodemailer = require('nodemailer');
const logger = require('../utils/logger');

const TAG = 'EMAIL_SERVICE';

// ── Transporter ──────────────────────────────────────────────────────────────

const transporter = nodemailer.createTransport({
  host: 'smtp.hostinger.com',
  port: 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER || 'info@rkconsulting.org.in',
    pass: process.env.SMTP_PASS || '[J7Tvm!8V',
  },
});

const FROM_ADDRESS = '"RK Consulting" <info@rkconsulting.org.in>';
const ADMIN_EMAIL  = process.env.ADMIN_EMAIL || 'info@rkconsulting.org.in';
const BRAND_COLOR  = '#4f46e5'; // indigo-600
const BRAND_NAME   = 'RK Consulting LMS';
const BRAND_LOGO   = 'https://rkconsulting.org.in/logo.png'; // update if needed

// ── Base HTML layout ─────────────────────────────────────────────────────────

function baseTemplate(title, bodyHtml) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>${title}</title>
  <style>
    body { margin: 0; padding: 0; background: #f4f4f7; font-family: 'Segoe UI', Arial, sans-serif; }
    .wrapper { width: 100%; background: #f4f4f7; padding: 40px 0; }
    .card { max-width: 560px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.08); }
    .header { background: ${BRAND_COLOR}; padding: 32px 40px; text-align: center; }
    .header h1 { color: #fff; margin: 0; font-size: 22px; font-weight: 700; letter-spacing: -0.3px; }
    .header p  { color: rgba(255,255,255,0.8); margin: 6px 0 0; font-size: 13px; }
    .body { padding: 36px 40px; }
    .body h2 { font-size: 20px; font-weight: 700; color: #1a1a2e; margin: 0 0 8px; }
    .body p  { font-size: 15px; color: #555; line-height: 1.6; margin: 0 0 16px; }
    .info-box { background: #f8f7ff; border: 1px solid #e0ddff; border-radius: 8px; padding: 18px 22px; margin: 20px 0; }
    .info-row { display: flex; justify-content: space-between; align-items: center; padding: 6px 0; border-bottom: 1px solid #ede9fe; }
    .info-row:last-child { border-bottom: none; }
    .info-label { font-size: 13px; color: #777; }
    .info-value { font-size: 13px; font-weight: 600; color: #1a1a2e; }
    .badge { display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; }
    .badge-basic    { background: #dbeafe; color: #1d4ed8; }
    .badge-gold     { background: #fef3c7; color: #b45309; }
    .badge-platinum { background: #ede9fe; color: #6d28d9; }
    .btn { display: inline-block; background: ${BRAND_COLOR}; color: #fff; text-decoration: none; padding: 13px 28px; border-radius: 8px; font-size: 15px; font-weight: 600; margin-top: 8px; }
    .footer { background: #f4f4f7; text-align: center; padding: 24px 40px; }
    .footer p { font-size: 12px; color: #999; margin: 0; }
    .divider { height: 1px; background: #f0f0f0; margin: 20px 0; }
    .amount { font-size: 28px; font-weight: 800; color: ${BRAND_COLOR}; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="card">
      <div class="header">
        <h1>🎓 ${BRAND_NAME}</h1>
        <p>${title}</p>
      </div>
      <div class="body">
        ${bodyHtml}
      </div>
      <div class="footer">
        <p>© ${new Date().getFullYear()} ${BRAND_NAME}. All rights reserved.</p>
        <p style="margin-top:4px;">You received this email because you have an account with us.</p>
      </div>
    </div>
  </div>
</body>
</html>`;
}

// ── Tier badge helper ────────────────────────────────────────────────────────

function tierBadge(tier = '') {
  const key = tier.toLowerCase();
  return `<span class="badge badge-${key}">${tier.charAt(0).toUpperCase() + tier.slice(1).toLowerCase()}</span>`;
}

// ── Core send helper ─────────────────────────────────────────────────────────

async function send({ to, subject, html, bcc }) {
  try {
    const info = await transporter.sendMail({
      from: FROM_ADDRESS,
      to,
      bcc,
      subject,
      html,
    });
    logger.info(TAG, `Email sent → ${to} | subject: "${subject}" | msgId: ${info.messageId}`);
    return { success: true };
  } catch (err) {
    logger.error(TAG, `Failed to send email → ${to} | ${err.message}`);
    return { success: false, error: err.message };
  }
}

// ════════════════════════════════════════════════════════════════════════════
// 1.  WELCOME / REGISTRATION EMAIL (Student)
// ════════════════════════════════════════════════════════════════════════════

async function sendWelcomeEmail({ to, firstName }) {
  const name = firstName || 'there';
  const html = baseTemplate('Welcome to RK Consulting LMS', `
    <h2>Welcome, ${name}! 👋</h2>
    <p>We're thrilled to have you join the <strong>${BRAND_NAME}</strong> community. Your account has been created successfully and you're all set to start learning.</p>
    <div class="info-box">
      <div class="info-row">
        <span class="info-label">Email</span>
        <span class="info-value">${to}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Account Status</span>
        <span class="info-value" style="color:#16a34a;">✓ Active</span>
      </div>
    </div>
    <p>Explore our courses and start your learning journey today. If you have any questions, feel free to reply to this email.</p>
    <a href="https://rkconsulting.org.in/courses" class="btn">Browse Courses →</a>
  `);

  return send({ to, subject: `Welcome to ${BRAND_NAME}! 🎓`, html });
}

// ════════════════════════════════════════════════════════════════════════════
// 2.  PURCHASE CONFIRMATION EMAIL (Student)
// ════════════════════════════════════════════════════════════════════════════

async function sendPurchaseConfirmationEmail({ to, firstName, courseName, tier, amountPaid, paymentId, expiresAt }) {
  const name = firstName || 'Student';
  const formattedAmount = Number(amountPaid).toLocaleString('en-IN', { maximumFractionDigits: 2 });
  const formattedExpiry = expiresAt ? new Date(expiresAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }) : 'Lifetime';

  const html = baseTemplate('Purchase Confirmation', `
    <h2>Payment Successful! 🎉</h2>
    <p>Hi <strong>${name}</strong>, your enrollment in <strong>${courseName}</strong> is confirmed. Happy learning!</p>
    <div class="info-box">
      <div class="info-row">
        <span class="info-label">Course</span>
        <span class="info-value">${courseName}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Plan</span>
        <span class="info-value">${tierBadge(tier)}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Amount Paid</span>
        <span class="info-value">₹${formattedAmount}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Payment ID</span>
        <span class="info-value" style="font-family:monospace;font-size:12px;">${paymentId}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Access Until</span>
        <span class="info-value">${formattedExpiry}</span>
      </div>
    </div>
    <a href="https://rkconsulting.org.in/my-courses" class="btn">Start Learning →</a>
    <div class="divider"></div>
    <p style="font-size:13px;color:#888;">Keep this email as your payment receipt. For any billing questions, please contact us.</p>
  `);

  return send({ to, subject: `✅ Enrollment Confirmed – ${courseName}`, html });
}

// ════════════════════════════════════════════════════════════════════════════
// 3.  TIER UPGRADE CONFIRMATION EMAIL (Student)
// ════════════════════════════════════════════════════════════════════════════

async function sendUpgradeConfirmationEmail({ to, firstName, courseName, fromTier, toTier, amountPaid, paymentId }) {
  const name = firstName || 'Student';
  const formattedAmount = Number(amountPaid).toLocaleString('en-IN', { maximumFractionDigits: 2 });

  const html = baseTemplate('Tier Upgrade Confirmed', `
    <h2>Upgrade Successful! 🚀</h2>
    <p>Hi <strong>${name}</strong>, you've successfully upgraded your access for <strong>${courseName}</strong>.</p>
    <div class="info-box">
      <div class="info-row">
        <span class="info-label">Course</span>
        <span class="info-value">${courseName}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Upgraded From</span>
        <span class="info-value">${tierBadge(fromTier)}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Upgraded To</span>
        <span class="info-value">${tierBadge(toTier)}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Amount Charged</span>
        <span class="info-value">₹${formattedAmount}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Payment ID</span>
        <span class="info-value" style="font-family:monospace;font-size:12px;">${paymentId}</span>
      </div>
    </div>
    <a href="https://rkconsulting.org.in/my-courses" class="btn">Access Your Content →</a>
  `);

  return send({ to, subject: `🚀 Upgrade Confirmed – ${courseName} (${toTier})`, html });
}

// ════════════════════════════════════════════════════════════════════════════
// 4.  ADMIN NOTIFICATION – New Registration
// ════════════════════════════════════════════════════════════════════════════

async function sendAdminRegistrationAlert({ studentEmail, firstName, lastName }) {
  const html = baseTemplate('[Admin] New Student Registration', `
    <h2>New Student Registered 👤</h2>
    <p>A new user has just created an account on the platform.</p>
    <div class="info-box">
      <div class="info-row">
        <span class="info-label">Name</span>
        <span class="info-value">${[firstName, lastName].filter(Boolean).join(' ') || '—'}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Email</span>
        <span class="info-value">${studentEmail}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Registered At</span>
        <span class="info-value">${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} IST</span>
      </div>
    </div>
  `);

  return send({ to: ADMIN_EMAIL, subject: `[Admin] New Registration – ${studentEmail}`, html });
}

// ════════════════════════════════════════════════════════════════════════════
// 5.  ADMIN NOTIFICATION – New Purchase
// ════════════════════════════════════════════════════════════════════════════

async function sendAdminPurchaseAlert({ studentEmail, firstName, courseName, tier, amountPaid, paymentId }) {
  const formattedAmount = Number(amountPaid).toLocaleString('en-IN', { maximumFractionDigits: 2 });

  const html = baseTemplate('[Admin] New Course Purchase', `
    <h2>New Purchase Received 💰</h2>
    <p>A student has just completed a course purchase.</p>
    <div class="info-box">
      <div class="info-row">
        <span class="info-label">Student</span>
        <span class="info-value">${firstName || ''} (${studentEmail})</span>
      </div>
      <div class="info-row">
        <span class="info-label">Course</span>
        <span class="info-value">${courseName}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Plan</span>
        <span class="info-value">${tierBadge(tier)}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Amount</span>
        <span class="info-value" style="color:#16a34a;font-weight:700;">₹${formattedAmount}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Payment ID</span>
        <span class="info-value" style="font-family:monospace;font-size:12px;">${paymentId}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Date & Time</span>
        <span class="info-value">${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} IST</span>
      </div>
    </div>
  `);

  return send({ to: ADMIN_EMAIL, subject: `[Admin] New Purchase – ₹${formattedAmount} – ${studentEmail}`, html });
}

// ════════════════════════════════════════════════════════════════════════════
// 6.  ADMIN NOTIFICATION – Tier Upgrade
// ════════════════════════════════════════════════════════════════════════════

async function sendAdminUpgradeAlert({ studentEmail, firstName, courseName, fromTier, toTier, amountPaid, paymentId }) {
  const formattedAmount = Number(amountPaid).toLocaleString('en-IN', { maximumFractionDigits: 2 });

  const html = baseTemplate('[Admin] Tier Upgrade', `
    <h2>Tier Upgrade Completed ⬆️</h2>
    <p>A student has upgraded their course tier.</p>
    <div class="info-box">
      <div class="info-row">
        <span class="info-label">Student</span>
        <span class="info-value">${firstName || ''} (${studentEmail})</span>
      </div>
      <div class="info-row">
        <span class="info-label">Course</span>
        <span class="info-value">${courseName}</span>
      </div>
      <div class="info-row">
        <span class="info-label">From → To</span>
        <span class="info-value">${tierBadge(fromTier)} → ${tierBadge(toTier)}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Amount</span>
        <span class="info-value" style="color:#16a34a;font-weight:700;">₹${formattedAmount}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Payment ID</span>
        <span class="info-value" style="font-family:monospace;font-size:12px;">${paymentId}</span>
      </div>
    </div>
  `);

  return send({ to: ADMIN_EMAIL, subject: `[Admin] Upgrade – ${fromTier}→${toTier} – ${studentEmail}`, html });
}

module.exports = {
  sendWelcomeEmail,
  sendPurchaseConfirmationEmail,
  sendUpgradeConfirmationEmail,
  sendAdminRegistrationAlert,
  sendAdminPurchaseAlert,
  sendAdminUpgradeAlert,
};
