// =============================================
//   MÓDULO DASHBOARD
//   Chart.js
// =============================================

const API_BASE_DASH = "https://patiocampestre-bxf9hkbqcphpfpan.centralus-01.azurewebsites.net";

function getTokenDash() { return localStorage.getItem("token"); }

const MESES = [
    "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
    "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
];

let graficaGanancias = null;
let graficaFacturas = null;
let graficaMetodos = null;

// ---- Cargar facturas ----
async function cargarDashboard() {
    try {
        const res = await fetch(`${API_BASE_DASH}/api/Facturas/activas`, {
            headers: { "Authorization": `Bearer ${getTokenDash()}` }
        });
        const data = await res.json();

        if (!data.exito || !data.datos || data.datos.length === 0) {
            mostrarSinDatos();
            return;
        }

        const facturas = data.datos.filter(f => f.activo);
        procesarDashboard(facturas);

    } catch (e) {
        console.error("Error al cargar dashboard:", e);
        mostrarSinDatos();
    }
}

// ---- Procesar y renderizar ----
function procesarDashboard(facturas) {
    const porMes = {};

    facturas.forEach(f => {
        const fecha = new Date(f.fecha_emision);
        const clave = `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, "0")}`;
        const nombre = `${MESES[fecha.getMonth()]} ${fecha.getFullYear()}`;

        if (!porMes[clave]) {
            porMes[clave] = { nombre, totalGanancias: 0, cantidadFacturas: 0, metodos: {} };
        }

        porMes[clave].totalGanancias += f.monto_total || 0;
        porMes[clave].cantidadFacturas += 1;

        const metodo = f.metodo_pago || "Desconocido";
        porMes[clave].metodos[metodo] = (porMes[clave].metodos[metodo] || 0) + 1;
    });

    const mesesOrdenados = Object.values(porMes).sort((a, b) => a.nombre.localeCompare(b.nombre));
    const labels = mesesOrdenados.map(m => m.nombre);
    const ganancias = mesesOrdenados.map(m => parseFloat(m.totalGanancias.toFixed(2)));
    const cantidades = mesesOrdenados.map(m => m.cantidadFacturas);

    // KPI textos
    const mesMasGanancias = mesesOrdenados.reduce((a, b) => a.totalGanancias > b.totalGanancias ? a : b);
    const mesMasFacturas = mesesOrdenados.reduce((a, b) => a.cantidadFacturas > b.cantidadFacturas ? a : b);

    document.getElementById("kpi-mes-ganancias").textContent = `🏆 ${mesMasGanancias.nombre} — C$ ${mesMasGanancias.totalGanancias.toFixed(2)}`;
    document.getElementById("kpi-mes-facturas").textContent = `🏆 ${mesMasFacturas.nombre} — ${mesMasFacturas.cantidadFacturas} facturas`;

    // Métodos de pago globales
    const metodoGlobal = {};
    facturas.forEach(f => {
        const m = f.metodo_pago || "Desconocido";
        metodoGlobal[m] = (metodoGlobal[m] || 0) + 1;
    });
    const metodoPrincipal = Object.entries(metodoGlobal).reduce((a, b) => a[1] > b[1] ? a : b);
    document.getElementById("kpi-metodo-pago").textContent = `🏆 ${metodoPrincipal[0]} — ${metodoPrincipal[1]} veces`;

    // Renderizar gráficas
    renderGraficaBarras(labels, ganancias);
    renderGraficaLinea(labels, cantidades);
    renderGraficaPastel(metodoGlobal);
}

// ---- GRÁFICA 1: Barras - Ganancias ----
function renderGraficaBarras(labels, data) {
    if (graficaGanancias) graficaGanancias.destroy();
    const ctx = document.getElementById("grafica-ganancias").getContext("2d");
    graficaGanancias = new Chart(ctx, {
        type: "bar",
        data: {
            labels,
            datasets: [{
                label: "Ganancias (C$)",
                data,
                backgroundColor: "rgba(255, 155, 107, 0.6)",
                borderColor: "#ff9b6b",
                borderWidth: 2,
                borderRadius: 8
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: { labels: { color: "#fff", font: { size: 11 } } }
            },
            scales: {
                x: { ticks: { color: "rgba(255,255,255,0.7)", font: { size: 10 } }, grid: { color: "rgba(255,255,255,0.05)" } },
                y: { ticks: { color: "rgba(255,255,255,0.7)", font: { size: 10 } }, grid: { color: "rgba(255,255,255,0.05)" } }
            }
        }
    });
}

// ---- GRÁFICA 2: Línea - Facturas ----
function renderGraficaLinea(labels, data) {
    if (graficaFacturas) graficaFacturas.destroy();
    const ctx = document.getElementById("grafica-facturas").getContext("2d");
    graficaFacturas = new Chart(ctx, {
        type: "line",
        data: {
            labels,
            datasets: [{
                label: "Facturas emitidas",
                data,
                borderColor: "#2ecc71",
                backgroundColor: "rgba(46, 204, 113, 0.15)",
                borderWidth: 2,
                pointBackgroundColor: "#2ecc71",
                pointRadius: 5,
                fill: true,
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: { labels: { color: "#fff", font: { size: 11 } } }
            },
            scales: {
                x: { ticks: { color: "rgba(255,255,255,0.7)", font: { size: 10 } }, grid: { color: "rgba(255,255,255,0.05)" } },
                y: { ticks: { color: "rgba(255,255,255,0.7)", font: { size: 10 } }, grid: { color: "rgba(255,255,255,0.05)" } }
            }
        }
    });
}

// ---- GRÁFICA 3: Pastel - Métodos de pago ----
function renderGraficaPastel(metodoGlobal) {
    if (graficaMetodos) graficaMetodos.destroy();
    const ctx = document.getElementById("grafica-metodos").getContext("2d");
    const labels = Object.keys(metodoGlobal);
    const data = Object.values(metodoGlobal);
    graficaMetodos = new Chart(ctx, {
        type: "doughnut",
        data: {
            labels,
            datasets: [{
                data,
                backgroundColor: [
                    "rgba(255, 155, 107, 0.8)",
                    "rgba(46, 204, 113, 0.8)",
                    "rgba(52, 152, 219, 0.8)",
                    "rgba(155, 89, 182, 0.8)"
                ],
                borderColor: "rgba(255,255,255,0.1)",
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: { labels: { color: "#fff", font: { size: 11 } }, position: "bottom" }
            }
        }
    });
}

// ---- Sin datos ----
function mostrarSinDatos() {
    ["kpi-mes-ganancias", "kpi-mes-facturas", "kpi-metodo-pago"].forEach(id => {
        document.getElementById(id).textContent = "Sin datos aún";
    });
}

// ---- Init ----
document.addEventListener("DOMContentLoaded", () => {
    cargarDashboard();
});