document.addEventListener("DOMContentLoaded", () => {
  const btnRegister = document.getElementById("btn-register");
  const btnLogin = document.getElementById("btn-login");

  const token = localStorage.getItem("token");

  // Si ya está logueado, redirige
  if (token) {
    window.location.href = "/dashboard";
    return;
  }

  btnRegister?.addEventListener("click", (e) => {
    e.preventDefault();
    window.location.href = "/Register";
  });

  btnLogin?.addEventListener("click", (e) => {
    e.preventDefault();
    window.location.href = "/Login";
  });
});