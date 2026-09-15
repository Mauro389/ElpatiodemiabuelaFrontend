export class OrdenesResponse {
    constructor(id_orden, id_mesa, id_mesero, fecha_apertura, estado, activo, nombreMesa, nombreMesero) {
        this.id_orden = id_orden;
        this.id_mesa = id_mesa;
        this.id_mesero = id_mesero;
        this.fecha_apertura = fecha_apertura;
        this.estado = estado;
        this.activo = activo;
        this.nombreMesa = nombreMesa;
        this.nombreMesero = nombreMesero;
    }

    static fromJson(json) {
        if (!json) return null;
        return new OrdenesResponse(
            json.id_orden,
            json.id_mesa,
            json.id_mesero,
            json.fecha_apertura,
            json.estado,
            json.activo,
            json.nombreMesa,
            json.nombreMesero
        );
    }
}