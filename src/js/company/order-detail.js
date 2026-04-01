const API_BASE = "http://127.0.0.1:8000";

const loadingEl = document.getElementById("orderLoading");
const emptyEl = document.getElementById("orderEmpty");
const contentEl = document.getElementById("orderContent");

const statusEl = document.getElementById("orderStatus");
const serviceTitleEl = document.getElementById("orderServiceTitle");
const requirementsEl = document.getElementById("orderRequirements");
const freelancerPhotoEl = document.getElementById("orderFreelancerPhoto");
const freelancerNameEl = document.getElementById("orderFreelancerName");
const priceEl = document.getElementById("orderPrice");
const startDateEl = document.getElementById("orderStartDate");
const deliveredDateEl = document.getElementById("orderDeliveredDate");
const freelancerLinkEl = document.getElementById("orderFreelancerLink");


function buildStorageUrl(path) {
  if (!path) return "";
  if (/^https?:\/\//i.test(path)) return path;
  if (path.startsWith("/storage/")) return `http://127.0.0.1:8000${path}`;
  return `http://127.0.0.1:8000/storage/${path}`;
}
function formatPrice(value) {
  if (value === null || value === undefined || value === "") return "";
  const num = Number(value);
  if (!Number.isFinite(num)) return `$${value}`;
  return num.toLocaleString("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 });
}

function formatDate(value) {
  if (!value) return "-";
  try {
    const d = new Date(value);
    return d.toLocaleDateString("es-CO", { year: "numeric", month: "short", day: "2-digit" });
  } catch {
    return "-";
  }
}

function statusLabel(status) {
  const value = (status || "").toLowerCase();
  if (value === "completed") return "Completado";
  if (value === "delivered") return "Entregado";
  if (value === "in_progress") return "En progreso";
  if (value === "pending") return "Pendiente";
  if (value === "cancelled") return "Cancelado";
  return status || "-";
}

function statusClass(status) {
  const value = (status || "").toLowerCase();
  if (value === "completed") return "bg-green-600/20 text-green-400";
  if (value === "delivered") return "bg-blue-600/20 text-blue-400";
  if (value === "in_progress") return "bg-yellow-600/20 text-yellow-400";
  if (value === "pending") return "bg-amber-600/20 text-amber-400";
  return "bg-red-600/20 text-red-400";
}

async function fetchOrder() {
  const params = new URLSearchParams(window.location.search);
  const id = params.get("id");

  if (!id) {
    loadingEl?.classList.add("hidden");
    emptyEl?.classList.remove("hidden");
    return;
  }

  const token = localStorage.getItem("token");
  if (!token) {
    loadingEl?.classList.add("hidden");
    emptyEl?.classList.remove("hidden");
    emptyEl.textContent = "No hay sesion activa.";
    return;
  }

  try {
    const res = await fetch(`${API_BASE}/api/orders/${id}`, {
      headers: {
        "Accept": "application/json",
        "Authorization": `Bearer ${token}`
      }
    });

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }

    const data = await res.json();

    loadingEl?.classList.add("hidden");
    contentEl?.classList.remove("hidden");

    const status = statusLabel(data?.status);
    if (statusEl) {
      statusEl.textContent = status;
      statusEl.className = `px-3 py-1 rounded-lg text-sm ${statusClass(data?.status)}`;
    }

    const service = data?.service || {};
    const freelancerUser = service?.freelancer_profile?.user || {};
    const freelancerName = `${freelancerUser?.names || ""} ${freelancerUser?.last_names || ""}`.trim() || "Freelancer";

    serviceTitleEl.textContent = service?.title || "Servicio";
    requirementsEl.textContent = data?.requirements || "-";

    if (freelancerPhotoEl) freelancerPhotoEl.src = buildStorageUrl(freelancerUser?.photo) || "https://via.placeholder.com/200";
    freelancerNameEl.textContent = freelancerName;

    priceEl.textContent = formatPrice(data?.amount || service?.price);
    startDateEl.textContent = formatDate(data?.started_at || data?.created_at);
    deliveredDateEl.textContent = formatDate(data?.delivered_at || data?.completed_at);

    const freelancerProfileId = service?.freelancer_profile?.id;
    if (freelancerLinkEl && freelancerProfileId) {
      freelancerLinkEl.setAttribute("href", `/dashboard/company/freelancer?id=${freelancerProfileId}`);
    }
  } catch (err) {
    loadingEl?.classList.add("hidden");
    emptyEl?.classList.remove("hidden");
    console.error(err);
  }
}

fetchOrder();




