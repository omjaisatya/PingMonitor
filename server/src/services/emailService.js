import { Resend } from "resend";
import { SENDER_EMAIL, RESEND_API_KEY } from "../config/env.config.js";

const resend = new Resend(RESEND_API_KEY);

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
      subject: `${monitorName} is Down - Ping Monitor`,
      html: getAlertTemplate({
        monitorName,
        url,
        statusCode,
        responseTime,
        formateDate,
      }),
    });

    console.log("Email sent successfully:", data.id);
    return data;
  } catch (error) {
    console.error("Failed to send email:", error);
    throw error;
  }
};

const getAlertTemplate = ({
  monitorName,
  url,
  statusCode,
  responseTime,
  formateDate,
}) => {
  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', sans-serif; padding: 40px 20px; max-width: 600px; margin: 0 auto; background: #0f0f0f; color: #e0e0e0;">
      <!-- Header -->
      <div style="background: linear-gradient(135deg, #e53e3e 0%, #c53030 100%); padding: 30px; border-radius: 8px 8px 0 0; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 28px;">Monitor Alert</h1>
      </div>

      <!-- Content -->
      <div style="background: #1a1a1a; padding: 30px; border-radius: 0 0 8px 8px; border: 1px solid #444444; border-top: none;">
        <p style="color: #e0e0e0; font-size: 16px; margin: 0 0 24px 0; line-height: 1.6;">
          Your monitored service <strong>${monitorName}</strong> has gone <span style="color: #ff6b6b; font-weight: bold;">DOWN</span>.
        </p>

        <!-- Alert Details Table -->
        <table style="width: 100%; border-collapse: collapse; margin: 24px 0;">
          <tr>
            <td style="padding: 12px 16px; background: #2d2d2d; border: 1px solid #444444; font-weight: 600; color: #b0b0b0; width: 150px;">Monitor</td>
            <td style="padding: 12px 16px; background: #2d2d2d; border: 1px solid #444444; color: #e0e0e0;">${monitorName}</td>
          </tr>
          <tr>
            <td style="padding: 12px 16px; background: #1a1a1a; border: 1px solid #444444; font-weight: 600; color: #b0b0b0;">URL</td>
            <td style="padding: 12px 16px; background: #1a1a1a; border: 1px solid #444444; color: #6eb3ff; word-break: break-all;"><a href="${url}" style="color: #6eb3ff; text-decoration: none;">${url}</a></td>
          </tr>
          <tr>
            <td style="padding: 12px 16px; background: #2d2d2d; border: 1px solid #444444; font-weight: 600; color: #b0b0b0;">Status Code</td>
            <td style="padding: 12px 16px; background: #2d2d2d; border: 1px solid #444444; color: #e0e0e0;">
              <span style="background: #3d1f1f; padding: 4px 8px; border-radius: 4px; font-weight: 600; color: #ff6b6b;">
                ${statusCode || "No response"}
              </span>
            </td>
          </tr>
          <tr>
            <td style="padding: 12px 16px; background: #1a1a1a; border: 1px solid #444444; font-weight: 600; color: #b0b0b0;">Response Time</td>
            <td style="padding: 12px 16px; background: #1a1a1a; border: 1px solid #444444; color: #e0e0e0;">${
              responseTime ? responseTime + "ms" : "N/A"
            }</td>
          </tr>
          <tr>
            <td style="padding: 12px 16px; background: #2d2d2d; border: 1px solid #444444; font-weight: 600; color: #b0b0b0;">Alert Time</td>
            <td style="padding: 12px 16px; background: #2d2d2d; border: 1px solid #444444; color: #e0e0e0;">${formateDate}</td>
          </tr>
        </table>

        <!-- Footer -->
        <div style="border-top: 1px solid #444444; padding-top: 16px; margin-top: 24px;">
          <p style="color: #909090; font-size: 13px; margin: 0; line-height: 1.6;">
            You'll be notified again if the service status changes. If you no longer want to monitor this service please delete or pause monitor.
          </p>
          <p style="color: #707070; font-size: 12px; margin: 8px 0 0 0;">
            © 2026 Ping Monitor. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  `;
};

export default sendAlert;
