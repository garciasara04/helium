const API_BASE = "http://127.0.0.1:8000";

const HEALTH_STATUS_META = {
  pending: { label: "Pendiente", color: "bg-yellow-500" },
  in_progress: { label: "En progreso", color: "bg-blue-500" },
  delivered: { label: "Entregado", color: "bg-purple-500" },
  completed: { label: "Completado", color: "bg-green-500" },
  cancelled: { label: "Cancelado", color: "bg-red-500" }
};

const RANGE_TO_API = {
  1: "today",
  7: "7d",
  30: "30d"
};

const RANGE_LABEL = {
  today: "Hoy",
  "7d": "7 dias",
  "30d": "30 dias"
};

const healthCache = {};
const dashboardSummaryCache = {};

function prefersReducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function revealElement(el, delay = 0) {
  if (!el) return;
  if (prefersReducedMotion()) {
    el.classList.add("is-visible");
    return;
  }
  el.style.transitionDelay = `${delay}ms`;
  requestAnimationFrame(() => {
    el.classList.add("is-visible");
  });
}

function animateBarsIn(root) {
  if (!root || prefersReducedMotion()) return;
  const bars = root.querySelectorAll("[data-bar-width]");
  bars.forEach((bar, idx) => {
    const target = bar.getAttribute("data-bar-width") || "0%";
    bar.style.width = "0%";
    bar.style.transition = `width 700ms ease ${idx * 60}ms`;
    requestAnimationFrame(() => {
      bar.style.width = target;
    });
  });
}

function animateDynamicCards(container, selector) {
  if (!container) return;
  const items = container.querySelectorAll(selector);
  items.forEach((item, idx) => {
    item.classList.add("reveal-item");
    revealElement(item, idx * 70);
  });
}

function initEntryAnimations() {
  const simpleTargets = document.querySelectorAll("[data-reveal]");
  const observer = new IntersectionObserver((entries, obs) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      revealElement(entry.target, 0);
      obs.unobserve(entry.target);
    });
  }, { threshold: 0.12 });

  simpleTargets.forEach((el) => observer.observe(el));

  const staggerGroups = document.querySelectorAll("[data-reveal-stagger]");
  const staggerObserver = new IntersectionObserver((entries, obs) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      const items = entry.target.querySelectorAll("[data-reveal-item]");
      items.forEach((item, idx) => revealElement(item, idx * 65));
      obs.unobserve(entry.target);
    });
  }, { threshold: 0.08 });

  staggerGroups.forEach((group) => staggerObserver.observe(group));
}

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

function buildStorageUrl(path) {
  if (!path) return "";
  if (/^https?:\/\//i.test(path)) return path;
  if (path.startsWith("/storage/")) return `${API_BASE}${path}`;
  return `${API_BASE}/storage/${path}`;
}

function setStat(id, value) {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = Number.isFinite(Number(value)) ? String(value) : "--";
}

function formatPercent(value) {
  const num = Number(value);
  if (!Number.isFinite(num)) return "0%";
  return `${num.toFixed(1)}%`;
}

function formatCurrency(value) {
  const num = Number(value);
  if (!Number.isFinite(num)) return "$0";
  return num.toLocaleString("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0
  });
}

function formatShortDate(value) {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleDateString("es-CO", { day: "2-digit", month: "short", year: "numeric" });
}

function setRangeButtonState(days) {
  const buttons = document.querySelectorAll(".health-range-btn");
  buttons.forEach((btn) => {
    const active = Number(btn.dataset.range) === days;
    if (active) {
      btn.classList.remove("bg-slate-800", "text-slate-300", "border-slate-700");
      btn.classList.add("bg-purple-700", "text-white", "border-purple-600");
      return;
    }

    btn.classList.remove("bg-purple-700", "text-white", "border-purple-600");
    btn.classList.add("bg-slate-800", "text-slate-300", "border-slate-700");
  });
}

function normalizeStatusCounts(raw) {
  const out = {
    pending: 0,
    in_progress: 0,
    delivered: 0,
    completed: 0,
    cancelled: 0
  };

  Object.keys(out).forEach((key) => {
    const n = Number(raw?.[key] ?? 0);
    out[key] = Number.isFinite(n) ? n : 0;
  });

  return out;
}

function renderStatusDistribution(statusCounts, total) {
  const listEl = document.getElementById("health-status-list");
  if (!listEl) return;

  const html = Object.keys(HEALTH_STATUS_META).map((status) => {
    const meta = HEALTH_STATUS_META[status];
    const count = Number(statusCounts?.[status] || 0);
    const pct = total > 0 ? (count / total) * 100 : 0;

    return `
      <div>
        <div class="flex items-center justify-between text-sm mb-1">
          <span class="text-slate-300">${meta.label}</span>
          <span class="text-slate-400">${count} (${pct.toFixed(1)}%)</span>
        </div>
        <div class="h-2 rounded-full bg-slate-700 overflow-hidden">
          <div class="h-2 ${meta.color}" data-bar-width="${pct}%" style="width:0%"></div>
        </div>
      </div>
    `;
  }).join("");

  listEl.innerHTML = html;
  animateBarsIn(listEl);
}

function renderHealthAlerts({ cancellationRate, pendingCount, totalOrders }) {
  const el = document.getElementById("health-alerts");
  if (!el) return;

  const alerts = [];

  if (cancellationRate >= 15) {
    alerts.push({ color: "text-red-400", title: "Cancelaciones altas", desc: `${formatPercent(cancellationRate)} del periodo` });
  } else if (cancellationRate >= 8) {
    alerts.push({ color: "text-yellow-400", title: "Cancelaciones en observacion", desc: `${formatPercent(cancellationRate)} del periodo` });
  } else {
    alerts.push({ color: "text-green-400", title: "Cancelaciones estables", desc: `${formatPercent(cancellationRate)} del periodo` });
  }

  if (pendingCount > 0) {
    alerts.push({ color: "text-yellow-400", title: "Ordenes pendientes", desc: `${pendingCount} orden(es) pendientes` });
  } else {
    alerts.push({ color: "text-green-400", title: "Sin pendientes", desc: "No hay ordenes pendientes" });
  }

  if (totalOrders === 0) {
    alerts.push({ color: "text-slate-300", title: "Sin actividad", desc: "No hay ordenes en este rango" });
  }

  el.innerHTML = alerts.map((a) => `
    <div class="border border-slate-700 rounded-lg p-3 bg-slate-900/60 reveal-item dyn-alert-card">
      <p class="font-semibold ${a.color}">${a.title}</p>
      <p class="text-slate-400 text-sm mt-1">${a.desc}</p>
    </div>
  `).join("");

  animateDynamicCards(el, ".dyn-alert-card");
}

async function fetchAdminStats(range) {
  if (healthCache[range]) return healthCache[range];

  const res = await fetch(`${API_BASE}/api/admin/stats?range=${range}`, {
    headers: getAuthHeaders()
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);

  const payload = await res.json();
  healthCache[range] = payload;
  return payload;
}
async function fetchDashboardSummary(range) {
  if (dashboardSummaryCache[range]) return dashboardSummaryCache[range];

  const params = new URLSearchParams({
    range,
    worst_limit: "4",
    negative_days: "30",
    negative_max_rating: "2",
    negative_limit: "20"
  });

  const res = await fetch(`${API_BASE}/api/admin/dashboard-summary?${params.toString()}`, {
    headers: getAuthHeaders()
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);

  const payload = await res.json();
  dashboardSummaryCache[range] = payload;
  return payload;
}

function getStatsFromPayload(payload) {
  const kpis = payload?.kpis || {};
  const statusCounts = normalizeStatusCounts(payload?.orders?.by_status || payload?.orders_by_status || {});

  const totalOrders = Number(kpis.total_orders ?? payload?.orders?.total ?? 0);
  const completionRate = Number(kpis.completion_rate ?? 0);
  const cancellationRate = Number(kpis.cancellation_rate ?? 0);
  const avgTicket = Number(kpis.avg_ticket ?? 0);

  return {
    totalOrders: Number.isFinite(totalOrders) ? totalOrders : 0,
    completionRate: Number.isFinite(completionRate) ? completionRate : 0,
    cancellationRate: Number.isFinite(cancellationRate) ? cancellationRate : 0,
    avgTicket: Number.isFinite(avgTicket) ? avgTicket : 0,
    statusCounts,
    pendingCount: Number(statusCounts.pending || 0)
  };
}

function renderRangeComparisonChart(currentRange) {
  const chartEl = document.getElementById("health-range-chart");
  if (!chartEl) return;

  const ranges = ["today", "7d", "30d"];
  const cards = ranges.map((range) => {
    const stats = getStatsFromPayload(healthCache[range] || {});
    const isActive = range === currentRange;

    const totalBar = Math.min(100, stats.totalOrders * 5);
    const completionBar = Math.max(0, Math.min(100, stats.completionRate));
    const cancelBar = Math.max(0, Math.min(100, stats.cancellationRate));

    return `
      <div class="rounded-xl border ${isActive ? "border-purple-500" : "border-slate-700"} bg-slate-900/60 p-4 dyn-range-card reveal-item">
        <p class="text-white font-semibold mb-3">${RANGE_LABEL[range]}</p>

        <div class="mb-3">
          <div class="flex justify-between text-xs text-slate-400 mb-1"><span>Total ordenes</span><span>${stats.totalOrders}</span></div>
          <div class="h-2 bg-slate-700 rounded-full overflow-hidden"><div class="h-2 bg-indigo-400" data-bar-width="${totalBar}%" style="width:0%"></div></div>
        </div>

        <div class="mb-3">
          <div class="flex justify-between text-xs text-slate-400 mb-1"><span>Finalizacion</span><span>${formatPercent(stats.completionRate)}</span></div>
          <div class="h-2 bg-slate-700 rounded-full overflow-hidden"><div class="h-2 bg-green-500" data-bar-width="${completionBar}%" style="width:0%"></div></div>
        </div>

        <div>
          <div class="flex justify-between text-xs text-slate-400 mb-1"><span>Cancelacion</span><span>${formatPercent(stats.cancellationRate)}</span></div>
          <div class="h-2 bg-slate-700 rounded-full overflow-hidden"><div class="h-2 bg-red-500" data-bar-width="${cancelBar}%" style="width:0%"></div></div>
        </div>
      </div>
    `;
  }).join("");

  chartEl.innerHTML = cards;
  animateDynamicCards(chartEl, ".dyn-range-card");
  animateBarsIn(chartEl);
}

async function loadHealthModule(days = 7, options = {}) {
  try {
    setRangeButtonState(days);
    const range = RANGE_TO_API[days] || "7d";

    let payload = options.summaryPayload || null;
    if (!payload) {
      payload = await fetchAdminStats(range);
    } else {
      healthCache[range] = payload;
    }

    const stats = getStatsFromPayload(payload);

    const totalEl = document.getElementById("health-total-orders");
    const completionEl = document.getElementById("health-completion-rate");
    const cancelEl = document.getElementById("health-cancel-rate");
    const avgTicketEl = document.getElementById("health-avg-ticket");

    if (totalEl) totalEl.textContent = String(stats.totalOrders);
    if (completionEl) completionEl.textContent = formatPercent(stats.completionRate);
    if (cancelEl) cancelEl.textContent = formatPercent(stats.cancellationRate);
    if (avgTicketEl) avgTicketEl.textContent = formatCurrency(stats.avgTicket);

    renderStatusDistribution(stats.statusCounts, stats.totalOrders);
    renderHealthAlerts({
      cancellationRate: stats.cancellationRate,
      pendingCount: stats.pendingCount,
      totalOrders: stats.totalOrders
    });

    setStat("stat-ordenes", stats.totalOrders);

    await Promise.all([
      fetchAdminStats("today"),
      fetchAdminStats("7d"),
      fetchAdminStats("30d")
    ]);
    renderRangeComparisonChart(range);
  } catch (err) {
    console.error("Error cargando salud del negocio:", err);
  }
}

async function loadActiveCounts() {
  try {
    const res = await fetch(`${API_BASE}/api/metrics/active-counts`, {
      headers: getAuthHeaders()
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const data = await res.json();
    const counts = data?.active_counts || {};

    setStat("stat-clientes", counts.clients ?? 0);
    setStat("stat-freelancers", counts.freelancers ?? 0);
    setStat("stat-empresas", counts.companies ?? 0);
  } catch (err) {
    console.error("Error cargando metricas activas:", err);
  }
}

async function loadServiceStats() {
  try {
    const res = await fetch(`${API_BASE}/api/services`, {
      headers: { Accept: "application/json" }
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const payload = await res.json();
    const services = Array.isArray(payload)
      ? payload
      : (payload?.services || payload?.data || []);

    const total = Number(payload?.pagination?.total ?? payload?.total ?? services.length ?? 0);
    setStat("stat-servicios", total);

    const reviewsCount = services.reduce((acc, s) => acc + Number(s?.reviews_count || 0), 0);
    setStat("stat-reviews", reviewsCount);
  } catch (err) {
    console.error("Error cargando metricas de servicios:", err);
  }
}

function resolveServiceRating(service) {
  const value = Number(
    service?.avg_service_rating
    ?? service?.avg_rating
    ?? service?.rating_avg
    ?? service?.reviews_avg_rating
    ?? service?.rating
    ?? 0
  );
  return Number.isFinite(value) ? value : 0;
}

function resolveServiceReviewsCount(service) {
  const value = Number(
    service?.reviews_count
    ?? service?.total_reviews
    ?? service?.reviewsCount
    ?? 0
  );
  return Number.isFinite(value) ? value : 0;
}
function buildWorstServiceCard(service) {
  const title = service?.title || "Servicio";
  const freelancer = service?.freelancer?.name || service?.freelancer_name || "Freelancer";
  const rating = resolveServiceRating(service);
  const reviewsCount = resolveServiceReviewsCount(service);
  const image = buildStorageUrl(service?.photo || service?.image || service?.image_url) || "/image.png";

  return `
    <div class="bg-slate-900 rounded-xl overflow-hidden border border-red-500/30 hover:border-red-500 transition reveal-item dyn-worst-card">
      <img src="${escapeHtml(image)}" class="w-full h-44 object-cover" alt="${escapeHtml(title)}" loading="lazy" />
      <div class="p-4">
        <h3 class="text-white font-bold text-sm mb-1">${escapeHtml(title)}</h3>
        <p class="text-slate-400 text-sm">${escapeHtml(freelancer)}</p>
        <div class="flex justify-between items-center mt-3">
          <span class="text-red-400 font-bold">★ ${rating.toFixed(1)}</span>
          <span class="text-slate-500 text-xs">${reviewsCount} reviews</span>
        </div>
        <a href="/dashboard/admin/servicios" class="block text-center mt-4 text-purple-400 hover:underline text-sm">Revisar servicio</a>
      </div>
    </div>
  `;
}
function renderWorstRatedServicesList(container, services) {
  const ranked = services
    .map((service) => ({
      service,
      rating: resolveServiceRating(service),
      reviewsCount: resolveServiceReviewsCount(service)
    }))
    .filter((item) => Number.isFinite(item.rating) && item.rating > 0 && item.reviewsCount > 0)
    .sort((a, b) => {
      if (a.rating !== b.rating) return a.rating - b.rating;
      return b.reviewsCount - a.reviewsCount;
    })
    .slice(0, 4)
    .map((item) => item.service);

  if (!ranked.length) {
    container.innerHTML = '<div class="col-span-full text-slate-400">No hay servicios con puntuacion registrada.</div>';
    return;
  }

  container.innerHTML = ranked.map(buildWorstServiceCard).join("");
  animateDynamicCards(container, ".dyn-worst-card");
}

async function loadWorstRatedServices(options = {}) {
  const container = document.getElementById("worstRatedServices");
  if (!container) return;

  try {
    let services = Array.isArray(options?.summaryPayload?.worst_rated_services)
      ? options.summaryPayload.worst_rated_services
      : null;

    if (!services) {
      const res = await fetch(`${API_BASE}/api/admin/services/worst-rated?limit=4`, {
        headers: getAuthHeaders()
      });

      if (res.ok) {
        const payload = await res.json();
        services = Array.isArray(payload) ? payload : (payload?.data || payload?.services || []);
        console.log("admin-dashboard worst-rated payload:", payload);
        console.log("admin-dashboard worst-rated first item:", services?.[0]);
      } else {
        const fallbackRes = await fetch(`${API_BASE}/api/services`, {
          headers: { Accept: "application/json" }
        });
        if (!fallbackRes.ok) throw new Error(`HTTP ${fallbackRes.status}`);

        const fallbackPayload = await fallbackRes.json();
        services = Array.isArray(fallbackPayload)
          ? fallbackPayload
          : (fallbackPayload?.services || fallbackPayload?.data || []);
      }
    }

    renderWorstRatedServicesList(container, services || []);
  } catch (err) {
    console.error("Error cargando servicios con peor puntuacion:", err);
    container.innerHTML = '<div class="col-span-full text-slate-400">No se pudieron cargar los servicios.</div>';
  }
}

function bindHealthRangeButtons() {
  const buttons = document.querySelectorAll(".health-range-btn");
  buttons.forEach((btn) => {
    btn.addEventListener("click", async () => {
      const days = Number(btn.dataset.range || 7);
      const range = RANGE_TO_API[days] || "7d";

      try {
        const summary = await fetchDashboardSummary(range);
        await loadHealthModule(days, { summaryPayload: summary });
      } catch {
        await loadHealthModule(days);
      }
    });
  });
}

function resolveReviewRating(review) {
  const direct = Number(review?.rating ?? review?.score);
  if (Number.isFinite(direct)) return direct;
  return null;
}

function resolveReviewDate(review) {
  return review?.created_at || review?.updated_at || review?.date || "";
}

function buildNegativeReviewCard(review) {
  const rating = resolveReviewRating(review);
  const comment = review?.comment || review?.text || "Sin comentario.";
  const service = review?.order?.service?.title || review?.service?.title || "Servicio";
  const date = formatShortDate(resolveReviewDate(review));

  return `
    <div class="bg-slate-900 border border-red-500/30 p-6 rounded-xl reveal-item dyn-negative-card">
      <p class="text-red-400 font-bold mb-2">★ ${Number.isFinite(rating) ? rating.toFixed(1) : "-"}</p>
      <p class="text-slate-300 text-sm mb-3">"${escapeHtml(comment)}"</p>
      <p class="text-slate-400 text-xs">Servicio: ${escapeHtml(service)} · ${date}</p>
      <a href="/dashboard/admin/reviews" class="text-purple-400 hover:underline text-sm mt-3 inline-block">Revisar review</a>
    </div>
  `;
}
function renderNegativeRecentReviewsList(container, reviews) {
  const negatives = reviews
    .map((review) => ({ review, rating: resolveReviewRating(review) }))
    .filter((item) => Number.isFinite(item.rating) && item.rating >= 1 && item.rating <= 2)
    .sort((a, b) => {
      const da = new Date(resolveReviewDate(a.review)).getTime();
      const db = new Date(resolveReviewDate(b.review)).getTime();
      return db - da;
    })
    .slice(0, 3)
    .map((item) => item.review);

  if (!negatives.length) {
    container.innerHTML = '<div class="text-slate-400">No hay reviews negativas recientes.</div>';
    return;
  }

  container.innerHTML = negatives.map(buildNegativeReviewCard).join("");
  animateDynamicCards(container, ".dyn-negative-card");
}

async function loadNegativeRecentReviews(options = {}) {
  const container = document.getElementById("negativeRecentReviews");
  if (!container) return;

  try {
    let reviews = Array.isArray(options?.summaryPayload?.negative_reviews_recent)
      ? options.summaryPayload.negative_reviews_recent
      : null;

    if (!reviews) {
      const res = await fetch(`${API_BASE}/api/admin/reviews/negative?days=30&max_rating=2&limit=20`, {
        headers: getAuthHeaders()
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const payload = await res.json();
      reviews = Array.isArray(payload?.reviews) ? payload.reviews : [];
    }

    renderNegativeRecentReviewsList(container, reviews || []);
  } catch (err) {
    console.error("Error cargando reviews negativas:", err);
    container.innerHTML = '<div class="text-slate-400">No se pudieron cargar las reviews.</div>';
  }
}

function revealDashboardContent() {
  const loader = document.getElementById("adminDashBoot");
  const content = document.getElementById("adminDashContent");

  if (content) {
    content.classList.remove("pointer-events-none");
    requestAnimationFrame(() => {
      content.classList.add("opacity-100");
    });
  }

  if (loader) {
    loader.classList.add("opacity-0", "-translate-y-1", "pointer-events-none");
    setTimeout(() => {
      loader.remove();
    }, 520);
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function initAdminDashboard() {
  const startedAt = performance.now();
  bindHealthRangeButtons();

  const defaultRange = "7d";
  let summary = null;

  try {
    summary = await fetchDashboardSummary(defaultRange);
    healthCache[defaultRange] = summary;
  } catch (err) {
    console.error("No se pudo cargar dashboard-summary, usando fallback:", err);
  }

  const tasks = [
    loadActiveCounts(),
    loadServiceStats(),
    loadHealthModule(7, { summaryPayload: summary || undefined }),
    loadWorstRatedServices({ summaryPayload: summary || undefined }),
    loadNegativeRecentReviews({ summaryPayload: summary || undefined })
  ];

  await Promise.allSettled(tasks);

  const elapsed = performance.now() - startedAt;
  const minLoaderMs = 650;
  if (elapsed < minLoaderMs) {
    await sleep(minLoaderMs - elapsed);
  }

  revealDashboardContent();
  initEntryAnimations();
}

initAdminDashboard();









