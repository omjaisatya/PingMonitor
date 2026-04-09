import jwt from "jsonwebtoken";
import User from "../models/User.js";
import { JWT_SECRET } from "../config/env.config.js";

// for protecting private routes - user home,
// todo - implement cookies
const protect = async (req, res, next) => {
  try {
    const authHead = req.headers.authorization;

    if (!authHead || !authHead.startsWith("Bearer")) {
      return res.status(401).json({ message: "Auth failed" });
    }

    const token = authHead.split(" ")[1];
    const decoded = jwt.verify(token, JWT_SECRET);

    const user = await User.findById(decoded.id).select("-password");

    if (!user) {
      return res.status(401).json({ message: "User no longer exists" });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({ message: "Invalid token" });
  }
};

export default protect;
