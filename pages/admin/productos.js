// =============================================
//   MÓDULO PRODUCTOS
// =============================================

const API_BASE_PROD = "https://patiocampestre-bxf9hkbqcphpfpan.centralus-01.azurewebsites.net";

function getTokenProd() {
    return localStorage.getItem("token");
}

async function cargarProductos() {
    const lista = document.getElementById("lista-productos");
    lista.innerHTML = "<li>Cargando...</li>";

    try {
        const respuesta = await fetch(`${API_BASE_PROD}/api/Productos/activos`, {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${getTokenProd()}`
            }
        });

        const datos = await respuesta.json();

        if (!respuesta.ok || !datos.exito) {
            lista.innerHTML = "<li>Error al cargar productos.</li>";
            return;
        }

        const productos = datos.datos;

        if (productos.length === 0) {
            lista.innerHTML = "<li>No hay productos registrados.</li>";
            return;
        }

        lista.innerHTML = "";
        productos.forEach(prod => {
            lista.appendChild(crearItemProducto(prod));
        });

    } catch (error) {
        console.error("Error al cargar productos:", error);
        lista.innerHTML = "<li>No se pudo conectar con el servidor.</li>";
    }
}

function crearItemProducto(prod) {
    const li = document.createElement("li");
    li.classList.add("item-crud");
    li.dataset.id = prod.id_producto;
    li.dataset.idCategoria = prod.id_categoria; // ← CLAVE: guardar id real

    const selectCat = document.getElementById("select-categorias-producto");
    const opcion = selectCat.querySelector(`option[value="${prod.id_categoria}"]`);
    const nombreCat = opcion ? opcion.textContent : `Cat: ${prod.id_categoria}`;

    const inventariableTexto = prod.es_inventariable
        ? `Stock actual: ${prod.stock_actual} | Stock mín: ${prod.stock_minimo}`
        : "No inventariable";

    const alertaStock = prod.es_inventariable && prod.stock_actual <= prod.stock_minimo
        ? `<span class="alerta-stock">⚠️ Stock bajo</span>`
        : "";

    li.innerHTML = `
        <span class="nombre-item">${prod.nombre}</span>
        <span class="detalle-item">$${prod.precio_unitario} | ${nombreCat} | ${inventariableTexto} ${alertaStock}</span>
        <div class="acciones-item">
            <button class="btn-editar" onclick="activarEdicionProducto(${prod.id_producto}, ${prod.stock_actual}, ${prod.stock_minimo}, ${prod.es_inventariable}, this)">✏️</button>
            <button class="btn-eliminar" onclick="eliminarProducto(${prod.id_producto})">🗑️</button>
        </div>
    `;

    return li;
}

async function agregarProducto() {
    const nombre = document.getElementById("input-nombre-producto").value.trim();
    const precio = parseFloat(document.getElementById("input-precio-producto").value);
    const idCategoria = parseInt(document.getElementById("select-categorias-producto").value);
    const inventariable = document.getElementById("select-inventario").value === "si";

    let stockActual = 0;
    let stockMinimo = 0;

    if (inventariable) {
        stockActual = parseInt(document.getElementById("input-stock-actual").value) || 0;
        stockMinimo = parseInt(document.getElementById("input-stock-minimo").value) || 0;
    }

    if (!nombre) { alert("Por favor escribe el nombre del producto."); return; }
    if (isNaN(precio) || precio <= 0) { alert("Por favor ingresa un precio válido."); return; }
    if (isNaN(idCategoria)) { alert("Por favor selecciona una categoría."); return; }

    const btnAgregar = document.getElementById("btn-agregar-producto");
    btnAgregar.disabled = true;
    btnAgregar.textContent = "Agregando...";

    try {
        const respuesta = await fetch(`${API_BASE_PROD}/api/Productos`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${getTokenProd()}`
            },
            body: JSON.stringify({
                id_producto: 0,
                id_categoria: idCategoria,
                nombre: nombre,
                precio_unitario: precio,
                es_inventariable: inventariable,
                stock_actual: stockActual,
                stock_minimo: stockMinimo,
                activo: true,
                nombreCategoria: ""
            })
        });

        const datos = await respuesta.json();

        if (!respuesta.ok) {
            alert(datos.mensaje || "Error al agregar el producto.");
            return;
        }

        document.getElementById("input-nombre-producto").value = "";
        document.getElementById("input-precio-producto").value = "";
        document.getElementById("select-categorias-producto").value = "";
        document.getElementById("select-inventario").value = "no";
        document.getElementById("campos-stock").style.display = "none";
        document.getElementById("input-stock-actual").value = "";
        document.getElementById("input-stock-minimo").value = "";

        await cargarProductos();

    } catch (error) {
        console.error("Error al agregar producto:", error);
        alert("No se pudo conectar con el servidor.");
    } finally {
        btnAgregar.disabled = false;
        btnAgregar.textContent = "Agregar";
    }
}

function activarEdicionProducto(id, stockActual, stockMinimo, esInventariable, btnEditar) {
    const li = btnEditar.closest(".item-crud");

    if (li.classList.contains("editando")) {
        li.classList.remove("editando");
        cargarProductos();
        return;
    }

    li.classList.add("editando");
    btnEditar.textContent = "✖️";

    const spanNombre = li.querySelector(".nombre-item");
    const spanDetalle = li.querySelector(".detalle-item");
    const nombreActual = spanNombre.textContent;
    const precioActual = spanDetalle.textContent.match(/\$([\d.]+)/)?.[1] || "0";

    // ← CORRECCIÓN: leer id_categoria desde dataset, no del texto
    const catActual = li.dataset.idCategoria || "0";

    const inputNombre = document.createElement("input");
    inputNombre.type = "text";
    inputNombre.classList.add("campo", "input-edicion");
    inputNombre.value = nombreActual;
    inputNombre.placeholder = "Nombre";

    const inputPrecio = document.createElement("input");
    inputPrecio.type = "number";
    inputPrecio.classList.add("campo", "input-edicion");
    inputPrecio.value = precioActual;
    inputPrecio.placeholder = "Precio";

    const selectInv = document.createElement("select");
    selectInv.classList.add("campo", "campo-small");
    selectInv.innerHTML = `
        <option value="no" ${!esInventariable ? "selected" : ""}>No inventariable</option>
        <option value="si" ${esInventariable ? "selected" : ""}>Inventariable</option>
    `;

    const divStock = document.createElement("div");
    divStock.style.cssText = `display:${esInventariable ? "flex" : "none"}; flex-direction:column; gap:8px; margin-top:6px;`;

    const labelStockActual = document.createElement("label");
    labelStockActual.textContent = "Stock actual:";
    labelStockActual.style.cssText = "font-size:11px; color:rgba(255,255,255,0.6);";

    const inputStockActual = document.createElement("input");
    inputStockActual.type = "number";
    inputStockActual.classList.add("campo", "input-edicion");
    inputStockActual.value = stockActual;
    inputStockActual.placeholder = "Stock actual";

    const labelStockMinimo = document.createElement("label");
    labelStockMinimo.textContent = "Stock mínimo:";
    labelStockMinimo.style.cssText = "font-size:11px; color:rgba(255,255,255,0.6);";

    const inputStockMinimo = document.createElement("input");
    inputStockMinimo.type = "number";
    inputStockMinimo.classList.add("campo", "input-edicion");
    inputStockMinimo.value = stockMinimo;
    inputStockMinimo.placeholder = "Stock mínimo";

    divStock.appendChild(labelStockActual);
    divStock.appendChild(inputStockActual);
    divStock.appendChild(labelStockMinimo);
    divStock.appendChild(inputStockMinimo);

    selectInv.addEventListener("change", () => {
        divStock.style.display = selectInv.value === "si" ? "flex" : "none";
    });

    const btnGuardar = document.createElement("button");
    btnGuardar.textContent = "💾";
    btnGuardar.classList.add("btn-guardar");
    btnGuardar.onclick = () => guardarEdicionProducto(
        id, inputNombre, inputPrecio, parseInt(catActual), selectInv,
        inputStockActual, inputStockMinimo
    );

    spanNombre.replaceWith(inputNombre);
    spanDetalle.replaceWith(inputPrecio);

    const accionesItem = li.querySelector(".acciones-item");
    accionesItem.before(selectInv);
    accionesItem.before(divStock);
    accionesItem.prepend(btnGuardar);
}

async function guardarEdicionProducto(id, inputNombre, inputPrecio, idCategoria, selectInv, inputStockActual, inputStockMinimo) {
    const nuevoNombre = inputNombre.value.trim();
    const nuevoPrecio = parseFloat(inputPrecio.value);
    const inventariable = selectInv.value === "si";
    const stockActual = inventariable ? parseInt(inputStockActual.value) || 0 : 0;
    const stockMinimo = inventariable ? parseInt(inputStockMinimo.value) || 0 : 0;

    if (!nuevoNombre) { alert("El nombre no puede estar vacío."); return; }
    if (isNaN(nuevoPrecio) || nuevoPrecio <= 0) { alert("Ingresa un precio válido."); return; }

    try {
        const respuesta = await fetch(`${API_BASE_PROD}/api/Productos/${id}`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${getTokenProd()}`
            },
            body: JSON.stringify({
                id_producto: id,
                id_categoria: idCategoria,
                nombre: nuevoNombre,
                precio_unitario: nuevoPrecio,
                es_inventariable: inventariable,
                stock_actual: stockActual,
                stock_minimo: stockMinimo,
                activo: true,
                nombreCategoria: ""
            })
        });

        const datos = await respuesta.json();

        if (!respuesta.ok) {
            alert(datos.mensaje || "Error al editar el producto.");
            return;
        }

        await cargarProductos();

    } catch (error) {
        console.error("Error al editar producto:", error);
        alert("No se pudo conectar con el servidor.");
    }
}

async function eliminarProducto(id) {
    if (!confirm("¿Seguro que deseas eliminar este producto?")) return;

    try {
        const respuesta = await fetch(`${API_BASE_PROD}/api/Productos/${id}`, {
            method: "DELETE",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${getTokenProd()}`
            }
        });

        const datos = await respuesta.json();

        if (!respuesta.ok) {
            alert(datos.mensaje || "Error al eliminar el producto.");
            return;
        }

        await cargarProductos();

    } catch (error) {
        console.error("Error al eliminar producto:", error);
        alert("No se pudo conectar con el servidor.");
    }
}

async function cargarCategoriasEnSelect() {
    const select = document.getElementById("select-categorias-producto");
    select.innerHTML = '<option value="" disabled selected>Asignar Categoría</option>';

    try {
        const respuesta = await fetch(`${API_BASE_PROD}/api/Categorias/activos`, {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${getTokenProd()}`
            }
        });

        const datos = await respuesta.json();
        if (!respuesta.ok || !datos.exito) return;

        datos.datos.forEach(cat => {
            const option = document.createElement("option");
            option.value = cat.id_categoria;
            option.textContent = cat.nombre;
            select.appendChild(option);
        });

    } catch (error) {
        console.error("Error al cargar categorías en select:", error);
    }
}

document.addEventListener("DOMContentLoaded", () => {
    cargarCategoriasEnSelect();
    cargarProductos();

    document.getElementById("btn-agregar-producto")
        .addEventListener("click", agregarProducto);

    document.getElementById("select-inventario").addEventListener("change", (e) => {
        const campos = document.getElementById("campos-stock");
        if (campos) campos.style.display = e.target.value === "si" ? "flex" : "none";
    });

    document.getElementById("buscador-productos").addEventListener("input", (e) => {
        const texto = e.target.value.toLowerCase();
        document.querySelectorAll("#lista-productos .item-crud").forEach(item => {
            const nombre = item.querySelector(".nombre-item")?.textContent.toLowerCase();
            if (nombre) item.style.display = nombre.includes(texto) ? "" : "none";
        });
    });

    document.addEventListener("categoriaActualizada", () => {
        cargarCategoriasEnSelect();
    });
});