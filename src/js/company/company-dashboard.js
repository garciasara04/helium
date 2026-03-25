const API_BASE = "http://127.0.0.1:8000";

const freelancersContainer = document.getElementById("recommendedFreelancers");
const projectsContainer = document.getElementById("activeProjects");
const servicesContainer = document.getElementById("popularServices");
const star = "\u2605";

const STATUS_META = {
  pending: { label: "Pendiente", progress: 10 },
  in_progress: { label: "En progreso", progress: 50 },
  delivered: { label: "Entregado", progress: 80 },
  completed: { label: "Completado", progress: 100 },
  cancelled: { label: "Cancelado", progress: 0 }
};

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
  if (path.startsWith("/storage/")) return `${API_BASE}${path}`;
  return `${API_BASE}/storage/${path}`;
}

function formatRating(value) {
  if (value === null || value === undefined) return "0.0";
  const num = Number(value);
  if (!Number.isFinite(num)) return "0.0";
  return num.toFixed(1);
}

function getAuthHeaders() {
  const token = localStorage.getItem("token");
  const headers = { Accept: "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

function buildProjectCard(order, index) {
  const status = order?.status || "pending";
  const meta = STATUS_META[status] || STATUS_META.pending;
  const title = order?.service?.title || `Orden #${order?.id || "-"}`;

  const freelancerUser = order?.service?.freelancer_profile?.user || {};
  const freelancerName = `${freelancerUser?.names || ""} ${freelancerUser?.last_names || ""}`.trim() || "Freelancer";

  return `
    <div class="bg-slate-900 p-6 rounded-xl border border-slate-800 opacity-0 translate-y-2" style="animation: fadeUp 0.45s ease ${index * 0.07}s forwards;">
      <div class="flex justify-between gap-4 flex-col md:flex-row md:items-center">
        <div>
          <h3 class="font-bold">${escapeHtml(title)}</h3>
          <p class="text-slate-400">con ${escapeHtml(freelancerName)} · ${meta.label}</p>
        </div>
        <div class="w-full md:w-56">
          <div class="bg-slate-700 rounded-full h-3 overflow-hidden">
            <div class="bg-purple-600 h-3" style="width:0%" data-progress-fill data-target-progress="${meta.progress}"></div>
          </div>
          <p class="text-purple-400 text-right text-sm mt-1">${meta.progress}%</p>
        </div>
      </div>
    </div>
  `;
}

function buildPopularServiceCard(service, index) {
  const title = service?.title || "Servicio";
  const image = buildStorageUrl(service?.photo || service?.image || service?.image_url) || "/image.png";
  const price = Number(service?.price);
  const priceText = Number.isFinite(price)
    ? price.toLocaleString("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 })
    : "$0";

  const reviews = Number(service?.reviews_count || 0);
  const ratingValue = Number(service?.avg_rating ?? service?.rating ?? 0);
  const ratingText = (reviews > 0 && Number.isFinite(ratingValue) && ratingValue > 0)
    ? `${star} ${ratingValue.toFixed(1)} (${reviews})`
    : `${star} Sin calificacion`;

  return `
    <div class="bg-slate-900 rounded-xl overflow-hidden border border-slate-800 hover:border-purple-600 transition group opacity-0 translate-y-2" style="animation: fadeUp 0.45s ease ${index * 0.08}s forwards;">
      <img src="${image}" class="h-44 w-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out" alt="${escapeHtml(title)}" loading="lazy" />
      <div class="p-4 text-center">
        <h3 class="font-bold">${escapeHtml(title)}</h3>
        <p class="text-yellow-400 text-sm mt-1">${ratingText}</p>
        <p class="text-purple-400 font-semibold mt-1">${priceText}</p>
        <a href="/dashboard/company/servicio-detalle?id=${service?.id}" class="mt-3 block bg-indigo-600 hover:bg-indigo-500 transition text-white py-2 rounded-lg text-sm cursor-pointer">Ver servicio</a>
      </div>
    </div>
  `;
}

async function loadTopFreelancers() {
  if (!freelancersContainer) return;

  try {
    const res = await fetch(`${API_BASE}/api/freelancers/top?limit=4`, {
      headers: getAuthHeaders()
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const data = await res.json();
    if (!Array.isArray(data) || data.length === 0) {
      freelancersContainer.innerHTML = '<div class="col-span-full text-slate-400">No hay freelancers destacados.</div>';
      return;
    }

    freelancersContainer.innerHTML = data.map((item, idx) => {
      const user = item.user || {};
      const name = `${user.names || ""} ${user.last_names || ""}`.trim() || "Freelancer";
      const photo = buildStorageUrl(user.photo) || "/logo.jpeg";
      const reviews = Number(item.reviews_count || 0);
      const ratingText = (reviews > 0 && Number(item.avg_service_rating) > 0)
        ? `${star} ${formatRating(item.avg_service_rating)} (${reviews})`
        : `${star} Sin calificacion`;
      const profileId = item.freelancer_profile_id;

      return `
        <div class="bg-slate-900 rounded-xl overflow-hidden border border-slate-800 hover:border-purple-600 transition group opacity-0 translate-y-2" style="animation: fadeUp 0.45s ease ${idx * 0.08}s forwards;">
          <img src="${photo}" class="w-full h-56 object-cover" alt="${escapeHtml(name)}" loading="lazy" />
          <div class="p-4 text-center">
            <h3 class="font-bold group-hover:text-purple-400">${escapeHtml(name)}</h3>
            <p class="text-yellow-400 text-sm">${ratingText}</p>
            <a href="/dashboard/company/freelancer?id=${profileId}" class="mt-3 block bg-purple-700 hover:bg-purple-600 py-2 rounded-lg cursor-pointer">Ver perfil</a>
          </div>
        </div>
      `;
    }).join("");
  } catch (err) {
    console.error("Error cargando freelancers recomendados:", err);
    freelancersContainer.innerHTML = '<div class="col-span-full text-slate-400">No se pudieron cargar los freelancers.</div>';
  }
}

async function loadActiveProjects() {
  if (!projectsContainer) return;

  try {
    const res = await fetch(`${API_BASE}/api/orders`, {
      headers: getAuthHeaders()
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const payload = await res.json();
    const orders = Array.isArray(payload) ? payload : (payload?.data || []);

    const activeOrders = orders.filter((order) => {
      const status = order?.status;
      return status === "pending" || status === "in_progress" || status === "delivered";
    });

    if (!activeOrders.length) {
      projectsContainer.innerHTML = '<div class="text-slate-400">No hay proyectos activos por ahora.</div>';
      return;
    }

    projectsContainer.innerHTML = activeOrders
      .slice(0, 6)
      .map((order, index) => buildProjectCard(order, index))
      .join("");

    animateProgressBars();
  } catch (err) {
    console.error("Error cargando proyectos activos:", err);
    projectsContainer.innerHTML = '<div class="text-slate-400">No se pudieron cargar los proyectos.</div>';
  }
}

async function loadPopularServices() {
  if (!servicesContainer) return;

  try {
    const res = await fetch(`${API_BASE}/api/services`, {
      headers: { Accept: "application/json" }
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const payload = await res.json();
    const services = Array.isArray(payload)
      ? payload
      : (payload?.services || payload?.data || []);

    if (!services.length) {
      servicesContainer.innerHTML = '<div class="col-span-full text-slate-400">No hay servicios activos.</div>';
      return;
    }

    const sorted = [...services].sort((a, b) => {
      const ar = Number(a?.avg_rating ?? a?.rating ?? 0);
      const br = Number(b?.avg_rating ?? b?.rating ?? 0);
      if (br !== ar) return br - ar;

      const ac = Number(a?.reviews_count || 0);
      const bc = Number(b?.reviews_count || 0);
      return bc - ac;
    });

    servicesContainer.innerHTML = sorted
      .slice(0, 4)
      .map((service, index) => buildPopularServiceCard(service, index))
      .join("");
  } catch (err) {
    console.error("Error cargando servicios populares:", err);
    servicesContainer.innerHTML = '<div class="col-span-full text-slate-400">No se pudieron cargar los servicios.</div>';
  }
}

function revealSectionsOnScroll() {
  const sections = document.querySelectorAll("[data-reveal]");
  if (!sections.length) return;

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.remove("opacity-0", "translate-y-3");
      entry.target.classList.add("opacity-100", "translate-y-0");
      entry.target.style.transition = "opacity .55s ease, transform .55s ease";
      observer.unobserve(entry.target);
    });
  }, { threshold: 0.12 });

  sections.forEach((section) => observer.observe(section));
}

function animateProgressBars() {
  const bars = document.querySelectorAll("[data-progress-fill]");
  bars.forEach((bar, index) => {
    const target = Number(bar.getAttribute("data-target-progress") || 0);
    const safeTarget = Math.max(0, Math.min(100, target));
    setTimeout(() => {
      bar.style.transition = "width .9s cubic-bezier(0.22, 1, 0.36, 1)";
      bar.style.width = `${safeTarget}%`;
    }, 120 + index * 90);
  });
}

function ensureAnimationStyles() {
  if (document.getElementById("fadeUpStyles")) return;
  const style = document.createElement("style");
  style.id = "fadeUpStyles";
  style.textContent = `
    @keyframes fadeUp {
      from { opacity: 0; transform: translateY(8px); }
      to { opacity: 1; transform: translateY(0); }
    }
  `;
  document.head.appendChild(style);
}

function animarHeroDashboard() {
  const titles = document.querySelectorAll("h2");
  let heroTitle = null;

  titles.forEach((t) => {
    if (t.textContent.includes("Bienvenido")) {
      heroTitle = t;
    }
  });

  if (!heroTitle) return;

  const heroContainer = heroTitle.parentElement;
  const heroSubtitle = heroContainer.querySelector("p");
  const heroButton = heroContainer.querySelector("a");

  if (!heroSubtitle || !heroButton) return;

  heroTitle.style.opacity = "0";
  heroTitle.style.transform = "translateY(-30px)";

  heroSubtitle.style.opacity = "0";
  heroSubtitle.style.transform = "translateY(20px)";

  heroButton.style.opacity = "0";
  heroButton.style.transform = "scale(0.9)";

  setTimeout(() => {
    heroTitle.style.transition = "all .7s ease";
    heroTitle.style.opacity = "1";
    heroTitle.style.transform = "translateY(0)";
  }, 200);

  setTimeout(() => {
    heroSubtitle.style.transition = "all .7s ease";
    heroSubtitle.style.opacity = "1";
    heroSubtitle.style.transform = "translateY(0)";
  }, 450);

  setTimeout(() => {
    heroButton.style.transition = "all .5s ease";
    heroButton.style.opacity = "1";
    heroButton.style.transform = "scale(1)";
  }, 700);

  heroButton.addEventListener("mouseenter", () => {
    heroButton.style.transform = "scale(1.07)";
    heroButton.style.boxShadow = "0 10px 30px rgba(168,85,247,0.6)";
  });

  heroButton.addEventListener("mouseleave", () => {
    heroButton.style.transform = "scale(1)";
    heroButton.style.boxShadow = "none";
  });
}

ensureAnimationStyles();
loadTopFreelancers();
loadActiveProjects();
loadPopularServices();
document.addEventListener("DOMContentLoaded", () => {
  animarHeroDashboard();
  revealSectionsOnScroll();
});



