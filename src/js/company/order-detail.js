const API_BASE = "http://127.0.0.1:8000";

const loadingEl = document.getElementById("orderLoading");
const emptyEl = document.getElementById("orderEmpty");
const contentEl = document.getElementById("orderContent");

const statusEl = document.getElementById("orderStatus");
const serviceTitleEl = document.getElementById("orderServiceTitle");
const projectNameEl = document.getElementById("orderProjectName");
const requirementsEl = document.getElementById("orderRequirements");
const attachmentWrapEl = document.getElementById("orderAttachmentWrap");
const freelancerPhotoEl = document.getElementById("orderFreelancerPhoto");
const freelancerNameEl = document.getElementById("orderFreelancerName");
const priceEl = document.getElementById("orderPrice");
const startDateEl = document.getElementById("orderStartDate");
const deliveredDateEl = document.getElementById("orderDeliveredDate");
const freelancerLinkEl = document.getElementById("orderFreelancerLink");

const revisionsLoadingEl = document.getElementById("orderRevisionsLoading");
const revisionsListEl = document.getElementById("orderRevisionsList");
const revisionsEmptyEl = document.getElementById("orderRevisionsEmpty");
const revisionsCounterEl = document.getElementById("orderRevisionsCounter");

const finalLoadingEl = document.getElementById("orderFinalDeliveryLoading");
const finalEmptyEl = document.getElementById("orderFinalDeliveryEmpty");
const finalContentEl = document.getElementById("orderFinalDeliveryContent");
const finalNoteEl = document.getElementById("orderFinalNote");
const finalFilesEl = document.getElementById("orderFinalFiles");

let currentOrderId = null;

function getAuthToken() {
  const token = localStorage.getItem("token");
  if (!token) {
    window.location.href = "/login";
    return null;
  }
  return token;
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

function formatPrice(value) {
  if (value === null || value === undefined || value === "") return "";
  const num = Number(value);
  if (!Number.isFinite(num)) return `$${value}`;
  return num.toLocaleString("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 });
}

function formatDate(value) {
  if (!value) return "-";
  try {
    const d = new Date(value);
    return d.toLocaleDateString("es-CO", { year: "numeric", month: "short", day: "2-digit" });
  } catch {
    return "-";
  }
}

function statusLabel(status) {
  const value = (status || "").toLowerCase();
  if (value === "completed") return "Completado";
  if (value === "delivered") return "Entregado";
  if (value === "in_progress") return "En progreso";
  if (value === "pending") return "Pendiente";
  if (value === "cancelled") return "Cancelado";
  return status || "-";
}

function statusClass(status) {
  const value = (status || "").toLowerCase();
  if (value === "completed") return "bg-green-600/20 text-green-400";
  if (value === "delivered") return "bg-blue-600/20 text-blue-400";
  if (value === "in_progress") return "bg-yellow-600/20 text-yellow-400";
  if (value === "pending") return "bg-amber-600/20 text-amber-400";
  return "bg-red-600/20 text-red-400";
}

function getRevisionFiles(revision) {
  if (Array.isArray(revision?.files)) return revision.files;
  if (Array.isArray(revision?.attachments)) return revision.attachments;
  if (Array.isArray(revision?.revision_files)) return revision.revision_files;
  return [];
}

function normalizeRevisions(payload) {
  const raw = Array.isArray(payload)
    ? payload
    : Array.isArray(payload?.data)
      ? payload.data
      : Array.isArray(payload?.revisions)
        ? payload.revisions
        : [];

  return raw
    .map((rev) => ({
      id: Number(rev?.id),
      revision_number: Number(rev?.revision_number || 0),
      freelancer_note: rev?.freelancer_note || "",
      client_feedback: rev?.client_feedback || "",
      created_at: rev?.submitted_at || rev?.created_at || "",
      files: getRevisionFiles(rev)
    }))
    .filter((rev) => Number.isFinite(rev.id) && rev.id > 0)
    .sort((a, b) => a.revision_number - b.revision_number);
}

function getParsedError(payload, fallback) {
  if (typeof payload?.message === "string" && payload.message.trim()) return payload.message;
  if (typeof payload?.error === "string" && payload.error.trim()) return payload.error;
  return fallback;
}

function setInitialAttachment(path) {
  if (!attachmentWrapEl) return;

  if (!path) {
    attachmentWrapEl.innerHTML = '<p class="text-slate-400 text-sm">Sin adjunto inicial.</p>';
    return;
  }

  const fileName = path.split("/").pop() || "archivo";
  const safePath = encodeURIComponent(path);
  const safeName = encodeURIComponent(fileName);

  attachmentWrapEl.innerHTML = `
    <button
      type="button"
      onclick="descargarAdjuntoInicialOrden('${safePath}', '${safeName}')"
      class="inline-flex items-center gap-2 rounded-lg border border-slate-700 px-3 py-1.5 text-xs text-slate-200 hover:border-purple-500 hover:text-purple-300 transition"
    >
      Descargar adjunto inicial 
    </button>
  `;
}

window.descargarAdjuntoInicialOrden = function descargarAdjuntoInicialOrden(encodedPath, encodedName) {
  const path = decodeURIComponent(encodedPath || "");
  if (!path) {
    window.appToast?.("No hay adjunto inicial disponible.", { tone: "warning" });
    return;
  }

  const name = decodeURIComponent(encodedName || "archivo");
  const url = buildStorageUrl(path);

  const a = document.createElement("a");
  a.href = url;
  a.target = "_blank";
  a.rel = "noopener noreferrer";
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
};

window.descargarRevisionArchivoCompany = async function descargarRevisionArchivoCompany(orderId, revisionId, fileId, encodedName) {
  const token = getAuthToken();
  if (!token) return;

  try {
    const res = await fetch(`${API_BASE}/api/orders/${orderId}/revisions/${revisionId}/files/${fileId}/download`, {
      method: "GET",
      headers: {
        Accept: "application/octet-stream",
        Authorization: `Bearer ${token}`
      }
    });

    if (!res.ok) {
      let msg = `HTTP ${res.status}`;
      try {
        const payload = await res.json();
        msg = getParsedError(payload, msg);
      } catch {
        // ignore json parse
      }
      throw new Error(msg);
    }

    const blob = await res.blob();
    const fallbackName = decodeURIComponent(encodedName || "archivo");
    const disposition = res.headers.get("Content-Disposition") || "";
    const match = disposition.match(/filename\*=UTF-8''([^;]+)|filename="?([^";]+)"?/i);
    const fileName = decodeURIComponent(match?.[1] || match?.[2] || fallbackName);

    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error("Error descargando archivo de revision:", error);
    window.appToast?.("No se pudo descargar el archivo.", { tone: "error" });
  }
};

window.enviarFeedbackRevisionCompany = async function enviarFeedbackRevisionCompany(orderId, revisionId) {
  const token = getAuthToken();
  if (!token) return;

  const input = document.getElementById(`company-feedback-${revisionId}`);
  const msgEl = document.getElementById(`company-feedback-msg-${revisionId}`);
  const button = document.getElementById(`company-feedback-btn-${revisionId}`);

  const feedback = String(input?.value || "").trim();
  if (!feedback) {
    if (msgEl) {
      msgEl.className = "text-xs text-red-300 mt-2";
      msgEl.textContent = "Escribe un feedback antes de enviarlo.";
    }
    return;
  }

  try {
    if (button) {
      button.disabled = true;
      button.classList.add("opacity-70", "cursor-not-allowed");
      button.textContent = "Enviando...";
    }

    const res = await fetch(`${API_BASE}/api/orders/${orderId}/revisions/${revisionId}/feedback`, {
      method: "PATCH",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ client_feedback: feedback })
    });

    const payload = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(getParsedError(payload, `HTTP ${res.status}`));

    if (msgEl) {
      msgEl.className = "text-xs text-emerald-300 mt-2";
      msgEl.textContent = "Feedback enviado correctamente.";
    }

    await loadRevisions(orderId);
  } catch (error) {
    console.error("Error enviando feedback:", error);
    if (msgEl) {
      msgEl.className = "text-xs text-red-300 mt-2";
      msgEl.textContent = String(error?.message || "No se pudo enviar feedback.");
    }
  } finally {
    if (button) {
      button.disabled = false;
      button.classList.remove("opacity-70", "cursor-not-allowed");
      button.textContent = "Enviar feedback";
    }
  }
};

function renderRevisions(orderId, revisions) {
  if (!revisionsListEl || !revisionsEmptyEl || !revisionsLoadingEl || !revisionsCounterEl) return;

  revisionsLoadingEl.classList.add("hidden");
  revisionsCounterEl.textContent = `${revisions.length} revision(es)`;

  if (!revisions.length) {
    revisionsListEl.classList.add("hidden");
    revisionsEmptyEl.classList.remove("hidden");
    return;
  }

  revisionsEmptyEl.classList.add("hidden");
  revisionsListEl.classList.remove("hidden");

  revisionsListEl.innerHTML = revisions.map((rev) => {
    const files = Array.isArray(rev.files) ? rev.files : [];
    const filesHtml = files.length
      ? `<div class="mt-3 space-y-2">${files.map((file) => {
          const fileId = Number(file?.id || 0);
          const originalName = file?.original_name || file?.name || "archivo";
          const safeName = encodeURIComponent(originalName);
          if (!fileId) {
            return `<p class="text-xs text-slate-400">${escapeHtml(originalName)}</p>`;
          }

          return `
            <button
              type="button"
              onclick="descargarRevisionArchivoCompany(${orderId}, ${rev.id}, ${fileId}, '${safeName}')"
              class="text-xs px-3 py-1.5 rounded border border-slate-700 text-slate-200 hover:border-purple-500 hover:text-purple-300 transition"
            >
              Descargar: ${escapeHtml(originalName)}
            </button>
          `;
        }).join("")}</div>`
      : '<p class="text-xs text-slate-400 mt-3">Sin archivos adjuntos.</p>';

    const feedbackBlock = rev.client_feedback
      ? `
        <div class="mt-3 rounded-lg border border-emerald-500/30 bg-emerald-900/15 p-3">
          <div class="flex items-center gap-2 mb-2">
            <span class="inline-flex items-center rounded-full border border-emerald-400/40 bg-emerald-500/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-emerald-300">Feedback enviado</span>
          </div>
          <p class="text-sm text-emerald-200"><span class="font-semibold">Tu feedback:</span> ${escapeHtml(rev.client_feedback)}</p>
        </div>
      `
      : `
        <div class="mt-3 rounded-lg border border-slate-700 p-3 bg-slate-900/70">
          <label class="block text-xs text-slate-400 mb-2">Enviar feedback al freelancer</label>
          <textarea id="company-feedback-${rev.id}" class="w-full rounded-lg border border-slate-700 bg-slate-900 p-2 text-sm text-slate-100 focus:outline-none focus:border-purple-500" rows="2" placeholder="Escribe comentarios para la siguiente entrega..."></textarea>
          <div class="mt-2 flex items-center gap-2">
            <button id="company-feedback-btn-${rev.id}" type="button" onclick="enviarFeedbackRevisionCompany(${orderId}, ${rev.id})" class="px-3 py-1.5 rounded-lg bg-purple-700 hover:bg-purple-600 text-white text-xs transition">Enviar feedback</button>
            <span id="company-feedback-msg-${rev.id}" class="text-xs text-slate-400"></span>
          </div>
        </div>
      `;

    return `
      <div class="bg-slate-800/60 border border-slate-700 rounded-xl p-4">
        <div class="flex flex-wrap items-center gap-2 justify-between">
          <p class="text-sm font-semibold text-white">Revision #${rev.revision_number || "-"}</p>
          <p class="text-xs text-slate-400">Enviada: ${escapeHtml(formatDate(rev.created_at))}</p>
        </div>

        <p class="text-sm text-slate-200 mt-2 whitespace-pre-wrap">${escapeHtml(rev.freelancer_note || "Sin nota")}</p>
        ${filesHtml}
        ${feedbackBlock}
      </div>
    `;
  }).join("");
}

async function loadRevisions(orderId) {
  const token = getAuthToken();
  if (!token) return;

  if (revisionsLoadingEl) revisionsLoadingEl.classList.remove("hidden");
  if (revisionsListEl) revisionsListEl.classList.add("hidden");
  if (revisionsEmptyEl) revisionsEmptyEl.classList.add("hidden");

  try {
    const res = await fetch(`${API_BASE}/api/orders/${orderId}/revisions`, {
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`
      }
    });

    const payload = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(getParsedError(payload, `HTTP ${res.status}`));

    const revisions = normalizeRevisions(payload);
    renderRevisions(orderId, revisions);
  } catch (error) {
    console.error("Error cargando revisiones:", error);
    if (revisionsLoadingEl) {
      revisionsLoadingEl.classList.remove("hidden");
      revisionsLoadingEl.className = "text-red-400 text-sm";
      revisionsLoadingEl.textContent = "No se pudieron cargar las revisiones.";
    }
  }
}


async function loadFinalDelivery(orderId) {
  const token = getAuthToken();
  if (!token) return;

  if (finalLoadingEl) {
    finalLoadingEl.classList.remove("hidden");
    finalLoadingEl.className = "text-slate-400 text-sm";
    finalLoadingEl.textContent = "Cargando entrega final...";
  }
  finalEmptyEl?.classList.add("hidden");
  finalContentEl?.classList.add("hidden");

  try {
    const res = await fetch(`${API_BASE}/api/orders/${orderId}/final-delivery`, {
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`
      }
    });

    if (res.status === 404) {
      finalLoadingEl?.classList.add("hidden");
      finalEmptyEl?.classList.remove("hidden");
      return;
    }

    const payload = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(getParsedError(payload, `HTTP ${res.status}`));

    const finalDelivery = payload?.final_delivery && typeof payload.final_delivery === "object"
      ? payload.final_delivery
      : payload;

    const files = Array.isArray(finalDelivery?.files)
      ? finalDelivery.files
      : Array.isArray(finalDelivery?.attachments)
        ? finalDelivery.attachments
        : [];

    if (finalNoteEl) {
      finalNoteEl.textContent = finalDelivery?.final_note || "Sin nota final.";
    }

    if (finalFilesEl) {
      if (!files.length) {
        finalFilesEl.innerHTML = '<p class="text-xs text-slate-400">Sin archivos finales adjuntos.</p>';
      } else {
        finalFilesEl.innerHTML = files.map((file) => {
          const fileId = Number(file?.id || 0);
          const originalName = file?.original_name || file?.name || "archivo";
          const safeName = encodeURIComponent(originalName);

          if (!fileId) {
            return `<p class="text-xs text-slate-400">${escapeHtml(originalName)}</p>`;
          }

          return `
            <button
              type="button"
              onclick="descargarFinalDeliveryArchivo(${orderId}, ${fileId}, '${safeName}')"
              class="text-xs px-3 py-1.5 rounded border border-slate-700 text-slate-200 hover:border-purple-500 hover:text-purple-300 transition"
            >
              Descargar: ${escapeHtml(originalName)}
            </button>
          `;
        }).join("");
      }
    }

    finalLoadingEl?.classList.add("hidden");
    finalEmptyEl?.classList.add("hidden");
    finalContentEl?.classList.remove("hidden");
  } catch (error) {
    console.error("Error cargando entrega final:", error);
    if (finalLoadingEl) {
      finalLoadingEl.classList.remove("hidden");
      finalLoadingEl.className = "text-red-400 text-sm";
      finalLoadingEl.textContent = "No se pudo cargar la entrega final.";
    }
  }
}

window.descargarFinalDeliveryArchivo = async function descargarFinalDeliveryArchivo(orderId, fileId, encodedName) {
  const token = getAuthToken();
  if (!token) return;

  try {
    const res = await fetch(`${API_BASE}/api/orders/${orderId}/final-delivery/files/${fileId}/download`, {
      method: "GET",
      headers: {
        Accept: "application/octet-stream",
        Authorization: `Bearer ${token}`
      }
    });

    if (!res.ok) {
      let msg = `HTTP ${res.status}`;
      try {
        const payload = await res.json();
        msg = getParsedError(payload, msg);
      } catch {
        // ignore
      }
      throw new Error(msg);
    }

    const blob = await res.blob();
    const fallbackName = decodeURIComponent(encodedName || "archivo");
    const disposition = res.headers.get("Content-Disposition") || "";
    const match = disposition.match(/filename\*=UTF-8''([^;]+)|filename="?([^";]+)"?/i);
    const fileName = decodeURIComponent(match?.[1] || match?.[2] || fallbackName);

    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error("Error descargando archivo final:", error);
    window.appToast?.("No se pudo descargar el archivo final.", { tone: "error" });
  }
};
async function fetchOrder() {
  const params = new URLSearchParams(window.location.search);
  const id = params.get("id");
  currentOrderId = id;

  if (!id) {
    loadingEl?.classList.add("hidden");
    emptyEl?.classList.remove("hidden");
    return;
  }

  const token = getAuthToken();
  if (!token) {
    loadingEl?.classList.add("hidden");
    emptyEl?.classList.remove("hidden");
    emptyEl.textContent = "No hay sesion activa.";
    return;
  }

  try {
    const res = await fetch(`${API_BASE}/api/orders/${id}`, {
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`
      }
    });

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }

    const data = await res.json();

    loadingEl?.classList.add("hidden");
    contentEl?.classList.remove("hidden");

    const status = statusLabel(data?.status);
    if (statusEl) {
      statusEl.textContent = status;
      statusEl.className = `px-3 py-1 rounded-lg text-sm ${statusClass(data?.status)}`;
    }

    const service = data?.service || {};
    const freelancerUser = service?.freelancer_profile?.user || {};
    const freelancerName = `${freelancerUser?.names || ""} ${freelancerUser?.last_names || ""}`.trim() || "Freelancer";

    if (serviceTitleEl) serviceTitleEl.textContent = service?.title || "Servicio";
    if (projectNameEl) projectNameEl.textContent = data?.project_name || "Sin nombre";
    if (requirementsEl) requirementsEl.textContent = data?.requirements || "-";

    setInitialAttachment(data?.attachments || "");

    if (freelancerPhotoEl) freelancerPhotoEl.src = buildStorageUrl(freelancerUser?.photo) || "/logo.jpeg";
    if (freelancerNameEl) freelancerNameEl.textContent = freelancerName;

    if (priceEl) priceEl.textContent = formatPrice(data?.amount || service?.price);
    if (startDateEl) startDateEl.textContent = formatDate(data?.started_at || data?.created_at);
    if (deliveredDateEl) deliveredDateEl.textContent = formatDate(data?.delivered_at || data?.completed_at || data?.deadline);

    const freelancerProfileId = service?.freelancer_profile?.id;
    if (freelancerLinkEl && freelancerProfileId) {
      freelancerLinkEl.setAttribute("href", `/dashboard/company/freelancer?id=${freelancerProfileId}`);
    }

    await loadRevisions(Number(id));
    await loadFinalDelivery(Number(id));
  } catch (err) {
    loadingEl?.classList.add("hidden");
    emptyEl?.classList.remove("hidden");
    console.error(err);
  }
}

fetchOrder();




