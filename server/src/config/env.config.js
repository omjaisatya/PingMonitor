// import "dotenv/config.js";
// i need to set config options so i import var options

import dotenv from "dotenv";

if (process.env.NODE_ENV === "production") {
  dotenv.config({ path: ".env.production" });
} else if (process.env.NODE_ENV === "test") {
  dotenv.config({ path: ".env.test" });
} else {
  dotenv.config();
}

// import all global var in one place
const PORT = process.env.PORT;
const MongoUrl = process.env.MONGO_URL;
const JWT_SECRET = process.env.JWT_SECRET;
const NODE_ENV = process.env.NODE_ENV;
const FRONTEND_URL = process.env.FRONTEND_URL;
// Email JS for tempary usage because nodemailer gave an error on deployment
const EMAILJS_SERVICE_ID = process.env.EMAILJS_SERVICE_ID;
const EMAILJS_TEMPLATE_ID = process.env.EMAILJS_TEMPLATE_ID;
const EMAILJS_PUBLIC_KEY = process.env.EMAILJS_PUBLIC_KEY;
const EMAILJS_PRIVATE_KEY = process.env.EMAILJS_PRIVATE_KEY;

// export all config var
export {
  PORT,
  MongoUrl,
  JWT_SECRET,
  NODE_ENV,
  FRONTEND_URL,
  EMAILJS_PRIVATE_KEY,
  EMAILJS_PUBLIC_KEY,
  EMAILJS_SERVICE_ID,
  EMAILJS_TEMPLATE_ID,
};
