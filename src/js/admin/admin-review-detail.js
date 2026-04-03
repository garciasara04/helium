const API_BASE = "http://127.0.0.1:8000";

const params = new URLSearchParams(window.location.search);
const reviewId = Number(params.get("id"));

const alertEl = document.getElementById("reviewDetailAlert");
const skeletonEl = document.getElementById("reviewInfoSkeleton");
const infoEl = document.getElementById("reviewInfo");

const userEl = document.getElementById("reviewUser");
const freelancerEl = document.getElementById("reviewFreelancer");
const serviceEl = document.getElementById("reviewService");
const dateEl = document.getElementById("reviewDate");
const ratingEl = document.getElementById("reviewRating");
const commentEl = document.getElementById("reviewComment");

function getAuthHeaders() {
  const token = localStorage.getItem("token");
  const headers = { Accept: "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
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

function formatDate(value) {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleDateString("es-CO", { day: "2-digit", month: "short", year: "numeric" });
}

function ratingClass(rating) {
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

function renderReview(review) {
  const order = review?.order || {};
  const user = order?.user || {};
  const service = order?.service || {};
  const freelancerUser = service?.freelancer_profile?.user || {};
  const rating = Number(review?.rating ?? 0);

  const userName = `${user?.names || ""} ${user?.last_names || ""}`.trim() || "-";
  const freelancerName = `${freelancerUser?.names || ""} ${freelancerUser?.last_names || ""}`.trim() || "-";

  if (userEl) userEl.textContent = userName;
  if (freelancerEl) freelancerEl.textContent = freelancerName;
  if (serviceEl) serviceEl.textContent = service?.title || "-";
  if (dateEl) dateEl.textContent = formatDate(review?.created_at);

  if (ratingEl) {
    ratingEl.classList.remove("text-emerald-400", "text-amber-400", "text-rose-400");
    ratingEl.classList.add(ratingClass(rating));
    ratingEl.textContent = `\u2605 ${rating.toFixed(1)}`;
  }

  if (commentEl) commentEl.textContent = review?.comment || "Sin comentario";

  skeletonEl?.classList.add("hidden");
  infoEl?.classList.remove("hidden");
}

async function fetchReviewDetail() {
  if (!reviewId || Number.isNaN(reviewId)) {
    showAlert("No se encontro el id de la review en la URL.");
    return;
  }

  try {
    hideAlert();

    const url = `${API_BASE}/api/admin/reviews/negative?days=3650&max_rating=5&limit=1000`;
    const res = await fetch(url, { headers: getAuthHeaders() });

    if (res.status === 401) {
      throw new Error("Sesion expirada o sin permisos.");
    }

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }

    const payload = await res.json();
    const reviews = mapReviews(payload);
    const review = reviews.find((item) => Number(item?.id) === reviewId);

    if (!review) {
      showAlert("No se encontro la review solicitada.");
      if (commentEl) commentEl.textContent = "No hay comentario disponible.";
      return;
    }

    renderReview(review);
  } catch (error) {
    console.error("Error cargando detalle de review:", error);
    showAlert("No se pudo cargar el detalle de la review.");
    if (commentEl) commentEl.textContent = "No hay comentario disponible.";
  }
}

fetchReviewDetail();
