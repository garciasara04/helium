const API_BASE = "http://127.0.0.1:8000";

const params = new URLSearchParams(window.location.search);
const userId = params.get("id");

const detailAlert = document.getElementById("detailAlert");
const skeletonEl = document.getElementById("userInfoSkeleton");
const userInfoEl = document.getElementById("userInfo");
const statusHelpEl = document.getElementById("statusHelp");
const profileBlocksEl = document.getElementById("profileBlocks");
const btnActivate = document.getElementById("btnActivate");
const btnDeactivate = document.getElementById("btnDeactivate");

let currentUser = null;

function getAuthHeaders() {
  const token = localStorage.getItem("token");
  const headers = {
    Accept: "application/json",
    "Content-Type": "application/json"
  };
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function showAlert(message, type = "error") {
  if (!detailAlert) return;
  detailAlert.classList.remove(
    "hidden",
    "border-red-500/30",
    "bg-red-500/10",
    "text-red-300",
    "border-emerald-500/30",
    "bg-emerald-500/10",
    "text-emerald-300"
  );

  if (type === "success") {
    detailAlert.classList.add("border-emerald-500/30", "bg-emerald-500/10", "text-emerald-300");
  } else {
    detailAlert.classList.add("border-red-500/30", "bg-red-500/10", "text-red-300");
  }

  detailAlert.textContent = message;
}

function hideAlert() {
  if (!detailAlert) return;
  detailAlert.classList.add("hidden");
  detailAlert.textContent = "";
}

function roleLabel(role) {
  const roleId = Number(role?.id);
  const roleName = String(role?.name || "").toLowerCase();

  if (roleId === 1 || roleName === "cliente") return "Cliente";
  if (roleId === 2 || roleName === "freelancer") return "Freelancer";
  if (roleId === 3 || roleName === "empresa") return "Empresa";
  if (roleId === 4 || roleName === "admin") return "Admin";
  return role?.name || "-";
}

function isActive(value) {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value === 1;
  if (typeof value === "string") return value === "1" || value.toLowerCase() === "true";
  return true;
}

function renderGeneralInfo(user) {
  const fullName = `${user?.names || ""} ${user?.last_names || ""}`.trim() || "-";
  const email = user?.email || "-";
  const role = roleLabel(user?.role);
  const active = isActive(user?.is_active);

  userInfoEl.innerHTML = `
    <div><dt class="text-slate-400">Nombre</dt><dd class="font-medium">${escapeHtml(fullName)}</dd></div>
    <div><dt class="text-slate-400">Correo</dt><dd class="font-medium">${escapeHtml(email)}</dd></div>
    <div><dt class="text-slate-400">Rol</dt><dd class="font-medium">${escapeHtml(role)}</dd></div>
    <div><dt class="text-slate-400">Estado</dt><dd class="font-medium ${active ? "text-emerald-400" : "text-rose-400"}">${active ? "Activo" : "Inactivo"}</dd></div>
    <div><dt class="text-slate-400">ID usuario</dt><dd class="font-medium">${escapeHtml(user?.id)}</dd></div>
    <div><dt class="text-slate-400">Registrado</dt><dd class="font-medium">${escapeHtml(new Date(user?.created_at || Date.now()).toLocaleDateString())}</dd></div>
  `;

  skeletonEl?.classList.add("hidden");
  userInfoEl?.classList.remove("hidden");

  if (statusHelpEl) {
    statusHelpEl.textContent = active
      ? "La cuenta esta activa. Puedes desactivarla si necesitas moderacion."
      : "La cuenta esta inactiva. Puedes activarla nuevamente.";
  }

  if (btnActivate) btnActivate.disabled = active;
  if (btnDeactivate) btnDeactivate.disabled = !active;
}

function extractProfile(user) {
  return user?.freelancer_profile || user?.company || null;
}

function renderProfileBlocks(user) {
  const profile = extractProfile(user);
  const role = roleLabel(user?.role);

  const blocks = [
    { label: "Tipo de perfil", value: role },
    { label: "Telefono", value: user?.phone || profile?.phone || "No registrado" },
    { label: "Ciudad", value: user?.city || profile?.city || "No registrada" }
  ];

  if (role === "Freelancer") {
    blocks[1] = { label: "Profesion", value: profile?.profession || "No registrada" };
    blocks[2] = { label: "Experiencia", value: profile?.experience || "No registrada" };
  }

  if (role === "Empresa") {
    blocks[1] = { label: "Empresa", value: profile?.name || profile?.business_name || "No registrada" };
    blocks[2] = { label: "NIT", value: profile?.nit || "No registrado" };
  }

  profileBlocksEl.innerHTML = blocks
    .map(
      (item) => `
        <div class="rounded-xl border border-slate-800 bg-slate-800/40 p-4">
          <p class="text-slate-400 text-xs uppercase tracking-wide">${escapeHtml(item.label)}</p>
          <p class="font-semibold mt-2">${escapeHtml(item.value)}</p>
        </div>
      `
    )
    .join("");
}

async function fetchUserDetail() {
  if (!userId) {
    showAlert("No se encontro el id del usuario en la URL.");
    if (btnActivate) btnActivate.disabled = true;
    if (btnDeactivate) btnDeactivate.disabled = true;
    return;
  }

  try {
    hideAlert();
    const res = await fetch(`${API_BASE}/api/admin/users/${userId}`, {
      headers: getAuthHeaders()
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const payload = await res.json();
    const user = payload?.data || payload?.user || payload;

    if (!user || typeof user !== "object") {
      throw new Error("Respuesta invalida del servidor");
    }

    currentUser = user;
    renderGeneralInfo(user);
    renderProfileBlocks(user);
  } catch (error) {
    console.error("Error cargando detalle de usuario:", error);
    showAlert("No se pudo cargar el perfil del usuario.");
    if (profileBlocksEl) {
      profileBlocksEl.innerHTML = '<p class="text-slate-400">No hay informacion adicional disponible.</p>';
    }
  }
}

async function requestUpdateStatus(nextActive) {
  const res = await fetch(`${API_BASE}/api/admin/users/${userId}/status`, {
    method: "PATCH",
    headers: getAuthHeaders(),
    body: JSON.stringify({ is_active: nextActive })
  });

  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }
}

function setActionLoading(isLoading) {
  if (btnActivate) btnActivate.disabled = isLoading || isActive(currentUser?.is_active);
  if (btnDeactivate) btnDeactivate.disabled = isLoading || !isActive(currentUser?.is_active);

  if (btnActivate) btnActivate.textContent = isLoading ? "Actualizando..." : "Activar cuenta";
  if (btnDeactivate) btnDeactivate.textContent = isLoading ? "Actualizando..." : "Desactivar cuenta";
}

async function updateStatus(nextActive) {
  if (!currentUser) return;

  try {
    hideAlert();
    setActionLoading(true);

    await requestUpdateStatus(nextActive);
    await fetchUserDetail();

    const updatedActive = isActive(currentUser?.is_active);
    if (updatedActive !== nextActive) {
      showAlert("El servidor respondio, pero el estado no cambio en la cuenta.");
      return;
    }

    showAlert(nextActive ? "Cuenta activada correctamente." : "Cuenta desactivada correctamente.", "success");
  } catch (error) {
    console.error("Error actualizando estado:", error);
    showAlert("No se pudo actualizar el estado de la cuenta. Verifica el endpoint en backend.");
  } finally {
    setActionLoading(false);
  }
}

btnActivate?.addEventListener("click", () => updateStatus(true));
btnDeactivate?.addEventListener("click", () => updateStatus(false));

fetchUserDetail();
