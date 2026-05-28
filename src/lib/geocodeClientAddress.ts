/**
 * Geocode a UK visit address via Supabase `location-proxy` (Nominatim).
 * Keep aligned with app mobile booking geocode behaviour.
 */
export async function geocodeClientAddress(
  address: string,
): Promise<{ lat: number; lng: number } | null> {
  const trimmed = address.trim();
  if (!trimmed) return null;

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;
  if (!supabaseUrl || !anonKey) return null;

  const params = new URLSearchParams({
    service: "nominatim",
    q: trimmed,
    limit: "1",
    countrycodes: "gb",
  });
  const url = `${supabaseUrl.replace(/\/$/, "")}/functions/v1/location-proxy?${params}`;

  try {
    const res = await fetch(url, {
      headers: {
        apikey: anonKey,
        Authorization: `Bearer ${anonKey}`,
      },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as Array<{ lat?: string; lon?: string }>;
    if (!Array.isArray(data) || data.length === 0) return null;
    const lat = parseFloat(data[0].lat ?? "");
    const lng = parseFloat(data[0].lon ?? "");
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
    return { lat, lng };
  } catch {
    return null;
  }
}
