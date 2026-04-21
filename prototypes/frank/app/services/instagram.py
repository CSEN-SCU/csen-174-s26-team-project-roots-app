from typing import Any

import httpx

IG_MEDIA = "https://graph.instagram.com/me/media"


def fetch_recent_media(access_token: str, limit: int = 25) -> list[dict[str, Any]]:
    """
    Uses Instagram Graph (Basic Display / Instagram Login) token to fetch
    the authenticated user's recent media. Meta does not offer an API for
    the private Saved collection; this is a practical stand-in for the prototype.
    """
    fields = "id,caption,media_type,media_url,permalink,thumbnail_url"
    params: dict[str, str | int] = {"fields": fields, "access_token": access_token, "limit": limit}
    out: list[dict[str, Any]] = []
    url: str | None = IG_MEDIA
    first = True
    with httpx.Client(timeout=45.0) as client:
        while url and len(out) < limit:
            if first:
                r = client.get(url, params=params)
                first = False
            else:
                r = client.get(url)
            r.raise_for_status()
            body = r.json()
            for item in body.get("data", []):
                if item.get("media_type") in ("VIDEO", "CAROUSEL_ALBUM", "IMAGE"):
                    out.append(item)
                if len(out) >= limit:
                    break
            url = body.get("paging", {}).get("next")
    return out[:limit]
