// ===== VENTAS =====

let productosVenta = [];
let carritoVenta   = []; // { productoId, nombre, precio, cantidad, stock }

async function loadVentas() {
  const tieneInventario = currentBusiness?.modulos?.includes('inventario');
  document.getElementById('ventaProductoSelectGroup').style.display = tieneInventario ? '' : 'none';
  document.getElementById('ventaProductoLibreGroup').style.display  = tieneInventario ? 'none' : '';

  if (tieneInventario) {
    const { data } = await db.from('productos')
      .select('id, nombre, precio, stock')
      .eq('negocio_id', currentBusiness.id)
      .gt('stock', 0)
      .order('nombre');
    productosVenta = data || [];
  }

  carritoVenta = [];
  renderCarrito();
  await Promise.all([ventasPeriodo('hoy'), cargarStatsVentas()]);
}

// ===== BUSCADOR =====

function filtrarProductosVenta(query) {
  const dd = document.getElementById('ventaProductoDropdown');
  if (!query.trim()) { dd.style.display = 'none'; return; }

  const filtrados = productosVenta.filter(p =>
    p.nombre.toLowerCase().includes(query.toLowerCase())
  );

  if (!filtrados.length) {
    dd.innerHTML = `<div style="padding:10px 14px;font-size:13px;color:#94A3B8">Sin resultados</div>`;
  } else {
    dd.innerHTML = filtrados.map(p => `
      <div onclick="agregarAlCarrito('${p.id}')"
        style="padding:10px 14px;font-size:13px;cursor:pointer;display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid #F1F5F9"
        onmouseover="this.style.background='#F8FAFC'" onmouseout="this.style.background='white'">
        <span style="font-weight:600;color:#1E293B">${p.nombre}</span>
        <span style="color:#64748B;font-size:12px">${formatMoney(p.precio)} · Stock ${p.stock}</span>
      </div>`).join('');
  }
  dd.style.display = 'block';
}

document.addEventListener('click', e => {
  const dd  = document.getElementById('ventaProductoDropdown');
  const inp = document.getElementById('ventaBuscarProducto');
  if (dd && !dd.contains(e.target) && e.target !== inp) dd.style.display = 'none';
});

// ===== CARRITO =====

function agregarAlCarrito(productoId) {
  const prod = productosVenta.find(p => p.id === productoId);
  if (!prod) return;

  const enCarrito = carritoVenta.find(i => i.productoId === productoId);
  if (enCarrito) {
    if (enCarrito.cantidad < prod.stock) enCarrito.cantidad++;
  } else {
    carritoVenta.push({ productoId, nombre: prod.nombre, precio: prod.precio, cantidad: 1, stock: prod.stock });
  }

  document.getElementById('ventaBuscarProducto').value = '';
  document.getElementById('ventaProductoDropdown').style.display = 'none';
  renderCarrito();
}

function agregarItemLibre() {
  const desc   = document.getElementById('ventaDescripcion').value.trim();
  const precio = parseFloat(document.getElementById('ventaPrecioLibre').value);
  if (!desc || !precio) return;
  carritoVenta.push({ productoId: null, nombre: desc, precio, cantidad: 1, stock: Infinity });
  document.getElementById('ventaDescripcion').value = '';
  document.getElementById('ventaPrecioLibre').value = '';
  renderCarrito();
}

function cambiarCantidad(idx, delta) {
  const item = carritoVenta[idx];
  if (!item) return;
  const nueva = item.cantidad + delta;
  if (nueva < 1) { quitarDelCarrito(idx); return; }
  if (nueva > item.stock) { showToast(`Stock máximo: ${item.stock}`, 'error'); return; }
  item.cantidad = nueva;
  renderCarrito();
}

function quitarDelCarrito(idx) {
  carritoVenta.splice(idx, 1);
  renderCarrito();
}

function renderCarrito() {
  const wrap = document.getElementById('ventaCarrito');
  const el   = document.getElementById('ventaCarritoItems');
  const tot  = document.getElementById('ventaTotalDisplay');
  if (!wrap || !el || !tot) return;

  if (!carritoVenta.length) { wrap.style.display = 'none'; tot.textContent = 'S/ 0.00'; return; }

  wrap.style.display = 'block';
  el.innerHTML = carritoVenta.map((item, i) => {
    const sub = item.precio * item.cantidad;
    return `<div style="display:flex;align-items:center;gap:10px;padding:10px 14px;border-bottom:1px solid #F1F5F9">
      <div style="flex:1;min-width:0">
        <div style="font-size:13px;font-weight:700;color:#1E293B;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${item.nombre}</div>
        <div style="font-size:12px;color:#94A3B8">${formatMoney(item.precio)} c/u</div>
      </div>
      <div style="display:flex;align-items:center;gap:6px">
        <button onclick="cambiarCantidad(${i},-1)" style="width:28px;height:28px;border-radius:8px;border:1.5px solid #E2E8F0;background:white;font-size:16px;font-weight:700;cursor:pointer;color:#64748B;display:flex;align-items:center;justify-content:center">−</button>
        <span style="font-size:14px;font-weight:700;color:#1E293B;min-width:20px;text-align:center">${item.cantidad}</span>
        <button onclick="cambiarCantidad(${i},1)" style="width:28px;height:28px;border-radius:8px;border:1.5px solid #E2E8F0;background:white;font-size:16px;font-weight:700;cursor:pointer;color:#64748B;display:flex;align-items:center;justify-content:center">+</button>
      </div>
      <span style="font-size:13px;font-weight:700;color:#1E293B;min-width:60px;text-align:right">${formatMoney(sub)}</span>
      <button onclick="quitarDelCarrito(${i})" style="border:none;background:none;cursor:pointer;color:#94A3B8;padding:2px">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      </button>
    </div>`;
  }).join('');

  const total = carritoVenta.reduce((s, i) => s + i.precio * i.cantidad, 0);
  tot.textContent = formatMoney(total);
}

// ===== GUARDAR =====

async function guardarVenta() {
  const tieneInventario = currentBusiness?.modulos?.includes('inventario');
  const negocioId = currentBusiness?.id;

  if (!carritoVenta.length) { showToast('Agrega al menos un producto', 'error'); return; }

  const total = carritoVenta.reduce((s, i) => s + i.precio * i.cantidad, 0);
  const notas = document.getElementById('ventaNotas').value.trim();

  const { data: venta, error } = await db.from('ventas')
    .insert({ negocio_id: negocioId, total, notas: notas || null })
    .select().single();
  if (error) { showToast('Error al registrar venta', 'error'); return; }

  await db.from('venta_items').insert(
    carritoVenta.map(i => ({
      venta_id: venta.id,
      producto_id: i.productoId,
      cantidad: i.cantidad,
      precio_unitario: i.precio,
      descripcion: i.productoId ? null : i.nombre
    }))
  );

  if (tieneInventario) {
    await Promise.all(carritoVenta.filter(i => i.productoId).map(i =>
      db.from('productos')
        .update({ stock: i.stock - i.cantidad })
        .eq('id', i.productoId)
    ));
  }

  if (currentBusiness?.modulos?.includes('caja')) {
    const desc = carritoVenta.map(i => i.nombre).join(', ');
    await db.from('caja').insert({
      negocio_id: negocioId, tipo: 'ingreso',
      monto: total, descripcion: `Venta: ${desc}`
    });
  }

  showToast('Venta registrada', 'success');
  carritoVenta = [];
  renderCarrito();
  document.getElementById('ventaNotas').value = '';
  closeModal('modalVenta');
  filtrarVentasPorRango(fechaLocal(new Date()), fechaLocal(new Date()));
  loadDashboard();
}

// ===== PERÍODO Y FILTROS =====

async function ventasPeriodo(periodo) {
  const hoy = new Date(); hoy.setHours(0,0,0,0);
  const wrap = document.getElementById('filtroFechaWrap');
  if (wrap) wrap.style.display = 'none';
  const btnHoy = document.getElementById('vp-hoy');
  if (btnHoy) { btnHoy.style.background = 'var(--white)'; btnHoy.style.color = 'var(--primary)'; btnHoy.style.fontWeight = '700'; btnHoy.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)'; }
  const btnF = document.getElementById('vp-fecha');
  if (btnF) { btnF.style.background = 'transparent'; btnF.style.boxShadow = 'none'; }
  await filtrarVentasPorRango(fechaLocal(new Date(hoy)), fechaLocal(new Date()));
}

function abrirFiltroFecha() {
  const wrap = document.getElementById('filtroFechaWrap');
  if (!wrap) return;
  const visible = wrap.style.display === 'flex' || wrap.style.display === 'block';
  wrap.style.display = visible ? 'none' : 'block';
  const btnHoy = document.getElementById('vp-hoy');
  if (btnHoy) { btnHoy.style.background = 'transparent'; btnHoy.style.color = 'var(--gray-500)'; btnHoy.style.fontWeight = '600'; btnHoy.style.boxShadow = 'none'; }
  const btnF = document.getElementById('vp-fecha');
  if (btnF) { btnF.style.background = visible ? 'transparent' : 'var(--white)'; btnF.style.boxShadow = visible ? 'none' : '0 1px 3px rgba(0,0,0,0.1)'; }
  if (!visible) {
    const hoy = fechaLocal(new Date());
    const d = document.getElementById('filtroDesde');
    const h = document.getElementById('filtroHasta');
    if (d && !d.value) d.value = hoy;
    if (h && !h.value) h.value = hoy;
  }
}

async function aplicarFiltroFecha() {
  const desde = document.getElementById('filtroDesde')?.value;
  const hasta = document.getElementById('filtroHasta')?.value;
  if (!desde || !hasta) { showToast('Selecciona ambas fechas', 'error'); return; }
  if (desde > hasta) { showToast('La fecha inicial no puede ser mayor a la final', 'error'); return; }
  await filtrarVentasPorRango(desde, hasta);
}

async function cargarStatsVentas() {
  const negocioId = currentBusiness?.id;
  if (!negocioId) return;
  const hoy = fechaLocal(new Date());
  const inicioMes = fechaLocal(new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [{ data: ventasHoy }, { data: ventasMes }] = await Promise.all([
    db.from('ventas').select('total').eq('negocio_id', negocioId)
      .gte('created_at', hoy + 'T00:00:00').lte('created_at', hoy + 'T23:59:59'),
    db.from('ventas').select('total').eq('negocio_id', negocioId)
      .gte('created_at', inicioMes + 'T00:00:00'),
  ]);
  const totalHoy = (ventasHoy || []).reduce((s, v) => s + v.total, 0);
  const totalMes  = (ventasMes  || []).reduce((s, v) => s + v.total, 0);
  const countHoy  = (ventasHoy || []).length;
  const elHoy   = document.getElementById('ven-stat-hoy');
  const elMes   = document.getElementById('ven-stat-mes');
  const elCount = document.getElementById('ven-stat-count');
  if (elHoy)   elHoy.textContent   = formatMoney(totalHoy);
  if (elMes)   elMes.textContent   = formatMoney(totalMes);
  if (elCount) elCount.textContent = countHoy;
}

async function filtrarVentas() {
  await filtrarVentasPorRango(fechaLocal(new Date()));
}

async function filtrarVentasPorRango(desde, hasta) {
  const negocioId = currentBusiness?.id;
  if (!negocioId) return;
  if (!hasta) hasta = fechaLocal(new Date());
  const { data, error } = await db
    .from('ventas')
    .select('id, total, created_at, venta_items(cantidad, precio_unitario, productos(nombre))')
    .eq('negocio_id', negocioId)
    .gte('created_at', desde + 'T00:00:00')
    .lte('created_at', hasta + 'T23:59:59')
    .order('created_at', { ascending: false });
  if (error) { showToast('Error al cargar ventas', 'error'); return; }
  renderVentasAcordeon(data || []);
}

function renderVentasAcordeon(ventas) {
  const el = document.getElementById('ventasLista');
  if (!el) return;
  if (!ventas.length) { el.innerHTML = '<div class="list-empty"><p>Sin ventas para esta fecha</p></div>'; return; }
  const hoy  = new Date(); hoy.setHours(0,0,0,0);
  const ayer = new Date(hoy); ayer.setDate(hoy.getDate() - 1);
  const meses = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];
  el.innerHTML = ventas.map(v => {
    const hora   = formatTime(v.created_at);
    const fechaV = new Date(v.created_at); fechaV.setHours(0,0,0,0);
    let etiqueta;
    if (fechaV.getTime() === hoy.getTime())  etiqueta = 'Hoy';
    else if (fechaV.getTime() === ayer.getTime()) etiqueta = 'Ayer';
    else etiqueta = fechaV.getDate() + ' ' + meses[fechaV.getMonth()];
    const items   = v.venta_items || [];
    const primero = items[0]?.productos?.nombre || items[0]?.descripcion || 'Venta';
    const extra   = items.length > 1 ? ` <span style="font-size:11px;font-weight:500;color:var(--gray-400)">+${items.length - 1} más</span>` : '';
    const itemsHTML = items.map((it, i) => {
      const nombre   = it.productos?.nombre || it.descripcion || 'Producto';
      const subtotal = (it.precio_unitario || 0) * (it.cantidad || 1);
      const borde    = i < items.length - 1 ? 'border-bottom:1px solid var(--gray-100)' : 'border-bottom:1px solid var(--gray-200)';
      return `<div style="display:flex;justify-content:space-between;padding:7px 0;font-size:13px;${borde}">
        <span style="color:var(--gray-500)">${nombre} × ${it.cantidad || 1}</span>
        <span style="font-weight:600;color:var(--gray-700)">${formatMoney(subtotal)}</span>
      </div>`;
    }).join('');
    return `<div style="background:var(--white);border-radius:12px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,0.07)">
      <div onclick="venToggleAcord(this)" style="display:flex;align-items:center;gap:12px;padding:13px 16px;cursor:pointer">
        <div style="flex:1;min-width:0">
          <div style="font-size:14px;font-weight:600;color:var(--gray-800)">${primero}${extra}</div>
          <div style="font-size:12px;color:var(--gray-400);margin-top:2px">${etiqueta} · ${hora}</div>
        </div>
        <span style="font-size:14px;font-weight:700;color:#10B981;flex-shrink:0">${formatMoney(v.total)}</span>
        <svg class="ven-chv" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--gray-400)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0;transition:transform .2s"><polyline points="6 9 12 15 18 9"/></svg>
      </div>
      <div class="ven-acord-body" style="display:none;padding:0 16px 12px;background:var(--gray-50)">
        ${itemsHTML}
        <div style="display:flex;justify-content:space-between;padding:8px 0 0"><span style="font-size:12px;font-weight:700;color:var(--gray-600)">Total</span><span style="font-size:15px;font-weight:800;color:#10B981">${formatMoney(v.total)}</span></div>
      </div>
    </div>`;
  }).join('');
}

function venToggleAcord(header) {
  const body    = header.nextElementSibling;
  const chevron = header.querySelector('.ven-chv');
  const abierto = body.style.display !== 'none';
  body.style.display      = abierto ? 'none' : 'block';
  chevron.style.transform = abierto ? '' : 'rotate(180deg)';
}
