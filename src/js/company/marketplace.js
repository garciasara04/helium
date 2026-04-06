const API_BASE = "http://127.0.0.1:8000";

const gridEl = document.getElementById("freelancersGrid");
const emptyEl = document.getElementById("freelancersEmpty");
const loadingEl = document.getElementById("freelancersLoading");
const searchForm = document.getElementById("freelancerSearch");

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

function buildCard(profile) {
  const user = profile?.user || {};
  const name = `${user?.names || ""} ${user?.last_names || ""}`.trim() || "Freelancer";
  const profession = profile?.profession || "Profesional";
  const description = profile?.description || "";
  const servicesCount = profile?.services_count ?? 0;
  const photo = buildStorageUrl(user?.photo) || "/logo.jpeg";
  const profileId = profile?.id;

  return `
    <div class="group bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden hover:border-indigo-500 transition-all duration-300 hover:scale-[1.04] hover:shadow-xl opacity-0 translate-y-4">
      <div class="relative h-44 overflow-hidden bg-slate-800">
        <img src="${escapeHtml(photo)}" class="h-44 w-full object-cover group-hover:scale-110 transition-transform duration-500 ease-out" />
      </div>
      <div class="p-5">
        <h3 class="font-bold text-white text-lg group-hover:text-indigo-400 transition">${escapeHtml(name)}</h3>
        <p class="text-purple-400 text-sm mt-1">${escapeHtml(profession)}</p>
        <p class="text-slate-400 text-sm mt-2">${escapeHtml(description)}</p>
        <p class="text-slate-500 text-xs mt-3">Servicios activos: ${escapeHtml(servicesCount)}</p>
        <a href="/dashboard/company/freelancer?id=${escapeHtml(profileId)}" class="mt-4 inline-block bg-purple-600 hover:bg-purple-500 px-4 py-2 rounded-lg text-white transition">
          Ver perfil
        </a>
      </div>
    </div>
  `;
}

function buildQueryFromUrl() {
  const params = new URLSearchParams(window.location.search);
  const query = new URLSearchParams();

  const search = params.get("search");
  const categoryId = params.get("category_id");

  if (search) query.set("search", search);
  if (categoryId) query.set("category_id", categoryId);

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

async function fetchFreelancers() {
  try {
    const query = buildQueryFromUrl();
    const url = `${API_BASE}/api/freelancers${query.toString() ? `?${query}` : ""}`;

    const res = await fetch(url, {
      headers: {
        Accept: "application/json"
      }
    });

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }

    const data = await res.json();
    const profiles = Array.isArray(data) ? data : (data?.data || []);

    loadingEl?.classList.add("hidden");

    if (!profiles.length) {
      emptyEl?.classList.remove("hidden");
      return;
    }

    gridEl.innerHTML = profiles.map(buildCard).join("");
    applyStaggerReveal();
  } catch (err) {
    loadingEl?.classList.add("hidden");
    emptyEl?.classList.remove("hidden");
    emptyEl.textContent = "Error al cargar freelancers.";
    console.error(err);
  }
}

if (searchForm) {
  const input = searchForm.querySelector("input[name='search']");
  const params = new URLSearchParams(window.location.search);
  if (input && params.get("search")) {
    input.value = params.get("search");
  }

  searchForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const value = input?.value?.trim() || "";

    if (value && value.length < 2) {
      window.appToast("Escribe al menos 2 caracteres para buscar.", { tone: "warning" });
      return;
    }

    const nextParams = new URLSearchParams(window.location.search);
    if (value) nextParams.set("search", value);
    else nextParams.delete("search");
    window.location.search = nextParams.toString();
  });
}

fetchFreelancers();
