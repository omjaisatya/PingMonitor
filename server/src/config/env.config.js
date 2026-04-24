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
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const SENDER_EMAIL = process.env.SENDER_EMAIL;

// export all config var
export {
  PORT,
  MongoUrl,
  JWT_SECRET,
  NODE_ENV,
  FRONTEND_URL,
  RESEND_API_KEY,
  SENDER_EMAIL,
};
