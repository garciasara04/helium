const API_BASE = "http://127.0.0.1:8000";

const listEl = document.getElementById("reviewsList");
const emptyEl = document.getElementById("reviewsEmpty");
const loadingEl = document.getElementById("reviewsLoading");

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function buildCard(order, highlight) {
  const reviewed = order?.review_exists === true;
  const freelancerName = order?.freelancer?.user?.name || order?.freelancer_name || "Freelancer";
  const serviceName = order?.service?.title || order?.service?.name || "Servicio";
  const imageUrl = order?.freelancer?.profile_photo_url || order?.freelancer?.photo || "";

  const disabledAttr = reviewed ? 'disabled="disabled"' : "";
  const disabledClass = reviewed ? "opacity-70" : "";
  const statusBadge = reviewed
    ? '<p class="text-emerald-400 text-sm font-semibold">Resena enviada</p>'
    : "";

  return `
    <form class="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4 ${highlight ? "ring-2 ring-violet-500" : ""} ${disabledClass}" data-order-id="${escapeHtml(order.id)}">
      <div class="flex items-center gap-4">
        <img src="${escapeHtml(imageUrl || "https://via.placeholder.com/300")}" class="w-12 h-12 rounded-full object-cover"/>
        <div>
          <h3 class="font-semibold text-white">${escapeHtml(freelancerName)}</h3>
          <p class="text-sm text-slate-400">${escapeHtml(serviceName)}</p>
        </div>
      </div>

      <div>
        <label class="text-sm text-slate-400 mb-2 block">Calificacion</label>
        <select name="rating" ${disabledAttr} class="w-full bg-slate-800 border border-slate-700 p-3 rounded-lg text-yellow-400">
          <option value="5">5 - Excelente</option>
          <option value="4">4 - Muy bueno</option>
          <option value="3">3 - Bueno</option>
          <option value="2">2 - Regular</option>
          <option value="1">1 - Malo</option>
        </select>
      </div>

      <div>
        <label class="text-sm text-slate-400 mb-2 block">Comentario</label>
        <textarea ${disabledAttr}
          name="comment"
          placeholder="Escribe tu opinion sobre el servicio..."
          class="w-full bg-slate-800 border border-slate-700 rounded-lg p-3 text-sm focus:outline-none focus:border-violet-500"
        ></textarea>
      </div>

      ${statusBadge}

      <button type="submit" ${disabledAttr} class="w-full bg-violet-600 hover:bg-violet-500 transition rounded-lg py-2 font-semibold">
        ${reviewed ? "Resena enviada" : "Enviar resena"}
      </button>
    </form>
  `;
}

async function fetchOrders() {
  const token = localStorage.getItem("token");
  if (!token) {
    loadingEl?.classList.add("hidden");
    emptyEl?.classList.remove("hidden");
    emptyEl.textContent = "No hay sesion activa. Inicia sesion para calificar.";
    return;
  }

  try {
    const res = await fetch(`${API_BASE}/api/orders`, {
      headers: {
        "Accept": "application/json",
        "Authorization": `Bearer ${token}`
      }
    });

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }

    const data = await res.json();
    const orders = Array.isArray(data) ? data : (data?.data || []);
    const completed = orders.filter(o => o?.status === "completed");

    loadingEl?.classList.add("hidden");

    if (!completed.length) {
      emptyEl?.classList.remove("hidden");
      return;
    }

    const params = new URLSearchParams(window.location.search);
    const focusId = params.get("order_id");

    listEl.innerHTML = completed
      .map(o => buildCard(o, focusId && String(o.id) === String(focusId)))
      .join("");

    if (focusId) {
      const focusEl = listEl.querySelector(`[data-order-id="${CSS.escape(focusId)}"]`);
      focusEl?.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  } catch (err) {
    loadingEl?.classList.add("hidden");
    emptyEl?.classList.remove("hidden");
    emptyEl.textContent = "Error al cargar servicios.";
    console.error(err);
  }
}

async function submitReview(form) {
  const orderId = form.getAttribute("data-order-id");
  if (form.querySelector("button")?.disabled) {
    window.appToast("Solo se puede resenar una vez.", { tone: "warning" });
    return;
  }
  if (!orderId) return;

  const token = localStorage.getItem("token");
  if (!token) {
    window.appToast("No hay sesion activa.", { tone: "warning" });
    return;
  }

  const rating = Number(form.rating.value);
  const comment = form.comment.value || "";

  try {
    const res = await fetch(`${API_BASE}/api/orders/${orderId}/review`, {
      method: "POST",
      headers: {
        "Accept": "application/json",
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify({ rating, comment })
    });

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }

    window.appToast("Resena enviada.", { tone: "success" });

    form.querySelectorAll("input, select, textarea, button").forEach(el => {
      el.setAttribute("disabled", "disabled");
    });

    const status = document.createElement("p");
    status.className = "text-emerald-400 text-sm font-semibold";
    status.textContent = "Resena enviada";
    form.appendChild(status);
  } catch (err) {
    console.error(err);
    if (err?.message?.includes("409") || err?.message?.includes("422")) {
      window.appToast("Solo se puede resenar una vez.", { tone: "warning" });
    } else {
      window.appToast("No se pudo enviar la resena.", { tone: "error" });
    }
  }
}

document.addEventListener("submit", (event) => {
  const target = event.target;
  if (!(target instanceof HTMLFormElement)) return;
  if (target.matches("form[data-order-id]")) {
    event.preventDefault();
    submitReview(target);
  }
});

fetchOrders();

