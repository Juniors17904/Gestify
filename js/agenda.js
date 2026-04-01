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
  if (typeof ncTimePicker !== 'undefined') ncTimePicker.init(hh + ':' + mm);
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

// ── Custom Time Picker ──────────────────────────────────────
const ncTimePicker = (() => {
  let ampm = 'AM';

  function buildDrum(id, items, itemH) {
    const el = document.getElementById(id);
    if (!el) return;
    el.innerHTML = `<div style="height:${itemH}px"></div>`;
    items.forEach(v => {
      const d = document.createElement('div');
      d.style.cssText = `scroll-snap-align:center;height:${itemH}px;display:flex;align-items:center;justify-content:center;font-size:17px;font-weight:700;color:var(--gray-800)`;
      d.dataset.v = v;
      d.textContent = v;
      el.appendChild(d);
    });
    const end = document.createElement('div');
    end.style.height = itemH + 'px';
    el.appendChild(end);
  }

  function getVal(id) {
    const el = document.getElementById(id);
    if (!el) return null;
    const cy = el.getBoundingClientRect().top + el.offsetHeight / 2;
    const found = [...el.querySelectorAll('[data-v]')].find(d => {
      const r = d.getBoundingClientRect();
      return r.top <= cy && r.bottom > cy;
    });
    return found ? found.dataset.v : null;
  }

  function scrollTo(id, val) {
    const el = document.getElementById(id);
    if (!el) return;
    const item = el.querySelector(`[data-v="${val}"]`);
    if (item) el.scrollTop = item.offsetTop - el.offsetHeight / 2 + item.offsetHeight / 2;
  }

  function updateAmpmBtns() {
    const am = document.getElementById('nctAM');
    const pm = document.getElementById('nctPM');
    if (!am || !pm) return;
    const activeStyle = `padding:6px 10px;border-radius:8px;border:1.5px solid var(--primary);background:var(--primary);color:white;font-size:12px;font-weight:700;cursor:pointer`;
    const inactiveStyle = `padding:6px 10px;border-radius:8px;border:1.5px solid var(--gray-200);background:var(--white);color:var(--gray-600);font-size:12px;font-weight:700;cursor:pointer`;
    am.style.cssText = ampm === 'AM' ? activeStyle : inactiveStyle;
    pm.style.cssText = ampm === 'PM' ? activeStyle : inactiveStyle;
  }

  return {
    init(timeVal) {
      const hours = Array.from({length:12}, (_,i) => String(i+1));
      const mins  = Array.from({length:60}, (_,i) => String(i).padStart(2,'0'));
      buildDrum('nctH', hours, 36);
      buildDrum('nctM', mins, 36);

      let h24 = 9, m = '00';
      if (timeVal) {
        const [hh, mm] = timeVal.split(':');
        h24 = parseInt(hh); m = mm;
      }
      ampm = h24 >= 12 ? 'PM' : 'AM';
      const h12 = h24 === 0 ? 12 : h24 > 12 ? h24 - 12 : h24;
      updateAmpmBtns();
      setTimeout(() => { scrollTo('nctH', String(h12)); scrollTo('nctM', m); }, 50);
      this.updateDisplay(timeVal);
    },
    open() {
      const p = document.getElementById('ncTimePicker');
      if (!p) return;
      p.style.display = p.style.display === 'none' ? '' : 'none';
    },
    live() {
      const h12 = parseInt(getVal('nctH') || '9');
      const m   = getVal('nctM') || '00';
      let h24 = h12;
      if (ampm === 'AM' && h12 === 12) h24 = 0;
      else if (ampm === 'PM' && h12 !== 12) h24 = h12 + 12;
      document.getElementById('citaHora').value = String(h24).padStart(2,'0') + ':' + m;
    },
    step(col, dir) {
      const id = col === 'h' ? 'nctH' : 'nctM';
      const el = document.getElementById(id);
      if (el) el.scrollBy({ top: dir * 36, behavior: 'smooth' });
    },
    setAmpm(val) {
      ampm = val;
      updateAmpmBtns();
      this.live();
    },
    confirm() {
      const h12 = parseInt(getVal('nctH') || '9');
      const m   = getVal('nctM') || '00';
      let h24 = h12;
      if (ampm === 'AM' && h12 === 12) h24 = 0;
      else if (ampm === 'PM' && h12 !== 12) h24 = h12 + 12;
      const val = String(h24).padStart(2,'0') + ':' + m;
      document.getElementById('citaHora').value = val;
      this.updateDisplay(val);
      document.getElementById('ncTimePicker').style.display = 'none';
    },
    updateDisplay(val) {
      const el = document.getElementById('citaHoraTexto');
      if (!el || !val) return;
      const [hh, mm] = val.split(':');
      const h = parseInt(hh);
      const ap = h >= 12 ? 'PM' : 'AM';
      const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
      el.textContent = h12 + ':' + mm + ' ' + ap;
    }
  };
})();

// ── VISTAS: Día / Semana / Mes ──────────────────────────────

function agendaVista(v) {
  ['dia','semana','mes'].forEach(id => {
    const el = document.getElementById('agenda-vista-' + id);
    if (el) el.style.display = v === id ? 'block' : 'none';
    const btn = document.getElementById('agenda-btn-' + id);
    if (btn) {
      btn.style.background = v === id ? 'var(--white)' : 'transparent';
      btn.style.color      = v === id ? 'var(--primary)' : 'var(--gray-500)';
      btn.style.fontWeight = v === id ? '700' : '600';
      btn.style.boxShadow  = v === id ? '0 1px 3px rgba(0,0,0,0.1)' : 'none';
    }
  });
  if (v === 'semana') agendaCargarSemana();
  if (v === 'mes')    agendaCargarMes();
}

// ── SEMANA ──────────────────────────────────────────────────

const _mesesCortoAgenda = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];

let agendaSemanaRef = (() => {
  const hoy = new Date();
  const diff = hoy.getDay() === 0 ? -6 : 1 - hoy.getDay();
  const lunes = new Date(hoy);
  lunes.setDate(hoy.getDate() + diff);
  lunes.setHours(0,0,0,0);
  return lunes;
})();

function agendaSemanaActualizarLabel() {
  const fin = new Date(agendaSemanaRef); fin.setDate(agendaSemanaRef.getDate() + 6);
  const mismoMes = agendaSemanaRef.getMonth() === fin.getMonth();
  const label = mismoMes
    ? agendaSemanaRef.getDate() + ' — ' + fin.getDate() + ' ' + _mesesCortoAgenda[fin.getMonth()] + '.'
    : agendaSemanaRef.getDate() + ' ' + _mesesCortoAgenda[agendaSemanaRef.getMonth()] + '. — ' + fin.getDate() + ' ' + _mesesCortoAgenda[fin.getMonth()] + '.';
  const el = document.getElementById('agenda-semana-label');
  if (el) el.textContent = label;
  const hoy = new Date(); hoy.setHours(0,0,0,0);
  const diff = hoy.getDay() === 0 ? -6 : 1 - hoy.getDay();
  const lunesHoy = new Date(hoy); lunesHoy.setDate(hoy.getDate() + diff);
  const lunesRef = new Date(agendaSemanaRef); lunesRef.setHours(0,0,0,0);
  const btnHoy = document.getElementById('agenda-semana-hoy');
  if (btnHoy) btnHoy.style.display = lunesRef.getTime() === lunesHoy.getTime() ? 'none' : '';
}

function agendaSemanaCambiar(delta) {
  agendaSemanaRef = new Date(agendaSemanaRef);
  agendaSemanaRef.setDate(agendaSemanaRef.getDate() + delta * 7);
  agendaCargarSemana();
}

function agendaSemanaIrHoy() {
  const hoy = new Date();
  const diff = hoy.getDay() === 0 ? -6 : 1 - hoy.getDay();
  agendaSemanaRef = new Date(hoy);
  agendaSemanaRef.setDate(hoy.getDate() + diff);
  agendaSemanaRef.setHours(0,0,0,0);
  agendaCargarSemana();
}

async function agendaCargarSemana() {
  agendaSemanaActualizarLabel();
  const inicio = agendaSemanaRef.toISOString().split('T')[0];
  const fin    = new Date(agendaSemanaRef); fin.setDate(agendaSemanaRef.getDate() + 6);
  const finStr = fin.toISOString().split('T')[0];

  const { data, error } = await db
    .from('citas')
    .select('*, clientes(nombre)')
    .eq('negocio_id', currentBusiness?.id)
    .gte('fecha', inicio)
    .lte('fecha', finStr)
    .order('fecha').order('hora');

  const el = document.getElementById('agenda-lista-semana');
  if (!el) return;
  if (error) { el.innerHTML = '<div class="list-empty"><p>Error al cargar</p></div>'; return; }

  const estadoInfo = { pendiente:{dot:'#F59E0B'}, confirmada:{dot:'#3B82F6'}, completada:{dot:'#10B981'}, cancelada:{dot:'#EF4444'} };
  const diasNombresCorto = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'];
  const citasPorDia = {};
  (data || []).forEach(c => { (citasPorDia[c.fecha] = citasPorDia[c.fecha] || []).push(c); });

  let html = '';
  for (let i = 0; i < 7; i++) {
    const d = new Date(agendaSemanaRef); d.setDate(agendaSemanaRef.getDate() + i);
    const fechaStr = d.toISOString().split('T')[0];
    const hoy = new Date(); hoy.setHours(0,0,0,0);
    const esHoy = d.getTime() === hoy.getTime();
    const label = diasNombresCorto[d.getDay()] + ' ' + d.getDate();
    const citasDia = citasPorDia[fechaStr] || [];
    const bordeHoy = esHoy ? ';border:2px solid var(--primary)' : '';

    if (!citasDia.length) {
      html += `<div style="background:var(--white);border-radius:12px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,0.06)${bordeHoy}">
        <div style="display:flex;align-items:center;justify-content:space-between;padding:10px 16px">
          <div style="display:flex;align-items:center;gap:8px">
            <span style="font-size:13px;font-weight:700;color:${esHoy?'var(--primary)':'var(--gray-600)'}">${label}</span>
            ${esHoy?'<span style="font-size:10px;padding:1px 7px;border-radius:20px;background:var(--primary);color:white;font-weight:700">Hoy</span>':''}
          </div>
          <span style="font-size:12px;color:var(--gray-300)">Sin citas</span>
        </div>
      </div>`;
    } else {
      const citasHTML = citasDia.map((c, idx) => {
        const hora   = c.hora ? c.hora.slice(0,5) : '--:--';
        const nombre = c.clientes?.nombre || 'Sin cliente';
        const est    = estadoInfo[c.estado] || estadoInfo.pendiente;
        const borde  = idx < citasDia.length - 1 ? 'border-bottom:1px solid var(--gray-100)' : '';
        return `<div style="display:flex;align-items:center;gap:10px;padding:8px 4px;${borde}">
          <span style="font-size:12px;font-weight:800;color:${est.dot};width:36px">${hora}</span>
          <span style="font-size:13px;font-weight:600;color:var(--gray-800);flex:1">${nombre}</span>
          <span style="width:7px;height:7px;border-radius:50%;background:${est.dot}"></span>
        </div>`;
      }).join('');
      html += `<div style="background:var(--white);border-radius:12px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,0.06)${bordeHoy}">
        <div onclick="this.nextElementSibling.style.display=this.nextElementSibling.style.display==='none'?'block':'none';this.querySelector('.ags-chv').style.transform=this.nextElementSibling.style.display==='block'?'rotate(180deg)':''" style="display:flex;align-items:center;justify-content:space-between;padding:10px 16px;cursor:pointer;border-bottom:1px solid var(--gray-100)">
          <div style="display:flex;align-items:center;gap:8px">
            <span style="font-size:13px;font-weight:700;color:${esHoy?'var(--primary)':'var(--gray-700)'}">${label}</span>
            ${esHoy?'<span style="font-size:10px;padding:1px 7px;border-radius:20px;background:var(--primary);color:white;font-weight:700">Hoy</span>':''}
          </div>
          <div style="display:flex;align-items:center;gap:8px">
            <span style="font-size:11px;padding:2px 8px;border-radius:20px;background:var(--primary-light);color:var(--primary);font-weight:700">${citasDia.length} cita${citasDia.length>1?'s':''}</span>
            <svg class="ags-chv" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--gray-400)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="transition:transform .2s${esHoy?';transform:rotate(180deg)':''}"><polyline points="6 9 12 15 18 9"/></svg>
          </div>
        </div>
        <div style="display:${esHoy?'block':'none'};padding:8px 12px">${citasHTML}</div>
      </div>`;
    }
  }
  el.innerHTML = html;
}

// ── MES ──────────────────────────────────────────────────────

let agendaMesActual      = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
let agendaMesDotsData    = {};
let agendaDiaSeleccionado = null;

function agendaMesActualizarLabel() {
  const meses = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
  const el = document.getElementById('agenda-mes-label');
  if (el) el.textContent = meses[agendaMesActual.getMonth()] + ' ' + agendaMesActual.getFullYear();
  const hoy = new Date();
  const esEsteMes = agendaMesActual.getFullYear() === hoy.getFullYear() && agendaMesActual.getMonth() === hoy.getMonth();
  const btnHoy = document.getElementById('agenda-mes-hoy');
  if (btnHoy) btnHoy.style.display = esEsteMes ? 'none' : '';
}

function agendaMesCambiar(delta) {
  agendaMesActual = new Date(agendaMesActual.getFullYear(), agendaMesActual.getMonth() + delta, 1);
  agendaCargarMes();
}

function agendaMesIrHoy() {
  const hoy = new Date();
  agendaMesActual = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
  agendaCargarMes();
}

async function agendaCargarMes() {
  agendaMesActualizarLabel();
  const año    = agendaMesActual.getFullYear();
  const mes    = agendaMesActual.getMonth();
  const inicio = new Date(año, mes, 1).toISOString().split('T')[0];
  const fin    = new Date(año, mes + 1, 0).toISOString().split('T')[0];

  const { data } = await db
    .from('citas')
    .select('fecha, estado')
    .eq('negocio_id', currentBusiness?.id)
    .gte('fecha', inicio)
    .lte('fecha', fin);

  const estadoInfo = { pendiente:{dot:'#F59E0B'}, confirmada:{dot:'#3B82F6'}, completada:{dot:'#10B981'}, cancelada:{dot:'#EF4444'} };
  agendaMesDotsData = {};
  (data || []).forEach(c => {
    if (!agendaMesDotsData[c.fecha]) agendaMesDotsData[c.fecha] = [];
    agendaMesDotsData[c.fecha].push((estadoInfo[c.estado] || estadoInfo.pendiente).dot);
  });
  agendaRenderMes();
}

function agendaRenderMes() {
  const año       = agendaMesActual.getFullYear();
  const mes       = agendaMesActual.getMonth();
  const hoy       = new Date(); hoy.setHours(0,0,0,0);
  const primerDia = new Date(año, mes, 1).getDay();
  const diasEnMes = new Date(año, mes + 1, 0).getDate();
  const offset    = primerDia === 0 ? 6 : primerDia - 1;

  const el = document.getElementById('agenda-mes-grid');
  if (!el) return;

  let html = '';
  for (let i = 0; i < offset; i++) html += '<div></div>';
  for (let d = 1; d <= diasEnMes; d++) {
    const fecha    = new Date(año, mes, d);
    const fechaStr = fecha.toISOString().split('T')[0];
    const esHoy       = fecha.getTime() === hoy.getTime();
    const seleccionado = fechaStr === agendaDiaSeleccionado;
    const dots         = (agendaMesDotsData[fechaStr] || []).slice(0,3);
    const dotsHTML     = dots.map(c => `<span style="width:5px;height:5px;border-radius:50%;background:${c};display:inline-block"></span>`).join('');
    html += `<div onclick="agendaMesSeleccionar('${fechaStr}')" style="display:flex;flex-direction:column;align-items:center;padding:4px 0;border-radius:8px;cursor:pointer;background:${seleccionado?'var(--primary)':esHoy?'var(--primary-light)':'transparent'}">
      <span style="font-size:13px;font-weight:${esHoy||seleccionado?'800':'500'};color:${seleccionado?'white':esHoy?'var(--primary)':'var(--gray-700)'}">${d}</span>
      <div style="display:flex;gap:2px;min-height:7px;margin-top:2px">${dotsHTML}</div>
    </div>`;
  }
  el.innerHTML = html;
  if (agendaDiaSeleccionado) agendaMesRenderDetalle(agendaDiaSeleccionado, null);
}

async function agendaMesSeleccionar(fechaStr) {
  agendaDiaSeleccionado = fechaStr;
  agendaRenderMes();
  const { data } = await db
    .from('citas')
    .select('*, clientes(nombre)')
    .eq('negocio_id', currentBusiness?.id)
    .eq('fecha', fechaStr)
    .order('hora');
  agendaMesRenderDetalle(fechaStr, data || []);
}

function agendaMesRenderDetalle(fechaStr, lista) {
  const el = document.getElementById('agenda-mes-detalle');
  if (!el) return;
  if (!lista) { el.innerHTML = ''; return; }
  if (!lista.length) {
    el.innerHTML = `<div style="text-align:center;padding:16px;color:var(--gray-400);font-size:13px">Sin citas para este día</div>`;
    return;
  }
  const estadoInfo = {
    pendiente:  { dot:'#F59E0B', bg:'#FEF3C7', color:'#92400E', label:'Pendiente' },
    confirmada: { dot:'#3B82F6', bg:'#DBEAFE', color:'#1E40AF', label:'Confirmada' },
    completada: { dot:'#10B981', bg:'#D1FAE5', color:'#065F46', label:'Completada' },
    cancelada:  { dot:'#EF4444', bg:'#FEE2E2', color:'#991B1B', label:'Cancelada' },
  };
  el.innerHTML = `<div style="background:var(--white);border-radius:14px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.07)">` +
    lista.map((c, i) => {
      const nombre = c.clientes?.nombre || 'Sin cliente';
      const hora   = c.hora ? c.hora.slice(0,5) : '--:--';
      const est    = estadoInfo[c.estado] || estadoInfo.pendiente;
      const isLast = i === lista.length - 1;
      return `<div style="display:flex;align-items:center;gap:10px;padding:11px 16px;${isLast?'':'border-bottom:1px solid var(--gray-100)'}">
        <span style="font-size:13px;font-weight:800;color:${est.dot};width:40px;flex-shrink:0">${hora}</span>
        <span style="font-size:14px;font-weight:600;color:var(--gray-800);flex:1">${nombre}</span>
        <span style="font-size:10px;padding:2px 8px;border-radius:20px;background:${est.bg};color:${est.color};font-weight:700">${est.label}</span>
      </div>`;
    }).join('') + '</div>';
}
