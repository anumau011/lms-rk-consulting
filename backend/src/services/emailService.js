// EMAIL SAFE VERSION
// Gmail / Outlook Compatible
// No Flexbox
// No CSS Grid

const path = require('path');
const nodemailer = require('nodemailer');
const logger = require('../utils/logger');

const LOGO_PATH = path.join(__dirname, '../assets/logo.png');

const TAG = 'EMAIL_SERVICE';

// ─────────────────────────────────────────────────────────────
// TRANSPORTER
// ─────────────────────────────────────────────────────────────

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

const ADMIN_EMAIL =
  process.env.ADMIN_EMAIL || 'info@rkconsulting.org.in';

const BRAND_COLOR = '#4f46e5';

const BRAND_NAME = 'RK Consulting';

// ─────────────────────────────────────────────────────────────
// BASE TEMPLATE
// ─────────────────────────────────────────────────────────────

function baseTemplate(title, bodyHtml) {

  return `
<!DOCTYPE html>
<html lang="en">

<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0"/>

<title>${title}</title>
</head>

<body
  style="
    margin:0;
    padding:0;
    background:#f4f4f7;
    font-family:Arial,sans-serif;
  "
>

<table
  width="100%"
  cellpadding="0"
  cellspacing="0"
  border="0"
  bgcolor="#f4f4f7"
>

<tr>
<td align="center" style="padding:40px 12px;">

<table
  width="560"
  cellpadding="0"
  cellspacing="0"
  border="0"
  style="
    background:#ffffff;
    border-radius:12px;
    overflow:hidden;
  "
>

<!-- HEADER -->
<tr>

<td
  align="center"
  style="
    background:${BRAND_COLOR};
    padding:36px 24px;
  "
>

<img
  src="cid:logo"
  alt="${BRAND_NAME}"
  width="140"
  style="
    display:block;
    margin:0 auto 12px;
    max-width:140px;
  "
/>

<div
  style="
    color:rgba(255,255,255,0.85);
    font-size:14px;
    margin-top:10px;
  "
>
${title}
</div>

</td>

</tr>

<!-- BODY -->
<tr>

<td style="padding:40px 32px;">
${bodyHtml}
</td>

</tr>

<!-- FOOTER -->
<tr>

<td
  align="center"
  style="
    background:#f4f4f7;
    padding:24px;
    color:#999999;
    font-size:12px;
  "
>

<div>
© ${new Date().getFullYear()}
${BRAND_NAME}.
All rights reserved.
</div>

<div style="margin-top:6px;">
You received this email because you have an account with us.
</div>

</td>

</tr>

</table>

</td>
</tr>

</table>

</body>
</html>
`;
}

// ─────────────────────────────────────────────────────────────
// TIER BADGE
// ─────────────────────────────────────────────────────────────

function tierBadge(tier = '') {

  const key = tier.toLowerCase();

  const styles = {
    basic: {
      bg: '#dbeafe',
      color: '#1d4ed8',
    },

    gold: {
      bg: '#fef3c7',
      color: '#b45309',
    },

    platinum: {
      bg: '#ede9fe',
      color: '#6d28d9',
    },
  };

  const s = styles[key] || styles.basic;

  return `
<span
  style="
    display:inline-block;
    padding:6px 14px;
    border-radius:20px;
    background:${s.bg};
    color:${s.color};
    font-size:12px;
    font-weight:bold;
    text-transform:uppercase;
    letter-spacing:0.5px;
  "
>
${tier}
</span>
`;
}

// ─────────────────────────────────────────────────────────────
// INFO ROW
// ─────────────────────────────────────────────────────────────

function infoRow(label, value, border = true) {

  return `
<tr>

<td
  style="
    padding:12px 0;
    font-size:14px;
    color:#777777;
    ${border ? 'border-bottom:1px solid #ede9fe;' : ''}
  "
>
${label}
</td>

<td
  align="right"
  style="
    padding:12px 0;
    font-size:14px;
    font-weight:600;
    color:#111827;
    ${border ? 'border-bottom:1px solid #ede9fe;' : ''}
  "
>
${value}
</td>

</tr>
`;
}

// ─────────────────────────────────────────────────────────────
// INFO BOX
// ─────────────────────────────────────────────────────────────

function infoBox(rows) {

  return `
<div
  style="
    background:#f8f7ff;
    border:1px solid #e0ddff;
    border-radius:8px;
    padding:18px;
    margin:24px 0;
  "
>

<table
  width="100%"
  cellpadding="0"
  cellspacing="0"
  border="0"
>
${rows}
</table>

</div>
`;
}

// ─────────────────────────────────────────────────────────────
// BUTTON
// ─────────────────────────────────────────────────────────────

function button(text, link) {

  return `
<table
  cellpadding="0"
  cellspacing="0"
  border="0"
  style="margin-top:24px;"
>

<tr>

<td
  align="center"
  bgcolor="${BRAND_COLOR}"
  style="border-radius:8px;"
>

<a
  href="${link}"
  style="
    display:inline-block;
    padding:14px 28px;
    color:#ffffff;
    font-size:15px;
    font-weight:bold;
    text-decoration:none;
  "
>
${text}
</a>

</td>

</tr>

</table>
`;
}

// ─────────────────────────────────────────────────────────────
// SEND HELPER
// ─────────────────────────────────────────────────────────────

async function send({ to, subject, html, bcc }) {

  try {

    const info = await transporter.sendMail({
      from: FROM_ADDRESS,
      to,
      bcc,
      subject,
      html,
      attachments: [
        {
          filename: 'logo.png',
          path: LOGO_PATH,
          cid: 'logo',
          contentType: 'image/png',
        },
      ],
    });

    logger.info(
      TAG,
      `Email sent → ${to} | subject: "${subject}"`
    );

    return {
      success: true,
    };

  } catch (err) {

    logger.error(
      TAG,
      `Failed to send email → ${to} | ${err.message}`
    );

    return {
      success: false,
      error: err.message,
    };
  }
}

// ─────────────────────────────────────────────────────────────
// 1. WELCOME EMAIL
// ─────────────────────────────────────────────────────────────

async function sendWelcomeEmail({
  to,
  firstName,
}) {

  const name = firstName || 'Student';

  const html = baseTemplate(
    'Welcome to RK Consulting LMS',

    `
<h2
  style="
    font-size:28px;
    color:#111827;
    margin:0 0 14px;
  "
>
Welcome, ${name}! 👋
</h2>

<p
  style="
    font-size:16px;
    line-height:1.7;
    color:#555555;
  "
>
We're thrilled to have you join
<strong>${BRAND_NAME}</strong>.
</p>

${infoBox(

  infoRow('Email', to) +

  infoRow(
    'Account Status',
    '<span style="color:#16a34a;">✓ Active</span>',
    false
  )

)}

${button(
  'Browse Courses →',
  'https://rkconsulting.org.in/courses'
)}
`
  );

  return send({
    to,
    subject: `Welcome to ${BRAND_NAME}! 🎓`,
    html,
  });
}

// ─────────────────────────────────────────────────────────────
// 2. PURCHASE EMAIL
// ─────────────────────────────────────────────────────────────

async function sendPurchaseConfirmationEmail({

  to,
  firstName,
  courseName,
  tier,
  amountPaid,
  paymentId,
  expiresAt,

}) {

  const name = firstName || 'Student';

  const formattedAmount =
    Number(amountPaid).toLocaleString(
      'en-IN',
      {
        maximumFractionDigits: 2,
      }
    );

  const formattedExpiry = expiresAt
    ? new Date(expiresAt).toLocaleDateString(
        'en-IN',
        {
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        }
      )
    : 'Lifetime';

  const html = baseTemplate(

    'Purchase Confirmation',

    `
<h2
  style="
    font-size:28px;
    color:#111827;
    margin:0 0 14px;
  "
>
Payment Successful! 🎉
</h2>

<p
  style="
    font-size:16px;
    line-height:1.7;
    color:#555555;
  "
>
Hi <strong>${name}</strong>,
your enrollment in
<strong>${courseName}</strong>
is confirmed.
</p>

${infoBox(

  infoRow('Course', courseName) +

  infoRow('Plan', tierBadge(tier)) +

  infoRow(
    'Amount Paid',
    `₹${formattedAmount}`
  ) +

  infoRow(
    'Payment ID',
    `<span style="font-family:monospace;font-size:12px;">${paymentId}</span>`
  ) +

  infoRow(
    'Access Until',
    formattedExpiry,
    false
  )

)}

${button(
  'Start Learning →',
  'https://rkconsulting.org.in/my-courses'
)}
`
  );

  return send({
    to,
    subject: `✅ Enrollment Confirmed – ${courseName}`,
    html,
  });
}

// ─────────────────────────────────────────────────────────────
// 3. UPGRADE EMAIL
// ─────────────────────────────────────────────────────────────

async function sendUpgradeConfirmationEmail({

  to,
  firstName,
  courseName,
  fromTier,
  toTier,
  amountPaid,
  paymentId,

}) {

  const name = firstName || 'Student';

  const formattedAmount =
    Number(amountPaid).toLocaleString(
      'en-IN',
      {
        maximumFractionDigits: 2,
      }
    );

  const html = baseTemplate(

    'Tier Upgrade Confirmed',

    `
<h2
  style="
    font-size:28px;
    color:#111827;
    margin:0 0 14px;
  "
>
Upgrade Successful! 🚀
</h2>

<p
  style="
    font-size:16px;
    line-height:1.7;
    color:#555555;
  "
>
Hi <strong>${name}</strong>,
you've successfully upgraded your access for
<strong>${courseName}</strong>.
</p>

${infoBox(

  infoRow('Course', courseName) +

  infoRow(
    'Upgraded From',
    tierBadge(fromTier)
  ) +

  infoRow(
    'Upgraded To',
    tierBadge(toTier)
  ) +

  infoRow(
    'Amount Charged',
    `₹${formattedAmount}`
  ) +

  infoRow(
    'Payment ID',
    `<span style="font-family:monospace;font-size:12px;">${paymentId}</span>`,
    false
  )

)}

${button(
  'Access Your Content →',
  'https://rkconsulting.org.in/my-courses'
)}
`
  );

  return send({
    to,
    subject: `🚀 Upgrade Confirmed - ${courseName} (${toTier})`,
    html,
  });
}

// ─────────────────────────────────────────────────────────────
// 4. ADMIN REGISTRATION ALERT
// ─────────────────────────────────────────────────────────────

async function sendAdminRegistrationAlert({

  studentEmail,
  firstName,
  lastName,

}) {

  const html = baseTemplate(

    '[Admin] New Student Registration',

    `
<h2
  style="
    font-size:28px;
    color:#111827;
    margin:0 0 14px;
  "
>
New Student Registered 👤
</h2>

<p
  style="
    font-size:16px;
    line-height:1.7;
    color:#555555;
  "
>
A new student has created an account.
</p>

${infoBox(

  infoRow(
    'Name',
    [firstName, lastName]
      .filter(Boolean)
      .join(' ') || '—'
  ) +

  infoRow(
    'Email',
    studentEmail
  ) +

  infoRow(
    'Registered At',
    `${new Date().toLocaleString(
      'en-IN',
      {
        timeZone: 'Asia/Kolkata',
      }
    )} IST`,
    false
  )

)}

`
  );

  return send({
    to: ADMIN_EMAIL,
    subject: `[Admin] New Registration – ${studentEmail}`,
    html,
  });
}

// ─────────────────────────────────────────────────────────────
// 5. ADMIN PURCHASE ALERT
// ─────────────────────────────────────────────────────────────

async function sendAdminPurchaseAlert({

  studentEmail,
  firstName,
  courseName,
  tier,
  amountPaid,
  paymentId,

}) {

  const formattedAmount =
    Number(amountPaid).toLocaleString(
      'en-IN',
      {
        maximumFractionDigits: 2,
      }
    );

  const html = baseTemplate(

    '[Admin] New Course Purchase',

    `
<h2
  style="
    font-size:28px;
    color:#111827;
    margin:0 0 14px;
  "
>
New Purchase Received 💰
</h2>

<p
  style="
    font-size:16px;
    line-height:1.7;
    color:#555555;
  "
>
A student has completed a course purchase.
</p>

${infoBox(

  infoRow(
    'Student',
    `${firstName || ''} (${studentEmail})`
  ) +

  infoRow(
    'Course',
    courseName
  ) +

  infoRow(
    'Plan',
    tierBadge(tier)
  ) +

  infoRow(
    'Amount',
    `₹${formattedAmount}`
  ) +

  infoRow(
    'Payment ID',
    `<span style="font-family:monospace;font-size:12px;">${paymentId}</span>`,
    false
  )

)}

`
  );

  return send({
    to: ADMIN_EMAIL,
    subject: `[Admin] New Purchase – ₹${formattedAmount}`,
    html,
  });
}

// ─────────────────────────────────────────────────────────────
// 6. ADMIN UPGRADE ALERT
// ─────────────────────────────────────────────────────────────

async function sendAdminUpgradeAlert({

  studentEmail,
  firstName,
  courseName,
  fromTier,
  toTier,
  amountPaid,
  paymentId,

}) {

  const formattedAmount =
    Number(amountPaid).toLocaleString(
      'en-IN',
      {
        maximumFractionDigits: 2,
      }
    );

  const html = baseTemplate(

    '[Admin] Tier Upgrade',

    `
<h2
  style="
    font-size:28px;
    color:#111827;
    margin:0 0 14px;
  "
>
Tier Upgrade Completed ⬆️
</h2>

<p
  style="
    font-size:16px;
    line-height:1.7;
    color:#555555;
  "
>
A student upgraded their course tier.
</p>

${infoBox(

  infoRow(
    'Student',
    `${firstName || ''} (${studentEmail})`
  ) +

  infoRow(
    'Course',
    courseName
  ) +

  infoRow(
    'From → To',
    `${tierBadge(fromTier)} → ${tierBadge(toTier)}`
  ) +

  infoRow(
    'Amount',
    `₹${formattedAmount}`
  ) +

  infoRow(
    'Payment ID',
    `<span style="font-family:monospace;font-size:12px;">${paymentId}</span>`,
    false
  )

)}

`
  );

  return send({
    to: ADMIN_EMAIL,
    subject: `[Admin] Upgrade – ${fromTier} → ${toTier}`,
    html,
  });
}

// ─────────────────────────────────────────────────────────────
// 7. SEND CONTACT FORM EMAIL
// ─────────────────────────────────────────────────────────────

async function sendContactFormEmail({
  name,
  email,
  message
}) {
  const html = baseTemplate(
    'New Contact Form Submission',
    `
<h2
  style="
    font-size:28px;
    color:#111827;
    margin:0 0 14px;
  "
>
New Contact Message 📩
</h2>

<p
  style="
    font-size:16px;
    line-height:1.7;
    color:#555555;
  "
>
You have received a new message from the contact form.
</p>

${infoBox(

  infoRow(
    'Name',
    name || '—'
  ) +

  infoRow(
    'Email',
    email || '—'
  ) +

  infoRow(
    'Message',
    message || '—'
  )

)}

`
  );

  return send({
    to: ADMIN_EMAIL,
    subject: `[Admin] New Contact Message – ${email}`,
    html,
  });
}

// ─────────────────────────────────────────────────────────────
// 8. CONTACT FORM ACKNOWLEDGEMENT (TO USER)
// ─────────────────────────────────────────────────────────────

async function sendContactAcknowledgementEmail({
  name,
  email,
  message
}) {
  const html = baseTemplate(
    'We Received Your Message',
    `
<h2
  style="
    font-size:28px;
    color:#111827;
    margin:0 0 14px;
  "
>
Thanks for reaching out, ${name || 'there'}! 🙌
</h2>

<p
  style="
    font-size:16px;
    line-height:1.7;
    color:#555555;
  "
>
We've received your message and our team will get back to you
within 24 hours.
</p>

${infoBox(

  infoRow(
    'Your Message',
    message || '—',
    false
  )

)}

`
  );

  return send({
    to: email,
    subject: `We've received your message – ${BRAND_NAME}`,
    html,
  });
}

// ─────────────────────────────────────────────────────────────
// EXPORTS
// ─────────────────────────────────────────────────────────────

module.exports = {
  sendWelcomeEmail,
  sendPurchaseConfirmationEmail,
  sendUpgradeConfirmationEmail,
  sendAdminRegistrationAlert,
  sendAdminPurchaseAlert,
  sendAdminUpgradeAlert,
  sendContactFormEmail,
  sendContactAcknowledgementEmail
};

