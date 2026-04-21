const $ = (id) => document.getElementById(id);

let tripId = null;

function setStatus(el, text, isError = false) {
  if (!el) return;
  el.textContent = text || "";
  el.style.color = isError ? "var(--accent)" : "";
}

async function api(path, opts = {}) {
  const res = await fetch(path, {
    headers: { "Content-Type": "application/json", ...(opts.headers || {}) },
    ...opts,
  });
  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  if (!res.ok) {
    const detail = data?.detail ?? data ?? res.statusText;
    throw new Error(typeof detail === "string" ? detail : JSON.stringify(detail));
  }
  return data;
}

function renderTrip(trip) {
  const places = $("place-list");
  const itOut = $("itinerary-out");
  places.innerHTML = "";
  itOut.innerHTML = "";

  (trip.places || []).forEach((p) => {
    const li = document.createElement("li");
    const cat = p.category ? `<span class="badge">${escapeHtml(p.category)}</span>` : "";
    li.innerHTML = `${cat}<strong>${escapeHtml(p.name)}</strong><br />
      <span class="muted">${p.distance_km != null ? `${p.distance_km} km from anchor · ` : ""}
      ${fmtMinutes(p.open_minute)}–${fmtMinutes(p.close_minute)} · ~${p.visit_duration_min} min visit</span>`;
    places.appendChild(li);
  });

  if (!trip.places?.length) {
    const li = document.createElement("li");
    li.textContent = "No places yet — import reels and run extraction.";
    places.appendChild(li);
  }

  const it = trip.itinerary;
  if (!it?.days?.length) {
    itOut.textContent = "No itinerary yet.";
    return;
  }

  it.days.forEach((day) => {
    const wrap = document.createElement("div");
    wrap.className = "day-block";
    const h = document.createElement("h4");
    h.textContent = day.date;
    wrap.appendChild(h);
    (day.blocks || []).forEach((b) => {
      const row = document.createElement("div");
      row.className = "slot";
      if (b.type === "visit") {
        row.innerHTML = `<strong>Visit</strong> · ${escapeHtml(b.name)} (${escapeHtml(
          b.category || "place"
        )}) · ${b.start}–${b.end}`;
      } else if (b.type === "travel") {
        row.innerHTML = `<strong>Travel</strong> · ~${b.minutes} min · ${b.start}–${b.end}`;
      } else {
        row.innerHTML = `<strong>Break</strong> · ${escapeHtml(b.label || "")} · ${b.start}–${b.end}`;
      }
      wrap.appendChild(row);
    });
    itOut.appendChild(wrap);
  });

  if (it.unscheduled_place_ids?.length) {
    const note = document.createElement("p");
    note.className = "muted";
    note.textContent = `Not scheduled this pass: ${it.unscheduled_place_ids.length} place(s) — extend dates or tighten radius in backend config.`;
    itOut.appendChild(note);
  }
}

function escapeHtml(s) {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function fmtMinutes(m) {
  if (m == null) return "?";
  const h = Math.floor(m / 60);
  const mi = m % 60;
  return `${String(h).padStart(2, "0")}:${String(mi).padStart(2, "0")}`;
}

function wireNav() {
  document.querySelectorAll(".nav-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".nav-btn").forEach((b) => b.classList.remove("is-active"));
      btn.classList.add("is-active");
      const view = btn.dataset.view;
      document.querySelectorAll(".view").forEach((v) => v.classList.remove("is-visible"));
      document.getElementById(`view-${view}`).classList.add("is-visible");
    });
  });
}

function setPlannerEnabled(enabled) {
  ["btn-sync-ig", "btn-demo", "btn-import", "btn-extract"].forEach((id) => {
    $(id).disabled = !enabled;
  });
}

function main() {
  wireNav();

  const today = new Date();
  const end = new Date(today);
  end.setDate(end.getDate() + 3);
  $("start-date").value = today.toISOString().slice(0, 10);
  $("end-date").value = end.toISOString().slice(0, 10);

  $("btn-create-trip").addEventListener("click", async () => {
    setStatus($("trip-status"), "");
    setStatus($("flow-status"), "");
    const destination = $("destination").value.trim();
    if (!destination) {
      setStatus($("trip-status"), "Enter a destination.", true);
      return;
    }
    try {
      const trip = await api("/api/trips", {
        method: "POST",
        body: JSON.stringify({
          destination,
          start_date: $("start-date").value,
          end_date: $("end-date").value,
        }),
      });
      tripId = trip.id;
      setStatus($("trip-status"), `Trip #${trip.id} ready (${trip.destination}).`);
      setPlannerEnabled(true);
      $("btn-itinerary").disabled = true;
      renderTrip(trip);
    } catch (e) {
      setStatus($("trip-status"), e.message, true);
    }
  });

  $("btn-sync-ig").addEventListener("click", async () => {
    if (!tripId) return;
    const token = $("ig-token").value.trim();
    if (!token) {
      setStatus($("flow-status"), "Paste an access token first.", true);
      return;
    }
    try {
      setStatus($("flow-status"), "Syncing Instagram…");
      const trip = await api(`/api/trips/${tripId}/reels/instagram`, {
        method: "POST",
        body: JSON.stringify({ access_token: token }),
      });
      setStatus($("flow-status"), `Loaded ${trip.reels.length} media item(s).`);
      renderTrip(trip);
    } catch (e) {
      setStatus($("flow-status"), e.message, true);
    }
  });

  $("btn-demo").addEventListener("click", async () => {
    if (!tripId) return;
    try {
      setStatus($("flow-status"), "Loading demo reels…");
      const trip = await api(`/api/trips/${tripId}/reels/demo`, { method: "POST" });
      setStatus($("flow-status"), `Demo reels loaded (${trip.reels.length}).`);
      renderTrip(trip);
    } catch (e) {
      setStatus($("flow-status"), e.message, true);
    }
  });

  $("btn-import").addEventListener("click", async () => {
    if (!tripId) return;
    let parsed;
    try {
      parsed = JSON.parse($("import-json").value || "[]");
    } catch {
      setStatus($("flow-status"), "JSON parse error.", true);
      return;
    }
    if (!Array.isArray(parsed) || !parsed.length) {
      setStatus($("flow-status"), "Provide a non-empty JSON array.", true);
      return;
    }
    const reels = parsed.map((row) => ({
      caption: row.caption ?? row.text ?? "",
      permalink: row.permalink ?? row.url ?? null,
      media_url: row.media_url ?? null,
      external_id: row.id ?? row.external_id ?? null,
    }));
    try {
      setStatus($("flow-status"), "Importing…");
      const trip = await api(`/api/trips/${tripId}/reels/import`, {
        method: "POST",
        body: JSON.stringify({ reels }),
      });
      setStatus($("flow-status"), `Imported ${trip.reels.length} reel(s).`);
      renderTrip(trip);
    } catch (e) {
      setStatus($("flow-status"), e.message, true);
    }
  });

  $("btn-extract").addEventListener("click", async () => {
    if (!tripId) return;
    try {
      setStatus($("flow-status"), "Extracting places (AI + geocode)… this can take a bit.");
      const trip = await api(`/api/trips/${tripId}/extract`, { method: "POST" });
      setStatus($("flow-status"), `Kept ${trip.places.length} place(s) near destination.`);
      $("btn-itinerary").disabled = trip.places.length === 0;
      renderTrip(trip);
    } catch (e) {
      setStatus($("flow-status"), e.message, true);
    }
  });

  $("btn-itinerary").addEventListener("click", async () => {
    if (!tripId) return;
    try {
      setStatus($("flow-status"), "Building itinerary…");
      const trip = await api(`/api/trips/${tripId}/itinerary`, { method: "POST" });
      setStatus($("flow-status"), "Itinerary drafted.");
      renderTrip(trip);
    } catch (e) {
      setStatus($("flow-status"), e.message, true);
    }
  });
}

main();
