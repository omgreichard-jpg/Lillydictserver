const { getRuntimeConfig } = require("./config");

function getRequestOrigin(req) {
  return String(req.headers.origin || "").trim();
}

function getAllowedOrigin(req) {
  const config = getRuntimeConfig();
  const origin = getRequestOrigin(req);
  if (!origin) {
    return null;
  }

  if (config.allowedOrigins.includes("*")) {
    return "*";
  }

  return config.allowedOrigins.includes(origin) ? origin : null;
}

function applyCors(req, res) {
  const allowedOrigin = getAllowedOrigin(req);
  if (allowedOrigin) {
    res.setHeader("Access-Control-Allow-Origin", allowedOrigin);
  }
  res.setHeader("Vary", "Origin");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

function sendJson(req, res, statusCode, payload) {
  applyCors(req, res);
  res.statusCode = statusCode;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(payload));
}

function sendError(req, res, statusCode, error, extra = {}) {
  sendJson(req, res, statusCode, {
    ok: false,
    error,
    ...extra,
  });
}

function handleOptions(req, res) {
  if (req.method !== "OPTIONS") {
    return false;
  }

  applyCors(req, res);
  res.statusCode = 204;
  res.end();
  return true;
}

async function readJsonBody(req) {
  if (req.body && typeof req.body === "object") {
    return req.body;
  }

  const chunks = [];
  for await (const chunk of req) {
    chunks.push(chunk);
  }

  const raw = Buffer.concat(chunks).toString("utf8").trim();
  if (!raw) {
    return {};
  }

  return JSON.parse(raw);
}

module.exports = {
  getAllowedOrigin,
  handleOptions,
  readJsonBody,
  sendError,
  sendJson,
};
