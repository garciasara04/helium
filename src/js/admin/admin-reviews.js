const API_BASE = "http://127.0.0.1:8000";

const modeButtons = {
  all: document.getElementById("reviewsModeAll"),
  best: document.getElementById("reviewsModeBest"),
  worst: document.getElementById("reviewsModeWorst")
};

const maxRatingSelect = document.getElementById("reviewsMaxRating");
const applyBtn = document.getElementById("reviewsApply");

const alertEl = document.getElementById("reviewsAlert");
const emptyEl = document.getElementById("reviewsEmpty");
const tableBody = document.getElementById("reviewsTableBody");
const infoEl = document.getElementById("reviewsInfo");
const prevBtn = document.getElementById("reviewsPrev");
const nextBtn = document.getElementById("reviewsNext");

let mode = "all";
let currentPage = 1;
let lastPage = 1;

function getAuthHeaders() {
  const token = localStorage.getItem("token");
  const headers = { Accept: "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatDate(value) {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleDateString("es-CO", { day: "2-digit", month: "short", year: "numeric" });
}

function showAlert(message) {
  if (!alertEl) return;
  alertEl.classList.remove("hidden");
  alertEl.classList.add("border-red-500/30", "bg-red-500/10", "text-red-300");
  alertEl.textContent = message;
}

function hideAlert() {
  if (!alertEl) return;
  alertEl.classList.add("hidden");
  alertEl.textContent = "";
}

function setMode(nextMode) {
  mode = nextMode;

  Object.entries(modeButtons).forEach(([key, btn]) => {
    if (!btn) return;
    btn.classList.remove("ring-2", "ring-white/40");
    if (key === mode) btn.classList.add("ring-2", "ring-white/40");
  });
}

function renderSkeleton() {
  if (!tableBody) return;
  tableBody.innerHTML = `
    <tr class="border-t border-slate-800"><td class="p-4" colspan="7"><div class="h-4 bg-slate-700/70 rounded animate-pulse"></div></td></tr>
    <tr class="border-t border-slate-800"><td class="p-4" colspan="7"><div class="h-4 bg-slate-700/70 rounded animate-pulse"></div></td></tr>
    <tr class="border-t border-slate-800"><td class="p-4" colspan="7"><div class="h-4 bg-slate-700/70 rounded animate-pulse"></div></td></tr>
  `;
}

function normalizeRating(value) {
  const n = Number(value ?? 0);
  if (Number.isNaN(n)) return 0;
  return Math.max(0, Math.min(5, n));
}

function getRatingClass(rating) {
  if (rating >= 4) return "text-emerald-400";
  if (rating === 3) return "text-amber-400";
  return "text-rose-400";
}

function mapReviews(payload) {
  if (Array.isArray(payload?.reviews)) return payload.reviews;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload)) return payload;
  return [];
}

function applyClientModeFilters(reviews) {
  const maxRating = maxRatingSelect?.value ? Number(maxRatingSelect.value) : null;
  let list = reviews.slice();

  if (maxRating !== null && !Number.isNaN(maxRating)) {
    list = list.filter((r) => normalizeRating(r?.rating) <= maxRating);
  }

  if (mode === "best") {
    list.sort((a, b) => normalizeRating(b?.rating) - normalizeRating(a?.rating));
  } else if (mode === "worst") {
    list.sort((a, b) => normalizeRating(a?.rating) - normalizeRating(b?.rating));
  } else {
    list.sort((a, b) => new Date(b?.created_at || 0).getTime() - new Date(a?.created_at || 0).getTime());
  }

  return list;
}

function renderRows(reviews) {
  if (!tableBody) return;

  tableBody.innerHTML = reviews
    .map((review) => {
      const rating = normalizeRating(review?.rating);
      const comment = review?.comment || "Sin comentario";
      const createdAt = formatDate(review?.created_at);

      const user = review?.order?.user;
      const service = review?.order?.service;
      const freelancerUser = service?.freelancer_profile?.user;

      const userName = `${user?.names || ""} ${user?.last_names || ""}`.trim() || "-";
      const serviceTitle = service?.title || "-";
      const freelancerName = `${freelancerUser?.names || ""} ${freelancerUser?.last_names || ""}`.trim() || "-";

      return `
        <tr class="border-t border-slate-800 hover:bg-slate-800/40 transition">
          <td class="p-4 font-semibold">${escapeHtml(userName)}</td>
          <td class="p-4">${escapeHtml(serviceTitle)}</td>
          <td class="p-4">${escapeHtml(freelancerName)}</td>
          <td class="p-4 ${getRatingClass(rating)}">\u2605 ${escapeHtml(rating.toFixed(1))}</td>
          <td class="p-4 text-slate-300">${escapeHtml(comment)}</td>
          <td class="p-4 text-slate-400">${escapeHtml(createdAt)}</td>
          <td class="p-4"><a href="/dashboard/admin/reviewDetalle?id=${escapeHtml(review?.id)}" class="text-indigo-400 hover:underline">Ver</a></td>
        </tr>
      `;
    })
    .join("");
}

function updatePagination(totalItems) {
  const perPage = 10;
  lastPage = Math.max(1, Math.ceil(totalItems / perPage));
  if (currentPage > lastPage) currentPage = lastPage;

  if (prevBtn) prevBtn.disabled = currentPage <= 1;
  if (nextBtn) nextBtn.disabled = currentPage >= lastPage;
}

function paginate(items) {
  const perPage = 10;
  const from = (currentPage - 1) * perPage;
  return items.slice(from, from + perPage);
}

async function fetchReviews() {
  try {
    hideAlert();
    emptyEl?.classList.add("hidden");
    renderSkeleton();

    const params = new URLSearchParams();
    params.set("days", "3650");
    params.set("max_rating", mode === "worst" ? "2" : "5");
    params.set("limit", "500");

    const res = await fetch(`${API_BASE}/api/admin/reviews/negative?${params.toString()}`, {
      headers: getAuthHeaders()
    });

    if (res.status === 401) throw new Error("Sesion expirada o sin permisos.");
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const payload = await res.json();
    const allReviews = mapReviews(payload);
    const filtered = applyClientModeFilters(allReviews);

    if (!filtered.length) {
      tableBody.innerHTML = "";
      emptyEl?.classList.remove("hidden");
      if (infoEl) infoEl.textContent = "Sin resultados";
      updatePagination(0);
      return;
    }

    updatePagination(filtered.length);
    const pageItems = paginate(filtered);

    renderRows(pageItems);

    const from = (currentPage - 1) * 10 + 1;
    const to = Math.min(currentPage * 10, filtered.length);
    if (infoEl) infoEl.textContent = `Mostrando ${from}-${to} de ${filtered.length} reviews`;
  } catch (error) {
    console.error("Error cargando reviews admin:", error);
    tableBody.innerHTML = "";
    emptyEl?.classList.remove("hidden");
    showAlert("No se pudieron cargar las reviews.");
  }
}

modeButtons.all?.addEventListener("click", () => {
  setMode("all");
  currentPage = 1;
  fetchReviews();
});

modeButtons.best?.addEventListener("click", () => {
  setMode("best");
  currentPage = 1;
  fetchReviews();
});

modeButtons.worst?.addEventListener("click", () => {
  setMode("worst");
  currentPage = 1;
  fetchReviews();
});

applyBtn?.addEventListener("click", () => {
  currentPage = 1;
  fetchReviews();
});

prevBtn?.addEventListener("click", () => {
  if (currentPage <= 1) return;
  currentPage -= 1;
  fetchReviews();
});

nextBtn?.addEventListener("click", () => {
  if (currentPage >= lastPage) return;
  currentPage += 1;
  fetchReviews();
});

setMode("all");
fetchReviews();
