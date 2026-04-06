const API_BASE = "http://127.0.0.1:8000";

const loadingEl = document.getElementById("companyProfileLoading");
const emptyEl = document.getElementById("companyProfileEmpty");
const contentEl = document.getElementById("companyProfileContent");

const avatarEl = document.getElementById("companyAvatar");
const nameEl = document.getElementById("companyName");
const emailEl = document.getElementById("companyEmail");
const phoneEl = document.getElementById("companyPhone");
const websiteEl = document.getElementById("companyWebsite");
const addressEl = document.getElementById("companyAddress");

function buildStorageUrl(path) {
  if (!path) return "";
  if (/^https?:\/\//i.test(path)) return path;
  if (path.startsWith("/storage/")) return `${API_BASE}${path}`;
  return `${API_BASE}/storage/${path}`;
}

function setText(el, value, fallback = "-") {
  if (!el) return;
  el.textContent = value || fallback;
}

async function loadCompanyProfile() {
  const token = localStorage.getItem("token");
  if (!token) {
    window.location.href = "/login";
    return;
  }

  try {
    const response = await fetch(`${API_BASE}/api/profile`, {
      method: "GET",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const profile = await response.json();
    const company = profile?.company || {};

    setText(nameEl, company?.name || [profile?.names, profile?.last_names].filter(Boolean).join(" "), "Empresa");
    setText(emailEl, profile?.email, "-");
    setText(phoneEl, profile?.phone || company?.phone, "-");
    setText(websiteEl, company?.website, "-");
    setText(addressEl, company?.address, "-");

    const avatar = buildStorageUrl(profile?.photo) || buildStorageUrl(company?.photo) || "/logo.jpeg";
    if (avatarEl) avatarEl.src = avatar;

    loadingEl?.classList.add("hidden");
    emptyEl?.classList.add("hidden");
    contentEl?.classList.remove("hidden");
  } catch (error) {
    console.error(error);
    loadingEl?.classList.add("hidden");
    contentEl?.classList.add("hidden");
    emptyEl?.classList.remove("hidden");
    window.appToast?.("No se pudo cargar el perfil de la empresa.", { tone: "error" });
  }
}

loadCompanyProfile();
