// ===== VENTAS =====

async function loadVentas() {
  const tieneInventario = currentBusiness?.modulos?.includes('inventario');

  document.getElementById('ventaProductoSelectGroup').style.display = tieneInventario ? '' : 'none';
  document.getElementById('ventaProductoLibreGroup').style.display  = tieneInventario ? 'none' : '';

  if (tieneInventario) actualizarSelectProductos();

  await Promise.all([ventasPeriodo('hoy'), cargarStatsVentas()]);
}

async function ventasPeriodo(periodo) {
  const hoy = new Date();
  hoy.setHours(0,0,0,0);

  // Ocultar date picker
  const wrap = document.getElementById('filtroFechaWrap');
  if (wrap) wrap.style.display = 'none';

  // Marcar botón Hoy activo
  const btnHoy = document.getElementById('vp-hoy');
  if (btnHoy) {
    btnHoy.style.background = 'var(--white)';
    btnHoy.style.color      = 'var(--primary)';
    btnHoy.style.fontWeight = '700';
    btnHoy.style.boxShadow  = '0 1px 3px rgba(0,0,0,0.1)';
  }
  const btnF = document.getElementById('vp-fecha');
  if (btnF) { btnF.style.background = 'transparent'; btnF.style.boxShadow = 'none'; }

  await filtrarVentasPorRango(fechaLocal(new Date(hoy)), fechaLocal(new Date()));
}

function abrirFiltroFecha() {
  const wrap = document.getElementById('filtroFechaWrap');
  if (!wrap) return;
  const visible = wrap.style.display === 'flex' || wrap.style.display === 'block';
  wrap.style.display = visible ? 'none' : 'block';

  // Marcar botón 📅 activo
  const btnHoy = document.getElementById('vp-hoy');
  if (btnHoy) { btnHoy.style.background = 'transparent'; btnHoy.style.color = 'var(--gray-500)'; btnHoy.style.fontWeight = '600'; btnHoy.style.boxShadow = 'none'; }
  const btnF = document.getElementById('vp-fecha');
  if (btnF) { btnF.style.background = visible ? 'transparent' : 'var(--white)'; btnF.style.boxShadow = visible ? 'none' : '0 1px 3px rgba(0,0,0,0.1)'; }

  // Prellenar con hoy
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
  if (!ventas.length) {
    el.innerHTML = '<div class="list-empty"><p>Sin ventas para esta fecha</p></div>';
    return;
  }

  const hoy    = new Date(); hoy.setHours(0,0,0,0);
  const ayer   = new Date(hoy); ayer.setDate(hoy.getDate() - 1);
  const meses  = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];

  el.innerHTML = ventas.map((v) => {
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

