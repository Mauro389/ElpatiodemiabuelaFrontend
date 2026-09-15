// =============================================
//   MÓDULO CATEGORÍAS
// =============================================

const API_BASE_CAT = "https://patiocampestre-bxf9hkbqcphpfpan.centralus-01.azurewebsites.net";

function getToken() {
    return localStorage.getItem("token");
}

async function cargarCategorias() {
    const lista = document.getElementById("lista-categorias");
    lista.innerHTML = "<li>Cargando...</li>";

    try {
        const respuesta = await fetch(`${API_BASE_CAT}/api/Categorias/activos`, {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${getToken()}`
            }
        });

        const datos = await respuesta.json();

        if (!respuesta.ok || !datos.exito) {
            lista.innerHTML = "<li>Error al cargar categorías.</li>";
            return;
        }

        const categorias = datos.datos;

        if (categorias.length === 0) {
            lista.innerHTML = "<li>No hay categorías registradas.</li>";
            return;
        }

        lista.innerHTML = "";
        categorias.forEach(cat => {
            lista.appendChild(crearItemCategoria(cat));
        });

    } catch (error) {
        console.error("Error al cargar categorías:", error);
        lista.innerHTML = "<li>No se pudo conectar con el servidor.</li>";
    }
}

function crearItemCategoria(cat) {
    const li = document.createElement("li");
    li.classList.add("item-crud");
    li.dataset.id = cat.id_categoria;

    li.innerHTML = `
        <span class="nombre-item">${cat.nombre}</span>
        <div class="acciones-item">
            <button class="btn-editar" onclick="activarEdicionCategoria(${cat.id_categoria}, '${cat.nombre}', this)">✏️</button>
            <button class="btn-eliminar" onclick="eliminarCategoria(${cat.id_categoria})">🗑️</button>
        </div>
    `;

    return li;
}

async function agregarCategoria() {
    const input = document.getElementById("input-nombre-categoria");
    const nombre = input.value.trim();

    if (!nombre) {
        alert("Por favor escribe el nombre de la categoría.");
        return;
    }

    const btnAgregar = document.getElementById("btn-agregar-categoria");
    btnAgregar.disabled = true;
    btnAgregar.textContent = "Agregando...";

    try {
        const respuesta = await fetch(`${API_BASE_CAT}/api/Categorias`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${getToken()}`
            },
            body: JSON.stringify({
                id_categoria: 0,
                nombre: nombre,
                activo: true
            })
        });

        const datos = await respuesta.json();

        if (!respuesta.ok || !datos.exito) {
            alert(datos.mensaje || "Error al agregar la categoría.");
            return;
        }

        input.value = "";
        await cargarCategorias();

        // Notificar a productos que recargue el select
        document.dispatchEvent(new CustomEvent("categoriaActualizada"));

    } catch (error) {
        console.error("Error al agregar categoría:", error);
        alert("No se pudo conectar con el servidor.");
    } finally {
        btnAgregar.disabled = false;
        btnAgregar.textContent = "Agregar";
    }
}

function activarEdicionCategoria(id, nombreActual, btnEditar) {
    const li = btnEditar.closest(".item-crud");
    const spanNombre = li.querySelector(".nombre-item");

    if (li.classList.contains("editando")) {
        spanNombre.textContent = nombreActual;
        li.classList.remove("editando");
        btnEditar.textContent = "✏️";
        return;
    }

    li.classList.add("editando");
    btnEditar.textContent = "✖️";

    const inputEdicion = document.createElement("input");
    inputEdicion.type = "text";
    inputEdicion.classList.add("campo", "input-edicion");
    inputEdicion.value = nombreActual;

    const btnGuardar = document.createElement("button");
    btnGuardar.textContent = "💾";
    btnGuardar.classList.add("btn-guardar");
    btnGuardar.onclick = () => guardarEdicionCategoria(id, inputEdicion, li, btnEditar, nombreActual);

    spanNombre.replaceWith(inputEdicion);
    li.querySelector(".acciones-item").prepend(btnGuardar);
}

async function guardarEdicionCategoria(id, inputEdicion, li, btnEditar, nombreOriginal) {
    const nuevoNombre = inputEdicion.value.trim();

    if (!nuevoNombre) {
        alert("El nombre no puede estar vacío.");
        return;
    }

    try {
        const respuesta = await fetch(`${API_BASE_CAT}/api/Categorias/${id}`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${getToken()}`
            },
            body: JSON.stringify({
                id_categoria: id,
                nombre: nuevoNombre,
                activo: true
            })
        });

        const datos = await respuesta.json();

        if (!respuesta.ok || !datos.exito) {
            alert(datos.mensaje || "Error al editar la categoría.");
            return;
        }

        await cargarCategorias();

        // Notificar a productos que recargue el select
        document.dispatchEvent(new CustomEvent("categoriaActualizada"));

    } catch (error) {
        console.error("Error al editar categoría:", error);
        alert("No se pudo conectar con el servidor.");
    }
}

async function eliminarCategoria(id) {
    if (!confirm("¿Seguro que deseas eliminar esta categoría?")) return;

    try {
        const respuesta = await fetch(`${API_BASE_CAT}/api/Categorias/${id}`, {
            method: "DELETE",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${getToken()}`
            }
        });

        const datos = await respuesta.json();

        if (!respuesta.ok || !datos.exito) {
            alert(datos.mensaje || "Error al eliminar la categoría.");
            return;
        }

        await cargarCategorias();

        // Notificar a productos que recargue el select
        document.dispatchEvent(new CustomEvent("categoriaActualizada"));

    } catch (error) {
        console.error("Error al eliminar categoría:", error);
        alert("No se pudo conectar con el servidor.");
    }
}

document.addEventListener("DOMContentLoaded", () => {
    cargarCategorias();

    document.getElementById("btn-agregar-categoria")
        .addEventListener("click", agregarCategoria);

    document.getElementById("input-nombre-categoria")
        .addEventListener("keydown", (e) => {
            if (e.key === "Enter") agregarCategoria();
        });

    document.getElementById("buscador-categorias").addEventListener("input", (e) => {
        const texto = e.target.value.toLowerCase();
        document.querySelectorAll("#lista-categorias .item-crud").forEach(item => {
            const nombre = item.querySelector(".nombre-item").textContent.toLowerCase();
            item.style.display = nombre.includes(texto) ? "" : "none";
        });
    });
});