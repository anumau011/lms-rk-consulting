const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  host: "smtp.hostinger.com",
  port: 587,
  secure: false,
  auth: {
    user: "info@rkconsulting.org.in",
    pass: "[J7Tvm!8V",
  },
});

async function sendWelcomeMail(email) {
  await transporter.sendMail({
    from: '"RK Consulting" <info@rkconsulting.org.in>',
    to: email,
    subject: "Welcome",
    html: "<h1>Welcome User</h1>",
  });
}

sendWelcomeMail("anumau011@gmail.com", (err, info) => {
  if (err) {
    console.error("Error sending email:", err);
  } else {
    console.log("Email sent:", info.response);
  }
});
