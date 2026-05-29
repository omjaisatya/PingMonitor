import { Resend } from "resend";
import { SENDER_EMAIL, RESEND_API_KEY } from "../config/env.config.js";

const resend = new Resend(RESEND_API_KEY);

//  EMAIL SENDERS

export const sendPasswordResetEmail = async ({ email, name, resetUrl }) => {
  return resend.emails.send({
    from: `Ping Monitor <${SENDER_EMAIL}>`,
    to: email,
    subject: "Reset your password",
    html: getActionTemplate({
      type: "warning",
      title: "Reset your password",
      message: `Hi ${
        name || "there"
      }, we received a request to reset your password. This link expires in 15 minutes.`,
      actionLabel: "Reset Password",
      actionUrl: resetUrl,
    }),
  });
};

export const sendVerificationEmail = async ({
  email,
  name,
  verificationUrl,
}) => {
  return resend.emails.send({
    from: `Ping Monitor <${SENDER_EMAIL}>`,
    to: email,
    subject: "Verify your account",
    html: getActionTemplate({
      type: "success",
      title: "Verify your email",
      message: `Hi ${
        name || "there"
      }, confirm your email address to activate monitoring and alerts.`,
      actionLabel: "Verify Email",
      actionUrl: verificationUrl,
    }),
  });
};

const sendAlert = async ({
  monitorName,
  url,
  statusCode,
  responseTime,
  email,
  formateDate,
}) => {
  try {
    const data = await resend.emails.send({
      from: `Ping Monitor <${SENDER_EMAIL}>`,
      to: email,
      subject: `🚨 ${monitorName} is Down`,
      html: getAlertTemplate({
        monitorName,
        url,
        statusCode,
        responseTime,
        formateDate,
      }),
    });

    console.log("Email sent:", data.id);

    return data;
  } catch (error) {
    console.error("Failed to send email:", error);
    throw error;
  }
};

//  BASE LAYOUT

const getBaseLayout = ({ content }) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
</head>

<body style="
  margin:0;
  padding:0;
  background:#0b1020;
  font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;
  color:#e5e7eb;
">

  <div style="
    width:100%;
    padding:40px 16px;
    box-sizing:border-box;
  ">

    <div style="
      max-width:600px;
      margin:0 auto;
      background:#111827;
      border:1px solid #1f2937;
      border-radius:20px;
      overflow:hidden;
      box-shadow:0 10px 40px rgba(0,0,0,0.4);
    ">

      ${content}

      <div style="
        padding:24px 32px;
        border-top:1px solid #1f2937;
        color:#94a3b8;
        font-size:12px;
        line-height:1.7;
      ">
        <div style="margin-bottom:8px;">
          © 2026 Ping Monitor
        </div>

        <div>
          You're receiving this email because you have an active Ping Monitor account.
        </div>
      </div>

    </div>

  </div>
</body>
</html>
`;

//  ALERT TEMPLATE

const getAlertTemplate = ({
  monitorName,
  url,
  statusCode,
  responseTime,
  formateDate,
}) => {
  return getBaseLayout({
    content: `
      <div style="
        padding:40px 32px;
        background:linear-gradient(135deg,#dc2626,#991b1b);
      ">
        <div style="
          font-size:14px;
          font-weight:700;
          letter-spacing:1px;
          text-transform:uppercase;
          color:#fecaca;
          margin-bottom:12px;
        ">
          Incident Detected
        </div>

        <h1 style="
          margin:0;
          font-size:32px;
          line-height:1.2;
          color:white;
        ">
          ${monitorName} is down
        </h1>
      </div>

      <div style="padding:32px;">

        <p style="
          margin:0 0 28px;
          color:#cbd5e1;
          font-size:16px;
          line-height:1.7;
        ">
          Your monitored endpoint is currently unreachable or returning an unhealthy response.
        </p>

        <div style="
          background:#0f172a;
          border:1px solid #1e293b;
          border-radius:14px;
          overflow:hidden;
        ">

          ${detailRow("Monitor", monitorName)}
          ${detailRow(
            "URL",
            `<a href="${url}" style="color:#60a5fa;text-decoration:none;">${url}</a>`,
          )}
          ${detailRow(
            "Status",
            `
              <span style="
                display:inline-block;
                background:#7f1d1d;
                color:#fecaca;
                padding:6px 10px;
                border-radius:999px;
                font-size:13px;
                font-weight:700;
              ">
                ${statusCode || "No Response"}
              </span>
            `,
          )}
          ${detailRow(
            "Response Time",
            responseTime ? `${responseTime}ms` : "N/A",
          )}
          ${detailRow("Detected At", formateDate, true)}

        </div>

        <div style="
          margin-top:32px;
          padding:20px;
          background:#111827;
          border:1px solid #1f2937;
          border-radius:12px;
          color:#94a3b8;
          font-size:14px;
          line-height:1.7;
        ">
          We’ll continue monitoring this service.
        </div>

      </div>
    `,
  });
};

//  ACTION TEMPLATE

const getActionTemplate = ({
  title,
  message,
  actionLabel,
  actionUrl,
  type = "success",
}) => {
  const buttonColor = type === "warning" ? "#f59e0b" : "#22c55e";

  return getBaseLayout({
    content: `
      <div style="
        padding:48px 32px 24px;
        text-align:center;
      ">

        <div style="
          width:64px;
          height:64px;
          margin:0 auto 24px;
          border-radius:16px;
          background:${buttonColor}20;
          display:flex;
          align-items:center;
          justify-content:center;
          font-size:30px;
        ">
          ${type === "warning" ? "🔐" : "✉️"}
        </div>

        <h1 style="
          margin:0 0 18px;
          font-size:30px;
          color:white;
        ">
          ${title}
        </h1>

        <p style="
          margin:0 auto;
          max-width:460px;
          color:#cbd5e1;
          font-size:16px;
          line-height:1.8;
        ">
          ${message}
        </p>

        <div style="margin:36px 0;">
          <a
            href="${actionUrl}"
            style="
              display:inline-block;
              padding:14px 28px;
              background:${buttonColor};
              color:#0f172a;
              text-decoration:none;
              font-weight:700;
              border-radius:12px;
              font-size:15px;
            "
          >
            ${actionLabel}
          </a>
        </div>

        <div style="
          margin-top:28px;
          padding:18px;
          background:#0f172a;
          border:1px solid #1e293b;
          border-radius:12px;
          text-align:left;
          color:#94a3b8;
          font-size:13px;
          line-height:1.7;
          word-break:break-word;
        ">
          If the button doesn't work, copy and paste this link into your browser:
          <br /><br />
          <span style="color:#60a5fa;">
            ${actionUrl}
          </span>
        </div>

      </div>
    `,
  });
};

//  HELPER

const detailRow = (label, value, isLast = false) => `
  <div style="
    display:flex;
    justify-content:space-between;
    gap:20px;
    padding:18px 20px;
    border-bottom:${isLast ? "none" : "1px solid #1e293b"};
  ">
    <div style="
      color:#94a3b8;
      font-size:14px;
      min-width:120px;
    ">
      ${label}
    </div>

    <div style="
      color:#f8fafc;
      font-size:14px;
      text-align:right;
      word-break:break-word;
      flex:1;
    ">
      ${value}
    </div>
  </div>
`;

export default sendAlert;
