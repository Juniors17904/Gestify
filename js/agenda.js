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
  const hoy    = new Date();
  const ayer   = new Date(hoy); ayer.setDate(hoy.getDate() - 1);
  const manana = new Date(hoy); manana.setDate(hoy.getDate() + 1);
  const diasNombre  = ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'];
  const mesesNombre = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];

  let relativo = '';
  if      (agendaFechaActual.toDateString() === hoy.toDateString())    relativo = 'Hoy';
  else if (agendaFechaActual.toDateString() === ayer.toDateString())   relativo = 'Ayer';
  else if (agendaFechaActual.toDateString() === manana.toDateString()) relativo = 'Mañana';

  const elRel    = document.getElementById('agendaDiaRelativo');
  const elNombre = document.getElementById('agendaDiaNombre');
  const elFecha  = document.getElementById('agendaFechaLabel');

  if (elRel)    { elRel.textContent = relativo; elRel.style.visibility = relativo ? 'visible' : 'hidden'; }
  if (elNombre) elNombre.textContent = diasNombre[agendaFechaActual.getDay()];
  if (elFecha)  elFecha.textContent  = agendaFechaActual.getDate() + ' de ' + mesesNombre[agendaFechaActual.getMonth()];
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

  const estadoInfo = {
    pendiente:  { dot: '#F59E0B', bg: '#FEF3C7', color: '#92400E', label: 'Pendiente' },
    confirmada: { dot: '#3B82F6', bg: '#DBEAFE', color: '#1E40AF', label: 'Confirmada' },
    completada: { dot: '#10B981', bg: '#D1FAE5', color: '#065F46', label: 'Completada' },
    cancelada:  { dot: '#EF4444', bg: '#FEE2E2', color: '#991B1B', label: 'Cancelada' },
  };

  el.innerHTML = `<div style="background:var(--white);border-radius:14px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.07)">` +
  lista.map((c, i) => {
    const nombre   = c.clientes?.nombre || 'Sin cliente asignado';
    const telefono = c.clientes?.telefono || '';
    const hora     = c.hora ? c.hora.slice(0, 5) : '--:--';
    const durMin   = c.duracion || 60;
    const durLabel = durMin >= 60
      ? (durMin % 60 === 0 ? `${durMin / 60}h` : `${Math.floor(durMin / 60)}h ${durMin % 60}min`)
      : `${durMin}min`;
    const est      = estadoInfo[c.estado] || estadoInfo.pendiente;
    const isLast   = i === lista.length - 1;

    return `
      <div>
        <div onclick="toggleAgendaAcordeon(this)" style="display:flex;align-items:center;gap:10px;padding:11px 16px;cursor:pointer;border-bottom:${isLast ? 'none' : '1px solid var(--gray-100)'}${c.estado === 'cancelada' ? ';opacity:0.5' : ''}">
          <span style="font-size:13px;font-weight:800;color:${est.dot};width:40px;flex-shrink:0">${hora}</span>
          <span style="font-size:14px;font-weight:600;color:var(--gray-800);flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${nombre}</span>
          <span style="width:8px;height:8px;border-radius:50%;background:${est.dot};flex-shrink:0"></span>
          <svg class="acord-chevron" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--gray-400)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0;transition:transform .2s"><polyline points="6 9 12 15 18 9"/></svg>
        </div>
        <div class="acord-detail" style="display:none;padding:10px 16px 12px;background:var(--gray-50);border-bottom:${isLast ? 'none' : '1px solid var(--gray-100)'}">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px;flex-wrap:wrap">
            <span style="display:inline-flex;align-items:center;gap:3px;font-size:12px;color:var(--gray-400)"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg> ${durLabel}</span>
            ${c.servicio ? `<span style="font-size:12px;color:var(--gray-400)">· ${c.servicio}</span>` : ''}
            ${telefono ? `<span style="display:inline-flex;align-items:center;gap:3px;font-size:12px;color:var(--gray-400)">· <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13.1a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg> ${telefono}</span>` : ''}
            <span style="font-size:10px;padding:2px 8px;border-radius:20px;background:${est.bg};color:${est.color};font-weight:700">${est.label}</span>
          </div>
          <div style="display:flex;gap:8px">
            <button onclick="editarCita('${c.id}')" style="flex:1;display:flex;align-items:center;justify-content:center;gap:6px;padding:7px;border-radius:10px;border:1px solid var(--gray-200);background:var(--white);font-size:12px;font-weight:600;color:var(--gray-600);cursor:pointer"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg> Editar</button>
            <button onclick="eliminarCita('${c.id}')" style="flex:1;display:flex;align-items:center;justify-content:center;gap:6px;padding:7px;border-radius:10px;border:none;background:#FEE2E2;font-size:12px;font-weight:600;color:#DC2626;cursor:pointer"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg> Eliminar</button>
          </div>
        </div>
      </div>
    `;
  }).join('') + `</div>`;
}

function toggleAgendaAcordeon(header) {
  const detail  = header.nextElementSibling;
  const chevron = header.querySelector('.acord-chevron');
  const abierto = detail.style.display !== 'none';
  detail.style.display   = abierto ? 'none' : 'block';
  chevron.style.transform = abierto ? '' : 'rotate(180deg)';
}

function ncAcord(seccion) {
  ['cliente', 'detalles'].forEach(s => {
    const body    = document.getElementById('nc-body-' + s);
    const chevron = document.getElementById('nc-chevron-' + s);
    const numEl   = document.getElementById('nc-num-' + s);
    const abierto = s === seccion;
    body.style.display      = abierto ? 'block' : 'none';
    chevron.style.transform = abierto ? 'rotate(180deg)' : '';
    if (numEl) numEl.style.background = abierto ? 'var(--primary)' : 'var(--gray-300)';
  });
}

function citaMostrarOpcion(opcion) {
  const btnNuevo       = document.getElementById('btnOpcionNuevo');
  const btnExistente   = document.getElementById('btnOpcionExistente');
  const formNuevo      = document.getElementById('nuevoClienteInline');
  const formExistente  = document.getElementById('selectClienteExistente');
  const badgeNuevo     = document.getElementById('badgeNuevo');
  const badgeExistente = document.getElementById('badgeExistente');

  // Resetear ambos
  btnNuevo.style.borderColor = 'var(--gray-200)';
  btnNuevo.style.background  = 'var(--white)';
  btnNuevo.querySelector('svg').style.stroke = 'var(--gray-400)';
  badgeNuevo.style.background = 'var(--gray-100)';
  badgeNuevo.style.color = 'var(--gray-500)';

  btnExistente.style.borderColor = 'var(--gray-200)';
  btnExistente.style.background  = 'var(--white)';
  btnExistente.querySelector('svg').style.stroke = 'var(--gray-400)';
  badgeExistente.style.background = 'var(--gray-100)';
  badgeExistente.style.color = 'var(--gray-500)';

  formNuevo.style.display     = 'none';
  formExistente.style.display = 'none';

  if (opcion === 'nuevo') {
    btnNuevo.style.borderColor = 'var(--primary)';
    btnNuevo.style.background  = 'var(--primary-light)';
    btnNuevo.querySelector('svg').style.stroke = 'var(--primary)';
    badgeNuevo.style.background = 'var(--primary)';
    badgeNuevo.style.color = 'white';
    formNuevo.style.display = 'flex';
    document.getElementById('inlineClienteNombre').focus();
  } else {
    btnExistente.style.borderColor = 'var(--primary)';
    btnExistente.style.background  = 'var(--primary-light)';
    btnExistente.querySelector('svg').style.stroke = 'var(--primary)';
    badgeExistente.style.background = 'var(--primary)';
    badgeExistente.style.color = 'white';
    formExistente.style.display = 'block';
  }
}

function citaIrPaso2() { /* ya no se usa — formulario en una sola pantalla */ }

function citaIrPaso1() {
  citaMostrarOpcion('existente');
  document.getElementById('citaClienteId').value = '';
  document.getElementById('citaBuscarCliente').value = '';
  document.getElementById('inlineClienteNombre').value = '';
  document.getElementById('inlineClienteTelefono').value = '';
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

  // Seleccionar el cliente recién creado
  document.getElementById('citaClienteId').value = data.id;
  document.getElementById('inlineClienteNombre').value = '';
  document.getElementById('inlineClienteTelefono').value = '';

  // Volver a "Seleccionar" mostrando el nombre en el buscador
  document.getElementById('citaBuscarCliente').value = data.nombre;
  citaMostrarOpcion('existente');
  showToast('Cliente agregado y seleccionado', 'success');
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
  citaMostrarOpcion('existente');
  ncAcord('cliente');
  actualizarSelectClientes();
  showModal('modalCita');
}

async function guardarCita(e) {
  e.preventDefault();

  // Si hay nombre escrito en el form nuevo cliente, guardarlo primero
  const formNuevo = document.getElementById('nuevoClienteInline');
  const nombrePendiente = document.getElementById('inlineClienteNombre').value.trim();
  if (formNuevo.style.display !== 'none' && nombrePendiente && !document.getElementById('citaClienteId').value) {
    await guardarClienteInline();
  }

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
  document.getElementById('citaBuscarCliente').value = c.clientes?.nombre || '';
  document.getElementById('citaFecha').value = c.fecha;
  document.getElementById('citaHora').value = c.hora?.slice(0, 5) || '';
  document.getElementById('citaDuracion').value = c.duracion || 60;
  document.getElementById('citaServicio').value = c.servicio || '';
  document.getElementById('citaEstado').value = c.estado || 'pendiente';
  document.getElementById('citaNotas').value = c.notas || '';
  citaMostrarOpcion('existente');
  showModal('modalCita');
}

async function eliminarCita(id) {
  if (!await showConfirm('¿Eliminar esta cita?')) return;
  const { error } = await db.from('citas').delete().eq('id', id);
  if (error) { showToast('Error al eliminar', 'error'); return; }
  showToast('Cita eliminada', 'success');
  cargarCitasDelDia();
}
