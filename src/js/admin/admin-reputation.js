const API_BASE = "http://127.0.0.1:8000";

const alertEl = document.getElementById("reputationAlert");
const freelancersBody = document.getElementById("reputationFreelancersBody");
const reviewsBody = document.getElementById("reputationReviewsBody");

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

function renderFreelancers(rows) {
  if (!freelancersBody) return;
  if (!rows.length) {
    freelancersBody.innerHTML = '<tr><td class="py-3 text-slate-400" colspan="4">No hay freelancers para mostrar.</td></tr>';
    return;
  }

  freelancersBody.innerHTML = rows
    .map((f) => {
      const user = f?.user || {};
      const fullName = `${user?.names || ""} ${user?.last_names || ""}`.trim() || "-";
      const avgRating = Number(f?.avg_service_rating ?? 0);
      const reviewsCount = Number(f?.reviews_count ?? 0);
      const servicesCount = Number(f?.services_count ?? 0);

      return `
        <tr class="border-b border-slate-800/70 hover:bg-slate-800/40 transition">
          <td class="py-3 pr-3 font-semibold">${escapeHtml(fullName)}</td>
          <td class="py-3 pr-3 text-amber-400">★ ${escapeHtml(avgRating.toFixed(1))}</td>
          <td class="py-3 pr-3">${escapeHtml(reviewsCount)}</td>
          <td class="py-3">${escapeHtml(servicesCount)}</td>
        </tr>
      `;
    })
    .join("");
}

function renderReviews(rows) {
  if (!reviewsBody) return;
  if (!rows.length) {
    reviewsBody.innerHTML = '<tr><td class="py-3 text-slate-400" colspan="4">No hay resenas para mostrar.</td></tr>';
    return;
  }

  reviewsBody.innerHTML = rows
    .map((review) => {
      const rating = Number(review?.rating ?? 0);
      const service = review?.order?.service?.title || "Servicio";
      const comment = review?.comment || "Sin comentario";
      const created = formatDate(review?.created_at);

      return `
        <tr class="border-b border-slate-800/70 hover:bg-slate-800/40 transition">
          <td class="py-3 pr-3 text-amber-400 font-semibold">★ ${escapeHtml(rating.toFixed(1))}</td>
          <td class="py-3 pr-3">${escapeHtml(service)}</td>
          <td class="py-3 pr-3 text-slate-300">${escapeHtml(comment)}</td>
          <td class="py-3">${escapeHtml(created)}</td>
        </tr>
      `;
    })
    .join("");
}

async function loadWorstRatedFreelancers() {
  const res = await fetch(`${API_BASE}/api/admin/freelancers/worst-rated?limit=10`, {
    headers: getAuthHeaders()
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);

  const payload = await res.json();
  const list = Array.isArray(payload?.freelancers)
    ? payload.freelancers
    : Array.isArray(payload?.data)
      ? payload.data
      : Array.isArray(payload)
        ? payload
        : [];

  renderFreelancers(list.slice(0, 10));
}

async function loadReviews() {
  const res = await fetch(`${API_BASE}/api/admin/reviews/negative?days=3650&max_rating=5&limit=10`, {
    headers: getAuthHeaders()
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);

  const payload = await res.json();
  const reviews = Array.isArray(payload?.reviews) ? payload.reviews : [];

  const sorted = [...reviews]
    .sort((a, b) => new Date(b?.created_at || 0).getTime() - new Date(a?.created_at || 0).getTime())
    .slice(0, 10);

  renderReviews(sorted);
}

async function initReputation() {
  try {
    hideAlert();
    await Promise.all([loadWorstRatedFreelancers(), loadReviews()]);
  } catch (error) {
    console.error("Error cargando reputacion:", error);
    showAlert("No se pudo cargar la vista de reputacion.");
  }
}

initReputation();


