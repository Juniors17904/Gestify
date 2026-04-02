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
      <div class="card" style="padding:0;overflow:hidden">
        <div style="display:flex;align-items:center;justify-content:space-between;padding:12px 16px 10px;border-bottom:1px solid var(--gray-100)">
          <h3 style="font-size:14px;font-weight:700;color:var(--gray-800);margin:0">Últimas Ventas</h3>
          <a href="#" onclick="showSection('ventas')" class="ver-mas">Ver todas</a>
        </div>
        <div style="display:flex;gap:0;border-bottom:1px solid var(--gray-100)">
          <div style="flex:1;padding:10px;text-align:center;border-right:1px solid var(--gray-100)"><div style="font-size:10px;color:var(--gray-400);font-weight:700;margin-bottom:2px">HOY</div><div id="uvStatHoy" style="font-size:17px;font-weight:800;color:var(--primary)">—</div></div>
          <div style="flex:1;padding:10px;text-align:center;border-right:1px solid var(--gray-100)"><div style="font-size:10px;color:var(--gray-400);font-weight:700;margin-bottom:2px">MES</div><div id="uvStatMes" style="font-size:17px;font-weight:800;color:var(--gray-800)">—</div></div>
          <div style="flex:1;padding:10px;text-align:center"><div style="font-size:10px;color:var(--gray-400);font-weight:700;margin-bottom:2px">VENTAS</div><div id="uvStatCount" style="font-size:17px;font-weight:800;color:var(--gray-800)">—</div></div>
        </div>
        <div id="ultimasVentas" style="padding:8px 12px 12px;display:flex;flex-direction:column;gap:6px"><p class="empty-text">No hay ventas hoy</p></div>
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

    const inicioMes = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
    const { data: ventasMes } = await db.from('ventas').select('total')
      .eq('negocio_id', negocioId).gte('created_at', inicioMes + 'T00:00:00');
    const totalMes = (ventasMes || []).reduce((s, v) => s + v.total, 0);
    document.getElementById('uvStatHoy')   && (document.getElementById('uvStatHoy').textContent   = formatMoney(total));
    document.getElementById('uvStatMes')   && (document.getElementById('uvStatMes').textContent   = formatMoney(totalMes));
    document.getElementById('uvStatCount') && (document.getElementById('uvStatCount').textContent = (ventasHoy || []).length);

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

  const hoy  = new Date(); hoy.setHours(0,0,0,0);
  const ayer = new Date(hoy); ayer.setDate(hoy.getDate() - 1);
  const meses = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];

  el.innerHTML = ventas.map((v) => {
    const items    = v.venta_items || [];
    const hora     = formatTime(v.created_at);
    const fechaV   = new Date(v.created_at); fechaV.setHours(0,0,0,0);
    const etiqueta = fechaV.getTime() === hoy.getTime()  ? 'Hoy'
                   : fechaV.getTime() === ayer.getTime() ? 'Ayer'
                   : fechaV.getDate() + ' ' + meses[fechaV.getMonth()];
    const primero  = items[0]?.productos?.nombre || items[0]?.descripcion || 'Venta';
    const extra    = items.length > 1 ? ` <span style="font-size:11px;font-weight:500;color:var(--gray-400)">+${items.length - 1} más</span>` : '';
    const itemsHTML = items.map((it, i) => {
      const nombre   = it.productos?.nombre || it.descripcion || 'Producto';
      const subtotal = (it.precio_unitario || 0) * (it.cantidad || 1);
      const borde    = i < items.length - 1 ? 'border-bottom:1px solid var(--gray-100)' : 'border-bottom:1px solid var(--gray-200)';
      return `<div style="display:flex;justify-content:space-between;padding:6px 0;font-size:12px;${borde}">
        <span style="color:var(--gray-500)">${nombre} × ${it.cantidad || 1}</span>
        <span style="font-weight:600;color:var(--gray-700)">${formatMoney(subtotal)}</span>
      </div>`;
    }).join('');

    return `<div style="background:var(--gray-50);border-radius:10px;overflow:hidden">
      <div onclick="this.nextElementSibling.style.display=this.nextElementSibling.style.display==='none'?'block':'none';this.querySelector('.db-chv').style.transform=this.nextElementSibling.style.display==='block'?'rotate(180deg)':''" style="display:flex;align-items:center;gap:10px;padding:10px 12px;cursor:pointer">
        <div style="flex:1;min-width:0">
          <div style="font-size:13px;font-weight:600;color:var(--gray-800)">${primero}${extra}</div>
          <div style="font-size:11px;color:var(--gray-400);margin-top:1px">${etiqueta} · ${hora}</div>
        </div>
        <span style="font-size:13px;font-weight:700;color:#10B981;flex-shrink:0">${formatMoney(v.total)}</span>
        <svg class="db-chv" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--gray-400)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0;transition:transform .2s"><polyline points="6 9 12 15 18 9"/></svg>
      </div>
      <div style="display:none;padding:0 12px 12px;background:var(--white)">
        ${itemsHTML}
        <div style="display:flex;justify-content:space-between;padding:8px 0 0"><span style="font-size:12px;font-weight:700;color:var(--gray-600)">Total</span><span style="font-size:15px;font-weight:800;color:#10B981">${formatMoney(v.total)}</span></div>
      </div>
    </div>`;
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
