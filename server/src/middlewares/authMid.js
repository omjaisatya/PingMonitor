import User from "../models/User.js";
import { verifyAccessToken } from "../../utils/tokenCofig.js";
import { isTokenBlacklisted } from "../../utils/tokenBlacklist.js";
import Session from "../models/Session.js";

const protect = async (req, res, next) => {
  try {
    const authHead = req.headers.authorization;

    if (!authHead || !authHead.startsWith("Bearer")) {
      return res.status(401).json({ message: "Auth failed" });
    }

    const accessToken = authHead.split(" ")[1];

    if (isTokenBlacklisted(accessToken)) {
      return res.status(401).json({ message: "Token has been revoked" });
    }

    const decoded = verifyAccessToken(accessToken);

    if (decoded.sessionId) {
      const session = await Session.findById(decoded.sessionId);
      if (
        !session ||
        session.status !== "active" ||
        session.expiresAt < new Date()
      ) {
        if (session && session.status === "active") {
          session.status = "expired";
          await session
            .save()
            .catch((err) =>
              console.error("Error setting session to expired:", err),
            );
        }
        return res.status(401).json({
          message:
            "Your session has expired or has been revoked. Please sign in again.",
          code: "SESSION_REVOKED",
        });
      }

      Session.findByIdAndUpdate(decoded.sessionId, {
        lastActivity: new Date(),
      }).catch((err) => {
        console.error("Error updating lastActivity for session:", err.message);
      });

      req.sessionId = decoded.sessionId;
    }

    const user = await User.findById(decoded.id).select("-password");

    if (!user) {
      return res.status(401).json({ message: "User no longer exists" });
    }

    if (user.isDeactivated) {
      return res.status(403).json({
        message: "Account is deactivated",
        code: "ACCOUNT_DEACTIVATED",
      });
    }

    if (process.env.NODE_ENV === "development") {
      user.isVerified = true;
    }

    req.user = user;
    req.token = accessToken;
    next();
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({
        message: "Access token expired",
        code: "TOKEN_EXPIRED",
      });
    }
    return res.status(401).json({ message: "Invalid token" });
  }
};

export default protect;
