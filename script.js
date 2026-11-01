
"use strict";

/* PROJECT NEVER STOP - INFINITE 30 PRO */

const STORAGE_KEY = "project_never_stop_infinite30_v1";

const $ = id => document.getElementById(id);

const today = () => {
  const d = new Date();
  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, "0"),
    String(d.getDate()).padStart(2, "0")
  ].join("-");
};

const uid = () =>
  window.crypto?.randomUUID?.() ||
  Date.now().toString(36) + Math.random().toString(36).slice(2);

const quotes = [
  "Discipline beats motivation.",
  "Small steps every day create massive results.",
  "Keep the promise you made to yourself.",
  "Consistency is your superpower.",
  "One more day. One more victory.",
  "Never stop showing up.",
  "Your future is built by today's actions.",
  "No excuses. Just progress."
];

function createDay(number) {
  return {
    id: uid(),
    number,
    morning: false,
    evening: false
  };
}

function createChallenge(name) {
  return {
    id: uid(),
    name,
    paused: false,
    archived: false,
    nextNumber: 31,
    activeDays: Array.from(
      { length: 30 },
      (_, i) => createDay(i + 1)
    ),
    history: [],
    events: [],
    journal: {}
  };
}

function defaultState() {
  const c = createChallenge("My Daily Goal");

  return {
    version: 1,
    theme: "dark",
    selectedId: c.id,
    challenges: [c]
  };
}

function loadState() {
  try {
    const saved = JSON.parse(
      localStorage.getItem(STORAGE_KEY)
    );

    if (
      !saved ||
      saved.version !== 1 ||
      !Array.isArray(saved.challenges) ||
      !saved.challenges.length
    ) {
      return defaultState();
    }

    saved.challenges.forEach(c => {
      c.history ||= [];
      c.events ||= [];
      c.journal ||= {};
      c.activeDays ||= [];
      c.nextNumber ||= 31;

      while (c.activeDays.length < 30) {
        c.activeDays.push(createDay(c.nextNumber++));
      }

      if (c.activeDays.length > 30) {
        c.activeDays = c.activeDays.slice(0, 30);
      }
    });

    if (!saved.challenges.some(
      c => c.id === saved.selectedId
    )) {
      saved.selectedId = saved.challenges[0].id;
    }

    return saved;
  } catch {
    return defaultState();
  }
}

let state = loadState();

function save() {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(state)
    );
  } catch {
    toast("Storage error! Please export a backup.");
  }
}

function activeChallenge() {
  return state.challenges.find(
    c => c.id === state.selectedId
  );
}

function toast(message) {
  const container = $("toastContainer");

  if (!container) return;

  const item = document.createElement("div");
  item.className = "toast";
  item.textContent = message;

  container.appendChild(item);

  setTimeout(() => item.remove(), 3000);
}

/* PART 2 - DASHBOARD & DAILY TICKS */

/* THEME */

function applyTheme() {
  const dark = window.matchMedia &&
    window.matchMedia("(prefers-color-scheme: dark)").matches;

  const light = state.theme === "light" ||
    (state.theme === "system" && !dark);

  document.body.classList.toggle("light-theme", light);

  if ($("themeToggle")) {
    $("themeToggle").textContent =
      state.theme === "light" ? "☀️" :
      state.theme === "system" ? "💻" : "🌙";
  }
}

function cycleTheme() {
  const modes = ["dark", "light", "system"];

  state.theme = modes[
    (modes.indexOf(state.theme) + 1) % modes.length
  ];

  save();
  applyTheme();
  toast("Theme: " + state.theme);
}

/* STATISTICS */

function allEvents() {
  return state.challenges.flatMap(c => c.events);
}

function completedTotal() {
  return state.challenges.reduce(
    (sum, c) => sum + c.history.length, 0
  );
}

function totalStars() {
  return allEvents().filter(
    e => e.type === "tick"
  ).length;
}

function noZeroDays() {
  return new Set(
    allEvents()
      .filter(e => e.type === "tick")
      .map(e => e.date)
  ).size;
}

function getStreak(c) {
  const dates = [...new Set(
    c.history.map(h => h.date)
  )].sort();

  if (!dates.length) {
    return { current: 0, best: 0 };
  }

  let best = 1;
  let run = 1;

  for (let i = 1; i < dates.length; i++) {
    const a = new Date(dates[i - 1] + "T12:00:00");
    const b = new Date(dates[i] + "T12:00:00");

    const diff = Math.round(
      (b - a) / 86400000
    );

    if (diff === 1) {
      run++;
      best = Math.max(best, run);
    } else if (diff > 1) {
      run = 1;
    }
  }

  const last = new Date(
    dates[dates.length - 1] + "T12:00:00"
  );

  const now = new Date(today() + "T12:00:00");

  const age = Math.round(
    (now - last) / 86400000
  );

  return {
    current: age <= 1 ? run : 0,
    best
  };
}

/* DASHBOARD */

function renderDashboard() {
  const c = activeChallenge();

  if (!c) return;

  const streak = getStreak(c);

  $("lifetimeDays").textContent = completedTotal();
  $("totalStars").textContent = totalStars() + " ⭐";
  $("totalTicks").textContent = totalStars();
  $("noZeroDays").textContent = noZeroDays();

  $("currentStreak").textContent =
    streak.current + " 🔥";

  $("bestStreak").textContent =
    streak.best + " 🏆";

  const progress = c.history.length % 30;

  $("windowProgress").textContent =
    progress + "/30";

  $("windowProgressBar").style.width =
    (progress / 30 * 100) + "%";

  $("windowMessage").textContent =
    progress + " completed days in your current cycle.";

  $("activeChallengeName").textContent = c.name;

  renderChallenges();
  renderTicks();

  $("motivationText").textContent =
    quotes[new Date().getDate() % quotes.length];
}

/* CHALLENGE LIST */

function renderChallenges() {
  const container = $("challengeList");
  container.replaceChildren();

  state.challenges
    .filter(c => !c.archived)
    .forEach(c => {
      const card = document.createElement("div");
      card.className = "challenge-card";

      const title = document.createElement("h3");
      title.textContent = c.name;

      const info = document.createElement("p");

      info.textContent =
        c.history.length + " completed days • " +
        c.events.filter(e => e.type === "tick").length +
        " stars";

      const actions = document.createElement("div");

      actions.style.cssText =
        "display:flex;gap:7px;flex-wrap:wrap;margin-top:12px";

      function button(label, callback) {
        const b = document.createElement("button");

        b.className = "primary-btn";
        b.textContent = label;

        b.addEventListener("click", callback);

        actions.appendChild(b);
      }

      button(
        c.id === state.selectedId ? "Selected ✓" : "Select",
        () => {
          state.selectedId = c.id;
          save();
          render();
        }
      );

      button("Edit", () => editChallenge(c.id));

      button(
        c.paused ? "Resume" : "Pause",
        () => togglePause(c.id)
      );

      button(
        "Archive",
        () => archiveChallenge(c.id)
      );

      card.append(title, info, actions);
      container.appendChild(card);
    });
}

/* MORNING AND EVENING DISPLAY */

function renderTicks() {
  const c = activeChallenge();
  const day = c.activeDays[0];

  const morning = $("morningTick");
  const evening = $("eveningTick");

  morning.classList.toggle(
    "completed", day.morning
  );

  evening.classList.toggle(
    "completed", day.evening
  );

  morning.querySelector("small").textContent =
    day.morning ? "✓ Completed" : "Not completed";

  evening.querySelector("small").textContent =
    day.evening ? "✓ Completed" : "Not completed";

  morning.disabled = c.paused || day.morning;
  evening.disabled = c.paused || day.evening;

  $("dailyMessage").textContent = c.paused
    ? "Challenge paused."
    : "Day " + day.number +
      " — Two ticks. One completed day.";
}

/* COMPLETE TICK */

function completeTick(type) {
  const c = activeChallenge();

  if (c.paused) {
    toast("Resume challenge first.");
    return;
  }

  const day = c.activeDays[0];

  if (day[type]) return;

  day[type] = true;

  c.events.push({
    id: uid(),
    type: "tick",
    tick: type,
    dayId: day.id,
    date: today(),
    timestamp: Date.now()
  });

  if (day.morning && day.evening) {
    c.history.push({
      ...day,
      date: today(),
      completedAt: Date.now()
    });

    c.activeDays.shift();

    c.activeDays.push(
      createDay(c.nextNumber++)
    );

    c.events.push({
      id: uid(),
      type: "completion",
      dayId: day.id,
      date: today(),
      timestamp: Date.now()
    });

    toast("🎉 Day completed! +2 stars!");
  } else {
    toast("Tick completed! +1 star ⭐");
  }

  save();
  render();
}

/* CHALLENGE MANAGEMENT */

function addChallenge() {
  const name = prompt("Enter challenge name:");

  if (!name || !name.trim()) return;

  if (state.challenges.some(c =>
    !c.archived &&
    c.name.toLowerCase() ===
    name.trim().toLowerCase()
  )) {
    toast("Challenge already exists.");
    return;
  }

  const c = createChallenge(name.trim());

  state.challenges.push(c);
  state.selectedId = c.id;

  save();
  render();

  toast("Challenge created!");
}

function editChallenge(id) {
  const c = state.challenges.find(
    x => x.id === id
  );

  if (!c) return;

  const name = prompt(
    "Edit challenge name:",
    c.name
  );

  if (!name || !name.trim()) return;

  c.name = name.trim();

  save();
  render();

  toast("Challenge updated.");
}

function togglePause(id) {
  const c = state.challenges.find(
    x => x.id === id
  );

  if (!c) return;

  c.paused = !c.paused;

  save();
  render();

  toast(
    c.paused ? "Challenge paused." : "Challenge resumed."
  );
}

function archiveChallenge(id) {
  if (
    state.challenges.filter(c => !c.archived).length <= 1
  ) {
    toast("At least one active challenge is required.");
    return;
  }

  if (!confirm(
    "Archive this challenge? History will be preserved."
  )) return;

  const c = state.challenges.find(
    x => x.id === id
  );

  c.archived = true;
  c.paused = true;

  if (state.selectedId === id) {
    state.selectedId =
      state.challenges.find(x => !x.archived).id;
  }

  save();
  render();

  toast("Challenge archived.");
}

/* CELEBRATION */

function celebrate() {
  const container = $("toastContainer");

  ["🎉", "✨", "💚", "⭐", "🏆"].forEach(emoji => {
    const item = document.createElement("div");

    item.textContent = emoji;

    item.style.cssText =
      "display:inline-block;font-size:25px;margin:5px";

    container.appendChild(item);

    setTimeout(() => item.remove(), 1800);
  });
}

/* PART 3 - ACHIEVEMENTS & ANALYTICS */

/* ACHIEVEMENTS */

const milestones = [
  { days: 7, name: "First Champion", medal: "🥉" },
  { days: 15, name: "Halfway Hero", medal: "🥈" },
  { days: 21, name: "Discipline Master", medal: "🥇" },
  { days: 30, name: "Legend", medal: "🏆" },
  { days: 50, name: "Unstoppable", medal: "💎" },
  { days: 100, name: "Century Warrior", medal: "👑" },
  { days: 365, name: "Eternal Champion", medal: "🌟" }
];

function renderAchievements() {
  const list = $("achievementList");
  const room = $("trophyRoom");

  list.replaceChildren();
  room.replaceChildren();

  const total = completedTotal();

  milestones.forEach(m => {
    const unlocked = total >= m.days;

    const card = document.createElement("div");
    card.className = "achievement-card";

    const title = document.createElement("h3");
    title.textContent = m.medal + " " + m.name;

    const info = document.createElement("p");

    info.textContent = unlocked
      ? "Unlocked! Lifetime days: " + total
      : m.days + " lifetime days required.";

    card.append(title, info);
    list.appendChild(card);

    if (unlocked) {
      const trophy = document.createElement("div");

      trophy.className = "trophy-card";

      trophy.textContent =
        m.medal + " " + m.name +
        " — " + m.days + " days";

      room.appendChild(trophy);
    }
  });
}

/* WEEKLY ANALYTICS */

function renderAnalytics() {
  const c = activeChallenge();

  const report = $("weeklyReport");
  const heatmap = $("heatmap");

  report.replaceChildren();
  heatmap.replaceChildren();

  const dates = [];

  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);

    dates.push([
      d.getFullYear(),
      String(d.getMonth() + 1).padStart(2, "0"),
      String(d.getDate()).padStart(2, "0")
    ].join("-"));
  }

  const ticks = c.events.filter(e =>
    e.type === "tick" &&
    dates.includes(e.date)
  );

  const title = document.createElement("h3");
  title.textContent = "Weekly Progress Report";

  const info = document.createElement("p");

  info.textContent =
    ticks.length + " / 14 ticks completed";

  const bar = document.createElement("div");
  bar.className = "progress-track";

  const fill = document.createElement("div");
  fill.className = "progress-fill";

  fill.style.width =
    (ticks.length / 14 * 100) + "%";

  bar.appendChild(fill);

  report.append(title, info, bar);

  /* DISCIPLINE HEATMAP */

  const heading = document.createElement("h3");
  heading.textContent = "7-Day Discipline Heatmap";

  heatmap.appendChild(heading);

  const grid = document.createElement("div");

  grid.style.cssText =
    "display:grid;grid-template-columns:repeat(7,1fr);gap:7px;margin:15px 0";

  dates.forEach(date => {
    const count = c.events.filter(e =>
      e.type === "tick" &&
      e.date === date
    ).length;

    const cell = document.createElement("div");

    cell.style.cssText = `
      padding:12px 3px;
      text-align:center;
      border-radius:8px;
      font-size:11px;
      background:${
        count === 0
          ? "var(--surface-2)"
          : count === 1
            ? "rgba(22,199,132,.35)"
            : "#16a36b"
      };
      color:var(--text);
    `;

    cell.textContent =
      date.slice(8) + " " + count + "/2";

    grid.appendChild(cell);
  });

  heatmap.appendChild(grid);
}

/* LIFETIME HISTORY */

function renderHistory() {
  const container = $("historyList");

  container.replaceChildren();

  state.challenges.forEach(c => {
    const heading = document.createElement("h3");

    heading.textContent = c.name;

    container.appendChild(heading);

    [...c.history].reverse().forEach(day => {
      const card = document.createElement("div");

      card.className = "history-card";

      const title = document.createElement("h3");

      title.textContent =
        "Day " + day.number + " ✓";

      const date = document.createElement("p");

      date.textContent =
        "Completed: " + day.date;

      card.append(title, date);

      container.appendChild(card);
    });
  });
}

/* DAILY JOURNAL */

function renderJournal() {
  const c = activeChallenge();

  $("journalEntry").value =
    c.journal[today()] || "";

  const history = $("journalHistory");

  history.replaceChildren();

  Object.keys(c.journal)
    .sort()
    .reverse()
    .forEach(date => {
      const card = document.createElement("div");

      card.className = "history-card";

      const title = document.createElement("h3");
      title.textContent = date;

      const text = document.createElement("p");
      text.textContent = c.journal[date];

      card.append(title, text);

      history.appendChild(card);
    });
}

function saveJournal() {
  const c = activeChallenge();

  const value = $("journalEntry").value.trim();

  if (!value) {
    toast("Write something first.");
    return;
  }

  c.journal[today()] = value;

  save();
  renderJournal();

  toast("Journal saved!");
}

/* PART 4 - BACKUP, UNDO, RESET & FINAL SETUP */

/* UNDO LAST COMPLETION */

function undoLastCompletion() {
  const c = activeChallenge();

  if (!c.history.length) {
    toast("No completion to undo.");
    return;
  }

  if (!confirm("Undo the last completed day?")) return;

  const last = c.history.pop();

  c.activeDays.pop();

  c.activeDays.unshift({
    id: last.id,
    number: last.number,
    morning: true,
    evening: true
  });

  c.events = c.events.filter(
    e => e.dayId !== last.id
  );

  save();
  render();

  toast("Completion undone.");
}

/* BACKUP EXPORT */

function downloadBackup() {
  const blob = new Blob(
    [JSON.stringify(state, null, 2)],
    { type: "application/json" }
  );

  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");

  link.href = url;
  link.download = "never-stop-backup.json";

  link.click();

  setTimeout(
    () => URL.revokeObjectURL(url),
    1000
  );

  toast("Backup downloaded!");
}

/* BACKUP RESTORE */

function restoreBackup(file) {
  const reader = new FileReader();

  reader.onload = () => {
    try {
      const imported = JSON.parse(reader.result);

      if (
        imported.version !== 1 ||
        !Array.isArray(imported.challenges) ||
        !imported.challenges.length
      ) {
        throw new Error("Invalid backup");
      }

      if (!confirm(
        "Replace current data with this backup?"
      )) return;

      state = imported;

      save();
      render();

      toast("Backup restored!");

    } catch {
      toast("Invalid backup file.");
    }
  };

  reader.readAsText(file);
}

/* RESET CHALLENGE */

function resetChallenge() {
  const c = activeChallenge();

  if (!confirm(
    "Permanently reset " + c.name +
    "? All its history will be deleted."
  )) return;

  const fresh = createChallenge(c.name);

  fresh.id = c.id;

  state.challenges = state.challenges.map(x =>
    x.id === c.id ? fresh : x
  );

  save();
  render();

  toast("Challenge reset.");
}

/* SETTINGS */

function renderSettings() {
  const container = $("settingsContent");

  container.replaceChildren();

  function addButton(label, callback) {
    const b = document.createElement("button");

    b.className = "primary-btn";
    b.style.margin = "6px";
    b.textContent = label;

    b.addEventListener("click", callback);

    container.appendChild(b);
  }

  const theme = document.createElement("p");

  theme.textContent =
    "Current theme: " + state.theme;

  container.appendChild(theme);

  addButton("Change Theme", cycleTheme);

  addButton(
    "Undo Last Completion",
    undoLastCompletion
  );

  addButton(
    "Export Backup JSON",
    downloadBackup
  );

  addButton(
    "Reset Selected Challenge",
    resetChallenge
  );

  const input = document.createElement("input");

  input.type = "file";
  input.accept = ".json,application/json";

  input.addEventListener("change", () => {
    if (input.files[0]) {
      restoreBackup(input.files[0]);
    }

    input.value = "";
  });

  const label = document.createElement("p");

  label.textContent =
    "Restore backup from JSON file";

  container.append(label, input);
}

/* PAGE NAVIGATION */

function showPage(name) {
  document.querySelectorAll(".page").forEach(page => {
    page.classList.toggle(
      "active",
      page.id === name
    );
  });

  document.querySelectorAll(".nav-btn").forEach(button => {
    button.classList.toggle(
      "active",
      button.dataset.page === name
    );
  });

  if (name === "achievements") {
    renderAchievements();
  }

  if (name === "analytics") {
    renderAnalytics();
  }

  if (name === "journal") {
    renderJournal();
  }

  if (name === "history") {
    renderHistory();
  }

  if (name === "settings") {
    renderSettings();
  }

  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });
}

/* MAIN RENDER */

function render() {
  applyTheme();
  renderDashboard();
}

/* BUTTON CONNECTIONS */

$("morningTick").addEventListener(
  "click",
  () => completeTick("morning")
);

$("eveningTick").addEventListener(
  "click",
  () => completeTick("evening")
);

$("addChallengeBtn").addEventListener(
  "click",
  addChallenge
);

$("themeToggle").addEventListener(
  "click",
  cycleTheme
);

$("settingsBtn").addEventListener(
  "click",
  () => showPage("settings")
);

$("saveJournalBtn").addEventListener(
  "click",
  saveJournal
);

document.querySelectorAll(".nav-btn").forEach(button => {
  button.addEventListener("click", () => {
    showPage(button.dataset.page);
  });
});

/* SYSTEM THEME LISTENER */

if (window.matchMedia) {
  window.matchMedia(
    "(prefers-color-scheme: dark)"
  ).addEventListener?.("change", () => {
    if (state.theme === "system") {
      applyTheme();
    }
  });
}

/* SERVICE WORKER */

if (
  "serviceWorker" in navigator &&
  location.protocol === "https:"
) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("./service-worker.js")
      .catch(console.error);
  });
}

/* START APPLICATION */

applyTheme();
render();

console.log(
  "PROJECT NEVER STOP - INFINITE 30 PRO READY!"
);

