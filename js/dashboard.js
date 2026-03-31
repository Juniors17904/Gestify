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
      .order('created_at', { ascending: false }).limit(3);
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
    el.innerHTML = '<p class="empty-text">No hay clientes aún</p>';
    return;
  }
  el.classList.remove('list-empty');
  const colores = ['#EEF0FF,#6C63FF','#D1FAE5,#065F46','#FEF3C7,#92400E','#DBEAFE,#1D4ED8','#FCE7F3,#9D174D'];
  el.innerHTML = lista.map(c => {
    const inicial = c.nombre.charAt(0).toUpperCase();
    const idx = c.nombre.charCodeAt(0) % colores.length;
    const [bg, color] = colores[idx].split(',');
    return `
    <div style="display:flex;align-items:center;gap:12px;padding:6px 12px;border-bottom:1px solid var(--gray-100);margin-bottom:0">
      <div style="width:38px;height:38px;border-radius:50%;background:${bg};color:${color};font-weight:800;font-size:15px;display:flex;align-items:center;justify-content:center;flex-shrink:0">${inicial}</div>
      <div style="flex:1;min-width:0;display:flex;flex-direction:column;align-items:flex-start">
        <div style="font-weight:600;font-size:14px;color:var(--gray-800)">${c.nombre}</div>
        <div style="font-size:12px;color:var(--gray-400);margin-top:4px">${c.telefono?.trim() || '—'}</div>
      </div>
    </div>`;
  }).join('');
}

function renderCitasHoy(lista) {
  const el = document.getElementById('citasHoy');
  if (!el) return;
  if (!lista.length) {
    el.innerHTML = '<p class="empty-text">No hay citas hoy</p>';
    return;
  }
  const estadoBadge = {
    pendiente:  { bg: '#FEF3C7', color: '#92400E', label: 'Pendiente' },
    confirmada: { bg: '#DBEAFE', color: '#1E40AF', label: 'Confirmada' },
    completada: { bg: '#D1FAE5', color: '#065F46', label: 'Completada' },
    cancelada:  { bg: '#FEE2E2', color: '#991B1B', label: 'Cancelada' },
  };
  el.innerHTML = lista.map(c => {
    const hora = c.hora ? c.hora.slice(0, 5) : '--:--';
    const nombre = c.clientes?.nombre || 'Sin cliente asignado';
    const badge = estadoBadge[c.estado] || estadoBadge.pendiente;
    return `
      <div style="display:flex;align-items:flex-start;gap:12px;padding:10px 0;border-bottom:1px solid var(--gray-100)">
        <div style="width:36px;height:36px;border-radius:10px;background:${badge.bg};display:flex;align-items:center;justify-content:center;flex-shrink:0">
          <i data-lucide="calendar" style="width:16px;height:16px;stroke:${badge.color}"></i>
        </div>
        <div style="flex:1;min-width:0;text-align:left">
          <div style="font-weight:600;font-size:13px;color:var(--gray-800)">${nombre}</div>
          <div style="margin-top:3px">
            <span style="font-size:10px;padding:2px 8px;border-radius:20px;background:${badge.bg};color:${badge.color};font-weight:700">${badge.label}</span>
            ${c.servicio ? `<span style="font-size:11px;color:var(--gray-400);margin-left:4px">${c.servicio}</span>` : ''}
          </div>
        </div>
        <span style="font-size:14px;font-weight:700;color:var(--gray-600);flex-shrink:0">${hora}</span>
      </div>
    `;
  }).join('');
  if (typeof lucide !== 'undefined') lucide.createIcons();
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
