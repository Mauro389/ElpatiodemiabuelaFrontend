// =============================================
//   MÓDULO USUARIOS 
// =============================================

const API_BASE_USR = "https://patiocampestre-bxf9hkbqcphpfpan.centralus-01.azurewebsites.net";

// ---- Helper Token ----
function getToken() { return localStorage.getItem("token"); }

// ---- Cargar roles en el select ----
async function cargarRolesEnSelect() {
    const select = document.getElementById("select-rol-usuario");
    try {
        const res = await fetch(`${API_BASE_USR}/api/Roles/activos`, {
            headers: { "Authorization": `Bearer ${getToken()}` }
        });
        const data = await res.json();

        if (data.exito) {
            select.innerHTML = '<option value="" disabled selected>Seleccionar Rol</option>';
            data.datos.forEach(rol => {
                const option = document.createElement("option");
                option.value = rol.id_rol;
                option.textContent = rol.nombre_rol;
                select.appendChild(option);
            });
        }
    } catch (e) { console.error("Error al cargar roles:", e); }
}

// ---- Cargar usuarios activos ----
async function cargarUsuarios() {
    const lista = document.getElementById("lista-usuarios");
    lista.innerHTML = "<li>Cargando...</li>";

    try {
        const res = await fetch(`${API_BASE_USR}/api/Usuarios/activos`, {
            headers: { "Authorization": `Bearer ${getToken()}` }
        });
        const data = await res.json();

        if (!data.exito) { lista.innerHTML = "<li>Error al cargar usuarios.</li>"; return; }

        lista.innerHTML = "";
        data.datos.forEach(usr => {
            const li = document.createElement("li");
            li.className = "item-crud";
            li.innerHTML = `
                <span class="nombre-item">${usr.nombre_completo}</span>
                <span class="detalle-item">User: ${usr.username} | Rol ID: ${usr.id_rol}</span>
                <div class="acciones-item">
                    <button class="btn-accion" onclick="activarEdicionUsuario(${usr.id_usuario}, '${usr.nombre_completo}', '${usr.username}', ${usr.id_rol}, this)">✏️</button>
                    <button class="btn-accion btn-eliminar" onclick="eliminarUsuario(${usr.id_usuario})">🗑️</button>
                </div>
            `;
            lista.appendChild(li);
        });
    } catch (e) { lista.innerHTML = "<li>Error de conexión.</li>"; }
}

// ---- Agregar Usuario (POST) ----
async function agregarUsuario() {
    const nombre = document.getElementById("input-nombre-completo").value.trim();
    const user = document.getElementById("input-username-usuario").value.trim();
    const pass = document.getElementById("input-password-usuario").value;
    const rol = parseInt(document.getElementById("select-rol-usuario").value);

    if (!nombre || !user || !pass || isNaN(rol)) {
        alert("Completa todos los campos obligatorios.");
        return;
    }

    await fetch(`${API_BASE_USR}/api/Usuarios`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${getToken()}` },
        body: JSON.stringify({
            id_rol: rol,
            nombre_completo: nombre,
            username: user,
            password: pass,
            activo: true
        })
    });

    document.getElementById("input-nombre-completo").value = "";
    document.getElementById("input-username-usuario").value = "";
    document.getElementById("input-password-usuario").value = "";

    cargarUsuarios();
}

// ---- Activar Edición Inline ----
async function activarEdicionUsuario(id, nombre, user, rolActual, btn) {
    const li = btn.closest(".item-crud");
    if (li.classList.contains("editando")) return cargarUsuarios();

    let opcionesRoles = '<option value="" disabled>Seleccionar Rol</option>';
    try {
        const res = await fetch(`${API_BASE_USR}/api/Roles/activos`, {
            headers: { "Authorization": `Bearer ${getToken()}` }
        });
        const data = await res.json();
        if (data.exito) {
            data.datos.forEach(rol => {
                const selected = rol.id_rol === rolActual ? "selected" : "";
                opcionesRoles += `<option value="${rol.id_rol}" ${selected}>${rol.nombre_rol}</option>`;
            });
        }
    } catch (e) { console.error("Error cargando roles:", e); }

    li.classList.add("editando");
    li.innerHTML = `
        <input type="text" class="campo" id="edit-nom" value="${nombre}">
        <input type="text" class="campo" id="edit-usr" value="${user}">
        <input type="password" class="campo" id="edit-pass" placeholder="Nueva clave (opcional)">
        <select class="campo" id="edit-rol">${opcionesRoles}</select>
        <div class="acciones-item">
            <button class="btn-accion" onclick="guardarEdicionUsuario(${id})">💾</button>
            <button class="btn-accion" onclick="cargarUsuarios()">✖️</button>
        </div>
    `;
}

// ---- Guardar Edición (PUT) ----
async function guardarEdicionUsuario(id) {
    const nuevoNombre = document.getElementById("edit-nom").value.trim();
    const nuevoUser = document.getElementById("edit-usr").value.trim();
    const nuevaPass = document.getElementById("edit-pass").value;
    const nuevoRol = parseInt(document.getElementById("edit-rol").value);

    if (!nuevoNombre || !nuevoUser || isNaN(nuevoRol)) {
        alert("Nombre, usuario y rol son obligatorios.");
        return;
    }

    const bodyData = {
        id_usuario: id,
        id_rol: nuevoRol,
        nombre_completo: nuevoNombre,
        username: nuevoUser,
        password_hash: "",
        password: "",
        activo: true
    };

    if (nuevaPass.trim() !== "") {
        bodyData.password = nuevaPass;
    }

    await fetch(`${API_BASE_USR}/api/Usuarios/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${getToken()}` },
        body: JSON.stringify(bodyData)
    });

    cargarUsuarios();
}

// ---- Eliminar Usuario (DELETE) ----
async function eliminarUsuario(id) {
    if (!confirm("¿Seguro que deseas eliminar este usuario?")) return;
    await fetch(`${API_BASE_USR}/api/Usuarios/${id}`, {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${getToken()}` }
    });
    cargarUsuarios();
}

// ---- Init ----
document.addEventListener("DOMContentLoaded", () => {
    cargarUsuarios();
    cargarRolesEnSelect();
    const btnAgregar = document.getElementById("btn-agregar-usuario");
    if (btnAgregar) btnAgregar.addEventListener("click", agregarUsuario);
});