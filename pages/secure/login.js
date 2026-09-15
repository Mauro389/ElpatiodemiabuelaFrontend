// =============================================
//   LOGIN - Patio Campestre
// =============================================

const API_BASE = "https://patiocampestre-bxf9hkbqcphpfpan.centralus-01.azurewebsites.net";
const ENDPOINT_LOGIN = `${API_BASE}/api/auth/login`;

// Rutas de redirección según rol
const RUTAS_POR_ROL = {
  1: "../main/menu.html",
  2: "../main/menu.html",
  3: "../main/menu.html",
  4: "../main/menu.html"
};

// ---- Decodificar JWT sin librería externa ----
function decodificarToken(token) {
  try {
    const payload = token.split(".")[1];
    const base64 = payload.replace(/-/g, "+").replace(/_/g, "/");
    const json = decodeURIComponent(
      atob(base64)
        .split("")
        .map(c => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );
    return JSON.parse(json);
  } catch (e) {
    console.error("Error al decodificar token:", e);
    return null;
  }
}

// ---- Mostrar mensaje de error en pantalla ----
function mostrarError(mensaje) {
  const errorEl = document.querySelector(".mensaje-error");
  if (errorEl) {
    errorEl.textContent = mensaje;
    errorEl.style.display = "block";
  }
}

function limpiarError() {
  const errorEl = document.querySelector(".mensaje-error");
  if (errorEl) {
    errorEl.textContent = "";
    errorEl.style.display = "none";
  }
}

// ---- Función principal de login ----
async function iniciarSesion() {
  limpiarError();

  const username = document.querySelector(".campo-usuario").value.trim();
  const password = document.querySelector(".campo-password").value.trim();

  // Validación básica en frontend
  if (!username || !password) {
    mostrarError("Por favor ingresa tu usuario y contraseña.");
    return;
  }

  const btnEntrar = document.querySelector(".btn-entrar");
  btnEntrar.disabled = true;
  btnEntrar.textContent = "Ingresando...";

  try {
    const respuesta = await fetch(ENDPOINT_LOGIN, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ username, password })
    });

    const datos = await respuesta.json();

    // Si el servidor responde con error HTTP
    if (!respuesta.ok || !datos.exito) {
      mostrarError(datos.mensaje || "Usuario o contraseña incorrectos.");
      return;
    }

    // ---- Login exitoso ----
    const token = datos.token;
    const payload = decodificarToken(token);

    if (!payload) {
      mostrarError("Error al procesar el token. Contacta al administrador.");
      return;
    }

    const rol = parseInt(payload.role); // "role" viene como string en tu JWT

    // Guardar en localStorage
    localStorage.setItem("token", token);
    localStorage.setItem("rol", rol);
    localStorage.setItem("nombre", payload["http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name"] || payload.Username || "");
    localStorage.setItem("username", payload.Username || username);
    localStorage.setItem("idUsuario", payload.IdUsuario || "");

    // Redirigir según rol
    const ruta = RUTAS_POR_ROL[rol];
    if (ruta) {
      window.location.href = ruta;
    } else {
      mostrarError(`Rol desconocido (${rol}). Contacta al administrador.`);
    }

  } catch (error) {
    console.error("Error de conexión:", error);
    mostrarError("No se pudo conectar con el servidor. Verifica tu conexión.");
  } finally {
    btnEntrar.disabled = false;
    btnEntrar.textContent = "Iniciar Sesión";
  }
}

// ---- Eventos ----
document.addEventListener("DOMContentLoaded", () => {

  // Si ya hay sesión activa, redirigir directo
  const tokenGuardado = localStorage.getItem("token");
  const rolGuardado = localStorage.getItem("rol");
  if (tokenGuardado && rolGuardado) {
    const ruta = RUTAS_POR_ROL[parseInt(rolGuardado)];
    if (ruta) window.location.href = ruta;
  }

  // Click en botón
  document.querySelector(".btn-entrar").addEventListener("click", iniciarSesion);

  // Enter en los campos
  document.querySelector(".campo-usuario").addEventListener("keydown", (e) => {
    if (e.key === "Enter") iniciarSesion();
  });
  document.querySelector(".campo-password").addEventListener("keydown", (e) => {
    if (e.key === "Enter") iniciarSesion();
  });

});