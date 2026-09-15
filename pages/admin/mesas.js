// =============================================
//   MÓDULO MESAS 
// =============================================

const API_BASE_MESAS = "https://patiocampestre-bxf9hkbqcphpfpan.centralus-01.azurewebsites.net";

// ---- Cargar mesas activas ----
async function cargarMesas() {
    const lista = document.getElementById("lista-mesas");
    lista.innerHTML = "<li>Cargando...</li>";

    try {
        const res = await fetch(`${API_BASE_MESAS}/api/Mesas/activos`, {
            headers: { "Authorization": `Bearer ${localStorage.getItem("token")}` }
        });
        const data = await res.json();

        if (!data.exito) { lista.innerHTML = "<li>Error al cargar mesas.</li>"; return; }

        lista.innerHTML = "";
        data.datos.forEach(mesa => {
            const li = document.createElement("li");
            li.className = "item-crud";
            li.innerHTML = `
                <span>Mesa #${mesa.numero_mesa} - <strong>${mesa.estado}</strong></span>
                <div class="acciones-item">
                    <button class="btn-accion" onclick="activarEdicionMesa(${mesa.id_mesa}, ${mesa.numero_mesa}, '${mesa.estado}', this)">✏️</button>
                    <button class="btn-accion btn-eliminar" onclick="eliminarMesa(${mesa.id_mesa})">🗑️</button>
                </div>
            `;
            lista.appendChild(li);
        });
    } catch (e) { lista.innerHTML = "<li>Error de conexión.</li>"; }
}

// ---- Agregar Mesa (POST) ----
async function agregarMesa() {
    const numMesa = document.getElementById("input-numero-mesa").value.trim();

    if (!numMesa) { alert("Ingresa el número de mesa."); return; }

    await fetch(`${API_BASE_MESAS}/api/Mesas`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${localStorage.getItem("token")}` },
        body: JSON.stringify({
            id_mesa: 0,
            numero_mesa: parseInt(numMesa),
            estado: "disponible",
            activo: true
        })
    });
    document.getElementById("input-numero-mesa").value = "";
    cargarMesas();
}

// ---- Activar Edición ----
function activarEdicionMesa(id, numero, estado, btn) {
    const li = btn.closest(".item-crud");
    if (li.classList.contains("editando")) return cargarMesas();

    li.classList.add("editando");
    li.innerHTML = `
        <input type="number" class="campo" id="edit-num-mesa" value="${numero}">
        <select class="campo" id="edit-estado-mesa">
            <option value="disponible" ${estado === 'disponible' ? 'selected' : ''}>Disponible</option>
            <option value="ocupada" ${estado === 'ocupada' ? 'selected' : ''}>Ocupada</option>
        </select>
        <div class="acciones-item">
            <button class="btn-accion" onclick="guardarEdicionMesa(${id})">💾</button>
            <button class="btn-accion" onclick="cargarMesas()">✖️</button>
        </div>
    `;
}

// ---- Guardar Edición (PUT) ----
async function guardarEdicionMesa(id) {
    const nuevoNum = document.getElementById("edit-num-mesa").value;
    const nuevoEstado = document.getElementById("edit-estado-mesa").value;

    await fetch(`${API_BASE_MESAS}/api/Mesas/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${localStorage.getItem("token")}` },
        body: JSON.stringify({
            id_mesa: id,
            numero_mesa: parseInt(nuevoNum),
            estado: nuevoEstado,
            activo: true
        })
    });
    cargarMesas();
}

// ---- Eliminar (DELETE) ----
async function eliminarMesa(id) {
    if (!confirm("¿Eliminar mesa?")) return;
    await fetch(`${API_BASE_MESAS}/api/Mesas/${id}`, {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${localStorage.getItem("token")}` }
    });
    cargarMesas();
}

// ---- Init ----
document.addEventListener("DOMContentLoaded", () => {
    cargarMesas();
    document.getElementById("btn-agregar-mesa")?.addEventListener("click", agregarMesa);
});