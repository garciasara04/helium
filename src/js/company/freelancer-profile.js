const API_BASE = "http://127.0.0.1:8000";

const loadingEl = document.getElementById("freelancerLoading");
const emptyEl = document.getElementById("freelancerEmpty");
const contentEl = document.getElementById("freelancerContent");

const nameEl = document.getElementById("freelancerName");
const professionEl = document.getElementById("freelancerProfession");
const ratingEl = document.getElementById("freelancerRating");
const locationEl = document.getElementById("freelancerLocation");
const languagesEl = document.getElementById("freelancerLanguages");
const rateEl = document.getElementById("freelancerRate");
const photoEl = document.getElementById("freelancerPhoto");
const skillsEl = document.getElementById("freelancerSkills");
const servicesEl = document.getElementById("freelancerServices");
const servicesEmptyEl = document.getElementById("freelancerServicesEmpty");

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatRating(value, count) {
  const num = Number(value);
  if (!Number.isFinite(num) || num <= 0) return "Sin calificacion";
  if (count) return `? ${num} (${count} reviews)`;
  return `? ${num}`;
}

function formatRate(value) {
  const num = Number(value);
  if (!Number.isFinite(num) || num <= 0) return "";
  return `$${num}/hora`;
}

function buildSkillChip(skill) {
  const label = skill?.name || skill?.title || "Skill";
  return `<span class="px-3 py-1 rounded-full bg-slate-900 border border-slate-800 text-slate-300 text-sm">${escapeHtml(label)}</span>`;
}

function buildServiceCard(service) {
  const title = service?.title || service?.name || "Servicio";
  const image = service?.image || service?.image_url || "https://via.placeholder.com/600";
  const price = service?.price || service?.amount || "";
  const rating = service?.avg_rating ?? service?.rating ?? null;

  return `
    <div class="bg-slate-900 rounded-xl overflow-hidden border border-slate-800 hover:border-purple-600 transition">
      <img src="${escapeHtml(image)}" class="h-48 w-full object-cover"/>
      <div class="p-4 text-center">
        <h3 class="font-bold">${escapeHtml(title)}</h3>
        <p class="text-slate-400 text-sm mt-2">${formatRating(rating)}</p>
        <p class="text-purple-400 font-bold mt-2">${price ? `$${escapeHtml(price)}` : ""}</p>
        <a href="/dashboard/company/servicio-detalle?id=${escapeHtml(service?.id)}" class="mt-4 inline-block text-purple-300 hover:text-purple-200">Ver servicio</a>
      </div>
    </div>
  `;
}

async function fetchFreelancer() {
  const params = new URLSearchParams(window.location.search);
  const id = params.get("id");

  if (!id) {
    loadingEl?.classList.add("hidden");
    emptyEl?.classList.remove("hidden");
    return;
  }

  try {
    const res = await fetch(`${API_BASE}/api/freelancers/${id}`, {
      headers: { "Accept": "application/json" }
    });

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }

    const data = await res.json();

    loadingEl?.classList.add("hidden");
    contentEl?.classList.remove("hidden");

    const user = data?.freelancer_profile?.user || data?.user || {};
    const fullName = `${user?.names || ""} ${user?.last_names || ""}`.trim() || data?.name || "Freelancer";
    const profession = data?.freelancer_profile?.profession || data?.profession || "Profesional";

    const country = data?.freelancer_profile?.country || data?.country || "";
    const city = data?.freelancer_profile?.city || data?.city || "";
    const languages = data?.freelancer_profile?.languages || data?.languages || "";

    const rating = data?.avg_rating ?? data?.rating ?? null;
    const reviewsCount = data?.reviews_count || data?.reviews || null;

    const hourlyRate = data?.freelancer_profile?.hourly_rate || data?.hourlyRate || data?.hourly_rate || null;
    const photo = user?.photo || data?.freelancer_profile?.photo || "https://via.placeholder.com/400";

    nameEl.textContent = fullName;
    professionEl.textContent = profession;
    ratingEl.textContent = formatRating(rating, reviewsCount);
    locationEl.textContent = [country, city].filter(Boolean).join(" • ") || "-";
    languagesEl.textContent = languages ? `Idiomas: ${languages}` : "Idiomas: -";
    rateEl.textContent = formatRate(hourlyRate);
    photoEl.src = photo;

    const skills = data?.skills || data?.freelancer_profile?.skills || [];
    if (skillsEl) {
      if (skills.length) {
        skillsEl.innerHTML = skills.map(buildSkillChip).join("");
      } else {
        skillsEl.innerHTML = '<span class="text-slate-400">Sin skills registradas.</span>';
      }
    }

    const services = data?.services || data?.active_services || [];
    if (services.length) {
      servicesEl.innerHTML = services.map(buildServiceCard).join("");
    } else {
      servicesEmptyEl?.classList.remove("hidden");
    }
  } catch (err) {
    loadingEl?.classList.add("hidden");
    emptyEl?.classList.remove("hidden");
    console.error(err);
  }
}

fetchFreelancer();
