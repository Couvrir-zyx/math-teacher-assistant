const CONFIG_KEY = "math-teacher-workbench.cloud.config.v1";
const SESSION_KEY = "math-teacher-workbench.cloud.session.v1";
const STATE_ID = "primary";
const DEFAULT_CONFIG = {
  url: "https://fcnqmibrgiilphpkwrfb.supabase.co",
  anonKey: "sb_publishable_5rXrycWPE4eX9TwwT9I8Zw_7b0RoX3u",
  email: ""
};

export const cloud = {
  getConfig() {
    return { ...DEFAULT_CONFIG, ...read(CONFIG_KEY, {}) };
  },

  saveConfig(config) {
    const value = {
      url: normalizeUrl(config.url),
      anonKey: String(config.anonKey || "").trim(),
      email: String(config.email || "").trim()
    };
    localStorage.setItem(CONFIG_KEY, JSON.stringify(value));
    return value;
  },

  getSession() {
    const session = read(SESSION_KEY, null);
    return session?.accessToken && session?.refreshToken ? session : null;
  },

  clearSession() {
    localStorage.removeItem(SESSION_KEY);
  },

  async signIn(config, email, password) {
    const result = await authRequest(config, "token?grant_type=password", { email, password });
    return saveSession(config, result);
  },

  async signUp(config, email, password) {
    return authRequest(config, "signup", { email, password });
  },

  async pull(config, session) {
    await ensureFreshSession(config, session);
    const url = `${normalizeUrl(config.url)}/rest/v1/workbench_state?id=eq.${STATE_ID}&select=payload,updated_at`;
    const response = await fetch(url, {
      headers: headers(config, session)
    });
    if (!response.ok) throw await apiError(response);
    const rows = await response.json();
    return rows?.[0]?.payload || null;
  },

  async push(config, session, payload) {
    await ensureFreshSession(config, session);
    const url = `${normalizeUrl(config.url)}/rest/v1/workbench_state?on_conflict=user_id`;
    const response = await fetch(url, {
      method: "POST",
      headers: {
        ...headers(config, session),
        "Content-Type": "application/json",
        "Prefer": "resolution=merge-duplicates,return=minimal"
      },
      body: JSON.stringify([{
        id: STATE_ID,
        user_id: session.userId,
        payload,
        updated_at: new Date().toISOString()
      }])
    });
    if (!response.ok) throw await apiError(response);
    return true;
  }
};

export function mergeData(a, b) {
  const left = normalizeData(a);
  const right = normalizeData(b);
  const lessons = mergeById(left.lessons, right.lessons);
  const summaries = mergeById(left.summaries, right.summaries);
  return { version: 1, students: [], lessons, summaries };
}

async function authRequest(config, action, body) {
  const url = `${normalizeUrl(config.url)}/auth/v1/${action}`;
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "apikey": config.anonKey,
      "Authorization": `Bearer ${config.anonKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  });
  if (!response.ok) throw await apiError(response);
  return response.json();
}

async function refreshSession(config, session) {
  const result = await authRequest(config, "token?grant_type=refresh_token", {
    refresh_token: session.refreshToken
  });
  return saveSession(config, result);
}

async function ensureFreshSession(config, session) {
  if (!session.expiresAt || session.expiresAt > Date.now() + 60000) return session;
  const refreshed = await refreshSession(config, session);
  Object.assign(session, refreshed);
  return session;
}

function saveSession(config, result) {
  const user = result.user || {};
  const session = {
    accessToken: result.access_token,
    refreshToken: result.refresh_token,
    expiresAt: Date.now() + Number(result.expires_in || 3600) * 1000,
    userId: user.id || result.user_id || "",
    email: user.email || config.email || ""
  };
  if (!session.userId) throw new Error("登录成功但没有取得用户编号。");
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  return session;
}

function headers(config, session) {
  return {
    "apikey": config.anonKey,
    "Authorization": `Bearer ${session.accessToken}`
  };
}

function normalizeData(value) {
  return {
    version: 1,
    students: [],
    lessons: Array.isArray(value?.lessons) ? value.lessons : [],
    summaries: Array.isArray(value?.summaries) ? value.summaries : []
  };
}

function mergeById(local, remote) {
  const map = new Map();
  for (const item of [...remote, ...local]) {
    if (!item?.id) continue;
    const old = map.get(item.id);
    if (!old || itemTime(item) >= itemTime(old)) map.set(item.id, item);
  }
  return [...map.values()].sort((a, b) => itemTime(b) - itemTime(a));
}

function itemTime(item) {
  return Date.parse(item.updatedAt || item.createdAt || `${item.date}T00:00:00`) || 0;
}

function normalizeUrl(url) {
  return String(url || "").trim().replace(/\/+$/, "");
}

function read(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

async function apiError(response) {
  let message = `HTTP ${response.status}`;
  try {
    const data = await response.json();
    message = data.message || data.error_description || data.error || message;
  } catch {
    // Keep the status fallback.
  }
  return new Error(message);
}
