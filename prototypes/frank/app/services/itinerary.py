from __future__ import annotations

import json
from dataclasses import dataclass
from datetime import date, datetime, timedelta
from typing import Any

from app import config
from app.services.geocode import geocode_query, travel_minutes_between


@dataclass
class _P:
    id: int
    name: str
    category: str | None
    lat: float
    lng: float
    open_m: int
    close_m: int
    visit_min: int


def _parse_iso(d: str) -> date:
    return datetime.strptime(d[:10], "%Y-%m-%d").date()


def _minutes_to_label(m: int) -> str:
    h, mi = divmod(m, 60)
    return f"{h:02d}:{mi:02d}"


def build_itinerary(
    destination_query: str,
    dest_lat: float,
    dest_lng: float,
    start_date: str,
    end_date: str,
    places: list[dict[str, Any]],
) -> dict[str, Any]:
    d0 = _parse_iso(start_date)
    d1 = _parse_iso(end_date)
    if d1 < d0:
        d0, d1 = d1, d0
    num_days = (d1 - d0).days + 1

    resolved: list[_P] = []
    for p in places:
        lat, lng = p.get("lat"), p.get("lng")
        if lat is None or lng is None:
            continue
        oid = int(p["id"])
        open_m = int(p.get("open_minute") or 9 * 60)
        close_m = int(p.get("close_minute") or 21 * 60)
        visit_min = int(p.get("visit_duration_min") or 90)
        resolved.append(
            _P(
                id=oid,
                name=str(p["name"]),
                category=p.get("category"),
                lat=float(lat),
                lng=float(lng),
                open_m=open_m,
                close_m=close_m,
                visit_min=visit_min,
            )
        )

    if not resolved:
        return {
            "destination": destination_query,
            "days": [],
            "notes": "No geocoded places to schedule. Run extract after reels are imported.",
        }

    anchor = (dest_lat, dest_lng)
    resolved.sort(
        key=lambda x: travel_minutes_between(anchor, (x.lat, x.lng), config.avg_urban_speed_kmh)
    )

    day_start_min = 9 * 60
    lunch_start = 12 * 60
    lunch_end = 13 * 60
    hard_end = 21 * 60

    days_out: list[dict[str, Any]] = []
    cursor = 0

    for day_i in range(num_days):
        current = d0 + timedelta(days=day_i)
        day_label = current.isoformat()
        blocks: list[dict[str, Any]] = []
        now = day_start_min
        last_loc: tuple[float, float] | None = None

        while cursor < len(resolved) and now < hard_end:
            if lunch_start <= now < lunch_end:
                blocks.append(
                    {
                        "type": "break",
                        "label": "Lunch / buffer",
                        "start": _minutes_to_label(now),
                        "end": _minutes_to_label(min(lunch_end, now + 45)),
                    }
                )
                now = lunch_end
                continue

            p = resolved[cursor]
            if last_loc is not None:
                travel = travel_minutes_between(
                    last_loc, (p.lat, p.lng), config.avg_urban_speed_kmh
                )
                blocks.append(
                    {
                        "type": "travel",
                        "minutes": travel,
                        "start": _minutes_to_label(now),
                        "end": _minutes_to_label(now + travel),
                    }
                )
                now += travel

            start_visit = max(now, p.open_m)
            end_visit = min(p.close_m, hard_end)
            if end_visit - start_visit < 30:
                cursor += 1
                if cursor >= len(resolved):
                    break
                continue

            visit_len = min(p.visit_min, end_visit - start_visit)
            if start_visit + visit_len > end_visit:
                visit_len = max(30, end_visit - start_visit)

            blocks.append(
                {
                    "type": "visit",
                    "place_id": p.id,
                    "name": p.name,
                    "category": p.category,
                    "start": _minutes_to_label(start_visit),
                    "end": _minutes_to_label(start_visit + visit_len),
                }
            )
            now = start_visit + visit_len
            last_loc = (p.lat, p.lng)
            cursor += 1

        days_out.append({"date": day_label, "blocks": blocks})

    return {
        "destination": destination_query,
        "days": days_out,
        "unscheduled_place_ids": [resolved[i].id for i in range(cursor, len(resolved))],
        "meta": {
            "avg_urban_speed_kmh": config.avg_urban_speed_kmh,
            "max_radius_km": config.max_place_radius_km,
        },
    }


def ensure_destination_coords(
    destination_query: str, lat: float | None, lng: float | None
) -> tuple[float, float]:
    if lat is not None and lng is not None:
        return lat, lng
    g = geocode_query(destination_query)
    if not g:
        raise ValueError(f"Could not geocode destination: {destination_query}")
    return g[0], g[1]


def itinerary_to_json_payload(obj: dict[str, Any]) -> str:
    return json.dumps(obj, ensure_ascii=False)
