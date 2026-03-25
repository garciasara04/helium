const API_BASE = "http://127.0.0.1:8000";

const rangeSelect = document.getElementById("reportsRange");
const alertEl = document.getElementById("reportsAlert");

const totalOrdersEl = document.getElementById("reportTotalOrders");
const completionRateEl = document.getElementById("reportCompletionRate");
const cancellationRateEl = document.getElementById("reportCancellationRate");
const avgTicketEl = document.getElementById("reportAvgTicket");

const statusBarsEl = document.getElementById("reportsStatusBars");
const rangeBarsEl = document.getElementById("reportsRangeBars");

const recentOrdersEl = document.getElementById("reportsRecentOrders");
const worstServicesEl = document.getElementById("reportsWorstServices");
const alertsEl = document.getElementById("reportsAlerts");

const STATUS_META = {
  pending: { label: "Pending", color: "bg-amber-500" },
  in_progress: { label: "In progress", color: "bg-indigo-500" },
  delivered: { label: "Delivered", color: "bg-cyan-500" },
  completed: { label: "Completed", color: "bg-emerald-500" },
  cancelled: { label: "Cancelled", color: "bg-rose-500" }
};

function getAuthHeaders() {
  const token = localStorage.getItem("token");
  const headers = { Accept: "application/json" };
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

function showAlert(message) {
  if (!alertEl) return;
  alertEl.classList.remove("hidden");
  alertEl.classList.add("border-red-500/30", "bg-red-500/10", "text-red-300");
  alertEl.textContent = message;
}

function hideAlert() {
  if (!alertEl) return;
  alertEl.classList.add("hidden");
  alertEl.textContent = "";
}

function formatCurrency(value) {
  const n = Number(value);
  if (Number.isNaN(n)) return "-";
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0
  }).format(n);
}

function pct(value) {
  const n = Number(value);
  if (Number.isNaN(n)) return "0%";
  return `${n.toFixed(2)}%`;
}

function userName(user) {
  if (!user) return "-";
  const full = `${user?.names || ""} ${user?.last_names || ""}`.trim();
  return full || user?.email || "-";
}

function statusLabel(status) {
  const v = String(status || "").toLowerCase();
  if (v === "pending") return "Pending";
  if (v === "in_progress") return "In progress";
  if (v === "delivered") return "Delivered";
  if (v === "completed") return "Completed";
  if (v === "cancelled") return "Cancelled";
  return status || "-";
}

function statusClass(status) {
  const v = String(status || "").toLowerCase();
  if (v === "completed") return "text-emerald-400";
  if (v === "pending") return "text-amber-400";
  if (v === "cancelled") return "text-rose-400";
  if (v === "delivered") return "text-cyan-400";
  return "text-indigo-400";
}

function renderSkeletonRows(target, cols = 4, rows = 3) {
  if (!target) return;
  const rowHtml = Array.from({ length: rows })
    .map(() => {
      const colsHtml = Array.from({ length: cols })
        .map(() => '<td class="p-4"><div class="h-4 bg-slate-700/70 rounded animate-pulse"></div></td>')
        .join("");
      return `<tr class="border-t border-slate-800">${colsHtml}</tr>`;
    })
    .join("");
  target.innerHTML = rowHtml;
}

function animateBars(scopeEl) {
  if (!scopeEl) return;
  const bars = scopeEl.querySelectorAll("[data-target-width]");
  requestAnimationFrame(() => {
    bars.forEach((bar, index) => {
      const target = bar.getAttribute("data-target-width") || "0%";
      bar.style.width = "0%";
      bar.style.transition = `width 700ms ease ${index * 70}ms`;
      requestAnimationFrame(() => {
        bar.style.width = target;
      });
    });
  });
}

function renderStatusBars(statusCounts, totalOrders) {
  const total = Math.max(Number(totalOrders || 0), 1);

  statusBarsEl.innerHTML = Object.entries(STATUS_META)
    .map(([key, meta]) => {
      const count = Number(statusCounts?.[key] || 0);
      const width = Math.round((count / total) * 100);

      return `
        <div class="space-y-1">
          <div class="flex justify-between text-sm">
            <span class="text-slate-300">${meta.label}</span>
            <span class="text-slate-400">${count}</span>
          </div>
          <div class="h-2 rounded-full bg-slate-800 overflow-hidden">
            <div data-target-width="${width}%" class="h-2 ${meta.color} rounded-full" style="width:0%"></div>
          </div>
        </div>
      `;
    })
    .join("");

  animateBars(statusBarsEl);
}

function normalizeStatusCounts(statsPayload) {
  const raw = statsPayload?.orders?.by_status || statsPayload?.orders_by_status || {};
  return {
    pending: Number(raw?.pending || 0),
    in_progress: Number(raw?.in_progress || 0),
    delivered: Number(raw?.delivered || 0),
    completed: Number(raw?.completed || 0),
    cancelled: Number(raw?.cancelled || 0)
  };
}

async function fetchStats(range) {
  const res = await fetch(`${API_BASE}/api/admin/stats?range=${encodeURIComponent(range)}`, {
    headers: getAuthHeaders()
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

async function loadKpisAndCharts() {
  const selectedRange = rangeSelect?.value || "7d";

  const [todayStats, stats7d, stats30d, selectedStats] = await Promise.all([
    fetchStats("today"),
    fetchStats("7d"),
    fetchStats("30d"),
    fetchStats(selectedRange)
  ]);

  const kpis = selectedStats?.kpis || {};
  if (totalOrdersEl) totalOrdersEl.textContent = String(kpis.total_orders ?? 0);
  if (completionRateEl) completionRateEl.textContent = pct(kpis.completion_rate);
  if (cancellationRateEl) cancellationRateEl.textContent = pct(kpis.cancellation_rate);
  if (avgTicketEl) avgTicketEl.textContent = formatCurrency(kpis.avg_ticket);

  const selectedCounts = normalizeStatusCounts(selectedStats);
  renderStatusBars(selectedCounts, Number(kpis.total_orders || 0));

  const ranges = [
    { key: "today", label: "Hoy", value: Number(todayStats?.kpis?.total_orders || 0), color: "bg-indigo-500" },
    { key: "7d", label: "7 dias", value: Number(stats7d?.kpis?.total_orders || 0), color: "bg-cyan-500" },
    { key: "30d", label: "30 dias", value: Number(stats30d?.kpis?.total_orders || 0), color: "bg-emerald-500" }
  ];

  const max = Math.max(...ranges.map((r) => r.value), 1);

  rangeBarsEl.innerHTML = ranges
    .map((item) => {
      const width = Math.round((item.value / max) * 100);
      const selectedClass = item.key === selectedRange ? "ring-1 ring-indigo-400/60" : "";

      return `
        <div class="space-y-1 ${selectedClass} rounded-md p-1">
          <div class="flex justify-between text-sm">
            <span class="text-slate-300">${item.label}</span>
            <span class="text-slate-400">${item.value} ordenes</span>
          </div>
          <div class="h-2 rounded-full bg-slate-800 overflow-hidden">
            <div data-target-width="${width}%" class="h-2 ${item.color} rounded-full" style="width:0%"></div>
          </div>
        </div>
      `;
    })
    .join("");

  animateBars(rangeBarsEl);

  return selectedStats;
}

async function loadRecentOrders() {
  renderSkeletonRows(recentOrdersEl, 6, 3);

  const res = await fetch(`${API_BASE}/api/orders?page=1`, {
    headers: getAuthHeaders()
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);

  const payload = await res.json();
  const orders = Array.isArray(payload?.data) ? payload.data.slice(0, 6) : [];

  if (!orders.length) {
    recentOrdersEl.innerHTML = '<tr class="border-t border-slate-800"><td class="p-4 text-slate-400" colspan="6">No hay ordenes recientes.</td></tr>';
    return;
  }

  recentOrdersEl.innerHTML = orders
    .map((order) => {
      const customer = userName(order?.user);
      const freelancer = userName(order?.service?.freelancer_profile?.user);
      const service = order?.service?.title || "-";
      const amount = formatCurrency(order?.amount);
      const status = statusLabel(order?.status);
      return `
        <tr class="border-t border-slate-800 hover:bg-slate-800/40 transition">
          <td class="p-4 font-semibold">#${escapeHtml(order?.id)}</td>
          <td class="p-4">${escapeHtml(customer)}</td>
          <td class="p-4">${escapeHtml(freelancer)}</td>
          <td class="p-4">${escapeHtml(service)}</td>
          <td class="p-4 text-emerald-400">${escapeHtml(amount)}</td>
          <td class="p-4"><span class="${statusClass(order?.status)}">${escapeHtml(status)}</span></td>
        </tr>
      `;
    })
    .join("");
}

async function loadWorstServices() {
  renderSkeletonRows(worstServicesEl, 4, 3);

  const res = await fetch(`${API_BASE}/api/services?page=1`, {
    headers: getAuthHeaders()
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);

  const payload = await res.json();
  const services = Array.isArray(payload?.services)
    ? payload.services
    : Array.isArray(payload?.data)
      ? payload.data
      : [];

  const sorted = [...services]
    .sort((a, b) => Number(a?.avg_rating || 0) - Number(b?.avg_rating || 0))
    .slice(0, 6);

  if (!sorted.length) {
    worstServicesEl.innerHTML = '<tr class="border-t border-slate-800"><td class="p-4 text-slate-400" colspan="4">No hay servicios para mostrar.</td></tr>';
    return;
  }

  worstServicesEl.innerHTML = sorted
    .map((service) => {
      const title = service?.title || "-";
      const category = service?.category?.name || service?.category || "-";
      const rating = Number(service?.avg_rating || 0);
      const reviews = Number(service?.reviews_count || 0);

      return `
        <tr class="border-t border-slate-800 hover:bg-slate-800/40 transition">
          <td class="p-4 font-semibold">${escapeHtml(title)}</td>
          <td class="p-4">${escapeHtml(category)}</td>
          <td class="p-4 text-amber-400">★ ${reviews > 0 ? escapeHtml(rating.toFixed(1)) : "Sin calificacion"}</td>
          <td class="p-4">${escapeHtml(reviews)}</td>
        </tr>
      `;
    })
    .join("");
}

async function loadAlerts(statsPayload) {
  const blocks = [];

  const pending = Number(statsPayload?.orders?.by_status?.pending || statsPayload?.orders_by_status?.pending || 0);
  if (pending > 0) {
    blocks.push({
      tone: "amber",
      text: `${pending} orden(es) pendientes por seguimiento.`
    });
  }

  try {
    const res = await fetch(`${API_BASE}/api/admin/reviews/negative?days=30&max_rating=2&limit=3`, {
      headers: getAuthHeaders()
    });

    if (res.ok) {
      const payload = await res.json();
      const reviews = Array.isArray(payload?.reviews) ? payload.reviews : [];

      reviews.forEach((review) => {
        const service = review?.order?.service?.title || "Servicio";
        blocks.push({
          tone: "red",
          text: `Review ${review?.rating || "-"}★ en ${service}.`
        });
      });
    }
  } catch (error) {
    console.error("Error cargando alertas de reviews:", error);
  }

  if (!blocks.length) {
    blocks.push({ tone: "green", text: "Sin alertas criticas en este momento." });
  }

  alertsEl.innerHTML = blocks
    .slice(0, 6)
    .map((item) => {
      const toneClass = item.tone === "red"
        ? "border-red-500/30 text-red-300"
        : item.tone === "amber"
          ? "border-amber-500/30 text-amber-300"
          : "border-emerald-500/30 text-emerald-300";

      return `<div class="bg-slate-900 border ${toneClass} p-4 rounded-xl">${escapeHtml(item.text)}</div>`;
    })
    .join("");
}

async function loadReports() {
  try {
    hideAlert();
    renderSkeletonRows(recentOrdersEl, 6, 3);
    renderSkeletonRows(worstServicesEl, 4, 3);

    const statsPayload = await loadKpisAndCharts();
    await Promise.all([loadRecentOrders(), loadWorstServices()]);
    await loadAlerts(statsPayload);
  } catch (error) {
    console.error("Error cargando reportes:", error);
    showAlert("No se pudieron cargar los reportes. Verifica sesion y permisos de admin.");
  }
}

rangeSelect?.addEventListener("change", loadReports);

loadReports();
