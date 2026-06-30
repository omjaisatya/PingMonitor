import { Resend } from "resend";
import axios from "axios";
import {
  RESEND_API_KEY,
  SENDER_EMAIL,
  FRONTEND_URL,
} from "../config/env.config.js";
import User from "../models/User.js";
import Monitor from "../models/Monitor.js";
import StatusPageSubscriber from "../models/StatusPageSubscriber.js";
import { generateReportData } from "./reportService.js";

const resend = new Resend(RESEND_API_KEY);

const getBaseLayout = ({ content }) => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="color-scheme" content="dark" />
  <title>Status Page Alert</title>
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
                    <p style="margin:0 0 6px 0; font-weight:700; color:#e8e8f0; letter-spacing:0.02em;">PING MONITOR SUBSCRIBER ENGINE</p>
                    <p style="margin:0 0 12px 0;">You are receiving this because you subscribed to system status updates.</p>
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

export const sendVerificationMessage = async ({
  subscriber,
  statusPageTitle,
}) => {
  const verificationLink = `${FRONTEND_URL}/status/verify?token=${subscriber.verificationToken}`;
  const code = subscriber.verificationCode;

  console.log(
    `[Subscriber Verification] Sending verification to target: ${subscriber.target} (Type: ${subscriber.type}, Code: ${code})`,
  );

  switch (subscriber.type) {
    case "email":
      try {
        await resend.emails.send({
          from: `Ping Monitor Status <${SENDER_EMAIL}>`,
          to: subscriber.target,
          subject: `Verify your status updates subscription to ${statusPageTitle}`,
          html: getBaseLayout({
            content: `
              <div style="padding:32px; border-bottom:4px solid #6655ff; background-color:#111118; text-align:center;">
                <h1 style="margin:0; font-size:24px; color:#e8e8f0;">Verify your subscription</h1>
                <p style="margin:8px 0 0; color:#8888aa; font-size:14px;">Confirm your subscription to status updates for <strong>${statusPageTitle}</strong></p>
              </div>
              <div style="padding:32px; text-align:center;">
                <p style="font-size:15px; color:#8888aa; margin-bottom:24px;">Enter this 6-digit verification code in the subscription dialog:</p>
                <div style="font-size:32px; font-weight:800; color:#6655ff; letter-spacing:6px; background:#0e0e16; padding:16px; border-radius:8px; display:inline-block; border:1px solid #1e1e2e; margin-bottom:24px;">
                  ${code}
                </div>
                <p style="font-size:14px; color:#55556a; margin-bottom:24px;">Or click the button below to verify automatically:</p>
                <a href="${verificationLink}" target="_blank" style="display:inline-block; background-color:#6655ff; color:#ffffff; padding:12px 28px; text-decoration:none; border-radius:6px; font-weight:700; font-size:14px;">Verify Subscription</a>
              </div>
            `,
          }),
        });
      } catch (err) {
        console.error(
          "Failed to send subscriber verification email:",
          err.message,
        );
        throw err;
      }
      break;

    case "sms":
      console.log(
        `[SMS Gateway Simulated] Send SMS to ${subscriber.target}: "${statusPageTitle}: Please verify your subscription. Enter code: ${code} or click: ${verificationLink}"`,
      );
      break;

    case "telegram":
      console.log(
        `[Telegram Bot Simulated] Message to chat ID ${subscriber.target}: "*${statusPageTitle} Verification*\nEnter code *${code}* or verify: ${verificationLink}"`,
      );
      break;

    case "slack":
      try {
        await axios.post(subscriber.target, {
          text: `Verify status updates subscription to ${statusPageTitle}`,
          blocks: [
            {
              type: "header",
              text: {
                type: "plain_text",
                text: "Status Page Subscription Verification ⚡",
              },
            },
            {
              type: "section",
              text: {
                type: "mrkdwn",
                text: `You have requested to receive status page alerts for *${statusPageTitle}* in this channel.`,
              },
            },
            {
              type: "section",
              text: {
                type: "mrkdwn",
                text: `Please enter the following verification code in the subscription modal:\n*Verification Code:* \`${code}\``,
              },
            },
            {
              type: "actions",
              elements: [
                {
                  type: "button",
                  text: {
                    type: "plain_text",
                    text: "Verify Automatically",
                  },
                  url: verificationLink,
                  style: "primary",
                },
              ],
            },
          ],
        });
      } catch (err) {
        console.error("Slack webhook verification ping failed:", err.message);
        throw new Error(
          "Failed to send Slack verification message. Please check the Webhook URL.",
        );
      }
      break;

    case "webhook":
      try {
        await axios.post(
          subscriber.target,
          {
            event: "subscription.verify",
            statusPageTitle,
            verificationCode: code,
            verificationUrl: verificationLink,
            message:
              "Verify this endpoint ownership by submitting the verification code back to the PingMonitor status page subscriber modal.",
          },
          { timeout: 4000 },
        );
      } catch (err) {
        console.error("Webhook verification ping failed:", err.message);
        throw new Error(
          "Webhook handshake failed. Ensure your URL endpoint is active and handles POST requests.",
        );
      }
      break;
  }
};

export const notifyStatusPageSubscribers = async ({ incident, eventType }) => {
  if (!incident.isPublic) return;

  try {
    const owner = await User.findById(incident.userId);
    if (!owner) return;

    const statusPageTitle = owner.statusPageTitle || "System Status";
    const statusPageSlugOrId = owner.statusPageSlug || owner._id;
    const statusPageUrl = `${FRONTEND_URL}/status/${statusPageSlugOrId}`;

    const verifiedSubscribers = await StatusPageSubscriber.find({
      userId: incident.userId,
      status: "verified",
    });

    if (verifiedSubscribers.length === 0) return;

    const affectedMonitorIds = (incident.affectedServices || [])
      .map((s) => s.monitorId?.toString())
      .filter(Boolean);

    for (const sub of verifiedSubscribers) {
      if (
        sub.monitors &&
        sub.monitors.length > 0 &&
        affectedMonitorIds.length > 0
      ) {
        const subMonitorIds = sub.monitors.map((m) => m.toString());
        const hasOverlap = affectedMonitorIds.some((id) =>
          subMonitorIds.includes(id),
        );
        if (!hasOverlap) {
          console.log(
            `Subscriber ${sub.target} has specific monitor subscriptions that do not match incident ${incident.title}`,
          );
          continue; // Skip
        }
      }

      const unsubscribeUrl = `${FRONTEND_URL}/unsubscribe/${sub._id}`;

      console.log(
        `[Status Alert Dispatch] Sending incident ${eventType} to subscriber ${sub.target} (${sub.type})`,
      );

      switch (sub.type) {
        case "email":
          try {
            await resend.emails.send({
              from: `Ping Monitor Alerts <${SENDER_EMAIL}>`,
              to: sub.target,
              subject: `[${eventType.toUpperCase()}] ${incident.title}`,
              html: getBaseLayout({
                content: `
                  <div style="padding:32px; border-bottom:4px solid ${incident.state === "resolved" ? "#00ff88" : "#ff4466"}; background-color:#111118;">
                    <div style="font-size:11px; font-weight:700; letter-spacing:0.08em; text-transform:uppercase; color:#8888aa; margin-bottom:8px;">
                      INCIDENT ALERT: ${eventType.toUpperCase()}
                    </div>
                    <h1 style="margin:0; font-size:24px; font-weight:800; color:#e8e8f0;">${incident.title}</h1>
                  </div>
                  <div style="padding:32px;">
                    <p style="margin:0 0 16px; color:#e8e8f0; font-size:15px; line-height:1.6;">${incident.summary || "No description provided."}</p>
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#0e0e16; border:1px solid #1e1e2e; border-radius:8px; overflow:hidden; margin-bottom:24px;">
                      <tr>
                        <td style="padding:12px; font-size:13px; color:#8888aa; width:35%;">State</td>
                        <td style="padding:12px; font-size:13px; color:#e8e8f0; font-weight:600; text-align:right; text-transform:uppercase;">${incident.state}</td>
                      </tr>
                      <tr>
                        <td style="padding:12px; font-size:13px; color:#8888aa; width:35%;">Severity</td>
                        <td style="padding:12px; font-size:13px; color:#e8e8f0; font-weight:600; text-align:right; text-transform:uppercase;">${incident.severity}</td>
                      </tr>
                    </table>
                    <p style="text-align:center; margin:0 0 24px;">
                      <a href="${statusPageUrl}" target="_blank" style="display:inline-block; background-color:#6655ff; color:#ffffff; padding:12px 28px; text-decoration:none; border-radius:6px; font-weight:700; font-size:14px;">View Status Page</a>
                    </p>
                    <div style="text-align:center; font-size:12px; color:#55556a;">
                      To stop receiving updates, <a href="${unsubscribeUrl}" style="color:#6655ff; text-decoration:none;">click here to unsubscribe</a>.
                    </div>
                  </div>
                `,
              }),
            });
          } catch (emailErr) {
            console.error(
              `Failed to send incident email to subscriber ${sub.target}:`,
              emailErr.message,
            );
          }
          break;

        case "sms":
          console.log(
            `[SMS Alert Simulated] Target ${sub.target}: "[PingMonitor Alert - ${eventType.toUpperCase()}] ${incident.title}. Status: ${incident.state.toUpperCase()}. More info: ${statusPageUrl}. Unsubscribe: ${unsubscribeUrl}"`,
          );
          break;

        case "telegram":
          console.log(
            `[Telegram Alert Simulated] Chat ID ${sub.target}: "*[PingMonitor Alert - ${eventType.toUpperCase()}]*\n*${incident.title}*\nStatus: ${incident.state.toUpperCase()}\nSeverity: ${incident.severity.toUpperCase()}\n\nView details: ${statusPageUrl}\nUnsubscribe: [Click here](${unsubscribeUrl})"`,
          );
          break;

        case "slack":
          try {
            await axios.post(sub.target, {
              text: `[PingMonitor Alert - ${eventType.toUpperCase()}] ${incident.title}`,
              blocks: [
                {
                  type: "header",
                  text: {
                    type: "plain_text",
                    text: `Incident ${eventType.toUpperCase()} 🚨`,
                  },
                },
                {
                  type: "section",
                  text: {
                    type: "mrkdwn",
                    text: `*${incident.title}*\nState: *${incident.state.toUpperCase()}* | Severity: *${incident.severity.toUpperCase()}*\n\n${incident.summary || ""}`,
                  },
                },
                {
                  type: "actions",
                  elements: [
                    {
                      type: "button",
                      text: {
                        type: "plain_text",
                        text: "View Status Page",
                      },
                      url: statusPageUrl,
                      style: "primary",
                    },
                    {
                      type: "button",
                      text: {
                        type: "plain_text",
                        text: "Unsubscribe",
                      },
                      url: unsubscribeUrl,
                    },
                  ],
                },
              ],
            });
          } catch (slackErr) {
            console.error(
              `Slack notification dispatch failed for ${sub.target}:`,
              slackErr.message,
            );
          }
          break;

        case "webhook":
          try {
            await axios.post(
              sub.target,
              {
                event: `incident.${eventType}`,
                incident: {
                  id: incident._id,
                  title: incident.title,
                  summary: incident.summary,
                  state: incident.state,
                  severity: incident.severity,
                  affectedServices: incident.affectedServices,
                  updatedAt: incident.updatedAt,
                },
                statusPageUrl,
                unsubscribeUrl,
              },
              { timeout: 4000 },
            );
          } catch (webhookErr) {
            console.error(
              `Webhook alert POST failed to ${sub.target}:`,
              webhookErr.message,
            );
          }
          break;
      }
    }
  } catch (err) {
    console.error("Error sending subscriber notifications:", err);
  }
};

export const dispatchDigestEmails = async () => {
  console.log(
    "subscriberNotificationService: starting digest email dispatch...",
  );
  try {
    const now = new Date();
    const digestSubscribers = await StatusPageSubscriber.find({
      type: "email",
      status: "verified",
      digestFrequency: { $in: ["daily", "weekly"] },
    });

    for (const sub of digestSubscribers) {
      let shouldSend = false;
      const hoursThreshold = sub.digestFrequency === "daily" ? 23 : 24 * 6;

      if (!sub.lastDigestSentAt) {
        shouldSend = true;
      } else {
        const lastSent = new Date(sub.lastDigestSentAt);
        const elapsedHours = (now - lastSent) / (1000 * 60 * 60);
        if (elapsedHours >= hoursThreshold) {
          shouldSend = true;
        }
      }

      if (shouldSend) {
        try {
          const owner = await User.findById(sub.userId);
          if (!owner) continue;

          const sections = {
            uptime: true,
            incidents: true,
            responseTime: true,
            ssl: false,
            heartbeats: false,
          };
          const reportData = await generateReportData(
            sub.userId,
            sections,
            sub.digestFrequency,
          );

          const statusPageTitle = owner.statusPageTitle || "System Status";
          const statusPageSlugOrId = owner.statusPageSlug || owner._id;
          const statusPageUrl = `${FRONTEND_URL}/status/${statusPageSlugOrId}`;
          const unsubscribeUrl = `${FRONTEND_URL}/unsubscribe/${sub._id}`;

          let contentHtml = `
            <div style="padding:32px; border-bottom:4px solid #6655ff; background-color:#111118;">
              <h1 style="margin:0; font-size:22px; font-weight:800; color:#e8e8f0; letter-spacing:-0.01em;">
                ${statusPageTitle} Status Digest
              </h1>
              <p style="margin-top:8px; color:#8888aa; font-size:14px;">Here is your ${sub.digestFrequency} subscriber summary digest.</p>
            </div>
            <div style="padding:32px;">
          `;

          if (reportData.uptime && reportData.uptime.length > 0) {
            contentHtml += `<h2 style="color:#e8e8f0; font-size:15px; margin-bottom:12px; border-bottom:1px solid #1e1e2e; padding-bottom:8px;">Uptime Summary</h2>`;
            contentHtml += `<table width="100%" cellpadding="8" style="color:#8888aa; font-size:13px; margin-bottom:24px; border-collapse:collapse;">
              <tr style="text-align:left; background-color:#1e1e2e;"><th style="padding:6px; border-radius:4px 0 0 4px;">Service</th><th style="padding:6px; border-radius:0 4px 4px 0; text-align:right;">Uptime</th></tr>`;
            reportData.uptime.forEach((item) => {
              const color = item.uptimePercent < 99 ? "#ffcc00" : "#00ff88";
              contentHtml += `<tr>
                <td style="border-bottom:1px solid #1e1e2e; padding:6px;">${item.name}</td>
                <td style="border-bottom:1px solid #1e1e2e; padding:6px; text-align:right; color:${color}; font-weight:bold;">${item.uptimePercent}%</td>
              </tr>`;
            });
            contentHtml += `</table>`;
          }

          if (reportData.responseTime && reportData.responseTime.length > 0) {
            contentHtml += `<h2 style="color:#e8e8f0; font-size:15px; margin-bottom:12px; border-bottom:1px solid #1e1e2e; padding-bottom:8px;">Response Performance</h2>`;
            contentHtml += `<table width="100%" cellpadding="8" style="color:#8888aa; font-size:13px; margin-bottom:24px; border-collapse:collapse;">
              <tr style="text-align:left; background-color:#1e1e2e;"><th style="padding:6px; border-radius:4px 0 0 4px;">Service</th><th style="padding:6px; border-radius:0 4px 4px 0; text-align:right;">Avg Response</th></tr>`;
            reportData.responseTime.forEach((item) => {
              contentHtml += `<tr>
                <td style="border-bottom:1px solid #1e1e2e; padding:6px;">${item.name}</td>
                <td style="border-bottom:1px solid #1e1e2e; padding:6px; text-align:right;">${item.avgResponseTime}ms</td>
              </tr>`;
            });
            contentHtml += `</table>`;
          }

          if (reportData.incidents && reportData.incidents.length > 0) {
            contentHtml += `<h2 style="color:#e8e8f0; font-size:15px; margin-bottom:12px; border-bottom:1px solid #1e1e2e; padding-bottom:8px;">Recent Public Incidents</h2>`;
            contentHtml += `<ul style="color:#8888aa; font-size:13px; margin-bottom:24px; padding-left:20px;">`;
            reportData.incidents.forEach((item) => {
              contentHtml += `<li style="margin-bottom:6px;"><strong>${item.title}</strong> - ${item.state} (${new Date(item.date).toLocaleDateString()})</li>`;
            });
            contentHtml += `</ul>`;
          }

          contentHtml += `
              <p style="text-align:center; margin:24px 0 12px;">
                <a href="${statusPageUrl}" target="_blank" style="display:inline-block; background-color:#6655ff; color:#ffffff; padding:10px 24px; text-decoration:none; border-radius:6px; font-weight:700; font-size:13px;">Visit Live Status Page</a>
              </p>
              <div style="text-align:center; font-size:11px; color:#55556a; margin-top:24px;">
                To stop receiving updates, <a href="${unsubscribeUrl}" style="color:#6655ff; text-decoration:none;">unsubscribe from this digest</a>.
              </div>
            </div>
          `;

          await resend.emails.send({
            from: `Ping Monitor Status <${SENDER_EMAIL}>`,
            to: sub.target,
            subject: `[${sub.digestFrequency.toUpperCase()}] Status Update Digest: ${statusPageTitle}`,
            html: getBaseLayout({ content: contentHtml }),
          });

          sub.lastDigestSentAt = new Date();
          await sub.save();
          console.log(
            `Successfully sent digest email to subscriber: ${sub.target}`,
          );
        } catch (err) {
          console.error(
            `Failed to dispatch digest to subscriber ${sub.target}:`,
            err.message,
          );
        }
      }
    }
  } catch (error) {
    console.error("Failed to run digest emails dispatch:", error.message);
  }
};
