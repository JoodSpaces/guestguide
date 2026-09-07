import * as SecureStore from "expo-secure-store";

const TOKEN_KEY    = "jood_ops_token";
const SESSION_KEY  = "jood_ops_session";

export interface StoredSession {
  id: string;
  name: string;
  role: "admin" | "ops" | "housekeeping" | "maintenance" | "concierge";
  propertyIds: string[] | null;
  exp: number;
}

export async function saveAuth(token: string, session: StoredSession) {
  await SecureStore.setItemAsync(TOKEN_KEY,   token);
  await SecureStore.setItemAsync(SESSION_KEY, JSON.stringify(session));
}

export async function getToken(): Promise<string | null> {
  return SecureStore.getItemAsync(TOKEN_KEY);
}

export async function getSession(): Promise<StoredSession | null> {
  const raw = await SecureStore.getItemAsync(SESSION_KEY);
  if (!raw) return null;
  try {
    const s = JSON.parse(raw) as StoredSession;
    if (Date.now() > s.exp) { await clearAuth(); return null; }
    return s;
  } catch { return null; }
}

export async function clearAuth() {
  await SecureStore.deleteItemAsync(TOKEN_KEY);
  await SecureStore.deleteItemAsync(SESSION_KEY);
}
