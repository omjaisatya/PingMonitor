import emailjs from "@emailjs/nodejs";
import {
  EMAILJS_PRIVATE_KEY,
  EMAILJS_PUBLIC_KEY,
  EMAILJS_SERVICE_ID,
  EMAILJS_TEMPLATE_ID,
} from "../config/env.config.js";

emailjs.init({
  publicKey: EMAILJS_PUBLIC_KEY,
  privateKey: EMAILJS_PRIVATE_KEY,
});

const sendAlert = async ({
  monitorName,
  url,
  statusCode,
  responseTime,
  email,
  formateDate,
}) => {
  try {
    const templateParms = {
      to_email: email,
      monitorName: monitorName,
      url: url,
      statusCode: statusCode || "No Response",
      responseTime: responseTime ? responseTime + "ms" : "N/A",
      formateDate: formateDate,
    };

    const response = await emailjs.send(
      EMAILJS_SERVICE_ID,
      EMAILJS_TEMPLATE_ID,
      templateParms,
    );

    console.log("Email Alert sent", response.status, response.text);
  } catch (error) {
    console.log("Failed to send Email Alert", error);
  }
};

export default sendAlert;
