import mongoose from "mongoose";
import connectDb from "../config/db.js";
import { exportPDFReport } from "../controllers/analyticsController.js";
import User from "../models/User.js";

const test = async () => {
  try {
    await connectDb();

    const user = await User.findOne({});
    if (!user) {
      console.log("No user found in DB.");
      process.exit(1);
    }

    console.log(`Testing PDF export for user: ${user.email} (${user._id})`);

    const req = {
      user: { _id: user._id },
      query: {},
    };

    const res = {
      headers: {},
      status: function (code) {
        this.statusCode = code;
        return this;
      },
      setHeader: function (name, val) {
        this.headers[name] = val;
        return this;
      },
      send: function (data) {
        this.body = data;
        console.log("PDF generated successfully!");
        console.log("Status Code:", this.statusCode || 200);
        console.log("Headers:", this.headers);
        console.log("Body length:", data.length);
        process.exit(0);
      },
      json: function (data) {
        console.log("Returned JSON error:", data);
        process.exit(1);
      },
    };

    const next = (err) => {
      console.error("Next called with error:", err);
      process.exit(1);
    };

    await exportPDFReport(req, res, next);
  } catch (error) {
    console.error("Test failed:", error);
    process.exit(1);
  }
};

test();
