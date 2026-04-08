const { getRuntimeConfig } = require("../lib/config");
const { handleOptions, readJsonBody, sendError, sendJson } = require("../lib/http");
const { listLeaderboard, submitScore } = require("../lib/leaderboard-store");
const { checkRateLimit, getClientIp } = require("../lib/rate-limit");

module.exports = async function handler(req, res) {
  if (handleOptions(req, res)) {
    return;
  }

  if (req.method === "GET") {
    try {
      const data = await listLeaderboard({
        limit: req.query && req.query.limit,
        playerId: String(req.query && req.query.playerId || "").trim() || null,
      });

      sendJson(req, res, 200, {
        ok: true,
        title: getRuntimeConfig().leaderboardTitle,
        entries: data.entries,
        self: data.self,
        storage: "supabase",
      });
      return;
    } catch (error) {
      sendError(
        req,
        res,
        error.statusCode || 500,
        error.message || "Failed to load leaderboard."
      );
      return;
    }
  }

  if (req.method === "POST") {
    const config = getRuntimeConfig();
    const rateLimit = checkRateLimit(
      `score:${getClientIp(req)}`,
      config.scoreRateLimitPerMinute,
      60 * 1000
    );

    if (!rateLimit.allowed) {
      sendError(req, res, 429, "Too many score submissions.", {
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
      const result = await submitScore(body || {});
      if (result.error) {
        sendError(req, res, result.statusCode || 400, result.error);
        return;
      }

      sendJson(req, res, 200, {
        ok: true,
        message: "Score updated.",
        player: result.player,
        storage: "supabase",
      });
      return;
    } catch (error) {
      sendError(
        req,
        res,
        error.statusCode || 500,
        error.message || "Failed to update score."
      );
      return;
    }
  }

  sendError(req, res, 405, "Method not allowed.");
};
