// ===== VENTAS =====

async function loadVentas() {
  actualizarSelectProductos();

  const hoy = new Date().toISOString().split('T')[0];
  const filtro = document.getElementById('filtroFechaVenta');
  if (!filtro.value) filtro.value = hoy;

  await filtrarVentas();
}

async function filtrarVentas() {
  const fecha = document.getElementById('filtroFechaVenta').value;

  const { data, error } = await db
    .from('ventas')
    .select('id, total, created_at, venta_items(cantidad, precio_unitario, productos(nombre))')
    .eq('negocio_id', currentBusiness?.id)
    .gte('created_at', fecha + 'T00:00:00')
    .lte('created_at', fecha + 'T23:59:59')
    .order('created_at', { ascending: false });

  if (error) { showToast('Error al cargar ventas', 'error'); return; }

  renderTablaVentas(data || []);
}

function renderTablaVentas(ventas) {
  const tbody = document.getElementById('tablaVentas');
  if (!ventas.length) {
    tbody.innerHTML = '<tr><td colspan="4" class="empty-row">Sin ventas para esta fecha</td></tr>';
    return;
  }

  tbody.innerHTML = ventas.map(v => {
    const item = v.venta_items?.[0];
    return `
      <tr>
        <td>${formatTime(v.created_at)}</td>
        <td>${item?.productos?.nombre || '-'}</td>
        <td>${item?.cantidad || '-'}</td>
        <td><strong>${formatMoney(v.total)}</strong></td>
      </tr>
    `;
  }).join('');
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

  const productoId = document.getElementById('ventaProducto').value;
  const cantidad = parseInt(document.getElementById('ventaCantidad').value);
  const precio = parseFloat(document.getElementById('ventaPrecio').value);
  const negocioId = currentBusiness?.id;

  if (!productoId) { showToast('Selecciona un producto', 'error'); return; }

  const select = document.getElementById('ventaProducto');
  const opt = select.options[select.selectedIndex];
  const stockActual = parseInt(opt.dataset.stock);

  if (cantidad > stockActual) {
    showToast(`Stock insuficiente (disponible: ${stockActual})`, 'error');
    return;
  }

  // Registrar venta
  const { data: venta, error } = await db.from('ventas').insert({
    negocio_id: negocioId,
    total: cantidad * precio
  }).select().single();

  if (error) { showToast('Error al registrar venta', 'error'); return; }

  // Registrar item
  await db.from('venta_items').insert({
    venta_id: venta.id,
    producto_id: productoId,
    cantidad,
    precio_unitario: precio
  });

  // Actualizar stock
  await db.from('productos').update({ stock: stockActual - cantidad }).eq('id', productoId);

  // Registrar ingreso en caja
  await db.from('caja').insert({
    negocio_id: negocioId,
    tipo: 'ingreso',
    monto: cantidad * precio,
    descripcion: `Venta: ${opt.text.split(' (')[0]}`
  });

  showToast('Venta registrada', 'success');
  closeModal('modalVenta');
  filtrarVentas();
  loadDashboard();
}

