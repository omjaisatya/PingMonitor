import { Resend } from "resend";
import {
  SENDER_EMAIL,
  RESEND_API_KEY,
  IS_DEMO_MODE,
} from "../config/env.config.js";
import EmailLog from "../models/EmailLog.js";
import User from "../models/User.js";
import { emitIncidentEvent } from "./realtimeService.js";

const resend = new Resend(RESEND_API_KEY);

const _originalSend = resend.emails.send.bind(resend.emails);
resend.emails.send = async (payload) => {
  const isDemoUser =
    payload.to === "demo@example.com" ||
    (Array.isArray(payload.to) && payload.to.includes("demo@example.com"));
  if (IS_DEMO_MODE || isDemoUser) {
    console.log(
      `[Demo Mode] Bypassed email sending to: ${payload.to} - Subject: ${payload.subject}`,
    );
    return { id: `mock_email_${Date.now()}` };
  }
  return _originalSend(payload);
};

const logEmailAttempt = async ({
  email,
  subject,
  status,
  errorReason,
  monitorId,
}) => {
  try {
    const recipients = Array.isArray(email) ? email : [email];
    for (const recipient of recipients) {
      const user = await User.findOne({ email: recipient });
      if (user) {
        const newLog = await EmailLog.create({
          userId: user._id,
          monitorId: monitorId || null,
          email: recipient,
          subject,
          status,
          errorReason: errorReason || null,
          retryStatus: status === "failed" ? "pending" : "none",
        });

        try {
          emitIncidentEvent(user._id, "email:logged", {
            _id: newLog._id,
            userId: user._id.toString(),
            monitorId: monitorId ? monitorId.toString() : null,
            email: recipient,
            subject,
            status,
            errorReason: errorReason || null,
            retryStatus: status === "failed" ? "pending" : "none",
            timestamp: new Date(),
          });
        } catch (err) {
          console.error("Failed to emit WebSocket email:logged event:", err);
        }
      }
    }
  } catch (err) {
    console.error("Error logging email attempt:", err);
  }
  return null;
};

export const sendPasswordResetEmail = async ({ email, name, resetUrl }) => {
  const subject = "Reset your password";
  try {
    const data = await resend.emails.send({
      from: `Ping Monitor <${SENDER_EMAIL}>`,
      to: email,
      subject,
      html: getActionTemplate({
        type: "warning",
        title: "Reset your password",
        message: `Hi ${
          name || "there"
        }, we received a request to reset your password. This security link expires cleanly in 15 minutes.`,
        actionLabel: "Reset Password",
        actionUrl: resetUrl,
      }),
    });
    await logEmailAttempt({ email, subject, status: "sent" });
    return data;
  } catch (error) {
    await logEmailAttempt({
      email,
      subject,
      status: "failed",
      errorReason: error.message,
    });
    throw error;
  }
};

export const sendVerificationEmail = async ({
  email,
  name,
  verificationUrl,
}) => {
  const subject = "Verify your account";
  try {
    const data = await resend.emails.send({
      from: `Ping Monitor <${SENDER_EMAIL}>`,
      to: email,
      subject,
      html: getActionTemplate({
        type: "success",
        title: "Verify your email",
        message: `Hi ${
          name || "there"
        }, please confirm your email address to activate your status engines, monitoring workflows, and automated alerts.`,
        actionLabel: "Verify Email Address",
        actionUrl: verificationUrl,
      }),
    });
    await logEmailAttempt({ email, subject, status: "sent" });
    return data;
  } catch (error) {
    await logEmailAttempt({
      email,
      subject,
      status: "failed",
      errorReason: error.message,
    });
    throw error;
  }
};

const sendAlert = async ({
  monitorName,
  url,
  statusCode,
  responseTime,
  email,
  formateDate,
  monitorId,
  alertType = "down",
  latencyThreshold = 2000,
}) => {
  let subject = `${monitorName} is Down`;
  let htmlTemplate = "";

  if (alertType === "recovered") {
    subject = `${monitorName} is Back UP`;
    htmlTemplate = getRecoveryTemplate({
      monitorName,
      url,
      statusCode,
      responseTime,
      formateDate,
    });
  } else if (alertType === "slow") {
    subject = `${monitorName} is Slow (${responseTime}ms)`;
    htmlTemplate = getSlowTemplate({
      monitorName,
      url,
      statusCode,
      responseTime,
      latencyThreshold,
      formateDate,
    });
  } else {
    htmlTemplate = getAlertTemplate({
      monitorName,
      url,
      statusCode,
      responseTime,
      formateDate,
    });
  }

  try {
    const data = await resend.emails.send({
      from: `Ping Monitor <${SENDER_EMAIL}>`,
      to: email,
      subject,
      html: htmlTemplate,
    });

    console.log("Email sent:", data.id);
    await logEmailAttempt({ email, subject, status: "sent", monitorId });
    return data;
  } catch (error) {
    console.error("Failed to send email:", error);
    await logEmailAttempt({
      email,
      subject,
      status: "failed",
      errorReason: error.message,
      monitorId,
    });
    throw error;
  }
};

export const sendIncidentUpdateEmail = async ({
  incident,
  recipients,
  subjectPrefix = "Incident Update",
}) => {
  const to = Array.isArray(recipients) ? recipients : [recipients];
  const subject = `${subjectPrefix}: ${incident.title}`;

  try {
    const data = await resend.emails.send({
      from: `Ping Monitor <${SENDER_EMAIL}>`,
      to,
      subject,
      html: getIncidentTemplate({ incident }),
    });

    await logEmailAttempt({
      email: to,
      subject,
      status: "sent",
      monitorId: incident.affectedServices?.[0]?.monitorId,
    });
    return data;
  } catch (error) {
    await logEmailAttempt({
      email: to,
      subject,
      status: "failed",
      errorReason: error.message,
      monitorId: incident.affectedServices?.[0]?.monitorId,
    });
    throw error;
  }
};

const getBaseLayout = ({ content }) => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="color-scheme" content="dark" />
  <title>Ping Monitor Update</title>
</head>
<body style="margin:0; padding:0; background-color:#0a0a0f; font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color:#e8e8f0; -webkit-font-smoothing:antialiased; min-height:100vh;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#0a0a0f; width:100%;">
    <tr>
      <td align="center" style="padding:40px 16px;">
        <table role="presentation" width="100%" max-width="600" cellspacing="0" cellpadding="0" border="0" style="max-width:600px; width:100%; background-color:#13131c; border:1px solid #1e1e2e; border-radius:12px; overflow:hidden; box-shadow:0 12px 32px rgba(0,0,0,0.5);">
          <tr>
            <td style="padding:0;">
              ${content}
            </td>
          </tr>
          <tr>
            <td style="padding:24px 32px; border-top:1px solid #1e1e2e; background-color:#111118;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td style="font-size:12px; line-height:1.6; color:#8888aa; text-align:center;">
                    <p style="margin:0 0 6px 0; font-weight:700; color:#e8e8f0; letter-spacing:0.02em;">PING MONITOR SERVICES</p>
                    <p style="margin:0 0 12px 0;">Automated Live Availability & Performance Tracker Engine</p>
                    <p style="margin:0; font-size:11px; color:#55556a;">You are receiving this system notification because it is tied directly to your production alerts profile configuration.</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;

const escapeHtml = (value = "") =>
  String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const getIncidentTemplate = ({ incident }) => {
  const services = (incident.affectedServices || [])
    .map(
      (service) =>
        `<li style="margin-bottom:6px; font-family:monospace; color:#e8e8f0;">${escapeHtml(service.name)}</li>`,
    )
    .join("");

  const timeline = (incident.timeline || [])
    .slice(-4)
    .map(
      (item) =>
        `<li style="margin-bottom:8px; line-height:1.5;"><strong style="color:#ffcc00; text-transform:uppercase; font-size:11px; letter-spacing:0.02em;">${escapeHtml(item.type.replace(/_/g, " "))}</strong>:<br/><span style="color:#cbd5e1; font-size:13.5px;">${escapeHtml(item.message)}</span></li>`,
    )
    .join("");

  return getBaseLayout({
    content: `
      <div style="padding:32px; border-bottom:4px solid #6655ff; background-color:#111118;">
        <div style="font-size:11px; font-weight:700; letter-spacing:0.08em; text-transform:uppercase; color:#8888aa; margin-bottom:8px;">
          SEVERITY: ${escapeHtml(incident.severity)} &middot; STATE: ${escapeHtml(incident.state)}
        </div>
        <h1 style="margin:0; font-size:24px; font-weight:800; color:#e8e8f0; letter-spacing:-0.01em;">
          ${escapeHtml(incident.title)}
        </h1>
      </div>
      <div style="padding:32px;">
        <p style="margin:0 0 24px 0; color:#e8e8f0; font-size:15px; line-height:1.6;">
          ${escapeHtml(incident.summary || "An incident update status has been logged to your account dashboard.")}
        </p>
        <h2 style="font-size:13px; font-weight:700; text-transform:uppercase; letter-spacing:0.05em; color:#8888aa; margin:0 0 12px 0;">Affected Components</h2>
        <ul style="margin:0 0 28px 0; padding-left:20px; color:#8888aa;">${services || "<li>No active tracking lines affected</li>"}</ul>
        <h2 style="font-size:13px; font-weight:700; text-transform:uppercase; letter-spacing:0.05em; color:#8888aa; margin:0 0 12px 0;">Incident Chronology</h2>
        <ul style="margin:0; padding-left:20px; color:#8888aa; list-style-type:square;">${timeline}</ul>
      </div>
    `,
  });
};

export const getAlertTemplate = ({
  monitorName,
  url,
  statusCode,
  responseTime,
  formateDate,
}) => {
  return getBaseLayout({
    content: `
      <div style="padding:32px; border-bottom:4px solid #ff4466; background-color:#111118;">
        <div style="font-size:11px; font-weight:700; letter-spacing:0.08em; text-transform:uppercase; color:#ff4466; margin-bottom:6px;">
          CRITICAL ERROR REPORT
        </div>
        <h1 style="margin:0; font-size:26px; font-weight:800; color:#e8e8f0; letter-spacing:-0.02em;">
          ${monitorName} is offline
        </h1>
      </div>

      <div style="padding:32px;">
        <p style="margin:0 0 24px 0; color:#8888aa; font-size:14.5px; line-height:1.6;">
          Our monitoring node failed to receive a healthy transaction response from your running endpoint configuration.
        </p>

        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#0e0e16; border:1px solid #1e1e2e; border-radius:8px; overflow:hidden;">
          <tr><td>${detailRow("Monitor Instance", monitorName)}</td></tr>
          <tr><td>${detailRow("Endpoint Destination", `<a href="${url}" style="color:#6655ff; text-decoration:none; word-break:break-all;">${url}</a>`)}</td></tr>
          <tr><td>${detailRow("Return Code Status", `<span style="background-color:rgba(255,68,102,0.15); color:#ff4466; border:1px solid rgba(255,68,102,0.25); padding:3px 10px; border-radius:12px; font-size:12px; font-weight:700; font-family:monospace;">${statusCode || "TCP_CONN_TIMEOUT"}</span>`)}</td></tr>
          <tr><td>${detailRow("Ping Evaluation Velocity", responseTime ? `${responseTime}ms` : "TIMEOUT")}</td></tr>
          <tr><td>${detailRow("Polled Event Timestamp", formateDate, true)}</td></tr>
        </table>
      </div>
    `,
  });
};

export const getRecoveryTemplate = ({
  monitorName,
  url,
  statusCode,
  responseTime,
  formateDate,
}) => {
  return getBaseLayout({
    content: `
      <div style="padding:32px; border-bottom:4px solid #00ff88; background-color:#111118;">
        <div style="font-size:11px; font-weight:700; letter-spacing:0.08em; text-transform:uppercase; color:#00ff88; margin-bottom:6px;">
          SYSTEM HEALED REPORT
        </div>
        <h1 style="margin:0; font-size:26px; font-weight:800; color:#e8e8f0; letter-spacing:-0.02em;">
          ${monitorName} is back UP
        </h1>
      </div>

      <div style="padding:32px;">
        <p style="margin:0 0 24px 0; color:#8888aa; font-size:14.5px; line-height:1.6;">
          Your service has successfully recovered. Operational status metrics have returned entirely to clear nominal thresholds.
        </p>

        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#0e0e16; border:1px solid #1e1e2e; border-radius:8px; overflow:hidden;">
          <tr><td>${detailRow("Monitor Instance", monitorName)}</td></tr>
          <tr><td>${detailRow("Endpoint Destination", `<a href="${url}" style="color:#6655ff; text-decoration:none; word-break:break-all;">${url}</a>`)}</td></tr>
          <tr><td>${detailRow("Return Code Status", `<span style="background-color:rgba(0,255,136,0.1); color:#00ff88; border:1px solid rgba(0,255,136,0.2); padding:3px 10px; border-radius:12px; font-size:12px; font-weight:700; font-family:monospace;">${statusCode || 200} OK</span>`)}</td></tr>
          <tr><td>${detailRow("Ping Evaluation Velocity", `${responseTime}ms`)}</td></tr>
          <tr><td>${detailRow("Resolved Timestamp", formateDate, true)}</td></tr>
        </table>
      </div>
    `,
  });
};

export const getSlowTemplate = ({
  monitorName,
  url,
  statusCode,
  responseTime,
  latencyThreshold,
  formateDate,
}) => {
  return getBaseLayout({
    content: `
      <div style="padding:32px; border-bottom:4px solid #ffcc00; background-color:#111118;">
        <div style="font-size:11px; font-weight:700; letter-spacing:0.08em; text-transform:uppercase; color:#ffcc00; margin-bottom:6px;">
          DEGRADED APP VELOCITY
        </div>
        <h1 style="margin:0; font-size:26px; font-weight:800; color:#e8e8f0; letter-spacing:-0.02em;">
          ${monitorName} response is SLOW
        </h1>
      </div>

      <div style="padding:32px;">
        <p style="margin:0 0 24px 0; color:#8888aa; font-size:14.5px; line-height:1.6;">
          Performance warning. Your running service transaction latency surpassed your custom configured tracking rule threshold.
        </p>

        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#0e0e16; border:1px solid #1e1e2e; border-radius:8px; overflow:hidden;">
          <tr><td>${detailRow("Monitor Instance", monitorName)}</td></tr>
          <tr><td>${detailRow("Endpoint Destination", `<a href="${url}" style="color:#6655ff; text-decoration:none; word-break:break-all;">${url}</a>`)}</td></tr>
          <tr><td>${detailRow("Observed Delta Speed", `<span style="background-color:rgba(255,204,0,0.1); color:#ffcc00; border:1px solid rgba(255,204,0,0.2); padding:3px 10px; border-radius:12px; font-size:12px; font-weight:700; font-family:monospace;">${responseTime}ms</span>`)}</td></tr>
          <tr><td>${detailRow("Configured Limit Ceiling", `${latencyThreshold}ms`)}</td></tr>
          <tr><td>${detailRow("Polled Event Timestamp", formateDate, true)}</td></tr>
        </table>
      </div>
    `,
  });
};

const getActionTemplate = ({
  title,
  message,
  actionLabel,
  actionUrl,
  type = "success",
}) => {
  const brandColor = type === "warning" ? "#ffcc00" : "#6655ff";
  const btnTxtColor = type === "warning" ? "#151923" : "#ffffff";

  return getBaseLayout({
    content: `
      <div style="padding:48px 32px; text-align:center;">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:0 auto 24px auto;">
          <tr>
            <td align="center" style="width:56px; height:56px; background-color:#111118; border:1px solid #1e1e2e; border-radius:12px; font-size:24px; line-height:56px; text-align:center; vertical-align:middle;">
              ${type === "warning" ? "🔐" : "⚡"}
            </td>
          </tr>
        </table>

        <h1 style="margin:0 0 16px 0; font-size:26px; font-weight:800; color:#e8e8f0; letter-spacing:-0.02em;">
          ${title}
        </h1>

        <p style="margin:0 auto 32px auto; max-width:440px; color:#8888aa; font-size:15px; line-height:1.6;">
          ${message}
        </p>

        <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:0 auto;">
          <tr>
            <td align="center" style="border-radius:6px; background-color:${brandColor};">
              <a href="${actionUrl}" target="_blank" style="display:inline-block; padding:12px 28px; font-size:14px; font-weight:700; color:${btnTxtColor}; text-decoration:none; border-radius:6px; letter-spacing:0.02em;">
                ${actionLabel}
              </a>
            </td>
          </tr>
        </table>

        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin-top:40px; background-color:#0e0e16; border:1px solid #1e1e2e; border-radius:8px; text-align:left;">
          <tr>
            <td style="padding:16px; font-size:12px; line-height:1.5; color:#55556a; word-break:break-all;">
              <span style="color:#8888aa; font-weight:600; display:block; margin-bottom:4px;">Trouble connecting?</span>
              If the interactive action element does not initialize, paste this address link directly into your browser navigation window:
              <br/>
              <a href="${actionUrl}" style="color:#6655ff; text-decoration:none; display:block; margin-top:6px; font-family:monospace;">${actionUrl}</a>
            </td>
          </tr>
        </table>
      </div>
    `,
  });
};

const detailRow = (label, value, isLast = false) => `
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="border-bottom:${isLast ? "none" : "1px solid #1e1e2e"};">
    <tr>
      <td style="padding:14px 16px; font-size:13.5px; color:#8888aa; width:40%; font-weight:500;">
        ${label}
      </td>
      <td style="padding:14px 16px; font-size:13.5px; color:#e8e8f0; width:60%; text-align:right; font-weight:600;">
        ${value}
      </td>
    </tr>
  </table>
`;

export const sendHeartbeatAlert = async ({
  heartbeatName,
  email,
  formateDate,
  alertType = "down",
}) => {
  let subject = `${heartbeatName} is Down`;
  let title = `${heartbeatName} missed check-in`;
  let message = `Our monitoring engine failed to receive a heartbeat check-in from your configured instance within the required interval.`;
  let statusBadgeColor = "#ff4466";
  let statusBadgeText = "DOWN";

  if (alertType === "recovered") {
    subject = `${heartbeatName} is Back UP`;
    title = `${heartbeatName} has checked in`;
    message = `We received a successful heartbeat ping. Your service is marked back online.`;
    statusBadgeColor = "#00ff88";
    statusBadgeText = "OK";
  }

  const htmlTemplate = getBaseLayout({
    content: `
      <div style="padding:32px; border-bottom:4px solid ${statusBadgeColor}; background-color:#111118;">
        <div style="font-size:11px; font-weight:700; letter-spacing:0.08em; text-transform:uppercase; color:${statusBadgeColor}; margin-bottom:6px;">
          HEARTBEAT ALERT
        </div>
        <h1 style="margin:0; font-size:26px; font-weight:800; color:#e8e8f0; letter-spacing:-0.02em;">
          ${title}
        </h1>
      </div>
      <div style="padding:32px;">
        <p style="margin:0 0 24px 0; color:#8888aa; font-size:14.5px; line-height:1.6;">
          ${message}
        </p>
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#0e0e16; border:1px solid #1e1e2e; border-radius:8px; overflow:hidden;">
          <tr><td>${detailRow("Heartbeat Name", heartbeatName)}</td></tr>
          <tr><td>${detailRow("Status", `<span style="background-color:rgba(${alertType === "recovered" ? "0,255,136,0.1" : "255,68,102,0.15"}); color:${statusBadgeColor}; border:1px solid ${statusBadgeColor}; padding:3px 10px; border-radius:12px; font-size:12px; font-weight:700; font-family:monospace;">${statusBadgeText}</span>`)}</td></tr>
          <tr><td>${detailRow("Timestamp", formateDate, true)}</td></tr>
        </table>
      </div>
    `,
  });

  try {
    const data = await resend.emails.send({
      from: `Ping Monitor <${SENDER_EMAIL}>`,
      to: email,
      subject,
      html: htmlTemplate,
    });
    console.log("Heartbeat Email sent:", data.id);
    await logEmailAttempt({ email, subject, status: "sent", monitorId: null });
    return data;
  } catch (error) {
    console.error("Failed to send heartbeat email:", error);
    await logEmailAttempt({
      email,
      subject,
      status: "failed",
      errorReason: error.message,
      monitorId: null,
    });
    throw error;
  }
};

export const sendSyntheticAlert = async ({
  syntheticMonitorName,
  email,
  formateDate,
  alertType = "down",
  errorMsg = "",
}) => {
  let subject = `Synthetic Monitor ${syntheticMonitorName} is Down`;
  let title = `${syntheticMonitorName} failed execution`;
  let message = `Our automated browser synthetic monitoring check failed to execute the automation script successfully.`;
  let statusBadgeColor = "#ff4466";
  let statusBadgeText = "FAILED";

  if (alertType === "recovered") {
    subject = `Synthetic Monitor ${syntheticMonitorName} is Back UP`;
    title = `${syntheticMonitorName} execution succeeded`;
    message = `We executed your browser synthetic script, and it completed successfully with no errors.`;
    statusBadgeColor = "#00ff88";
    statusBadgeText = "OK";
  }

  const htmlTemplate = getBaseLayout({
    content: `
      <div style="padding:32px; border-bottom:4px solid ${statusBadgeColor}; background-color:#111118;">
        <div style="font-size:11px; font-weight:700; letter-spacing:0.08em; text-transform:uppercase; color:${statusBadgeColor}; margin-bottom:6px;">
          SYNTHETIC MONITOR ALERT
        </div>
        <h1 style="margin:0; font-size:26px; font-weight:800; color:#e8e8f0; letter-spacing:-0.02em;">
          ${title}
        </h1>
      </div>
      <div style="padding:32px;">
        <p style="margin:0 0 24px 0; color:#8888aa; font-size:14.5px; line-height:1.6;">
          ${message}
        </p>
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#0e0e16; border:1px solid #1e1e2e; border-radius:8px; overflow:hidden;">
          <tr><td>${detailRow("Monitor Name", syntheticMonitorName)}</td></tr>
          <tr><td>${detailRow("Status", `<span style="background-color:rgba(${alertType === "recovered" ? "0,255,136,0.1" : "255,68,102,0.15"}); color:${statusBadgeColor}; border:1px solid ${statusBadgeColor}; padding:3px 10px; border-radius:12px; font-size:12px; font-weight:700; font-family:monospace;">${statusBadgeText}</span>`)}</td></tr>
          ${errorMsg ? `<tr><td>${detailRow("Error Details", `<pre style="margin:0; font-size:11px; white-space:pre-wrap; word-break:break-all; font-family:monospace; color:#ffa8a8;">${errorMsg}</pre>`)}</td></tr>` : ""}
          <tr><td>${detailRow("Timestamp", formateDate, true)}</td></tr>
        </table>
      </div>
    `,
  });

  try {
    const data = await resend.emails.send({
      from: `Ping Monitor <${SENDER_EMAIL}>`,
      to: email,
      subject,
      html: htmlTemplate,
    });
    console.log("Synthetic Email sent:", data.id);
    await logEmailAttempt({ email, subject, status: "sent", monitorId: null });
    return data;
  } catch (error) {
    console.error("Failed to send synthetic email:", error);
    await logEmailAttempt({
      email,
      subject,
      status: "failed",
      errorReason: error.message,
      monitorId: null,
    });
    throw error;
  }
};

export const sendApiMonitorAlert = async ({
  apiMonitorName,
  email,
  formateDate,
  alertType = "down",
  errorMsg = "",
}) => {
  let subject = `API Monitor ${apiMonitorName} is Down`;
  let title = `${apiMonitorName} assertions failed`;
  let message = `Our automated API check failed to satisfy one or more assertions configured for the endpoint.`;
  let statusBadgeColor = "#ff4466";
  let statusBadgeText = "DOWN";

  if (alertType === "recovered") {
    subject = `API Monitor ${apiMonitorName} is Back UP`;
    title = `${apiMonitorName} assertions recovered`;
    message = `We performed an API check-in, and all assertions resolved successfully.`;
    statusBadgeColor = "#00ff88";
    statusBadgeText = "OK";
  }

  const htmlTemplate = getBaseLayout({
    content: `
      <div style="padding:32px; border-bottom:4px solid ${statusBadgeColor}; background-color:#111118;">
        <div style="font-size:11px; font-weight:700; letter-spacing:0.08em; text-transform:uppercase; color:${statusBadgeColor}; margin-bottom:6px;">
          API MONITOR ALERT
        </div>
        <h1 style="margin:0; font-size:26px; font-weight:800; color:#e8e8f0; letter-spacing:-0.02em;">
          ${title}
        </h1>
      </div>
      <div style="padding:32px;">
        <p style="margin:0 0 24px 0; color:#8888aa; font-size:14.5px; line-height:1.6;">
          ${message}
        </p>
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#0e0e16; border:1px solid #1e1e2e; border-radius:8px; overflow:hidden;">
          <tr><td>${detailRow("Monitor Name", apiMonitorName)}</td></tr>
          <tr><td>${detailRow("Status", `<span style="background-color:rgba(${alertType === "recovered" ? "0,255,136,0.1" : "255,68,102,0.15"}); color:${statusBadgeColor}; border:1px solid ${statusBadgeColor}; padding:3px 10px; border-radius:12px; font-size:12px; font-weight:700; font-family:monospace;">${statusBadgeText}</span>`)}</td></tr>
          ${errorMsg ? `<tr><td>${detailRow("Error Details", `<pre style="margin:0; font-size:11px; white-space:pre-wrap; word-break:break-all; font-family:monospace; color:#ffa8a8;">${errorMsg}</pre>`)}</td></tr>` : ""}
          <tr><td>${detailRow("Timestamp", formateDate, true)}</td></tr>
        </table>
      </div>
    `,
  });

  try {
    const data = await resend.emails.send({
      from: `Ping Monitor <${SENDER_EMAIL}>`,
      to: email,
      subject,
      html: htmlTemplate,
    });
    console.log("API Email sent:", data.id);
    await logEmailAttempt({ email, subject, status: "sent", monitorId: null });
    return data;
  } catch (error) {
    console.error("Failed to send API email:", error);
    await logEmailAttempt({
      email,
      subject,
      status: "failed",
      errorReason: error.message,
      monitorId: null,
    });
    throw error;
  }
};

export const sendScheduledReportEmail = async ({
  email,
  name,
  frequency,
  reportData,
}) => {
  const subject = `Your ${frequency.charAt(0).toUpperCase() + frequency.slice(1)} Ping Monitor Report`;

  let contentHtml = `
    <div style="padding:32px; border-bottom:4px solid #6655ff; background-color:#111118;">
      <h1 style="margin:0; font-size:24px; font-weight:800; color:#e8e8f0; letter-spacing:-0.01em;">
        ${subject}
      </h1>
      <p style="margin-top:8px; color:#8888aa; font-size:14px;">Hello ${name}, here is your scheduled summary report.</p>
    </div>
    <div style="padding:32px;">
  `;

  if (reportData.uptime && reportData.uptime.length > 0) {
    contentHtml += `<h2 style="color:#e8e8f0; font-size:16px; margin-bottom:12px; border-bottom:1px solid #1e1e2e; padding-bottom:8px;">Uptime Summary</h2>`;
    contentHtml += `<table width="100%" cellpadding="8" style="color:#8888aa; font-size:14px; margin-bottom:24px; border-collapse:collapse;">
      <tr style="text-align:left; background-color:#1e1e2e;"><th style="padding:8px; border-radius:4px 0 0 4px;">Monitor</th><th style="padding:8px; border-radius:0 4px 4px 0; text-align:right;">Uptime</th></tr>`;
    reportData.uptime.forEach((item) => {
      const color = item.uptimePercent < 99 ? "#ffcc00" : "#00ff88";
      contentHtml += `<tr>
        <td style="border-bottom:1px solid #1e1e2e; padding:8px;">${item.name}</td>
        <td style="border-bottom:1px solid #1e1e2e; padding:8px; text-align:right; color:${color}; font-weight:bold;">${item.uptimePercent}%</td>
      </tr>`;
    });
    contentHtml += `</table>`;
  }

  if (reportData.responseTime && reportData.responseTime.length > 0) {
    contentHtml += `<h2 style="color:#e8e8f0; font-size:16px; margin-bottom:12px; border-bottom:1px solid #1e1e2e; padding-bottom:8px;">Avg Response Time</h2>`;
    contentHtml += `<table width="100%" cellpadding="8" style="color:#8888aa; font-size:14px; margin-bottom:24px; border-collapse:collapse;">
      <tr style="text-align:left; background-color:#1e1e2e;"><th style="padding:8px; border-radius:4px 0 0 4px;">Monitor</th><th style="padding:8px; border-radius:0 4px 4px 0; text-align:right;">Avg Time</th></tr>`;
    reportData.responseTime.forEach((item) => {
      contentHtml += `<tr>
        <td style="border-bottom:1px solid #1e1e2e; padding:8px;">${item.name}</td>
        <td style="border-bottom:1px solid #1e1e2e; padding:8px; text-align:right;">${item.avgResponseTime}ms</td>
      </tr>`;
    });
    contentHtml += `</table>`;
  }

  if (reportData.incidents && reportData.incidents.length > 0) {
    contentHtml += `<h2 style="color:#e8e8f0; font-size:16px; margin-bottom:12px; border-bottom:1px solid #1e1e2e; padding-bottom:8px;">Recent Incidents</h2>`;
    contentHtml += `<ul style="color:#8888aa; font-size:14px; margin-bottom:24px; padding-left:20px;">`;
    reportData.incidents.forEach((item) => {
      contentHtml += `<li style="margin-bottom:6px;"><strong>${item.title}</strong> - ${item.state} (${new Date(item.date).toLocaleDateString()})</li>`;
    });
    contentHtml += `</ul>`;
  } else if (reportData.incidents) {
    contentHtml += `<h2 style="color:#e8e8f0; font-size:16px; margin-bottom:12px; border-bottom:1px solid #1e1e2e; padding-bottom:8px;">Recent Incidents</h2>`;
    contentHtml += `<p style="color:#8888aa; font-size:14px; margin-bottom:24px;">No incidents reported in this period.</p>`;
  }

  if (reportData.heartbeats && reportData.heartbeats.length > 0) {
    contentHtml += `<h2 style="color:#e8e8f0; font-size:16px; margin-bottom:12px; border-bottom:1px solid #1e1e2e; padding-bottom:8px;">Heartbeats</h2>`;
    contentHtml += `<table width="100%" cellpadding="8" style="color:#8888aa; font-size:14px; margin-bottom:24px; border-collapse:collapse;">
      <tr style="text-align:left; background-color:#1e1e2e;"><th style="padding:8px; border-radius:4px 0 0 4px;">Heartbeat</th><th style="padding:8px; border-radius:0 4px 4px 0; text-align:right;">Status</th></tr>`;
    reportData.heartbeats.forEach((item) => {
      const color = item.status === "up" ? "#00ff88" : "#ff4466";
      contentHtml += `<tr>
        <td style="border-bottom:1px solid #1e1e2e; padding:8px;">${item.name}</td>
        <td style="border-bottom:1px solid #1e1e2e; padding:8px; text-align:right; color:${color}; font-weight:bold;">${item.status.toUpperCase()}</td>
      </tr>`;
    });
    contentHtml += `</table>`;
  }

  contentHtml += `</div>`;

  const htmlTemplate = getBaseLayout({ content: contentHtml });

  try {
    const data = await resend.emails.send({
      from: `Ping Monitor <${SENDER_EMAIL}>`,
      to: email,
      subject,
      html: htmlTemplate,
    });
    console.log("Scheduled Report Email sent:", data.id);
    await logEmailAttempt({ email, subject, status: "sent", monitorId: null });
    return data;
  } catch (error) {
    console.error("Failed to send scheduled report email:", error);
    await logEmailAttempt({
      email,
      subject,
      status: "failed",
      errorReason: error.message,
      monitorId: null,
    });
    throw error;
  }
};

export default sendAlert;
