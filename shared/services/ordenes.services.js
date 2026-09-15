// =============================================
//   ORDENES SERVICE - Patio Campestre
//   Contiene toda la comunicación con la API
// =============================================

import { OrdenesResponse } from '../models/response/ordenes.response.js';

const API_BASE = 'https://patiocampestre-bxf9hkbqcphpfpan.centralus-01.azurewebsites.net/api';

// Función auxiliar para obtener el token
function getAuthHeaders() {
    const token = localStorage.getItem('token');
    return {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
    };
}

// Función auxiliar para manejar respuestas y errores detallados
async function handleResponse(response) {
    if (response.status === 204) {
        return { exito: true, datos: [] };
    }

    if (!response.ok) {
        let errorMsg = `Error ${response.status}`;
        try {
            const errorData = await response.json();
            // Capturar errores de validación DTO (ASP.NET ValidationErrors)
            if (errorData.errors) {
                const detalles = Object.values(errorData.errors).flat().join(', ');
                errorMsg = `Error de validación (400): ${detalles}`;
            } else {
                errorMsg = errorData.mensaje || errorData.message || errorMsg;
            }
        } catch (e) {
            try {
                errorMsg = await response.text() || errorMsg;
            } catch (e2) {}
        }
        throw new Error(errorMsg);
    }

    const data = await response.json();
    console.log('📡 Respuesta de la API:', data);
    return data;
}

export default class OrdenesService {

    // 1. Obtener órdenes activas
    async obtenerOrdenesActivas() {
        const response = await fetch(`${API_BASE}/Ordenes/activas`, {
            headers: getAuthHeaders()
        });
        const result = await handleResponse(response);
        if (!result.exito) throw new Error(result.mensaje || 'Error al cargar órdenes');
        return result.datos ? result.datos.map(orden => OrdenesResponse.fromJson(orden)) : [];
    }

    // 2. Obtener detalle de una orden
    async obtenerDetalleOrden(idOrden) {
        const response = await fetch(`${API_BASE}/DetalleOrdenes/orden/${idOrden}`, {
            headers: getAuthHeaders()
        });
        const result = await handleResponse(response);
        if (!result.exito) throw new Error(result.mensaje || 'Error al cargar detalle');
        return result.datos || [];
    }

    // 3. Obtener datos de una mesa
    async obtenerMesa(idMesa) {
        const response = await fetch(`${API_BASE}/Mesas/${idMesa}`, {
            headers: getAuthHeaders()
        });
        const result = await handleResponse(response);
        if (!result.exito) throw new Error(result.mensaje || 'Error al cargar mesa');
        return result.datos;
    }

    // 4. Obtener datos de un usuario (mesero)
    async obtenerUsuario(idUsuario) {
        const response = await fetch(`${API_BASE}/Usuarios/${idUsuario}`, {
            headers: getAuthHeaders()
        });
        const result = await handleResponse(response);
        if (!result.exito) throw new Error(result.mensaje || 'Error al cargar usuario');
        return result.datos;
    }

    // 5. Obtener una orden por su ID
    async obtenerOrdenPorId(idOrden) {
        const response = await fetch(`${API_BASE}/Ordenes/${idOrden}`, {
            headers: getAuthHeaders()
        });
        const result = await handleResponse(response);
        if (!result.exito) throw new Error(result.mensaje || 'Error al cargar orden');
        return OrdenesResponse.fromJson(result.datos);
    }

    // 6. Cambiar estado de una orden (PATCH)
    async cambiarEstadoOrden(idOrden, nuevoEstado) {
        const response = await fetch(`${API_BASE}/Ordenes/${idOrden}/estado`, {
            method: 'PATCH',
            headers: getAuthHeaders(),
            body: JSON.stringify(nuevoEstado)
        });
        return await handleResponse(response);
    }

    // 7. Marcar ítem como atendido (PATCH)
    async marcarItemAtendido(idDetalle) {
        const response = await fetch(`${API_BASE}/DetalleOrdenes/${idDetalle}/estado`, {
            method: 'PATCH',
            headers: getAuthHeaders(),
            body: JSON.stringify("atendido")
        });
        return await handleResponse(response);
    }

    // 8. Cambiar estado de una mesa (PUT)
    async cambiarEstadoMesa(idMesa, nuevoEstado) {
        const mesa = await this.obtenerMesa(idMesa);
        const mesaActualizada = {
            id_mesa: mesa.id_mesa,
            numero_mesa: mesa.numero_mesa,
            estado: nuevoEstado,
            activo: true
        };
        const response = await fetch(`${API_BASE}/Mesas/${idMesa}`, {
            method: 'PUT',
            headers: getAuthHeaders(),
            body: JSON.stringify(mesaActualizada)
        });
        return await handleResponse(response);
    }

    // 9. Generar factura (POST) - DTO completo requerido por C#
    async generarFactura(datosFactura) {
        const payload = {
            Id_orden: Number(datosFactura.id_orden || datosFactura.Id_orden || 0),
            Metodo_pago: String(datosFactura.metodo_pago || datosFactura.Metodo_pago || 'Efectivo'),
            Monto_propina: Number(datosFactura.monto_propina || datosFactura.Monto_propina || 0),
            Nombre_mesa: String(datosFactura.nombre_mesa || datosFactura.Nombre_mesa || 'Mesa General'),
            Nombre_mesero: String(datosFactura.nombre_mesero || datosFactura.Nombre_mesero || 'Mesero General'),
            Nombre_cajero: String(datosFactura.nombre_cajero || datosFactura.Nombre_cajero || 'Cajero Principal'),
            Numero_factura_fiscal: String(datosFactura.numero_factura_fiscal || datosFactura.Numero_factura_fiscal || `FAC-${Date.now()}`),
            Detalle_items: datosFactura.detalle_items || datosFactura.Detalle_items || []
        };

        const response = await fetch(`${API_BASE}/Facturas/generar`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify(payload)
        });
        
        const result = await handleResponse(response);
        if (!result.exito) throw new Error(result.mensaje || 'Error al generar factura');
        return result;
    }

    // 10. Descargar PDF de factura (GET)
    async descargarPDFFactura(idFactura) {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE}/Facturas/${idFactura}/pdf`, {
            headers: { 
                'Authorization': `Bearer ${token}`,
                'Accept': 'application/pdf'
            }
        });

        if (!response.ok) {
            const errorTexto = await response.text();
            console.error('🔥 Error interno del backend al generar PDF (500):', errorTexto);
            throw new Error(`La factura se guardó, pero falló la generación del PDF en Azure (Error ${response.status}).`);
        }

        return await response.blob();
    }
}