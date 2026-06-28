import { chromium } from "playwright";

const test = async () => {
  try {
    console.log("Launching browser...");
    const launchOptions = {
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
    };
    if (process.env.PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD === "1") {
      launchOptions.executablePath = "/usr/bin/chromium-browser";
    }
    const browser = await chromium.launch(launchOptions);
    console.log("Browser launched. Creating page...");
    const page = await browser.newPage();
    await page.setContent("<h1>Hello World</h1>");
    console.log("Generating PDF...");
    const pdfBuffer = await page.pdf({ format: "A4" });
    console.log("PDF generated, size:", pdfBuffer.length);
    await browser.close();
    console.log("Success!");
    process.exit(0);
  } catch (err) {
    console.error("Playwright PDF test failed:", err);
    process.exit(1);
  }
};

test();
