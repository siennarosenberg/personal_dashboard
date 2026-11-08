// ---------- Small helpers ----------
const $ = (id) => document.getElementById(id);
const pad = (n) => String(n).padStart(2, "0");
// Local-time date keys like "2026-11-08" (avoids the UTC off-by-one you get from toISOString)
const dateKey = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const parseKey = (k) => { const [y, m, d] = k.split("-").map(Number); return new Date(y, m - 1, d); };
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

// Local storage can be unavailable (private windows etc.), so never let it crash the page.
function load(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch { return fallback; }
}
function save(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* ignore */ }
}

// Everything from outside (news titles, links) is inserted with textContent / checked URLs,
// never innerHTML, so a malicious headline can't inject code into your page.
function safeUrl(url) {
  try {
    const u = new URL(url);
    return u.protocol === "https:" || u.protocol === "http:" ? u.href : "";
  } catch { return ""; }
}

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}
function delButton(onClick) {
  const b = el("button", "del", "×");
  b.type = "button";
  b.title = "Remove";
  b.addEventListener("click", onClick);
  return b;
}

// ---------- Header: date + greeting ----------
function renderHeader() {
  const now = new Date();
  $("date").textContent = now.toLocaleDateString("en-US", {
    weekday: "long", month: "long", day: "numeric",
  });
  const h = now.getHours();
  $("greeting").textContent =
    h < 12 ? "Good morning, Sienna" : h < 18 ? "Good afternoon, Sienna" : "Good evening, Sienna";
}

// ---------- Seasonal themes ----------
const THEMES = [
  { id: "winter", label: "❄ Winter" },
  { id: "spring", label: "🌿 Spring" },
  { id: "summer", label: "☀ Summer" },
  { id: "autumn", label: "🍂 Autumn" },
];
function applyTheme(id) {
  const t = THEMES.find((x) => x.id === id) || THEMES[0];
  document.documentElement.dataset.theme = t.id;
  $("theme-btn").textContent = t.label;
  save("theme", t.id);
}
$("theme-btn").addEventListener("click", () => {
  const current = document.documentElement.dataset.theme;
  const i = THEMES.findIndex((x) => x.id === current);
  applyTheme(THEMES[(i + 1) % THEMES.length].id);
});

// ---------- Weather (Open-Meteo, no key needed) ----------
const WEATHER_CODES = {
  0: "Clear", 1: "Mostly clear", 2: "Partly cloudy", 3: "Overcast",
  45: "Fog", 48: "Fog", 51: "Light drizzle", 53: "Drizzle", 55: "Heavy drizzle",
  61: "Light rain", 63: "Rain", 65: "Heavy rain", 71: "Light snow", 73: "Snow",
  75: "Heavy snow", 80: "Showers", 81: "Showers", 82: "Heavy showers",
  95: "Thunderstorm", 96: "Thunderstorm", 99: "Thunderstorm",
};
async function renderWeather() {
  const box = $("weather");
  try {
    const params = new URLSearchParams({
      latitude: "40.4168", longitude: "-3.7038",
      current: "temperature_2m,weather_code", timezone: "auto",
    });
    const res = await fetch("https://api.open-meteo.com/v1/forecast?" + params);
    if (!res.ok) throw new Error("bad status " + res.status);
    const c = (await res.json()).current;
    const desc = WEATHER_CODES[c.weather_code];
    box.textContent = `Madrid · ${Math.round(c.temperature_2m)}°C` + (desc ? ` · ${desc}` : "");
  } catch {
    box.textContent = "Weather unavailable";
  }
}

// ---------- Headlines (from news.js, written by update_news.py) ----------
function renderNews() {
  const list = $("news-list");
  const data = window.NEWS;
  if (!data || !data.outlets || !data.outlets.length) {
    list.textContent = "No headlines yet. Run update_news.py to fetch them.";
    return;
  }
  if (data.updated) {
    $("news-updated").textContent = "Updated " + new Date(data.updated).toLocaleTimeString("en-US", {
      hour: "numeric", minute: "2-digit",
    });
  }
  data.outlets.forEach((outlet) => {
    list.appendChild(el("p", "outlet", outlet.name));
    if (!outlet.items.length) {
      list.appendChild(el("p", "muted", "Couldn't load this feed."));
      return;
    }
    outlet.items.forEach((item) => {
      const a = el("a", "headline", item.title);
      a.href = safeUrl(item.link) || "#";
      a.target = "_blank";
      a.rel = "noopener noreferrer";
      list.appendChild(a);
    });
  });
}

// ---------- Calendar + day agenda ----------
let events = load("events", {}); // { "2026-11-08": [{time, text}] }

// One-time import of events saved by the first version of the dashboard
(function migrateOldSchedule() {
  try {
    if (load("events-migrated", false)) return;
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith("sched-")) {
        const list = load(k, []);
        if (list.length) events[k.slice(6)] = (events[k.slice(6)] || []).concat(list);
      }
    }
    save("events", events);
    save("events-migrated", true);
  } catch { /* ignore */ }
})();

const today = new Date();
let selected = dateKey(today);
let view = new Date(today.getFullYear(), today.getMonth(), 1);

function renderCalendar() {
  $("cal-title").textContent = view.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  const grid = $("cal-grid");
  grid.replaceChildren();
  ["M", "T", "W", "T", "F", "S", "S"].forEach((d) => grid.appendChild(el("div", "dow", d)));

  const offset = (view.getDay() + 6) % 7; // weeks start on Monday
  for (let i = 0; i < offset; i++) grid.appendChild(el("div"));
  const daysInMonth = new Date(view.getFullYear(), view.getMonth() + 1, 0).getDate();
  for (let day = 1; day <= daysInMonth; day++) {
    const key = dateKey(new Date(view.getFullYear(), view.getMonth(), day));
    const b = el("button", "cal-day", String(day));
    b.type = "button";
    if (key === dateKey(today)) b.classList.add("today");
    if (key === selected) b.classList.add("selected");
    if ((events[key] || []).length) b.classList.add("has-events");
    b.addEventListener("click", () => {
      selected = key;
      renderCalendar();
      renderAgenda();
    });
    grid.appendChild(b);
  }
}
$("cal-prev").addEventListener("click", () => {
  view = new Date(view.getFullYear(), view.getMonth() - 1, 1);
  renderCalendar();
});
$("cal-next").addEventListener("click", () => {
  view = new Date(view.getFullYear(), view.getMonth() + 1, 1);
  renderCalendar();
});
$("cal-today").addEventListener("click", () => {
  selected = dateKey(today);
  view = new Date(today.getFullYear(), today.getMonth(), 1);
  renderCalendar();
  renderAgenda();
});

function renderAgenda() {
  const isToday = selected === dateKey(today);
  $("agenda-title").textContent = isToday
    ? "Today"
    : parseKey(selected).toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" });

  const ul = $("sched-list");
  ul.replaceChildren();
  const list = events[selected] || [];
  list.sort((a, b) => (a.time || "99:99").localeCompare(b.time || "99:99"));
  if (!list.length) {
    ul.appendChild(el("li", "empty", "Nothing planned."));
    return;
  }
  list.forEach((ev, i) => {
    const li = el("li");
    li.append(
      el("span", "time", ev.time || "—"),
      el("span", "label", ev.text),
      delButton(() => {
        list.splice(i, 1);
        if (!list.length) delete events[selected];
        save("events", events);
        renderAgenda();
        renderCalendar();
      })
    );
    ul.appendChild(li);
  });
}
$("sched-form").addEventListener("submit", (e) => {
  e.preventDefault();
  const text = $("sched-text").value.trim();
  if (!text) return;
  (events[selected] ||= []).push({ time: $("sched-time").value, text });
  save("events", events);
  $("sched-text").value = "";
  $("sched-time").value = "";
  renderAgenda();
  renderCalendar();
});

// ---------- To-do list ----------
let todos = load("todos", []);

function renderTodos() {
  const ul = $("todo-list");
  ul.replaceChildren();
  const open = todos.filter((t) => !t.done).length;
  $("todo-count").textContent = todos.length ? `${open} left` : "";
  if (!todos.length) {
    ul.appendChild(el("li", "empty", "All clear."));
    return;
  }
  todos.forEach((todo, i) => {
    const li = el("li");
    if (todo.done) li.classList.add("done");
    const box = el("input");
    box.type = "checkbox";
    box.checked = todo.done;
    box.addEventListener("change", () => {
      todo.done = box.checked;
      save("todos", todos);
      renderTodos();
    });
    li.append(
      box,
      el("span", "label", todo.text),
      delButton(() => {
        todos.splice(i, 1);
        save("todos", todos);
        renderTodos();
      })
    );
    ul.appendChild(li);
  });
}
$("todo-form").addEventListener("submit", (e) => {
  e.preventDefault();
  const text = $("todo-text").value.trim();
  if (!text) return;
  todos.push({ text, done: false });
  save("todos", todos);
  $("todo-text").value = "";
  renderTodos();
});

// ---------- Weekly study tracker ----------
// courses: [{id, name, goal}]  (goal = default hours per week, carried into each new week)
// study:   { "<monday date>": { "<course id>": {goal: hours, done: minutes} } }
let courses = load("courses", []);
let study = load("study", {});

function mondayOf(d) {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  x.setDate(x.getDate() - ((x.getDay() + 6) % 7));
  return x;
}
let weekStart = mondayOf(today);
const STEP = 30;        // minutes per +/- click
const SLIDER_STEP = 5;  // minutes per notch while dragging
const hrs = (m) => String(Math.round((m / 60) * 10) / 10);

function getEntry(course, key = dateKey(weekStart)) {
  const week = study[key];
  let e = week && week[course.id];
  // older version stored seven per-day numbers; fold them into one total
  if (Array.isArray(e)) e = { goal: course.goal, done: e.reduce((a, b) => a + b, 0) };
  return e || { goal: course.goal, done: 0 };
}
function setEntry(course, patch, key = dateKey(weekStart)) {
  const week = (study[key] ||= {});
  week[course.id] = { ...getEntry(course, key), ...patch };
  save("study", study);
}
// Used by the focus timer: always adds to the current week
function addStudyMinutes(courseId, minutes) {
  const course = courses.find((c) => c.id === courseId);
  if (!course) return;
  const key = dateKey(mondayOf(today));
  setEntry(course, { done: Math.min(40 * 60, getEntry(course, key).done + minutes) }, key);
  renderStudy();
}

function renderStudy() {
  const weekEnd = new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate() + 6);
  const fmt = (d) => d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  $("week-label").textContent = `${fmt(weekStart)} – ${fmt(weekEnd)}`;

  const box = $("study-list");
  box.replaceChildren();
  renderTimerCourses();
  if (!courses.length) {
    box.appendChild(el("p", "empty", "Add your courses below and set a weekly goal in hours."));
    return;
  }

  courses.forEach((course, ci) => {
    const entry = getEntry(course);
    const goalMin = entry.goal * 60;
    const maxMin = Math.max(goalMin, entry.done);
    const card = el("div", "course");

    const doneText = el("span", "course-total");
    const slider = el("input", "slider");
    slider.type = "range";
    slider.min = "0";
    slider.max = String(maxMin);
    slider.step = String(SLIDER_STEP);
    slider.value = String(entry.done);
    slider.setAttribute("aria-label", `${course.name}: hours studied this week`);

    // Update the text, the filled part of the bar and the green "goal met" state
    function paint(minutes) {
      doneText.textContent = `${hrs(minutes)} / `;
      slider.style.setProperty("--pct", (maxMin > 0 ? (minutes / maxMin) * 100 : 0) + "%");
      card.classList.toggle("met", goalMin > 0 && minutes >= goalMin);
    }
    paint(entry.done);

    // Dragging only repaints (a full re-render would drop the drag); the value saves as you move
    slider.addEventListener("input", () => {
      const v = Number(slider.value);
      setEntry(course, { done: v });
      paint(v);
    });

    const goalInput = el("input", "goal-edit");
    goalInput.type = "number";
    goalInput.min = "0.5";
    goalInput.max = "40";
    goalInput.step = "0.5";
    goalInput.value = entry.goal;
    goalInput.title = "Goal for this week (hours)";
    goalInput.setAttribute("aria-label", `${course.name} weekly goal in hours`);
    goalInput.addEventListener("change", () => {
      const v = parseFloat(goalInput.value);
      if (v > 0 && v <= 40) {
        setEntry(course, { goal: v });
        if (dateKey(weekStart) === dateKey(mondayOf(today))) {
          course.goal = v; // next week starts from this goal
          save("courses", courses);
        }
      }
      renderStudy();
    });

    const name = el("span", "course-name", course.name);
    name.title = course.name;

    const meta = el("div", "course-meta");
    meta.append(
      doneText,
      goalInput,
      el("span", "course-total", "h"),
      delButton(() => {
        if (!confirm(`Remove "${course.name}" and its study log?`)) return;
        courses.splice(ci, 1);
        Object.values(study).forEach((week) => delete week[course.id]);
        save("courses", courses);
        save("study", study);
        renderStudy();
      })
    );

    const nudge = (delta) => {
      setEntry(course, { done: Math.max(0, Math.min(40 * 60, entry.done + delta)) });
      renderStudy();
    };
    const minus = el("button", "nudge", "−");
    const plus = el("button", "nudge", "+");
    minus.type = plus.type = "button";
    minus.setAttribute("aria-label", `${course.name}: minus 30 minutes`);
    plus.setAttribute("aria-label", `${course.name}: plus 30 minutes`);
    minus.addEventListener("click", () => nudge(-STEP));
    plus.addEventListener("click", () => nudge(STEP));

    const row = el("div", "bar-row");
    row.append(minus, slider, plus);

    card.append(name, row, meta);
    box.appendChild(card);
  });
}
$("week-prev").addEventListener("click", () => {
  weekStart = new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate() - 7);
  renderStudy();
});
$("week-next").addEventListener("click", () => {
  weekStart = new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate() + 7);
  renderStudy();
});
$("course-form").addEventListener("submit", (e) => {
  e.preventDefault();
  const name = $("course-name").value.trim();
  const goal = parseFloat($("course-goal").value);
  if (!name || !(goal > 0 && goal <= 40)) return;
  courses.push({ id: uid(), name, goal });
  save("courses", courses);
  $("course-name").value = "";
  renderStudy();
});

// ---------- Internships & scholarships ----------
const STATUSES = ["Researching", "Preparing", "Applied", "Waiting", "Done"];
let opps = load("opps", null);
if (opps === null) {
  // Starter list (names only: add the real deadlines yourself once you've checked the official pages)
  opps = [
    "CBYX (Congress-Bundestag Youth Exchange)",
    "DAAD RISE",
    "Fulbright–Imperial College London master's",
  ].map((name) => ({ id: uid(), name, deadline: "", link: "", status: "Researching" }));
  save("opps", opps);
}

function daysLeft(deadline) {
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  return Math.round((parseKey(deadline) - start) / 86400000);
}
function sortOpps(list) {
  const rank = (o) => (o.status === "Done" ? 2 : o.deadline ? 0 : 1);
  return [...list].sort((a, b) =>
    rank(a) - rank(b) || (a.deadline || "").localeCompare(b.deadline || ""));
}

function renderOpps() {
  const ul = $("opp-list");
  ul.replaceChildren();
  $("opp-count").textContent = opps.length ? `${opps.filter((o) => o.status !== "Done").length} active` : "";
  if (!opps.length) {
    ul.appendChild(el("li", "empty", "Nothing tracked yet."));
    return;
  }
  sortOpps(opps).forEach((o) => {
    const li = el("li", "opp" + (o.status === "Done" ? " finished" : ""));

    const main = el("div", "opp-main");
    const url = safeUrl(o.link);
    if (url) {
      const a = el("a", "opp-name", o.name);
      a.href = url;
      a.target = "_blank";
      a.rel = "noopener noreferrer";
      main.appendChild(a);
    } else {
      main.appendChild(el("span", "opp-name", o.name));
    }
    if (o.deadline && o.status !== "Done") {
      const n = daysLeft(o.deadline);
      const text = n < 0 ? "deadline passed" : n === 0 ? "due today" : n === 1 ? "due tomorrow" : `${n} days left`;
      main.appendChild(el("span", "sub" + (n >= 0 && n <= 14 ? " urgent" : ""), text));
    } else if (!o.deadline) {
      main.appendChild(el("span", "sub", "no deadline set"));
    }

    const date = el("input");
    date.type = "date";
    date.value = o.deadline;
    date.setAttribute("aria-label", `${o.name} deadline`);
    date.addEventListener("change", () => {
      o.deadline = date.value;
      save("opps", opps);
      renderOpps();
    });

    const sel = el("select");
    sel.setAttribute("aria-label", `${o.name} status`);
    STATUSES.forEach((s) => {
      const opt = el("option", "", s);
      opt.value = s;
      if (s === o.status) opt.selected = true;
      sel.appendChild(opt);
    });
    sel.addEventListener("change", () => {
      o.status = sel.value;
      save("opps", opps);
      renderOpps();
    });

    li.append(main, date, sel, delButton(() => {
      opps = opps.filter((x) => x.id !== o.id);
      save("opps", opps);
      renderOpps();
    }));
    ul.appendChild(li);
  });
}
$("opp-form").addEventListener("submit", (e) => {
  e.preventDefault();
  const name = $("opp-name").value.trim();
  if (!name) return;
  opps.push({
    id: uid(),
    name,
    deadline: $("opp-date").value,
    link: safeUrl($("opp-link").value.trim()),
    status: "Researching",
  });
  save("opps", opps);
  $("opp-name").value = "";
  $("opp-date").value = "";
  $("opp-link").value = "";
  renderOpps();
});

// ---------- Next trip countdown ----------
// trips: [{id, name, date, lat, lon}]  (lat/lon come from Open-Meteo's free geocoding, no key)
let trips = load("trips", []).filter((t) => t.date >= dateKey(today)); // drop trips that already happened
const geoTried = new Set();

async function geocode(name) {
  try {
    const res = await fetch("https://geocoding-api.open-meteo.com/v1/search?" +
      new URLSearchParams({ name, count: "1", language: "en" }));
    if (!res.ok) return null;
    const hit = ((await res.json()).results || [])[0];
    return hit ? { lat: hit.latitude, lon: hit.longitude } : null;
  } catch { return null; }
}

async function paintTripWeather(trip, target) {
  const n = daysLeft(trip.date);
  if (trip.lat == null) {
    if (!geoTried.has(trip.id)) {
      geoTried.add(trip.id);
      const geo = await geocode(trip.name);
      if (geo) { Object.assign(trip, geo); save("trips", trips); }
    }
    if (trip.lat == null) { target.textContent = "Couldn't find that place for a forecast."; return; }
  }
  if (n > 15) { target.textContent = "Forecast appears 15 days before the trip."; return; }
  try {
    const params = new URLSearchParams({
      latitude: trip.lat, longitude: trip.lon,
      daily: "temperature_2m_max,temperature_2m_min,precipitation_probability_max",
      start_date: trip.date, end_date: trip.date, timezone: "auto",
    });
    const res = await fetch("https://api.open-meteo.com/v1/forecast?" + params);
    if (!res.ok) throw new Error("bad status");
    const d = (await res.json()).daily;
    target.textContent =
      `${Math.round(d.temperature_2m_min[0])}° – ${Math.round(d.temperature_2m_max[0])}°C · ${d.precipitation_probability_max[0]}% rain`;
  } catch { target.textContent = "Forecast unavailable."; }
}

function renderTrips() {
  const box = $("trip-box");
  box.replaceChildren();
  const upcoming = [...trips].sort((a, b) => a.date.localeCompare(b.date));
  if (!upcoming.length) {
    box.appendChild(el("p", "empty", "Add a trip to start a countdown."));
    return;
  }
  const remove = (t) => delButton(() => {
    trips = trips.filter((x) => x.id !== t.id);
    save("trips", trips);
    renderTrips();
  });
  const fmtDate = (k) => parseKey(k).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });

  const first = upcoming[0];
  const n = daysLeft(first.date);
  const top = el("div", "trip-top");
  top.append(
    el("span", "big-num", n === 0 ? "Today" : String(n)),
    el("span", "big-unit", n === 0 ? "" : n === 1 ? "day to go" : "days to go"),
    remove(first)
  );
  const weather = el("p", "trip-weather", "…");
  box.append(top, el("p", "trip-name", first.name), el("p", "muted", fmtDate(first.date)), weather);
  paintTripWeather(first, weather);

  const rest = upcoming.slice(1, 4);
  if (rest.length) {
    const ul = el("ul", "list trip-more");
    rest.forEach((t) => {
      const li = el("li");
      li.append(
        el("span", "label", t.name),
        el("span", "muted", `${daysLeft(t.date)} days`),
        remove(t)
      );
      ul.appendChild(li);
    });
    box.appendChild(ul);
  }
}
$("trip-form").addEventListener("submit", (e) => {
  e.preventDefault();
  const name = $("trip-name").value.trim();
  const date = $("trip-date").value;
  if (!name || !date || date < dateKey(today)) return;
  trips.push({ id: uid(), name, date, lat: null, lon: null });
  save("trips", trips);
  $("trip-name").value = "";
  $("trip-date").value = "";
  renderTrips();
});

// ---------- Focus timer ----------
const PRESETS = [
  { label: "25 / 5 min", focus: 25, brk: 5 },
  { label: "50 / 10 min", focus: 50, brk: 10 },
];
const timer = { preset: Math.min(load("timer-preset", 0), PRESETS.length - 1), mode: "focus", remaining: 0, endAt: null, tick: null };
let sessions = load("sessions", {}); // { "<date>": number of finished focus sessions }

const presetMinutes = () => {
  const p = PRESETS[timer.preset];
  return timer.mode === "focus" ? p.focus : p.brk;
};
function paintTimer() {
  const s = Math.max(0, Math.ceil(timer.remaining));
  const mmss = `${pad(Math.floor(s / 60))}:${pad(s % 60)}`;
  $("timer-time").textContent = mmss;
  $("timer-mode").textContent = timer.mode === "focus" ? "Focus" : "Break";
  $("timer-face").classList.toggle("break", timer.mode === "break");
  $("timer-start").textContent = timer.endAt ? "Pause" : "Start";
  document.title = timer.endAt ? `${mmss} · ${timer.mode === "focus" ? "Focus" : "Break"}` : "Home";
}
function stopTicking() {
  clearInterval(timer.tick);
  timer.tick = null;
  timer.endAt = null;
}
function resetTimer() {
  stopTicking();
  timer.remaining = presetMinutes() * 60;
  paintTimer();
}
function beep() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.frequency.value = 660;
    osc.connect(gain);
    gain.connect(ctx.destination);
    gain.gain.setValueAtTime(0.0001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.2, ctx.currentTime + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.7);
    osc.start();
    osc.stop(ctx.currentTime + 0.75);
  } catch { /* sound is optional */ }
}
function finishTimer() {
  stopTicking();
  beep();
  if (timer.mode === "focus") {
    const courseId = $("timer-course").value;
    if (courseId) addStudyMinutes(courseId, presetMinutes());
    sessions[dateKey(today)] = (sessions[dateKey(today)] || 0) + 1;
    save("sessions", sessions);
    timer.mode = "break";
  } else {
    timer.mode = "focus";
  }
  timer.remaining = presetMinutes() * 60;
  paintTimer();
  renderSessions();
}
function startPause() {
  if (timer.endAt) { // pause
    timer.remaining = (timer.endAt - Date.now()) / 1000;
    stopTicking();
  } else {           // start / resume (uses the clock, so it stays accurate in a background tab)
    timer.endAt = Date.now() + timer.remaining * 1000;
    timer.tick = setInterval(() => {
      timer.remaining = (timer.endAt - Date.now()) / 1000;
      if (timer.remaining <= 0) finishTimer(); else paintTimer();
    }, 250);
  }
  paintTimer();
}
function renderSessions() {
  const n = sessions[dateKey(today)] || 0;
  $("timer-sessions").textContent = n ? `${n} focus session${n === 1 ? "" : "s"} today` : "";
}
function renderTimerCourses() {
  const sel = $("timer-course");
  const keep = sel.value || load("timer-course", "");
  sel.replaceChildren();
  const none = el("option", "", "Nothing");
  none.value = "";
  sel.appendChild(none);
  courses.forEach((c) => {
    const o = el("option", "", c.name);
    o.value = c.id;
    sel.appendChild(o);
  });
  sel.value = courses.some((c) => c.id === keep) ? keep : "";
}
$("timer-course").addEventListener("change", () => save("timer-course", $("timer-course").value));
$("timer-start").addEventListener("click", startPause);
$("timer-reset").addEventListener("click", resetTimer);
$("timer-skip").addEventListener("click", () => {
  timer.mode = timer.mode === "focus" ? "break" : "focus";
  resetTimer();
});
PRESETS.forEach((p, i) => {
  const o = el("option", "", p.label);
  o.value = String(i);
  $("timer-preset").appendChild(o);
});
$("timer-preset").value = String(timer.preset);
$("timer-preset").addEventListener("change", () => {
  timer.preset = Number($("timer-preset").value);
  save("timer-preset", timer.preset);
  resetTimer();
});

// ---------- Security log ----------
let seclog = load("seclog", []); // [{id, date, title, note}]

function renderSeclog() {
  const ul = $("sec-list");
  ul.replaceChildren();
  const weekAgo = dateKey(new Date(today.getFullYear(), today.getMonth(), today.getDate() - 6));
  const recent = seclog.filter((x) => x.date >= weekAgo).length;
  $("sec-count").textContent = seclog.length ? `${recent} this week · ${seclog.length} total` : "";
  if (!seclog.length) {
    ul.appendChild(el("li", "empty", "Log each TryHackMe room, CTF or topic you work on."));
    return;
  }
  [...seclog].reverse().slice(0, 8).forEach((entry) => {
    const li = el("li", "sec");
    const body = el("div", "sec-body");
    body.appendChild(el("span", "sec-title", entry.title));
    if (entry.note) body.appendChild(el("span", "sec-note", entry.note));
    li.append(
      el("span", "when", parseKey(entry.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })),
      body,
      delButton(() => {
        seclog = seclog.filter((x) => x.id !== entry.id);
        save("seclog", seclog);
        renderSeclog();
      })
    );
    ul.appendChild(li);
  });
}
$("sec-form").addEventListener("submit", (e) => {
  e.preventDefault();
  const title = $("sec-title").value.trim();
  if (!title) return;
  seclog.push({ id: uid(), date: dateKey(new Date()), title, note: $("sec-note").value.trim() });
  save("seclog", seclog);
  $("sec-title").value = "";
  $("sec-note").value = "";
  renderSeclog();
});

// ---------- Start ----------
applyTheme(load("theme", "winter"));
renderHeader();
renderWeather();
renderNews();
renderCalendar();
renderAgenda();
renderTodos();
renderStudy();
renderTrips();
resetTimer();
renderSessions();
renderOpps();
renderSeclog();

// Left open overnight as your start page? Reload when the date changes (unless the timer is running).
setInterval(() => {
  if (dateKey(new Date()) !== dateKey(today) && !timer.endAt) location.reload();
}, 60000);
