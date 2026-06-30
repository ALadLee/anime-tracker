// =========================================================
// app.js — dashboard logic: auth guard, CRUD, rendering
// =========================================================

const TABLE_NAME = "anime";

// ----- DOM references -----------------------------------
const userNameEl       = document.getElementById("userName");
const userAvatarEl     = document.getElementById("userAvatar");
const logoutBtn        = document.getElementById("logoutBtn");

const searchInput      = document.getElementById("searchInput");
const filterSelect     = document.getElementById("filterSelect");

const statWatching     = document.getElementById("statWatching");
const statFinished     = document.getElementById("statFinished");
const statPlan         = document.getElementById("statPlan");
const statTotal        = document.getElementById("statTotal");

const listWatching     = document.getElementById("listWatching");
const listFinished     = document.getElementById("listFinished");
const listPlan         = document.getElementById("listPlan");

const countWatching    = document.getElementById("countWatching");
const countFinished    = document.getElementById("countFinished");
const countPlan        = document.getElementById("countPlan");

const categoriesGrid   = document.querySelector(".categories-grid");

const fabAdd           = document.getElementById("fabAdd");
const animeModalOverlay= document.getElementById("animeModalOverlay");
const modalTitle       = document.getElementById("modalTitle");
const modalIcon        = document.getElementById("modalIcon");
const modalClose       = document.getElementById("modalClose");
const cancelBtn        = document.getElementById("cancelBtn");
const animeForm        = document.getElementById("animeForm");
const modalError       = document.getElementById("modalError");
const saveBtn          = document.getElementById("saveBtn");

const animeIdInput     = document.getElementById("animeId");
const animeNameInput   = document.getElementById("animeName");
const animeSeasonInput = document.getElementById("animeSeason");
const animeStatusInput = document.getElementById("animeStatus");
const animeEpisodeInput= document.getElementById("animeEpisode");
const animeNotesInput  = document.getElementById("animeNotes");
const animeImageUrlInput = document.getElementById("animeImageUrl");
const episodeField     = document.getElementById("episodeField");
const notesCount       = document.getElementById("notesCount");
const artPreviewThumb  = document.getElementById("artPreviewThumb");
const findArtBtn       = document.getElementById("findArtBtn");
const artHint          = document.getElementById("artHint");

const confirmOverlay   = document.getElementById("confirmOverlay");
const cancelDeleteBtn  = document.getElementById("cancelDeleteBtn");
const confirmDeleteBtn = document.getElementById("confirmDeleteBtn");

// ----- State ----------------------------------------------
let currentUser    = null;
let allAnime       = [];
let pendingDeleteId = null;

// =========================================================
// Auth guard
// =========================================================
async function initAuth() {
  const { data, error } = await supabaseClient.auth.getSession();
  if (error || !data.session) {
    window.location.href = "index.html";
    return;
  }
  currentUser = data.session.user;
  const label = currentUser.user_metadata?.username || currentUser.email;
  userNameEl.textContent  = label;
  userAvatarEl.textContent = label.charAt(0).toUpperCase();
  loadAnime();
}

supabaseClient.auth.onAuthStateChange((event) => {
  if (event === "SIGNED_OUT") window.location.href = "index.html";
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
  const html = `<div class="loading-row"><span class="spinner"></span> Loading…</div>`;
  listWatching.innerHTML = html;
  listFinished.innerHTML = html;
  listPlan.innerHTML     = html;
}

// =========================================================
// Layout: overview grid vs single-category maximised
// =========================================================
function updateLayoutMode() {
  const filter = filterSelect.value;

  if (filter === "all") {
    // Restore three-column overview
    categoriesGrid.classList.remove("single-view");
    document.querySelectorAll(".category-col").forEach((col) => {
      col.classList.remove("col-hidden", "col-maximized");
    });
  } else {
    // Maximise the selected category
    categoriesGrid.classList.add("single-view");
    document.querySelectorAll(".category-col").forEach((col) => {
      if (col.dataset.category === filter) {
        col.classList.remove("col-hidden");
        col.classList.add("col-maximized");
      } else {
        col.classList.add("col-hidden");
        col.classList.remove("col-maximized");
      }
    });
  }
}

// =========================================================
// Render
// =========================================================
function getFilteredAnime() {
  const query  = searchInput.value.trim().toLowerCase();
  const filter = filterSelect.value;

  return allAnime.filter((a) => {
    const matchesSearch = !query || a.name.toLowerCase().includes(query);
    const matchesFilter = filter === "all" || a.status === filter;
    return matchesSearch && matchesFilter;
  });
}

function renderAll() {
  updateLayoutMode();

  const filtered = getFilteredAnime();
  const watching = filtered.filter((a) => a.status === "Watching");
  const finished = filtered.filter((a) => a.status === "Finished");
  const planned  = filtered.filter((a) => a.status === "Plan to Watch");

  renderColumn(listWatching, watching, "watching",
    "Nothing being watched",   "Add anime you're currently watching.");
  renderColumn(listFinished, finished, "finished",
    "Nothing finished yet",    "Completed anime will appear here.");
  renderColumn(listPlan,     planned,  "plan",
    "Your plan list is empty", "Add anime you want to watch later.");

  countWatching.textContent = watching.length;
  countFinished.textContent = finished.length;
  countPlan.textContent     = planned.length;

  // Stats always reflect the full unfiltered list
  statWatching.textContent = allAnime.filter((a) => a.status === "Watching").length;
  statFinished.textContent = allAnime.filter((a) => a.status === "Finished").length;
  statPlan.textContent     = allAnime.filter((a) => a.status === "Plan to Watch").length;
  statTotal.textContent    = allAnime.length;
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

  container.querySelectorAll("[data-edit]").forEach((btn) =>
    btn.addEventListener("click", () => openEditModal(btn.dataset.edit))
  );
  container.querySelectorAll("[data-delete]").forEach((btn) =>
    btn.addEventListener("click", () => openDeleteConfirm(btn.dataset.delete))
  );
}

function escapeHtml(str) {
  const d = document.createElement("div");
  d.textContent = str ?? "";
  return d.innerHTML;
}

function animeCardHtml(a, statusClass) {
  const seasonText  = a.season ? `Season ${a.season}` : "";
  const episodeText = a.status === "Watching" && a.current_episode != null
    ? `EP ${a.current_episode}` : "";

  const metaParts = [
    seasonText,
    `<span class="status-pill ${statusClass}">${escapeHtml(a.status)}</span>`,
    episodeText,
  ].filter(Boolean).join(" ");

  // Show cover art if stored, with graceful emoji fallback
  const thumbContent = a.image_url
    ? `<img
         src="${escapeHtml(a.image_url)}"
         alt="${escapeHtml(a.name)}"
         loading="lazy"
         onerror="this.style.display='none';this.parentNode.innerHTML='🎬'"
       />`
    : "🎬";

  return `
    <div class="anime-card" data-id="${a.id}">
      <div class="anime-thumb">${thumbContent}</div>
      <div class="anime-info">
        <div class="anime-title">${escapeHtml(a.name)}</div>
        <div class="anime-meta">${metaParts}</div>
        ${a.notes ? `<div class="anime-notes">${escapeHtml(a.notes)}</div>` : ""}
      </div>
      <div class="anime-actions">
        <button class="icon-btn" data-edit="${a.id}" aria-label="Edit">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
            <path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
          </svg>
        </button>
        <button class="icon-btn delete" data-delete="${a.id}" aria-label="Delete">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
            <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
          </svg>
        </button>
      </div>
    </div>`;
}

// Search + filter
searchInput.addEventListener("input", renderAll);
filterSelect.addEventListener("change", renderAll);

// =========================================================
// Cover art — Jikan (MyAnimeList) API
// =========================================================

/**
 * Searches MyAnimeList via the free Jikan API and returns
 * the first matching cover image URL, or null if not found.
 * No API key required.  Rate limit: ~3 requests/second.
 */
async function findCoverArt(title) {
  try {
    const res = await fetch(
      `https://api.jikan.moe/v4/anime?q=${encodeURIComponent(title)}&limit=1&sfw=true`
    );
    if (!res.ok) return null;
    const json = await res.json();
    return json.data?.[0]?.images?.jpg?.image_url ?? null;
  } catch {
    return null;
  }
}

function setArtPreview(url) {
  if (url) {
    artPreviewThumb.innerHTML = `<img src="${escapeHtml(url)}" alt="Cover art"
      onerror="this.parentElement.textContent='🎬'" />`;
  } else {
    artPreviewThumb.textContent = "🎬";
  }
}

// Live-preview when user pastes / types a URL manually
animeImageUrlInput.addEventListener("input", () => {
  const val = animeImageUrlInput.value.trim();
  // Only update preview when the field looks like a URL
  setArtPreview(val.startsWith("http") ? val : null);
});

// Auto-find button — searches Jikan for the current anime name
findArtBtn.addEventListener("click", async () => {
  const title = animeNameInput.value.trim();
  if (!title) {
    showToast("Enter an anime name first.", "error");
    return;
  }

  findArtBtn.disabled  = true;
  findArtBtn.textContent = "Searching…";
  artHint.textContent  = "Searching MyAnimeList…";

  const url = await findCoverArt(title);

  findArtBtn.disabled  = false;
  findArtBtn.textContent = "Auto-find";

  if (url) {
    animeImageUrlInput.value = url;
    setArtPreview(url);
    artHint.textContent = "✓ Found on MyAnimeList. You can also paste your own URL below.";
  } else {
    artHint.textContent = "No art found. Try a slightly different name, or paste a URL directly.";
    showToast("No cover art found for that title.", "error");
  }
});

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

function openAddModal() {
  animeForm.reset();
  animeIdInput.value       = "";
  animeImageUrlInput.value = "";
  modalTitle.textContent   = "Add Anime";
  modalIcon.textContent    = "+";
  notesCount.textContent   = "0";
  artHint.textContent      = 'Click Auto-find to search MyAnimeList, or paste any direct image URL.';
  setArtPreview(null);
  toggleEpisodeField();
  clearModalError();
  openModal(animeModalOverlay);
  animeNameInput.focus();
}

function openEditModal(id) {
  const anime = allAnime.find((a) => String(a.id) === String(id));
  if (!anime) return;

  animeIdInput.value       = anime.id;
  animeNameInput.value     = anime.name        || "";
  animeSeasonInput.value   = anime.season      || "";
  animeStatusInput.value   = anime.status      || "Watching";
  animeEpisodeInput.value  = anime.current_episode ?? "";
  animeNotesInput.value    = anime.notes        || "";
  animeImageUrlInput.value = anime.image_url    || "";
  notesCount.textContent   = (anime.notes || "").length;

  setArtPreview(anime.image_url || null);
  artHint.textContent = anime.image_url
    ? "Current art shown. Paste a new URL or click Auto-find to replace it."
    : 'Click Auto-find to search MyAnimeList, or paste any direct image URL.';

  modalTitle.textContent = "Edit Anime";
  modalIcon.textContent  = "✎";
  toggleEpisodeField();
  clearModalError();
  openModal(animeModalOverlay);
  animeNameInput.focus();
}

fabAdd.addEventListener("click", openAddModal);
modalClose.addEventListener("click", () => closeModal(animeModalOverlay));
cancelBtn.addEventListener("click",  () => closeModal(animeModalOverlay));
animeModalOverlay.addEventListener("click", (e) => {
  if (e.target === animeModalOverlay) closeModal(animeModalOverlay);
});

// ----- Save (insert or update) ----------------------------
animeForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  clearModalError();

  const name    = animeNameInput.value.trim();
  const status  = animeStatusInput.value;
  const season  = animeSeasonInput.value  ? Number(animeSeasonInput.value)  : null;
  const notes   = animeNotesInput.value.trim();
  const episode = status === "Watching" && animeEpisodeInput.value !== ""
    ? Number(animeEpisodeInput.value) : null;
  const imageUrl = animeImageUrlInput.value.trim() || null;

  // Validation
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
  saveBtn.disabled    = true;
  saveBtn.textContent = "Saving…";

  const payload = {
    user_id:         currentUser.id,
    name,
    season,
    status,
    current_episode: episode,
    notes:           notes   || null,
    image_url:       imageUrl,
    updated_at:      new Date().toISOString(),
  };

  try {
    let error;
    if (id) {
      ({ error } = await supabaseClient
        .from(TABLE_NAME).update(payload)
        .eq("id", id).eq("user_id", currentUser.id));
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
    saveBtn.disabled    = false;
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
  confirmDeleteBtn.disabled    = true;
  confirmDeleteBtn.textContent = "Deleting…";

  try {
    const { error } = await supabaseClient
      .from(TABLE_NAME).delete()
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
    confirmDeleteBtn.disabled    = false;
    confirmDeleteBtn.textContent = "Delete";
    pendingDeleteId              = null;
  }
});

// =========================================================
// Start
// =========================================================
initAuth();
