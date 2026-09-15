// =============================================
//   SERVICIO DE AUDITORÍA
//   Responsabilidad: comunicación con la API
// =============================================

import { AuditoriaResponse } from '../models/response/auditoria.response.js';

const AUDITORIA_API_BASE = "https://patiocampestre-bxf9hkbqcphpfpan.centralus-01.azurewebsites.net";

const AuditoriaService = {

    getToken() {
        return localStorage.getItem("token");
    },

    async obtenerTodos() {
        const respuesta = await fetch(`${AUDITORIA_API_BASE}/api/Bitacora/todo`, {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${this.getToken()}`
            }
        });

        if (!respuesta.ok) {
            throw new Error(`Error HTTP ${respuesta.status}`);
        }

        const datos = await respuesta.json();

        if (!datos.exito) {
            throw new Error("La API retornó exito: false");
        }

        // Mapear los datos a DTO
        return datos.datos.map(item => AuditoriaResponse.fromJson(item));
    }

};

export default AuditoriaService;