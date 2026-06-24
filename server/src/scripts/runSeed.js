import connectDb from "../config/db.js";
import { seedDemoData } from "./seedDemoData.js";
import mongoose from "mongoose";

const run = async () => {
  try {
    await connectDb();
    await seedDemoData();
    console.log("Database seeding completed.");
    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error("Seeding failed:", error);
    process.exit(1);
  }
};

run();
