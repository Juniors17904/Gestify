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
    const nombre = c.clientes?.nombre || 'Sin cliente asignado';
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
            <span class="cita-duracion"><svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg> ${durLabel}</span>
            ${telefono ? `<span class="cita-tel"><svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13.1a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg> ${telefono}</span>` : ''}
          </div>
        </div>
        <div class="cita-actions">
          <span class="badge-estado ${est.cls}">${est.label}</span>
          <button class="action-btn edit" onclick="editarCita('${c.id}')"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></button>
          <button class="action-btn delete" onclick="eliminarCita('${c.id}')"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg></button>
        </div>
      </div>
    `;
  }).join('');

  if (typeof lucide !== 'undefined') lucide.createIcons();
}

function citaMostrarOpcion(opcion) {
  const btnNuevo      = document.getElementById('btnOpcionNuevo');
  const btnExistente  = document.getElementById('btnOpcionExistente');
  const formNuevo     = document.getElementById('nuevoClienteInline');
  const formExistente = document.getElementById('selectClienteExistente');

  // Resetear estilos
  btnNuevo.style.borderColor     = 'var(--gray-200)';
  btnExistente.style.borderColor = 'var(--gray-200)';
  btnNuevo.style.background      = 'var(--white)';
  btnExistente.style.background  = 'var(--white)';
  formNuevo.style.display        = 'none';
  formExistente.style.display    = 'none';

  if (opcion === 'nuevo') {
    btnNuevo.style.borderColor = 'var(--primary)';
    btnNuevo.style.background  = 'var(--primary-light)';
    formNuevo.style.display    = 'flex';
    document.getElementById('inlineClienteNombre').focus();
  } else {
    btnExistente.style.borderColor = 'var(--primary)';
    btnExistente.style.background  = 'var(--primary-light)';
    formExistente.style.display    = 'block';
  }
}

function citaIrPaso2() {
  const clienteId = document.getElementById('citaClienteId').value;
  const nombre = document.getElementById('inlineClienteNombre').value.trim();
  if (!clienteId && !nombre) {
    showToast('Selecciona o crea un cliente', 'error');
    return;
  }
  // Mostrar nombre del cliente seleccionado en paso 2
  const buscar = document.getElementById('citaBuscarCliente');
  const nombreCliente = clienteId
    ? (buscar?.value || 'Cliente seleccionado')
    : nombre;
  document.getElementById('citaClienteSeleccionado').textContent = '👤 ' + nombreCliente;

  document.getElementById('citaPaso1').style.display = 'none';
  document.getElementById('citaPaso2').style.display = 'block';
  // Actualizar indicador
  document.getElementById('citaStep2Dot').style.background = 'var(--primary)';
  document.getElementById('citaStep2Dot').style.color = 'white';
  document.getElementById('citaStepLine').style.background = 'var(--primary)';
}

function citaIrPaso1() {
  document.getElementById('citaPaso1').style.display = 'block';
  document.getElementById('citaPaso2').style.display = 'none';
  // Resetear indicador
  document.getElementById('citaStep2Dot').style.background = 'var(--gray-200)';
  document.getElementById('citaStep2Dot').style.color = 'var(--gray-400)';
  document.getElementById('citaStepLine').style.background = 'var(--gray-200)';
  // Resetear opciones
  document.getElementById('nuevoClienteInline').style.display = 'none';
  document.getElementById('selectClienteExistente').style.display = 'none';
  document.getElementById('btnOpcionNuevo').style.borderColor = 'var(--gray-200)';
  document.getElementById('btnOpcionExistente').style.borderColor = 'var(--gray-200)';
  document.getElementById('btnOpcionNuevo').style.background = 'var(--white)';
  document.getElementById('btnOpcionExistente').style.background = 'var(--white)';
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
  document.getElementById('inlineClienteNombre').value = '';
  document.getElementById('inlineClienteTelefono').value = '';
  // Resetear wizard al paso 1
  citaIrPaso1();
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
  // Al editar ir directo al paso 2
  const nombre = c.clientes?.nombre || 'Sin cliente asignado';
  document.getElementById('citaClienteSeleccionado').textContent = '👤 ' + nombre;
  document.getElementById('citaPaso1').style.display = 'none';
  document.getElementById('citaPaso2').style.display = 'block';
  document.getElementById('citaStep2Dot').style.background = 'var(--primary)';
  document.getElementById('citaStep2Dot').style.color = 'white';
  document.getElementById('citaStepLine').style.background = 'var(--primary)';
  showModal('modalCita');
}

async function eliminarCita(id) {
  if (!await showConfirm('¿Eliminar esta cita?')) return;
  const { error } = await db.from('citas').delete().eq('id', id);
  if (error) { showToast('Error al eliminar', 'error'); return; }
  showToast('Cita eliminada', 'success');
  cargarCitasDelDia();
}
