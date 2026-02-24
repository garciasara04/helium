document.addEventListener('DOMContentLoaded', () => {
  const roleSelect = document.getElementById('role_id');
  const freelancerSection = document.getElementById('freelancerSection');
  const companySection = document.getElementById('companySection');
  const form = document.getElementById('registerForm');

  const passwordInput = document.getElementById('password');
  const confirmInput = document.getElementById('configpassword');

  // Crea el contenedor de feedback dinámicamente con Tailwind
  const feedback = document.createElement('ul');
  feedback.id = 'passwordFeedback';
  feedback.className = 'mt-2 text-sm space-y-1 bg-gray-200 bg-opacity-50 p-3 rounded-md';
  feedback.style.display = 'none'; // Oculto inicialmente
  passwordInput.insertAdjacentElement('afterend', feedback);

  const criteria = [
    { text: 'Al menos 8 caracteres', test: (pw) => pw.length >= 8 },
    { text: 'Al menos una letra mayúscula', test: (pw) => /[A-Z]/.test(pw) },
    { text: 'Al menos una letra minúscula', test: (pw) => /[a-z]/.test(pw) },
    { text: 'Al menos un número', test: (pw) => /\d/.test(pw) },
    { text: 'Al menos un símbolo (!@#$%^&*)', test: (pw) => /[!@#$%^&*]/.test(pw) },
  ];

  // Crea los <li> para la lista
  criteria.forEach(({ text }) => {
    const li = document.createElement('li');
    li.textContent = text;
    li.className = 'text-gray-600'; // gris por defecto
    feedback.appendChild(li);
  });

  function toggleSections() {
    const selectedRole = roleSelect.value;

    freelancerSection.classList.add('hidden');
    companySection.classList.add('hidden');

    if (selectedRole === '1') {
      freelancerSection.classList.remove('hidden');
    } else if (selectedRole === '3') {
      companySection.classList.remove('hidden');
    }
  }

  function validatePasswordCriteria(pw) {
    // Actualiza colores en función del cumplimiento
    Array.from(feedback.children).forEach((li, i) => {
      if (criteria[i].test(pw)) {
        li.classList.remove('text-gray-600');
        li.classList.add('text-green-600', 'font-semibold');
      } else {
        li.classList.remove('text-green-600', 'font-semibold');
        li.classList.add('text-gray-600');
      }
    });
  }

  function updatePasswordFeedback() {
    if (passwordInput.value.length > 0 && document.activeElement === passwordInput) {
      feedback.style.display = 'block';
    } else {
      feedback.style.display = 'none';
    }
  }

  // Mensaje para confirmación de contraseña
  let confirmError = null;
  function validateConfirmPassword() {
    // Solo validar si el usuario ya escribió algo
    if (confirmInput.value === '') {
      if (confirmError) confirmError.remove();
      confirmError = null;
      confirmInput.classList.remove('border-red-600', 'border-green-600');
      return false;
    }

    if (confirmError) confirmError.remove();

    if (confirmInput.value !== passwordInput.value) {
      confirmError = document.createElement('p');
      confirmError.textContent = 'Las contraseñas no coinciden.';
      confirmError.className = 'text-red-600 text-sm mt-1';
      confirmInput.insertAdjacentElement('afterend', confirmError);
      confirmInput.classList.add('border-red-600');
      confirmInput.classList.remove('border-green-600');
      return false;
    } else {
      confirmInput.classList.remove('border-red-600');
      confirmInput.classList.add('border-green-600');
      return true;
    }
  }

  // Validar campos obligatorios
  function validateForm() {
    let valid = true;

    // Campos básicos obligatorios
    const requiredFields = ['names', 'email', 'password', 'configpassword', 'phone', 'role_id'];
    requiredFields.forEach(id => {
      const el = document.getElementById(id);
      if (!el.value.trim()) {
        el.classList.add('border-red-600');
        valid = false;
      } else {
        el.classList.remove('border-red-600');
      }
    });

    // Validar confirm password
    if (!validateConfirmPassword()) valid = false;

    // Validar criterios contraseña
    const pw = passwordInput.value;
    const allCriteriaMet = criteria.every(c => c.test(pw));
    if (!allCriteriaMet) {
      feedback.style.display = 'block'; // mostrar criterios si no está visible
      valid = false;
    }

    // Validar campos adicionales según rol
    if (roleSelect.value === '1') { // Freelancer
      const freelancerFields = ['description', 'profession', 'experience', 'education_level'];
      freelancerFields.forEach(id => {
        const el = document.getElementById(id);
        if (!el.value.trim()) {
          el.classList.add('border-red-600');
          valid = false;
        } else {
          el.classList.remove('border-red-600');
        }
      });
    } else if (roleSelect.value === '3') { // Empresa
      const companyFields = ['nit', 'address'];
      companyFields.forEach(id => {
        const el = document.getElementById(id);
        if (!el.value.trim()) {
          el.classList.add('border-red-600');
          valid = false;
        } else {
          el.classList.remove('border-red-600');
        }
      });
    }

    return valid;
  }

  // Eventos password
  passwordInput.addEventListener('input', () => {
    updatePasswordFeedback();
    validatePasswordCriteria(passwordInput.value);
    validateConfirmPassword();
  });

  passwordInput.addEventListener('focus', () => updatePasswordFeedback());
  passwordInput.addEventListener('blur', () => updatePasswordFeedback());

  // Evento confirm password
  confirmInput.addEventListener('input', validateConfirmPassword);

  // Evento cambio rol
  roleSelect.addEventListener('change', toggleSections);

  toggleSections();

  // Validar todo al enviar
  form.addEventListener('submit', e => {
    if (!validateForm()) {
      e.preventDefault();
    }
  });
});





document.addEventListener("DOMContentLoaded", () => {
  const card = document.getElementById("registerCard");

  if (card) {
    requestAnimationFrame(() => {
      card.classList.remove("opacity-0", "translate-y-6");
      card.classList.add("opacity-100", "translate-y-0");
    });
  }
});

const title = document.getElementById("registerTitle");

if (title) {
  setTimeout(() => {
    title.classList.remove("opacity-0", "translate-y-3");
    title.classList.add("opacity-100", "translate-y-0");
  }, 150);
}

const photoInput = document.getElementById('photo');
const fileText = document.getElementById('fileText');

if (photoInput) {
  photoInput.addEventListener('change', () => {
    fileText.textContent = photoInput.files.length
      ? photoInput.files[0].name
      : 'Selecciona una imagen';
  });
}

document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('registerForm');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault(); // ← Evita el envío tradicional

    const submitBtn = form.querySelector('button[type="submit"]');
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = 'Creando cuenta...';
    }

    // Captura TODOS los campos + el archivo automáticamente
    const formData = new FormData(form);

    // Validación rápida en frontend (opcional pero muy útil)
    const password = formData.get('password');
    const configpassword = formData.get('configpassword');

    if (password !== configpassword) {
      alert('Las contraseñas no coinciden');
      resetButton(submitBtn);
      return;
    }

    // Si el rol es Freelancer (1), verifica campos extras si quieres
    const role = formData.get('role_id');
    if (role === '1') {
      const description = formData.get('description')?.toString().trim();
      if (!description) {
        alert('La descripción es obligatoria para Freelancers');
        resetButton(submitBtn);
        return;
      }
    }

    try {
      const response = await fetch('https://tu-dominio-laravel.com/api/register', {
        method: 'POST',
        body: formData,          // ← Envía multipart/form-data automáticamente
        // NO pongas headers: { 'Content-Type': ... } → el navegador lo hace solo
        // Si usas Sanctum o CORS con credenciales:
        credentials: 'include',
      });

      const result = await response.json();

      if (response.ok) {
        // Éxito (201 o 200)
        console.log('Respuesta exitosa:', result);

        alert(result.message || '¡Cuenta creada exitosamente!');

        // Guarda token si lo devuelve Laravel
        if (result.token) {
          localStorage.setItem('token', result.token);
        }

        // Redirige según rol (ajusta según lo que devuelva tu API)
        const rol = result.role_id || result.user?.role_id || result.role;

        if (rol === 1 || rol === 'freelancer') {
          window.location.href = '/freelancer/dashboard';
        } else if (rol === 2 || rol === 'usuario') {
          window.location.href = '/usuario/perfil';
        } else if (rol === 3 || rol === 'empresa') {
          window.location.href = '/empresa/panel';
        } else {
          window.location.href = '/dashboard'; // fallback
        }
      } else {
        // Error (422 validación, 400, etc.)
        console.error('Error del servidor:', result);

        let mensajeError = 'Error al registrar: ';

        if (result.errors) {
          // Laravel devuelve { errors: { email: ["El email ya existe"], ... } }
          Object.values(result.errors).forEach((errs) => {
            mensajeError += errs.join(', ') + '. ';
          });
        } else {
          mensajeError += result.message || 'Revisa los datos e intenta nuevamente.';
        }

        alert(mensajeError);
      }
    } catch (error) {
      console.error('Error de conexión:', error);
      alert('No pudimos conectar con el servidor. Verifica tu conexión.');
    } finally {
      resetButton(submitBtn);
    }
  });

  function resetButton(btn) {
    if (btn) {
      btn.disabled = false;
      btn.textContent = 'Crear cuenta';
    }
  }
});
