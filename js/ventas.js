// ===== VENTAS =====

async function loadVentas() {
  const tieneInventario = currentBusiness?.modulos?.includes('inventario');

  document.getElementById('ventaProductoSelectGroup').style.display = tieneInventario ? '' : 'none';
  document.getElementById('ventaProductoLibreGroup').style.display  = tieneInventario ? 'none' : '';

  if (tieneInventario) actualizarSelectProductos();

  await ventasPeriodo('hoy');
  cargarStatsVentas();
}

function ventasPeriodo(periodo) {
  const hoy = new Date();
  hoy.setHours(0,0,0,0);
  let desde;
  if (periodo === 'hoy')   { desde = new Date(hoy); }
  if (periodo === 'semana'){ desde = new Date(hoy); desde.setDate(hoy.getDate() - 6); }
  if (periodo === '2sem')  { desde = new Date(hoy); desde.setDate(hoy.getDate() - 13); }
  if (periodo === 'mes')   { desde = new Date(hoy.getFullYear(), hoy.getMonth(), 1); }

  // Marcar botón activo
  ['hoy','semana','2sem','mes'].forEach(p => {
    const btn = document.getElementById('vp-' + p);
    if (!btn) return;
    const activo = p === periodo;
    btn.style.background = activo ? 'var(--white)' : 'transparent';
    btn.style.color      = activo ? 'var(--primary)' : 'var(--gray-500)';
    btn.style.fontWeight = activo ? '700' : '600';
    btn.style.boxShadow  = activo ? '0 1px 3px rgba(0,0,0,0.1)' : 'none';
  });

  filtrarVentasPorRango(desde.toISOString().split('T')[0]);
}

async function cargarStatsVentas() {
  const negocioId = currentBusiness?.id;
  const hoy = new Date().toISOString().split('T')[0];
  const inicioMes = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];

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
  const hoy = new Date().toISOString().split('T')[0];
  await filtrarVentasPorRango(hoy);
}

async function filtrarVentasPorRango(desde) {
  const hasta = new Date().toISOString().split('T')[0];

  const { data, error } = await db
    .from('ventas')
    .select('id, total, created_at, venta_items(cantidad, precio_unitario, productos(nombre))')
    .eq('negocio_id', currentBusiness?.id)
    .gte('created_at', desde + 'T00:00:00')
    .lte('created_at', hasta + 'T23:59:59')
    .order('created_at', { ascending: false });

  if (error) { showToast('Error al cargar ventas', 'error'); return; }

  renderVentasAcordeon(data || []);
}

function renderVentasAcordeon(ventas) {
  const el = document.getElementById('ventasLista');
  if (!el) return;
  if (!ventas.length) {
    el.innerHTML = '<div class="list-empty"><p>Sin ventas para esta fecha</p></div>';
    return;
  }

  el.innerHTML = ventas.map((v, idx) => {
    const hora   = formatTime(v.created_at);
    const items  = v.venta_items || [];
    const count  = items.length;
    const itemsHTML = items.map((it, i) => {
      const nombre = it.productos?.nombre || it.descripcion || 'Producto';
      const subtotal = (it.precio_unitario || 0) * (it.cantidad || 1);
      const borde = i < items.length - 1 ? 'border-bottom:1px solid var(--gray-100)' : '';
      return `<div style="display:flex;justify-content:space-between;padding:7px 0;font-size:13px;${borde}">
        <span style="color:var(--gray-600)">${nombre} × ${it.cantidad || 1}</span>
        <span style="font-weight:700;color:var(--gray-800)">${formatMoney(subtotal)}</span>
      </div>`;
    }).join('');

    return `<div style="background:var(--white);border-radius:12px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,0.07)">
      <div onclick="venToggleAcord(this)" style="display:flex;align-items:center;gap:12px;padding:13px 16px;cursor:pointer">
        <div style="flex:1;min-width:0">
          <div style="font-size:14px;font-weight:600;color:var(--gray-800)">Venta #${String(idx + 1).padStart(3,'0')}</div>
          <div style="font-size:12px;color:var(--gray-400);margin-top:2px">${hora} · ${count} producto${count !== 1 ? 's' : ''}</div>
        </div>
        <span style="font-size:14px;font-weight:700;color:#10B981;flex-shrink:0">${formatMoney(v.total)}</span>
        <svg class="ven-chv" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--gray-400)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0;transition:transform .2s"><polyline points="6 9 12 15 18 9"/></svg>
      </div>
      <div class="ven-acord-body" style="display:none;padding:0 16px 12px;background:var(--gray-50)">
        ${itemsHTML}
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

function actualizarPrecioVenta() {
  const select = document.getElementById('ventaProducto');
  const opt = select.options[select.selectedIndex];
  if (opt && opt.dataset.precio) {
    document.getElementById('ventaPrecio').value = opt.dataset.precio;
    calcularTotalVenta();
  }
}

function calcularTotalVenta() {
  const cant = parseFloat(document.getElementById('ventaCantidad').value) || 0;
  const precio = parseFloat(document.getElementById('ventaPrecio').value) || 0;
  document.getElementById('ventaTotal').value = formatMoney(cant * precio);
}

async function guardarVenta(e) {
  e.preventDefault();

  const tieneInventario = currentBusiness?.modulos?.includes('inventario');
  const cantidad  = parseFloat(document.getElementById('ventaCantidad').value);
  const precio    = parseFloat(document.getElementById('ventaPrecio').value);
  const negocioId = currentBusiness?.id;

  if (isNaN(cantidad) || cantidad <= 0) { showToast('Ingresa una cantidad válida', 'error'); return; }
  if (isNaN(precio)   || precio   <= 0) { showToast('Ingresa un precio válido', 'error'); return; }

  let productoId = null;
  let descripcion = '';

  if (tieneInventario) {
    productoId = document.getElementById('ventaProducto').value;
    if (!productoId) { showToast('Selecciona un producto', 'error'); return; }

    const select = document.getElementById('ventaProducto');
    const opt = select.options[select.selectedIndex];
    const stockActual = parseInt(opt.dataset.stock);

    if (cantidad > stockActual) {
      showToast(`Stock insuficiente (disponible: ${stockActual})`, 'error');
      return;
    }

    descripcion = opt.text.split(' (')[0];

    // Registrar venta
    const { data: venta, error } = await db.from('ventas').insert({
      negocio_id: negocioId,
      total: cantidad * precio
    }).select().single();
    if (error) { showToast('Error al registrar venta', 'error'); return; }

    await db.from('venta_items').insert({
      venta_id: venta.id,
      producto_id: productoId,
      cantidad,
      precio_unitario: precio
    });

    // Descontar stock
    await db.from('productos').update({ stock: stockActual - cantidad }).eq('id', productoId);

    if (currentBusiness?.modulos?.includes('caja')) {
      await db.from('caja').insert({
        negocio_id: negocioId, tipo: 'ingreso',
        monto: cantidad * precio, descripcion: `Venta: ${descripcion}`
      });
    }

  } else {
    descripcion = document.getElementById('ventaDescripcion').value.trim() || 'Venta';

    const { data: venta, error } = await db.from('ventas').insert({
      negocio_id: negocioId,
      total: cantidad * precio
    }).select().single();
    if (error) { showToast('Error al registrar venta', 'error'); return; }

    await db.from('venta_items').insert({
      venta_id: venta.id,
      producto_id: null,
      cantidad,
      precio_unitario: precio,
      descripcion
    });

    if (currentBusiness?.modulos?.includes('caja')) {
      await db.from('caja').insert({
        negocio_id: negocioId, tipo: 'ingreso',
        monto: cantidad * precio, descripcion: `Venta: ${descripcion}`
      });
    }
  }

  showToast('Venta registrada', 'success');
  closeModal('modalVenta');
  filtrarVentas();
  loadDashboard();
}

