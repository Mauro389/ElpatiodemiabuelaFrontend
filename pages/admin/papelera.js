// =============================================
//   MÓDULO PAPELERA 
// =============================================

const API_BASE_PAP = "https://patiocampestre-bxf9hkbqcphpfpan.centralus-01.azurewebsites.net";

function getTokenPap() {
    return localStorage.getItem("token");
}

// ---- Configuración de cada módulo ----
const MODULOS_PAPELERA = {
    categorias: {
        label: "Categorías",
        getUrl: `${API_BASE_PAP}/api/Categorias/inactivos`,
        restaurarUrl: (id) => `${API_BASE_PAP}/api/Categorias/restaurar/${id}`,
        renderItem: (item) => `${item.nombre}`
    },
    productos: {
        label: "Productos",
        getUrl: `${API_BASE_PAP}/api/Productos/inactivos`,
        restaurarUrl: (id) => `${API_BASE_PAP}/api/Productos/restaurar/${id}`,
        renderItem: (item) => `${item.nombre} | $${item.precio_unitario}`
    },
    usuarios: {
        label: "Usuarios",
        getUrl: `${API_BASE_PAP}/api/Usuarios/inactivos`,
        restaurarUrl: (id) => `${API_BASE_PAP}/api/Usuarios/restaurar/${id}`,
        renderItem: (item) => `${item.nombre_completo} | @${item.username}`
    },
    mesas: {
        label: "Mesas",
        getUrl: `${API_BASE_PAP}/api/Mesas/inactivos`,
        restaurarUrl: (id) => `${API_BASE_PAP}/api/Mesas/restaurar/${id}`,
        renderItem: (item) => `Mesa #${item.numero_mesa} | ${item.estado}`
    }
};

// ---- Obtener ID según módulo ----
function getIdItem(tipo, item) {
    switch (tipo) {
        case "categorias": return item.id_categoria;
        case "productos": return item.id_producto;
        case "usuarios": return item.id_usuario;
        case "mesas": return item.id_mesa;
    }
}

// ---- Cargar elementos eliminados según tipo ----
async function cargarEliminados(tipo) {
    const lista = document.getElementById("lista-eliminados");
    const modulo = MODULOS_PAPELERA[tipo];

    lista.innerHTML = "<li>Cargando...</li>";

    try {
        const respuesta = await fetch(modulo.getUrl, {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${getTokenPap()}`
            }
        });

        const datos = await respuesta.json();

        if (!respuesta.ok || !datos.exito) {
            lista.innerHTML = "<li>Error al cargar elementos eliminados.</li>";
            return;
        }

        const items = datos.datos;

        if (!items || items.length === 0) {
            lista.innerHTML = "<li class='item-recuperacion'>No hay elementos eliminados.</li>";
            return;
        }

        lista.innerHTML = "";
        items.forEach(item => {
            const id = getIdItem(tipo, item);
            const li = document.createElement("li");
            li.classList.add("item-recuperacion");
            li.innerHTML = `
                <span>${modulo.renderItem(item)}</span>
                <button class="btn-reactivar" onclick="restaurarItem('${tipo}', ${id})">♻️ Restaurar</button>
            `;
            lista.appendChild(li);
        });

    } catch (error) {
        console.error("Error al cargar eliminados:", error);
        lista.innerHTML = "<li>No se pudo conectar con el servidor.</li>";
    }
}

// ---- Restaurar elemento ----
async function restaurarItem(tipo, id) {
    if (!confirm("¿Restaurar este elemento?")) return;

    const modulo = MODULOS_PAPELERA[tipo];

    try {
        const respuesta = await fetch(modulo.restaurarUrl(id), {
            method: "PATCH",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${getTokenPap()}`
            }
        });

        const datos = await respuesta.json();

        if (!respuesta.ok || !datos.exito) {
            alert(datos.mensaje || "Error al restaurar el elemento.");
            return;
        }

        // Recargar la lista del tipo actual
        await cargarEliminados(tipo);

        // Recargar el módulo correspondiente para que aparezca de nuevo
        switch (tipo) {
            case "categorias": if (typeof cargarCategorias === "function") cargarCategorias(); break;
            case "productos": if (typeof cargarProductos === "function") cargarProductos(); break;
            case "usuarios": if (typeof cargarUsuarios === "function") cargarUsuarios(); break;
            case "mesas": if (typeof cargarMesas === "function") cargarMesas(); break;
        }

    } catch (error) {
        console.error("Error al restaurar:", error);
        alert("No se pudo conectar con el servidor.");
    }
}

// ---- Llenar el desplegable con los módulos ----
function inicializarSelectPapelera() {
    const select = document.getElementById("select-tipo-recuperar");
    select.innerHTML = '<option value="" disabled selected>Seleccionar tipo</option>';

    Object.entries(MODULOS_PAPELERA).forEach(([key, modulo]) => {
        const option = document.createElement("option");
        option.value = key;
        option.textContent = modulo.label;
        select.appendChild(option);
    });

    // Evento al cambiar selección
    select.addEventListener("change", (e) => {
        if (e.target.value) cargarEliminados(e.target.value);
    });
}

// ---- Init ----
document.addEventListener("DOMContentLoaded", () => {
    inicializarSelectPapelera();
});