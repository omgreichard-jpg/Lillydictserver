const { getRuntimeConfig } = require("../lib/config");
const { handleOptions, readJsonBody, sendError, sendJson } = require("../lib/http");
const { registerPlayer } = require("../lib/leaderboard-store");
const { checkRateLimit, getClientIp } = require("../lib/rate-limit");

module.exports = async function handler(req, res) {
  if (handleOptions(req, res)) {
    return;
  }

  if (req.method !== "POST") {
    sendError(req, res, 405, "Method not allowed.");
    return;
  }

  const config = getRuntimeConfig();
  const rateLimit = checkRateLimit(
    `register:${getClientIp(req)}`,
    config.registerRateLimitPerMinute,
    60 * 1000
  );

  if (!rateLimit.allowed) {
    sendError(req, res, 429, "Too many registration attempts.", {
      retryAfterMs: rateLimit.retryAfterMs,
    });
    return;
  }

  let body;
  try {
    body = await readJsonBody(req);
  } catch (_error) {
    sendError(req, res, 400, "Invalid JSON body.");
    return;
  }

  try {
    const result = await registerPlayer(body || {});
    if (result.error) {
      sendError(req, res, result.statusCode || 400, result.error);
      return;
    }

    sendJson(req, res, 200, {
      ok: true,
      message: "Player authenticated.",
      playerId: result.playerId,
      playerToken: result.playerToken,
      player: result.player,
      warning:
        "Store playerId and playerToken in the extension. Use the same handle and password later to recover the same account.",
    });
  } catch (error) {
    sendError(
      req,
      res,
      error.statusCode || 500,
      error.message || "Registration failed."
    );
  }
};
