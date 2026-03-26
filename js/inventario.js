// ===== INVENTARIO =====

let productos = [];
let editandoProductoId = null;

async function loadInventario() {
  const { data, error } = await db
    .from('productos')
    .select('*')
    .eq('negocio_id', currentBusiness?.id)
    .order('nombre');

  if (error) { showToast('Error al cargar inventario', 'error'); return; }

  productos = data || [];
  renderTablaInventario(productos);
  actualizarSelectProductos();
}

function renderTablaInventario(lista) {
  const tbody = document.getElementById('tablaInventario');
  if (!lista.length) {
    tbody.innerHTML = '<tr><td colspan="5" class="empty-row">Sin productos aún</td></tr>';
    return;
  }

  tbody.innerHTML = lista.map(p => `
    <tr>
      <td><strong>${p.nombre}</strong></td>
      <td>${formatMoney(p.precio)}</td>
      <td>${renderStock(p.stock, p.stock_minimo)}</td>
      <td>${p.categoria || '-'}</td>
      <td>
        <button class="action-btn edit" onclick="editarProducto('${p.id}')"><i data-lucide="pencil"></i></button>
        <button class="action-btn delete" onclick="eliminarProducto('${p.id}')"><i data-lucide="trash-2"></i></button>
      </td>
    </tr>
  `).join('');
}

function renderStock(stock, stockMinimo) {
  const min = stockMinimo || 5;
  const cls = stock === 0 ? 'out' : stock <= min ? 'low' : 'ok';
  const label = stock === 0 ? 'Sin stock' : stock <= min ? `${stock} ⚠️` : stock;
  return `<span class="badge-stock ${cls}">${label}</span>`;
}

function buscarProducto(query) {
  const filtro = productos.filter(p =>
    p.nombre.toLowerCase().includes(query.toLowerCase()) ||
    (p.categoria || '').toLowerCase().includes(query.toLowerCase())
  );
  renderTablaInventario(filtro);
}

async function guardarProducto(e) {
  e.preventDefault();

  const producto = {
    nombre: document.getElementById('prodNombre').value,
    precio: parseFloat(document.getElementById('prodPrecio').value),
    stock: parseInt(document.getElementById('prodStock').value),
    stock_minimo: parseInt(document.getElementById('prodStockMinimo').value) || 5,
    categoria: document.getElementById('prodCategoria').value || null,
    negocio_id: currentBusiness?.id
  };

  let error;
  if (editandoProductoId) {
    ({ error } = await db.from('productos').update(producto).eq('id', editandoProductoId));
  } else {
    ({ error } = await db.from('productos').insert(producto));
  }

  if (error) { showToast('Error al guardar producto', 'error'); return; }

  showToast(editandoProductoId ? 'Producto actualizado' : 'Producto agregado', 'success');
  editandoProductoId = null;
  document.getElementById('modalProductoTitle').textContent = 'Agregar Producto';
  closeModal('modalProducto');
  loadInventario();
}

function editarProducto(id) {
  const p = productos.find(x => x.id === id);
  if (!p) return;

  editandoProductoId = id;
  document.getElementById('modalProductoTitle').textContent = 'Editar Producto';
  document.getElementById('prodNombre').value = p.nombre;
  document.getElementById('prodPrecio').value = p.precio;
  document.getElementById('prodStock').value = p.stock;
  document.getElementById('prodStockMinimo').value = p.stock_minimo || 5;
  document.getElementById('prodCategoria').value = p.categoria || '';
  showModal('modalProducto');
}

async function eliminarProducto(id) {
  if (!await showConfirm('¿Eliminar este producto?')) return;
  const { error } = await db.from('productos').delete().eq('id', id);
  if (error) { showToast('Error al eliminar', 'error'); return; }
  showToast('Producto eliminado', 'success');
  loadInventario();
}

async function actualizarSelectProductos() {
  const select = document.getElementById('ventaProducto');
  if (!select) return;

  const { data } = await db
    .from('productos')
    .select('id, nombre, precio, stock')
    .eq('negocio_id', currentBusiness?.id)
    .gt('stock', 0)
    .order('nombre');

  select.innerHTML = '<option value="">Selecciona un producto</option>' +
    (data || []).map(p =>
      `<option value="${p.id}" data-precio="${p.precio}" data-stock="${p.stock}">
        ${p.nombre} (Stock: ${p.stock})
      </option>`
    ).join('');
}
