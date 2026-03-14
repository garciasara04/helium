const API_BASE = "http://127.0.0.1:8000";

const gridEl = document.getElementById("ordersGrid");
const emptyEl = document.getElementById("ordersEmpty");
const loadingEl = document.getElementById("ordersLoading");

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function buildStorageUrl(path) {
  if (!path) return "";
  if (/^https?:\/\//i.test(path)) return path;
  if (path.startsWith("/storage/")) return `http://127.0.0.1:8000${path}`;
  return `http://127.0.0.1:8000/storage/${path}`;
}
function formatPrice(value) {
  if (value === null || value === undefined || value === "") return "";
  const num = Number(value);
  if (!Number.isFinite(num)) return `$${escapeHtml(value)}`;
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

function formatStatus(status) {
  const value = (status || "").toLowerCase();
  if (value === "completed") return "Completado";
  if (value === "in_progress") return "En progreso";
  if (value === "delivered") return "Entregado";
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

function buildCard(order) {
  const service = order?.service || {};
  const freelancerUser = service?.freelancer_profile?.user || {};
  const freelancerName = `${freelancerUser?.names || ""} ${freelancerUser?.last_names || ""}`.trim() || "Freelancer";
  const serviceTitle = service?.title || "Servicio";
  const price = formatPrice(order?.amount || service?.price);
  const date = formatDate(order?.created_at || order?.started_at);
  const status = formatStatus(order?.status);
  const statusClassName = statusClass(order?.status);
  const image = buildStorageUrl(freelancerUser?.photo) || "https://via.placeholder.com/200";

  return `
    <div class="bg-slate-900 border border-slate-800 rounded-xl p-6 hover:border-indigo-500 transition flex flex-col justify-between">
      <div>
        <div class="flex items-center gap-4 mb-5">
          <img src="${escapeHtml(image)}" class="w-14 h-14 rounded-full object-cover" />
          <div>
            <h3 class="text-white font-semibold">${escapeHtml(freelancerName)}</h3>
            <p class="text-sm text-slate-400">${escapeHtml(serviceTitle)}</p>
          </div>
        </div>

        <div class="space-y-2 text-sm text-slate-400">
          <div class="flex justify-between">
            <span>Precio</span>
            <span class="text-white">${price}</span>
          </div>

          <div class="flex justify-between">
            <span>Fecha</span>
            <span class="text-white">${escapeHtml(date)}</span>
          </div>

          <div class="flex justify-between">
            <span>Estado</span>
            <span class="px-2 py-1 rounded text-xs ${statusClassName}">${escapeHtml(status)}</span>
          </div>
        </div>
      </div>

      <div class="mt-6">
        <a href="/dashboard/company/orden-detalle?id=${escapeHtml(order?.id)}" class="block text-center bg-indigo-600 hover:bg-indigo-500 transition py-2 rounded-lg text-sm font-semibold">
          Ver detalles
        </a>
      </div>
    </div>
  `;
}

async function fetchOrders() {
  const token = localStorage.getItem("token");
  if (!token) {
    loadingEl?.classList.add("hidden");
    emptyEl?.classList.remove("hidden");
    emptyEl.textContent = "No hay sesion activa.";
    return;
  }

  try {
    const res = await fetch(`${API_BASE}/api/orders`, {
      headers: {
        "Accept": "application/json",
        "Authorization": `Bearer ${token}`
      }
    });

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }

    const data = await res.json();
    const orders = Array.isArray(data) ? data : (data?.data || []);

    loadingEl?.classList.add("hidden");

    if (!orders.length) {
      emptyEl?.classList.remove("hidden");
      return;
    }

    gridEl.innerHTML = orders.map(buildCard).join("");
  } catch (err) {
    loadingEl?.classList.add("hidden");
    emptyEl?.classList.remove("hidden");
    emptyEl.textContent = "Error al cargar ordenes.";
    console.error(err);
  }
}

fetchOrders();


