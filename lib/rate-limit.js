const globalStore = globalThis.__lillydictRateLimitStore || new Map();
globalThis.__lillydictRateLimitStore = globalStore;

function getClientIp(req) {
  const forwarded = String(req.headers["x-forwarded-for"] || "").trim();
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }

  return String(
    req.headers["x-real-ip"] ||
    req.socket?.remoteAddress ||
    "unknown"
  ).trim();
}

function checkRateLimit(key, limit, windowMs) {
  const now = Date.now();
  const current = globalStore.get(key);

  if (!current || current.expiresAt <= now) {
    const fresh = {
      count: 1,
      expiresAt: now + windowMs,
    };
    globalStore.set(key, fresh);
    return {
      allowed: true,
      remaining: Math.max(0, limit - fresh.count),
      retryAfterMs: windowMs,
    };
  }

  if (current.count >= limit) {
    return {
      allowed: false,
      remaining: 0,
      retryAfterMs: Math.max(1000, current.expiresAt - now),
    };
  }

  current.count += 1;
  globalStore.set(key, current);
  return {
    allowed: true,
    remaining: Math.max(0, limit - current.count),
    retryAfterMs: Math.max(1000, current.expiresAt - now),
  };
}

module.exports = {
  checkRateLimit,
  getClientIp,
};
