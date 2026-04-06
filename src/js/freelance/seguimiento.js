const API_BASE = "http://127.0.0.1:8000";

const contenedor = document.getElementById("contenedor-ordenes");
const orderMeta = new Map();

function getAuthToken() {
  const token = localStorage.getItem("token");
  if (!token) {
    window.location.href = "/login";
    return null;
  }
  return token;
}

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

function getFileNameFromPath(path) {
  if (!path) return "archivo";
  const clean = String(path).split("?")[0].split("#")[0];
  const parts = clean.split("/");
  return parts[parts.length - 1] || "archivo";
}

window.descargarAdjuntoInicial = function descargarAdjuntoInicial(encodedPath, encodedName) {
  const path = decodeURIComponent(encodedPath || "");
  if (!path) {
    window.appToast?.("No hay archivo adjunto disponible.", { tone: "warning" });
    return;
  }

  const fileName = decodeURIComponent(encodedName || "archivo");
  const url = buildStorageUrl(path);

  const a = document.createElement("a");
  a.href = url;
  a.target = "_blank";
  a.rel = "noopener noreferrer";
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
};
function clampMaxRevisions(raw) {
  const value = Number(raw);
  if (!Number.isFinite(value)) return 1;
  if (value < 1) return 1;
  if (value > 3) return 3;
  return Math.trunc(value);
}

function normalizeUsedRevisions(raw) {
  const value = Number(raw);
  if (!Number.isFinite(value) || value < 0) return 0;
  return Math.trunc(value);
}

function isTerminalStatus(status) {
  return ["completed", "cancelled"].includes(String(status || "").toLowerCase());
}

function formatDate(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString();
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
      feedback_at: rev?.feedback_at || rev?.client_responded_at || "",
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

function updateRevisionCounter(orderId, current, max) {
  const counter = document.getElementById(`revision-counter-${orderId}`);
  if (!counter) return;

  counter.textContent = `Revisiones usadas: ${current}/${max}`;
}

function setRevisionAlert(orderId, text, tone = "neutral") {
  const el = document.getElementById(`revision-alert-${orderId}`);
  if (!el) return;

  const base = "text-sm mt-3";
  if (tone === "error") {
    el.className = `${base} text-red-400`;
  } else if (tone === "success") {
    el.className = `${base} text-emerald-400`;
  } else {
    el.className = `${base} text-slate-400`;
  }

  el.textContent = text || "";
}

function setUploadState(orderId, disabled, label) {
  const btn = document.getElementById(`revision-btn-${orderId}`);
  const note = document.getElementById(`revision-note-${orderId}`);
  const files = document.getElementById(`revision-files-${orderId}`);

  if (btn) {
    btn.disabled = disabled;
    btn.textContent = label;
    if (disabled) {
      btn.classList.add("opacity-60", "cursor-not-allowed");
    } else {
      btn.classList.remove("opacity-60", "cursor-not-allowed");
    }
  }

  if (note) note.disabled = disabled;
  if (files) files.disabled = disabled;
}

function updatePendingAction(orderId) {
  const meta = orderMeta.get(orderId);
  const wrapper = document.getElementById(`pending-action-${orderId}`);
  if (!meta || !wrapper) return;

  const status = String(meta.status || "").toLowerCase();
  if (status !== "pending") {
    wrapper.innerHTML = "";
    return;
  }

  wrapper.innerHTML = `
    <div class="rounded-xl border border-amber-500/40 bg-amber-900/10 p-4">
      <p class="text-sm text-amber-200 font-medium">Esta orden esta pendiente de tu decision.</p>
      <p class="text-xs text-amber-100/80 mt-1">Acepta para iniciar el trabajo o rechaza para cancelar la orden.</p>
      <div class="mt-3 flex flex-wrap gap-2">
        <button
          id="pending-accept-btn-${orderId}"
          type="button"
          onclick="aceptarOrdenPendiente(${orderId})"
          class="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium transition"
        >
          Aceptar orden
        </button>
        <button
          id="pending-reject-btn-${orderId}"
          type="button"
          onclick="rechazarOrdenPendiente(${orderId})"
          class="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-sm font-medium transition"
        >
          Rechazar orden
        </button>
      </div>
    </div>
  `;
}
function updateDeliverFinalAction(orderId) {
  const meta = orderMeta.get(orderId);
  const wrapper = document.getElementById(`deliver-final-action-${orderId}`);
  if (!meta || !wrapper) return;

  const status = String(meta.status || "").toLowerCase();
  const canDeliver = status === "in_progress" && meta.usedRevisions >= meta.maxRevisions;

  if (status === "in_progress") {
    wrapper.innerHTML = `
      <div class="rounded-xl border border-slate-700 bg-slate-800/40 p-3">
        <button
          id="deliver-final-btn-${orderId}"
          type="button"
          onclick="abrirModalEntregaFinal(${orderId})"
          class="w-full px-4 py-2 rounded-lg text-sm font-medium transition ${canDeliver ? "bg-indigo-600 hover:bg-indigo-500 text-white" : "bg-slate-700 text-slate-400 cursor-not-allowed opacity-60"}"
          ${canDeliver ? "" : "disabled"}
        >
          ${canDeliver ? "Entregar version final" : `Completa ${meta.maxRevisions} revisiones`}
        </button>
        <p class="text-xs text-slate-400 mt-2">
          ${canDeliver ? "La orden pasara a entregada (delivered)." : `Llevas ${meta.usedRevisions}/${meta.maxRevisions} revisiones.`}
        </p>
      </div>
    `;
    return;
  }

  if (status === "delivered") {
    wrapper.innerHTML = '<p class="text-xs text-slate-400">Entrega final enviada. Esperando confirmacion del cliente o empresa.</p>';
    return;
  }

  if (status === "completed") {
    wrapper.innerHTML = '<p class="text-xs text-green-400">Orden completada.</p>';
    return;
  }

  if (status === "cancelled") {
    wrapper.innerHTML = '<p class="text-xs text-red-400">Orden cancelada.</p>';
    return;
  }

  wrapper.innerHTML = '<p class="text-xs text-slate-400">Acepta la orden para habilitar la entrega final.</p>';
}

function ensureDeliverFinalModal() {
  let modal = document.getElementById("deliver-final-modal");
  if (modal) return modal;

  modal = document.createElement("div");
  modal.id = "deliver-final-modal";
  modal.className = "fixed inset-0 z-[120] hidden items-center justify-center bg-slate-950/75 px-4 opacity-0 transition-opacity duration-200";
  modal.innerHTML = `
    <div id="deliver-final-modal-panel" class="w-full max-w-md rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-2xl transition-all duration-200 ease-out opacity-0 scale-95 translate-y-1">
      <h3 class="text-lg font-bold text-white">Entrega final</h3>
      <p id="deliver-final-modal-text" class="mt-2 text-sm text-slate-300"></p>
      <label for="deliver-final-note" class="block mt-4 text-sm text-slate-300">Nota final</label>
      <textarea id="deliver-final-note" rows="3" class="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 p-3 text-sm text-slate-100 focus:outline-none focus:border-indigo-500" placeholder="Describe la entrega final..."></textarea>
      <label for="deliver-final-files" class="block mt-4 text-sm text-slate-300">Archivos finales (obligatorio)</label>
      <input id="deliver-final-files" type="file" multiple class="mt-2 w-full text-sm text-slate-300 file:mr-3 file:px-3 file:py-1.5 file:rounded file:border-0 file:bg-indigo-700 file:text-white hover:file:bg-indigo-600" />
      <p class="mt-3 text-xs text-slate-400">Al enviar, el backend marcara automaticamente la orden como <strong class="text-slate-200">delivered</strong>.</p>
      <div class="mt-6 flex flex-wrap justify-end gap-2">
        <button id="deliver-final-modal-cancel" type="button" class="px-4 py-2 rounded-lg border border-slate-600 text-slate-200 hover:bg-slate-800 transition">Cancelar</button>
        <button id="deliver-final-modal-confirm" type="button" class="px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-500 transition">Confirmar entrega</button>
      </div>
    </div>
  `;

  modal.addEventListener("click", (event) => {
    if (event.target === modal) {
      window.cerrarModalEntregaFinal();
    }
  });

  document.body.appendChild(modal);
  return modal;
}

function setDeliverModalLoading(loading) {
  const confirmBtn = document.getElementById("deliver-final-modal-confirm");
  const noteEl = document.getElementById("deliver-final-note");
  const filesEl = document.getElementById("deliver-final-files");
  const cancelBtn = document.getElementById("deliver-final-modal-cancel");
  if (!confirmBtn || !cancelBtn) return;

  confirmBtn.disabled = loading;
  cancelBtn.disabled = loading;
  confirmBtn.textContent = loading ? "Enviando..." : "Enviar entrega final";
  if (loading) {
    confirmBtn.classList.add("opacity-70", "cursor-not-allowed");
  } else {
    confirmBtn.classList.remove("opacity-70", "cursor-not-allowed");
  }
}

function setDeliverModalOpenState(isOpen) {
  const modal = document.getElementById("deliver-final-modal");
  const panel = document.getElementById("deliver-final-modal-panel");
  if (!modal || !panel) return;

  if (isOpen) {
    modal.classList.remove("opacity-0");
    modal.classList.add("opacity-100");
    panel.classList.remove("opacity-0", "scale-95", "translate-y-1");
    panel.classList.add("opacity-100", "scale-100", "translate-y-0");
    return;
  }

  modal.classList.remove("opacity-100");
  modal.classList.add("opacity-0");
  panel.classList.remove("opacity-100", "scale-100", "translate-y-0");
  panel.classList.add("opacity-0", "scale-95", "translate-y-1");
}

window.cerrarModalEntregaFinal = function cerrarModalEntregaFinal() {
  const modal = document.getElementById("deliver-final-modal");
  if (!modal) return;

  setDeliverModalOpenState(false);
  setTimeout(() => {
    modal.classList.add("hidden");
    modal.classList.remove("flex");
    modal.dataset.orderId = "";
    setDeliverModalLoading(false);
  }, 200);
};

window.abrirModalEntregaFinal = function abrirModalEntregaFinal(orderId) {
  const meta = orderMeta.get(orderId);
  if (!meta) return;

  const status = String(meta.status || "").toLowerCase();
  if (status !== "in_progress") {
    setRevisionAlert(orderId, "La orden debe estar en progreso para entregar version final.", "error");
    return;
  }

  if (meta.usedRevisions < meta.maxRevisions) {
    setRevisionAlert(orderId, `Debes completar ${meta.maxRevisions} revisiones antes de entregar.`, "error");
    return;
  }

  const modal = ensureDeliverFinalModal();
  const text = document.getElementById("deliver-final-modal-text");
  const confirmBtn = document.getElementById("deliver-final-modal-confirm");
  const noteEl = document.getElementById("deliver-final-note");
  const filesEl = document.getElementById("deliver-final-files");
  const cancelBtn = document.getElementById("deliver-final-modal-cancel");

  if (text) {
    text.textContent = `Orden #${orderId}: llevas ${meta.usedRevisions}/${meta.maxRevisions} revisiones. Deseas enviar la entrega final?`;
  }

  modal.dataset.orderId = String(orderId);
  modal.classList.remove("hidden");
  modal.classList.add("flex");
  requestAnimationFrame(() => setDeliverModalOpenState(true));

  if (confirmBtn) {
    confirmBtn.onclick = () => window.subirEntregaFinalDesdeModal(orderId);
  }

  if (cancelBtn) {
    cancelBtn.onclick = () => window.cerrarModalEntregaFinal();
  }
};
function renderRevisionList(orderId, revisions) {
  const list = document.getElementById(`revisions-list-${orderId}`);
  if (!list) return;

  if (!revisions.length) {
    list.innerHTML = '<p class="text-slate-400 text-sm">Aun no has enviado revisiones para esta orden.</p>';
    return;
  }

  list.innerHTML = revisions.map((rev) => {
    const files = Array.isArray(rev.files) ? rev.files : [];
    const filesHtml = files.length
      ? `<div class="mt-3 space-y-2">${files.map((file) => {
          const fileId = Number(file?.id || 0);
          const originalName = file?.original_name || file?.name || "archivo";
          const safeFileName = encodeURIComponent(originalName);
          if (!fileId) {
            return `<p class="text-xs text-slate-400">${escapeHtml(originalName)}</p>`;
          }

          return `
            <button
              type="button"
              onclick="descargarRevisionArchivo(${orderId}, ${rev.id}, ${fileId}, '${safeFileName}')"
              class="text-xs px-3 py-1.5 rounded border border-slate-700 text-slate-200 hover:border-purple-500 hover:text-purple-300 transition"
            >
              Descargar: ${escapeHtml(originalName)}
            </button>
          `;
        }).join("")}</div>`
      : '<p class="text-xs text-slate-400 mt-3">Sin archivos adjuntos.</p>';

    const feedback = rev.client_feedback
      ? `<p class="text-sm text-emerald-300 mt-3"><span class="font-semibold">Feedback cliente:</span> ${escapeHtml(rev.client_feedback)}</p>`
      : '<p class="text-sm text-slate-500 mt-3">Sin feedback del cliente aun.</p>';

    return `
      <div class="bg-slate-800/60 border border-slate-700 rounded-xl p-4">
        <div class="flex flex-wrap items-center gap-2 justify-between">
          <p class="text-sm font-semibold text-white">Revision #${rev.revision_number || "-"}</p>
          <p class="text-xs text-slate-400">Enviada: ${escapeHtml(formatDate(rev.created_at))}</p>
        </div>
        <p class="text-sm text-slate-200 mt-2 whitespace-pre-wrap">${escapeHtml(rev.freelancer_note || "Sin nota")}</p>
        ${filesHtml}
        ${feedback}
      </div>
    `;
  }).join("");
}

async function cargarRevisiones(orderId) {
  const meta = orderMeta.get(orderId);
  if (!meta) return;

  const token = getAuthToken();
  if (!token) return;

  try {
    const res = await fetch(`${API_BASE}/api/orders/${orderId}/revisions`, {
      method: "GET",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`
      }
    });

    const payload = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(getParsedError(payload, `HTTP ${res.status}`));

    const revisions = normalizeRevisions(payload);
    meta.usedRevisions = revisions.length;

    updateRevisionCounter(orderId, meta.usedRevisions, meta.maxRevisions);
    updatePendingAction(orderId);
    updateDeliverFinalAction(orderId);
    renderRevisionList(orderId, revisions);
    const status = String(meta.status || "").toLowerCase();
    const reachedLimit = meta.usedRevisions >= meta.maxRevisions;

    if (status !== "in_progress") {
      if (status === "pending") {
        setUploadState(orderId, true, "Acepta la orden primero");
        setRevisionAlert(orderId, "Podras enviar revisiones cuando la orden este en progreso.", "neutral");
      } else if (status === "delivered") {
        setUploadState(orderId, true, "Entrega final enviada");
        setRevisionAlert(orderId, "Esperando confirmacion del cliente o empresa.", "neutral");
      } else if (isTerminalStatus(status)) {
        setUploadState(orderId, true, "Orden cerrada");
        setRevisionAlert(orderId, "No puedes enviar revisiones en ordenes completadas o canceladas.", "neutral");
      } else {
        setUploadState(orderId, true, "No disponible");
      }
      return;
    }

    if (reachedLimit) {
      setUploadState(orderId, true, "Limite alcanzado");
      setRevisionAlert(orderId, "Ya alcanzaste el numero maximo de revisiones para esta orden.", "neutral");
      return;
    }

    setUploadState(orderId, false, "Enviar revision");
    setRevisionAlert(orderId, "", "neutral");
  } catch (error) {
    console.error(`Error cargando revisiones de orden ${orderId}:`, error);
    const list = document.getElementById(`revisions-list-${orderId}`);
    if (list) {
      list.innerHTML = '<p class="text-red-400 text-sm">No se pudieron cargar las revisiones.</p>';
    }
    updateRevisionCounter(orderId, meta.usedRevisions, meta.maxRevisions);
    updatePendingAction(orderId);
    updateDeliverFinalAction(orderId);
  }
}


async function patchOrderStatus(orderId, nextStatus, fallbackError) {
  const token = getAuthToken();
  if (!token) return null;

  const res = await fetch(`${API_BASE}/api/orders/${orderId}/status`, {
    method: "PATCH",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({ status: nextStatus })
  });

  const payload = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(getParsedError(payload, fallbackError));
  }

  return payload;
}

window.aceptarOrdenPendiente = async function aceptarOrdenPendiente(orderId) {
  const meta = orderMeta.get(orderId);
  if (!meta) return;

  if (String(meta.status || "").toLowerCase() !== "pending") {
    setRevisionAlert(orderId, "La orden ya no esta pendiente.", "error");
    return;
  }

  const acceptBtn = document.getElementById(`pending-accept-btn-${orderId}`);
  const rejectBtn = document.getElementById(`pending-reject-btn-${orderId}`);
  if (acceptBtn) {
    acceptBtn.disabled = true;
    acceptBtn.textContent = "Aceptando...";
    acceptBtn.classList.add("opacity-70", "cursor-not-allowed");
  }
  if (rejectBtn) rejectBtn.disabled = true;

  try {
    await patchOrderStatus(orderId, "in_progress", "No se pudo aceptar la orden.");
    await cargarOrdenes();
  } catch (error) {
    console.error("Error aceptando orden:", error);
    setRevisionAlert(orderId, String(error?.message || "No se pudo aceptar la orden."), "error");
    if (acceptBtn) {
      acceptBtn.disabled = false;
      acceptBtn.textContent = "Aceptar orden";
      acceptBtn.classList.remove("opacity-70", "cursor-not-allowed");
    }
    if (rejectBtn) rejectBtn.disabled = false;
  }
};

window.rechazarOrdenPendiente = async function rechazarOrdenPendiente(orderId) {
  const meta = orderMeta.get(orderId);
  if (!meta) return;

  if (String(meta.status || "").toLowerCase() !== "pending") {
    setRevisionAlert(orderId, "La orden ya no esta pendiente.", "error");
    return;
  }

  const confirmed = await window.appConfirm({
    title: "Rechazar orden",
    message: "Estas seguro de rechazar esta orden? Esta accion la dejara cancelada.",
    confirmText: "Si, rechazar",
    cancelText: "No",
    tone: "danger"
  });
  if (!confirmed) return;

  const acceptBtn = document.getElementById(`pending-accept-btn-${orderId}`);
  const rejectBtn = document.getElementById(`pending-reject-btn-${orderId}`);
  if (acceptBtn) acceptBtn.disabled = true;
  if (rejectBtn) {
    rejectBtn.disabled = true;
    rejectBtn.textContent = "Rechazando...";
    rejectBtn.classList.add("opacity-70", "cursor-not-allowed");
  }

  try {
    await patchOrderStatus(orderId, "cancelled", "No se pudo rechazar la orden.");
    await cargarOrdenes();
  } catch (error) {
    console.error("Error rechazando orden:", error);
    setRevisionAlert(orderId, String(error?.message || "No se pudo rechazar la orden."), "error");
    if (acceptBtn) acceptBtn.disabled = false;
    if (rejectBtn) {
      rejectBtn.disabled = false;
      rejectBtn.textContent = "Rechazar orden";
      rejectBtn.classList.remove("opacity-70", "cursor-not-allowed");
    }
  }
};

window.subirEntregaFinalDesdeModal = async function subirEntregaFinalDesdeModal(orderId) {
  const meta = orderMeta.get(orderId);
  if (!meta) return;

  const token = getAuthToken();
  if (!token) return;

  const noteEl = document.getElementById("deliver-final-note");
  const filesEl = document.getElementById("deliver-final-files");

  const finalNote = String(noteEl?.value || "").trim();
  const files = Array.from(filesEl?.files || []);

  if (!finalNote) {
    setRevisionAlert(orderId, "Debes escribir la nota final de entrega.", "error");
    return;
  }

  if (!files.length) {
    setRevisionAlert(orderId, "Debes adjuntar al menos 1 archivo en la entrega final.", "error");
    return;
  }

  setDeliverModalLoading(true);

  try {
    const formData = new FormData();
    formData.append("final_note", finalNote);
    files.forEach((file) => formData.append("files[]", file));

    const res = await fetch(`${API_BASE}/api/orders/${orderId}/final-delivery`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`
      },
      body: formData
    });

    const payload = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(getParsedError(payload, "No se pudo enviar la entrega final."));

    window.cerrarModalEntregaFinal();
    setRevisionAlert(orderId, "Entrega final enviada correctamente. La orden paso a entregada.", "success");
    await cargarOrdenes();
  } catch (error) {
    console.error("Error enviando entrega final:", error);
    setRevisionAlert(orderId, String(error?.message || "No se pudo enviar la entrega final."), "error");
    setDeliverModalLoading(false);
  }
};
window.descargarRevisionArchivo = async function descargarRevisionArchivo(orderId, revisionId, fileId, encodedName) {
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
        // keep default
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
    console.error("Error descargando archivo:", error);
    window.appToast("No se pudo descargar el archivo.", { tone: "error" });
  }
};

window.subirRevision = async function subirRevision(orderId) {
  const meta = orderMeta.get(orderId);
  if (!meta) return;

  const status = String(meta.status || "").toLowerCase();
  if (status !== "in_progress") {
    setRevisionAlert(orderId, "La orden debe estar en progreso para subir revisiones.", "error");
    return;
  }

  const token = getAuthToken();
  if (!token) return;

  const noteEl = document.getElementById(`revision-note-${orderId}`);
  const filesEl = document.getElementById(`revision-files-${orderId}`);

  const note = String(noteEl?.value || "").trim();
  if (!note) {
    setRevisionAlert(orderId, "Debes escribir una nota de entrega.", "error");
    return;
  }

  setUploadState(orderId, true, "Enviando...");
  setRevisionAlert(orderId, "", "neutral");

  try {
    const formData = new FormData();
    formData.append("freelancer_note", note);

    const files = Array.from(filesEl?.files || []);
    files.forEach((file) => formData.append("files[]", file));

    const res = await fetch(`${API_BASE}/api/orders/${orderId}/revisions`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`
      },
      body: formData
    });

    const payload = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(getParsedError(payload, "No se pudo enviar la revision."));
    }

    if (noteEl) noteEl.value = "";
    if (filesEl) filesEl.value = "";

    setRevisionAlert(orderId, "Revision enviada correctamente.", "success");
    await cargarRevisiones(orderId);
  } catch (error) {
    console.error("Error enviando revision:", error);
    setRevisionAlert(orderId, String(error?.message || "No se pudo enviar la revision."), "error");
    setUploadState(orderId, false, "Enviar revision");
  }
};

function buildOrderCard(order) {
  const clienteNombre = order.user
    ? `${order.user.names || ""} ${order.user.last_names || ""}`.trim()
    : "Cliente Desconocido";

  const servicioNombre = order.service?.title || "Servicio borrado/inactivo";
  const projectName = String(order.project_name || "").trim() || `Orden #${order.id}`;
  const attachmentPath = String(order.attachments || "").trim();
  const attachmentName = getFileNameFromPath(attachmentPath);
  const hasAttachment = Boolean(attachmentPath);
  const encodedAttachmentPath = encodeURIComponent(attachmentPath);
  const encodedAttachmentName = encodeURIComponent(attachmentName);
  const status = String(order.status || "").toLowerCase();
  const maxRevisions = clampMaxRevisions(order.service?.revisions);
  const usedRevisions = normalizeUsedRevisions(order.revisions_count);
  orderMeta.set(order.id, {
    maxRevisions,
    usedRevisions,
    status
  });

  return `
    <div class="mb-10 border-b border-slate-800 pb-10 last:border-0">
      <div class="space-y-6">
        <div class="bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow">
          <h2 class="text-xl font-bold text-white mb-6">Pedido #${order.id}</h2>

          <div class="grid grid-cols-2 md:grid-cols-3 gap-6 text-sm">
            <div>
              <p class="text-slate-400">Nombre del proyecto</p>
              <p class="font-semibold text-white line-clamp-1" title="${escapeHtml(projectName)}">${escapeHtml(projectName)}</p>
            </div>
            <div>
              <p class="text-slate-400">Cliente</p>
              <p class="font-semibold text-white">${escapeHtml(clienteNombre)}</p>
            </div>
            <div>
              <p class="text-slate-400">Servicio</p>
              <p class="font-semibold text-white line-clamp-1" title="${escapeHtml(servicioNombre)}">${escapeHtml(servicioNombre)}</p>
            </div>
            <div>
              <p class="text-slate-400">Precio</p>
              <p class="font-semibold text-purple-400">$${escapeHtml(order.amount)}</p>
            </div>
            <div>
              <p class="text-slate-400">Inicio (Creado)</p>
              <p class="font-semibold text-white">${escapeHtml(new Date(order.created_at).toLocaleDateString())}</p>
            </div>
            <div>
              <p class="text-slate-400">Adjunto inicial</p>
              ${hasAttachment
                ? `<button
                    type="button"
                    onclick="descargarAdjuntoInicial('${encodedAttachmentPath}', '${encodedAttachmentName}')"
                    class="font-semibold text-indigo-300 hover:text-indigo-200 underline decoration-indigo-400/60 underline-offset-2 transition"
                  >
                    Descarga aqui
                  </button>`
                : '<p class="font-semibold text-slate-400">Sin adjunto</p>'}
            </div>
            <div>
              <p class="text-slate-400">Requisitos</p>
              <p class="font-semibold text-white truncate" title="${escapeHtml(order.requirements || "")}">${escapeHtml(order.requirements || "Ninguno")}</p>
            </div>
            <div>
              <p class="text-slate-400 mb-1">Estado</p>
              <span class="px-3 py-1 bg-blue-900/60 text-blue-300 rounded-full text-xs font-medium uppercase tracking-wider">
                ${escapeHtml(order.status)}
              </span>
            </div>
          </div>
        </div>

        <div class="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow">
          <div class="flex items-center justify-between gap-4 mb-4">
            <h2 class="text-lg font-bold text-white">Estado visual del trabajo</h2>
            <span class="text-xs px-2.5 py-1 rounded-full bg-slate-800 text-slate-300">${escapeHtml(status)}</span>
          </div>

          <div class="h-2 w-full rounded-full bg-slate-800 overflow-hidden mb-5">
            <div class="h-full bg-purple-600 transition-all duration-500" style="width:${status === "pending" ? 25 : status === "in_progress" ? 50 : status === "delivered" ? 75 : status === "completed" ? 100 : 0}%"></div>
          </div>

          <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div class="rounded-xl border p-3 ${["pending", "in_progress", "delivered", "completed"].includes(status) ? "border-purple-500/60 bg-purple-900/20" : "border-slate-700 bg-slate-800/40"}">
              <p class="text-xs font-semibold ${["pending", "in_progress", "delivered", "completed"].includes(status) ? "text-purple-300" : "text-slate-400"}">1. Pendiente</p>
              <p class="text-[11px] mt-1 text-slate-400">Orden recibida</p>
            </div>

            <div class="rounded-xl border p-3 ${["in_progress", "delivered", "completed"].includes(status) ? "border-purple-500/60 bg-purple-900/20" : "border-slate-700 bg-slate-800/40"}">
              <p class="text-xs font-semibold ${["in_progress", "delivered", "completed"].includes(status) ? "text-purple-300" : "text-slate-400"}">2. En progreso</p>
              <p class="text-[11px] mt-1 text-slate-400">Trabajo y revisiones</p>
            </div>

            <div class="rounded-xl border p-3 ${["delivered", "completed"].includes(status) ? "border-purple-500/60 bg-purple-900/20" : "border-slate-700 bg-slate-800/40"}">
              <p class="text-xs font-semibold ${["delivered", "completed"].includes(status) ? "text-purple-300" : "text-slate-400"}">3. Entregado</p>
              <p class="text-[11px] mt-1 text-slate-400">Esperando confirmacion</p>
            </div>

            <div class="rounded-xl border p-3 ${status === "completed" ? "border-green-500/60 bg-green-900/20" : "border-slate-700 bg-slate-800/40"}">
              <p class="text-xs font-semibold ${status === "completed" ? "text-green-300" : "text-slate-400"}">4. Completado</p>
              <p class="text-[11px] mt-1 text-slate-400">Orden finalizada</p>
            </div>
          </div>
        </div>

        <div id="pending-action-${order.id}" class="mt-2"></div>

        <div class="bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow">
          <div class="flex items-center justify-between gap-4 mb-4">
            <h2 class="text-xl font-bold text-white">Entregas y revisiones</h2>
            <span id="revision-counter-${order.id}" class="text-sm text-slate-400">Revisiones usadas: ${usedRevisions}/${maxRevisions}</span>
          </div>

          <p class="text-xs text-slate-400 mb-4">Limite configurado para este servicio: ${maxRevisions} revision(es).</p>

          <div class="bg-slate-800/40 border border-slate-700 rounded-xl p-4">
            <label for="revision-note-${order.id}" class="block text-sm text-slate-300 mb-2">Nota de entrega</label>
            <textarea id="revision-note-${order.id}" class="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-sm text-slate-100 focus:outline-none focus:border-purple-500" rows="3" placeholder="Describe lo que entregaste en esta revision..." ${status !== "in_progress" || usedRevisions >= maxRevisions ? "disabled" : ""}></textarea>

            <label for="revision-files-${order.id}" class="block text-sm text-slate-300 mt-4 mb-2">Archivos (opcional)</label>
            <input id="revision-files-${order.id}" type="file" multiple class="w-full text-sm text-slate-300 file:mr-3 file:px-3 file:py-1.5 file:rounded file:border-0 file:bg-purple-700 file:text-white hover:file:bg-purple-600" ${status !== "in_progress" || usedRevisions >= maxRevisions ? "disabled" : ""} />

            <button
              id="revision-btn-${order.id}"
              type="button"
              onclick="subirRevision(${order.id})"
              class="mt-4 px-4 py-2 rounded-lg bg-purple-700 hover:bg-purple-600 text-white text-sm font-medium transition ${status !== "in_progress" || usedRevisions >= maxRevisions ? "opacity-60 cursor-not-allowed" : ""}"
              ${status !== "in_progress" || usedRevisions >= maxRevisions ? "disabled" : ""}
            >
              ${status === "pending" ? "Acepta la orden primero" : (status !== "in_progress" ? "No disponible" : (usedRevisions >= maxRevisions ? "Limite alcanzado" : "Enviar revision"))}
            </button>

            <p id="revision-alert-${order.id}" class="text-sm mt-3 text-slate-400"></p>
          </div>

          <div id="deliver-final-action-${order.id}" class="mt-4"></div>

          <div id="revisions-list-${order.id}" class="mt-6 space-y-4">
            <p class="text-slate-400 text-sm">Cargando historial de revisiones...</p>
          </div>
        </div>
      </div>
    </div>
  `;
}

function shouldDisplayInTracking(order) {
  const status = String(order?.status || "").toLowerCase();
  if (status !== "completed") return true;

  const completedAtRaw = order?.completed_at;
  if (!completedAtRaw) return false;

  const completedAt = new Date(completedAtRaw);
  if (Number.isNaN(completedAt.getTime())) return false;

  const now = Date.now();
  const diffMs = now - completedAt.getTime();
  const oneDayMs = 24 * 60 * 60 * 1000;

  return diffMs >= 0 && diffMs <= oneDayMs;
}
async function cargarOrdenes() {
  const token = getAuthToken();
  if (!token) return;

  try {
    const respuesta = await fetch(`${API_BASE}/api/orders`, {
      method: "GET",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`
      }
    });

    const datos = await respuesta.json().catch(() => ({}));
    if (!respuesta.ok) throw new Error(getParsedError(datos, `HTTP ${respuesta.status}`));

    const ordenes = Array.isArray(datos?.data) ? datos.data : [];
    const ordenesVisibles = ordenes.filter(shouldDisplayInTracking);
    contenedor.innerHTML = "";
    orderMeta.clear();

    if (!ordenesVisibles.length) {
      contenedor.innerHTML = '<p class="text-slate-400 text-center py-10 bg-slate-900 border border-slate-800 rounded-2xl">No tienes pedidos actualmente.</p>';
      return;
    }

    ordenesVisibles.forEach((order) => {
      contenedor.innerHTML += buildOrderCard(order);
    });

    await Promise.allSettled(ordenesVisibles.map((order) => cargarRevisiones(order.id)));
  } catch (error) {
    console.error("Error cargando ordenes:", error);
    contenedor.innerHTML = '<p class="text-red-500 text-center py-10">Hubo un problema al cargar los datos.</p>';
  }
}

cargarOrdenes();




























