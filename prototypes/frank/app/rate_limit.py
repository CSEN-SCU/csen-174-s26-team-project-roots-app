"""Per-IP rate limits to protect paid APIs (OpenAI) and shared geocoding."""

from __future__ import annotations

from flask import Flask, jsonify, request
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address

from app import config

def _api_only() -> bool:
    return request.path.startswith("/api/")


limiter = Limiter(
    key_func=get_remote_address,
    default_limits=[config.rate_limit_default],
    storage_uri="memory://",
    headers_enabled=True,
)


def init_rate_limiting(app: Flask) -> None:
    limiter.request_filter = _api_only
    limiter.init_app(app)

    @app.errorhandler(429)
    def _too_many_requests(_exc):
        return (
            jsonify(
                {
                    "detail": (
                        "Too many requests. Please wait before trying again "
                        "(rate limits protect shared API usage)."
                    )
                }
            ),
            429,
        )
