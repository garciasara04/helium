const API_BASE = "http://127.0.0.1:8000";

const searchInput = document.getElementById("servicesSearch");
const categorySelect = document.getElementById("servicesCategory");
const minPriceInput = document.getElementById("servicesMinPrice");
const maxPriceInput = document.getElementById("servicesMaxPrice");
const statusSelect = document.getElementById("servicesStatus");

const applyBtn = document.getElementById("servicesApply");
const clearBtn = document.getElementById("servicesClear");

const statTotalEl = document.getElementById("servicesStatTotal");
const statActiveEl = document.getElementById("servicesStatActive");
const statInactiveEl = document.getElementById("servicesStatInactive");

const alertEl = document.getElementById("servicesAlert");
const emptyEl = document.getElementById("servicesEmpty");
const tableBody = document.getElementById("servicesTableBody");

const paginationInfo = document.getElementById("servicesPaginationInfo");
const prevBtn = document.getElementById("servicesPrev");
const nextBtn = document.getElementById("servicesNext");

let currentPage = 1;
let lastPage = 1;
const categoryMap = new Map();

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

function formatCurrency(value) {
  const n = Number(value);
  if (Number.isNaN(n)) return value || "-";
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0
  }).format(n);
}

function getCategory(service) {
  return service?.category?.name || service?.category || "-";
}

function getFreelancerName(service) {
  const user = service?.freelancer?.name
    || `${service?.freelancer_profile?.user?.names || ""} ${service?.freelancer_profile?.user?.last_names || ""}`.trim();
  return user || "-";
}

function getIsActive(service) {
  if (typeof service?.is_active === "boolean") return service.is_active;
  if (typeof service?.is_active === "number") return service.is_active === 1;
  return true;
}

function renderCategoryOptions() {
  if (!categorySelect) return;
  const currentValue = categorySelect.value;
  const options = ['<option value="">Todas las categorias</option>'];

  [...categoryMap.entries()]
    .sort((a, b) => String(a[1]).localeCompare(String(b[1])))
    .forEach(([id, name]) => {
      options.push(`<option value="${escapeHtml(id)}">${escapeHtml(name)}</option>`);
    });

  categorySelect.innerHTML = options.join("");
  categorySelect.value = currentValue;
}

function applyLocalStatusFilter(services) {
  const statusValue = statusSelect?.value?.trim() || "";
  if (statusValue === "") return services;

  const wanted = statusValue === "1";
  return services.filter((service) => getIsActive(service) === wanted);
}

function renderSkeleton() {
  if (!tableBody) return;
  tableBody.innerHTML = `
    <tr class="border-t border-slate-800">
      <td class="p-4" colspan="8"><div class="h-4 bg-slate-700/70 rounded animate-pulse"></div></td>
    </tr>
    <tr class="border-t border-slate-800">
      <td class="p-4" colspan="8"><div class="h-4 bg-slate-700/70 rounded animate-pulse"></div></td>
    </tr>
    <tr class="border-t border-slate-800">
      <td class="p-4" colspan="8"><div class="h-4 bg-slate-700/70 rounded animate-pulse"></div></td>
    </tr>
  `;
}

function renderRows(services) {
  if (!tableBody) return;

  tableBody.innerHTML = services
    .map((service) => {
      const id = service?.id;
      const title = service?.title || "-";
      const category = getCategory(service);
      const freelancer = getFreelancerName(service);
      const price = formatCurrency(service?.price);
      const ratingRaw = Number(service?.avg_rating ?? service?.reviews_avg_rating ?? 0);
      const reviewsCount = Number(service?.reviews_count ?? 0);
      const active = getIsActive(service);

      return `
        <tr class="border-t border-slate-800 hover:bg-slate-800/40 transition">
          <td class="p-4 font-semibold">#${escapeHtml(id)}</td>
          <td class="p-4">${escapeHtml(title)}</td>
          <td class="p-4">${escapeHtml(category)}</td>
          <td class="p-4">${escapeHtml(freelancer)}</td>
          <td class="p-4">${escapeHtml(price)}</td>
          <td class="p-4 text-amber-400">★ ${reviewsCount > 0 ? escapeHtml(ratingRaw.toFixed(1)) : "Sin calificacion"}</td>
          <td class="p-4 ${active ? "text-emerald-400" : "text-rose-400"}">${active ? "Activo" : "Inactivo"}</td>
          <td class="p-4"><a href="/dashboard/admin/servicios" class="text-indigo-400 hover:underline">Ver</a></td>
        </tr>
      `;
    })
    .join("");
}

function updateStats(payload, servicesVisible) {
  const pagination = payload?.pagination || payload;
  const total = Number(pagination?.total || 0);
  const active = servicesVisible.filter((s) => getIsActive(s)).length;
  const inactive = servicesVisible.length - active;

  if (statTotalEl) statTotalEl.textContent = String(total);
  if (statActiveEl) statActiveEl.textContent = String(active);
  if (statInactiveEl) statInactiveEl.textContent = String(inactive);
}

function updatePagination(payload) {
  const pagination = payload?.pagination || payload || {};
  currentPage = Number(pagination?.current_page || currentPage || 1);
  lastPage = Number(pagination?.last_page || 1);
  const from = Number(pagination?.from || 0);
  const to = Number(pagination?.to || 0);
  const total = Number(pagination?.total || 0);

  if (paginationInfo) {
    paginationInfo.textContent = total > 0
      ? `Mostrando ${from}-${to} de ${total} servicios`
      : "Sin resultados";
  }

  if (prevBtn) prevBtn.disabled = currentPage <= 1;
  if (nextBtn) nextBtn.disabled = currentPage >= lastPage;
}

function buildQuery() {
  const params = new URLSearchParams();
  params.set("page", String(currentPage));

  const search = searchInput?.value?.trim();
  const categoryId = categorySelect?.value?.trim();
  const minPrice = minPriceInput?.value?.trim();
  const maxPrice = maxPriceInput?.value?.trim();

  if (search) params.set("search", search);
  if (categoryId) params.set("category_id", categoryId);
  if (minPrice) params.set("min_price", minPrice);
  if (maxPrice) params.set("max_price", maxPrice);

  const status = statusSelect?.value?.trim();
  if (status !== "") params.set("is_active", status);

  return params.toString();
}

async function fetchServices() {
  try {
    hideAlert();
    emptyEl?.classList.add("hidden");
    renderSkeleton();

    const query = buildQuery();
    const res = await fetch(`${API_BASE}/api/services?${query}`, {
      headers: getAuthHeaders()
    });

    if (res.status === 401) {
      throw new Error("Sesion expirada o sin permisos.");
    }

    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const payload = await res.json();
    let services = Array.isArray(payload?.services)
      ? payload.services
      : Array.isArray(payload?.data)
        ? payload.data
        : Array.isArray(payload)
          ? payload
          : [];

    services.forEach((service) => {
      const categoryObj = service?.category;
      if (categoryObj && typeof categoryObj === "object" && categoryObj.id) {
        categoryMap.set(String(categoryObj.id), categoryObj.name || `Categoria ${categoryObj.id}`);
      }
    });
    renderCategoryOptions();

    services = applyLocalStatusFilter(services);

    if (!services.length) {
      tableBody.innerHTML = "";
      emptyEl?.classList.remove("hidden");
      updateStats(payload, []);
      updatePagination(payload);
      return;
    }

    renderRows(services);
    updateStats(payload, services);
    updatePagination(payload);
  } catch (error) {
    console.error("Error cargando servicios admin:", error);
    tableBody.innerHTML = "";
    emptyEl?.classList.remove("hidden");
    showAlert("No se pudieron cargar los servicios.");
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
  fetchServices();
}, 350);

applyBtn?.addEventListener("click", () => {
  currentPage = 1;
  fetchServices();
});

clearBtn?.addEventListener("click", () => {
  if (searchInput) searchInput.value = "";
  if (categorySelect) categorySelect.value = "";
  if (minPriceInput) minPriceInput.value = "";
  if (maxPriceInput) maxPriceInput.value = "";
  if (statusSelect) statusSelect.value = "";
  currentPage = 1;
  fetchServices();
});

searchInput?.addEventListener("input", onSearch);
categorySelect?.addEventListener("change", () => { currentPage = 1; fetchServices(); });
minPriceInput?.addEventListener("change", () => { currentPage = 1; fetchServices(); });
maxPriceInput?.addEventListener("change", () => { currentPage = 1; fetchServices(); });
statusSelect?.addEventListener("change", () => { currentPage = 1; fetchServices(); });

prevBtn?.addEventListener("click", () => {
  if (currentPage <= 1) return;
  currentPage -= 1;
  fetchServices();
});

nextBtn?.addEventListener("click", () => {
  if (currentPage >= lastPage) return;
  currentPage += 1;
  fetchServices();
});

fetchServices();
