// ===== VENTAS =====

async function loadVentas() {
  actualizarSelectProductos();

  // Fecha de hoy por defecto
  const hoy = new Date().toISOString().split('T')[0];
  const filtro = document.getElementById('filtroFechaVenta');
  if (!filtro.value) filtro.value = hoy;

  await filtrarVentas();
}

async function filtrarVentas() {
  const fecha = document.getElementById('filtroFechaVenta').value;
  const inicio = fecha + 'T00:00:00';
  const fin = fecha + 'T23:59:59';

  const { data, error } = await db
    .from('ventas')
    .select('*, productos(nombre)')
    .eq('negocio_id', currentBusiness?.id || currentUser.id)
    .gte('created_at', inicio)
    .lte('created_at', fin)
    .order('created_at', { ascending: false });

  if (error) { showToast('Error al cargar ventas', 'error'); return; }

  renderTablaVentas(data || []);
}

function renderTablaVentas(ventas) {
  const tbody = document.getElementById('tablaVentas');
  if (!ventas.length) {
    tbody.innerHTML = '<tr><td colspan="5" class="empty-row">Sin ventas para esta fecha</td></tr>';
    return;
  }

  tbody.innerHTML = ventas.map(v => `
    <tr>
      <td>${formatTime(v.created_at)}</td>
      <td>${v.productos?.nombre || 'Producto'}</td>
      <td>${v.cantidad}</td>
      <td><strong>${formatMoney(v.total)}</strong></td>
      <td>${v.vendedor_nombre || '-'}</td>
    </tr>
  `).join('');
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
  const notas = document.getElementById('ventaNotas').value;

  if (!productoId) { showToast('Selecciona un producto', 'error'); return; }

  const select = document.getElementById('ventaProducto');
  const opt = select.options[select.selectedIndex];
  const stockActual = parseInt(opt.dataset.stock);

  if (cantidad > stockActual) {
    showToast(`Stock insuficiente (disponible: ${stockActual})`, 'error');
    return;
  }

  const negocioId = currentBusiness?.id || currentUser.id;
  const { data: { user } } = await db.auth.getUser();
  const vendedorNombre = user.user_metadata?.name || user.email;

  // Registrar venta
  const { error } = await db.from('ventas').insert({
    negocio_id: negocioId,
    producto_id: productoId,
    cantidad,
    precio_unitario: precio,
    total: cantidad * precio,
    notas: notas || null,
    vendedor_id: user.id,
    vendedor_nombre: vendedorNombre
  });

  if (error) { showToast('Error al registrar venta', 'error'); return; }

  // Actualizar stock del producto
  await db.rpc('decrementar_stock', {
    p_producto_id: productoId,
    p_cantidad: cantidad
  });

  // Registrar ingreso en caja automáticamente
  await db.from('caja_movimientos').insert({
    negocio_id: negocioId,
    tipo: 'ingreso',
    monto: cantidad * precio,
    descripcion: `Venta: ${opt.text.split(' (')[0]}`,
    user_id: user.id
  });

  showToast('Venta registrada', 'success');
  closeModal('modalVenta');
  filtrarVentas();
  loadDashboard();
}
