// ===== DASHBOARD =====

async function loadDashboard() {
  const negocioId = currentBusiness?.id;
  if (!negocioId) return;

  const hoy = new Date().toISOString().split('T')[0];

  // Ventas de hoy
  const { data: ventasHoy } = await db
    .from('ventas')
    .select('id, total, created_at')
    .eq('negocio_id', negocioId)
    .gte('created_at', hoy + 'T00:00:00')
    .order('created_at', { ascending: false });

  const totalVentasHoy = (ventasHoy || []).reduce((s, v) => s + v.total, 0);
  document.getElementById('statVentasHoy').textContent = formatMoney(totalVentasHoy);

  // Últimas 5 ventas con items
  const { data: ultimasVentas } = await db
    .from('ventas')
    .select('id, total, created_at, venta_items(cantidad, precio_unitario, productos(nombre))')
    .eq('negocio_id', negocioId)
    .order('created_at', { ascending: false })
    .limit(5);

  renderUltimasVentas(ultimasVentas || []);

  // Total productos
  const { count: totalProductos } = await db
    .from('productos')
    .select('*', { count: 'exact', head: true })
    .eq('negocio_id', negocioId);

  document.getElementById('statProductos').textContent = totalProductos || 0;

  // Saldo en caja
  const { data: ingresos } = await db
    .from('caja')
    .select('monto')
    .eq('negocio_id', negocioId)
    .eq('tipo', 'ingreso');

  const { data: egresos } = await db
    .from('caja')
    .select('monto')
    .eq('negocio_id', negocioId)
    .eq('tipo', 'egreso');

  const saldo = (ingresos || []).reduce((s, r) => s + r.monto, 0)
              - (egresos || []).reduce((s, r) => s + r.monto, 0);

  document.getElementById('statCaja').textContent = formatMoney(saldo);

  // Stock bajo
  const { data: stockBajo } = await db
    .from('productos')
    .select('nombre, stock, stock_minimo')
    .eq('negocio_id', negocioId)
    .lte('stock', 5);

  document.getElementById('statStockBajo').textContent = stockBajo?.length || 0;
  renderStockBajo(stockBajo || []);
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
