const API_BASE = "http://127.0.0.1:8000";

const gridEl = document.getElementById("servicesGrid");
const emptyEl = document.getElementById("servicesEmpty");
const loadingEl = document.getElementById("servicesLoading");

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
function formatRating(value) {
  const star = "\u2605";
  const num = Number(value);
  if (!Number.isFinite(num) || num <= 0) return `${star} Sin calificacion`;
  return `${star} ${num.toFixed(1)}`;
}

function buildCard(service) {
  const title = service?.title || service?.name || "Servicio";
  const freelancer = service?.freelancer?.name || service?.freelancer_name || "Freelancer";
  const price = service?.price || service?.amount || "";
  const rating = service?.avg_rating ?? service?.rating ?? null;
  const category = service?.category?.name || service?.category_name || service?.category || "";
  const image = buildStorageUrl(service?.photo || service?.image || service?.image_url) || "https://via.placeholder.com/600";

  return `
    <div class="group bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden hover:border-indigo-500 transition-all duration-300 hover:scale-[1.04] hover:shadow-xl opacity-0 translate-y-4">
      <div class="relative h-44 overflow-hidden bg-slate-800" -wrapper>
        <img src="${escapeHtml(image)}" class="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500 ease-out" />\n${category ? `<div class="absolute top-3 left-3 bg-black/60 backdrop-blur text-xs text-white px-3 py-1 rounded-full">${escapeHtml(category)}</div>` : ""}
      </div>

      <div class="p-5">
        <h3 class="text-white font-semibold text-lg mb-2 group-hover:text-indigo-400 transition">
          ${escapeHtml(title)}
        </h3>

        <p class="text-slate-400 text-sm mb-4">
          Freelancer: ${escapeHtml(freelancer)}
        </p>

        <div class="flex items-center justify-between">
          <div class="flex items-center gap-1 text-yellow-400 text-sm">
            ${formatRating(rating)}
          </div>
          <div class="text-indigo-400 font-bold">
            ${price ? `$${escapeHtml(price)}` : ""}
          </div>
        </div>

        <a href="/dashboard/company/servicio-detalle?id=${escapeHtml(service.id)}" class="mt-5 block w-full bg-indigo-600 hover:bg-indigo-500 transition text-white py-2 rounded-lg text-sm text-center">
          Ver servicio
        </a>
      </div>
    </div>
  `;
}

function buildQueryFromUrl() {
  const params = new URLSearchParams(window.location.search);
  const query = new URLSearchParams();

  const search = params.get("search") || params.get("q");
  const categoryId = params.get("category_id");
  const skillId = params.get("skill_id");
  const minPrice = params.get("min_price");
  const maxPrice = params.get("max_price");

  if (search) query.set("search", search);
  if (categoryId) query.set("category_id", categoryId);
  if (skillId) query.set("skill_id", skillId);
  if (minPrice) query.set("min_price", minPrice);
  if (maxPrice) query.set("max_price", maxPrice);

  return query;
}

function applyStaggerReveal() {
  const cards = gridEl?.querySelectorAll(".group") || [];
  cards.forEach((card, index) => {
    setTimeout(() => {
      card.classList.remove("opacity-0", "translate-y-4");
      card.classList.add("opacity-100", "translate-y-0");
    }, 60 * index);
  });
}

async function fetchServices() {
  try {
    const query = buildQueryFromUrl();
    const url = `${API_BASE}/api/services${query.toString() ? `?${query}` : ""}`;

    const res = await fetch(url, {
      headers: {
        "Accept": "application/json"
      }
    });

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }

    const data = await res.json();
    const services = Array.isArray(data)
      ? data
      : (data?.services || data?.data || []);

    loadingEl?.classList.add("hidden");

    if (!services.length) {
      emptyEl?.classList.remove("hidden");
      return;
    }

    gridEl.innerHTML = services.map(buildCard).join("");
    applyStaggerReveal();
  } catch (err) {
    loadingEl?.classList.add("hidden");
    emptyEl?.classList.remove("hidden");
    emptyEl.textContent = "Error al cargar servicios.";
    console.error(err);
  }
}

fetchServices();








