const API_BASE = "http://127.0.0.1:8000";

const loadingEl = document.getElementById("serviceLoading");
const emptyEl = document.getElementById("serviceEmpty");
const contentEl = document.getElementById("serviceContent");

const titleEl = document.getElementById("serviceTitle");
const descEl = document.getElementById("serviceDescription");
const longDescEl = document.getElementById("serviceLongDescription");
const reqEl = document.getElementById("serviceRequirements");
const priceEl = document.getElementById("servicePrice");
const deliveryEl = document.getElementById("serviceDelivery");
const revisionsEl = document.getElementById("serviceRevisions");
const imageEl = document.getElementById("serviceImage");

const freelancerNameEl = document.getElementById("freelancerName");
const freelancerProfessionEl = document.getElementById("freelancerProfession");
const freelancerPhotoEl = document.getElementById("freelancerPhoto");
const freelancerRatingEl = document.getElementById("freelancerRating");
const freelancerLinkEl = document.getElementById("freelancerLink");
const contractLinkEl = document.getElementById("contractServiceLink");

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

function setText(el, value, fallback = "") {
  if (!el) return;
  el.textContent = value || fallback;
}

function renderRequirements(value) {
  if (!reqEl) return;
  reqEl.innerHTML = "";
  if (!value) return;
  const lines = String(value).split("\n").filter(Boolean);
  if (lines.length <= 1) {
    const li = document.createElement("li");
    li.textContent = value;
    reqEl.appendChild(li);
    return;
  }
  lines.forEach(line => {
    const li = document.createElement("li");
    li.textContent = line;
    reqEl.appendChild(li);
  });
}

async function fetchService() {
  const params = new URLSearchParams(window.location.search);
  const id = params.get("id");
  const serviceId = id;

  if (!id) {
    loadingEl?.classList.add("hidden");
    emptyEl?.classList.remove("hidden");
    return;
  }

  try {
    const res = await fetch(`${API_BASE}/api/services/${id}`, {
      headers: { "Accept": "application/json" }
    });

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }

    const data = await res.json();

    loadingEl?.classList.add("hidden");
    contentEl?.classList.remove("hidden");

    const title = data?.title || "Servicio";
    const description = data?.description || "";
    const price = formatPrice(data?.price);
    const delivery = data?.delivery_time ? `${data.delivery_time} dias` : "-";
    const revisions = data?.revisions ? `${data.revisions} rondas` : "-";

    const categoryName = data?.category?.name || data?.category || "";

    const freelancerUser = data?.freelancer_profile?.user || {};
    const freelancerName = `${freelancerUser?.names || ""} ${freelancerUser?.last_names || ""}`.trim() || "Freelancer";
    const freelancerProfession = data?.freelancer_profile?.profession || "Profesional";
    const freelancerProfileId = data?.freelancer_profile?.id;

    setText(titleEl, title);
    setText(descEl, description);
    setText(longDescEl, description);
    renderRequirements(data?.requirements);
    setText(priceEl, price || "");
    setText(deliveryEl, delivery);
    setText(revisionsEl, revisions);

    if (imageEl) imageEl.src = buildStorageUrl(data?.photo) || "/image.png";
    if (categoryName && imageEl) imageEl.alt = categoryName;

    setText(freelancerNameEl, freelancerName);
    setText(freelancerProfessionEl, freelancerProfession);
    if (freelancerPhotoEl) freelancerPhotoEl.src = buildStorageUrl(freelancerUser?.photo) || "/logo.jpeg";
    setText(freelancerRatingEl, "Sin calificacion");

    if (freelancerLinkEl && freelancerProfileId) {
      freelancerLinkEl.setAttribute("href", `/dashboard/company/freelancer?id=${freelancerProfileId}`);
    }
    if (contractLinkEl && serviceId) {
      contractLinkEl.setAttribute("href", `/dashboard/company/contratarServicio?service_id=${serviceId}`);
    }
  } catch (err) {
    loadingEl?.classList.add("hidden");
    emptyEl?.classList.remove("hidden");
    console.error(err);
  }
}

fetchService();
