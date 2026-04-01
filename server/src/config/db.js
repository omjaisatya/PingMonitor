import mongoose from "mongoose";
import { MongoUrl } from "./env.config.js";

// using asynchronus
const connectDb = async () => {
  try {
    const conn = await mongoose.connect(MongoUrl);
    console.log(`Sucessfully Database connected : ${conn.connection.host}`);
  } catch (error) {
    console.error("failed to connect DB", error.message);
    process.exit(1);
  }
};

export default connectDb;
