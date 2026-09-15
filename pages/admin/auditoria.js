// =============================================
//   MÓDULO AUDITORÍA
// =============================================

import AuditoriaService from '../../shared/services/auditoria.services.js';

function formatearFecha(fechaStr) {
    const fecha = new Date(fechaStr);
    return fecha.toLocaleString("es-NI", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit"
    });
}

function colorAccion(accion) {
    switch (accion.toUpperCase()) {
        case "INSERT": return "color: #2ecc71;";
        case "UPDATE": return "color: #f39c12;";
        case "DELETE": return "color: #e74c3c;";
        default:       return "color: #fff;";
    }
}

function renderizarAuditoria(registros) {
    const tbody = document.getElementById("tabla-auditoria-body");
    tbody.innerHTML = "";

    if (!registros || registros.length === 0) {
        tbody.innerHTML = `<tr><td colspan="4" style="text-align:center;">No hay registros de auditoría.</td></tr>`;
        return;
    }

    registros.forEach(reg => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td>${formatearFecha(reg.fecha_evento)}</td>
            <td>${reg.nombre_usuario || "Sistema"}</td>
            <td style="${colorAccion(reg.accion)}"><strong>${reg.accion}</strong></td>
            <td>${reg.descripcion}</td>
        `;
        tbody.appendChild(tr);
    });
}

async function cargarAuditoria() {
    const tbody = document.getElementById("tabla-auditoria-body");
    tbody.innerHTML = `<tr><td colspan="4" style="text-align:center; padding:20px;">Cargando...</td></tr>`;

    try {
        const registros = await AuditoriaService.obtenerTodos();
        renderizarAuditoria(registros);
    } catch (error) {
        console.error("Error al cargar auditoría:", error);
        tbody.innerHTML = `<tr><td colspan="4" style="text-align:center;">No se pudo conectar con el servidor.</td></tr>`;
    }
}

// ---- Init ----
document.addEventListener("DOMContentLoaded", () => {
    cargarAuditoria();
});