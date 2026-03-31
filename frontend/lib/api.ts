const API_BASE = process.env.NEXT_PUBLIC_API_URL || "https://bot.dlogicai.in/wide";

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("mrwide_token");
}

function authHeaders(): Record<string, string> {
  const token = getToken();
  if (token) return { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
  return { "Content-Type": "application/json" };
}

export function setToken(token: string) {
  localStorage.setItem("mrwide_token", token);
}

export function clearToken() {
  localStorage.removeItem("mrwide_token");
}

export function isLoggedIn(): boolean {
  return !!getToken();
}

export interface VenueInfo {
  venue: string;
  race_count: number;
  has_key: boolean;
}

export interface Horse {
  horse_number: number;
  horse_name: string;
  jockey: string;
  wide_index: number;
  ai_place_prob?: number;
  rank: number;
}

export interface WideRecommendation {
  type: string;
  label: string;
  horse_a: number;
  horse_b: number;
  confidence: number;
  pair_hit_rate?: number;
}

export interface RaceData {
  race_id: string;
  race_number: number;
  race_name: string;
  distance: string;
  num_horses: number;
  horses: Horse[];
  top5: Horse[];
  recommendations: WideRecommendation[];
}

export interface VenueData {
  venue: string;
  race_count: number;
  races: RaceData[];
}

export interface UnlockResponse {
  success: boolean;
  venue?: string;
  date?: string;
  data?: VenueData;
  error?: string;
  needs_auth?: boolean;
}

export interface UserKey {
  key: string;
  venue: string;
  date: string;
  activated_at: string;
}

export interface MeResponse {
  authenticated: boolean;
  user?: { display_name: string; picture_url: string };
  keys?: UserKey[];
}

export async function getVenues(date?: string): Promise<{ date: string; venues: VenueInfo[] }> {
  const params = date ? `?date=${date}` : "";
  const res = await fetch(`${API_BASE}/api/venues${params}`);
  return res.json();
}

export async function getLineLoginUrl(redirectPath?: string): Promise<{ url: string; state: string }> {
  const params = redirectPath ? `?redirect_path=${encodeURIComponent(redirectPath)}` : "";
  const res = await fetch(`${API_BASE}/api/auth/line-url${params}`);
  return res.json();
}

export async function lineCallback(code: string, state: string): Promise<{ success: boolean; token?: string; user?: { display_name: string; picture_url: string }; error?: string }> {
  const res = await fetch(`${API_BASE}/api/auth/callback`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code, state }),
  });
  return res.json();
}

export async function getMe(): Promise<MeResponse> {
  const res = await fetch(`${API_BASE}/api/auth/me`, { headers: authHeaders() });
  return res.json();
}

export async function unlockPreview(key: string): Promise<{ exists: boolean; venue?: string; date?: string; already_bound?: boolean; error?: string }> {
  const res = await fetch(`${API_BASE}/api/unlock/preview`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ key }),
  });
  return res.json();
}

export async function unlockWithKey(key: string): Promise<UnlockResponse> {
  const res = await fetch(`${API_BASE}/api/unlock`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ key }),
  });
  return res.json();
}
