(() => {
  if (window.appToast && window.appConfirm) return;

  const TOAST_CONTAINER_PREFIX = "app-toast-container";
  const CONFIRM_ID = "app-confirm-overlay";

  function toastContainerClasses(position) {
    if (position === "top-center") {
      return "fixed top-5 left-1/2 -translate-x-1/2 z-[130] flex w-[min(92vw,420px)] flex-col gap-3 pointer-events-none";
    }
    return "fixed top-5 right-5 z-[130] flex w-[min(92vw,360px)] flex-col gap-3 pointer-events-none";
  }

  function ensureToastContainer(position = "top-right") {
    const id = `${TOAST_CONTAINER_PREFIX}-${position}`;
    let container = document.getElementById(id);
    if (container) return container;

    container = document.createElement("div");
    container.id = id;
    container.className = toastContainerClasses(position);
    document.body.appendChild(container);
    return container;
  }

  function toastToneClasses(tone) {
    if (tone === "success") return "border-emerald-500/50 bg-emerald-900/80 text-emerald-100";
    if (tone === "error") return "border-rose-500/50 bg-rose-900/80 text-rose-100";
    if (tone === "warning") return "border-amber-500/50 bg-amber-900/80 text-amber-100";
    return "border-indigo-500/50 bg-slate-900/95 text-slate-100";
  }

  window.appToast = function appToast(message, options = {}) {
    const text = String(message || "").trim();
    if (!text) return;

    const tone = options.tone || "info";
    const duration = Number.isFinite(options.duration) ? options.duration : 3200;
    const position = options.position || "top-right";

    const container = ensureToastContainer(position);
    const item = document.createElement("div");
    item.className = `pointer-events-auto rounded-xl border px-4 py-3 text-sm shadow-xl backdrop-blur transition-all duration-200 opacity-0 translate-y-2 ${toastToneClasses(tone)}`;
    item.textContent = text;

    container.appendChild(item);
    requestAnimationFrame(() => {
      item.classList.remove("opacity-0", "translate-y-2");
      item.classList.add("opacity-100", "translate-y-0");
    });

    const remove = () => {
      item.classList.remove("opacity-100", "translate-y-0");
      item.classList.add("opacity-0", "translate-y-2");
      setTimeout(() => item.remove(), 200);
    };

    setTimeout(remove, Math.max(1200, duration));
  };

  function ensureConfirmModal() {
    let overlay = document.getElementById(CONFIRM_ID);
    if (overlay) return overlay;

    overlay = document.createElement("div");
    overlay.id = CONFIRM_ID;
    overlay.className = "fixed inset-0 z-[140] hidden items-center justify-center bg-slate-950/75 px-4 opacity-0 transition-opacity duration-200";
    overlay.innerHTML = `
      <div id="app-confirm-panel" class="w-full max-w-md rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-2xl transition-all duration-200 ease-out opacity-0 scale-95 translate-y-1">
        <h3 id="app-confirm-title" class="text-lg font-bold text-white">Confirmar accion</h3>
        <p id="app-confirm-message" class="mt-2 text-sm text-slate-300"></p>
        <div class="mt-6 flex flex-wrap justify-end gap-2">
          <button id="app-confirm-cancel" type="button" class="px-4 py-2 rounded-lg border border-slate-600 text-slate-200 hover:bg-slate-800 transition">Cancelar</button>
          <button id="app-confirm-ok" type="button" class="px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-500 transition">Confirmar</button>
        </div>
      </div>
    `;

    overlay.addEventListener("click", (event) => {
      if (event.target === overlay && typeof overlay._resolve === "function") {
        overlay._resolve(false);
      }
    });

    document.body.appendChild(overlay);
    return overlay;
  }

  function setConfirmOpenState(isOpen) {
    const overlay = document.getElementById(CONFIRM_ID);
    const panel = document.getElementById("app-confirm-panel");
    if (!overlay || !panel) return;

    if (isOpen) {
      overlay.classList.remove("opacity-0");
      overlay.classList.add("opacity-100");
      panel.classList.remove("opacity-0", "scale-95", "translate-y-1");
      panel.classList.add("opacity-100", "scale-100", "translate-y-0");
      return;
    }

    overlay.classList.remove("opacity-100");
    overlay.classList.add("opacity-0");
    panel.classList.remove("opacity-100", "scale-100", "translate-y-0");
    panel.classList.add("opacity-0", "scale-95", "translate-y-1");
  }

  window.appConfirm = function appConfirm(options = {}) {
    const overlay = ensureConfirmModal();
    const titleEl = document.getElementById("app-confirm-title");
    const messageEl = document.getElementById("app-confirm-message");
    const cancelBtn = document.getElementById("app-confirm-cancel");
    const okBtn = document.getElementById("app-confirm-ok");

    const title = options.title || "Confirmar accion";
    const message = options.message || "Deseas continuar?";
    const confirmText = options.confirmText || "Confirmar";
    const cancelText = options.cancelText || "Cancelar";
    const tone = options.tone || "primary";

    if (titleEl) titleEl.textContent = title;
    if (messageEl) messageEl.textContent = message;
    if (okBtn) {
      okBtn.textContent = confirmText;
      okBtn.classList.remove("bg-indigo-600", "hover:bg-indigo-500", "bg-rose-600", "hover:bg-rose-500", "bg-amber-600", "hover:bg-amber-500");
      if (tone === "danger") {
        okBtn.classList.add("bg-rose-600", "hover:bg-rose-500");
      } else if (tone === "warning") {
        okBtn.classList.add("bg-amber-600", "hover:bg-amber-500");
      } else {
        okBtn.classList.add("bg-indigo-600", "hover:bg-indigo-500");
      }
    }
    if (cancelBtn) cancelBtn.textContent = cancelText;

    return new Promise((resolve) => {
      overlay._resolve = (value) => {
        setConfirmOpenState(false);
        setTimeout(() => {
          overlay.classList.add("hidden");
          overlay.classList.remove("flex");
          overlay._resolve = null;
          resolve(Boolean(value));
        }, 200);
      };

      if (okBtn) okBtn.onclick = () => overlay._resolve(true);
      if (cancelBtn) cancelBtn.onclick = () => overlay._resolve(false);

      overlay.classList.remove("hidden");
      overlay.classList.add("flex");
      requestAnimationFrame(() => setConfirmOpenState(true));
    });
  };
})();

