// =============================================
//   ADMINISTRACIÓN - Patio Campestre
// =============================================

const ROL_ADMINISTRADOR = 1;

document.addEventListener("DOMContentLoaded", () => {

    // 1. Verificar sesión activa
    const token = localStorage.getItem("token");
    const rol = parseInt(localStorage.getItem("rol"));

    if (!token || isNaN(rol)) {
        window.location.href = "../secure/index.html";
        return;
    }

    // 2. Solo el administrador puede estar aquí
    if (rol !== ROL_ADMINISTRADOR) {
        window.location.href = "../main/menu.html";
        return;
    }

    // 3. Botón salir
    document.getElementById("btn-salir").addEventListener("click", (e) => {
        e.preventDefault();
        cerrarSesion();
    });

});

// ---- Cerrar sesión ----
function cerrarSesion() {
    localStorage.removeItem("token");
    localStorage.removeItem("rol");
    localStorage.removeItem("nombre");
    localStorage.removeItem("username");
    localStorage.removeItem("idUsuario");
    window.location.href = "../secure/index.html";
}