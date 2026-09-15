// =============================================
//   MENU - Patio Campestre
// =============================================

const API_BASE_MENU = "https://patiocampestre-bxf9hkbqcphpfpan.centralus-01.azurewebsites.net";

function getTokenMenu() { return localStorage.getItem("token"); }
function getIdUsuario() { return parseInt(localStorage.getItem("idUsuario")) || 0; }

const ROL_ADMINISTRADOR = 1;
const ROL_COCINA = 4;

let ordenActual = [];
let categoriaSeleccionada = null;
let todosLosProductos = [];
let mesasData = [];
let idOrdenMesaOcupada = null;

function verificarSesion() {
    const token = localStorage.getItem("token");
    const rol = parseInt(localStorage.getItem("rol"));
    if (!token || isNaN(rol)) { window.location.href = "../secure/index.html"; return false; }
    if (rol === ROL_COCINA) { window.location.href = "../orders/ordenes.html"; return false; }
    return true;
}

function aplicarPermisosNav() {
    const rol = parseInt(localStorage.getItem("rol"));
    const enlaceAdmin = document.querySelector('a[href="../admin/administracion.html"]');
    if (rol !== ROL_ADMINISTRADOR && enlaceAdmin) enlaceAdmin.style.display = "none";
}

async function cargarCategorias() {
    const contenedor = document.querySelector(".lista-categorias");
    contenedor.innerHTML = "<span>Cargando...</span>";
    try {
        const res = await fetch(`${API_BASE_MENU}/api/Categorias/activos`, {
            headers: { "Authorization": `Bearer ${getTokenMenu()}` }
        });
        const data = await res.json();
        if (!data.exito) { contenedor.innerHTML = "<span>Error al cargar.</span>"; return; }
        contenedor.innerHTML = "";
        const btnTodos = document.createElement("button");
        btnTodos.classList.add("btn-categoria", "activa");
        btnTodos.textContent = "Todos";
        btnTodos.addEventListener("click", () => {
            categoriaSeleccionada = null;
            document.querySelectorAll(".btn-categoria").forEach(b => b.classList.remove("activa"));
            btnTodos.classList.add("activa");
            filtrarProductosPorCategoria(null);
        });
        contenedor.appendChild(btnTodos);
        data.datos.forEach(cat => {
            const btn = document.createElement("button");
            btn.classList.add("btn-categoria");
            btn.textContent = cat.nombre;
            btn.dataset.id = cat.id_categoria;
            btn.addEventListener("click", () => {
                categoriaSeleccionada = cat.id_categoria;
                document.querySelectorAll(".btn-categoria").forEach(b => b.classList.remove("activa"));
                btn.classList.add("activa");
                filtrarProductosPorCategoria(cat.id_categoria);
            });
            contenedor.appendChild(btn);
        });
    } catch (e) {
        console.error("Error al cargar categorías:", e);
        contenedor.innerHTML = "<span>Error de conexión.</span>";
    }
}

async function cargarProductos() {
    const grid = document.querySelector(".grid-productos");
    grid.innerHTML = "<p>Cargando productos...</p>";
    try {
        const res = await fetch(`${API_BASE_MENU}/api/Productos/activos`, {
            headers: { "Authorization": `Bearer ${getTokenMenu()}` }
        });
        const data = await res.json();
        if (!data.exito) { grid.innerHTML = "<p>Error al cargar productos.</p>"; return; }
        todosLosProductos = data.datos;
        renderizarProductos(todosLosProductos);
    } catch (e) {
        console.error("Error al cargar productos:", e);
        grid.innerHTML = "<p>Error de conexión.</p>";
    }
}

function renderizarProductos(productos) {
    const grid = document.querySelector(".grid-productos");
    grid.innerHTML = "";
    if (productos.length === 0) {
        grid.innerHTML = "<p>No hay productos en esta categoría.</p>";
        return;
    }
    productos.forEach(prod => {
        const card = document.createElement("div");
        card.classList.add("card-producto");
        card.dataset.id = prod.id_producto;
        const sinStock = prod.es_inventariable && prod.stock_actual === 0;
        const stockBajo = prod.es_inventariable && prod.stock_actual > 0 && prod.stock_actual <= prod.stock_minimo;
        if (sinStock) {
            card.classList.add("card-agotado");
            card.innerHTML = `
                <div class="card-nombre">${prod.nombre}</div>
                <div class="card-precio">C$ ${prod.precio_unitario}</div>
                <div class="card-stock-badge agotado">❌ Agotado</div>
            `;
        } else {
            card.innerHTML = `
                <div class="card-nombre">${prod.nombre}</div>
                <div class="card-precio">C$ ${prod.precio_unitario}</div>
                ${stockBajo ? `<div class="card-stock-badge stock-bajo">⚠️ Stock bajo: ${prod.stock_actual}</div>` : ""}
            `;
            card.addEventListener("click", () => agregarAOrden(prod));
        }
        grid.appendChild(card);
    });
}

function filtrarProductosPorCategoria(idCategoria) {
    if (!idCategoria) { renderizarProductos(todosLosProductos); return; }
    renderizarProductos(todosLosProductos.filter(p => p.id_categoria === idCategoria));
}

async function cargarMesas() {
    const select = document.getElementById("select-mesa");
    select.innerHTML = '<option value="" disabled selected>Seleccionar mesa...</option>';
    mesasData = [];
    try {
        const res = await fetch(`${API_BASE_MENU}/api/Mesas/activos`, {
            headers: { "Authorization": `Bearer ${getTokenMenu()}` }
        });
        const data = await res.json();
        if (!data.exito) return;
        mesasData = data.datos;
        data.datos.forEach(mesa => {
            const option = document.createElement("option");
            option.value = mesa.id_mesa;
            const ocupada = mesa.estado.toLowerCase() === "ocupada";
            option.textContent = ocupada
                ? `Mesa #${mesa.numero_mesa} 🔴 ocupada`
                : `Mesa #${mesa.numero_mesa} - disponible`;
            select.appendChild(option);
        });
    } catch (e) { console.error("Error al cargar mesas:", e); }
}

async function alCambiarMesa(idMesa) {
    const mesa = mesasData.find(m => m.id_mesa === idMesa);
    const btnGenerar = document.querySelector(".btn-generar-orden");
    idOrdenMesaOcupada = null;
    ordenActual = [];
    renderizarOrden();

    if (!mesa) return;

    if (mesa.estado.toLowerCase() === "ocupada") {
        try {
            let ordenEncontrada = null;

            for (const estado of ["Recibida", "EnProceso", "Lista"]) {
                const res = await fetch(`${API_BASE_MENU}/api/Ordenes/buscar?id_mesa=${idMesa}&estado=${estado}`, {
                    headers: { "Authorization": `Bearer ${getTokenMenu()}` }
                });
                const data = await res.json();
                if (data.exito && data.datos?.length > 0) {
                    ordenEncontrada = data.datos[0];
                    break;
                }
            }

            if (ordenEncontrada) {
                idOrdenMesaOcupada = ordenEncontrada.id_orden;

                const resDet = await fetch(`${API_BASE_MENU}/api/DetalleOrdenes/orden/${idOrdenMesaOcupada}`, {
                    headers: { "Authorization": `Bearer ${getTokenMenu()}` }
                });
                const dataDet = await resDet.json();

                if (dataDet.exito && dataDet.datos?.length > 0) {
                    mostrarItemsExistentes(dataDet.datos);
                }

                btnGenerar.textContent = "➕ Agregar a Orden";
                btnGenerar.style.background = "linear-gradient(135deg, #2ecc71, #27ae60)";
            }
        } catch (e) {
            console.error("Error al buscar orden activa:", e);
        }
    } else {
        btnGenerar.textContent = "Generar Orden";
        btnGenerar.style.background = "";
    }
}

function mostrarItemsExistentes(items) {
    const contenedor = document.querySelector(".lista-items-orden");
    contenedor.innerHTML = "";

    const divInfo = document.createElement("div");
    divInfo.style.cssText = "padding: 8px; background: rgba(46,204,113,0.1); border-radius: 8px; margin-bottom: 8px; border: 1px solid rgba(46,204,113,0.3);";
    divInfo.innerHTML = `<p style="color:#2ecc71; font-size:11px; margin:0; text-align:center;">✅ Orden #${idOrdenMesaOcupada} activa — selecciona productos para agregar</p>`;
    contenedor.appendChild(divInfo);

    items.forEach(item => {
        const div = document.createElement("div");
        div.classList.add("item-orden");
        div.style.opacity = "0.6";
        div.innerHTML = `
            <span class="nombre-item-orden">${item.nombreProducto}</span>
            <span class="cantidad" style="padding: 0 8px;">${item.cantidad}x</span>
            <span class="precio-item-orden">C$ ${item.precio_al_momento * item.cantidad}</span>
        `;
        contenedor.appendChild(div);
    });
}

async function cambiarEstadoMesa(idMesa, nuevoEstado) {
    const mesa = mesasData.find(m => m.id_mesa === idMesa);
    if (!mesa) return;
    try {
        await fetch(`${API_BASE_MENU}/api/Mesas/${idMesa}`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${getTokenMenu()}`
            },
            body: JSON.stringify({
                id_mesa: mesa.id_mesa,
                numero_mesa: mesa.numero_mesa,
                estado: nuevoEstado,
                activo: true
            })
        });
    } catch (e) { console.error("Error al cambiar estado de mesa:", e); }
}

// =============================================
//   AGREGAR PRODUCTO A LA ORDEN (con validación de stock)
// =============================================
function agregarAOrden(prod) {
    if (prod.es_inventariable && prod.stock_actual === 0) {
        alert(`❌ "${prod.nombre}" está agotado.`);
        return;
    }

    const existente = ordenActual.find(item => item.id_producto === prod.id_producto);
    const cantidadActual = existente ? existente.cantidad : 0;

    // ← Validar que no supere el stock disponible
    if (prod.es_inventariable && cantidadActual + 1 > prod.stock_actual) {
        alert(`⚠️ No hay suficiente stock de "${prod.nombre}".\nStock disponible: ${prod.stock_actual} unidad(es).`);
        return;
    }

    if (existente) {
        existente.cantidad++;
    } else {
        ordenActual.push({
            id_producto: prod.id_producto,
            nombre: prod.nombre,
            precio: prod.precio_unitario,
            cantidad: 1,
            stock_actual: prod.stock_actual,
            es_inventariable: prod.es_inventariable
        });
    }

    if (idOrdenMesaOcupada) {
        renderizarOrdenConExistentes();
    } else {
        renderizarOrden();
    }
}

function renderizarOrdenConExistentes() {
    const contenedor = document.querySelector(".lista-items-orden");
    contenedor.innerHTML = "";

    const divInfo = document.createElement("div");
    divInfo.style.cssText = "padding: 8px; background: rgba(46,204,113,0.1); border-radius: 8px; margin-bottom: 8px; border: 1px solid rgba(46,204,113,0.3);";
    divInfo.innerHTML = `<p style="color:#2ecc71; font-size:11px; margin:0; text-align:center;">✅ Orden #${idOrdenMesaOcupada} activa</p>`;
    contenedor.appendChild(divInfo);

    if (ordenActual.length > 0) {
        const divNuevos = document.createElement("div");
        divNuevos.style.cssText = "padding: 6px 4px; font-size:11px; color:rgba(255,255,255,0.5); margin-bottom:4px;";
        divNuevos.textContent = "Nuevos items a agregar:";
        contenedor.appendChild(divNuevos);

        let total = 0;
        ordenActual.forEach(item => {
            const subtotal = item.precio * item.cantidad;
            total += subtotal;
            const div = document.createElement("div");
            div.classList.add("item-orden");
            div.innerHTML = `
                <span class="nombre-item-orden">${item.nombre}</span>
                <div class="controles-cantidad">
                    <button class="btn-cantidad" onclick="cambiarCantidad(${item.id_producto}, -1)">−</button>
                    <span class="cantidad">${item.cantidad}</span>
                    <button class="btn-cantidad" onclick="cambiarCantidad(${item.id_producto}, 1)">+</button>
                </div>
                <span class="precio-item-orden">C$ ${subtotal}</span>
                <button class="btn-quitar" onclick="quitarDeOrden(${item.id_producto})">🗑️</button>
            `;
            contenedor.appendChild(div);
        });

        const divTotal = document.createElement("div");
        divTotal.classList.add("total-orden");
        divTotal.innerHTML = `<strong>A agregar: C$ ${total}</strong>`;
        contenedor.appendChild(divTotal);
    }
}

function renderizarOrden() {
    const contenedor = document.querySelector(".lista-items-orden");
    if (ordenActual.length === 0) {
        contenedor.innerHTML = '<p class="mensaje-vacio">Selecciona productos para agregar...</p>';
        return;
    }
    contenedor.innerHTML = "";
    let total = 0;
    ordenActual.forEach(item => {
        const subtotal = item.precio * item.cantidad;
        total += subtotal;
        const div = document.createElement("div");
        div.classList.add("item-orden");
        div.innerHTML = `
            <span class="nombre-item-orden">${item.nombre}</span>
            <div class="controles-cantidad">
                <button class="btn-cantidad" onclick="cambiarCantidad(${item.id_producto}, -1)">−</button>
                <span class="cantidad">${item.cantidad}</span>
                <button class="btn-cantidad" onclick="cambiarCantidad(${item.id_producto}, 1)">+</button>
            </div>
            <span class="precio-item-orden">C$ ${subtotal}</span>
            <button class="btn-quitar" onclick="quitarDeOrden(${item.id_producto})">🗑️</button>
        `;
        contenedor.appendChild(div);
    });
    const divTotal = document.createElement("div");
    divTotal.classList.add("total-orden");
    divTotal.innerHTML = `<strong>Total: C$ ${total}</strong>`;
    contenedor.appendChild(divTotal);
}

// =============================================
//   CAMBIAR CANTIDAD (con validación de stock)
// =============================================
function cambiarCantidad(idProducto, delta) {
    const item = ordenActual.find(i => i.id_producto === idProducto);
    if (!item) return;

    // ← Validar stock al incrementar
    if (delta > 0 && item.es_inventariable) {
        if (item.cantidad + 1 > item.stock_actual) {
            alert(`⚠️ No hay suficiente stock de "${item.nombre}".\nStock disponible: ${item.stock_actual} unidad(es).`);
            return;
        }
    }

    item.cantidad += delta;
    if (item.cantidad <= 0) ordenActual = ordenActual.filter(i => i.id_producto !== idProducto);

    if (idOrdenMesaOcupada) {
        renderizarOrdenConExistentes();
    } else {
        renderizarOrden();
    }
}

function quitarDeOrden(idProducto) {
    ordenActual = ordenActual.filter(i => i.id_producto !== idProducto);
    if (idOrdenMesaOcupada) {
        renderizarOrdenConExistentes();
    } else {
        renderizarOrden();
    }
}

// =============================================
//   GENERAR ORDEN (con validación final de stock)
// =============================================
async function generarOrden() {
    const idMesa = parseInt(document.getElementById("select-mesa").value);
    if (isNaN(idMesa)) { alert("Por favor selecciona una mesa."); return; }
    if (ordenActual.length === 0) { alert("Agrega al menos un producto."); return; }

    // ← Validación final de stock antes de enviar
    for (const item of ordenActual) {
        if (item.es_inventariable && item.cantidad > item.stock_actual) {
            alert(`⚠️ Stock insuficiente para "${item.nombre}".\nCantidad solicitada: ${item.cantidad}\nStock disponible: ${item.stock_actual}`);
            return;
        }
    }

    const btnGenerar = document.querySelector(".btn-generar-orden");
    btnGenerar.disabled = true;
    btnGenerar.textContent = "Procesando...";

    try {
        if (idOrdenMesaOcupada) {
            for (const item of ordenActual) {
                await fetch(`${API_BASE_MENU}/api/DetalleOrdenes`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${getTokenMenu()}`
                    },
                    body: JSON.stringify({
                        id_detalle: 0,
                        id_orden: idOrdenMesaOcupada,
                        id_producto: item.id_producto,
                        cantidad: item.cantidad,
                        precio_al_momento: item.precio,
                        notas: "",
                        estado_item: "pendiente",
                        activo: true,
                        nombreProducto: item.nombre
                    })
                });
            }
            alert(`¡Productos agregados a la Orden #${idOrdenMesaOcupada} exitosamente!`);
        } else {
            const mesaSeleccionada = mesasData.find(m => m.id_mesa === idMesa);
            const nombreMesa = mesaSeleccionada ? `Mesa #${mesaSeleccionada.numero_mesa}` : "";

            const resOrden = await fetch(`${API_BASE_MENU}/api/Ordenes`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${getTokenMenu()}`
                },
                body: JSON.stringify({
                    id_orden: 0,
                    id_mesa: idMesa,
                    id_mesero: getIdUsuario(),
                    fecha_apertura: new Date().toISOString(),
                    estado: "recibida",
                    activo: true,
                    nombreMesa: nombreMesa,
                    nombreMesero: ""
                })
            });

            const dataOrden = await resOrden.json();
            if (!resOrden.ok || !dataOrden.exito) {
                alert(dataOrden.mensaje || "Error al generar la orden.");
                return;
            }

            const idOrden = parseInt(dataOrden.mensaje.match(/\d+/)[0]);

            for (const item of ordenActual) {
                await fetch(`${API_BASE_MENU}/api/DetalleOrdenes`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${getTokenMenu()}`
                    },
                    body: JSON.stringify({
                        id_detalle: 0,
                        id_orden: idOrden,
                        id_producto: item.id_producto,
                        cantidad: item.cantidad,
                        precio_al_momento: item.precio,
                        notas: "",
                        estado_item: "pendiente",
                        activo: true,
                        nombreProducto: item.nombre
                    })
                });
            }

            await cambiarEstadoMesa(idMesa, "ocupada");
            alert("¡Orden generada exitosamente!");
        }

        idOrdenMesaOcupada = null;
        ordenActual = [];
        renderizarOrden();
        document.getElementById("select-mesa").value = "";
        btnGenerar.textContent = "Generar Orden";
        btnGenerar.style.background = "";
        await cargarMesas();
        await cargarProductos();

    } catch (e) {
        console.error("Error:", e);
        alert("No se pudo conectar con el servidor.");
    } finally {
        btnGenerar.disabled = false;
    }
}

function cerrarSesion() {
    ["token", "rol", "nombre", "username", "idUsuario"].forEach(k => localStorage.removeItem(k));
    window.location.href = "../secure/index.html";
}

async function actualizarNotificaciones() {
    try {
        const res = await fetch(`${API_BASE_MENU}/api/Ordenes/activas`, {
            headers: { "Authorization": `Bearer ${getTokenMenu()}` }
        });
        const data = await res.json();
        if (!data.exito) return;

        const ordenesListas = data.datos.filter(o => o.estado.toLowerCase() === "lista");
        const badge = document.getElementById("campana-badge");
        if (ordenesListas.length > 0) {
            badge.textContent = ordenesListas.length;
            badge.style.display = "flex";
        } else {
            badge.style.display = "none";
        }

        const panelLista = document.getElementById("panel-noti-lista");
        panelLista.innerHTML = "";

        if (ordenesListas.length === 0) {
            panelLista.innerHTML = '<p class="noti-vacio">No hay órdenes listas</p>';
            return;
        }

        for (const orden of ordenesListas) {
            const hora = new Date(orden.fecha_apertura).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
            let nombreMesa = `Mesa ${orden.id_mesa}`;
            try {
                const resMesa = await fetch(`${API_BASE_MENU}/api/Mesas/${orden.id_mesa}`, {
                    headers: { "Authorization": `Bearer ${getTokenMenu()}` }
                });
                const dataMesa = await resMesa.json();
                if (dataMesa.exito && dataMesa.datos) {
                    nombreMesa = `Mesa #${dataMesa.datos.numero_mesa}`;
                }
            } catch (e) { }

            const div = document.createElement("div");
            div.classList.add("noti-item");
            div.innerHTML = `
                <span class="noti-item-titulo">Orden #${orden.id_orden}</span>
                <span class="noti-item-detalle">${nombreMesa} · ${hora}</span>
            `;
            // Cambio aplicado: se redirige incluyendo el ID
            div.addEventListener("click", () => { 
                window.location.href = `../orders/ordenes.html?id=${orden.id_orden}`; 
            });
            panelLista.appendChild(div);
        }
    } catch (e) {
        console.error("Error al actualizar notificaciones:", e);
    }
}

document.addEventListener("DOMContentLoaded", () => {
    if (!verificarSesion()) return;

    aplicarPermisosNav();
    cargarCategorias();
    cargarProductos();
    cargarMesas();

    document.querySelector(".btn-generar-orden").addEventListener("click", generarOrden);

    document.getElementById("btn-salir").addEventListener("click", (e) => {
        e.preventDefault();
        cerrarSesion();
    });

    document.getElementById("select-mesa").addEventListener("change", (e) => {
        const idMesa = parseInt(e.target.value);
        if (!isNaN(idMesa)) alCambiarMesa(idMesa);
    });

    document.getElementById("input-buscador-menu").addEventListener("input", (e) => {
        const texto = e.target.value.toLowerCase();
        const tipo = document.getElementById("select-tipo-busqueda").value;
        if (tipo === "productos") {
            document.querySelectorAll(".card-producto").forEach(card => {
                const nombre = card.querySelector(".card-nombre")?.textContent.toLowerCase();
                if (nombre) card.style.display = nombre.includes(texto) ? "" : "none";
            });
        } else {
            document.querySelectorAll(".btn-categoria").forEach(btn => {
                const nombre = btn.textContent.toLowerCase();
                btn.style.display = nombre.includes(texto) ? "" : "none";
            });
        }
    });

    document.getElementById("select-tipo-busqueda").addEventListener("change", () => {
        document.getElementById("input-buscador-menu").value = "";
        document.querySelectorAll(".card-producto").forEach(c => c.style.display = "");
        document.querySelectorAll(".btn-categoria").forEach(b => b.style.display = "");
    });

    document.getElementById("campana-contenedor").addEventListener("click", (e) => {
        e.stopPropagation();
        const panel = document.getElementById("panel-notificaciones");
        panel.style.display = panel.style.display === "none" ? "block" : "none";
    });

    document.addEventListener("click", () => {
        const panel = document.getElementById("panel-notificaciones");
        if (panel) panel.style.display = "none";
    });

    actualizarNotificaciones();
    setInterval(actualizarNotificaciones, 10000);
});