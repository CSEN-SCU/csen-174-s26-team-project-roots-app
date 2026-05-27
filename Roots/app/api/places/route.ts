import { NextRequest, NextResponse } from "next/server";

export interface PlaceResult {
  placeId: number;
  name: string;
  shortAddress: string;
  fullAddress: string;
  lat: number;
  lng: number;
}

// ── OSM amenity/shop tag mapping for common search categories ───────────────
interface TagFilter { key: string; value: string }

const CATEGORY_MAP: Record<string, TagFilter[]> = {
  coffee:      [{ key: "amenity", value: "cafe" }, { key: "shop", value: "coffee" }],
  cafe:        [{ key: "amenity", value: "cafe" }],
  tea:         [{ key: "amenity", value: "cafe" }, { key: "shop", value: "tea" }],
  restaurant:  [{ key: "amenity", value: "restaurant" }],
  food:        [{ key: "amenity", value: "restaurant" }, { key: "amenity", value: "fast_food" }],
  pizza:       [{ key: "amenity", value: "restaurant" }],
  burger:      [{ key: "amenity", value: "fast_food" }],
  sushi:       [{ key: "amenity", value: "restaurant" }],
  ramen:       [{ key: "amenity", value: "restaurant" }],
  bar:         [{ key: "amenity", value: "bar" }, { key: "amenity", value: "pub" }],
  pub:         [{ key: "amenity", value: "pub" }],
  brewery:     [{ key: "craft", value: "brewery" }, { key: "amenity", value: "bar" }],
  park:        [{ key: "leisure", value: "park" }],
  hiking:      [{ key: "leisure", value: "park" }, { key: "leisure", value: "nature_reserve" }],
  trail:       [{ key: "leisure", value: "park" }, { key: "leisure", value: "nature_reserve" }],
  beach:       [{ key: "natural", value: "beach" }],
  gym:         [{ key: "leisure", value: "fitness_centre" }],
  fitness:     [{ key: "leisure", value: "fitness_centre" }],
  yoga:        [{ key: "leisure", value: "fitness_centre" }],
  spa:         [{ key: "leisure", value: "spa" }],
  pharmacy:    [{ key: "amenity", value: "pharmacy" }],
  grocery:     [{ key: "shop", value: "supermarket" }, { key: "shop", value: "grocery" }],
  supermarket: [{ key: "shop", value: "supermarket" }],
  gas:         [{ key: "amenity", value: "fuel" }],
  hotel:       [{ key: "tourism", value: "hotel" }],
  museum:      [{ key: "tourism", value: "museum" }],
  library:     [{ key: "amenity", value: "library" }],
  thrift:      [{ key: "shop", value: "second_hand" }, { key: "shop", value: "charity" }],
  vintage:     [{ key: "shop", value: "second_hand" }, { key: "shop", value: "vintage" }],
  bookstore:   [{ key: "shop", value: "books" }],
  book:        [{ key: "shop", value: "books" }],
  bakery:      [{ key: "shop", value: "bakery" }, { key: "amenity", value: "bakery" }],
  clothing:    [{ key: "shop", value: "clothes" }],
  "ice cream": [{ key: "amenity", value: "ice_cream" }],
  cinema:      [{ key: "amenity", value: "cinema" }],
  movie:       [{ key: "amenity", value: "cinema" }],
  theater:     [{ key: "amenity", value: "theatre" }],
  art:         [{ key: "tourism", value: "gallery" }],
  gallery:     [{ key: "tourism", value: "gallery" }],
  salon:       [{ key: "shop", value: "hairdresser" }],
  hair:        [{ key: "shop", value: "hairdresser" }],
  bank:        [{ key: "amenity", value: "bank" }],
  hospital:    [{ key: "amenity", value: "hospital" }],
  clinic:      [{ key: "amenity", value: "clinic" }],
  dentist:     [{ key: "amenity", value: "dentist" }],
};

function findCategoryTags(q: string): TagFilter[] | null {
  const lower = q.toLowerCase();
  for (const [keyword, tags] of Object.entries(CATEGORY_MAP)) {
    if (lower.includes(keyword)) return tags;
  }
  return null;
}

function buildOverpassQuery(tags: TagFilter[], lat: number, lng: number, radius = 5000): string {
  const nodeLines = tags
    .map((t) => `  node["${t.key}"="${t.value}"](around:${radius},${lat},${lng});`)
    .join("\n");
  return `[out:json][timeout:12];\n(\n${nodeLines}\n);\nout 10;`;
}

function parseOverpassElement(el: Record<string, unknown>): PlaceResult | null {
  const tags = (el.tags ?? {}) as Record<string, string>;
  const name = tags.name ?? tags["name:en"] ?? tags.operator ?? "";
  if (!name || typeof el.lat !== "number" || typeof el.lon !== "number") return null;

  const houseNum = tags["addr:housenumber"] ?? "";
  const street   = tags["addr:street"] ?? "";
  const city     = tags["addr:city"] ?? "";
  const state    = tags["addr:state"] ?? "";
  const shortAddress = [
    [houseNum, street].filter(Boolean).join(" "),
    city,
    state,
  ].filter(Boolean).join(", ") || "Address unavailable";

  return {
    placeId: el.id as number,
    name,
    shortAddress,
    fullAddress: shortAddress,
    lat: el.lat,
    lng: el.lon,
  };
}

async function overpassSearch(
  tags: TagFilter[],
  lat: number,
  lng: number
): Promise<PlaceResult[]> {
  const query = buildOverpassQuery(tags, lat, lng);
  const res = await fetch("https://overpass-api.de/api/interpreter", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `data=${encodeURIComponent(query)}`,
    signal: AbortSignal.timeout(14000),
  });
  if (!res.ok) return [];
  const data = await res.json();
  const elements: Record<string, unknown>[] = data.elements ?? [];
  return elements
    .map(parseOverpassElement)
    .filter((p): p is PlaceResult => Boolean(p))
    .slice(0, 8);
}

// ── Nominatim helpers ───────────────────────────────────────────────────────
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

function parseNominatimResult(p: NominatimResult): PlaceResult {
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
}

async function nominatimForwardSearch(
  q: string,
  lat?: number,
  lng?: number
): Promise<PlaceResult[]> {
  let url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=8&addressdetails=1`;

  // Bias results toward the user's location when we have coords
  if (lat !== undefined && lng !== undefined) {
    const delta = 0.45; // ~50 km box
    // Nominatim viewbox: left,top,right,bottom  =  lon_min,lat_max,lon_max,lat_min
    url += `&viewbox=${lng - delta},${lat + delta},${lng + delta},${lat - delta}&bounded=0`;
  }

  const res = await fetch(url, {
    headers: { "User-Agent": "Roots-App/1.0 (roots-planning-app)" },
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) return [];
  const data: NominatimResult[] = await res.json();
  return (data as NominatimResult[]).map(parseNominatimResult);
}

// ── Route handlers ──────────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  const latParam = req.nextUrl.searchParams.get("lat");
  const lngParam = req.nextUrl.searchParams.get("lng");
  const q        = req.nextUrl.searchParams.get("q")?.trim();

  // ── Reverse geocode (lat + lng only, no q) ──────────────────────────────
  if (latParam && lngParam && !q) {
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
      const city    = a.city ?? a.town ?? a.village ?? a.municipality ?? a.county ?? null;
      const state   = a.state ?? null;
      const country = a.country_code?.toUpperCase() ?? null;
      const label   = [city, state, country === "US" ? null : country]
        .filter(Boolean)
        .join(", ");
      return NextResponse.json({ city: label || null });
    } catch {
      return NextResponse.json({ city: null });
    }
  }

  // ── Forward search ───────────────────────────────────────────────────────
  if (!q || q.length < 2) return NextResponse.json({ places: [] });

  const lat = latParam ? parseFloat(latParam) : undefined;
  const lng = lngParam ? parseFloat(lngParam) : undefined;

  try {
    // If the query matches a known category AND we have coords, use Overpass
    // for high-quality nearby POI results (same as searching on Apple Maps)
    if (lat !== undefined && lng !== undefined) {
      const tags = findCategoryTags(q);
      if (tags) {
        const places = await overpassSearch(tags, lat, lng);
        if (places.length > 0) return NextResponse.json({ places });
        // Overpass returned nothing — fall through to Nominatim
      }
    }

    // Specific place name (or category with no Overpass results) → Nominatim
    const places = await nominatimForwardSearch(q, lat, lng);
    return NextResponse.json({ places });
  } catch {
    return NextResponse.json({ places: [] });
  }
}
