document.addEventListener('DOMContentLoaded', () => {
  const API_BASE = 'http://127.0.0.1:8000';

  const form = document.getElementById('registerForm');
  if (!form) return;

  const roleSelect = document.getElementById('role_id');
  const freelancerSection = document.getElementById('freelancerSection');
  const companySection = document.getElementById('companySection');
  const passwordInput = document.getElementById('password');
  const confirmInput = document.getElementById('password_confirmation');
  const photoInput = document.getElementById('photo');
  const fileText = document.getElementById('fileText');
  const submitBtn = form.querySelector('button[type="submit"]');

  const fieldIds = [
    'names',
    'last_names',
    'email',
    'password',
    'password_confirmation',
    'phone',
    'role_id',
    'profession',
    'experience',
    'description',
    'nit',
    'address'
  ];

  const errorMap = new Map();

  function ensureErrorEl(input) {
    if (!input) return null;
    if (errorMap.has(input.id)) return errorMap.get(input.id);

    const errorEl = document.createElement('p');
    errorEl.className = 'hidden mt-1 text-xs text-red-300';

    const target = input.closest('div') || input.parentElement;
    if (target) target.appendChild(errorEl);

    errorMap.set(input.id, errorEl);
    return errorEl;
  }

  function setFieldError(id, message) {
    const input = document.getElementById(id);
    if (!input) return;

    const errorEl = ensureErrorEl(input);
    input.classList.add('border-red-500');
    input.classList.remove('border-green-500');

    if (errorEl) {
      errorEl.textContent = message;
      errorEl.classList.remove('hidden');
    }
  }

  function clearFieldError(id) {
    const input = document.getElementById(id);
    if (!input) return;

    input.classList.remove('border-red-500');
    const errorEl = ensureErrorEl(input);
    if (errorEl) {
      errorEl.textContent = '';
      errorEl.classList.add('hidden');
    }
  }

  function clearAllErrors() {
    fieldIds.forEach(clearFieldError);
  }

  function markFieldAsValid(id) {
    const input = document.getElementById(id);
    if (!input) return;
    input.classList.remove('border-red-500');
    input.classList.add('border-green-500');
  }

  function isValidEmail(value) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  }

  function toggleSections() {
    if (!roleSelect || !freelancerSection || !companySection) return;

    const selectedRole = roleSelect.value;
    freelancerSection.classList.add('hidden');
    companySection.classList.add('hidden');

    if (selectedRole === '2') freelancerSection.classList.remove('hidden');
    if (selectedRole === '3') companySection.classList.remove('hidden');
  }

  function validateForm() {
    clearAllErrors();

    let valid = true;

    const requiredCommon = [
      ['names', 'Ingresa tus nombres.'],
      ['last_names', 'Ingresa tus apellidos.'],
      ['email', 'Ingresa tu correo electrónico.'],
      ['password', 'Ingresa una contraseña.'],
      ['password_confirmation', 'Confirma tu contraseña.'],
      ['role_id', 'Selecciona un rol.']
    ];

    requiredCommon.forEach(([id, message]) => {
      const input = document.getElementById(id);
      const value = String(input?.value || '').trim();
      if (!value) {
        setFieldError(id, message);
        valid = false;
      }
    });

    const emailValue = String(document.getElementById('email')?.value || '').trim();
    if (emailValue && !isValidEmail(emailValue)) {
      setFieldError('email', 'Ingresa un correo válido.');
      valid = false;
    } else if (emailValue) {
      markFieldAsValid('email');
    }

    const passwordValue = String(passwordInput?.value || '');
    if (passwordValue && passwordValue.length < 8) {
      setFieldError('password', 'La contraseña debe tener al menos 8 caracteres.');
      valid = false;
    } else if (passwordValue.length >= 8) {
      markFieldAsValid('password');
    }

    const confirmValue = String(confirmInput?.value || '');
    if (confirmValue && confirmValue !== passwordValue) {
      setFieldError('password_confirmation', 'Las contraseñas no coinciden.');
      valid = false;
    } else if (confirmValue && confirmValue === passwordValue) {
      markFieldAsValid('password_confirmation');
    }

    const selectedRole = String(roleSelect?.value || '');
    if (selectedRole === '2') {
      const freelancerRequired = [
        ['profession', 'Ingresa tu profesión.'],
        ['experience', 'Ingresa tu experiencia.'],
        ['description', 'Ingresa una descripción de tu perfil.']
      ];

      freelancerRequired.forEach(([id, message]) => {
        const value = String(document.getElementById(id)?.value || '').trim();
        if (!value) {
          setFieldError(id, message);
          valid = false;
        } else {
          markFieldAsValid(id);
        }
      });
    }

    if (selectedRole === '3') {
      const companyRequired = [
        ['nit', 'Ingresa el NIT de la empresa.'],
        ['address', 'Ingresa la dirección de la empresa.']
      ];

      companyRequired.forEach(([id, message]) => {
        const value = String(document.getElementById(id)?.value || '').trim();
        if (!value) {
          setFieldError(id, message);
          valid = false;
        } else {
          markFieldAsValid(id);
        }
      });
    }

    return valid;
  }

  fieldIds.forEach((id) => {
    const input = document.getElementById(id);
    if (!input) return;

    input.addEventListener('input', () => clearFieldError(id));
    input.addEventListener('change', () => clearFieldError(id));
  });

  if (roleSelect) {
    roleSelect.addEventListener('change', () => {
      toggleSections();
      ['profession', 'experience', 'description', 'nit', 'address'].forEach(clearFieldError);
    });
    toggleSections();
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      window.appToast('Revisa los campos marcados en rojo.', { tone: 'warning' });
      return;
    }

    const formdata = new FormData(form);

    try {
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Creando cuenta...';
        submitBtn.classList.add('opacity-70', 'cursor-not-allowed');
      }

      const response = await fetch(`${API_BASE}/api/register`, {
        method: 'POST',
        headers: {
          Accept: 'application/json'
        },
        body: formdata
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        const errors = data?.errors || {};
        Object.entries(errors).forEach(([key, messages]) => {
          const message = Array.isArray(messages) ? messages[0] : 'Campo inválido.';
          if (document.getElementById(key)) {
            setFieldError(key, message);
          }
        });

        window.appToast(data?.message || 'No se pudo completar el registro.', { tone: 'error' });
        return;
      }

      if (!data?.token || !data?.user) {
        window.appToast('Respuesta inesperada del servidor.', { tone: 'error' });
        return;
      }

      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));

      const role = Number(data.user.role_id);
      if (role === 1) window.location.href = '/dashboard/cliente';
      else if (role === 2) window.location.href = '/dashboard/freelance';
      else if (role === 3) window.location.href = '/dashboard/company';
      else if (role === 4) window.location.href = '/dashboard/admin';
      else window.location.href = '/dashboard';
    } catch (error) {
      console.error('Error register:', error);
      window.appToast('Error de conexión con el servidor.', { tone: 'error' });
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Crear cuenta';
        submitBtn.classList.remove('opacity-70', 'cursor-not-allowed');
      }
    }
  });

  const card = document.getElementById('registerCard');
  if (card) {
    requestAnimationFrame(() => {
      card.classList.remove('opacity-0', 'translate-y-6');
      card.classList.add('opacity-100', 'translate-y-0');
    });
  }

  const title = document.getElementById('registerTitle');
  if (title) {
    setTimeout(() => {
      title.classList.remove('opacity-0', 'translate-y-3');
      title.classList.add('opacity-100', 'translate-y-0');
    }, 150);
  }

  if (photoInput && fileText) {
    photoInput.addEventListener('change', () => {
      fileText.textContent = photoInput.files?.length
        ? photoInput.files[0].name
        : 'Selecciona una imagen';
    });
  }
});
