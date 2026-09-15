export class AuditoriaResponse {
    constructor(id_bitacora, fecha_evento, id_usuario, accion, descripcion, nombre_usuario) {
        this.id_bitacora = id_bitacora;
        this.fecha_evento = fecha_evento;
        this.id_usuario = id_usuario;
        this.accion = accion;
        this.descripcion = descripcion;
        this.nombre_usuario = nombre_usuario;
    }

    static fromJson(json) {
        if (!json) return null;
        return new AuditoriaResponse(
            json.id_bitacora,
            json.fecha_evento,
            json.id_usuario,
            json.accion,
            json.descripcion,
            json.nombre_usuario
        );
    }
}