// Función para manejar el inicio de sesión con JWT
function iniciarSesion() {
  const username = document.getElementById("username").value;
  const password = document.getElementById("password").value;

  fetch('/api/auth/login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify({ username, password })
  })
  .then(response => response.json())
  .then(data => {
    if (data.message === 'Login successful') {
      sessionStorage.setItem('sesionIniciada', '1');
      alert("Inicio de sesión exitoso");
      window.location.replace("menu_principal.html");
    } else {
      const mensaje = document.getElementById("mensaje");
      mensaje.style.display = "block";
    }
  })
  .catch(error => {
    console.error("Error al realizar la solicitud:", error);
  });
}

// Proteger páginas: si no hay sesión o token inválido, redirigir a login
if (!window.location.pathname.endsWith('login.html')) {
  fetch('/api/auth/check', { credentials: 'include' })
    .then(res => {
      if (!res.ok) {
        sessionStorage.removeItem('sesionIniciada');
        window.location.replace('login.html');
      }
    })
    .catch(() => {
      sessionStorage.removeItem('sesionIniciada');
      window.location.replace('login.html');
    });
}

// Cerrar sesión: elimina token y sessionStorage, limpia historial
function cerrarSesion() {
  fetch('/api/auth/logout', { method: 'POST', credentials: 'include' })
    .then(() => {
      sessionStorage.removeItem('sesionIniciada');
      window.location.replace('login.html');
    });
}

// Función para mostrar/ocultar la contraseña
function togglePassword() {
    const passwordField = document.getElementById("password");
    const icon = document.getElementById("togglePassword");

    if (passwordField.type === "password") {
        passwordField.type = "text"; // Cambiar a texto
        icon.textContent = "visibility_off"; // Cambiar el ícono a "ocultar"
    } else {
        passwordField.type = "password"; // Cambiar a contrasela oculta
        icon.textContent = "visibility"; // Cambiar el ícono a "mostrar"
    }
}

// Código para el modo oscuro y notificaciones en menu_principal.html
const toggleButton = document.getElementById('modeToggle');
const body = document.body;
const notificationIcon = document.getElementById('notification-icon');
const notificationWindow = document.getElementById('notification-window');
const closeNotifications = document.getElementById('close-notifications');
const markAsReadButton = document.getElementById('mark-as-read');

if (toggleButton) {
  toggleButton.addEventListener('click', () => {
    body.classList.toggle('dark-mode');

    // Cambiar el ícono del botón al alternar entre claro y oscuro
    const icon = toggleButton.querySelector('i');
    if (body.classList.contains('dark-mode')) {
      icon.classList.remove('fa-moon');
      icon.classList.add('fa-sun');
    } else {
      icon.classList.remove('fa-sun');
      icon.classList.add('fa-moon');
    }
  });
}

if (notificationIcon) {
  // Mostrar la pestaña flotante de notificaciones con animación
  notificationIcon.addEventListener('click', () => {
    notificationWindow.classList.add('show');
    notificationWindow.style.display = 'block';
  });
}

if (closeNotifications) {
  // Cerrar la pestaña de notificaciones con animación
  closeNotifications.addEventListener('click', () => {
    notificationWindow.classList.remove('show');
    setTimeout(() => {
      notificationWindow.style.display = 'none';
    }, 500); // Tiempo para que se complete la animación
  });
}

if (markAsReadButton) {
  // Marcar todas las notificaciones como vistas
  markAsReadButton.addEventListener('click', () => {
    const notifications = document.querySelectorAll('.notification-item');
    notifications.forEach(item => {
      item.style.color = '#999'; // Marcar como "leídas" cambiando el color
    });
  });
}

// Ejemplo de corrección para todos los listeners
const eliminarBtn = document.getElementById('eliminarBtn');
if (eliminarBtn) {
  eliminarBtn.addEventListener('click', function() {
    // ...tu código...
  });
}
// Repite este patrón para todos los elementos que usen addEventListener

// ============================================================
// UTILIDAD GLOBAL: Animación de carga en botones
// Uso:
//   const stop = btnLoading(btn);   // activa spinner
//   stop();                          // desactiva spinner
//   btnLoading(btn, promesa);        // auto-desactiva al resolver
// ============================================================
function btnLoading(btn, promise) {
  if (!btn) return () => {};

  // Asegurar que el botón tenga estructura spinner + span
  if (!btn.querySelector('.spinner')) {
    // Envolver contenido existente en span si no tiene
    if (!btn.querySelector('span.btn-label')) {
      const span = document.createElement('span');
      span.className = 'btn-label';
      span.innerHTML = btn.innerHTML;
      btn.innerHTML = '';
      btn.appendChild(span);
    }
    const spinner = document.createElement('div');
    spinner.className = 'spinner';
    btn.insertBefore(spinner, btn.firstChild);
  }

  // Activar estado loading
  btn.classList.add('loading');
  btn.disabled = true;

  const stop = () => {
    btn.classList.remove('loading');
    btn.disabled = false;
  };

  // Si se pasa una promesa, auto-desactivar al terminar
  if (promise && typeof promise.finally === 'function') {
    promise.finally(stop);
    return stop;
  }

  return stop;
}

// Auto-inicializar spinner en todos los .btn al cargar la página
document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.btn').forEach(btn => {
    if (!btn.querySelector('.spinner') && btn.innerHTML.trim()) {
      const span = document.createElement('span');
      span.className = 'btn-label';
      span.innerHTML = btn.innerHTML;
      btn.innerHTML = '';
      const spinner = document.createElement('div');
      spinner.className = 'spinner';
      btn.appendChild(spinner);
      btn.appendChild(span);
    }
  });
});