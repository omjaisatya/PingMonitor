import vm from "vm";
import fs from "fs";
import path from "path";
import assert from "assert";
import mongoose from "mongoose";
import { chromium } from "playwright";

const ensureDirectoriesExist = async () => {
  const screenshotsDir = path.join(process.cwd(), "uploads", "screenshots");
  const videosDir = path.join(process.cwd(), "uploads", "videos");
  await fs.promises.mkdir(screenshotsDir, { recursive: true });
  await fs.promises.mkdir(videosDir, { recursive: true });
};

const getExpectWrapper = (actual) => {
  return {
    toBe: (expected) => {
      try {
        assert.strictEqual(actual, expected);
      } catch (err) {
        throw new Error(`expect(${actual}).toBe(${expected}) failed`);
      }
    },
    toContain: (expected) => {
      if (typeof actual === "string" && actual.includes(expected)) return;
      if (Array.isArray(actual) && actual.includes(expected)) return;
      throw new Error(
        `expect(${JSON.stringify(actual)}).toContain(${JSON.stringify(expected)}) failed`,
      );
    },
    toBeGreaterThan: (expected) => {
      if (actual > expected) return;
      throw new Error(`expect(${actual}).toBeGreaterThan(${expected}) failed`);
    },
    toBeLessThan: (expected) => {
      if (actual < expected) return;
      throw new Error(`expect(${actual}).toBeLessThan(${expected}) failed`);
    },
    toBeTruthy: () => {
      if (actual) return;
      throw new Error(`expect(${JSON.stringify(actual)}).toBeTruthy() failed`);
    },
    toBeFalsy: () => {
      if (!actual) return;
      throw new Error(`expect(${JSON.stringify(actual)}).toBeFalsy() failed`);
    },
  };
};

/**
 * Runs a browser synthetic monitoring script using Playwright enwrapped in a VM sandbox.
 * @param {string} scriptCode The user-provided script code
 * @param {number} timeoutMs Maximum duration of execution
 * @returns {Promise<object>} Result of the run: status, logs, screenshot/video URLs, timings.
 */
export const runSyntheticCheck = async (scriptCode, timeoutMs = 30000) => {
  await ensureDirectoriesExist();

  const runId = new mongoose.Types.ObjectId();
  const startTime = new Date();

  const consoleLogs = [];
  const failedRequests = [];
  let status = "success";
  let errorMsg = "";
  let screenshotUrl = "";
  let videoUrl = "";
  let metrics = { loadTime: 0, domReady: 0, dns: 0, tcp: 0, ttfb: 0 };

  const browser = await chromium.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  const videoDir = path.join(process.cwd(), "uploads", "videos");
  const context = await browser.newContext({
    recordVideo: {
      dir: videoDir,
      size: { width: 1280, height: 720 },
    },
    viewport: { width: 1280, height: 720 },
  });

  const page = await context.newPage();

  page.on("console", (msg) => {
    let type = "log";
    if (msg.type() === "error") type = "error";
    else if (msg.type() === "warning") type = "warning";
    else if (msg.type() === "info") type = "info";

    consoleLogs.push({
      type,
      text: msg.text(),
      timestamp: new Date(),
    });
  });

  page.on("pageerror", (err) => {
    consoleLogs.push({
      type: "error",
      text: `Page Unhandled Error: ${err.message}`,
      timestamp: new Date(),
    });
  });

  page.on("requestfailed", (req) => {
    failedRequests.push({
      url: req.url(),
      method: req.method(),
      errorText: req.failure()?.errorText || "Request failed",
    });
  });

  page.on("response", (res) => {
    if (res.status() >= 400) {
      failedRequests.push({
        url: res.url(),
        method: res.request().method(),
        errorText: `HTTP ${res.status()} ${res.statusText()}`,
      });
    }
  });

  const sandbox = {
    page,
    context,
    browser,
    expect: getExpectWrapper,
    console: {
      log: (...args) =>
        consoleLogs.push({
          type: "log",
          text: args
            .map((a) => (typeof a === "object" ? JSON.stringify(a) : a))
            .join(" "),
          timestamp: new Date(),
        }),
      error: (...args) =>
        consoleLogs.push({
          type: "error",
          text: args
            .map((a) => (typeof a === "object" ? JSON.stringify(a) : a))
            .join(" "),
          timestamp: new Date(),
        }),
      warn: (...args) =>
        consoleLogs.push({
          type: "warning",
          text: args
            .map((a) => (typeof a === "object" ? JSON.stringify(a) : a))
            .join(" "),
          timestamp: new Date(),
        }),
      info: (...args) =>
        consoleLogs.push({
          type: "info",
          text: args
            .map((a) => (typeof a === "object" ? JSON.stringify(a) : a))
            .join(" "),
          timestamp: new Date(),
        }),
    },
    setTimeout,
    clearTimeout,
    setInterval,
    clearInterval,
  };

  const vmContext = vm.createContext(sandbox);

  const wrappedScript = `
    (async () => {
      try {
        ${scriptCode}
      } catch (err) {
        throw err;
      }
    })()
  `;

  let tempVideoPath = null;
  const scriptObj = new vm.Script(wrappedScript, {
    filename: "synthetic-script.js",
  });

  try {
    await scriptObj.runInContext(vmContext, { timeout: timeoutMs });

    try {
      const perfMetrics = await page.evaluate(() => {
        const [nav] = performance.getEntriesByType("navigation");
        if (!nav) return null;
        return {
          loadTime: Math.round(nav.loadEventEnd - nav.startTime) || 0,
          domReady:
            Math.round(nav.domContentLoadedEventEnd - nav.startTime) || 0,
          dns: Math.round(nav.domainLookupEnd - nav.domainLookupStart) || 0,
          tcp: Math.round(nav.connectEnd - nav.connectStart) || 0,
          ttfb: Math.round(nav.responseStart - nav.requestStart) || 0,
        };
      });
      if (perfMetrics) {
        metrics = perfMetrics;
      }
    } catch (metricsError) {
      console.warn(
        "Could not capture web navigation metrics:",
        metricsError.message,
      );
    }
  } catch (err) {
    status = "failed";
    errorMsg = err.message || "Script execution failed";
    consoleLogs.push({
      type: "error",
      text: `Execution Error: ${errorMsg}`,
      timestamp: new Date(),
    });

    try {
      const screenshotName = `${runId}.png`;
      const screenshotPath = path.join(
        process.cwd(),
        "uploads",
        "screenshots",
        screenshotName,
      );
      await page.screenshot({ path: screenshotPath, fullPage: true });
      screenshotUrl = `/uploads/screenshots/${screenshotName}`;
    } catch (screenshotError) {
      console.error("Failed to capture screenshot:", screenshotError.message);
    }
  }

  const videoObj = page.video();
  if (videoObj) {
    try {
      tempVideoPath = await videoObj.path();
    } catch (videoPathError) {
      console.warn(
        "Could not read playwright video temp path:",
        videoPathError.message,
      );
    }
  }

  try {
    await context.close();
    await browser.close();
  } catch (closeError) {
    console.error("Error closing browser resources:", closeError.message);
  }

  if (tempVideoPath && fs.existsSync(tempVideoPath)) {
    const videoName = `${runId}.webm`;
    const finalVideoPath = path.join(
      process.cwd(),
      "uploads",
      "videos",
      videoName,
    );
    try {
      await fs.promises.rename(tempVideoPath, finalVideoPath);
      videoUrl = `/uploads/videos/${videoName}`;
    } catch (renameError) {
      try {
        await fs.promises.copyFile(tempVideoPath, finalVideoPath);
        await fs.promises.unlink(tempVideoPath);
        videoUrl = `/uploads/videos/${videoName}`;
      } catch (copyError) {
        console.error(
          "Failed to save and rename recording video:",
          copyError.message,
        );
      }
    }
  }

  const endTime = new Date();
  const duration = endTime.getTime() - startTime.getTime();

  return {
    runId,
    status,
    error: errorMsg,
    startTime,
    endTime,
    duration,
    metrics,
    consoleLogs,
    failedRequests,
    screenshotUrl,
    videoUrl,
  };
};
