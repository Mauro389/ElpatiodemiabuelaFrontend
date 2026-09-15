// =============================================
//   ORDENES - Patio Campestre
// =============================================
import OrdenesService from '../../shared/services/ordenes.services.js';

const ordenesService = new OrdenesService();

// ---- EVENTOS DE BOTONES DE ACCIÓN (DELEGACIÓN) ----
document.addEventListener('click', (e) => {
    if (e.target.classList.contains('btn-accion')) {
        const accion = e.target.dataset.accion;
        const tarjeta = e.target.closest('.tarjeta-orden');
        if (!tarjeta) return;
        const idOrden = tarjeta.querySelector('.num-orden')?.textContent.replace('#', '');
        if (!idOrden) return;

        if (accion === 'facturar') {
            abrirModalFacturacion(idOrden);
        } else {
            cambiarEstadoNormal(idOrden, accion);
        }
    }
});

// ---- CARGA INICIAL Y PERMISOS ----
document.addEventListener("DOMContentLoaded", () => {
    const token = localStorage.getItem("token");
    const rol = parseInt(localStorage.getItem("rol"));
    // Redirigir al login si no hay token o rol inválido
    if (!token || isNaN(rol)) {
        window.location.href = "../secure/index.html"; // ✅ RUTA CORREGIDA
        return;
    }

    aplicarPermisosNav(rol);
    cargarOrdenes();
    setInterval(cargarOrdenes, 10000);

    document.getElementById("btn-salir-ordenes").addEventListener("click", (e) => {
        e.preventDefault();
        localStorage.clear();
        window.location.href = "../secure/index.html"; // ✅ RUTA CORREGIDA
    });
});

// ---- CARGAR ÓRDENES ----
async function cargarOrdenes() {
    try {
        const ordenes = await ordenesService.obtenerOrdenesActivas();
        console.log('📦 Órdenes recibidas:', ordenes); // 🔍 Depuración

        // Limpiar columnas
        document.getElementById('lista-recibida').innerHTML = '';
        document.getElementById('lista-preparacion').innerHTML = '';
        document.getElementById('lista-entregada').innerHTML = '';

        if (!ordenes || ordenes.length === 0) {
            ['lista-recibida', 'lista-preparacion', 'lista-entregada'].forEach(id => {
                document.getElementById(id).innerHTML = `<div class="mensaje-vacio">No hay órdenes</div>`;
            });
            return;
        }

        for (const orden of ordenes) {
            const tarjeta = await crearTarjeta(orden);
            let idContenedor = `lista-${orden.estado.toLowerCase()}`;
            // Normalizar estados
            if (orden.estado === "EnProceso") idContenedor = "lista-preparacion";
            else if (orden.estado === "Lista") idContenedor = "lista-entregada";
            else if (orden.estado === "recibida") idContenedor = "lista-recibida";

            const contenedor = document.getElementById(idContenedor);
            if (contenedor) contenedor.appendChild(tarjeta);
        }
        
        resaltarOrdenPorUrl();
    } catch (e) {
        console.error("Error al cargar órdenes:", e);
        ['lista-recibida', 'lista-preparacion', 'lista-entregada'].forEach(id => {
            document.getElementById(id).innerHTML = `<div class="mensaje-vacio">Error: ${e.message}</div>`;
        });
    }
}

// ---- RESALTAR ORDEN POR URL (AGREGAR ESTA FUNCIÓN) ----
function resaltarOrdenPorUrl() {
    const urlParams = new URLSearchParams(window.location.search);
    const idFromUrl = urlParams.get('id');

    if (idFromUrl) {
        sessionStorage.setItem('ordenDestacada', idFromUrl);
        window.history.replaceState({}, document.title, window.location.pathname);
    }

    const idOrden = sessionStorage.getItem('ordenDestacada');

    if (idOrden) {
        const tarjeta = document.querySelector(`.tarjeta-orden[data-id="${idOrden}"]`);
        if (tarjeta) {
            tarjeta.classList.add('indicador-mesero');
            tarjeta.scrollIntoView({ behavior: 'smooth', block: 'center' });
            setTimeout(() => {
                tarjeta.classList.remove('indicador-mesero');
                sessionStorage.removeItem('ordenDestacada');
            }, 10000);
        }
    }
}

// ---- CREAR TARJETA ----
async function crearTarjeta(orden) {
    const template = document.getElementById('template-tarjeta-orden');
    const clone = template.content.cloneNode(true);
    const rol = parseInt(localStorage.getItem("rol"));
    const tienePermisoAtender = (rol === 4 || rol === 1);

    const tarjetaDiv = clone.querySelector('.tarjeta-orden');
    tarjetaDiv.dataset.id = orden.id_orden;
    clone.querySelector('.num-orden').textContent = `#${orden.id_orden}`;

    // Obtener datos de la mesa
    try {
        const mesa = await ordenesService.obtenerMesa(orden.id_mesa);
        clone.querySelector('.mesa-orden').textContent = `Mesa #${mesa.numero_mesa}`;
    } catch (e) {
        clone.querySelector('.mesa-orden').textContent = `Mesa ${orden.id_mesa}`;
    }

    clone.querySelector('.hora-orden').textContent = new Date(orden.fecha_apertura).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    // Obtener detalle de la orden
    const items = await ordenesService.obtenerDetalleOrden(orden.id_orden);
    const lista = clone.querySelector('.lista-items-orden');
    
    const estadoOrden = orden.estado.toLowerCase();
    const idsItemsOriginales = items.map(i => i.id_detalle).sort((a, b) => a - b);
    const idMinimo = idsItemsOriginales.length > 0 ? idsItemsOriginales[0] : 0;

    if (items.length > 0) {
        [...items].reverse().forEach(item => {
            const li = document.createElement('li');
            
            const esNuevo = (estadoOrden === 'lista' && 
                             item.estado_item && 
                             item.estado_item.toLowerCase() === 'pendiente' && 
                             item.id_detalle > idMinimo);
            
            li.style.cssText = "display: flex; justify-content: space-between; align-items: center; padding: 4px 0;";
            
            li.innerHTML = `
                <span style="display: flex; align-items: center;">
                    ${(esNuevo && tienePermisoAtender) 
                        ? `<button onclick="marcarItemAtendido(${item.id_detalle})" style="width:12px; height:12px; background-color:red; border-radius:50%; border:none; cursor:pointer; margin-right:8px;" title="Marcar como atendido"></button>` 
                        : ''}
                    ${item.nombreProducto}
                </span> 
                <span>${item.cantidad}x</span>
            `;
            lista.appendChild(li);
        });
    }

    // Botones según rol y estado
    const btnPreparar = clone.querySelector('[data-accion="preparar"]');
    const btnEntregar = clone.querySelector('[data-accion="entregar"]');
    const btnFacturar = clone.querySelector('[data-accion="facturar"]');

    btnPreparar.style.display = 'none';
    btnEntregar.style.display = 'none';
    btnFacturar.style.display = 'none';

    if (rol === 1) {
        if (estadoOrden === 'recibida') btnPreparar.style.display = 'inline-block';
        if (estadoOrden === 'enproceso') btnEntregar.style.display = 'inline-block';
        if (estadoOrden === 'lista') btnFacturar.style.display = 'inline-block';
    } else if (rol === 4) {
        if (estadoOrden === 'recibida') btnPreparar.style.display = 'inline-block';
        if (estadoOrden === 'enproceso') btnEntregar.style.display = 'inline-block';
    } else if (rol === 3) {
        if (estadoOrden === 'lista') btnFacturar.style.display = 'inline-block';
    }

    return clone;
}

async function cambiarEstadoNormal(id, accion) {
    const mapa = { 'preparar': 'EnProceso', 'entregar': 'Lista' };
    try {
        await ordenesService.cambiarEstadoOrden(id, mapa[accion]);
        cargarOrdenes();
    } catch (e) {
        console.error("Error al cambiar estado:", e);
        alert("Acceso denegado o error en el servidor.");
    }
}

// ---- MARCAR ÍTEM COMO ATENDIDO ----
window.marcarItemAtendido = async function(idDetalle) {
    if (!confirm("¿Marcar este ítem como atendido?")) return;
    try {
        await ordenesService.marcarItemAtendido(idDetalle);
        cargarOrdenes();
    } catch (e) {
        console.error("Error al marcar como atendido:", e);
        alert("No se pudo actualizar el estado del ítem.");
    }
};

// ---- ABRIR MODAL DE FACTURACIÓN ----
async function abrirModalFacturacion(id) {
    const modal = document.getElementById('modal-facturacion');
    const lista = document.getElementById('lista-detalle-modal');
    modal.style.display = 'block';

    // Obtener detalle de la orden
    const items = await ordenesService.obtenerDetalleOrden(id);
    lista.innerHTML = '';
    let subtotalCalculado = 0;

    items.forEach(item => {
        const subtotalItem = item.cantidad * item.precio_al_momento;
        subtotalCalculado += subtotalItem;
        lista.innerHTML += `
            <li style="display:flex; justify-content:space-between; align-items:center; padding: 6px 0; border-bottom: 1px solid rgba(255,255,255,0.07);">
                <span style="flex:1;">${item.nombreProducto}</span>
                <span style="width:40px; text-align:center; color:rgba(255,255,255,0.6);">${item.cantidad}x</span>
                <span style="width:70px; text-align:right; color:rgba(255,255,255,0.6);">C$ ${item.precio_al_momento}</span>
                <span style="width:80px; text-align:right; color:#ff9b6b; font-weight:600;">C$ ${subtotalItem}</span>
            </li>
        `;
    });

    lista.innerHTML += `
        <li style="display:flex; justify-content:space-between; padding: 10px 0 4px 0; border-top: 1px solid rgba(255,255,255,0.15); margin-top:6px;">
            <span style="font-weight:600;">Subtotal</span>
            <span style="color:#ff9b6b; font-weight:700;">C$ ${subtotalCalculado.toFixed(2)}</span>
        </li>
        <li style="display:flex; justify-content:space-between; padding: 2px 0;">
            <span style="color:rgba(255,255,255,0.6); font-size:12px;">IVA (15%)</span>
            <span style="color:rgba(255,255,255,0.6); font-size:12px;">C$ ${(subtotalCalculado * 0.15).toFixed(2)}</span>
        </li>
    `;

    // Obtener datos de la orden (mesa, mesero) usando el servicio
    let nombreMesero = '';
    let idMeseroGuardado = null;
    let nombreMesa = '';
    let idMesaGuardado = null;

    try {
        const orden = await ordenesService.obtenerOrdenPorId(id);
        idMesaGuardado = orden.id_mesa;
        idMeseroGuardado = orden.id_mesero;

        const mesa = await ordenesService.obtenerMesa(idMesaGuardado);
        nombreMesa = String(mesa.numero_mesa);

        if (idMeseroGuardado) {
            try {
                const mesero = await ordenesService.obtenerUsuario(idMeseroGuardado);
                nombreMesero = mesero.nombre_completo;
            } catch (e) {
                console.error("Error obteniendo mesero:", e);
            }
        }
    } catch (e) {
        console.error("Error obteniendo datos de la orden:", e);
    }

    // ---- EVENTOS DEL MODAL ----
    document.getElementById('btn-pre-factura').onclick = () => {
        imprimirPreFactura(id, items, nombreMesa, nombreMesero, subtotalCalculado);
    };

    document.getElementById('btn-confirmar-factura').onclick = async () => {
        const propina = parseFloat(document.getElementById('input-propina').value || 0);
        const metodoPago = document.getElementById('select-metodo-pago').value;

        const cuerpo = {
            id_factura: 0,
            id_orden: parseInt(id),
            id_mesero_atendiente: idMeseroGuardado || 2,
            id_cajero_cobrador: parseInt(localStorage.getItem("idUsuario") || 3),
            fecha_emision: new Date().toISOString(),
            metodo_pago: metodoPago,
            subtotal: 0,
            monto_impuestos: 0,
            monto_propina: propina,
            monto_total: 0,
            numero_factura_fiscal: "PENDIENTE",
            activo: true,
            nombreMesa: nombreMesa,
            nombreMesero: nombreMesero,
            nombreCajero: "Cajero",
            detalleItems: items
        };

        try {
            const dataFactura = await ordenesService.generarFactura(cuerpo);
            const match = dataFactura.mensaje ? dataFactura.mensaje.match(/Factura #(\d+)/) : null;
            const idFactura = dataFactura?.datos?.id_factura || (match ? match[1] : null);

            if (idFactura) {
                if (idMesaGuardado) {
                    await ordenesService.cambiarEstadoMesa(idMesaGuardado, "disponible");
                }

                await ordenesService.cambiarEstadoOrden(id, "Cerrada");

                const blob = await ordenesService.descargarPDFFactura(idFactura);
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `Factura_${idFactura}.pdf`;
                document.body.appendChild(a);
                a.click();
                a.remove();
                modal.style.display = 'none';
                cargarOrdenes();
            } else {
                alert("Factura generada, pero no se pudo obtener el ID.");
            }
        } catch (e) {
            console.error("Error crítico:", e);
            alert("Error al facturar: " + e.message);
        }
    };

    document.getElementById('btn-cancelar-factura').onclick = () => modal.style.display = 'none';
}

// ---- IMPRIMIR PRE-FACTURA ----
function imprimirPreFactura(idOrden, items, nombreMesa, nombreMesero, subtotal) {
    const iva = subtotal * 0.15;
    const total = subtotal + iva;
    const fecha = new Date().toLocaleString("es-NI", {
        day: "2-digit", month: "2-digit", year: "numeric",
        hour: "2-digit", minute: "2-digit"
    });

    const filas = items.map(item => {
        const sub = item.cantidad * item.precio_al_momento;
        return `
            <tr>
                <td>${item.nombreProducto}</td>
                <td style="text-align:center;">${item.cantidad}</td>
                <td style="text-align:right;">C$ ${item.precio_al_momento.toFixed(2)}</td>
                <td style="text-align:right;">C$ ${sub.toFixed(2)}</td>
            </tr>
        `;
    }).join('');

    const ventana = window.open('', '_blank', 'width=400,height=600');
    ventana.document.write(`
        <!DOCTYPE html>
        <html lang="es">
        <head>
            <meta charset="UTF-8">
            <title>Pre-Factura #${idOrden}</title>
            <style>
                * { margin: 0; padding: 0; box-sizing: border-box; }
                body {
                    font-family: 'Courier New', monospace;
                    font-size: 13px;
                    padding: 20px;
                    max-width: 350px;
                    margin: 0 auto;
                    color: #000;
                }
                .centro { text-align: center; }
                .titulo { font-size: 16px; font-weight: bold; margin: 8px 0; }
                .linea { border-top: 1px dashed #000; margin: 8px 0; }
                table { width: 100%; border-collapse: collapse; margin: 8px 0; }
                th { font-weight: bold; border-bottom: 1px solid #000; padding: 4px 2px; font-size: 12px; }
                td { padding: 4px 2px; font-size: 12px; }
                .totales { margin-top: 8px; }
                .totales div { display: flex; justify-content: space-between; padding: 2px 0; }
                .total-final { font-weight: bold; font-size: 15px; border-top: 2px solid #000; padding-top: 6px; margin-top: 4px; }
                .borrador { text-align: center; font-size: 11px; color: #666; margin-top: 16px; border: 1px dashed #999; padding: 6px; border-radius: 4px; }
                @media print { .no-print { display: none; } }
            </style>
        </head>
        <body>
            <div class="centro">
                <div class="titulo">EL PATIO DE MI ABUELA</div>
                <div>PRE-FACTURA / BORRADOR</div>
                <div style="font-size:11px; margin-top:4px;">${fecha}</div>
            </div>
            <div class="linea"></div>
            <div>Orden: #${idOrden}</div>
            <div>Mesa: ${nombreMesa || '—'}</div>
            <div>Mesero: ${nombreMesero || '—'}</div>
            <div class="linea"></div>
            <table>
                <thead>
                    <tr>
                        <th style="text-align:left;">Producto</th>
                        <th style="text-align:center;">Cant</th>
                        <th style="text-align:right;">P.U.</th>
                        <th style="text-align:right;">Total</th>
                    </tr>
                </thead>
                <tbody>${filas}</tbody>
            </table>
            <div class="linea"></div>
            <div class="totales">
                <div><span>Subtotal:</span><span>C$ ${subtotal.toFixed(2)}</span></div>
                <div><span>IVA (15%):</span><span>C$ ${iva.toFixed(2)}</span></div>
                <div class="total-final"><span>TOTAL:</span><span>C$ ${total.toFixed(2)}</span></div>
            </div>
            <div class="borrador">⚠️ Este documento es un borrador.<br>No tiene validez fiscal.</div>
            <div class="centro no-print" style="margin-top:20px;">
                <button onclick="window.print()" style="padding:10px 24px; font-size:14px; cursor:pointer; background:#1F497D; color:#fff; border:none; border-radius:8px;">🖨️ Imprimir</button>
            </div>
            <script>window.onload = () => window.print();</script>
        </body>
        </html>
    `);
    ventana.document.close();
}

// ---- RESTO DE FUNCIONES ----
// (Mantén idénticas: marcarItemAtendido, resaltarOrdenPorUrl, cambiarEstadoNormal, abrirModalFacturacion, imprimirPreFactura)

// ---- APLICAR PERMISOS EN NAV (CORREGIDO) ----
function aplicarPermisosNav(rol) {
    // Ocultar elementos según rol
    const enlaces = document.querySelectorAll('a.icono-nav');
    enlaces.forEach(enlace => {
        const href = enlace.getAttribute('href');
        if (!href) return;

        // Cocina (rol 4) solo ve Órdenes
        if (rol === 4) {
            if (href.includes('../main/menu.html') || href.includes('../admin/administracion.html')) {
                enlace.style.display = 'none';
            }
        } 
        // Mesero (rol 2) y Caja (rol 3) no ven Administración
        else if (rol === 2 || rol === 3) {
            if (href.includes('../admin/administracion.html')) {
                enlace.style.display = 'none';
            }
        }
    });
}