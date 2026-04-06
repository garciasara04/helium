const API_BASE = "http://127.0.0.1:8000";

const form = document.getElementById("contractForm");
const messageEl = document.getElementById("contractMessage");
const submitBtn = document.getElementById("contractSubmit");

const freelancerNameEl = document.getElementById("contractFreelancerName");
const freelancerImageEl = document.getElementById("contractFreelancerImage");
const freelancerRatingEl = document.getElementById("contractFreelancerRating");
const serviceTitleEl = document.getElementById("contractServiceTitle");
const servicePriceEl = document.getElementById("contractServicePrice");

const projectNameEl = document.getElementById("projectName");
const requirementsEl = document.getElementById("requirements");
const budgetEl = document.getElementById("budget");
const deadlineEl = document.getElementById("deadline");
const attachmentsEl = document.getElementById("attachments");

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

function buildStorageUrl(path) {
  if (!path) return "";
  if (/^https?:\/\//i.test(path)) return path;
  if (path.startsWith("/storage/")) return `http://127.0.0.1:8000${path}`;
  return `http://127.0.0.1:8000/storage/${path}`;
}

function setMessage(text, tone = "neutral") {
  if (!messageEl) return;
  if (tone === "error") {
    messageEl.className = "text-sm text-red-300";
  } else if (tone === "success") {
    messageEl.className = "text-sm text-emerald-300";
  } else {
    messageEl.className = "text-sm text-slate-400";
  }
  messageEl.textContent = text || "";
}

function validateForm() {
  const projectName = String(projectNameEl?.value || "").trim();
  const requirements = String(requirementsEl?.value || "").trim();
  const budgetRaw = String(budgetEl?.value || "").trim();
  const file = attachmentsEl?.files?.[0] || null;

  if (!projectName || projectName.length < 3) {
    setMessage("Ingresa un nombre de proyecto válido (mínimo 3 caracteres).", "error");
    return false;
  }

  if (!requirements || requirements.length < 10) {
    setMessage("Describe mejor el requerimiento (mínimo 10 caracteres).", "error");
    return false;
  }

  if (budgetRaw) {
    const budget = Number(budgetRaw);
    if (!Number.isFinite(budget) || budget <= 0) {
      setMessage("El presupuesto debe ser un número mayor a 0.", "error");
      return false;
    }
  }

  if (file) {
    const maxBytes = 20 * 1024 * 1024;
    if (file.size > maxBytes) {
      setMessage("El archivo adjunto no debe superar 20MB.", "error");
      return false;
    }
  }

  return true;
}

async function loadServiceInfo(serviceId) {
  try {
    const res = await fetch(`${API_BASE}/api/services/${serviceId}`, {
      headers: { Accept: "application/json" }
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const data = await res.json();

    const freelancerName = data?.freelancer_profile?.user
      ? `${data.freelancer_profile.user.names || ""} ${data.freelancer_profile.user.last_names || ""}`.trim()
      : "Freelancer";
    const freelancerPhoto = buildStorageUrl(data?.freelancer_profile?.user?.photo) || "/logo.jpeg";

    setText(freelancerNameEl, freelancerName);
    if (freelancerImageEl) freelancerImageEl.src = freelancerPhoto;
    setText(serviceTitleEl, data?.title || "Servicio");
    setText(servicePriceEl, formatPrice(data?.price) || "");
    setText(freelancerRatingEl, "★ Sin calificacion");
  } catch (err) {
    console.error(err);
  }
}

async function submitOrder(serviceId) {
  const token = localStorage.getItem("token");
  if (!token) {
    setMessage("No hay sesión activa.", "error");
    return;
  }

  if (!validateForm()) return;

  const projectName = String(projectNameEl?.value || "").trim();
  const requirements = String(requirementsEl?.value || "").trim();
  const budget = String(budgetEl?.value || "").trim();
  const deadline = String(deadlineEl?.value || "").trim();
  const attachment = attachmentsEl?.files?.[0] || null;

  const formData = new FormData();
  formData.append("service_id", String(Number(serviceId)));
  formData.append("project_name", projectName);
  formData.append("requirements", requirements);
  formData.append("pse_reference", generatePseReference());
  if (budget) formData.append("budget", budget);
  if (deadline) formData.append("deadline", deadline);
  if (attachment) formData.append("attachments", attachment);

  try {
    submitBtn?.setAttribute("disabled", "disabled");
    setMessage("Enviando solicitud...", "neutral");
    if (submitBtn) submitBtn.textContent = "Enviando...";

    const res = await fetch(`${API_BASE}/api/orders`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`
      },
      body: formData
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      throw new Error(data?.message || `HTTP ${res.status}`);
    }

    setMessage("Solicitud enviada correctamente.", "success");
    setTimeout(() => {
      window.location.href = "/dashboard/company";
    }, 1600);
  } catch (err) {
    console.error(err);
    setMessage(String(err?.message || "No se pudo enviar la solicitud."), "error");
  } finally {
    submitBtn?.removeAttribute("disabled");
    if (submitBtn) submitBtn.textContent = "Enviar solicitud al freelancer";
  }
}

function init() {
  const params = new URLSearchParams(window.location.search);
  const serviceId = params.get("service_id");

  if (!serviceId) {
    setMessage("No se encontró el servicio.", "error");
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
