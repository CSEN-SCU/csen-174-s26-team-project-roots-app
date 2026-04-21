from __future__ import annotations

import json
import time
from pathlib import Path

from flask import Flask, jsonify, request, send_from_directory
from sqlalchemy.orm import Session

from app import config
from app.database import Base, SessionLocal, engine
from app.models import Itinerary, Place, Reel, Trip
from app.services.geocode import geocode_query, haversine_km
from app.services.instagram import fetch_recent_media
from app.services.itinerary import (
    build_itinerary,
    ensure_destination_coords,
    itinerary_to_json_payload,
)
from app.services.llm import (
    default_hours_for_category,
    extract_places_from_reels,
    parse_hhmm,
)

PROTOTYPE_ROOT = Path(__file__).resolve().parent.parent
STATIC_DIR = PROTOTYPE_ROOT / "static"

app = Flask(
    __name__,
    static_folder=str(STATIC_DIR),
    static_url_path="/static",
)


def _session() -> Session:
    return SessionLocal()


def _trip_to_dict(db: Session, trip: Trip) -> dict:
    reels = [
        {
            "id": r.id,
            "caption": r.caption,
            "permalink": r.permalink,
            "media_url": r.media_url,
            "source": r.source,
        }
        for r in trip.reels
    ]
    places = [
        {
            "id": p.id,
            "name": p.name,
            "category": p.category,
            "lat": p.lat,
            "lng": p.lng,
            "distance_km": p.distance_km,
            "open_minute": p.open_minute,
            "close_minute": p.close_minute,
            "visit_duration_min": p.visit_duration_min,
            "reel_id": p.reel_id,
        }
        for p in trip.places
    ]
    latest_it = (
        db.query(Itinerary).filter(Itinerary.trip_id == trip.id).order_by(Itinerary.id.desc()).first()
    )
    it_payload = json.loads(latest_it.payload_json) if latest_it else None
    return {
        "id": trip.id,
        "destination": trip.destination_query,
        "dest_lat": trip.dest_lat,
        "dest_lng": trip.dest_lng,
        "start_date": trip.start_date,
        "end_date": trip.end_date,
        "reels": reels,
        "places": places,
        "itinerary": it_payload,
    }


@app.post("/api/trips")
def create_trip():
    body = request.get_json(force=True, silent=False) or {}
    destination = (body.get("destination") or "").strip()
    start_date = (body.get("start_date") or "").strip()
    end_date = (body.get("end_date") or "").strip()
    if len(destination) < 2:
        return jsonify({"detail": "destination required"}), 400
    if not start_date or not end_date:
        return jsonify({"detail": "start_date and end_date required"}), 400
    db = _session()
    try:
        lat, lng = ensure_destination_coords(destination, None, None)
        trip = Trip(
            destination_query=destination,
            dest_lat=lat,
            dest_lng=lng,
            start_date=start_date,
            end_date=end_date,
        )
        db.add(trip)
        db.commit()
        db.refresh(trip)
        return jsonify(_trip_to_dict(db, trip))
    finally:
        db.close()


@app.get("/api/trips/<int:trip_id>")
def get_trip(trip_id: int):
    db = _session()
    try:
        trip = db.get(Trip, trip_id)
        if not trip:
            return jsonify({"detail": "Trip not found"}), 404
        return jsonify(_trip_to_dict(db, trip))
    finally:
        db.close()


@app.post("/api/trips/<int:trip_id>/reels/instagram")
def sync_instagram(trip_id: int):
    body = request.get_json(force=True, silent=False) or {}
    token = (body.get("access_token") or "").strip()
    if len(token) < 10:
        return jsonify({"detail": "access_token required"}), 400
    db = _session()
    try:
        trip = db.get(Trip, trip_id)
        if not trip:
            return jsonify({"detail": "Trip not found"}), 404
        try:
            media = fetch_recent_media(token, limit=30)
        except Exception as e:
            return jsonify({"detail": f"Instagram sync failed: {e!s}"}), 400

        db.query(Reel).filter(Reel.trip_id == trip_id).delete()
        db.commit()

        for item in media:
            caption = item.get("caption")
            permalink = item.get("permalink")
            media_url = item.get("media_url") or item.get("thumbnail_url")
            db.add(
                Reel(
                    trip_id=trip_id,
                    source="instagram",
                    external_id=item.get("id"),
                    caption=caption,
                    permalink=permalink,
                    media_url=media_url,
                )
            )
        db.commit()
        db.refresh(trip)
        return jsonify(_trip_to_dict(db, trip))
    finally:
        db.close()


@app.post("/api/trips/<int:trip_id>/reels/import")
def import_reels(trip_id: int):
    body = request.get_json(force=True, silent=False) or {}
    rows = body.get("reels")
    if not isinstance(rows, list) or not rows:
        return jsonify({"detail": "No reels provided"}), 400
    db = _session()
    try:
        trip = db.get(Trip, trip_id)
        if not trip:
            return jsonify({"detail": "Trip not found"}), 404

        db.query(Reel).filter(Reel.trip_id == trip_id).delete()
        db.commit()

        for item in rows:
            if not isinstance(item, dict):
                continue
            db.add(
                Reel(
                    trip_id=trip_id,
                    source="manual",
                    external_id=item.get("external_id") or item.get("id"),
                    caption=item.get("caption") or item.get("text"),
                    permalink=item.get("permalink") or item.get("url"),
                    media_url=item.get("media_url"),
                )
            )
        db.commit()
        db.refresh(trip)
        return jsonify(_trip_to_dict(db, trip))
    finally:
        db.close()


DEMO_REELS = [
    {
        "caption": "Pastéis de Belém — the original Portuguese custard tarts in Lisbon 🇵🇹 #foodie #lisbon",
        "permalink": "https://example.com/demo/reel1",
    },
    {
        "caption": "Sunset from Miradouro da Senhora do Monte — best view over the Alfama rooftops",
        "permalink": "https://example.com/demo/reel2",
    },
    {
        "caption": "LX Factory brunch spot: The Therapist — industrial vibes + great coffee",
        "permalink": "https://example.com/demo/reel3",
    },
    {
        "caption": "Time Out Market for dinner — trying half a dozen small plates with friends",
        "permalink": "https://example.com/demo/reel4",
    },
]


@app.post("/api/trips/<int:trip_id>/reels/demo")
def load_demo_reels(trip_id: int):
    db = _session()
    try:
        trip = db.get(Trip, trip_id)
        if not trip:
            return jsonify({"detail": "Trip not found"}), 404
        db.query(Reel).filter(Reel.trip_id == trip_id).delete()
        db.commit()
        for d in DEMO_REELS:
            db.add(
                Reel(
                    trip_id=trip_id,
                    source="demo",
                    caption=d["caption"],
                    permalink=d["permalink"],
                )
            )
        db.commit()
        db.refresh(trip)
        return jsonify(_trip_to_dict(db, trip))
    finally:
        db.close()


@app.post("/api/trips/<int:trip_id>/extract")
def extract_places(trip_id: int):
    db = _session()
    try:
        trip = db.get(Trip, trip_id)
        if not trip:
            return jsonify({"detail": "Trip not found"}), 404
        reels = db.query(Reel).filter(Reel.trip_id == trip_id).order_by(Reel.id.asc()).all()
        if not reels:
            return jsonify({"detail": "No reels — sync Instagram, import JSON, or load demo."}), 400

        lat0, lng0 = ensure_destination_coords(trip.destination_query, trip.dest_lat, trip.dest_lng)
        trip.dest_lat, trip.dest_lng = lat0, lng0

        reel_payload = [{"caption": r.caption, "permalink": r.permalink, "id": r.id} for r in reels]
        try:
            items = extract_places_from_reels(trip.destination_query, reel_payload)
        except ValueError as e:
            return jsonify({"detail": str(e)}), 400
        except Exception as e:
            return jsonify({"detail": f"AI extraction failed: {e!s}"}), 502

        db.query(Place).filter(Place.trip_id == trip_id).delete()
        db.commit()

        seen_names: set[str] = set()
        for it in items:
            try:
                ridx = int(it.get("reel_index", -1))
            except (TypeError, ValueError):
                continue
            if ridx < 0 or ridx >= len(reels):
                continue
            name = (it.get("place_name") or "").strip()
            if not name:
                continue
            key = name.lower()
            if key in seen_names:
                continue
            try:
                conf = float(it.get("confidence") or 0)
            except (TypeError, ValueError):
                conf = 0
            if conf < 0.35:
                continue

            category = (it.get("category") or "").strip() or None
            try:
                visit_min = int(it.get("visit_duration_min") or 90)
            except (TypeError, ValueError):
                visit_min = 90
            open_m = parse_hhmm(it.get("open_hhmm"))
            close_m = parse_hhmm(it.get("close_hhmm"))
            if open_m is None or close_m is None:
                open_m, close_m = default_hours_for_category(category)

            q = f"{name}, {trip.destination_query}"
            coords = geocode_query(q)
            time.sleep(1.05)
            if not coords:
                continue
            plat, plng = coords
            dist = haversine_km(lat0, lng0, plat, plng)
            if dist > config.max_place_radius_km:
                continue

            seen_names.add(key)
            db.add(
                Place(
                    trip_id=trip_id,
                    reel_id=reels[ridx].id,
                    name=name,
                    category=category,
                    lat=plat,
                    lng=plng,
                    distance_km=round(dist, 2),
                    open_minute=open_m,
                    close_minute=close_m,
                    visit_duration_min=visit_min,
                    raw_note=((it.get("rationale") or "")[:500] or None),
                )
            )

        db.commit()
        db.refresh(trip)
        return jsonify(_trip_to_dict(db, trip))
    finally:
        db.close()


@app.post("/api/trips/<int:trip_id>/itinerary")
def make_itinerary(trip_id: int):
    db = _session()
    try:
        trip = db.get(Trip, trip_id)
        if not trip:
            return jsonify({"detail": "Trip not found"}), 404
        places = db.query(Place).filter(Place.trip_id == trip_id).order_by(Place.id.asc()).all()
        if not places:
            return jsonify({"detail": "No places — run extraction first."}), 400

        lat0, lng0 = ensure_destination_coords(trip.destination_query, trip.dest_lat, trip.dest_lng)
        trip.dest_lat, trip.dest_lng = lat0, lng0
        db.commit()

        pdicts = [
            {
                "id": p.id,
                "name": p.name,
                "category": p.category,
                "lat": p.lat,
                "lng": p.lng,
                "open_minute": p.open_minute,
                "close_minute": p.close_minute,
                "visit_duration_min": p.visit_duration_min,
            }
            for p in places
        ]
        payload = build_itinerary(
            trip.destination_query,
            lat0,
            lng0,
            trip.start_date,
            trip.end_date,
            pdicts,
        )
        row = Itinerary(trip_id=trip_id, payload_json=itinerary_to_json_payload(payload))
        db.add(row)
        db.commit()
        db.refresh(trip)
        return jsonify(_trip_to_dict(db, trip))
    finally:
        db.close()


@app.get("/")
def root():
    return send_from_directory(STATIC_DIR, "index.html")


def create_app():
    Base.metadata.create_all(bind=engine)
    return app


# For `flask --app app.main run` and gunicorn-style imports
create_app()


def run():
    from werkzeug.serving import run_simple

    Base.metadata.create_all(bind=engine)
    run_simple("127.0.0.1", config.port, app, use_reloader=False, use_debugger=False)


if __name__ == "__main__":
    run()
