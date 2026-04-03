const API_BASE = "http://127.0.0.1:8000";

const params = new URLSearchParams(window.location.search);
const serviceId = params.get("id");

const alertEl = document.getElementById("serviceDetailAlert");
const skeletonEl = document.getElementById("serviceInfoSkeleton");
const infoEl = document.getElementById("serviceInfo");

const serviceMainPhotoEl = document.getElementById("serviceMainPhoto");
const freelancerPhotoEl = document.getElementById("serviceFreelancerPhoto");
const freelancerNameEl = document.getElementById("serviceFreelancerName");
const freelancerEmailEl = document.getElementById("serviceFreelancerEmail");
const freelancerLinkEl = document.getElementById("serviceFreelancerLink");
const categoryEl = document.getElementById("serviceCategory");
const descriptionEl = document.getElementById("serviceDescription");

const serviceActionHelpEl = document.getElementById("serviceActionHelp");
const serviceBtnActivate = document.getElementById("serviceBtnActivate");
const serviceBtnDeactivate = document.getElementById("serviceBtnDeactivate");

const reviewsBody = document.getElementById("serviceReviewsBody");

const deactivateModalEl = document.getElementById("deactivateServiceModal");
const deactivateBackdropEl = document.getElementById("deactivateServiceBackdrop");
const deactivateReasonInputEl = document.getElementById("deactivateReasonInput");
const deactivateReasonErrorEl = document.getElementById("deactivateReasonError");
const deactivateCancelBtnEl = document.getElementById("deactivateCancelBtn");
const deactivateConfirmBtnEl = document.getElementById("deactivateConfirmBtn");

let currentService = null;

function getAuthHeaders() {
  const token = localStorage.getItem("token");
  const headers = { Accept: "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

function getJsonHeaders() {
  return {
    ...getAuthHeaders(),
    "Content-Type": "application/json"
  };
}

function buildStorageUrl(path) {
  if (!path) return "";
  if (/^https?:\/\//i.test(path)) return path;
  if (path.startsWith("/storage/")) return `${API_BASE}${path}`;
  return `${API_BASE}/storage/${path}`;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatDate(value) {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleDateString("es-CO", { day: "2-digit", month: "short", year: "numeric" });
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

function showAlert(message, type = "error") {
  if (!alertEl) return;
  alertEl.classList.remove("hidden", "border-red-500/30", "bg-red-500/10", "text-red-300", "border-emerald-500/30", "bg-emerald-500/10", "text-emerald-300");

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

function isActive(service) {
  if (typeof service?.is_active === "boolean") return service.is_active;
  if (typeof service?.is_active === "number") return service.is_active === 1;
  return true;
}

function openDeactivateModal() {
  if (!deactivateModalEl) return;
  deactivateModalEl.classList.remove("hidden");
  if (deactivateReasonInputEl) {
    deactivateReasonInputEl.value = "";
    deactivateReasonInputEl.focus();
  }
  deactivateReasonErrorEl?.classList.add("hidden");
}

function closeDeactivateModal() {
  if (!deactivateModalEl) return;
  deactivateModalEl.classList.add("hidden");
  deactivateReasonErrorEl?.classList.add("hidden");
}

function getDeactivateReason() {
  const value = String(deactivateReasonInputEl?.value || "").trim();
  if (!value) {
    deactivateReasonErrorEl?.classList.remove("hidden");
    return null;
  }

  deactivateReasonErrorEl?.classList.add("hidden");
  return value;
}

function refreshServiceActionButtons(service) {
  const active = isActive(service);
  if (serviceBtnActivate) serviceBtnActivate.disabled = active;
  if (serviceBtnDeactivate) serviceBtnDeactivate.disabled = !active;

  if (serviceActionHelpEl) {
    serviceActionHelpEl.textContent = active
      ? "El servicio esta activo. Puedes desactivarlo."
      : "El servicio esta inactivo. Puedes activarlo.";
  }
}

function renderServiceInfo(service) {
  const rating = Number(service?.avg_rating ?? service?.reviews_avg_rating ?? 0);
  const reviewsCount = Number(service?.reviews_count ?? 0);

  infoEl.innerHTML = `
    <div><dt class="text-slate-400">ID servicio</dt><dd class="font-semibold">#${escapeHtml(service?.id)}</dd></div>
    <div><dt class="text-slate-400">Titulo</dt><dd class="font-semibold">${escapeHtml(service?.title || "-")}</dd></div>
    <div><dt class="text-slate-400">Precio</dt><dd class="font-semibold text-emerald-400">${escapeHtml(formatCurrency(service?.price))}</dd></div>
    <div><dt class="text-slate-400">Tiempo de entrega</dt><dd class="font-semibold">${escapeHtml(service?.delivery_time || "-")} dias</dd></div>
    <div><dt class="text-slate-400">Revisiones</dt><dd class="font-semibold">${escapeHtml(service?.revisions || "-")}</dd></div>
    <div><dt class="text-slate-400">Estado</dt><dd class="font-semibold ${isActive(service) ? "text-emerald-400" : "text-rose-400"}">${isActive(service) ? "Activo" : "Inactivo"}</dd></div>
    <div><dt class="text-slate-400">Rating</dt><dd class="font-semibold text-amber-400">\u2605 ${reviewsCount > 0 ? escapeHtml(rating.toFixed(1)) : "Sin calificacion"}</dd></div>
    <div><dt class="text-slate-400">Total reviews</dt><dd class="font-semibold">${escapeHtml(reviewsCount)}</dd></div>
  `;

  skeletonEl?.classList.add("hidden");
  infoEl?.classList.remove("hidden");

  if (serviceMainPhotoEl) {
    serviceMainPhotoEl.src = buildStorageUrl(service?.photo) || "/image.png";
  }

  const categoryName = service?.category?.name || service?.category || "-";
  if (categoryEl) categoryEl.textContent = categoryName;
  if (descriptionEl) descriptionEl.textContent = service?.description || "Sin descripcion";

  const freelancerUser = service?.freelancer_profile?.user || service?.freelancer?.user || null;
  const freelancerName = `${freelancerUser?.names || ""} ${freelancerUser?.last_names || ""}`.trim() || service?.freelancer?.name || "-";

  if (freelancerPhotoEl) {
    freelancerPhotoEl.src = buildStorageUrl(freelancerUser?.photo || service?.freelancer?.photo) || "/logo.jpeg";
  }
  if (freelancerNameEl) freelancerNameEl.textContent = freelancerName;
  if (freelancerEmailEl) freelancerEmailEl.textContent = freelancerUser?.email || service?.freelancer?.email || "-";
  if (freelancerLinkEl && freelancerUser?.id) {
    freelancerLinkEl.href = `/dashboard/admin/usuarioDetalle?id=${freelancerUser.id}`;
  }

  refreshServiceActionButtons(service);
}

function renderReviews(reviews) {
  if (!reviewsBody) return;

  if (!reviews.length) {
    reviewsBody.innerHTML = '<tr><td class="py-3 text-slate-400" colspan="3">Este servicio aun no tiene resenas.</td></tr>';
    return;
  }

  reviewsBody.innerHTML = reviews
    .slice(0, 10)
    .map((review) => {
      const rating = Number(review?.rating ?? 0);
      const comment = review?.comment || "Sin comentario";
      const created = formatDate(review?.created_at);

      return `
        <tr class="border-b border-slate-800/70 hover:bg-slate-800/40 transition">
          <td class="py-3 pr-3 text-amber-400 font-semibold">\u2605 ${escapeHtml(rating.toFixed(1))}</td>
          <td class="py-3 pr-3 text-slate-300">${escapeHtml(comment)}</td>
          <td class="py-3">${escapeHtml(created)}</td>
        </tr>
      `;
    })
    .join("");
}

async function fetchServiceFrom(url) {
  return fetch(url, { headers: getAuthHeaders() });
}

async function fetchServiceDetail() {
  if (!serviceId) {
    showAlert("No se encontro el id del servicio en la URL.");
    return;
  }

  try {
    hideAlert();

    let service = null;

    const detailRes = await fetchServiceFrom(`${API_BASE}/api/admin/services/${serviceId}`);

    if (detailRes.status === 401) {
      showAlert("Sesion expirada o sin permisos para ver este servicio.");
      return;
    }

    if (detailRes.ok) {
      const payload = await detailRes.json();
      service = payload?.data || payload?.service || payload;
    } else if (detailRes.status === 404) {
      const listRes = await fetchServiceFrom(`${API_BASE}/api/admin/services?status=all&per_page=100`);
      if (listRes.status === 401) {
        showAlert("Sesion expirada o sin permisos para ver este servicio.");
        return;
      }
      if (!listRes.ok) throw new Error(`HTTP ${listRes.status}`);

      const listPayload = await listRes.json();
      const items = Array.isArray(listPayload?.services)
        ? listPayload.services
        : Array.isArray(listPayload?.data)
          ? listPayload.data
          : Array.isArray(listPayload)
            ? listPayload
            : [];

      service = items.find((item) => Number(item?.id) === Number(serviceId)) || null;
      if (!service) {
        showAlert("No se encontro el servicio solicitado.");
        return;
      }
    } else {
      throw new Error(`HTTP ${detailRes.status}`);
    }

    if (!service || typeof service !== "object") {
      throw new Error("Respuesta invalida del servidor");
    }

    currentService = service;
    renderServiceInfo(service);

    const reviews = Array.isArray(service?.reviews)
      ? service.reviews
      : [];

    if (reviews.length) {
      renderReviews(reviews.sort((a, b) => new Date(b?.created_at || 0).getTime() - new Date(a?.created_at || 0).getTime()));
      return;
    }

    try {
      const fallbackRes = await fetch(`${API_BASE}/api/admin/reviews/negative?days=3650&max_rating=5&limit=200`, {
        headers: getAuthHeaders()
      });

      if (fallbackRes.ok) {
        const fallbackPayload = await fallbackRes.json();
        const all = Array.isArray(fallbackPayload?.reviews) ? fallbackPayload.reviews : [];
        const serviceReviews = all.filter((r) => Number(r?.order?.service?.id) === Number(serviceId));
        renderReviews(serviceReviews.sort((a, b) => new Date(b?.created_at || 0).getTime() - new Date(a?.created_at || 0).getTime()));
      } else {
        renderReviews([]);
      }
    } catch {
      renderReviews([]);
    }
  } catch (error) {
    console.error("Error cargando detalle de servicio:", error);
    showAlert("No se pudo cargar el detalle del servicio.");
  }
}

function setServiceActionLoading(loading, type = "") {
  if (serviceBtnActivate) {
    serviceBtnActivate.textContent = loading && type === "activate" ? "Actualizando..." : "Activar servicio";
    if (loading) serviceBtnActivate.disabled = true;
  }
  if (serviceBtnDeactivate) {
    serviceBtnDeactivate.textContent = loading && type === "deactivate" ? "Actualizando..." : "Desactivar servicio";
    if (loading) serviceBtnDeactivate.disabled = true;
  }
  if (deactivateConfirmBtnEl && loading && type === "deactivate") {
    deactivateConfirmBtnEl.disabled = true;
    deactivateConfirmBtnEl.textContent = "Actualizando...";
  } else if (deactivateConfirmBtnEl) {
    deactivateConfirmBtnEl.disabled = false;
    deactivateConfirmBtnEl.textContent = "Confirmar desactivacion";
  }
}

async function patchServiceActive(nextActive, deactivationReason = null) {
  if (!serviceId) return;

  try {
    hideAlert();
    setServiceActionLoading(true, nextActive ? "activate" : "deactivate");

    const body = nextActive
      ? { is_active: true }
      : { is_active: false, deactivation_reason: deactivationReason };

    const res = await fetch(`${API_BASE}/api/admin/services/${serviceId}/status`, {
      method: "PATCH",
      headers: getJsonHeaders(),
      body: JSON.stringify(body)
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    await fetchServiceDetail();
    showAlert(nextActive ? "Servicio activado correctamente." : "Servicio desactivado correctamente.", "success");
  } catch (error) {
    console.error("Error actualizando estado del servicio:", error);
    showAlert("No se pudo actualizar el estado del servicio.");
    refreshServiceActionButtons(currentService);
  } finally {
    setServiceActionLoading(false);
  }
}

serviceBtnActivate?.addEventListener("click", () => {
  patchServiceActive(true);
});

serviceBtnDeactivate?.addEventListener("click", () => {
  openDeactivateModal();
});

deactivateCancelBtnEl?.addEventListener("click", closeDeactivateModal);
deactivateBackdropEl?.addEventListener("click", closeDeactivateModal);

deactivateConfirmBtnEl?.addEventListener("click", async () => {
  const reason = getDeactivateReason();
  if (!reason) return;
  closeDeactivateModal();
  await patchServiceActive(false, reason);
});

fetchServiceDetail();
