import json
import re
from typing import Any

import httpx

from app import config


def _client_headers() -> dict[str, str]:
    if not config.openai_api_key:
        raise ValueError("OPENAI_API_KEY is not set in prototypes/frank/.env")
    return {
        "Authorization": f"Bearer {config.openai_api_key}",
        "Content-Type": "application/json",
    }


def extract_places_from_reels(
    destination: str,
    reels: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    lines = []
    for i, r in enumerate(reels):
        cap = (r.get("caption") or "").strip()[:1200]
        lines.append(f"[{i}] caption: {cap!r}")
    blob = "\n".join(lines)

    system = (
        "You extract real-world venues and points of interest from social captions "
        "for trip planning. Output strict JSON only."
    )
    user = f"""Trip destination (anchor): {destination}

Reel captions (indices matter):
{blob}

Task:
- For each caption, infer named places a traveler could visit (restaurant, cafe, museum, neighborhood spot, viewpoint, etc.).
- ONLY include places that are plausibly in or very near the trip destination region (same metro area / reasonable day-trip). Drop places clearly elsewhere.
- If a caption has no usable place, return no items for that index.
- Suggest typical customer-facing hours as open_hhmm and close_hhmm in 24h "HH:MM" or null if unknown.
- visit_duration_min: realistic on-site time for that category.

Return JSON object: {{"items": [{{"reel_index": 0, "place_name": "...", "category": "...", "confidence": 0.0, "open_hhmm": "10:00", "close_hhmm": "18:00", "visit_duration_min": 90, "rationale": "..."}}]}}"""

    payload = {
        "model": config.openai_model,
        "temperature": 0.2,
        "response_format": {"type": "json_object"},
        "messages": [
            {"role": "system", "content": system},
            {"role": "user", "content": user},
        ],
    }

    with httpx.Client(timeout=120.0) as client:
        r = client.post(
            "https://api.openai.com/v1/chat/completions",
            headers=_client_headers(),
            json=payload,
        )
        r.raise_for_status()
        body = r.json()

    text = body["choices"][0]["message"]["content"] or "{}"
    data = json.loads(text)
    items = data.get("items") or []
    return [i for i in items if isinstance(i, dict)]


_HHMM = re.compile(r"^(\d{1,2}):(\d{2})$")


def parse_hhmm(s: str | None) -> int | None:
    if not s:
        return None
    m = _HHMM.match(s.strip())
    if not m:
        return None
    h, mi = int(m.group(1)), int(m.group(2))
    if h > 23 or mi > 59:
        return None
    return h * 60 + mi


def default_hours_for_category(category: str | None) -> tuple[int, int]:
    c = (category or "").lower()
    if any(x in c for x in ("restaurant", "food", "bar", "café", "cafe")):
        return 11 * 60, 22 * 60
    if any(x in c for x in ("museum", "gallery", "attraction")):
        return 10 * 60, 18 * 60
    if "park" in c or "view" in c or "walk" in c:
        return 8 * 60, 20 * 60
    return 9 * 60, 21 * 60
