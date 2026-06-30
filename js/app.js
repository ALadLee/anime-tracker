// =========================================================
// app.js — dashboard logic: auth guard, CRUD, rendering
// =========================================================

const TABLE_NAME = "anime";

// ----- DOM references -----------------------------------
const userNameEl = document.getElementById("userName");
const userAvatarEl = document.getElementById("userAvatar");
const logoutBtn = document.getElementById("logoutBtn");

const searchInput = document.getElementById("searchInput");
const filterSelect = document.getElementById("filterSelect");

const statWatching = document.getElementById("statWatching");
const statFinished = document.getElementById("statFinished");
const statPlan = document.getElementById("statPlan");
const statTotal = document.getElementById("statTotal");

const listWatching = document.getElementById("listWatching");
const listFinished = document.getElementById("listFinished");
const listPlan = document.getElementById("listPlan");

const countWatching = document.getElementById("countWatching");
const countFinished = document.getElementById("countFinished");
const countPlan = document.getElementById("countPlan");

const fabAdd = document.getElementById("fabAdd");
const animeModalOverlay = document.getElementById("animeModalOverlay");
const modalTitle = document.getElementById("modalTitle");
const modalIcon = document.getElementById("modalIcon");
const modalClose = document.getElementById("modalClose");
const cancelBtn = document.getElementById("cancelBtn");
const animeForm = document.getElementById("animeForm");
const modalError = document.getElementById("modalError");

const animeIdInput = document.getElementById("animeId");
const animeNameInput = document.getElementById("animeName");
const animeSeasonInput = document.getElementById("animeSeason");
const animeStatusInput = document.getElementById("animeStatus");
const animeEpisodeInput = document.getElementById("animeEpisode");
const animeNotesInput = document.getElementById("animeNotes");
const episodeField = document.getElementById("episodeField");
const notesCount = document.getElementById("notesCount");
const saveBtn = document.getElementById("saveBtn");

const confirmOverlay = document.getElementById("confirmOverlay");
const cancelDeleteBtn = document.getElementById("cancelDeleteBtn");
const confirmDeleteBtn = document.getElementById("confirmDeleteBtn");

// ----- State ----------------------------------------------
let currentUser = null;
let allAnime = []; // full unfiltered list from the database
let pendingDeleteId = null;

// =========================================================
// Auth guard — runs as soon as the dashboard loads
// =========================================================
async function initAuth() {
  const { data, error } = await supabaseClient.auth.getSession();

  if (error || !data.session) {
    window.location.href = "index.html";
    return;
  }

  currentUser = data.session.user;
  const label = currentUser.user_metadata?.username || currentUser.email;
  userNameEl.textContent = label;
  userAvatarEl.textContent = label.charAt(0).toUpperCase();

  loadAnime();
}

// Keep the dashboard in sync if the session ends elsewhere
supabaseClient.auth.onAuthStateChange((event) => {
  if (event === "SIGNED_OUT") {
    window.location.href = "index.html";
  }
});

logoutBtn.addEventListener("click", async () => {
  await supabaseClient.auth.signOut();
  window.location.href = "index.html";
});

// =========================================================
// Load data
// =========================================================
async function loadAnime() {
  setLoadingState();

  const { data, error } = await supabaseClient
    .from(TABLE_NAME)
    .select("*")
    .eq("user_id", currentUser.id)
    .order("updated_at", { ascending: false });

  if (error) {
    console.error(error);
    showToast("Could not load your anime list.", "error");
    allAnime = [];
  } else {
    allAnime = data || [];
  }

  renderAll();
}

function setLoadingState() {
  const loadingHtml = `<div class="loading-row"><span class="spinner"></span> Loading…</div>`;
  listWatching.innerHTML = loadingHtml;
  listFinished.innerHTML = loadingHtml;
  listPlan.innerHTML = loadingHtml;
}

// =========================================================
// Render
// =========================================================
function getFilteredAnime() {
  const query = searchInput.value.trim().toLowerCase();
  const filter = filterSelect.value;

  return allAnime.filter((a) => {
    const matchesSearch = !query || a.name.toLowerCase().includes(query);
    const matchesFilter = filter === "all" || a.status === filter;
    return matchesSearch && matchesFilter;
  });
}

function renderAll() {
  const filtered = getFilteredAnime();

  const watching = filtered.filter((a) => a.status === "Watching");
  const finished = filtered.filter((a) => a.status === "Finished");
  const planned = filtered.filter((a) => a.status === "Plan to Watch");

  renderColumn(listWatching, watching, "watching", "No anime here yet", "Add something you're currently watching.");
  renderColumn(listFinished, finished, "finished", "Nothing finished yet", "Anime you complete will show up here.");
  renderColumn(listPlan, planned, "plan", "Your plan list is empty", "Add anime you want to watch later.");

  countWatching.textContent = watching.length;
  countFinished.textContent = finished.length;
  countPlan.textContent = planned.length;

  // Stats reflect the full (unfiltered) collection
  const totalWatching = allAnime.filter((a) => a.status === "Watching").length;
  const totalFinished = allAnime.filter((a) => a.status === "Finished").length;
  const totalPlan = allAnime.filter((a) => a.status === "Plan to Watch").length;

  statWatching.textContent = totalWatching;
  statFinished.textContent = totalFinished;
  statPlan.textContent = totalPlan;
  statTotal.textContent = allAnime.length;
}

function renderColumn(container, items, statusClass, emptyTitle, emptySubtitle) {
  if (items.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">🍥</div>
        <strong>${emptyTitle}</strong>
        <span>${emptySubtitle}</span>
      </div>`;
    return;
  }

  container.innerHTML = items.map((a) => animeCardHtml(a, statusClass)).join("");

  // Wire up edit / delete buttons for the cards we just rendered
  container.querySelectorAll("[data-edit]").forEach((btn) => {
    btn.addEventListener("click", () => openEditModal(btn.dataset.edit));
  });
  container.querySelectorAll("[data-delete]").forEach((btn) => {
    btn.addEventListener("click", () => openDeleteConfirm(btn.dataset.delete));
  });
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str ?? "";
  return div.innerHTML;
}

function animeCardHtml(a, statusClass) {
  const seasonText = a.season ? `Season ${a.season}` : "";
  const episodeText =
    a.status === "Watching" && a.current_episode !== null && a.current_episode !== undefined
      ? `EP ${a.current_episode}`
      : "";

  const metaParts = [seasonText, `<span class="status-pill ${statusClass}">${escapeHtml(a.status)}</span>`, episodeText]
    .filter(Boolean)
    .join(" ");

  return `
    <div class="anime-card" data-id="${a.id}">
      <div class="anime-thumb">🎬</div>
      <div class="anime-info">
        <div class="anime-title">${escapeHtml(a.name)}</div>
        <div class="anime-meta">${metaParts}</div>
        ${a.notes ? `<div class="anime-notes">${escapeHtml(a.notes)}</div>` : ""}
      </div>
      <div class="anime-actions">
        <button class="icon-btn" data-edit="${a.id}" aria-label="Edit">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
        </button>
        <button class="icon-btn delete" data-delete="${a.id}" aria-label="Delete">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>
        </button>
      </div>
    </div>`;
}

// Search + filter listeners
searchInput.addEventListener("input", renderAll);
filterSelect.addEventListener("change", renderAll);

// =========================================================
// Add / Edit modal
// =========================================================
function toggleEpisodeField() {
  if (animeStatusInput.value === "Watching") {
    episodeField.classList.add("show");
  } else {
    episodeField.classList.remove("show");
  }
}
animeStatusInput.addEventListener("change", toggleEpisodeField);

animeNotesInput.addEventListener("input", () => {
  notesCount.textContent = animeNotesInput.value.length;
});

function openAddModal() {
  animeForm.reset();
  animeIdInput.value = "";
  modalTitle.textContent = "Add Anime";
  modalIcon.textContent = "+";
  notesCount.textContent = "0";
  toggleEpisodeField();
  clearModalError();
  openModal(animeModalOverlay);
  animeNameInput.focus();
}

function openEditModal(id) {
  const anime = allAnime.find((a) => String(a.id) === String(id));
  if (!anime) return;

  animeIdInput.value = anime.id;
  animeNameInput.value = anime.name || "";
  animeSeasonInput.value = anime.season || "";
  animeStatusInput.value = anime.status || "Watching";
  animeEpisodeInput.value = anime.current_episode ?? "";
  animeNotesInput.value = anime.notes || "";
  notesCount.textContent = (anime.notes || "").length;

  modalTitle.textContent = "Edit Anime";
  modalIcon.textContent = "✎";
  toggleEpisodeField();
  clearModalError();
  openModal(animeModalOverlay);
  animeNameInput.focus();
}

function clearModalError() {
  modalError.textContent = "";
  modalError.classList.remove("show");
}

function showModalError(msg) {
  modalError.textContent = msg;
  modalError.classList.add("show");
}

function openModal(overlay) {
  overlay.classList.add("open");
  document.body.style.overflow = "hidden";
}

function closeModal(overlay) {
  overlay.classList.remove("open");
  document.body.style.overflow = "";
}

fabAdd.addEventListener("click", openAddModal);
modalClose.addEventListener("click", () => closeModal(animeModalOverlay));
cancelBtn.addEventListener("click", () => closeModal(animeModalOverlay));
animeModalOverlay.addEventListener("click", (e) => {
  if (e.target === animeModalOverlay) closeModal(animeModalOverlay);
});

// ----- Save (insert or update) ----------------------------
animeForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  clearModalError();

  const name = animeNameInput.value.trim();
  const status = animeStatusInput.value;
  const season = animeSeasonInput.value ? Number(animeSeasonInput.value) : null;
  const notes = animeNotesInput.value.trim();
  const episode =
    status === "Watching" && animeEpisodeInput.value !== "" ? Number(animeEpisodeInput.value) : null;

  // ----- Validation -----
  if (!name) {
    showModalError("Please enter an anime name.");
    return;
  }
  if (name.length > 120) {
    showModalError("Anime name is too long (max 120 characters).");
    return;
  }
  if (season !== null && (season < 1 || season > 50)) {
    showModalError("Season must be between 1 and 50.");
    return;
  }
  if (episode !== null && (episode < 0 || episode > 9999)) {
    showModalError("Current episode must be a valid number.");
    return;
  }

  const id = animeIdInput.value;
  saveBtn.disabled = true;
  saveBtn.textContent = "Saving...";

  const payload = {
    user_id: currentUser.id,
    name,
    season,
    status,
    current_episode: episode,
    notes: notes || null,
    updated_at: new Date().toISOString(),
  };

  try {
    let error;
    if (id) {
      ({ error } = await supabaseClient.from(TABLE_NAME).update(payload).eq("id", id).eq("user_id", currentUser.id));
    } else {
      payload.created_at = new Date().toISOString();
      ({ error } = await supabaseClient.from(TABLE_NAME).insert(payload));
    }

    if (error) throw error;

    showToast(id ? "Anime updated." : "Anime added.", "success");
    closeModal(animeModalOverlay);
    await loadAnime();
  } catch (err) {
    console.error(err);
    showModalError("Could not save this anime. Please try again.");
  } finally {
    saveBtn.disabled = false;
    saveBtn.textContent = "Save Anime";
  }
});

// =========================================================
// Delete with confirmation
// =========================================================
function openDeleteConfirm(id) {
  pendingDeleteId = id;
  openModal(confirmOverlay);
}

cancelDeleteBtn.addEventListener("click", () => {
  pendingDeleteId = null;
  closeModal(confirmOverlay);
});
confirmOverlay.addEventListener("click", (e) => {
  if (e.target === confirmOverlay) {
    pendingDeleteId = null;
    closeModal(confirmOverlay);
  }
});

confirmDeleteBtn.addEventListener("click", async () => {
  if (!pendingDeleteId) return;

  confirmDeleteBtn.disabled = true;
  confirmDeleteBtn.textContent = "Deleting...";

  try {
    const { error } = await supabaseClient
      .from(TABLE_NAME)
      .delete()
      .eq("id", pendingDeleteId)
      .eq("user_id", currentUser.id);

    if (error) throw error;

    showToast("Anime deleted.", "success");
    closeModal(confirmOverlay);
    await loadAnime();
  } catch (err) {
    console.error(err);
    showToast("Could not delete this anime.", "error");
  } finally {
    confirmDeleteBtn.disabled = false;
    confirmDeleteBtn.textContent = "Delete";
    pendingDeleteId = null;
  }
});

// =========================================================
// Kick everything off
// =========================================================
initAuth();
