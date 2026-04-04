// ===== INVENTARIO =====

let productos = [];
let editandoProductoId = null;
let categorias = [];
let filtroCategorias = [];
let filtroProveedores = [];

async function loadCategorias() {
  const { data } = await db.from('categorias')
    .select('id, nombre')
    .eq('negocio_id', currentBusiness?.id)
    .order('nombre');
  categorias = data || [];
  renderCatLista(categorias);
}

function renderCatLista(lista) {
  const el = document.getElementById('catLista');
  if (!el) return;
  const query = (document.getElementById('catBuscar')?.value || '').trim();
  const btn = document.getElementById('catCrearBtn');

  if (!lista.length) {
    if (query) {
      // Mostrar opción de crear con ese nombre
      if (btn) { btn.style.display = 'flex'; btn.textContent = '+ Crear'; }
      el.innerHTML = `<div onclick="confirmarNuevaCat()"
        style="padding:9px 10px;border-radius:8px;font-size:13px;cursor:pointer;color:var(--primary);font-weight:600"
        onmouseover="this.style.background='#F0F9FF'" onmouseout="this.style.background='none'">
        Nueva categoría "<b>${query}</b>"
      </div>`;
    } else {
      if (btn) btn.style.display = 'none';
      el.innerHTML = '<p style="font-size:12px;color:#94A3B8;text-align:center;padding:10px 0">Sin categorías aún</p>';
    }
    return;
  }

  if (btn) btn.style.display = query ? 'flex' : 'none';
  el.innerHTML = lista.map(c => `
    <div onclick="seleccionarCategoria('${c.id}','${c.nombre}')"
      style="padding:9px 10px;border-radius:8px;font-size:13px;font-weight:500;cursor:pointer;color:#1E293B"
      onmouseover="this.style.background='#F8FAFC'" onmouseout="this.style.background='none'">
      ${c.nombre}
    </div>`).join('');
}

function toggleCatDropdown() {
  const dd = document.getElementById('catDropdown');
  const isOpen = dd.style.display !== 'none';
  dd.style.display = isOpen ? 'none' : 'block';
  if (!isOpen) document.getElementById('catBuscar').focus();
}

function filtrarCategorias(query) {
  const filtradas = categorias.filter(c => c.nombre.toLowerCase().includes(query.toLowerCase()));
  renderCatLista(filtradas);
}

function seleccionarCategoria(id, nombre) {
  document.getElementById('prodCategoriaId').value = id;
  document.getElementById('catDisplayText').textContent = nombre;
  document.getElementById('catDropdown').style.display = 'none';
  document.getElementById('catBuscar').value = '';
  renderCatLista(categorias);
}

async function confirmarNuevaCat() {
  const nombre = document.getElementById('catBuscar').value.trim();
  if (!nombre) return;
  const { data } = await db.from('categorias')
    .insert({ nombre, negocio_id: currentBusiness?.id })
    .select('id, nombre').single();
  if (data) {
    categorias.push(data);
    categorias.sort((a, b) => a.nombre.localeCompare(b.nombre));
    seleccionarCategoria(data.id, data.nombre);
  }
}

// Cerrar dropdown al click fuera
document.addEventListener('click', e => {
  const wrap = document.getElementById('catDisplay')?.closest('div');
  if (wrap && !wrap.contains(e.target)) {
    const dd = document.getElementById('catDropdown');
    if (dd) dd.style.display = 'none';
  }
});

async function loadInventario() {
  if (!currentBusiness?.id) return;
  const { data, error } = await db
    .from('productos')
    .select('*, categorias(nombre)')
    .eq('negocio_id', currentBusiness.id)
    .order('nombre');

  if (error) { showToast('Error al cargar inventario', 'error'); return; }

  productos = data || [];
  filtroCategorias = [];
  filtroProveedores = [];
  renderFiltros();
  renderInventarioAcordeon(productos);
  actualizarSelectProductos();
}

function fila(label, valor) {
  return `<div style="display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid var(--gray-100);font-size:13px"><span style="color:var(--gray-400);font-weight:600">${label}</span><span style="color:var(--gray-800);font-weight:700">${valor}</span></div>`;
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
    else                            { badgeBg = '#D1FAE5'; badgeColor = '#065F46'; badgeLabel = `Stock · ${p.stock}`; }

    const stockColor = p.stock === 0 ? '#DC2626' : p.stock <= minStock ? '#D97706' : '#065F46';

    return `<div style="border-radius:12px;overflow:hidden;border:1.5px solid var(--gray-200);background:var(--white)">
      <div onclick="invToggleAcord(this)" style="display:flex;align-items:center;gap:12px;padding:13px 14px;cursor:pointer">
        <div style="flex:1;min-width:0">
          <div style="font-size:14px;font-weight:700;color:var(--gray-800);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${p.nombre}</div>
          ${p.detalle ? `<div style="font-size:12px;color:var(--gray-500);margin-top:3px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${p.detalle}</div>` : ''}
        </div>
        <span style="font-size:12px;padding:3px 10px;border-radius:20px;background:${badgeBg};color:${badgeColor};font-weight:700;white-space:nowrap;flex-shrink:0">${badgeLabel}</span>
        <svg class="inv-chv" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--gray-300)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0;transition:transform .2s"><polyline points="6 9 12 15 18 9"/></svg>
      </div>
      <div class="inv-acord-body" style="display:none;padding:0 14px 14px;border-top:1px solid var(--gray-100)">
        ${p.sku ? fila('Código de producto', p.sku) : ''}
        ${fila('Precio venta', formatMoney(p.precio))}
        ${p.precio_costo ? fila('Precio costo', formatMoney(p.precio_costo)) : ''}
        ${p.precio_costo && p.precio ? fila('Margen', `${Math.round(((p.precio - p.precio_costo) / p.precio) * 100)}%`) : ''}
        ${fila('Stock', `<span style="color:${stockColor};font-weight:700">${p.stock} ${p.unidad || 'unidades'}</span>`)}
        ${fila('Stock mínimo', `${p.stock_minimo || 5} ${p.unidad || 'unidades'}`)}
        ${p.proveedor ? fila('Proveedor', p.proveedor) : ''}
        ${p.detalle ? `<div style="padding:8px 0;border-bottom:1px solid var(--gray-100);font-size:13px"><span style="color:var(--gray-400);font-weight:600;display:block;margin-bottom:3px">Detalle</span><span style="color:var(--gray-700)">${p.detalle}</span></div>` : ''}
        <div style="display:flex;gap:8px;margin-top:12px">
          <button onclick="editarProducto('${p.id}')" style="flex:1;padding:9px;border-radius:10px;border:1px solid var(--gray-200);background:var(--white);font-size:13px;font-weight:600;color:var(--gray-600);cursor:pointer;display:flex;align-items:center;justify-content:center;gap:6px">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
            Editar
          </button>
          <button onclick="eliminarProducto('${p.id}')" style="flex:1;padding:9px;border-radius:10px;border:none;background:#FEE2E2;font-size:13px;font-weight:600;color:#DC2626;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:6px">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
            Eliminar
          </button>
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

function aplicarFiltros() {
  const query = (document.getElementById('invBuscarInput')?.value || '').toLowerCase();
  const filtro = productos.filter(p => {
    const matchTexto = !query ||
      p.nombre.toLowerCase().includes(query) ||
      (p.categorias?.nombre || '').toLowerCase().includes(query);
    const matchCat = !filtroCategorias.length || filtroCategorias.includes(p.categoria_id);
    const matchProv = !filtroProveedores.length || filtroProveedores.includes(p.proveedor || '');
    return matchTexto && matchCat && matchProv;
  });
  renderInventarioAcordeon(filtro);
}

function buscarProducto(query) {
  aplicarFiltros();
}

function renderFiltros() {
  const elCat  = document.getElementById('filtrosCategorias');
  const elProv = document.getElementById('filtrosProveedores');
  if (!elCat || !elProv) return;

  const check = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>';
  const itemStyle = (activo) =>
    `display:flex;align-items:center;justify-content:space-between;padding:9px 10px;border-radius:8px;font-size:13px;font-weight:${activo ? '700' : '500'};cursor:pointer;color:${activo ? 'var(--primary)' : '#1E293B'};background:${activo ? '#FFF7ED' : 'transparent'}`;

  // Categorías
  const cats = [...new Map(productos.filter(p => p.categoria_id).map(p => [p.categoria_id, p.categorias?.nombre || ''])).entries()];
  if (cats.length) {
    elCat.innerHTML = `<div style="font-size:10px;font-weight:700;color:#94A3B8;letter-spacing:.6px;margin-bottom:4px">CATEGORÍA</div>` +
      cats.map(([id, nombre]) => {
        const activo = filtroCategorias.includes(id);
        return `<div style="${itemStyle(activo)}" onclick="toggleFiltroCategoria('${id}')">
          <span>${nombre}</span>${activo ? check : ''}
        </div>`;
      }).join('') + `<div style="height:1px;background:#F1F5F9;margin:6px 0"></div>`;
  } else {
    elCat.innerHTML = '';
  }

  // Proveedores
  const provs = [...new Set(productos.map(p => p.proveedor).filter(Boolean))];
  if (provs.length) {
    elProv.innerHTML = `<div style="font-size:10px;font-weight:700;color:#94A3B8;letter-spacing:.6px;margin-bottom:4px">PROVEEDOR</div>` +
      provs.map(prov => {
        const activo = filtroProveedores.includes(prov);
        return `<div style="${itemStyle(activo)}" onclick="toggleFiltroProveedor('${prov}')">
          <span>${prov}</span>${activo ? check : ''}
        </div>`;
      }).join('');
  } else {
    elProv.innerHTML = '';
  }

  // Badge
  const activos = filtroCategorias.length + filtroProveedores.length;
  const badge = document.getElementById('invFiltrarBadge');
  if (badge) { badge.textContent = activos; badge.style.display = activos ? 'inline' : 'none'; }
}

function toggleFiltroPanel() {
  const panel = document.getElementById('invFiltroPanel');
  if (!panel) return;
  const abre = panel.style.display === 'none';
  panel.style.display = abre ? 'block' : 'none';
}

function toggleFiltroCategoria(id) {
  const i = filtroCategorias.indexOf(id);
  if (i === -1) filtroCategorias.push(id); else filtroCategorias.splice(i, 1);
  renderFiltros();
  aplicarFiltros();
}

function toggleFiltroProveedor(prov) {
  const i = filtroProveedores.indexOf(prov);
  if (i === -1) filtroProveedores.push(prov); else filtroProveedores.splice(i, 1);
  renderFiltros();
  aplicarFiltros();
}

function limpiarFiltros() {
  filtroCategorias = [];
  filtroProveedores = [];
  renderFiltros();
  aplicarFiltros();
  const panel = document.getElementById('invFiltroPanel');
  if (panel) panel.style.display = 'none';
}

// Cerrar panel al click fuera
document.addEventListener('click', e => {
  const panel = document.getElementById('invFiltroPanel');
  const btn = document.getElementById('invFiltrarBtn');
  if (panel && panel.style.display !== 'none' && !panel.contains(e.target) && !btn?.contains(e.target)) {
    panel.style.display = 'none';
  }
});

async function guardarProducto(e) {
  e.preventDefault();

  let categoria_id = document.getElementById('prodCategoriaId').value || null;
  if (categoria_id === '__nueva__') {
    const nombreNueva = document.getElementById('prodCategoriaNueva').value.trim();
    if (nombreNueva) {
      const { data: catData } = await db.from('categorias')
        .insert({ nombre: nombreNueva, negocio_id: currentBusiness?.id })
        .select('id').single();
      categoria_id = catData?.id || null;
    } else {
      categoria_id = null;
    }
  }

  const capFirst = s => s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
  const producto = {
    nombre:       capFirst(document.getElementById('prodNombre').value),
    sku:          document.getElementById('prodSku').value || null,
    categoria_id,
    proveedor:    document.getElementById('prodProveedor').value || null,
    detalle:      document.getElementById('prodDetalle').value || null,
    precio:       parseFloat(document.getElementById('prodPrecio').value),
    precio_costo: parseFloat(document.getElementById('prodCosto').value) || null,
    stock:        parseInt(document.getElementById('prodStock').value),
    stock_minimo: parseInt(document.getElementById('prodStockMinimo').value) || 5,
    unidad:       document.getElementById('prodUnidad').value || null,
    negocio_id:   currentBusiness?.id
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

async function editarProducto(id) {
  const p = productos.find(x => x.id === id);
  if (!p) return;

  editandoProductoId = id;
  document.getElementById('modalProductoTitle').textContent = 'Editar Producto';
  document.getElementById('prodNombre').value       = p.nombre;
  document.getElementById('prodSku').value          = p.sku || '';
  document.getElementById('prodCategoriaId').value  = p.categoria_id || '';
  const catNombre = p.categorias?.nombre || '';
  document.getElementById('catDisplayText').textContent = catNombre;
  document.getElementById('prodProveedor').value    = p.proveedor || '';
  document.getElementById('prodDetalle').value      = p.detalle || '';
  document.getElementById('prodPrecio').value       = p.precio;
  document.getElementById('prodCosto').value        = p.precio_costo || '';
  document.getElementById('prodStock').value        = p.stock;
  document.getElementById('prodStockMinimo').value  = p.stock_minimo || 5;
  document.getElementById('prodUnidad').value       = p.unidad || '';
  await loadCategorias();
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
