// ===== CLIENTES =====

let clientes = [];
let editandoClienteId = null;

async function loadClientes() {
  const { data, error } = await db
    .from('clientes')
    .select('*')
    .eq('negocio_id', currentBusiness?.id)
    .order('nombre');

  if (error) { showToast('Error al cargar clientes', 'error'); return; }

  clientes = data || [];
  renderTablaClientes(clientes);
  actualizarSelectClientes();
}

function renderTablaClientes(lista) {
  const tbody = document.getElementById('tablaClientes');
  if (!lista.length) {
    tbody.innerHTML = '<tr><td colspan="5" class="empty-row">Sin clientes aún</td></tr>';
    return;
  }

  tbody.innerHTML = lista.map(c => `
    <tr>
      <td><strong>${c.nombre}</strong></td>
      <td>${c.telefono || '-'}</td>
      <td>${c.email || '-'}</td>
      <td style="max-width:180px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${c.notas || '-'}</td>
      <td>
        <button class="action-btn edit" onclick="editarCliente('${c.id}')"><i data-lucide="pencil"></i></button>
        <button class="action-btn delete" onclick="eliminarCliente('${c.id}')"><i data-lucide="trash-2"></i></button>
      </td>
    </tr>
  `).join('');
  if (typeof lucide !== 'undefined') lucide.createIcons();
}

function buscarCliente(query) {
  const filtro = clientes.filter(c =>
    c.nombre.toLowerCase().includes(query.toLowerCase()) ||
    (c.telefono || '').includes(query) ||
    (c.email || '').toLowerCase().includes(query.toLowerCase())
  );
  renderTablaClientes(filtro);
}

async function guardarCliente(e) {
  e.preventDefault();

  const cliente = {
    nombre: document.getElementById('clienteNombre').value.trim(),
    telefono: document.getElementById('clienteTelefono').value.trim() || null,
    email: document.getElementById('clienteEmail').value.trim() || null,
    notas: document.getElementById('clienteNotas').value.trim() || null,
    negocio_id: currentBusiness?.id
  };

  let error;
  if (editandoClienteId) {
    ({ error } = await db.from('clientes').update(cliente).eq('id', editandoClienteId));
  } else {
    ({ error } = await db.from('clientes').insert(cliente));
  }

  if (error) { showToast('Error al guardar cliente', 'error'); return; }

  showToast(editandoClienteId ? 'Cliente actualizado' : 'Cliente agregado', 'success');
  editandoClienteId = null;
  document.getElementById('modalClienteTitle').textContent = 'Agregar Cliente';
  closeModal('modalCliente');
  loadClientes();
}

function editarCliente(id) {
  const c = clientes.find(x => x.id === id);
  if (!c) return;

  editandoClienteId = id;
  document.getElementById('modalClienteTitle').textContent = 'Editar Cliente';
  document.getElementById('clienteNombre').value = c.nombre;
  document.getElementById('clienteTelefono').value = c.telefono || '';
  document.getElementById('clienteEmail').value = c.email || '';
  document.getElementById('clienteNotas').value = c.notas || '';
  showModal('modalCliente');
}

async function eliminarCliente(id) {
  if (!await showConfirm('¿Eliminar este cliente?')) return;
  const { error } = await db.from('clientes').delete().eq('id', id);
  if (error) { showToast('Error al eliminar', 'error'); return; }
  showToast('Cliente eliminado', 'success');
  loadClientes();
}

let _clientesLista = [];

async function actualizarSelectClientes() {
  const { data } = await db
    .from('clientes')
    .select('id, nombre')
    .eq('negocio_id', currentBusiness?.id)
    .order('nombre');

  _clientesLista = data || [];
  renderClientesLista(_clientesLista);
}

function renderClientesLista(lista) {
  const el = document.getElementById('citaClientesLista');
  if (!el) return;
  if (!lista.length) {
    el.innerHTML = '<p style="padding:12px;font-size:13px;color:var(--gray-400);text-align:center">Sin clientes</p>';
    return;
  }
  el.innerHTML = lista.map(c => `
    <div onclick="seleccionarClienteCita('${c.id}', '${c.nombre.replace(/'/g, "\\'")}')"
      style="padding:10px 14px;font-size:14px;cursor:pointer;border-bottom:1px solid var(--gray-100);color:var(--gray-800);transition:background 0.15s"
      onmouseover="this.style.background='var(--gray-50)'" onmouseout="this.style.background=''">
      ${c.nombre}
    </div>
  `).join('');
}

function filtrarClientesLista() {
  const q = document.getElementById('citaBuscarCliente').value.toLowerCase();
  const filtrados = _clientesLista.filter(c => c.nombre.toLowerCase().includes(q));
  renderClientesLista(filtrados);
}

function seleccionarClienteCita(id, nombre) {
  document.getElementById('citaClienteId').value = id;
  document.getElementById('citaBuscarCliente').value = nombre;
  document.getElementById('citaClientesLista').innerHTML = '';
}
