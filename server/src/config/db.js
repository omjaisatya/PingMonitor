import mongoose from "mongoose";
import { MongoUrl } from "./env.config.js";

// using asynchronus
const connectDb = async () => {
  try {
    const conn = await mongoose.connect(MongoUrl);
    console.log(`Sucessfully Database connected : ${conn.connection.host}`);

    try {
      await conn.connection.db
        .collection("users")
        .dropIndex("statusPageSlug_1");
      console.log("Dropped non-sparse index statusPageSlug_1");
    } catch (err) {
      console.log(
        "Note: skipped dropping statusPageSlug_1 index (not found or already sparse)",
      );
    }
  } catch (error) {
    console.error("failed to connect DB", error.message);
    process.exit(1);
  }
};

// todo: improve db connection, add pre for hashing password direct in db config not in controller

export default connectDb;
