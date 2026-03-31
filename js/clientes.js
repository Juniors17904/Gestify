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
  const cont = document.getElementById('listaClientes');
  if (!lista.length) {
    cont.innerHTML = '<p class="empty-text">Sin clientes aún</p>';
    return;
  }

  cont.innerHTML = lista.map(c => {
    const inicial = c.nombre.charAt(0).toUpperCase();
    const colores = ['#EEF0FF,#6C63FF','#D1FAE5,#065F46','#FEF3C7,#92400E','#DBEAFE,#1D4ED8','#FCE7F3,#9D174D'];
    const idx = c.nombre.charCodeAt(0) % colores.length;
    const [bg, color] = colores[idx].split(',');
    const tel = c.telefono || '—';
    const email = c.email || '—';
    const notas = c.notas || '—';
    const waLink = c.telefono ? `https://wa.me/51${c.telefono.replace(/\D/g,'')}` : null;
    return `
    <div class="acord-cliente">
      <div class="acord-cliente-head" onclick="toggleAcordCliente(this)">
        <div class="acord-cliente-av" style="background:${bg};color:${color}">${inicial}</div>
        <div class="acord-cliente-info">
          <div class="acord-cliente-nombre">${c.nombre}</div>
          <div class="acord-cliente-tel">${tel}</div>
        </div>
        <span class="acord-cliente-arrow">▼</span>
      </div>
      <div class="acord-cliente-body">
        <div class="acord-cliente-row"><span class="acord-cliente-lbl">Teléfono</span><span class="acord-cliente-val">${tel}</span></div>
        <div class="acord-cliente-row"><span class="acord-cliente-lbl">Email</span><span class="acord-cliente-val">${email}</span></div>
        <div class="acord-cliente-row"><span class="acord-cliente-lbl">Notas</span><span class="acord-cliente-val">${notas}</span></div>
        <div class="acord-cliente-acts">
          ${waLink ? `<button class="acord-cliente-btn wa" onclick="window.open('${waLink}','_blank')">📱 WhatsApp</button>` : ''}
          <button class="acord-cliente-btn edit" onclick="editarCliente('${c.id}')">✏️ Editar</button>
          <button class="acord-cliente-btn del" onclick="eliminarCliente('${c.id}')">🗑️ Borrar</button>
        </div>
      </div>
    </div>`;
  }).join('');
}

function toggleAcordCliente(head) {
  const body = head.nextElementSibling;
  const arrow = head.querySelector('.acord-cliente-arrow');
  const isOpen = body.classList.contains('open');
  document.querySelectorAll('.acord-cliente-body').forEach(b => b.classList.remove('open'));
  document.querySelectorAll('.acord-cliente-arrow').forEach(a => a.classList.remove('open'));
  if (!isOpen) { body.classList.add('open'); arrow.classList.add('open'); }
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
  // No mostrar lista hasta que el usuario escriba
  const el = document.getElementById('citaClientesLista');
  if (el) el.innerHTML = '';
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
  if (!q) {
    document.getElementById('citaClientesLista').innerHTML = '';
    return;
  }
  const filtrados = _clientesLista.filter(c => c.nombre.toLowerCase().includes(q));
  renderClientesLista(filtrados);
}

function seleccionarClienteCita(id, nombre) {
  document.getElementById('citaClienteId').value = id;
  document.getElementById('citaBuscarCliente').value = nombre;
  document.getElementById('citaClientesLista').innerHTML = '';
}
