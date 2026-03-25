const API_BASE = "http://127.0.0.1:8000";

const searchInput = document.getElementById("usersSearch");
const roleFilter = document.getElementById("usersRoleFilter");
const emptyEl = document.getElementById("usersEmpty");
const tbody = document.getElementById("usersTableBody");

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function getAuthHeaders() {
  const token = localStorage.getItem("token");
  const headers = { Accept: "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

function showSkeletonRows() {
  if (!tbody) return;
  tbody.innerHTML = `
    <tr class="border-t border-slate-800">
      <td class="p-4"><div class="h-4 w-40 bg-slate-700/70 rounded animate-pulse"></div></td>
      <td class="p-4"><div class="h-4 w-56 bg-slate-700/70 rounded animate-pulse"></div></td>
      <td class="p-4"><div class="h-6 w-24 bg-slate-700/70 rounded animate-pulse"></div></td>
      <td class="p-4"><div class="h-4 w-20 bg-slate-700/70 rounded animate-pulse"></div></td>
      <td class="p-4"><div class="h-4 w-20 bg-slate-700/70 rounded animate-pulse"></div></td>
    </tr>
    <tr class="border-t border-slate-800">
      <td class="p-4"><div class="h-4 w-36 bg-slate-700/70 rounded animate-pulse"></div></td>
      <td class="p-4"><div class="h-4 w-52 bg-slate-700/70 rounded animate-pulse"></div></td>
      <td class="p-4"><div class="h-6 w-24 bg-slate-700/70 rounded animate-pulse"></div></td>
      <td class="p-4"><div class="h-4 w-24 bg-slate-700/70 rounded animate-pulse"></div></td>
      <td class="p-4"><div class="h-4 w-20 bg-slate-700/70 rounded animate-pulse"></div></td>
    </tr>
    <tr class="border-t border-slate-800">
      <td class="p-4"><div class="h-4 w-44 bg-slate-700/70 rounded animate-pulse"></div></td>
      <td class="p-4"><div class="h-4 w-60 bg-slate-700/70 rounded animate-pulse"></div></td>
      <td class="p-4"><div class="h-6 w-20 bg-slate-700/70 rounded animate-pulse"></div></td>
      <td class="p-4"><div class="h-4 w-20 bg-slate-700/70 rounded animate-pulse"></div></td>
      <td class="p-4"><div class="h-4 w-20 bg-slate-700/70 rounded animate-pulse"></div></td>
    </tr>
  `;
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

function roleBadgeClass(label) {
  const v = String(label).toLowerCase();
  if (v === "cliente") return "bg-blue-600/20 text-blue-400";
  if (v === "freelancer") return "bg-purple-600/20 text-purple-400";
  if (v === "empresa") return "bg-amber-600/20 text-amber-400";
  if (v === "admin") return "bg-red-600/20 text-red-400";
  return "bg-slate-600/20 text-slate-300";
}

function statusText(user) {
  if (typeof user?.is_active === "boolean") return user.is_active ? "Activo" : "Inactivo";
  if (typeof user?.is_active === "number") return user.is_active === 1 ? "Activo" : "Inactivo";
  return "-";
}

function statusClass(text) {
  const v = String(text).toLowerCase();
  if (v === "activo") return "text-green-400";
  if (v === "inactivo") return "text-red-400";
  return "text-slate-400";
}

function buildRow(user) {
  const id = user?.id;
  const name = `${user?.names || ""} ${user?.last_names || ""}`.trim() || "-";
  const email = user?.email || "-";
  const role = roleLabel(user?.role);
  const state = statusText(user);

  return `
    <tr class="border-t border-slate-800 hover:bg-slate-800/40 transition cursor-pointer" data-user-id="${escapeHtml(id)}">
      <td class="p-4 font-semibold">${escapeHtml(name)}</td>
      <td class="p-4">${escapeHtml(email)}</td>
      <td class="p-4">
        <span class="px-2 py-1 rounded text-xs ${roleBadgeClass(role)}">${escapeHtml(role)}</span>
      </td>
      <td class="p-4">
        <span class="${statusClass(state)}">${escapeHtml(state)}</span>
      </td>
      <td class="p-4">
        <a href="/dashboard/admin/usuarioDetalle?id=${escapeHtml(id)}" class="text-purple-400 hover:underline">Ver perfil</a>
      </td>
    </tr>
  `;
}

function buildQuery() {
  const params = new URLSearchParams();
  const search = searchInput?.value?.trim();
  const roleId = roleFilter?.value?.trim();

  if (search) params.set("search", search);
  if (roleId) params.set("role_id", roleId);

  return params.toString();
}

async function fetchUsers() {
  try {
    emptyEl?.classList.add("hidden");
    showSkeletonRows();

    const query = buildQuery();
    const url = `${API_BASE}/api/admin/users${query ? `?${query}` : ""}`;

    const res = await fetch(url, {
      headers: getAuthHeaders()
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const payload = await res.json();
    const users = Array.isArray(payload) ? payload : (payload?.data || payload?.users || []);

    if (!users.length) {
      tbody.innerHTML = "";
      emptyEl?.classList.remove("hidden");
      return;
    }

    tbody.innerHTML = users.map(buildRow).join("");
    bindRowNavigation();
  } catch (err) {
    console.error("Error cargando usuarios:", err);
    tbody.innerHTML = "";
    emptyEl?.classList.remove("hidden");
    emptyEl.textContent = "No se pudieron cargar los usuarios.";
  }
}

function bindRowNavigation() {
  const rows = tbody.querySelectorAll("tr[data-user-id]");
  rows.forEach((row) => {
    row.addEventListener("click", (event) => {
      const target = event.target;
      if (target instanceof HTMLElement && target.closest("a")) return;

      const userId = row.getAttribute("data-user-id");
      if (!userId) return;
      window.location.href = `/dashboard/admin/usuarioDetalle?id=${userId}`;
    });
  });
}

function debounce(fn, wait = 350) {
  let timer = null;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), wait);
  };
}

const onSearch = debounce(fetchUsers, 350);

searchInput?.addEventListener("input", onSearch);
roleFilter?.addEventListener("change", fetchUsers);

fetchUsers();
