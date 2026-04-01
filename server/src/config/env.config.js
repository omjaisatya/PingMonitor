import "dotenv/config.js";

// import all global var in one place
const PORT = process.env.PORT;
const MongoUrl = process.env.MONGO_URL;
const JWT_SECRET = process.env.JWT_SECRET;
const EMAIL_USE = process.env.EMAIL_USE;
const EMAIL_PASS = process.env.EMAIL_PASS;

// export all config var
export { PORT, MongoUrl, JWT_SECRET, EMAIL_PASS, EMAIL_USE };
