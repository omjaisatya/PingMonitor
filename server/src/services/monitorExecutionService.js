import axios from "axios";
import http from "http";
import https from "https";

const httpAgent = new http.Agent({ keepAlive: true });
const httpsAgent = new https.Agent({ keepAlive: true });

export const runHttpCheck = async (url, timeout = 1000) => {
  const start = Date.now();
  let status = "down";
  let statusCode = null;
  let responseTime = null;
  let errorMessage = "";

  try {
    const response = await axios.get(url, {
      timeout,
      httpAgent,
      httpsAgent,
      validateStatus: () => true,
    });
    responseTime = Date.now() - start;
    statusCode = response.status;
    status = response.status < 400 ? "up" : "down";
  } catch (error) {
    responseTime = Date.now() - start;
    statusCode = error.response ? error.response.status : null;
    errorMessage = error.code || error.message;
  }

  return {
    status,
    statusCode,
    responseTime,
    error: errorMessage,
    checkedAt: new Date(),
  };
};
