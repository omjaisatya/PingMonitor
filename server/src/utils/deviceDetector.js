import axios from "axios";

/**
 * Parses user agent string to extract device, browser, and operating system.
 * @param {string} userAgentString
 * @returns {object} { device, browser, operatingSystem }
 */
export const parseUserAgent = (userAgentString) => {
  if (!userAgentString) {
    return {
      device: "Unknown",
      browser: "Unknown",
      operatingSystem: "Unknown",
    };
  }

  const ua = userAgentString.toLowerCase();

  let operatingSystem = "Unknown";
  if (ua.includes("windows")) {
    operatingSystem = "Windows";
  } else if (
    ua.includes("macintosh") ||
    ua.includes("mac os x") ||
    ua.includes("mac os")
  ) {
    operatingSystem = "macOS";
  } else if (ua.includes("android")) {
    operatingSystem = "Android";
  } else if (
    ua.includes("iphone") ||
    ua.includes("ipad") ||
    ua.includes("ipod")
  ) {
    operatingSystem = "iOS";
  } else if (ua.includes("linux")) {
    operatingSystem = "Linux";
  }

  let device = "Unknown";
  if (ua.includes("iphone")) {
    device = "iPhone";
  } else if (ua.includes("ipad")) {
    device = "iPad";
  } else if (ua.includes("android")) {
    device = ua.includes("mobile") ? "Android" : "Android Tablet";
  } else if (ua.includes("windows")) {
    device = "Windows";
  } else if (
    ua.includes("macintosh") ||
    ua.includes("mac os x") ||
    ua.includes("mac os")
  ) {
    device = "macOS";
  } else if (ua.includes("linux")) {
    device = "Linux";
  }

  let browser = "Unknown";
  if (ua.includes("edg/")) {
    browser = "Edge";
  } else if (ua.includes("chrome") || ua.includes("crios")) {
    browser = "Chrome";
  } else if (ua.includes("firefox") || ua.includes("fxios")) {
    browser = "Firefox";
  } else if (
    ua.includes("safari") &&
    !ua.includes("chrome") &&
    !ua.includes("android")
  ) {
    browser = "Safari";
  }

  return { device, browser, operatingSystem };
};

/**
 * Resolves approximate city and country for a given IP address.
 * @param {string} ip
 * @returns {Promise<string>} e.g., "Paris, France"
 */
export const getIpLocation = async (ip) => {
  if (
    !ip ||
    ip === "127.0.0.1" ||
    ip === "::1" ||
    ip.startsWith("::ffff:127.0.0.1") ||
    ip.startsWith("192.168.") ||
    ip.startsWith("10.") ||
    ip.startsWith("172.16.") ||
    ip.startsWith("::ffff:172.") ||
    ip.startsWith("::ffff:192.168.") ||
    ip.startsWith("::ffff:10.")
  ) {
    return "Localhost / Private Network";
  }

  try {
    const response = await axios.get(`http://ip-api.com/json/${ip}`, {
      timeout: 2000,
    });
    if (response.data && response.data.status === "success") {
      const { city, country } = response.data;
      if (city && country) {
        return `${city}, ${country}`;
      } else if (country) {
        return country;
      }
    }
  } catch (error) {
    console.error("IP Geolocation lookup failed:", error.message);
  }
  return "Unknown Location";
};
