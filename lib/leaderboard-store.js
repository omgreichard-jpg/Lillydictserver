const { createPlayerToken, hashToken } = require("./crypto");
const { supabaseRequest } = require("./supabase");
const { getRuntimeConfig } = require("./config");
const { normalizeHandle, validateRegistrationPayload, validateScorePayload } = require("./validation");

function mapLeaderboardRow(row) {
  if (!row) {
    return null;
  }

  return {
    rank: row.rank === undefined || row.rank === null ? null : Number(row.rank),
    playerId: row.player_id || row.id,
    name: row.name,
    handle: row.handle || null,
    points: Number(row.points || 0),
    level: Number(row.level || 0),
    streak: Number(row.streak || 0),
    updatedAt: row.updated_at || null,
  };
}

async function getLeaderboardSelf(playerId) {
  if (!playerId) {
    return null;
  }

  const rows = await supabaseRequest("leaderboard_public", {
    method: "GET",
    query: {
      select: "rank,player_id,name,handle,points,level,streak,updated_at",
      player_id: `eq.${playerId}`,
      limit: 1,
    },
  });

  return mapLeaderboardRow(Array.isArray(rows) ? rows[0] : rows);
}

async function listLeaderboard(options = {}) {
  const config = getRuntimeConfig();
  const requestedLimit = Number(options.limit);
  const limit = Number.isFinite(requestedLimit)
    ? Math.max(1, Math.min(config.leaderboardMaxLimit, Math.floor(requestedLimit)))
    : 20;

  const rows = await supabaseRequest("leaderboard_public", {
    method: "GET",
    query: {
      select: "rank,player_id,name,handle,points,level,streak,updated_at",
      order: "rank.asc",
      limit,
    },
  });

  return {
    entries: Array.isArray(rows) ? rows.map(mapLeaderboardRow) : [],
    self: await getLeaderboardSelf(options.playerId),
  };
}

async function registerPlayer(payload) {
  const validation = validateRegistrationPayload(payload || {});
  if (validation.error) {
    return {
      error: validation.error,
      statusCode: 400,
    };
  }

  const playerToken = createPlayerToken();
  const uploadTokenHash = hashToken(playerToken);
  const body = {
    name: validation.value.name,
    handle: validation.value.handle ? normalizeHandle(validation.value.handle) : null,
    points: 0,
    level: 0,
    streak: 0,
    upload_token_hash: uploadTokenHash,
  };

  const rows = await supabaseRequest("leaderboard_players", {
    method: "POST",
    body,
    prefer: "return=representation",
  });

  const row = Array.isArray(rows) ? rows[0] : rows;
  return {
    playerId: row.id,
    playerToken,
    player: mapLeaderboardRow({
      ...row,
      player_id: row.id,
      rank: null,
    }),
  };
}

async function submitScore(payload) {
  const validation = validateScorePayload(payload || {});
  if (validation.error) {
    return {
      error: validation.error,
      statusCode: 400,
    };
  }

  const { playerId, playerToken, points, level, streak } = validation.value;
  const rows = await supabaseRequest("leaderboard_players", {
    method: "GET",
    query: {
      select: "id,name,handle,points,level,streak,updated_at,upload_token_hash",
      id: `eq.${playerId}`,
      limit: 1,
    },
  });

  const player = Array.isArray(rows) ? rows[0] : rows;
  if (!player) {
    return {
      error: "Player not found.",
      statusCode: 404,
    };
  }

  if (hashToken(playerToken) !== player.upload_token_hash) {
    return {
      error: "Invalid player token.",
      statusCode: 401,
    };
  }

  const updatedRows = await supabaseRequest("leaderboard_players", {
    method: "PATCH",
    query: {
      id: `eq.${playerId}`,
      select: "id,name,handle,points,level,streak,updated_at",
    },
    body: {
      points,
      level,
      streak,
    },
    prefer: "return=representation",
  });

  const updated = Array.isArray(updatedRows) ? updatedRows[0] : updatedRows;
  const ranked = await getLeaderboardSelf(playerId);

  return {
    player: mapLeaderboardRow({
      ...updated,
      player_id: updated.id,
      rank: ranked ? ranked.rank : null,
    }),
  };
}

module.exports = {
  listLeaderboard,
  normalizeHandle,
  registerPlayer,
  submitScore,
};
