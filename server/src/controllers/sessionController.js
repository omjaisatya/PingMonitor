import Session from "../models/Session.js";
import { blacklistToken } from "../../utils/tokenBlacklist.js";

const formatDuration = (start, end) => {
  if (!start) return "N/A";
  const endTime = end ? new Date(end) : new Date();
  const diffMs = endTime - new Date(start);
  if (diffMs <= 0) return "0s";

  const diffSecs = Math.floor(diffMs / 1000);
  const hours = Math.floor(diffSecs / 3600);
  const minutes = Math.floor((diffSecs % 3600) / 60);

  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m`;
  return `${diffSecs % 60}s`;
};

/**
 * Get all active and previous sessions for the logged-in user.
 * GET /api/profile/sessions
 */
export const getSessions = async (req, res) => {
  try {
    const allSessions = await Session.find({ userId: req.user._id }).sort({
      loginAt: -1,
    });

    const formattedSessions = allSessions.map((session) => {
      const isCurrent = session._id.toString() === req.sessionId?.toString();

      let duration = "Ongoing";
      if (session.status !== "active") {
        duration = formatDuration(
          session.loginAt,
          session.logoutAt || session.updatedAt,
        );
      } else {
        duration = formatDuration(session.loginAt, new Date());
      }

      return {
        id: session._id,
        device: session.device,
        browser: session.browser,
        operatingSystem: session.operatingSystem,
        ipAddress: session.ipAddress,
        location: session.location,
        loginAt: session.loginAt,
        lastActivity: session.lastActivity,
        logoutAt: session.logoutAt,
        expiresAt: session.expiresAt,
        status: session.status,
        duration,
        isCurrent,
      };
    });

    const currentSession = formattedSessions.find((s) => s.isCurrent) || null;

    const otherActiveSessions = formattedSessions.filter(
      (s) => s.status === "active" && !s.isCurrent,
    );

    const sessionHistory = formattedSessions.slice(0, 20);

    res.status(200).json({
      currentSession,
      otherActiveSessions,
      sessionHistory,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * Revoke/Sign out selected session by ID.
 * DELETE /api/profile/sessions/:id
 */
export const revokeSession = async (req, res) => {
  try {
    const { id } = req.params;

    const session = await Session.findById(id);
    if (!session) {
      return res.status(404).json({ message: "Session not found" });
    }

    if (session.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        message: "You do not have permission to sign out this session",
      });
    }

    const isCurrent = session._id.toString() === req.sessionId?.toString();

    session.status = "revoked";
    session.logoutAt = new Date();
    session.refreshTokenHash = `revoked_${Date.now()}`;
    await session.save();

    if (isCurrent) {
      if (req.token) {
        blacklistToken(req.token);
      }

      if (req.user) {
        req.user.refreshTokenHash = null;
        await req.user.save();
      }

      res.clearCookie("pm_refresh_token", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
        path: "/",
      });
      res.clearCookie("pm_csrf_token", {
        secure: process.env.NODE_ENV === "production",
        sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
        path: "/",
      });
    }

    res.status(200).json({
      message: "Session signed out successfully",
      isCurrentRevoked: isCurrent,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * Revoke/Sign out all other active sessions.
 * DELETE /api/profile/sessions/others
 */
export const revokeOtherSessions = async (req, res) => {
  try {
    const result = await Session.updateMany(
      {
        userId: req.user._id,
        _id: { $ne: req.sessionId },
        status: "active",
      },
      {
        status: "revoked",
        logoutAt: new Date(),
        refreshTokenHash: `revoked_${Date.now()}`,
      },
    );

    res.status(200).json({
      message: "All other sessions signed out successfully",
      revokedCount: result.modifiedCount,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * Sign out current session (log out).
 * DELETE /api/profile/sessions/current
 */
export const revokeCurrentSession = async (req, res) => {
  try {
    if (req.sessionId) {
      await Session.findByIdAndUpdate(req.sessionId, {
        status: "logged_out",
        logoutAt: new Date(),
        refreshTokenHash: `logged_out_${Date.now()}`,
      });
    }

    if (req.token) {
      blacklistToken(req.token);
    }

    if (req.user) {
      req.user.refreshTokenHash = null;
      await req.user.save();
    }

    res.clearCookie("pm_refresh_token", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      path: "/",
    });
    res.clearCookie("pm_csrf_token", {
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      path: "/",
    });

    res
      .status(200)
      .json({ message: "Current session signed out successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
