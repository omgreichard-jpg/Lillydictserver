const { assertConfigured } = require("./config");

async function supabaseRequest(path, options = {}) {
  const config = assertConfigured();
  const url = new URL(`${config.supabaseUrl}/rest/v1/${path.replace(/^\/+/, "")}`);
  const query = options.query || {};

  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null || value === "") {
      continue;
    }

    url.searchParams.set(key, String(value));
  }

  const headers = {
    apikey: config.supabaseServiceRoleKey,
    Authorization: `Bearer ${config.supabaseServiceRoleKey}`,
    "Content-Type": "application/json",
    ...(options.headers || {}),
  };

  if (options.prefer) {
    headers.Prefer = options.prefer;
  }

  const response = await fetch(url, {
    method: options.method || "GET",
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });

  const text = await response.text();
  const data = text ? JSON.parse(text) : null;

  if (!response.ok) {
    const error = new Error(
      data && data.message
        ? data.message
        : `Supabase request failed with status ${response.status}.`
    );
    error.statusCode = response.status;
    error.details = data;
    throw error;
  }

  return data;
}

module.exports = {
  supabaseRequest,
};
