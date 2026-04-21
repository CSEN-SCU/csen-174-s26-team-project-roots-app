import math
from typing import Any

import httpx

NOMINATIM = "https://nominatim.openstreetmap.org/search"
_HEADERS = {"User-Agent": "RootsStudentPrototype/1.0 (contact: course prototype)"}


def geocode_query(q: str) -> tuple[float, float] | None:
    params: dict[str, str | int] = {"q": q, "format": "json", "limit": 1}
    with httpx.Client(timeout=30.0, headers=_HEADERS) as client:
        r = client.get(NOMINATIM, params=params)
        r.raise_for_status()
        data: list[dict[str, Any]] = r.json()
    if not data:
        return None
    return float(data[0]["lat"]), float(data[0]["lon"])


def haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    r = 6371.0
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dl = math.radians(lon2 - lon1)
    a = math.sin(dphi / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return 2 * r * math.asin(math.sqrt(a))


def travel_minutes_between(
    a: tuple[float, float], b: tuple[float, float], speed_kmh: float
) -> int:
    km = haversine_km(a[0], a[1], b[0], b[1])
    if speed_kmh <= 0:
        return int(km * 4)
    return max(10, int((km / speed_kmh) * 60))
