const { handleOptions, sendJson, sendError } = require("../lib/http");
const { getRuntimeConfig, isConfigured } = require("../lib/config");

module.exports = function handler(req, res) {
  if (handleOptions(req, res)) {
    return;
  }

  if (req.method !== "GET") {
    sendError(req, res, 405, "Method not allowed.");
    return;
  }

  const config = getRuntimeConfig();
  sendJson(req, res, 200, {
    ok: true,
    service: "lillydict-server",
    title: config.leaderboardTitle,
    storage: isConfigured() ? "supabase" : "not-configured",
    configured: isConfigured(),
    freeStack: "vercel-hobby + supabase-free",
  });
};
