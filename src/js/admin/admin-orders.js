const API_BASE = "http://127.0.0.1:8000";

const qInput = document.getElementById("ordersSearchQ");
const orderIdInput = document.getElementById("ordersFilterOrderId");
const statusInput = document.getElementById("ordersFilterStatus");
const userIdInput = document.getElementById("ordersFilterUserId");
const serviceIdInput = document.getElementById("ordersFilterServiceId");

const applyBtn = document.getElementById("ordersApplyFilters");
const clearBtn = document.getElementById("ordersClearFilters");

const alertEl = document.getElementById("ordersAlert");
const emptyEl = document.getElementById("ordersEmpty");
const tbody = document.getElementById("ordersTableBody");

const prevBtn = document.getElementById("ordersPrevPage");
const nextBtn = document.getElementById("ordersNextPage");
const paginationInfo = document.getElementById("ordersPaginationInfo");

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

function showAlert(message, type = "error") {
  if (!alertEl) return;
  alertEl.classList.remove(
    "hidden",
    "border-red-500/30",
    "bg-red-500/10",
    "text-red-300",
    "border-emerald-500/30",
    "bg-emerald-500/10",
    "text-emerald-300"
  );

  if (type === "success") {
    alertEl.classList.add("border-emerald-500/30", "bg-emerald-500/10", "text-emerald-300");
  } else {
    alertEl.classList.add("border-red-500/30", "bg-red-500/10", "text-red-300");
  }

  alertEl.textContent = message;
}

function hideAlert() {
  if (!alertEl) return;
  alertEl.classList.add("hidden");
  alertEl.textContent = "";
}

function statusLabel(status) {
  const value = String(status || "").toLowerCase();
  if (value === "pending") return "Pending";
  if (value === "in_progress") return "In progress";
  if (value === "delivered") return "Delivered";
  if (value === "completed") return "Completed";
  if (value === "cancelled") return "Cancelled";
  return status || "-";
}

function statusClass(status) {
  const value = String(status || "").toLowerCase();
  if (value === "completed") return "text-emerald-400";
  if (value === "pending") return "text-amber-400";
  if (value === "cancelled") return "text-rose-400";
  if (value === "delivered") return "text-cyan-400";
  return "text-indigo-400";
}

function formatCurrency(amount) {
  const n = Number(amount);
  if (Number.isNaN(n)) return amount || "-";
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0
  }).format(n);
}

function getUserName(user) {
  if (!user) return "-";
  const name = `${user.names || ""} ${user.last_names || ""}`.trim();
  return name || user.email || "-";
}

function getFreelancerName(order) {
  const user = order?.service?.freelancer_profile?.user;
  return getUserName(user);
}

function getServiceTitle(order) {
  return order?.service?.title || "-";
}

function showSkeletonRows() {
  if (!tbody) return;
  tbody.innerHTML = `
    <tr class="border-t border-slate-800">
      <td class="p-4"><div class="h-4 w-12 bg-slate-700/70 rounded animate-pulse"></div></td>
      <td class="p-4"><div class="h-4 w-40 bg-slate-700/70 rounded animate-pulse"></div></td>
      <td class="p-4"><div class="h-4 w-36 bg-slate-700/70 rounded animate-pulse"></div></td>
      <td class="p-4"><div class="h-4 w-48 bg-slate-700/70 rounded animate-pulse"></div></td>
      <td class="p-4"><div class="h-4 w-24 bg-slate-700/70 rounded animate-pulse"></div></td>
      <td class="p-4"><div class="h-4 w-24 bg-slate-700/70 rounded animate-pulse"></div></td>
      <td class="p-4"><div class="h-4 w-20 bg-slate-700/70 rounded animate-pulse"></div></td>
    </tr>
    <tr class="border-t border-slate-800">
      <td class="p-4"><div class="h-4 w-12 bg-slate-700/70 rounded animate-pulse"></div></td>
      <td class="p-4"><div class="h-4 w-40 bg-slate-700/70 rounded animate-pulse"></div></td>
      <td class="p-4"><div class="h-4 w-36 bg-slate-700/70 rounded animate-pulse"></div></td>
      <td class="p-4"><div class="h-4 w-48 bg-slate-700/70 rounded animate-pulse"></div></td>
      <td class="p-4"><div class="h-4 w-24 bg-slate-700/70 rounded animate-pulse"></div></td>
      <td class="p-4"><div class="h-4 w-24 bg-slate-700/70 rounded animate-pulse"></div></td>
      <td class="p-4"><div class="h-4 w-20 bg-slate-700/70 rounded animate-pulse"></div></td>
    </tr>
  `;
}

function buildFilters() {
  const filters = {
    q: qInput?.value?.trim() || "",
    order_id: orderIdInput?.value?.trim() || "",
    status: statusInput?.value?.trim() || "",
    user_id: userIdInput?.value?.trim() || "",
    service_id: serviceIdInput?.value?.trim() || ""
  };

  const params = new URLSearchParams();
  params.set("page", String(currentPage));

  Object.entries(filters).forEach(([key, value]) => {
    if (value) params.set(key, value);
  });

  return params.toString();
}

function renderRows(orders) {
  tbody.innerHTML = orders
    .map((order) => {
      const id = order?.id;
      const customerName = getUserName(order?.user);
      const freelancerName = getFreelancerName(order);
      const serviceTitle = getServiceTitle(order);
      const status = statusLabel(order?.status);
      const amount = formatCurrency(order?.amount);

      return `
        <tr class="border-t border-slate-800 hover:bg-slate-800/40 transition">
          <td class="p-4 font-semibold">#${escapeHtml(id)}</td>
          <td class="p-4">${escapeHtml(customerName)}</td>
          <td class="p-4">${escapeHtml(freelancerName)}</td>
          <td class="p-4">${escapeHtml(serviceTitle)}</td>
          <td class="p-4"><span class="${statusClass(order?.status)}">${escapeHtml(status)}</span></td>
          <td class="p-4">${escapeHtml(amount)}</td>
          <td class="p-4">
            <a href="/dashboard/admin/ordenDetalle?id=${escapeHtml(id)}" class="text-indigo-400 hover:underline">Ver detalle</a>
          </td>
        </tr>
      `;
    })
    .join("");
}

function renderPagination(meta) {
  const page = Number(meta?.current_page || currentPage || 1);
  const totalPages = Number(meta?.last_page || 1);
  const from = Number(meta?.from || 0);
  const to = Number(meta?.to || 0);
  const total = Number(meta?.total || 0);

  currentPage = page;
  lastPage = totalPages;

  if (paginationInfo) {
    paginationInfo.textContent = total > 0
      ? `Mostrando ${from}-${to} de ${total} ordenes`
      : "Sin resultados";
  }

  if (prevBtn) prevBtn.disabled = page <= 1;
  if (nextBtn) nextBtn.disabled = page >= totalPages;
}

async function fetchOrders() {
  try {
    hideAlert();
    emptyEl?.classList.add("hidden");
    showSkeletonRows();

    const query = buildFilters();
    const res = await fetch(`${API_BASE}/api/orders?${query}`, {
      headers: getAuthHeaders()
    });

    if (res.status === 401) {
      showAlert("Sesion expirada o sin permisos. Inicia sesion como admin.");
      tbody.innerHTML = "";
      return;
    }

    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const payload = await res.json();
    const orders = Array.isArray(payload?.data) ? payload.data : [];

    if (!orders.length) {
      tbody.innerHTML = "";
      emptyEl?.classList.remove("hidden");
      renderPagination(payload || {});
      return;
    }

    renderRows(orders);
    renderPagination(payload || {});
  } catch (error) {
    console.error("Error cargando ordenes:", error);
    tbody.innerHTML = "";
    emptyEl?.classList.remove("hidden");
    showAlert("No se pudieron cargar las ordenes.");
  }
}

function debounce(fn, wait = 350) {
  let timer = null;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), wait);
  };
}

const onSearch = debounce(() => {
  currentPage = 1;
  fetchOrders();
}, 350);

applyBtn?.addEventListener("click", () => {
  currentPage = 1;
  fetchOrders();
});

clearBtn?.addEventListener("click", () => {
  if (qInput) qInput.value = "";
  if (orderIdInput) orderIdInput.value = "";
  if (statusInput) statusInput.value = "";
  if (userIdInput) userIdInput.value = "";
  if (serviceIdInput) serviceIdInput.value = "";
  currentPage = 1;
  fetchOrders();
});

qInput?.addEventListener("input", onSearch);
statusInput?.addEventListener("change", () => {
  currentPage = 1;
  fetchOrders();
});

orderIdInput?.addEventListener("change", () => {
  currentPage = 1;
  fetchOrders();
});

userIdInput?.addEventListener("change", () => {
  currentPage = 1;
  fetchOrders();
});

serviceIdInput?.addEventListener("change", () => {
  currentPage = 1;
  fetchOrders();
});

prevBtn?.addEventListener("click", () => {
  if (currentPage <= 1) return;
  currentPage -= 1;
  fetchOrders();
});

nextBtn?.addEventListener("click", () => {
  if (currentPage >= lastPage) return;
  currentPage += 1;
  fetchOrders();
});

fetchOrders();
