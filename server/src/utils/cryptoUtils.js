import crypto from "crypto";
import { JWT_SECRET } from "../config/env.config.js";

const getEncryptionKey = () => {
  return crypto
    .createHash("sha256")
    .update(JWT_SECRET || "default_secret_fallback_key")
    .digest();
};

/**
 * Encrypts cleartext using AES-256-GCM.
 * Returns a hex-encoded string formatted as iv:ciphertext:authTag.
 * @param {string} text Cleartext to encrypt
 * @returns {string} Hashed ciphertext package
 */
export const encrypt = (text) => {
  if (!text) return "";
  try {
    const iv = crypto.randomBytes(12);
    const key = getEncryptionKey();
    const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);

    let encrypted = cipher.update(text, "utf8", "hex");
    encrypted += cipher.final("hex");

    const authTag = cipher.getAuthTag().toString("hex");
    return `${iv.toString("hex")}:${encrypted}:${authTag}`;
  } catch (err) {
    console.error("Encryption failed:", err.message);
    throw new Error("Symmetric encryption operation failed");
  }
};

/**
 * Decrypts a formatted cipher string (iv:ciphertext:authTag) using AES-256-GCM.
 * If format is invalid or decryption fails, returns original string as fallback.
 * @param {string} encryptedText Hashed ciphertext package
 * @returns {string} Decrypted cleartext
 */
export const decrypt = (encryptedText) => {
  if (!encryptedText) return "";
  try {
    const parts = encryptedText.split(":");
    if (parts.length !== 3) {
      return encryptedText;
    }

    const iv = Buffer.from(parts[0], "hex");
    const encrypted = parts[1];
    const authTag = Buffer.from(parts[2], "hex");

    const key = getEncryptionKey();
    const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encrypted, "hex", "utf8");
    decrypted += decipher.final("utf8");
    return decrypted;
  } catch (err) {
    console.warn(
      "Decryption attempt failed or data is unencrypted:",
      err.message,
    );
    return encryptedText;
  }
};
