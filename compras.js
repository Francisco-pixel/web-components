// ============================================================
// WEB COMPONENT: <dgcp-compras>
// Recibe el atributo "numero-compras" y muestra los datos de la API
// ============================================================

// Cargar Chart.js desde CDN
const chartJSScript = document.createElement('script');
chartJSScript.src = 'https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js';
chartJSScript.async = true;
document.head.appendChild(chartJSScript);

const meses = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
];
function quitarTildes(data) {
  return data.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

const palabrasContildes=[
    "licitación",
    "capacitación",
    "estratégico",
    "estratégica",
    "contratación",
    "gestión",
    "divulgación",
    "ejecución",
    "jurídica",
    "consultoría",
    "institución",
    "adquisición",
    "informáticos",
    "implementación",
    "formulación",
    "consultorías",
    "técnicos",
    "certificación",
    "reestructuración",
    "instalación",
    "presentación",
    "organización",
    "cámara",
    "tecnológicos",
    "útiles",
    "celebración",
    "impermeabilización",
    "artículos",
    "fumigación",
    "vehículos",
    "vehículo",
    "validación",
    "investigación",
    "públicas",
    "áreas",
    "renovación",
    "electrónica",
    "esenografía",
    "dirección",
    "participación",
    "readecuación",
    "rápido",
    "maestría",
    'aplicación', 
    'interpretación',
    'psicométricas'
].toSorted();
const palabrasConTildesFormateadas=palabrasContildes.map(item=>[quitarTildes(item),item])
const correccionesOrtograficas = palabrasConTildesFormateadas;

function limpiarData(data = [], correctivos = []) {
  let str = JSON.stringify(data);
  correctivos.forEach(([oldName, newName]) => {
    const regExp = new RegExp(oldName, 'ig');
    str = str.replace(regExp, newName);
  });
  return JSON.parse(str);
}

function crearItemsCompras(key, content) {
  return `
    <li>
      <span>${key}<input class="check" type="checkbox" /></span>
      <ul>
        <div>
          ${content}
        </div>
      </ul>
    </li>
  `;
}

function crearCamposCompras(value) {
  if (!Array.isArray(value)) return '';
  
  return value
    .toSorted((a, b) => b.codigo_proceso?.localeCompare(a.codigo_proceso || '') || 0)
    .map(item => `
      <li class="card">
        <p>${item.codigo_proceso || ''}</p>
        <p>${item.descripcion?.toUpperCase() || ''}</p>
        <p>${item.estado_proceso || ''}</p>
        <p>${item.fecha_publicacion ? new Date(item.fecha_publicacion).toLocaleDateString() : ''}</p>
        <a class="enlace" href="${item.url || '#'}" target="_blank">Ver más</a>
      </li>
    `).join('');
}

function crearSeccionesDeCompras(data) {
  let html = [];
  const entries = limpiarData(Object.entries(data), correccionesOrtograficas);
  
  if (!entries.length) return '<p class="sin-datos">No hay datos disponibles</p>';
  
  const isAllYears = entries.every(([key]) => key.match(/^\d{4}$/));
  const sortedEntries = isAllYears
    ? entries.sort(([a], [b]) => b.localeCompare(a))
    : entries.sort(([a], [b]) => meses.indexOf(b) - meses.indexOf(a));

  for (const [key, value] of sortedEntries) {
    if (Array.isArray(value)) {
      html.push(crearItemsCompras(key, crearCamposCompras(value)));
    } else if (typeof value === 'object' && value !== null) {
      html.push(crearItemsCompras(key, crearSeccionesDeCompras(value)));
    }
  }
  return html.join('');
}

// Función para recolectar todos los procesos de la estructura anidada
function recolectarTodosLosProcesos(data) {
  const procesos = [];
  
  function recorrer(obj) {
    for (const [key, value] of Object.entries(obj)) {
      if (Array.isArray(value)) {
        // Es un array de procesos
        procesos.push(...value);
      } else if (typeof value === 'object' && value !== null) {
        recorrer(value);
      }
    }
  }
  
  recorrer(data);
  return procesos;
}

// Función para generar estadísticas desde los procesos
function generarEstadisticasDesdeProcesos(procesos) {
  if (!procesos || procesos.length === 0) return null;
  
  let totalProcesos = procesos.length;
  let procesosPorEstado = {};
  let procesosPorAnio = {};
  
  procesos.forEach(proceso => {
    // Por estado
    const estado = proceso.estado_proceso || 'Desconocido';
    procesosPorEstado[estado] = (procesosPorEstado[estado] || 0) + 1;
    
    // Por año (desde fecha_publicacion)
    if (proceso.fecha_publicacion) {
      const año = new Date(proceso.fecha_publicacion).getFullYear();
      if (!isNaN(año)) {
        procesosPorAnio[año] = (procesosPorAnio[año] || 0) + 1;
      }
    }
  });
  
  // Ordenar años
  const añosOrdenados = Object.keys(procesosPorAnio).sort((a, b) => a - b);
  
  /*console.log('📊 Estadísticas desde procesos:', {
    totalProcesos,
    procesosPorAnio,
    procesosPorEstado,
    añosOrdenados
  });*/
  
  return {
    totalProcesos,
    procesosPorEstado,
    procesosPorAnio,
    totalCategorias: Object.keys(procesosPorAnio).length
  };
}

// Definición del Web Component
class DGCPCompras extends HTMLElement {
  static get observedAttributes() {
    return ['numero-compras'];
  }

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.charts = {};
    this.chartJSReady = false;
    this.datosActuales = null;
    
    this.shadowRoot.innerHTML = `
      <style>
        :root {
          --color-ocre: hsl(36 85% 37%);
          --color-verde: hsl(194 100% 19%);
          --color-text: hsl(0 0% 40%);
          --color-titulo: hsl(0 0% 30%);
          --bg-card: hsl(0 0% 95%);
          --border-color: #e0e0e0;
        }
        
        * { padding: 0; margin: 0; box-sizing: border-box; }        
        .container { width: 100%; }
        body{font-family:arial;}
        .dashboard {
          background: linear-gradient(135deg, #f5f7fa 0%, #e9edf2 100%);
          border-radius: 1rem;
          padding: 1.5rem;
          margin-bottom: 2rem;
          color: var(--color-titulo, hsl(0 0% 30%));
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
        }
        
        .dashboard-titulo {
          font-size: 1.5rem;
          margin-bottom: 1.5rem;
          text-align: center;
          color: var(--color-ocre,hsl(36 85% 37%));
        }
        
        .dashboard-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 1rem;
          margin-bottom: 2rem;
        }
        
        .dashboard-card {
          background: white;
          border-radius: 0.75rem;
          padding: 1rem;
          text-align: center;
          transition: transform 0.3s ease, box-shadow 0.3s ease;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
        }
        
        .dashboard-card:hover {
          transform: translateY(-5px);
          box-shadow: 0 8px 20px rgba(0, 0, 0, 0.08);
        }
        
        .dashboard-icon {
          width: 48px;
          height: 48px;
          margin: 0 auto 0.5rem;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        
        .dashboard-icon svg {
          width: 100%;
          height: 100%;
          stroke: var(--color-ocre, hsl(36 85% 37%));
          stroke-width: 2;
          fill: none;
        }
        
        .dashboard-valor {
          font-size: 2rem;
          font-weight: bold;
          margin-bottom: 0.25rem;
          color: var(--color-verde, hsl(194 100% 19%));
        }
        
        .dashboard-label {
          font-size: 0.85rem;
          color: var(--color-text, hsl(0 0% 40%));
        }
        
        .graficos-container {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
          gap: 1.5rem;
          margin-bottom: 2rem;
        }
        
        .grafico-card {
          background: white;
          border-radius: 0.75rem;
          padding: 1rem;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
        }
        
        .grafico-card h4 {
          margin-bottom: 1rem;
          font-size: 1.1rem;
          text-align: center;
          color: var(--color-titulo);
        }
        
        canvas {
          max-height: 250px;
          width: 100% !important;
        }
        
        .compra {
          background: #fff;
          padding: 0.5em;
          list-style: none;
          border-radius: 0.5rem;
          box-shadow: 0 0 1rem rgba(0, 0, 0, 0.2);
        }
        
        .compra li ul {
          list-style: none;
          display: grid;
          grid-template-rows: 0fr;
          transition: all 0.3s ease;
        }
        
        .compra li ul div {
          overflow: hidden;
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }
        
        .compra li span:has(.check:checked) + ul {
          grid-template-rows: 1fr;
        }
        
        .compra li span {
          display: flex;
          justify-content: space-between;
          color: var(--color-titulo);
          padding: 0.5rem 1rem;
          cursor: pointer;
        }
        
        /*.compra li span .check {
          accent-color: var(--color-ocre, hsl(36 85% 37%));
          appearance: none;
          background: hsl(0 0% 40%);
          width: 1.3em;
          outline: none;
          aspect-ratio: 1;
          clip-path: circle(50%);
          cursor: pointer;
        }
        
        .compra li span .check:checked {
          appearance: auto;
        }
        
        .compra li span:has(.check:checked) {
          color: var(--color-ocre, hsl(36 85% 37%));
        }*/
                
        .compra li span .check {
          appearance: none;
          -webkit-appearance: none;
          width: 1.3em;
          height: 1.3em;
          aspect-ratio: 1;
          cursor: pointer;
          outline: none;
          background: white;
          border: 2px solid var(--color-titulo, hsl(0 0% 30%));
          border-radius: 4px;
          transition: all 0.2s ease;
          
          position: relative;
          display: inline-flex;
          align-items: center;
          justify-content: center;
        }
        
        .compra li span .check:hover {
          border-color: var(--color-ocre, hsl(36 85% 37%));
          transform: scale(1.05);
        }
        
        .compra li span .check:checked {
          background-color: var(--color-ocre, hsl(36 85% 37%));
          border-color: var(--color-ocre, hsl(36 85% 37%));
        }
        .compra li span:has(.check:checked) {
          /* background-color:  hsl(36 85% 90%); */
          color:var(--color-ocre, hsl(36 85% 37%));
        }
        /*.compra li span:has(.check:checked:first-child) {
          margin-top:1em;
          background-color:  hsl(36 85% 90%);
          transition:all .3s ease;
          color:var(--color-ocre, hsl(36 85% 37%));
        }*/
        
        .compra li span .check:checked::after {
          content: '✓';
          color: white;
          font-size: 0.85em;
          font-weight: bold;
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
        }
        
        .compra li span .check:focus-visible {
          box-shadow: 0 0 0 2px white, 0 0 0 4px var(--color-ocre, hsl(36 85% 37%));
        }
        
        .compra li span .check:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        
        .compra li span .check:checked {
          animation: checkPop 0.2s ease;
        }
        
        @keyframes checkPop {
          0% { transform: scale(0.9); }
          50% { transform: scale(1.1); }
          100% { transform: scale(1); }
        }
        
        .compra li .card {
          padding: 1em;
          background: var(--bg-card, hsl(0 0% 95%));
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.5rem;
          border-radius: 0.5rem;
        }
        
        .compra li .card p:nth-child(1) {
          font-weight: 600;
          color: var(--color-ocre, hsl(36 85% 37%));
        }
        
        .compra li .card p:nth-child(3) {
          font-style: italic;
        }
        
        .compra li .card :is(p) {
          color: var(--color-text, hsl(0 0% 40%));
        }
        
        .compra li .card .enlace {
          display: block;
          text-decoration: none;
          color: #fff;
          position: relative;
          padding: 0.5em 1em;
          text-align: center;
          width: max-content;
          overflow: hidden;
          border-radius: 1em;
          z-index: 1;
          margin-top: 0.5rem;
        }
        
        .compra li .card .enlace::before,
        .compra li .card .enlace::after {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          transition: all 0.3s ease;
          width: 100%;
          height: 100%;
        }
        
        .compra li .card .enlace::before {
          transform: translateX(-100%);
          background: var(--color-ocre, hsl(36 85% 37%));
          z-index: -1;
        }
        
        .compra li .card .enlace::after {
          background: var(--color-verde, hsl(194 100% 19%));
          z-index: -2;
        }
        
        .compra li .card .enlace:hover:before {
          transform: translateX(0);
        }
        
        .loading {
          text-align: center;
          padding: 2rem;
          color: var(--color-text, hsl(0 0% 40%));
        }
        
        .error {
          text-align: center;
          padding: 2rem;
          color: #d32f2f;
          background: #ffebee;
          border-radius: 0.5rem;
        }
        
        .sin-datos {
          text-align: center;
          padding: 2rem;
          color: var(--color-text, hsl(0 0% 40%));
          font-style: italic;
        }
        
        .contenido-principal {
          margin-top: 1rem;
          display: grid;
          gap: 1em;   
        }
        
        .footer-info {
          display: block;
          font-size: 0.85rem;
          color: var(--color-text, hsl(0 0% 40%));
          text-align: center;
          margin-top: 1rem;
        }
        
        .footer-info a {
          color: var(--color-ocre, hsl(36 85% 37%));
          text-decoration: none;
        }
        
        .footer-info a:hover {
          text-decoration: underline;
        }
        
        h4.titulo {
          color: var(--color-text, hsl(0 0% 40%));
          text-align: center;
        }
        
        @media (max-width: 768px) {
          .dashboard-grid {
            grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
          }
          .dashboard-valor { font-size: 1.5rem; }
          .graficos-container { grid-template-columns: 1fr; }
        }
      </style>
      <div class="container">
        <div class="contenido-principal"></div>
      </div>
    `;
    
    this.contenedorPrincipal = this.shadowRoot.querySelector('.contenido-principal');
    
    if (window.Chart) {
      this.chartJSReady = true;
    } else {
      chartJSScript.onload = () => {
        this.chartJSReady = true;
        if (this.datosActuales) {
          this.inicializarGraficos();
        }
      };
    }
  }

  getStorageKey() {
    return 'dgcp_compras';
  }

  guardarEnLocalStorage(data) {
    try {
      const key = this.getStorageKey();
      localStorage.setItem(key, JSON.stringify({
        data: data,
        timestamp: Date.now(),
        unidad_compra: this.getAttribute('numero-compras')
      }));
    } catch (error) {
      console.error('Error al guardar:', error);
    }
  }

  cargarDeLocalStorage() {
    try {
      const key = this.getStorageKey();
      const guardado = localStorage.getItem(key);
      if (!guardado) return null;
      const datosGuardados = JSON.parse(guardado);
      if (datosGuardados.unidad_compra !== this.getAttribute('numero-compras')) return null;
      return datosGuardados.data;
    } catch (error) {
      console.error('Error al cargar:', error);
      return null;
    }
  }

  destruirGraficos() {
    Object.values(this.charts).forEach(chart => {
      if (chart && typeof chart.destroy === 'function') chart.destroy();
    });
    this.charts = {};
  }

  inicializarGraficos() {
    if (!this.chartJSReady || !window.Chart || !this.datosActuales) return;
    
    // Recolectar todos los procesos y generar estadísticas
    const todosLosProcesos = recolectarTodosLosProcesos(this.datosActuales);
    const stats = generarEstadisticasDesdeProcesos(todosLosProcesos);
    
    if (!stats) return;
    
    setTimeout(() => {
      // Gráfico de barras - Procesos por año
      const canvasBarras = this.shadowRoot.querySelector('#grafico-barras');
      if (canvasBarras && Object.keys(stats.procesosPorAnio).length > 0) {
        const años = Object.keys(stats.procesosPorAnio).sort((a, b) => a - b);
        const cantidades = años.map(año => stats.procesosPorAnio[año]);
        
        if (this.charts.barras) this.charts.barras.destroy();
        this.charts.barras = new Chart(canvasBarras, {
          type: 'bar',
          data: {
            labels: años,
            datasets: [{
              label: 'Cantidad de procesos',
              data: cantidades,
              backgroundColor: 'rgba(54, 162, 235, 0.6)',
              borderColor: 'rgba(54, 162, 235, 1)',
              borderWidth: 1,
              borderRadius: 5
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: { legend: { labels: { color: '#333' } } },
            scales: {
              y: { beginAtZero: true, ticks: { color: '#666', stepSize: 1, precision: 0 } },
              x: { ticks: { color: '#666' } }
            }
          }
        });
        //console.log('✅ Gráfico de barras:', { años, cantidades });
      }
      
      // Gráfico de pastel
      const canvasPastel = this.shadowRoot.querySelector('#grafico-pastel');
      if (canvasPastel && Object.keys(stats.procesosPorEstado).length > 0) {
        const estados = Object.keys(stats.procesosPorEstado);
        const cantidades = estados.map(e => stats.procesosPorEstado[e]);
        const colores = ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', '#FF9F40'];
        
        if (this.charts.pastel) this.charts.pastel.destroy();
        this.charts.pastel = new Chart(canvasPastel, {
          type: 'pie',
          data: {
            labels: estados,
            datasets: [{
              data: cantidades,
              backgroundColor: colores.slice(0, estados.length),
              borderWidth: 0
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
              legend: { position: 'bottom', labels: { color: '#666', font: { size: 11 } } },
              tooltip: {
                callbacks: {
                  label: (ctx) => {
                    const total = ctx.dataset.data.reduce((a, b) => a + b, 0);
                    const porcentaje = ((ctx.raw / total) * 100).toFixed(1);
                    return `${ctx.label}: ${ctx.raw} (${porcentaje}%)`;
                  }
                }
              }
            }
          }
        });
        //console.log('✅ Gráfico de pastel creado');
      }
      
      // Gráfico de líneas
      const canvasLineas = this.shadowRoot.querySelector('#grafico-lineas');
      if (canvasLineas && Object.keys(stats.procesosPorAnio).length >= 2) {
        const años = Object.keys(stats.procesosPorAnio).sort((a, b) => a - b);
        const cantidades = años.map(año => stats.procesosPorAnio[año]);
        
        if (this.charts.lineas) this.charts.lineas.destroy();
        this.charts.lineas = new Chart(canvasLineas, {
          type: 'line',
          data: {
            labels: años,
            datasets: [{
              label: 'Tendencia de procesos',
              data: cantidades,
              borderColor: '#FF6384',
              backgroundColor: 'rgba(255, 99, 132, 0.1)',
              borderWidth: 2,
              fill: true,
              tension: 0.3,
              pointBackgroundColor: '#FF6384',
              pointBorderColor: 'white',
              pointRadius: 4,
              pointHoverRadius: 6
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: { legend: { labels: { color: '#333' } } },
            scales: {
              y: { beginAtZero: true, ticks: { color: '#666', stepSize: 1, precision: 0 } },
              x: { ticks: { color: '#666' } }
            }
          }
        });
        //console.log('✅ Gráfico de líneas creado');
      }
    }, 150);
  }
      
  renderizarDashboardConGraficos(data) {
    const todosLosProcesos = recolectarTodosLosProcesos(data);
    const stats = generarEstadisticasDesdeProcesos(todosLosProcesos);
    if (!stats) return '';
    
    const tieneDatosAños = Object.keys(stats.procesosPorAnio).length > 0;
    const tieneDatosEstados = Object.keys(stats.procesosPorEstado).length > 0;
    const tieneTendencia = Object.keys(stats.procesosPorAnio).length >= 2;
    
    const primerProceso = todosLosProcesos[0];
    const nombreInstitucion = primerProceso?.codigo_proceso?.split('-')[0] || '';
    
    return `
      <div class="dashboard">
        <h3 class="dashboard-titulo">Panel de Compras${nombreInstitucion ? ` - ${nombreInstitucion.toUpperCase()}` : ''}</h3>
        <div class="dashboard-grid">
          <div class="dashboard-card">
            <div class="dashboard-icon">
              <svg viewBox="0 0 24 24">
                <rect x="4" y="4" width="6" height="6" rx="1" stroke="currentColor" stroke-width="2" fill="none"/>
                <rect x="14" y="4" width="6" height="6" rx="1" stroke="currentColor" stroke-width="2" fill="none"/>
                <rect x="4" y="14" width="6" height="6" rx="1" stroke="currentColor" stroke-width="2" fill="none"/>
                <rect x="14" y="14" width="6" height="6" rx="1" stroke="currentColor" stroke-width="2" fill="none"/>
              </svg>
            </div>
            <div class="dashboard-valor">${stats.totalProcesos}</div>
            <div class="dashboard-label">Total Procesos</div>
          </div>
          <div class="dashboard-card">
            <div class="dashboard-icon">
              <svg viewBox="0 0 24 24">
                <path d="M12 2L2 7l10 5 10-5-10-5z" stroke="currentColor" stroke-width="2" fill="none"/>
                <path d="M2 17l10 5 10-5" stroke="currentColor" stroke-width="2" fill="none"/>
                <path d="M2 12l10 5 10-5" stroke="currentColor" stroke-width="2" fill="none"/>
              </svg>
            </div>
            <div class="dashboard-valor">${Object.keys(data).length}</div>
            <div class="dashboard-label">Categorías</div>
          </div>
          <div class="dashboard-card">
            <div class="dashboard-icon">
              <svg viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2" fill="none"/>
                <polyline points="12 6 12 12 16 14" stroke="currentColor" stroke-width="2" fill="none"/>
              </svg>
            </div>
            <div class="dashboard-valor">${Object.keys(stats.procesosPorAnio).length}</div>
            <div class="dashboard-label">Procesos por años</div>
          </div>
          <div class="dashboard-card">
            <div class="dashboard-icon">
              <svg viewBox="0 0 24 24">
                <polyline points="3 17 9 11 13 15 21 7" stroke="currentColor" stroke-width="2" fill="none"/>
                <polyline points="15 7 21 7 21 13" stroke="currentColor" stroke-width="2" fill="none"/>
             </svg>
            </div>
            <div class="dashboard-valor">${Object.keys(stats.procesosPorEstado).length}</div>
            <div class="dashboard-label">Procesos por estado</div>
          </div>
        </div>
        
        <div class="graficos-container">
          <div class="grafico-card">
            <h4>Procesos por año</h4>
            <canvas id="grafico-barras"></canvas>
          </div>
          
          ${tieneDatosEstados ? `
            <div class="grafico-card">
              <h4>Distribución por estado</h4>
              <canvas id="grafico-pastel"></canvas>
            </div>
          ` : ''}
          
          ${tieneTendencia ? `
            <div class="grafico-card">
              <h4>Tendencia anual</h4>
              <canvas id="grafico-lineas"></canvas>
            </div>
          ` : ''}
        </div>
      </div>
    `;
  }
            
  renderizarHTML(data, esFallback = false) {
    if (!data || Object.keys(data).length === 0) {
      return `<div class="error">📭 No se encontraron compras</div>`;
    }
    
    const aviso = esFallback ? '<div class="error" style="background:#fff3cd; color:#856404;">⚠️ Usando datos locales (API no disponible)</div>' : '';
    const dashboardHTML = this.renderizarDashboardConGraficos(data);
    
    return `
      ${aviso}
      ${dashboardHTML}
      <h4 class="titulo">Este apartado se encuentra en proceso de adecuación conforme a lo establecido en la circular conjunta DGCP-DIGEIG de fecha 31 de marzo 2025.</h4>
      <ul class="compra">${crearSeccionesDeCompras(data)}</ul>
      <span class="footer-info">* Esta página se actualiza cada día a las 8:00 a.m. por parte de la 
        <a href="https://www.dgcp.gob.do" target="_blank">Dirección General de Contrataciones Públicas (DGCP)</span>
    `;
  }

  async cargarDesdeAPI() {
    const numero = this.getAttribute('numero-compras');
    if (!numero) return null;
    
    try {
      const res = await fetch(`https://datosabiertos.dgcp.gob.do/api-dgcp/v1/procesos/agrupados?unidad_compra=${numero}`, { cache: 'no-store' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const raw = await res.json();
      const data = raw?.payload?.content ?? raw;
      if (data && Object.keys(data).length) this.guardarEnLocalStorage(data);
      return { success: true, data };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async actualizarContenido() {
    const local = this.cargarDeLocalStorage();
    
    if (local) {
      this.datosActuales = local;
      this.contenedorPrincipal.innerHTML = this.renderizarHTML(local, false);
      if (this.chartJSReady) this.inicializarGraficos();
    } else {
      this.contenedorPrincipal.innerHTML = '<div class="loading">🔄 Cargando...</div>';
    }
    
    const api = await this.cargarDesdeAPI();
    
    if (api.success && api.data && Object.keys(api.data).length) {
      this.destruirGraficos();
      this.datosActuales = api.data;
      this.contenedorPrincipal.innerHTML = this.renderizarHTML(api.data, false);
      if (this.chartJSReady) this.inicializarGraficos();
    } else if (!local) {
      this.contenedorPrincipal.innerHTML = '<div class="error">❌ Error al cargar datos</div>';
    }
  }

  connectedCallback() {
    this.actualizarContenido();
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (name === 'numero-compras' && oldValue !== newValue) {
      this.destruirGraficos();
      this.actualizarContenido();
    }
  }
}

customElements.define('dgcp-compras', DGCPCompras);