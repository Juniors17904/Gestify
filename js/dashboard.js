// ===== DASHBOARD =====

async function loadDashboard() {
  const negocioId = currentBusiness?.id;
  if (!negocioId) return;

  const modulos = currentBusiness?.modulos || [];
  const hoy = new Date().toISOString().split('T')[0];

  // Renderizar stats según módulos activos
  const statsGrid = document.getElementById('statsGrid');
  statsGrid.innerHTML = '';

  const STATS = [
    { modulo: 'ventas',     color: 'purple', icon: 'trending-up',   label: 'Ventas Hoy',     id: 'statVentasHoy',  valor: formatMoney(0) },
    { modulo: 'inventario', color: 'blue',   icon: 'package',       label: 'Productos',      id: 'statProductos',  valor: '0' },
    { modulo: 'caja',       color: 'green',  icon: 'wallet',        label: 'En Caja',        id: 'statCaja',       valor: formatMoney(0) },
    { modulo: 'inventario', color: 'orange', icon: 'alert-triangle',label: 'Stock Bajo',     id: 'statStockBajo',  valor: '0' },
    { modulo: 'clientes',   color: 'blue',   icon: 'users',         label: 'Clientes',       id: 'statClientes',   valor: '0' },
    { modulo: 'agenda',     color: 'purple', icon: 'calendar',      label: 'Citas Hoy',      id: 'statAgenda',     valor: '0' },
    { modulo: 'empleados',  color: 'green',  icon: 'shield-check',  label: 'Empleados',      id: 'statEmpleados',  valor: '0' },
  ];

  STATS.forEach(s => {
    if (!modulos.includes(s.modulo)) return;
    if (statsGrid.querySelector('#' + s.id)) return;
    const div = document.createElement('div');
    div.className = `stat-card ${s.color}`;
    div.innerHTML = `
      <div class="stat-icon"><i data-lucide="${s.icon}"></i></div>
      <div class="stat-info">
        <span class="stat-label">${s.label}</span>
        <span class="stat-value" id="${s.id}">${s.valor}</span>
      </div>`;
    statsGrid.appendChild(div);
  });

  // Renderizar cards según módulos activos
  const dashGrid = document.getElementById('dashboardGrid');
  dashGrid.innerHTML = '';

  if (modulos.includes('ventas')) {
    dashGrid.innerHTML += `
      <div class="card">
        <div class="card-header">
          <h3>Últimas Ventas</h3>
          <a href="#" onclick="showSection('ventas')" class="ver-mas">Ver todas</a>
        </div>
        <div id="ultimasVentas" class="list-empty"><p>No hay ventas hoy</p></div>
      </div>`;
  }

  if (modulos.includes('inventario')) {
    dashGrid.innerHTML += `
      <div class="card">
        <div class="card-header">
          <h3>Stock Bajo</h3>
          <a href="#" onclick="showSection('inventario')" class="ver-mas">Ver todos</a>
        </div>
        <div id="stockBajoList" class="list-empty"><p>Todo en orden</p></div>
      </div>`;
  }

  if (modulos.includes('clientes')) {
    dashGrid.innerHTML += `
      <div class="card">
        <div class="card-header">
          <h3>Últimos Clientes</h3>
          <a href="#" onclick="showSection('clientes')" class="ver-mas">Ver todos</a>
        </div>
        <div id="ultimosClientes" class="list-empty"><p>No hay clientes aún</p></div>
      </div>`;
  }

  if (modulos.includes('agenda')) {
    dashGrid.innerHTML += `
      <div class="card">
        <div class="card-header">
          <h3>Citas de Hoy</h3>
          <a href="#" onclick="showSection('agenda')" class="ver-mas">Ver todas</a>
        </div>
        <div id="citasHoy" class="list-empty"><p>No hay citas hoy</p></div>
      </div>`;
  }

  if (typeof lucide !== 'undefined') lucide.createIcons();

  // Cargar datos según módulos activos
  if (modulos.includes('ventas')) {
    const { data: ventasHoy } = await db.from('ventas').select('total')
      .eq('negocio_id', negocioId).gte('created_at', hoy + 'T00:00:00');
    const total = (ventasHoy || []).reduce((s, v) => s + v.total, 0);
    document.getElementById('statVentasHoy')?.textContent && (document.getElementById('statVentasHoy').textContent = formatMoney(total));

    const { data: ultimas } = await db.from('ventas')
      .select('id, total, created_at, venta_items(cantidad, precio_unitario, productos(nombre))')
      .eq('negocio_id', negocioId).order('created_at', { ascending: false }).limit(5);
    renderUltimasVentas(ultimas || []);
  }

  if (modulos.includes('inventario')) {
    const { count: totalProductos } = await db.from('productos')
      .select('*', { count: 'exact', head: true }).eq('negocio_id', negocioId);
    document.getElementById('statProductos') && (document.getElementById('statProductos').textContent = totalProductos || 0);

    const { data: stockBajo } = await db.from('productos')
      .select('nombre, stock, stock_minimo').eq('negocio_id', negocioId).lte('stock', 5);
    document.getElementById('statStockBajo') && (document.getElementById('statStockBajo').textContent = stockBajo?.length || 0);
    renderStockBajo(stockBajo || []);
  }

  if (modulos.includes('caja')) {
    const { data: ingresos } = await db.from('caja').select('monto').eq('negocio_id', negocioId).eq('tipo', 'ingreso');
    const { data: egresos }  = await db.from('caja').select('monto').eq('negocio_id', negocioId).eq('tipo', 'egreso');
    const saldo = (ingresos || []).reduce((s, r) => s + r.monto, 0) - (egresos || []).reduce((s, r) => s + r.monto, 0);
    document.getElementById('statCaja') && (document.getElementById('statCaja').textContent = formatMoney(saldo));
  }

  if (modulos.includes('empleados')) {
    const { count } = await db.from('empleados').select('*', { count: 'exact', head: true }).eq('negocio_id', negocioId);
    document.getElementById('statEmpleados') && (document.getElementById('statEmpleados').textContent = count || 0);
  }

  if (modulos.includes('clientes')) {
    const { count } = await db.from('clientes').select('*', { count: 'exact', head: true }).eq('negocio_id', negocioId);
    document.getElementById('statClientes') && (document.getElementById('statClientes').textContent = count || 0);

    const { data: ultimos } = await db.from('clientes')
      .select('id, nombre, telefono').eq('negocio_id', negocioId)
      .order('created_at', { ascending: false }).limit(5);
    renderUltimosClientes(ultimos || []);
  }

  if (modulos.includes('agenda')) {
    const { data: citasHoy } = await db.from('citas')
      .select('id, hora, duracion, servicio, estado, clientes(nombre)')
      .eq('negocio_id', negocioId).eq('fecha', hoy).order('hora');
    const lista = citasHoy || [];
    document.getElementById('statAgenda') && (document.getElementById('statAgenda').textContent = lista.length);
    renderCitasHoy(lista);
  }
}

function renderUltimasVentas(ventas) {
  const el = document.getElementById('ultimasVentas');
  if (!ventas.length) {
    el.innerHTML = '<p class="empty-text">No hay ventas hoy</p>';
    return;
  }

  el.innerHTML = ventas.map(v => {
    const item = v.venta_items?.[0];
    const nombreProducto = item?.productos?.nombre || 'Venta';
    return `
      <div class="movimiento-item">
        <div class="movimiento-info">
          <span class="movimiento-desc">${nombreProducto}</span>
          <span class="movimiento-hora">${formatTime(v.created_at)}</span>
        </div>
        <span class="movimiento-monto ingreso">${formatMoney(v.total)}</span>
      </div>
    `;
  }).join('');
}

function renderUltimosClientes(lista) {
  const el = document.getElementById('ultimosClientes');
  if (!el) return;
  if (!lista.length) {
    el.innerHTML = '<p class="empty-text">No hay pacientes aún</p>';
    return;
  }
  el.innerHTML = lista.map(c => `
    <div class="movimiento-item">
      <div class="movimiento-info">
        <span class="movimiento-desc">${c.nombre}</span>
        <span class="movimiento-hora">${c.telefono || ''}</span>
      </div>
    </div>
  `).join('');
}

function renderCitasHoy(lista) {
  const el = document.getElementById('citasHoy');
  if (!el) return;
  if (!lista.length) {
    el.innerHTML = '<p class="empty-text">No hay citas hoy</p>';
    return;
  }
  const estadoLabel = { pendiente: '🕐', confirmada: '✅', completada: '✔️', cancelada: '❌' };
  el.innerHTML = lista.map(c => {
    const hora = c.hora ? c.hora.slice(0, 5) : '--:--';
    const nombre = c.clientes?.nombre || 'Paciente';
    const icono = estadoLabel[c.estado] || '🕐';
    return `
      <div class="movimiento-item">
        <div class="movimiento-info">
          <span class="movimiento-desc">${icono} ${nombre}</span>
          <span class="movimiento-hora">${c.servicio || 'Cita'}</span>
        </div>
        <span class="movimiento-monto" style="color:var(--text-secondary);font-size:13px">${hora}</span>
      </div>
    `;
  }).join('');
}

function renderStockBajo(productos) {
  const el = document.getElementById('stockBajoList');
  if (!productos.length) {
    el.innerHTML = '<p class="empty-text">Todo en orden ✅</p>';
    return;
  }

  el.innerHTML = productos.map(p => `
    <div class="movimiento-item">
      <span class="movimiento-desc">${p.nombre}</span>
      <span class="badge-stock ${p.stock === 0 ? 'out' : 'low'}">
        ${p.stock === 0 ? 'Sin stock' : `${p.stock} unidades`}
      </span>
    </div>
  `).join('');
}
