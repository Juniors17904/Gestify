// ===== INVENTARIO =====

let productos = [];
let editandoProductoId = null;

async function loadInventario() {
  const { data, error } = await db
    .from('productos')
    .select('*')
    .eq('negocio_id', currentBusiness?.id || currentUser.id)
    .order('nombre');

  if (error) { showToast('Error al cargar inventario', 'error'); return; }

  productos = data || [];
  renderTablaInventario(productos);
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
      <td>${renderStock(p.stock)}</td>
      <td>${p.categoria || '-'}</td>
      <td>
        <button class="action-btn edit" onclick="editarProducto('${p.id}')">✏️</button>
        <button class="action-btn delete" onclick="eliminarProducto('${p.id}')">🗑️</button>
      </td>
    </tr>
  `).join('');
}

function renderStock(stock) {
  const min = APP_CONFIG.stockMinimo;
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
    categoria: document.getElementById('prodCategoria').value || null,
    precio_compra: parseFloat(document.getElementById('prodPrecioCompra').value) || null,
    negocio_id: currentBusiness?.id || currentUser.id
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
  actualizarSelectProductos();
}

function editarProducto(id) {
  const p = productos.find(x => x.id === id);
  if (!p) return;

  editandoProductoId = id;
  document.getElementById('modalProductoTitle').textContent = 'Editar Producto';
  document.getElementById('prodId').value = id;
  document.getElementById('prodNombre').value = p.nombre;
  document.getElementById('prodPrecio').value = p.precio;
  document.getElementById('prodStock').value = p.stock;
  document.getElementById('prodCategoria').value = p.categoria || '';
  document.getElementById('prodPrecioCompra').value = p.precio_compra || '';

  showModal('modalProducto');
}

async function eliminarProducto(id) {
  if (!confirm('¿Eliminar este producto?')) return;

  const { error } = await db.from('productos').delete().eq('id', id);
  if (error) { showToast('Error al eliminar', 'error'); return; }

  showToast('Producto eliminado', 'success');
  loadInventario();
}

// Para el select de ventas
async function actualizarSelectProductos() {
  const select = document.getElementById('ventaProducto');
  if (!select) return;

  const { data } = await db
    .from('productos')
    .select('id, nombre, precio, stock')
    .eq('negocio_id', currentBusiness?.id || currentUser.id)
    .gt('stock', 0)
    .order('nombre');

  select.innerHTML = '<option value="">Selecciona un producto</option>';
  (data || []).forEach(p => {
    const opt = document.createElement('option');
    opt.value = p.id;
    opt.textContent = `${p.nombre} (Stock: ${p.stock})`;
    opt.dataset.precio = p.precio;
    opt.dataset.stock = p.stock;
    select.appendChild(opt);
  });
}
