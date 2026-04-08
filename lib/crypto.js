const crypto = require("crypto");

function createPlayerToken() {
  return crypto.randomBytes(32).toString("hex");
}

function hashToken(value) {
  return crypto.createHash("sha256").update(String(value || "")).digest("hex");
}

function createPasswordHash(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(String(password || ""), salt, 32).toString("hex");
  return `scrypt$${salt}$${hash}`;
}

function verifyPasswordHash(password, storedHash) {
  const value = String(storedHash || "");
  const parts = value.split("$");
  if (parts.length !== 3 || parts[0] !== "scrypt") {
    return false;
  }

  const [, salt, expectedHash] = parts;
  const actualHash = crypto.scryptSync(String(password || ""), salt, 32).toString("hex");

  try {
    return crypto.timingSafeEqual(
      Buffer.from(actualHash, "hex"),
      Buffer.from(expectedHash, "hex")
    );
  } catch (_error) {
    return false;
  }
}

module.exports = {
  createPasswordHash,
  createPlayerToken,
  hashToken,
  verifyPasswordHash,
};
