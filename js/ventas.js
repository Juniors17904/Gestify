// ===== VENTAS =====

let productosVenta = [];
let carritoVenta   = []; // { productoId, nombre, precio, cantidad, stock, categoria }
let posQueryActual = '';

async function loadVentas() {
  const tieneInventario = currentBusiness?.modulos?.includes('inventario');
  if (tieneInventario) {
    const { data } = await db.from('productos')
      .select('id, nombre, precio, stock, sku, categorias(nombre)')
      .eq('negocio_id', currentBusiness.id)
      .gt('stock', 0)
      .order('nombre');
    productosVenta = data || [];
  }
  await Promise.all([ventasPeriodo('hoy'), cargarStatsVentas()]);
}

// ===== POS =====

function abrirPOS() {
  carritoVenta = [];
  posQueryActual = '';
  document.getElementById('posVenta').style.display = 'flex';
  document.getElementById('posBuscar').value = '';
  renderPOSLista(productosVenta);
  renderPOSBarra();
}

function cerrarPOS() {
  document.getElementById('posVenta').style.display = 'none';
}

function filtrarPOS(query) {
  posQueryActual = query.toLowerCase();
  const filtrados = productosVenta.filter(p =>
    p.nombre.toLowerCase().includes(posQueryActual) ||
    (p.categorias?.nombre || '').toLowerCase().includes(posQueryActual) ||
    (p.sku || '').toLowerCase().includes(posQueryActual)
  );
  renderPOSLista(filtrados);
}

function renderPOSLista(lista) {
  const el = document.getElementById('posLista');
  if (!el) return;
  if (!lista.length) {
    el.innerHTML = '<div style="text-align:center;padding:40px 0;color:#94A3B8;font-size:14px">Sin resultados</div>';
    return;
  }
  el.innerHTML = lista.map(p => {
    const enCarrito = carritoVenta.find(i => i.productoId === p.id);
    const cant = enCarrito?.cantidad || 0;
    return `<div style="display:flex;align-items:center;gap:12px;padding:14px 0;border-bottom:1px solid #F1F5F9">
      <div style="width:44px;height:44px;border-radius:12px;background:#FFF7ED;display:flex;align-items:center;justify-content:center;flex-shrink:0">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>
      </div>
      <div style="flex:1;min-width:0">
        <div style="font-size:14px;font-weight:700;color:#1E293B">${p.nombre}</div>
        <div style="font-size:12px;color:#94A3B8;margin-top:2px">
          ${p.categorias?.nombre ? `${p.categorias.nombre} · ` : ''}
          <span style="color:#22C55E;font-weight:600">Stock: ${p.stock}</span>
        </div>
      </div>
      <span style="font-size:14px;font-weight:700;color:#1E293B;flex-shrink:0">${formatMoney(p.precio)}</span>
      ${cant === 0
        ? `<button onclick="posAgregar('${p.id}')" style="width:36px;height:36px;border-radius:50%;border:none;background:var(--primary);color:white;font-size:20px;font-weight:700;cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0">+</button>`
        : `<div style="display:flex;align-items:center;gap:6px;flex-shrink:0">
            <button onclick="posRestar('${p.id}')" style="width:30px;height:30px;border-radius:50%;border:1.5px solid #E2E8F0;background:white;font-size:18px;font-weight:700;cursor:pointer;color:#64748B;display:flex;align-items:center;justify-content:center">−</button>
            <span style="font-size:15px;font-weight:800;color:var(--primary);min-width:20px;text-align:center">${cant}</span>
            <button onclick="posAgregar('${p.id}')" style="width:30px;height:30px;border-radius:50%;border:none;background:var(--primary);color:white;font-size:18px;font-weight:700;cursor:pointer;display:flex;align-items:center;justify-content:center">+</button>
           </div>`
      }
    </div>`;
  }).join('');
}

function posAgregar(productoId) {
  const prod = productosVenta.find(p => p.id === productoId);
  if (!prod) return;
  const item = carritoVenta.find(i => i.productoId === productoId);
  if (item) {
    if (item.cantidad >= prod.stock) { showToast(`Stock máximo: ${prod.stock}`, 'error'); return; }
    item.cantidad++;
  } else {
    carritoVenta.push({ productoId, nombre: prod.nombre, precio: prod.precio, cantidad: 1, stock: prod.stock });
  }
  filtrarPOS(posQueryActual);
  renderPOSBarra();
}

function posRestar(productoId) {
  const item = carritoVenta.find(i => i.productoId === productoId);
  if (!item) return;
  item.cantidad--;
  if (item.cantidad === 0) carritoVenta.splice(carritoVenta.indexOf(item), 1);
  filtrarPOS(posQueryActual);
  renderPOSBarra();
}

function renderPOSBarra() {
  const total = carritoVenta.reduce((s, i) => s + i.precio * i.cantidad, 0);
  const count = carritoVenta.reduce((s, i) => s + i.cantidad, 0);
  document.getElementById('posTotalDisplay').textContent = formatMoney(total);
  document.getElementById('posItemCount').textContent = count ? `${count} item${count > 1 ? 's' : ''}` : 'Sin items';
  const btn = document.getElementById('posConfirmarBtn');
  if (btn) {
    btn.style.background = count ? 'var(--primary)' : '#CBD5E1';
    btn.style.cursor = count ? 'pointer' : 'not-allowed';
  }
}

function confirmarPOS() {
  if (!carritoVenta.length) return;
  const subtotal = carritoVenta.reduce((s, i) => s + i.precio * i.cantidad, 0);
  const resumen = document.getElementById('posResumen');
  if (resumen) {
    resumen.innerHTML = `
      <div style="background:#F8FAFC;border-radius:12px;padding:14px;margin-bottom:12px">
        <div style="font-size:10px;font-weight:700;color:#94A3B8;letter-spacing:.6px;margin-bottom:10px">PRODUCTOS</div>
        ${carritoVenta.map(i => `
          <div style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid #F1F5F9">
            <div style="flex:1;min-width:0">
              <div style="font-size:13px;font-weight:700;color:#1E293B;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${i.nombre}</div>
              <div style="font-size:12px;color:#94A3B8">${formatMoney(i.precio)} × ${i.cantidad}</div>
            </div>
            <span style="font-size:13px;font-weight:700;color:#1E293B">${formatMoney(i.precio * i.cantidad)}</span>
          </div>`).join('')}
        <div style="display:flex;justify-content:space-between;align-items:center;padding-top:12px">
          <span style="font-size:12px;font-weight:700;color:#94A3B8">SUBTOTAL</span>
          <span style="font-size:13px;font-weight:700;color:#64748B">${formatMoney(subtotal)}</span>
        </div>
      </div>
      <div style="display:flex;justify-content:space-between;align-items:center;background:var(--primary);border-radius:12px;padding:14px 16px;margin-bottom:12px">
        <span style="font-size:14px;font-weight:700;color:rgba(255,255,255,.8)">TOTAL A COBRAR</span>
        <span style="font-size:22px;font-weight:800;color:white">${formatMoney(subtotal)}</span>
      </div>`;
  }
  document.getElementById('ventaNotas').value = '';
  showModal('modalConfirmarVenta');
}

async function guardarVenta() {
  if (!carritoVenta.length) return;
  const negocioId = currentBusiness?.id;
  const total = carritoVenta.reduce((s, i) => s + i.precio * i.cantidad, 0);
  const notas = document.getElementById('ventaNotas').value.trim();

  const { data: venta, error } = await db.from('ventas')
    .insert({ negocio_id: negocioId, total })
    .select().single();
  if (error) { showToast('Error al registrar venta', 'error'); return; }

  await db.from('venta_items').insert(
    carritoVenta.map(i => ({
      venta_id: venta.id,
      producto_id: i.productoId,
      cantidad: i.cantidad,
      precio_unitario: i.precio
    }))
  );

  await Promise.all(carritoVenta.map(i =>
    db.from('productos').update({ stock: i.stock - i.cantidad }).eq('id', i.productoId)
  ));

  if (currentBusiness?.modulos?.includes('caja')) {
    const desc = carritoVenta.map(i => i.nombre).join(', ');
    await db.from('caja').insert({ negocio_id: negocioId, tipo: 'ingreso', monto: total, descripcion: `Venta: ${desc}` });
  }

  showToast('Venta registrada', 'success');
  closeModal('modalConfirmarVenta');
  cerrarPOS();

  // Recargar productos con stock actualizado
  const { data } = await db.from('productos')
    .select('id, nombre, precio, stock, sku, categorias(nombre)')
    .eq('negocio_id', currentBusiness.id)
    .gt('stock', 0)
    .order('nombre');
  productosVenta = data || [];

  filtrarVentasPorRango(fechaLocal(new Date()), fechaLocal(new Date()));
  loadDashboard();
}

// ===== VENTA SIN INVENTARIO =====

async function guardarVentaLibre(e) {
  e.preventDefault();
  const negocioId = currentBusiness?.id;
  const descripcion = document.getElementById('ventaDescripcion').value.trim() || 'Venta';
  const cantidad = parseFloat(document.getElementById('ventaCantidad').value);
  const precio   = parseFloat(document.getElementById('ventaPrecio').value);
  if (!cantidad || !precio) { showToast('Completa los campos', 'error'); return; }
  const total = cantidad * precio;

  const { data: venta, error } = await db.from('ventas').insert({ negocio_id: negocioId, total }).select().single();
  if (error) { showToast('Error al registrar venta', 'error'); return; }
  await db.from('venta_items').insert({ venta_id: venta.id, producto_id: null, cantidad, precio_unitario: precio, descripcion });

  if (currentBusiness?.modulos?.includes('caja')) {
    await db.from('caja').insert({ negocio_id: negocioId, tipo: 'ingreso', monto: total, descripcion: `Venta: ${descripcion}` });
  }
  showToast('Venta registrada', 'success');
  closeModal('modalVenta');
  filtrarVentasPorRango(fechaLocal(new Date()), fechaLocal(new Date()));
  loadDashboard();
}

function calcularTotalVenta() {
  const cant   = parseFloat(document.getElementById('ventaCantidad').value) || 0;
  const precio = parseFloat(document.getElementById('ventaPrecio').value) || 0;
  document.getElementById('ventaTotal').value = formatMoney(cant * precio);
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
    db.from('ventas').select('total').eq('negocio_id', negocioId).gte('created_at', hoy + 'T00:00:00').lte('created_at', hoy + 'T23:59:59'),
    db.from('ventas').select('total').eq('negocio_id', negocioId).gte('created_at', inicioMes + 'T00:00:00'),
  ]);
  const totalHoy = (ventasHoy || []).reduce((s, v) => s + v.total, 0);
  const totalMes  = (ventasMes  || []).reduce((s, v) => s + v.total, 0);
  const countHoy  = (ventasHoy || []).length;
  if (document.getElementById('ven-stat-hoy'))   document.getElementById('ven-stat-hoy').textContent   = formatMoney(totalHoy);
  if (document.getElementById('ven-stat-mes'))   document.getElementById('ven-stat-mes').textContent   = formatMoney(totalMes);
  if (document.getElementById('ven-stat-count')) document.getElementById('ven-stat-count').textContent = countHoy;
}

async function filtrarVentas() {
  await filtrarVentasPorRango(fechaLocal(new Date()));
}

async function filtrarVentasPorRango(desde, hasta) {
  const negocioId = currentBusiness?.id;
  if (!negocioId) return;
  if (!hasta) hasta = fechaLocal(new Date());
  const { data, error } = await db.from('ventas')
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
