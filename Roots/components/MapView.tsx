"use client";

import { useMemo, useEffect, useState } from "react";
import {
  MapContainer,
  Marker,
  Polyline,
  Popup,
  TileLayer,
} from "react-leaflet";
import L from "leaflet";
import type { Stop } from "@/lib/types";

function makeIcon(idx: number) {
  return L.divIcon({
    className: "",
    html: `
      <div style="
        width: 30px; height: 30px; border-radius: 50% 50% 50% 0;
        background: #3D7A36;
        transform: rotate(-45deg);
        box-shadow: 0 4px 10px rgba(15,35,16,0.4);
        display:flex;align-items:center;justify-content:center;
        border: 2px solid white;
      ">
        <span style="
          transform: rotate(45deg);
          color: white;
          font-weight: 700;
          font-family: Inter, sans-serif;
          font-size: 13px;
          line-height: 1;
        ">${idx + 1}</span>
      </div>
    `,
    iconSize: [30, 30],
    iconAnchor: [15, 30],
  });
}

// Map the reel's travelMode to an OSRM profile
function osrmProfile(mode?: string): "driving" | "cycling" | "foot" {
  if (mode === "walk") return "foot";
  if (mode === "bike") return "cycling";
  return "driving";
}

// Fetch one road-following segment from OSRM; falls back to straight line on error
async function fetchSegment(from: Stop, to: Stop): Promise<[number, number][]> {
  try {
    const profile = osrmProfile(to.travelMode);
    const url =
      `https://router.project-osrm.org/route/v1/${profile}/` +
      `${from.lng},${from.lat};${to.lng},${to.lat}` +
      `?overview=full&geometries=geojson`;
    const res = await fetch(url);
    if (!res.ok) throw new Error("osrm-error");
    const data = await res.json();
    const coords: [number, number][] =
      data?.routes?.[0]?.geometry?.coordinates?.map(
        ([lng, lat]: [number, number]) => [lat, lng]
      ) ?? [];
    if (coords.length > 0) return coords;
  } catch {
    // fall through
  }
  return [
    [from.lat, from.lng],
    [to.lat, to.lng],
  ];
}

interface Segment {
  coords: [number, number][];
  mode?: string;
}

// Walk legs get a dashed line; drive/transit get a solid line
function segmentStyle(mode?: string) {
  const isWalk = mode === "walk";
  return {
    color: "#3D7A36",
    weight: isWalk ? 3 : 4,
    opacity: 0.85,
    dashArray: isWalk ? "6 8" : undefined,
  };
}

export function MapView({ stops }: { stops: Stop[] }) {
  // Exclude stops that failed geocoding (Nominatim returns them at 0,0)
  const geocoded = useMemo(() => stops.filter((s) => s.lat !== 0 || s.lng !== 0), [stops]);

  const center = useMemo<[number, number]>(() => {
    if (geocoded.length === 0) return [37.3382, -121.8863];
    const lat = geocoded.reduce((s, p) => s + p.lat, 0) / geocoded.length;
    const lng = geocoded.reduce((s, p) => s + p.lng, 0) / geocoded.length;
    return [lat, lng];
  }, [geocoded]);

  const [segments, setSegments] = useState<Segment[]>([]);
  const [routeLoading, setRouteLoading] = useState(true);

  useEffect(() => {
    if (geocoded.length < 2) {
      setRouteLoading(false);
      return;
    }
    setRouteLoading(true);
    const pairs = geocoded
      .slice(0, -1)
      .map((s, i) => [s, geocoded[i + 1]] as [Stop, Stop]);

    Promise.all(
      pairs.map(async ([from, to]) => ({
        coords: await fetchSegment(from, to),
        mode: to.travelMode,
      }))
    ).then((segs) => {
      setSegments(segs);
      setRouteLoading(false);
    });
  }, [geocoded]);

  // Straight-line fallback shown while OSRM is loading
  const fallbackPath = useMemo<[number, number][]>(
    () => geocoded.map((s) => [s.lat, s.lng]),
    [geocoded]
  );

  return (
    <div className="relative rounded-2xl overflow-hidden border border-moss-100 bg-white">
      {routeLoading && stops.length > 1 && (
        <div className="absolute top-2 left-1/2 -translate-x-1/2 z-[1000] bg-white/90 text-xs text-ink/50 px-3 py-1 rounded-full shadow pointer-events-none">
          Loading routes…
        </div>
      )}
      <MapContainer
        center={center}
        zoom={geocoded.length > 1 ? 10 : 13}
        scrollWheelZoom={true}
        style={{ height: "320px", width: "100%" }}
      >
        <TileLayer
          attribution="Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community"
          url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
        />

        {/* While routes are loading, draw faint straight lines so the map isn't empty */}
        {routeLoading && geocoded.length > 1 && (
          <Polyline
            positions={fallbackPath}
            pathOptions={{ color: "#3D7A36", weight: 2, opacity: 0.3, dashArray: "4 6" }}
          />
        )}

        {/* Actual road-following routes once loaded */}
        {!routeLoading &&
          segments.map((seg, i) => (
            <Polyline
              key={i}
              positions={seg.coords}
              pathOptions={segmentStyle(seg.mode)}
            />
          ))}

        {geocoded.map((s, i) => (
          <Marker key={s.id} position={[s.lat, s.lng]} icon={makeIcon(i)}>
            <Popup>
              <div className="text-xs">
                <div className="font-semibold text-ink">{s.name}</div>
                <div className="text-ink/60">{s.category}</div>
                <div className="text-ink/60 mt-1">⏰ {s.hours}</div>
                {s.travelMode && (
                  <div className="text-ink/50 mt-1">
                    {s.travelMode === "walk" ? "🚶 Walk" :
                     s.travelMode === "drive" ? "🚗 Drive" :
                     s.travelMode === "transit" ? "🚌 Transit" : "🚲 Bike"} from previous stop
                  </div>
                )}
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
