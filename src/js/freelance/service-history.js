const API_BASE = "http://127.0.0.1:8000";

const serviceSelect = document.getElementById("historyService");
const statusSelect = document.getElementById("historyStatus");
const searchInput = document.getElementById("historySearch");
const tableBody = document.getElementById("serviceHistoryBody");

let servicesCache = [];
let ordersCache = [];

function getTokenOrRedirect() {
  const token = localStorage.getItem("token");
  if (!token) {
    window.location.href = "/login";
    return null;
  }
  return token;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function statusLabel(status) {
  const v = String(status || "").toLowerCase();
  if (v === "completed") return "Completado";
  if (v === "cancelled") return "Cancelado";
  return status || "-";
}

function statusClass(status) {
  const v = String(status || "").toLowerCase();
  if (v === "completed") return "bg-green-600/20 text-green-400";
  return "bg-red-600/20 text-red-400";
}

function formatDate(value) {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleDateString("es-CO", { year: "numeric", month: "short", day: "2-digit" });
}

function formatMoney(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return `$${escapeHtml(value)}`;
  return n.toLocaleString("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 });
}

function isHistoryStatus(status) {
  const value = String(status || "").toLowerCase();
  return value === "completed" || value === "cancelled";
}

function normalizeServices(payload) {
  const raw = Array.isArray(payload?.services)
    ? payload.services
    : Array.isArray(payload?.data)
      ? payload.data
      : Array.isArray(payload)
        ? payload
        : [];

  return raw.map((s) => ({
    id: Number(s?.id),
    title: s?.title || `Servicio #${s?.id || ""}`
  })).filter((s) => Number.isFinite(s.id));
}

function normalizeOrders(payload) {
  const raw = Array.isArray(payload?.data)
    ? payload.data
    : Array.isArray(payload)
      ? payload
      : [];

  return raw.map((o) => ({
    id: Number(o?.id),
    status: String(o?.status || ""),
    amount: o?.amount,
    created_at: o?.created_at || o?.started_at,
    service_id: Number(o?.service_id || o?.service?.id),
    service_title: o?.service?.title || "Servicio",
    client_name: `${o?.user?.names || ""} ${o?.user?.last_names || ""}`.trim() || o?.user?.email || "Cliente",
  })).filter((o) => Number.isFinite(o.id) && isHistoryStatus(o.status));
}

function getSelectedServiceId() {
  const value = Number(serviceSelect?.value || 0);
  return Number.isFinite(value) && value > 0 ? value : null;
}

function applyFilters() {
  if (!tableBody) return;

  const serviceId = getSelectedServiceId();
  const status = String(statusSelect?.value || "all");
  const term = String(searchInput?.value || "").trim().toLowerCase();

  const rows = ordersCache.filter((o) => {
    if (serviceId && o.service_id !== serviceId) return false;
    if (status !== "all" && String(o.status) !== status) return false;

    if (!term) return true;

    const haystack = [
      o.id,
      o.client_name,
      o.service_title,
      o.status
    ].join(" ").toLowerCase();

    return haystack.includes(term);
  });

  if (!rows.length) {
    tableBody.innerHTML = '<tr><td colspan="6" class="px-5 py-10 text-center text-slate-400">No hay ordenes para los filtros seleccionados.</td></tr>';
    return;
  }

  tableBody.innerHTML = rows.map((o) => `
    <tr class="hover:bg-slate-800/40 transition-colors">
      <td class="px-5 py-4 font-medium text-slate-200">#${escapeHtml(o.id)}</td>
      <td class="px-5 py-4 text-slate-300">${escapeHtml(o.client_name)}</td>
      <td class="px-5 py-4 text-slate-300">${escapeHtml(o.service_title)}</td>
      <td class="px-5 py-4"><span class="px-2 py-1 rounded text-xs ${statusClass(o.status)}">${escapeHtml(statusLabel(o.status))}</span></td>
      <td class="px-5 py-4 text-slate-200">${escapeHtml(formatMoney(o.amount))}</td>
      <td class="px-5 py-4 text-slate-400">${escapeHtml(formatDate(o.created_at))}</td>
    </tr>
  `).join("");
}

function fillServiceSelect(services) {
  if (!serviceSelect) return;

  const params = new URLSearchParams(window.location.search);
  const requestedServiceId = Number(params.get("service_id") || 0);

  const options = [
    '<option value="">Todos mis servicios</option>',
    ...services.map((s) => `<option value="${s.id}">${escapeHtml(s.title)}</option>`)
  ];

  serviceSelect.innerHTML = options.join("");

  if (requestedServiceId && services.some((s) => s.id === requestedServiceId)) {
    serviceSelect.value = String(requestedServiceId);
  }
}

async function loadData() {
  const token = getTokenOrRedirect();
  if (!token) return;

  try {
    const [servicesRes, ordersRes] = await Promise.all([
      fetch(`${API_BASE}/api/personaServices`, {
        headers: { Accept: "application/json", Authorization: `Bearer ${token}` }
      }),
      fetch(`${API_BASE}/api/orders`, {
        headers: { Accept: "application/json", Authorization: `Bearer ${token}` }
      })
    ]);

    if (!servicesRes.ok) throw new Error(`HTTP ${servicesRes.status} cargando servicios`);
    if (!ordersRes.ok) throw new Error(`HTTP ${ordersRes.status} cargando ordenes`);

    const servicesPayload = await servicesRes.json();
    const ordersPayload = await ordersRes.json();

    servicesCache = normalizeServices(servicesPayload);
    ordersCache = normalizeOrders(ordersPayload);

    fillServiceSelect(servicesCache);
    applyFilters();
  } catch (error) {
    console.error("Error cargando historial por servicio:", error);
    if (tableBody) {
      tableBody.innerHTML = '<tr><td colspan="6" class="px-5 py-10 text-center text-red-400">No se pudo cargar el historial de ordenes.</td></tr>';
    }
  }
}

serviceSelect?.addEventListener("change", applyFilters);
statusSelect?.addEventListener("change", applyFilters);
searchInput?.addEventListener("input", applyFilters);

loadData();






