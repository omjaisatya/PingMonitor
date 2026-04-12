import nodemailer from "nodemailer";
import { EMAIL_PASS, EMAIL_USE } from "../config/env.config.js";
import dns from "dns";
dns.setDefaultResultOrder("ipv4first");

const mailTransporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 587,
  secure: false,
  requireTLS: true,
  auth: {
    user: EMAIL_USE,
    pass: EMAIL_PASS,
  },
});

// todo: add ejs for mail template

const sendAlert = async ({
  monitorName,
  url,
  statusCode,
  responseTime,
  email,
  formateDate,
}) => {
  const mailOptions = {
    from: `"Ping Monitor" <${EMAIL_USE}`,
    to: email,
    subject: `Ping Monitor - ${monitorName} is Down`,
    html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 500px;">
        <h2 style="color: #e53e3e;">⚠️ Monitor Alert</h2>
        <p>Your monitored service has gone <strong>DOWN</strong>.</p>
        <table style="width: 100%; border-collapse: collapse; margin-top: 16px;">
          <tr>
            <td style="padding: 8px;  font-weight: bold;">Monitor</td>
            <td style="padding: 8px;">${monitorName}</td>
          </tr>
          <tr>
            <td style="padding: 8px;  font-weight: bold;">URL</td>
            <td style="padding: 8px;">${url}</td>
          </tr>
          <tr>
            <td style="padding: 8px;  font-weight: bold;">Status Code</td>
            <td style="padding: 8px;">${statusCode || "No response"}</td>
          </tr>
          <tr>
            <td style="padding: 8px;  font-weight: bold;">Response Time</td>
            <td style="padding: 8px;">${responseTime ? responseTime + "ms" : "N/A"}</td>
          </tr>
          <tr>
            <td style="padding: 8px;  font-weight: bold;">Time</td>
            <td style="padding: 8px;">${formateDate}</td>
          </tr>
        </table>
        <p style="margin-top: 20px; color: #666; font-size: 13px;">
          You'll be notified again if the status changes. - PingMonitor
        </p>
      </div>
        `,
  };

  await mailTransporter.sendMail(mailOptions);
};

export default sendAlert;
