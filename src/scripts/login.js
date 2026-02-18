document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('loginForm');
  const emailInput = document.getElementById('email');
  const passwordInput = document.getElementById('password');

  // Crear un contenedor de errores dinámico para cada campo
  function createErrorMessage(input, message) {
    let existing = input.nextElementSibling;
    if (existing && existing.classList.contains('error-message')) {
      existing.remove();
    }

    const p = document.createElement('p');
    p.textContent = message;
    p.className = 'error-message text-red-950 font-bold text-base leading-relaxed mt-1';
    input.insertAdjacentElement('afterend', p);
  }

  function removeErrorMessage(input) {
    const existing = input.nextElementSibling;
    if (existing && existing.classList.contains('error-message')) {
      existing.remove();
    }
  }

  form.addEventListener('submit', (e) => {
    let valid = true;

    // Validar email
    if (!emailInput.value.trim()) {
      createErrorMessage(emailInput, 'El correo es obligatorio.');
      emailInput.classList.add('border-red-600');
      valid = false;
    } else {
      removeErrorMessage(emailInput);
      emailInput.classList.remove('border-red-600');
    }

    // Validar contraseña
    if (!passwordInput.value.trim()) {
      createErrorMessage(passwordInput, 'La contraseña es obligatoria.');
      passwordInput.classList.add('border-red-600');
      valid = false;
    } else {
      removeErrorMessage(passwordInput);
      passwordInput.classList.remove('border-red-600');
    }

    if (!valid) e.preventDefault(); // impedir envío si hay errores
  });

  // Opcional: remover error al escribir
  [emailInput, passwordInput].forEach(input => {
    input.addEventListener('input', () => {
      removeErrorMessage(input);
      input.classList.remove('border-red-600');
    });
  });
});

document.addEventListener("DOMContentLoaded", () => {
  const card = document.getElementById("loginCard");

  if (card) {
    requestAnimationFrame(() => {
      card.classList.remove("opacity-0", "translate-y-6");
      card.classList.add("opacity-100", "translate-y-0");
    });
  }
});
