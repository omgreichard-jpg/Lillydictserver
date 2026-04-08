const {
  createPasswordHash,
  createPlayerToken,
  hashToken,
  verifyPasswordHash,
} = require("./crypto");
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

function sortPlayerCandidates(rows) {
  return [...rows].sort((a, b) => {
    const pointDiff = Number(b.points || 0) - Number(a.points || 0);
    if (pointDiff !== 0) {
      return pointDiff;
    }

    const levelDiff = Number(b.level || 0) - Number(a.level || 0);
    if (levelDiff !== 0) {
      return levelDiff;
    }

    const streakDiff = Number(b.streak || 0) - Number(a.streak || 0);
    if (streakDiff !== 0) {
      return streakDiff;
    }

    return String(b.updated_at || "").localeCompare(String(a.updated_at || ""));
  });
}

async function issuePlayerSession(player, extraFields = {}) {
  const playerToken = createPlayerToken();
  const updatedRows = await supabaseRequest("leaderboard_players", {
    method: "PATCH",
    query: {
      id: `eq.${player.id}`,
      select: "id,name,handle,points,level,streak,updated_at,password_hash",
    },
    body: {
      upload_token_hash: hashToken(playerToken),
      ...extraFields,
    },
    prefer: "return=representation",
  });

  const updated = Array.isArray(updatedRows) ? updatedRows[0] : updatedRows;
  const ranked = await getLeaderboardSelf(updated.id);

  return {
    playerId: updated.id,
    playerToken,
    player: mapLeaderboardRow({
      ...updated,
      player_id: updated.id,
      rank: ranked ? ranked.rank : null,
    }),
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

  const normalizedHandle = normalizeHandle(validation.value.handle);
  const existingRows = await supabaseRequest("leaderboard_players", {
    method: "GET",
    query: {
      select: "id,name,handle,points,level,streak,updated_at,upload_token_hash,password_hash",
      handle: `eq.${normalizedHandle}`,
      limit: 20,
    },
  });

  const players = Array.isArray(existingRows)
    ? sortPlayerCandidates(existingRows.filter(Boolean))
    : existingRows
      ? [existingRows]
      : [];

  const matchingPlayer = players.find((player) => (
    player.password_hash &&
    verifyPasswordHash(validation.value.password, player.password_hash)
  ));

  if (matchingPlayer) {
    return issuePlayerSession(matchingPlayer, {
      name: normalizedHandle,
      handle: normalizedHandle,
    });
  }

  const claimablePlayer = players.find((player) => !player.password_hash);
  if (claimablePlayer) {
    return issuePlayerSession(claimablePlayer, {
      name: normalizedHandle,
      handle: normalizedHandle,
      password_hash: createPasswordHash(validation.value.password),
    });
  }

  if (players.length) {
    return {
      error: "Wrong password.",
      statusCode: 401,
    };
  }

  const body = {
    name: normalizedHandle,
    handle: normalizedHandle,
    points: 0,
    level: 0,
    streak: 0,
    upload_token_hash: hashToken(createPlayerToken()),
    password_hash: createPasswordHash(validation.value.password),
  };

  const rows = await supabaseRequest("leaderboard_players", {
    method: "POST",
    body,
    prefer: "return=representation",
  });

  const row = Array.isArray(rows) ? rows[0] : rows;
  return issuePlayerSession(row);
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
