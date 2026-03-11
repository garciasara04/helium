const API_BASE = "http://127.0.0.1:8000";

const form = document.getElementById("contractForm");
const messageEl = document.getElementById("contractMessage");
const submitBtn = document.getElementById("contractSubmit");

const freelancerNameEl = document.getElementById("contractFreelancerName");
const freelancerImageEl = document.getElementById("contractFreelancerImage");
const freelancerRatingEl = document.getElementById("contractFreelancerRating");
const serviceTitleEl = document.getElementById("contractServiceTitle");
const servicePriceEl = document.getElementById("contractServicePrice");

const requirementsEl = document.getElementById("requirements");

function setText(el, value, fallback = "") {
  if (!el) return;
  el.textContent = value || fallback;
}

function formatPrice(value) {
  if (value === null || value === undefined || value === "") return "";
  const num = Number(value);
  if (!Number.isFinite(num)) return `$${value}`;
  return num.toLocaleString("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 });
}

function generatePseReference() {
  const year = new Date().getFullYear();
  const random = Math.floor(Math.random() * 9000) + 1000;
  return `PSE-${year}-${random}`;
}

async function loadServiceInfo(serviceId) {
  try {
    const res = await fetch(`${API_BASE}/api/services/${serviceId}`, {
      headers: { "Accept": "application/json" }
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const data = await res.json();

    const freelancerName = data?.freelancer_profile?.user
      ? `${data.freelancer_profile.user.names || ""} ${data.freelancer_profile.user.last_names || ""}`.trim()
      : "Freelancer";
    const freelancerPhoto = data?.freelancer_profile?.user?.photo || "https://via.placeholder.com/200";

    setText(freelancerNameEl, freelancerName);
    if (freelancerImageEl) freelancerImageEl.src = freelancerPhoto;
    setText(serviceTitleEl, data?.title || "Servicio");
    setText(servicePriceEl, formatPrice(data?.price) || "");
    setText(freelancerRatingEl, "Sin calificacion");
  } catch (err) {
    console.error(err);
  }
}

async function submitOrder(serviceId) {
  const token = localStorage.getItem("token");
  if (!token) {
    messageEl.textContent = "No hay sesion activa.";
    return;
  }

  const requirements = requirementsEl?.value?.trim() || "";
  if (!requirements) {
    messageEl.textContent = "Escribe los requerimientos para continuar.";
    return;
  }

  const payload = {
    service_id: Number(serviceId),
    requirements,
    pse_reference: generatePseReference()
  };

  try {
    submitBtn?.setAttribute("disabled", "disabled");
    messageEl.textContent = "Enviando solicitud...";

    const res = await fetch(`${API_BASE}/api/orders`, {
      method: "POST",
      headers: {
        "Accept": "application/json",
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }

messageEl.textContent = "Solicitud enviada correctamente.";
    setTimeout(() => {
      window.location.href = "/dashboard/company";
    }, 1800);
  } catch (err) {
    console.error(err);
    messageEl.textContent = "No se pudo enviar la solicitud.";
  } finally {
    submitBtn?.removeAttribute("disabled");
  }
}

function init() {
  const params = new URLSearchParams(window.location.search);
  const serviceId = params.get("service_id");

  if (!serviceId) {
    messageEl.textContent = "No se encontro el servicio.";
    return;
  }

  loadServiceInfo(serviceId);

  if (form) {
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      submitOrder(serviceId);
    });
  }
}

init();

