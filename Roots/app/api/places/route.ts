import { NextRequest, NextResponse } from "next/server";

export interface PlaceResult {
  placeId: number;
  name: string;
  shortAddress: string;
  fullAddress: string;
  lat: number;
  lng: number;
}

export async function GET(req: NextRequest) {
  // ── Reverse geocode branch ──────────────────────────────────────────────
  const latParam = req.nextUrl.searchParams.get("lat");
  const lngParam = req.nextUrl.searchParams.get("lng");
  if (latParam && lngParam) {
    try {
      const url =
        `https://nominatim.openstreetmap.org/reverse` +
        `?lat=${latParam}&lon=${lngParam}&format=json&zoom=10&addressdetails=1`;
      const res = await fetch(url, {
        headers: { "User-Agent": "Roots-App/1.0 (roots-planning-app)" },
        signal: AbortSignal.timeout(6000),
      });
      if (!res.ok) return NextResponse.json({ city: null });
      const data = await res.json();
      const a = data.address ?? {};
      const city = a.city ?? a.town ?? a.village ?? a.municipality ?? a.county ?? null;
      const state = a.state ?? null;
      const country = a.country_code?.toUpperCase() ?? null;
      const label = [city, state, country === "US" ? null : country]
        .filter(Boolean)
        .join(", ");
      return NextResponse.json({ city: label || null });
    } catch {
      return NextResponse.json({ city: null });
    }
  }

  // ── Forward search branch ───────────────────────────────────────────────
  const q = req.nextUrl.searchParams.get("q")?.trim();
  if (!q || q.length < 2) return NextResponse.json({ places: [] });

  try {
    const url =
      `https://nominatim.openstreetmap.org/search` +
      `?q=${encodeURIComponent(q)}&format=json&limit=6&addressdetails=1`;

    const res = await fetch(url, {
      headers: { "User-Agent": "Roots-App/1.0 (roots-planning-app)" },
      signal: AbortSignal.timeout(6000),
    });

    if (!res.ok) return NextResponse.json({ places: [] });

    const data: NominatimResult[] = await res.json();

    const places: PlaceResult[] = data.map((p) => {
      const a = p.address ?? {};
      const name =
        p.name ||
        a.amenity ||
        a.shop ||
        a.tourism ||
        p.display_name.split(",")[0];

      const streetNum = a.house_number ? `${a.house_number} ` : "";
      const street = a.road ?? a.pedestrian ?? a.footway ?? "";
      const city =
        a.city ?? a.town ?? a.village ?? a.municipality ?? a.county ?? "";
      const state = a.state ?? "";
      const postcode = a.postcode ?? "";

      const shortAddress = [
        streetNum + street,
        city,
        [state, postcode].filter(Boolean).join(" "),
      ]
        .filter(Boolean)
        .join(", ");

      return {
        placeId: p.place_id,
        name,
        shortAddress: shortAddress || p.display_name.split(",").slice(0, 3).join(","),
        fullAddress: p.display_name,
        lat: parseFloat(p.lat),
        lng: parseFloat(p.lon),
      };
    });

    return NextResponse.json({ places });
  } catch {
    return NextResponse.json({ places: [] });
  }
}

interface NominatimResult {
  place_id: number;
  display_name: string;
  name: string;
  lat: string;
  lon: string;
  address?: {
    house_number?: string;
    road?: string;
    pedestrian?: string;
    footway?: string;
    amenity?: string;
    shop?: string;
    tourism?: string;
    city?: string;
    town?: string;
    village?: string;
    municipality?: string;
    county?: string;
    state?: string;
    postcode?: string;
  };
}
