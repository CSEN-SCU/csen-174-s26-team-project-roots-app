# Frank — Reel-to-itinerary prototype

Divergent prototype for **Roots**: turn Instagram reel captions (plus optional video metadata later) into a **geofenced place list** and a **draft day-by-day itinerary** with simple **hours** and **travel buffers**.

## Run locally

From `prototypes/frank`, create a venv and install deps **with the same Python you will use to run the app** (avoid a different `python` on your PATH, e.g. MSYS MinGW, which often has no `pip` and no installed packages).

**PowerShell (recommended on Windows):**

```powershell
cd prototypes/frank
py -3 -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
copy .env.example .env
# Add OPENAI_API_KEY to .env
python -m app.main
```

If your venv was created by another tool and has `bin` instead of `Scripts`:

```powershell
.\.venv\bin\python.exe -m pip install -r requirements.txt
.\.venv\bin\python.exe -m app.main
```

Open `http://127.0.0.1:8787/` (port from `PORT` in `.env`, default 8787).

## Stack

- **Frontend**: static HTML/CSS/JS (intro + planner)
- **Backend**: Flask (Python)
- **Database**: SQLite (`data/app.db`, gitignored)
- **AI**: OpenAI (JSON extraction from captions)
- **Geocoding**: OpenStreetMap Nominatim (no key)

## Instagram notes

Meta does **not** expose the private **Saved** collection to third-party apps. This build supports:

1. **Instagram Graph token** → fetches **recent media** as a stand-in for class demos.
2. **Manual JSON import** → paste objects with `caption` (closest to “my saved reels” if you copy captions locally).
3. **Demo reel set** → Lisbon-oriented sample captions; set destination to **Lisbon, Portugal** for best results.

Do **not** paste your Instagram password into the app—only developer tokens if you use route (1).

## Configuration

See `.env.example` for `OPENAI_API_KEY`, optional `OPENAI_MODEL`, and `PORT`.

Backend knobs in `app/config.py`: `max_place_radius_km`, `avg_urban_speed_kmh`.
