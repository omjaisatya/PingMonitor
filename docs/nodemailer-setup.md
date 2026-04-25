# Nodemailer Setup guide

This guide explains how to configure and run **Nodemailer** locally as an SMTP fallback when Resend is not used. It's ideal for development, testing, or environments where Resend is not available.

## Install Package from `npm`

```bash
npm i nodemailer
```

## Setup Config

Add config from mail provide such as `google` and paste in `.env`. Use you google email and your google app password. Generate in 2FA.

- A Google Gmail account with **2FA enabled**
- An **App Password** (generated from your Google account settings)

> **Important**: Never use your Google account password in `.env`. Always generate an App Password.
> Google mail: `yourmail`
> Google App Password: yourAppPassword

```env
EMAIL_USE=mail@gmail.com
EMAIL_PASS=yourAppPassword
```

> Never commit `.env` file to version control (git)

Now import this env in `/src/config/env.config.js`

```text
# env.config.js
const EMAIL_USE = process.env.EMAIL_USE;
const EMAIL_PASS = process.env.EMAIL_PASS;

export {EMAIL_USE,EMAIL_PASS}
```

## Update Email Service

Now go to `/src/service/emailService`

Replace your current email service

```js
// emailService
import nodemailer from "nodemailer";
import { EMAIL_PASS, EMAIL_USE } from "../config/env.config.js";

const mailTransporter = nodemailer.createTransport({
  service: "Gmail",
  // host: "smtp.gmail.com",
  // port: "465",
  auth: {
    user: EMAIL_USE,
    pass: EMAIL_PASS,
  },
});

const sendAlert = async ({
  monitorName,
  url,
  statusCode,
  responseTime,
  email,
  formateDate
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
            <td style="padding: 8px; background: #f7f7f7; font-weight: bold;">Monitor</td>
            <td style="padding: 8px;">${monitorName}</td>
          </tr>
          <tr>
            <td style="padding: 8px; background: #f7f7f7; font-weight: bold;">URL</td>
            <td style="padding: 8px;">${url}</td>
          </tr>
          <tr>
            <td style="padding: 8px; background: #f7f7f7; font-weight: bold;">Status Code</td>
            <td style="padding: 8px;">${statusCode || "No response"}</td>
          </tr>
          <tr>
            <td style="padding: 8px; background: #f7f7f7; font-weight: bold;">Response Time</td>
            <td style="padding: 8px;">${responseTime ? responseTime + "ms" : "N/A"}</td>
          </tr>
          <tr>
            <td style="padding: 8px; background: #f7f7f7; font-weight: bold;">Time</td>
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
```
