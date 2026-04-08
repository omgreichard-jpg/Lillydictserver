function normalizeHandle(value) {
  return String(value || "")
    .trim()
    .replace(/^@+/, "")
    .toLowerCase();
}

function sanitizeName(value) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .trim();
}

function sanitizeInteger(value, max) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return null;
  }

  const whole = Math.floor(parsed);
  if (whole > max) {
    return null;
  }

  return whole;
}

function validateRegistrationPayload(payload) {
  const name = sanitizeName(payload && payload.name);
  const handle = normalizeHandle(payload && payload.handle);

  if (!name || name.length < 2 || name.length > 40) {
    return {
      error: "Name must be between 2 and 40 characters.",
    };
  }

  if (handle && !/^[a-z0-9_]{1,15}$/.test(handle)) {
    return {
      error: "Handle must be a valid X/Twitter handle.",
    };
  }

  return {
    value: {
      name,
      handle: handle || null,
    },
  };
}

function validateScorePayload(payload) {
  const playerId = String(payload && payload.playerId || "").trim();
  const playerToken = String(payload && payload.playerToken || "").trim();
  const points = sanitizeInteger(payload && payload.points, 100000000);
  const level = sanitizeInteger(payload && payload.level, 1000000);
  const streak = sanitizeInteger(payload && payload.streak, 1000000);

  if (!/^[0-9a-fA-F-]{36}$/.test(playerId)) {
    return {
      error: "A valid playerId is required.",
    };
  }

  if (!/^[0-9a-f]{64}$/.test(playerToken)) {
    return {
      error: "A valid playerToken is required.",
    };
  }

  if (points === null || level === null || streak === null) {
    return {
      error: "Points, level, and streak must be non-negative integers within safe limits.",
    };
  }

  return {
    value: {
      playerId,
      playerToken,
      points,
      level,
      streak,
    },
  };
}

module.exports = {
  normalizeHandle,
  sanitizeName,
  validateRegistrationPayload,
  validateScorePayload,
};
