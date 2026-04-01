const API_BASE = "http://127.0.0.1:8000";

const params = new URLSearchParams(window.location.search);
const orderId = params.get("id");

const alertEl = document.getElementById("orderDetailAlert");
const skeletonEl = document.getElementById("orderInfoSkeleton");
const infoEl = document.getElementById("orderInfo");

const statusBadgeEl = document.getElementById("orderStatusBadge");
const createdAtEl = document.getElementById("orderCreatedAt");
const startedAtEl = document.getElementById("orderStartedAt");
const deliveredAtEl = document.getElementById("orderDeliveredAt");
const completedAtEl = document.getElementById("orderCompletedAt");
const cancelledAtEl = document.getElementById("orderCancelledAt");

const buyerNameEl = document.getElementById("orderBuyerName");
const buyerEmailEl = document.getElementById("orderBuyerEmail");
const buyerLinkEl = document.getElementById("orderBuyerLink");

const freelancerNameEl = document.getElementById("orderFreelancerName");
const serviceTitleEl = document.getElementById("orderServiceTitle");
const freelancerLinkEl = document.getElementById("orderFreelancerLink");

const requirementsEl = document.getElementById("orderRequirements");

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
  return d.toLocaleString("es-CO");
}

function formatCurrency(value) {
  const n = Number(value);
  if (Number.isNaN(n)) return value || "-";
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0
  }).format(n);
}

function statusLabel(status) {
  const v = String(status || "").toLowerCase();
  if (v === "pending") return "Pending";
  if (v === "in_progress") return "In progress";
  if (v === "delivered") return "Delivered";
  if (v === "completed") return "Completed";
  if (v === "cancelled") return "Cancelled";
  return status || "-";
}

function statusClass(status) {
  const v = String(status || "").toLowerCase();
  if (v === "completed") return "bg-emerald-500/20 text-emerald-300";
  if (v === "pending") return "bg-amber-500/20 text-amber-300";
  if (v === "in_progress") return "bg-indigo-500/20 text-indigo-300";
  if (v === "delivered") return "bg-cyan-500/20 text-cyan-300";
  if (v === "cancelled") return "bg-rose-500/20 text-rose-300";
  return "bg-slate-700 text-slate-300";
}

function userName(user) {
  if (!user) return "-";
  const name = `${user?.names || ""} ${user?.last_names || ""}`.trim();
  return name || user?.email || "-";
}

function renderInfo(order) {
  const status = statusLabel(order?.status);

  infoEl.innerHTML = `
    <div><dt class="text-slate-400">ID orden</dt><dd class="font-semibold">#${escapeHtml(order?.id)}</dd></div>
    <div><dt class="text-slate-400">Servicio ID</dt><dd class="font-semibold">${escapeHtml(order?.service_id)}</dd></div>
    <div><dt class="text-slate-400">Titulo del servicio</dt><dd class="font-semibold">${escapeHtml(order?.service?.title || "-")}</dd></div>
    <div><dt class="text-slate-400">Categoria</dt><dd class="font-semibold">${escapeHtml(order?.service?.category?.name || "-")}</dd></div>
    <div><dt class="text-slate-400">Referencia PSE</dt><dd class="font-semibold">${escapeHtml(order?.pse_reference || "-")}</dd></div>
    <div><dt class="text-slate-400">Monto</dt><dd class="font-semibold text-emerald-400">${escapeHtml(formatCurrency(order?.amount))}</dd></div>
    <div><dt class="text-slate-400">Estado</dt><dd class="font-semibold">${escapeHtml(status)}</dd></div>
    <div><dt class="text-slate-400">Ultima actualizacion</dt><dd class="font-semibold">${escapeHtml(formatDate(order?.updated_at))}</dd></div>
  `;

  if (statusBadgeEl) {
    statusBadgeEl.textContent = status;
    statusBadgeEl.className = `inline-flex px-3 py-1 rounded-lg text-sm ${statusClass(order?.status)}`;
  }

  if (createdAtEl) createdAtEl.textContent = formatDate(order?.created_at);
  if (startedAtEl) startedAtEl.textContent = formatDate(order?.started_at);
  if (deliveredAtEl) deliveredAtEl.textContent = formatDate(order?.delivered_at);
  if (completedAtEl) completedAtEl.textContent = formatDate(order?.completed_at);
  if (cancelledAtEl) cancelledAtEl.textContent = formatDate(order?.cancelled_at);

  const buyer = order?.user;
  if (buyerNameEl) buyerNameEl.textContent = userName(buyer);
  if (buyerEmailEl) buyerEmailEl.textContent = buyer?.email || "-";
  if (buyerLinkEl && buyer?.id) buyerLinkEl.href = `/dashboard/admin/usuarioDetalle?id=${buyer.id}`;

  const freelancerUser = order?.service?.freelancer_profile?.user;
  const freelancerProfileId = order?.service?.freelancer_profile?.id;
  if (freelancerNameEl) freelancerNameEl.textContent = userName(freelancerUser);
  if (serviceTitleEl) serviceTitleEl.textContent = order?.service?.title || "-";
  if (freelancerLinkEl && freelancerProfileId) freelancerLinkEl.href = `/dashboard/admin/perfilFreelancer?id=${freelancerProfileId}`;

  if (requirementsEl) requirementsEl.textContent = order?.requirements || "Sin requerimientos registrados.";

  skeletonEl?.classList.add("hidden");
  infoEl?.classList.remove("hidden");
}

async function fetchOrder() {
  if (!orderId) {
    showAlert("No se encontro el id de la orden en la URL.");
    return;
  }

  try {
    hideAlert();

    const res = await fetch(`${API_BASE}/api/orders/${orderId}`, {
      headers: getAuthHeaders()
    });

    if (res.status === 401) {
      showAlert("Sesion expirada o sin permisos para ver esta orden.");
      return;
    }

    if (res.status === 404) {
      showAlert("No se encontro la orden solicitada.");
      return;
    }

    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const payload = await res.json();
    const order = payload?.data || payload?.order || payload;
    if (!order || typeof order !== "object") throw new Error("Respuesta invalida");

    renderInfo(order);
  } catch (err) {
    console.error("Error cargando detalle de orden:", err);
    showAlert("No se pudo cargar el detalle de la orden.");
  }
}

fetchOrder();
