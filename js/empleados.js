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
        ${emp.pin ? `<br><span style="font-size:11px;color:var(--gray-400)">PIN: ${emp.pin}</span>` : ''}
      </div>
      ${emp.rol !== 'admin' ? `
        <button class="action-btn delete" onclick="eliminarEmpleado('${emp.id}')">🗑️</button>
      ` : ''}
    </div>
  `).join('');
}

async function crearEmpleado(e) {
  e.preventDefault();

  const nombre = document.getElementById('empleadoNombre').value;
  const pin    = document.getElementById('empleadoPin').value;
  const rol    = document.getElementById('empleadoRol').value;
  const negocioId = currentBusiness?.id || currentUser.id;

  // Verificar que el PIN no esté en uso en este negocio
  const { data: existe } = await db
    .from('empleados')
    .select('id')
    .eq('negocio_id', negocioId)
    .eq('pin', pin)
    .single();

  if (existe) {
    showToast('Ese PIN ya está en uso, elige otro', 'error');
    return;
  }

  const { error } = await db.from('empleados').insert({
    negocio_id: negocioId,
    nombre,
    pin,
    rol,
    user_id: null
  });

  if (error) { showToast('Error al crear empleado', 'error'); return; }

  showToast(`Empleado "${nombre}" creado con PIN ${pin}`, 'success');
  closeModal('modalEmpleado');
  loadEmpleados();
}

async function eliminarEmpleado(id) {
  if (!confirm('¿Eliminar este empleado?')) return;

  const { error } = await db.from('empleados').delete().eq('id', id);
  if (error) { showToast('Error al eliminar', 'error'); return; }

  showToast('Empleado eliminado', 'success');
  loadEmpleados();
}
