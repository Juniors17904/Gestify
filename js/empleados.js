// ===== EMPLEADOS =====

async function loadEmpleados() {
  const { data, error } = await db
    .from('empleados')
    .select('*')
    .eq('negocio_id', currentBusiness?.id || currentUser.id)
    .order('nombre');

  if (error) { showToast('Error al cargar empleados', 'error'); return; }

  renderEmpleados(data || []);
}

function renderEmpleados(lista) {
  const el = document.getElementById('listaEmpleados');
  if (!lista.length) {
    el.innerHTML = '<p class="empty-text">Sin empleados aún</p>';
    return;
  }

  el.innerHTML = lista.map(emp => `
    <div class="empleado-card">
      <div class="empleado-avatar">${emp.nombre[0].toUpperCase()}</div>
      <div class="empleado-info">
        <p>${emp.nombre}</p>
        <span class="role-badge">${formatRol(emp.rol)}</span>
        ${emp.email ? `<br><span style="font-size:11px;color:var(--gray-400)">${emp.email}</span>` : ''}
      </div>
      ${emp.rol !== 'admin' ? `
        <button class="action-btn delete" onclick="eliminarEmpleado('${emp.id}')"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg></button>
      ` : ''}
    </div>
  `).join('');
}

async function crearEmpleado(e) {
  e.preventDefault();

  const nombre = document.getElementById('empleadoNombre').value;
  const email  = document.getElementById('empleadoEmail').value;
  const rol    = document.getElementById('empleadoRol').value;
  const negocioId = currentBusiness?.id;
  const btn = e.target.querySelector('[type="submit"]');

  if (!negocioId) {
    showToast('No tienes un negocio configurado', 'error');
    return;
  }

  btn.disabled = true;
  btn.textContent = 'Enviando...';

  const res = await fetch(`${SUPABASE_URL}/functions/v1/invitar-empleado`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'apikey': SUPABASE_ANON_KEY },
    body: JSON.stringify({ email, nombre, rol, negocio_id: negocioId })
  });

  const result = await res.json();

  if (!res.ok || result.error) {
    showToast(result.error || 'Error al invitar empleado', 'error');
    btn.disabled = false;
    btn.textContent = 'Enviar invitación';
    return;
  }

  showToast(`Invitación enviada a ${email}`, 'success');
  closeModal('modalEmpleado');
  loadEmpleados();
  btn.disabled = false;
  btn.textContent = 'Enviar invitación';
}

async function eliminarEmpleado(id) {
  if (!await showConfirm('¿Eliminar este empleado?')) return;

  const { error } = await db.from('empleados').delete().eq('id', id);
  if (error) { showToast('Error al eliminar', 'error'); return; }

  showToast('Empleado eliminado', 'success');
  loadEmpleados();
}
