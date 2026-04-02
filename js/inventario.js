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
  renderInventarioAcordeon(productos);
  actualizarSelectProductos();
}

function renderInventarioAcordeon(lista) {
  // Stats
  const min = p => p.stock_minimo || 5;
  const total = productos.length;
  const sinStock = productos.filter(p => p.stock === 0).length;
  const bajo = productos.filter(p => p.stock > 0 && p.stock <= min(p)).length;
  const elTotal = document.getElementById('inv-stat-total');
  const elBajo  = document.getElementById('inv-stat-bajo');
  const elCero  = document.getElementById('inv-stat-cero');
  if (elTotal) elTotal.textContent = total;
  if (elBajo)  elBajo.textContent  = bajo;
  if (elCero)  elCero.textContent  = sinStock;

  // Acordeón
  const el = document.getElementById('invLista');
  if (!el) return;
  if (!lista.length) {
    el.innerHTML = '<div class="list-empty"><p>Sin productos aún</p></div>';
    return;
  }

  el.innerHTML = lista.map(p => {
    const minStock = p.stock_minimo || 5;
    let badgeBg, badgeColor, badgeLabel;
    if (p.stock === 0)              { badgeBg = '#FEE2E2'; badgeColor = '#DC2626'; badgeLabel = 'Sin stock'; }
    else if (p.stock <= minStock)   { badgeBg = '#FEF3C7'; badgeColor = '#D97706'; badgeLabel = 'Stock bajo'; }
    else                            { badgeBg = '#D1FAE5'; badgeColor = '#065F46'; badgeLabel = `OK · ${p.stock}`; }

    const stockColor = p.stock === 0 ? '#DC2626' : p.stock <= minStock ? '#D97706' : '#065F46';

    return `<div style="border-radius:12px;overflow:hidden;border:1.5px solid var(--gray-200);background:var(--white)">
      <div onclick="invToggleAcord(this)" style="display:flex;align-items:center;gap:12px;padding:13px 14px;cursor:pointer">
        <div style="flex:1;min-width:0">
          <div style="font-size:14px;font-weight:700;color:var(--gray-800);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${p.nombre}</div>
          <div style="font-size:12px;color:var(--gray-400);margin-top:2px">${p.categoria || '—'}</div>
        </div>
        <span style="font-size:12px;padding:3px 10px;border-radius:20px;background:${badgeBg};color:${badgeColor};font-weight:700;white-space:nowrap;flex-shrink:0">${badgeLabel}</span>
        <svg class="inv-chv" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--gray-300)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0;transition:transform .2s"><polyline points="6 9 12 15 18 9"/></svg>
      </div>
      <div class="inv-acord-body" style="display:none;padding:0 14px 14px;border-top:1px solid var(--gray-100)">
        <div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--gray-100);font-size:13px"><span style="color:var(--gray-400);font-weight:600">Precio</span><span style="color:var(--gray-800);font-weight:700">${formatMoney(p.precio)}</span></div>
        <div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--gray-100);font-size:13px"><span style="color:var(--gray-400);font-weight:600">Stock</span><span style="color:${stockColor};font-weight:700">${p.stock} unidades</span></div>
        <div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--gray-100);font-size:13px"><span style="color:var(--gray-400);font-weight:600">Categoría</span><span style="color:var(--gray-800);font-weight:700">${p.categoria || '—'}</span></div>
        <div style="display:flex;gap:8px;margin-top:10px">
          <button onclick="editarProducto('${p.id}')" style="flex:1;padding:9px;border-radius:10px;border:1px solid var(--gray-200);background:var(--white);font-size:13px;font-weight:600;color:var(--gray-600);cursor:pointer">✏️ Editar</button>
          <button onclick="eliminarProducto('${p.id}')" style="flex:1;padding:9px;border-radius:10px;border:none;background:#FEE2E2;font-size:13px;font-weight:600;color:#DC2626;cursor:pointer">🗑️ Eliminar</button>
        </div>
      </div>
    </div>`;
  }).join('');
}

function invToggleAcord(header) {
  const body    = header.nextElementSibling;
  const chevron = header.querySelector('.inv-chv');
  const abierto = body.style.display !== 'none';
  body.style.display      = abierto ? 'none' : 'block';
  chevron.style.transform = abierto ? '' : 'rotate(180deg)';
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
  renderInventarioAcordeon(filtro);
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
