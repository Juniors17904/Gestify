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
        <button class="action-btn edit" onclick="editarCliente('${c.id}')">✏️</button>
        <button class="action-btn delete" onclick="eliminarCliente('${c.id}')">🗑️</button>
      </td>
    </tr>
  `).join('');
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

async function actualizarSelectClientes() {
  const select = document.getElementById('citaClienteId');
  if (!select) return;

  const { data } = await db
    .from('clientes')
    .select('id, nombre')
    .eq('negocio_id', currentBusiness?.id)
    .order('nombre');

  const valorActual = select.value;
  select.innerHTML = '<option value="">Selecciona un cliente</option>' +
    (data || []).map(c =>
      `<option value="${c.id}">${c.nombre}</option>`
    ).join('');
  if (valorActual) select.value = valorActual;
}
