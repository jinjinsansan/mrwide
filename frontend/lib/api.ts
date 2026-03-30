const API_BASE = process.env.NEXT_PUBLIC_API_URL || "https://mrwide-api.onrender.com";

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
  rank: number;
}

export interface WideRecommendation {
  type: string;
  label: string;
  horse_a: number;
  horse_b: number;
  confidence: number;
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
}

export async function getVenues(date?: string): Promise<{ date: string; venues: VenueInfo[] }> {
  const params = date ? `?date=${date}` : "";
  const res = await fetch(`${API_BASE}/api/venues${params}`);
  return res.json();
}

export async function unlockWithKey(key: string): Promise<UnlockResponse> {
  const res = await fetch(`${API_BASE}/api/unlock`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ key }),
  });
  return res.json();
}
