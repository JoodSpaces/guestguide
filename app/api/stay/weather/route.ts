import { NextRequest, NextResponse } from "next/server";
import { Redis } from "@upstash/redis";
import { hashToken } from "@/lib/token";
import { createServiceClient } from "@/lib/supabase/server";
import type { WeatherData } from "@/lib/types/weather";

export type { WeatherData };

const CACHE_TTL = 1800; // 30 min in seconds

let _redis: Redis | null = null;

function getRedis(): Redis | null {
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) return null;
  if (!_redis) {
    _redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    });
  }
  return _redis;
}

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

  const cacheKey = `jood:weather:${resolvedLat.toFixed(2)},${resolvedLng.toFixed(2)}`;

  const redis = getRedis();
  if (redis) {
    const cached = await redis.get<WeatherData>(cacheKey);
    if (cached) return NextResponse.json(cached);
  }

  try {
    const [weatherRes, marineRes] = await Promise.allSettled([
      fetch(
        `https://api.open-meteo.com/v1/forecast` +
        `?latitude=${resolvedLat}&longitude=${resolvedLng}` +
        `&current=temperature_2m,uv_index,wind_speed_10m` +
        `&daily=sunset&timezone=auto&forecast_days=1`
      ),
      fetch(
        `https://marine-api.open-meteo.com/v1/marine` +
        `?latitude=${resolvedLat}&longitude=${resolvedLng}` +
        `&current=wave_height&timezone=auto`
      ),
    ]);

    if (weatherRes.status === "rejected" || !weatherRes.value.ok) {
      return NextResponse.json({ error: "upstream" }, { status: 502 });
    }

    const weather = await weatherRes.value.json();
    const current = weather.current ?? {};

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

    if (redis) {
      await redis.set(cacheKey, data, { ex: CACHE_TTL });
    }

    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: "upstream" }, { status: 502 });
  }
}
