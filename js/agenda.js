// ===== AGENDA =====

let citas = [];
let editandoCitaId = null;
let agendaFechaActual = new Date();

async function loadAgenda() {
  agendaFechaActual = agendaFechaActual || new Date();
  await cargarCitasDelDia();
}

async function cargarCitasDelDia() {
  const fecha = agendaFechaActual.toISOString().split('T')[0];
  actualizarLabelFecha();

  const { data, error } = await db
    .from('citas')
    .select('*, clientes(nombre, telefono)')
    .eq('negocio_id', currentBusiness?.id)
    .eq('fecha', fecha)
    .order('hora');

  if (error) { showToast('Error al cargar citas', 'error'); return; }

  citas = data || [];
  renderAgendaLista(citas);
}

function actualizarLabelFecha() {
  const hoy = new Date();
  const esHoy = agendaFechaActual.toDateString() === hoy.toDateString();
  const ayer = new Date(hoy); ayer.setDate(ayer.getDate() - 1);
  const manana = new Date(hoy); manana.setDate(hoy.getDate() + 1);

  let label;
  if (esHoy) {
    label = 'Hoy — ' + formatFechaCorta(agendaFechaActual);
  } else if (agendaFechaActual.toDateString() === ayer.toDateString()) {
    label = 'Ayer — ' + formatFechaCorta(agendaFechaActual);
  } else if (agendaFechaActual.toDateString() === manana.toDateString()) {
    label = 'Mañana — ' + formatFechaCorta(agendaFechaActual);
  } else {
    label = formatFechaLarga(agendaFechaActual);
  }

  document.getElementById('agendaFechaLabel').textContent = label;
}

function formatFechaCorta(d) {
  return d.toLocaleDateString('es-PE', { day: '2-digit', month: 'short' });
}

function formatFechaLarga(d) {
  return d.toLocaleDateString('es-PE', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' });
}

function agendaCambiarDia(delta) {
  agendaFechaActual = new Date(agendaFechaActual);
  agendaFechaActual.setDate(agendaFechaActual.getDate() + delta);
  cargarCitasDelDia();
}

function agendaIrHoy() {
  agendaFechaActual = new Date();
  cargarCitasDelDia();
}

function renderAgendaLista(lista) {
  const el = document.getElementById('agendaLista');

  if (!lista.length) {
    el.innerHTML = '<div class="list-empty"><p>No hay citas este día</p></div>';
    return;
  }

  el.innerHTML = lista.map(c => {
    const nombre = c.clientes?.nombre || 'Paciente sin nombre';
    const telefono = c.clientes?.telefono || '';
    const hora = c.hora ? c.hora.slice(0, 5) : '--:--';
    const durMin = c.duracion || 60;
    const durLabel = durMin >= 60
      ? (durMin % 60 === 0 ? `${durMin / 60}h` : `${Math.floor(durMin / 60)}h ${durMin % 60}min`)
      : `${durMin}min`;

    const estadoInfo = {
      pendiente:  { cls: 'warning', label: 'Pendiente' },
      confirmada: { cls: 'blue',    label: 'Confirmada' },
      completada: { cls: 'success', label: 'Completada' },
      cancelada:  { cls: 'danger',  label: 'Cancelada' },
    };
    const est = estadoInfo[c.estado] || estadoInfo.pendiente;

    return `
      <div class="cita-item ${c.estado === 'cancelada' ? 'cita-cancelada' : ''}">
        <div class="cita-hora">${hora}</div>
        <div class="cita-info">
          <div class="cita-nombre">${nombre}</div>
          ${c.servicio ? `<div class="cita-servicio">${c.servicio}</div>` : ''}
          <div class="cita-meta">
            <span class="cita-duracion"><i data-lucide="clock" style="width:12px;height:12px"></i> ${durLabel}</span>
            ${telefono ? `<span class="cita-tel"><i data-lucide="phone" style="width:12px;height:12px"></i> ${telefono}</span>` : ''}
          </div>
        </div>
        <div class="cita-actions">
          <span class="badge-estado ${est.cls}">${est.label}</span>
          <button class="action-btn edit" onclick="editarCita('${c.id}')">✏️</button>
          <button class="action-btn delete" onclick="eliminarCita('${c.id}')">🗑️</button>
        </div>
      </div>
    `;
  }).join('');

  if (typeof lucide !== 'undefined') lucide.createIcons();
}

function toggleNuevoClienteInline() {
  const el = document.getElementById('nuevoClienteInline');
  const visible = el.style.display !== 'none';
  el.style.display = visible ? 'none' : 'flex';
  if (!visible) document.getElementById('inlineClienteNombre').focus();
}

async function guardarClienteInline() {
  const nombre = document.getElementById('inlineClienteNombre').value.trim();
  if (!nombre) { showToast('Escribe el nombre del cliente', 'error'); return; }

  const { data, error } = await db.from('clientes').insert({
    nombre,
    telefono: document.getElementById('inlineClienteTelefono').value.trim() || null,
    negocio_id: currentBusiness?.id
  }).select().single();

  if (error) { showToast('Error al agregar cliente', 'error'); return; }

  // Agregar al select y seleccionarlo
  const select = document.getElementById('citaClienteId');
  const opt = document.createElement('option');
  opt.value = data.id;
  opt.textContent = data.nombre;
  select.appendChild(opt);
  select.value = data.id;

  // Cerrar mini form y limpiar
  document.getElementById('nuevoClienteInline').style.display = 'none';
  document.getElementById('inlineClienteNombre').value = '';
  document.getElementById('inlineClienteTelefono').value = '';
  showToast('Cliente agregado', 'success');
}

function abrirModalCita(fechaStr) {
  editandoCitaId = null;
  document.getElementById('modalCitaTitle').textContent = 'Nueva Cita';
  const f = document.getElementById('citaFecha');
  f.value = fechaStr || agendaFechaActual.toISOString().split('T')[0];
  const now = new Date();
  const hh = now.getHours().toString().padStart(2, '0');
  const mm = now.getMinutes().toString().padStart(2, '0');
  document.getElementById('citaHora').value = hh + ':' + mm;
  document.getElementById('citaDuracion').value = '60';
  document.getElementById('citaServicio').value = '';
  document.getElementById('citaEstado').value = 'pendiente';
  document.getElementById('citaNotas').value = '';
  document.getElementById('citaClienteId').value = '';
  document.getElementById('nuevoClienteInline').style.display = 'none';
  document.getElementById('inlineClienteNombre').value = '';
  document.getElementById('inlineClienteTelefono').value = '';
  actualizarSelectClientes();
  showModal('modalCita');
}

async function guardarCita(e) {
  e.preventDefault();

  const clienteId = document.getElementById('citaClienteId').value;
  if (!clienteId) { showToast('Selecciona un cliente', 'error'); return; }

  const cita = {
    negocio_id: currentBusiness?.id,
    cliente_id: clienteId,
    fecha: document.getElementById('citaFecha').value,
    hora: document.getElementById('citaHora').value,
    duracion: parseInt(document.getElementById('citaDuracion').value),
    servicio: document.getElementById('citaServicio').value.trim() || null,
    estado: document.getElementById('citaEstado').value,
    notas: document.getElementById('citaNotas').value.trim() || null,
  };

  let error;
  if (editandoCitaId) {
    ({ error } = await db.from('citas').update(cita).eq('id', editandoCitaId));
  } else {
    ({ error } = await db.from('citas').insert(cita));
  }

  if (error) { showToast('Error al guardar cita', 'error'); return; }

  showToast(editandoCitaId ? 'Cita actualizada' : 'Cita agendada', 'success');
  editandoCitaId = null;
  closeModal('modalCita');
  cargarCitasDelDia();
}

async function editarCita(id) {
  const c = citas.find(x => x.id === id);
  if (!c) return;

  editandoCitaId = id;
  document.getElementById('modalCitaTitle').textContent = 'Editar Cita';
  await actualizarSelectClientes();
  document.getElementById('citaClienteId').value = c.cliente_id || '';
  document.getElementById('citaFecha').value = c.fecha;
  document.getElementById('citaHora').value = c.hora?.slice(0, 5) || '';
  document.getElementById('citaDuracion').value = c.duracion || 60;
  document.getElementById('citaServicio').value = c.servicio || '';
  document.getElementById('citaEstado').value = c.estado || 'pendiente';
  document.getElementById('citaNotas').value = c.notas || '';
  showModal('modalCita');
}

async function eliminarCita(id) {
  if (!await showConfirm('¿Eliminar esta cita?')) return;
  const { error } = await db.from('citas').delete().eq('id', id);
  if (error) { showToast('Error al eliminar', 'error'); return; }
  showToast('Cita eliminada', 'success');
  cargarCitasDelDia();
}
