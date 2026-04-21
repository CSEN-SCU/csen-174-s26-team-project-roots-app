import os
from pathlib import Path

_PROTOTYPE_ROOT = Path(__file__).resolve().parent.parent


def _env(key: str, default: str | None = None) -> str | None:
    v = os.environ.get(key)
    if v is not None and v.strip() != "":
        return v
    return default


# Load .env from prototype folder
try:
    from dotenv import load_dotenv

    load_dotenv(_PROTOTYPE_ROOT / ".env")
except ImportError:
    pass

openai_api_key: str = _env("OPENAI_API_KEY", "") or ""
openai_model: str = _env("OPENAI_MODEL", "gpt-4o-mini") or "gpt-4o-mini"
database_url: str = _env(
    "DATABASE_URL",
    f"sqlite:///{_PROTOTYPE_ROOT / 'data' / 'app.db'}",
) or f"sqlite:///{_PROTOTYPE_ROOT / 'data' / 'app.db'}"
port: int = int(_env("PORT", "8787") or "8787")
max_place_radius_km: float = float(_env("MAX_PLACE_RADIUS_KM", "75") or "75")
avg_urban_speed_kmh: float = float(_env("AVG_URBAN_SPEED_KMH", "18") or "18")
