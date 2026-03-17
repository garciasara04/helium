const API_BASE = "http://127.0.0.1:8000";

const container = document.getElementById("recommendedFreelancers");
const star = "\u2605";

function buildStorageUrl(path) {
  if (!path) return "";
  if (/^https?:\/\//i.test(path)) return path;
  if (path.startsWith("/storage/")) return `http://127.0.0.1:8000${path}`;
  return `http://127.0.0.1:8000/storage/${path}`;
}

function formatRating(value) {
  if (value === null || value === undefined) return "0.0";
  const num = Number(value);
  if (!Number.isFinite(num)) return "0.0";
  return num.toFixed(1);
}

async function loadTopFreelancers() {
  if (!container) return;

  try {
    const token = localStorage.getItem("token");
    const headers = { Accept: "application/json" };
    if (token) headers.Authorization = `Bearer ${token}`;

    const res = await fetch(`${API_BASE}/api/freelancers/top?limit=4`, { headers });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const data = await res.json();
    if (!Array.isArray(data) || data.length === 0) {
      container.innerHTML = '<div class="col-span-full text-slate-400">No hay freelancers destacados.</div>';
      return;
    }

    container.innerHTML = data.map((item, idx) => {
      const user = item.user || {};
      const name = `${user.names || ""} ${user.last_names || ""}`.trim() || "Freelancer";
      const photo = buildStorageUrl(user.photo) || "/logo.jpeg";
      const rating = formatRating(item.avg_service_rating);
      const reviews = Number(item.reviews_count || 0);
      const ratingText = (reviews > 0 && Number(item.avg_service_rating) > 0) ? `${star} ${formatRating(item.avg_service_rating)} (${reviews})` : `${star} Sin calificacion`;
      const profileId = item.freelancer_profile_id;

      return `
        <div class="bg-slate-900 rounded-xl overflow-hidden border border-slate-800 hover:border-purple-600 transition group opacity-0 translate-y-2" style="animation: fadeUp 0.45s ease ${idx * 0.08}s forwards;">
          <img src="${photo}" class="w-full h-56 object-cover" alt="${name}" loading="lazy" />
          <div class="p-4 text-center">
            <h3 class="font-bold group-hover:text-purple-400">${name}</h3>
            <p class="text-yellow-400 text-sm">${ratingText}</p>
            <a href="/dashboard/company/freelancer?id=${profileId}" class="mt-3 block bg-purple-700 hover:bg-purple-600 py-2 rounded-lg">Ver perfil</a>
          </div>
        </div>
      `;
    }).join("");
  } catch (err) {
    console.error("Error cargando freelancers recomendados:", err);
    container.innerHTML = '<div class="col-span-full text-slate-400">No se pudieron cargar los freelancers.</div>';
  }
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

ensureAnimationStyles();
loadTopFreelancers();

/* =========================
   ANIMACION HERO AUTOMATICA
========================= */

function animarHeroDashboard() {

  // buscar el h2 que contiene el texto
  const titles = document.querySelectorAll("h2");

  let heroTitle = null;

  titles.forEach(t => {
    if (t.textContent.includes("Bienvenido")) {
      heroTitle = t;
    }
  });

  if (!heroTitle) return;

  const heroContainer = heroTitle.parentElement;

  const heroSubtitle = heroContainer.querySelector("p");
  const heroButton = heroContainer.querySelector("a");

  if (!heroSubtitle || !heroButton) return;


  /* ESTADO INICIAL */

  heroTitle.style.opacity = "0";
  heroTitle.style.transform = "translateY(-30px)";

  heroSubtitle.style.opacity = "0";
  heroSubtitle.style.transform = "translateY(20px)";

  heroButton.style.opacity = "0";
  heroButton.style.transform = "scale(0.9)";


  /* ANIMACION TITULO */

  setTimeout(() => {

    heroTitle.style.transition = "all .7s ease";
    heroTitle.style.opacity = "1";
    heroTitle.style.transform = "translateY(0)";

  }, 200);


  /* ANIMACION TEXTO */

  setTimeout(() => {

    heroSubtitle.style.transition = "all .7s ease";
    heroSubtitle.style.opacity = "1";
    heroSubtitle.style.transform = "translateY(0)";

  }, 450);


  /* ANIMACION BOTON */

  setTimeout(() => {

    heroButton.style.transition = "all .5s ease";
    heroButton.style.opacity = "1";
    heroButton.style.transform = "scale(1)";

  }, 700);


  /* HOVER BOTON */

  heroButton.addEventListener("mouseenter", () => {

    heroButton.style.transform = "scale(1.07)";
    heroButton.style.boxShadow = "0 10px 30px rgba(168,85,247,0.6)";

  });

  heroButton.addEventListener("mouseleave", () => {

    heroButton.style.transform = "scale(1)";
    heroButton.style.boxShadow = "none";

  });

}


document.addEventListener("DOMContentLoaded", animarHeroDashboard);