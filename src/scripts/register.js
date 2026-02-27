document.addEventListener('DOMContentLoaded', () => {
  const roleSelect = document.getElementById('role_id');
  const freelancerSection = document.getElementById('freelancerSection');
  const companySection = document.getElementById('companySection');
  const form = document.getElementById('registerForm');

  const passwordInput = document.getElementById('password');
  // Se asegura que coincida con el ID de tu HTML
  const confirmInput = document.getElementById('password_confirmation');

  if (!form) return; // Si no hay form, no ejecuta nada de esto

  // --- 1. Lógica de Feedback de Contraseña ---
  const feedback = document.createElement('ul');
  feedback.id = 'passwordFeedback';
  feedback.className = 'mt-2 text-sm space-y-1 bg-gray-200 bg-opacity-50 p-3 rounded-md';
  feedback.style.display = 'none';
  if (passwordInput) passwordInput.insertAdjacentElement('afterend', feedback);

  const criteria = [
    { text: 'Al menos 8 caracteres', test: (pw) => pw.length >= 8 },
    { text: 'Al menos una letra mayúscula', test: (pw) => /[A-Z]/.test(pw) },
    { text: 'Al menos una letra minúscula', test: (pw) => /[a-z]/.test(pw) },
    { text: 'Al menos un número', test: (pw) => /\d/.test(pw) },
    { text: 'Al menos un símbolo (!@#$%^&*)', test: (pw) => /[!@#$%^&*]/.test(pw) },
  ];

  criteria.forEach(({ text }) => {
    const li = document.createElement('li');
    li.textContent = text;
    li.className = 'text-gray-600';
    feedback.appendChild(li);
  });

  function validatePasswordCriteria(pw) {
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

  let confirmError = null;
  function validateConfirmPassword() {
    if (!confirmInput) return true;
    
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

  if (passwordInput) {
    passwordInput.addEventListener('input', () => {
      updatePasswordFeedback();
      validatePasswordCriteria(passwordInput.value);
      validateConfirmPassword();
    });
    passwordInput.addEventListener('focus', updatePasswordFeedback);
    passwordInput.addEventListener('blur', updatePasswordFeedback);
  }

  if (confirmInput) {
    confirmInput.addEventListener('input', validateConfirmPassword);
  }


  // --- 2. Lógica de Ocultar/Mostrar Secciones ---
  function toggleSections() {
    const selectedRole = roleSelect.value;

    freelancerSection.classList.add('hidden');
    companySection.classList.add('hidden');

    // IMPORTANTE: En tu HTML el Freelancer tiene value="2"
    if (selectedRole === '2') {
      freelancerSection.classList.remove('hidden');
    } else if (selectedRole === '3') { // Empresa
      companySection.classList.remove('hidden');
    }
  }

  if (roleSelect) {
    roleSelect.addEventListener('change', toggleSections);
    toggleSections(); // Ejecutar al inicio por si el navegador guardó el valor
  }


  // --- 3. Validación de Campos Vacíos (Visual) ---
  function validateForm() {
    let valid = true;

    // Campos básicos obligatorios (Acorde a tus IDs)
    const requiredFields = ['names', 'email', 'password', 'password_confirmation', 'phone', 'role_id'];
    
    requiredFields.forEach(id => {
      const el = document.getElementById(id);
      if (el) {
        if (!el.value.trim()) {
          el.classList.add('border-red-600');
          valid = false;
        } else {
          el.classList.remove('border-red-600');
        }
      }
    });

    if (!validateConfirmPassword()) valid = false;

    const pw = passwordInput ? passwordInput.value : '';
    const allCriteriaMet = criteria.every(c => c.test(pw));
    if (!allCriteriaMet && passwordInput) {
      feedback.style.display = 'block';
      valid = false;
    }

    // Validar extras según rol
    if (roleSelect && roleSelect.value === '2') { // Freelancer
      // Nota: quité 'education_level' porque no está en tu HTML actual
      const freelancerFields = ['description', 'profession', 'experience'];
      freelancerFields.forEach(id => {
        const el = document.getElementById(id);
        if (el && !el.value.trim()) {
          el.classList.add('border-red-600');
          valid = false;
        } else if (el) {
          el.classList.remove('border-red-600');
        }
      });
    } else if (roleSelect && roleSelect.value === '3') { // Empresa
      // Ojo: En tu HTML pusiste name="nit" pero no tiene id="nit". Si falla, ponle id="nit" al input en Astro
      const companyFields = ['nit', 'address'];
      companyFields.forEach(name => {
        const el = document.querySelector(`input[name="${name}"]`);
        if (el && !el.value.trim()) {
          el.classList.add('border-red-600');
          valid = false;
        } else if (el) {
          el.classList.remove('border-red-600');
        }
      });
    }

    return valid;
  }

  // --- 4. El ENVÍO (Tu lógica Fetch) ---
 

  })

// --- Animaciones y Extras de tu compañera ---
document.addEventListener("DOMContentLoaded", () => {
  const card = document.getElementById("registerCard");
  if (card) {
    requestAnimationFrame(() => {
      card.classList.remove("opacity-0", "translate-y-6");
      card.classList.add("opacity-100", "translate-y-0");
    });
  }

  const title = document.getElementById("registerTitle");
  if (title) {
    setTimeout(() => {
      title.classList.remove("opacity-0", "translate-y-3");
      title.classList.add("opacity-100", "translate-y-0");
    }, 150);
  }

  const photoInput = document.getElementById('photo');
  const fileText = document.getElementById('fileText');
  if (photoInput && fileText) {
    photoInput.addEventListener('change', () => {
      fileText.textContent = photoInput.files.length
        ? photoInput.files[0].name
        : 'Selecciona una imagen';
    });
  }
});