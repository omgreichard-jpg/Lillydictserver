const crypto = require("crypto");

function createPlayerToken() {
  return crypto.randomBytes(32).toString("hex");
}

function hashToken(value) {
  return crypto.createHash("sha256").update(String(value || "")).digest("hex");
}

module.exports = {
  createPlayerToken,
  hashToken,
};
