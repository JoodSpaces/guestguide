import { NextRequest, NextResponse } from "next/server";
import { hashToken } from "@/lib/token";
import { createServiceClient } from "@/lib/supabase/server";
import type { WeatherData } from "@/lib/types/weather";

export type { WeatherData };

// In-memory cache: per-property, refreshes every 30 min
const weatherCache = new Map<string, { data: WeatherData; at: number }>();
const CACHE_TTL = 30 * 60 * 1000;

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");
  if (!token || !/^[A-Za-z0-9_-]{22}$/.test(token)) {
    return NextResponse.json({ error: "bad_token" }, { status: 400 });
  }

  const supabase = createServiceClient();

  const { data: tokenRow } = await supabase
    .from("stay_tokens")
    .select("booking_id")
    .eq("token_hash", hashToken(token))
    .single<{ booking_id: string }>();

  if (!tokenRow) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const { data: booking } = await supabase
    .from("bookings")
    .select("property_id, properties(map_pin_lat, map_pin_lng)")
    .eq("id", tokenRow.booking_id)
    .single<{
      property_id: string;
      properties: { map_pin_lat: number | null; map_pin_lng: number | null } | Array<{ map_pin_lat: number | null; map_pin_lng: number | null }>;
    }>();

  if (!booking) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const prop = Array.isArray(booking.properties) ? booking.properties[0] : booking.properties;
  const lat = prop?.map_pin_lat;
  const lng = prop?.map_pin_lng;

  // Fall back to North Coast Egypt centroid if property hasn't set a pin yet
  const resolvedLat = lat ?? 31.09;
  const resolvedLng = lng ?? 28.07;

  const cacheKey = `${resolvedLat.toFixed(2)},${resolvedLng.toFixed(2)}`;
  const cached = weatherCache.get(cacheKey);
  if (cached && Date.now() - cached.at < CACHE_TTL) {
    return NextResponse.json(cached.data);
  }

  try {
    const [weatherRes, marineRes] = await Promise.allSettled([
      fetch(
        `https://api.open-meteo.com/v1/forecast` +
        `?latitude=${resolvedLat}&longitude=${resolvedLng}` +
        `&current=temperature_2m,uv_index,wind_speed_10m` +
        `&daily=sunset&timezone=auto&forecast_days=1`,
        { next: { revalidate: 1800 } }
      ),
      fetch(
        `https://marine-api.open-meteo.com/v1/marine` +
        `?latitude=${resolvedLat}&longitude=${resolvedLng}` +
        `&current=wave_height&timezone=auto`,
        { next: { revalidate: 1800 } }
      ),
    ]);

    if (weatherRes.status === "rejected" || !weatherRes.value.ok) {
      return NextResponse.json({ error: "upstream" }, { status: 502 });
    }

    const weather = await weatherRes.value.json();
    const current = weather.current ?? {};

    // Parse sunset: "2025-06-15T19:42" → "19:42"
    const sunsetRaw: string = (weather.daily?.sunset?.[0] ?? "") as string;
    const sunsetLocal = sunsetRaw.includes("T") ? sunsetRaw.split("T")[1].slice(0, 5) : "--:--";

    let waveM: number | null = null;
    if (marineRes.status === "fulfilled" && marineRes.value.ok) {
      const marine = await marineRes.value.json();
      const wh = marine.current?.wave_height;
      if (typeof wh === "number") waveM = Math.round(wh * 10) / 10;
    }

    const data: WeatherData = {
      tempC: Math.round(current.temperature_2m ?? 0),
      uvIndex: Math.round(current.uv_index ?? 0),
      windKph: Math.round(current.wind_speed_10m ?? 0),
      sunsetLocal,
      waveM,
    };

    weatherCache.set(cacheKey, { data, at: Date.now() });
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: "upstream" }, { status: 502 });
  }
}
