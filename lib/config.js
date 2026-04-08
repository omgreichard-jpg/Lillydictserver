function parsePositiveInteger(value, fallback) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }

  return Math.floor(parsed);
}

function getAllowedOrigins() {
  const raw = String(process.env.LEADERBOARD_ALLOWED_ORIGINS || "*").trim();
  if (!raw || raw === "*") {
    return ["*"];
  }

  return raw
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function getRuntimeConfig() {
  return {
    leaderboardTitle: process.env.LEADERBOARD_TITLE || "Lillydict Leaderboard",
    supabaseUrl: String(process.env.SUPABASE_URL || "").trim().replace(/\/+$/, ""),
    supabaseServiceRoleKey: String(process.env.SUPABASE_SERVICE_ROLE_KEY || "").trim(),
    allowedOrigins: getAllowedOrigins(),
    registerRateLimitPerMinute: parsePositiveInteger(process.env.REGISTER_RATE_LIMIT_PER_MINUTE, 8),
    scoreRateLimitPerMinute: parsePositiveInteger(process.env.SCORE_RATE_LIMIT_PER_MINUTE, 30),
    leaderboardMaxLimit: parsePositiveInteger(process.env.LEADERBOARD_MAX_LIMIT, 50),
  };
}

function isConfigured() {
  const config = getRuntimeConfig();
  return !!config.supabaseUrl && !!config.supabaseServiceRoleKey;
}

function assertConfigured() {
  const config = getRuntimeConfig();
  if (!config.supabaseUrl || !config.supabaseServiceRoleKey) {
    const error = new Error(
      "Missing Supabase configuration. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY."
    );
    error.statusCode = 500;
    throw error;
  }

  return config;
}

module.exports = {
  assertConfigured,
  getRuntimeConfig,
  isConfigured,
};
