import crypto from "crypto";
import mongoose from "mongoose";
import User from "../models/User.js";
import { verifyAccessToken } from "../../utils/tokenCofig.js";
import { deleteCache } from "./cacheService.js";

const clients = new Map();

const encodeFrame = (payload) => {
  const data = Buffer.from(payload);
  const length = data.length;

  if (length < 126) {
    return Buffer.concat([Buffer.from([0x81, length]), data]);
  }

  if (length < 65536) {
    const header = Buffer.alloc(4);
    header[0] = 0x81;
    header[1] = 126;
    header.writeUInt16BE(length, 2);
    return Buffer.concat([header, data]);
  }

  const header = Buffer.alloc(10);
  header[0] = 0x81;
  header[1] = 127;
  header.writeBigUInt64BE(BigInt(length), 2);
  return Buffer.concat([header, data]);
};

const addClient = (userIdKey, socket) => {
  const key = userIdKey.toString();
  if (!clients.has(key)) clients.set(key, new Set());
  clients.get(key).add(socket);

  socket.on("close", () => clients.get(key)?.delete(socket));
  socket.on("error", () => clients.get(key)?.delete(socket));
  socket.on("data", () => {
    // The dashboard only needs server-to-client incident events.
  });
};

export const emitIncidentEvent = (userId, eventName, payload) => {
  if (!userId) return;

  const userIdStr = userId.toString();

  if (
    eventName.startsWith("monitor:") ||
    eventName.startsWith("incident:") ||
    eventName.startsWith("check:")
  ) {
    deleteCache(`status_page:${userIdStr}`).catch((err) => {
      console.error("[Realtime Service] Failed to invalidate status page cache:", err.message);
    });
  }

  const frame = encodeFrame(JSON.stringify({ event: eventName, payload }));

  // Send to owner's dashboard room
  const dashboardSockets = clients.get(userIdStr);
  if (dashboardSockets) {
    dashboardSockets.forEach((socket) => {
      if (!socket.destroyed) socket.write(frame);
    });
  }

  const publicRoomKey = `status_page_${userIdStr}`;
  const publicSockets = clients.get(publicRoomKey);
  if (publicSockets) {
    publicSockets.forEach((socket) => {
      if (!socket.destroyed) socket.write(frame);
    });
  }
};

export const handleRealtimeUpgrade = async (request, socket) => {
  try {
    const { pathname, searchParams } = new URL(
      request.url,
      `http://${request.headers.host}`,
    );
    if (!pathname.startsWith("/ws")) {
      socket.destroy();
      return;
    }

    const token = searchParams.get("token");
    const statusPageSlug = searchParams.get("statusPageSlug");
    const key = request.headers["sec-websocket-key"];

    if (!key || (!token && !statusPageSlug)) {
      socket.destroy();
      return;
    }

    let roomKey = null;

    if (token) {
      const decoded = verifyAccessToken(token);
      const user = await User.findById(decoded.id).select("_id isDeactivated");
      if (!user || user.isDeactivated) {
        socket.destroy();
        return;
      }
      roomKey = user._id.toString();
    } else {
      let user = null;
      if (mongoose.Types.ObjectId.isValid(statusPageSlug)) {
        user = await User.findById(statusPageSlug).select("_id isDeactivated statusPageEnabled");
      }
      if (!user) {
        user = await User.findOne({ statusPageSlug }).select("_id isDeactivated statusPageEnabled");
      }
      if (!user) {
        user = await User.findOne({ statusPageCustomDomain: statusPageSlug }).select("_id isDeactivated statusPageEnabled");
      }

      if (!user || user.isDeactivated || !user.statusPageEnabled) {
        socket.destroy();
        return;
      }
      roomKey = `status_page_${user._id.toString()}`;
    }

    const accept = crypto
      .createHash("sha1")
      .update(`${key}258EAFA5-E914-47DA-95CA-C5AB0DC85B11`)
      .digest("base64");

    socket.write(
      [
        "HTTP/1.1 101 Switching Protocols",
        "Upgrade: websocket",
        "Connection: Upgrade",
        `Sec-WebSocket-Accept: ${accept}`,
        "",
        "",
      ].join("\r\n"),
    );

    addClient(roomKey, socket);
  } catch (err) {
    socket.destroy();
  }
};
