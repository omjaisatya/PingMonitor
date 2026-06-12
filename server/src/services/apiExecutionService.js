import axios from "axios";
import ApiMonitor from "../models/ApiMonitor.js";
import ApiCollection from "../models/ApiCollection.js";
import { decrypt } from "../utils/cryptoUtils.js";

const resolveVariables = (text, variables) => {
  if (!text || typeof text !== "string") return text;
  let resolved = text;

  for (let depth = 0; depth < 3; depth++) {
    let replaced = false;
    for (const v of variables) {
      const pattern = new RegExp(`\\{\\{${v.key}\\}\\}`, "g");
      if (pattern.test(resolved)) {
        resolved = resolved.replace(pattern, v.value || "");
        replaced = true;
      }
    }
    if (!replaced) break;
  }
  return resolved;
};

const getNestedPath = (obj, path) => {
  if (!path) return obj;
  const cleanPath = path.replace(/\[(\w+)\]/g, ".$1").replace(/^\./, "");
  const keys = cleanPath.split(".");
  let current = obj;
  for (const key of keys) {
    if (current === null || current === undefined) return undefined;
    current = current[key];
  }
  return current;
};

const compareValues = (actual, operator, target) => {
  const actualStr = String(actual);
  const targetStr = String(target);

  switch (operator) {
    case "equals":
      return actualStr === targetStr;
    case "contains":
      return actualStr.includes(targetStr);
    case "greaterThan":
      return Number(actual) > Number(target);
    case "lessThan":
      return Number(actual) < Number(target);
    case "notEquals":
      return actualStr !== targetStr;
    default:
      return false;
  }
};

const evaluateAssertions = (assertions, response) => {
  const results = [];
  let allPassed = true;

  for (const assertion of assertions) {
    let actualValue = "";
    let passed = false;

    try {
      switch (assertion.type) {
        case "statusCode":
          actualValue = String(response.status);
          passed = compareValues(
            actualValue,
            assertion.operator,
            assertion.target,
          );
          break;
        case "responseTime":
          actualValue = String(response.responseTime);
          passed = compareValues(
            Number(actualValue),
            assertion.operator,
            Number(assertion.target),
          );
          break;
        case "header":
          actualValue = String(
            response.headers[assertion.property.toLowerCase()] || "",
          );
          passed = compareValues(
            actualValue,
            assertion.operator,
            assertion.target,
          );
          break;
        case "regex":
          actualValue =
            typeof response.body === "string"
              ? response.body
              : JSON.stringify(response.body);
          passed = new RegExp(assertion.target).test(actualValue);
          break;
        case "jsonBody":
          try {
            const parsed =
              typeof response.body === "string"
                ? JSON.parse(response.body)
                : response.body;
            const val = getNestedPath(parsed, assertion.property);
            actualValue = val !== undefined ? String(val) : "undefined";
            passed = compareValues(
              actualValue,
              assertion.operator,
              assertion.target,
            );
          } catch (jsonErr) {
            actualValue = "Invalid JSON / Path not found";
            passed = false;
          }
          break;
        default:
          actualValue = "Unknown assertion type";
          passed = false;
      }
    } catch (err) {
      actualValue = `Evaluation Error: ${err.message}`;
      passed = false;
    }

    if (!passed) allPassed = false;
    results.push({
      assertion: {
        type: assertion.type,
        property: assertion.property,
        operator: assertion.operator,
        target: assertion.target,
      },
      passed,
      actualValue,
    });
  }

  return { allPassed, results };
};

/**
 * Runs an API monitoring request, decrypts secure variables, resolves placeholders,
 * triggers Axios fetch, measures timing, and checks assertions.
 * @param {string} monitorId MongoDB ID of the API monitor
 * @returns {Promise<object>} Run details package
 */
export const runApiCheck = async (monitorId) => {
  const startTime = new Date();

  const monitor = await ApiMonitor.findById(monitorId);
  if (!monitor) {
    throw new Error(`ApiMonitor with ID ${monitorId} not found`);
  }

  let variables = [];
  if (monitor.collectionId) {
    const collection = await ApiCollection.findById(monitor.collectionId);
    if (collection && collection.variables) {
      variables = collection.variables.map((v) => ({
        key: v.key,
        value: v.isSecure ? decrypt(v.value) : v.value,
      }));
    }
  }

  const resolvedUrl = resolveVariables(monitor.url, variables);
  const resolvedBody = resolveVariables(monitor.body || "", variables);

  const requestHeaders = {};
  monitor.headers.forEach((h) => {
    if (!h.key) return;
    const value = h.isSecure ? decrypt(h.value) : h.value;
    requestHeaders[h.key] = resolveVariables(value, variables);
  });

  let resolvedMethod = monitor.method;
  if (monitor.method === "GRAPHQL") {
    resolvedMethod = "POST";
    if (!requestHeaders["Content-Type"]) {
      requestHeaders["Content-Type"] = "application/json";
    }
  }

  const loggedRequest = {
    url: resolvedUrl,
    method: monitor.method,
    headers: requestHeaders,
    body: resolvedBody,
  };

  const reqStartTime = Date.now();
  let status = "success";
  let errorMsg = "";
  let loggedResponse = { status: null, headers: {}, body: "", responseTime: 0 };
  let assertionResults = [];

  try {
    const config = {
      method: resolvedMethod,
      url: resolvedUrl,
      headers: requestHeaders,
      data: resolvedBody
        ? typeof resolvedBody === "string" &&
          (resolvedBody.startsWith("{") || resolvedBody.startsWith("["))
          ? JSON.parse(resolvedBody)
          : resolvedBody
        : undefined,
      timeout: 15000,
      validateStatus: () => true,
    };

    const res = await axios(config);
    const responseTime = Date.now() - reqStartTime;

    const resBodyText =
      typeof res.data === "object"
        ? JSON.stringify(res.data)
        : String(res.data || "");

    loggedResponse = {
      status: res.status,
      headers: res.headers,
      body: resBodyText,
      responseTime,
    };

    const { allPassed, results } = evaluateAssertions(
      monitor.assertions,
      loggedResponse,
    );
    assertionResults = results;

    if (!allPassed) {
      status = "failed";
      errorMsg = "One or more assertions failed";
    }
  } catch (err) {
    status = "failed";
    errorMsg = err.message || "Network request failed";

    loggedResponse = {
      status: err.response?.status || null,
      headers: err.response?.headers || {},
      body: err.response?.data
        ? typeof err.response.data === "object"
          ? JSON.stringify(err.response.data)
          : String(err.response.data)
        : "",
      responseTime: Date.now() - reqStartTime,
    };

    assertionResults = monitor.assertions.map((a) => ({
      assertion: {
        type: a.type,
        property: a.property,
        operator: a.operator,
        target: a.target,
      },
      passed: false,
      actualValue: `Network error: ${errorMsg}`,
    }));
  }

  const endTime = new Date();
  const duration = endTime.getTime() - startTime.getTime();

  return {
    status,
    error: errorMsg,
    request: loggedRequest,
    response: loggedResponse,
    assertionResults,
    startTime,
    endTime,
    duration,
  };
};
