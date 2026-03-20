// ===== CAJA =====

async function loadCaja() {
  const negocioId = currentBusiness?.id || currentUser.id;
  const hoy = new Date().toISOString().split('T')[0];

  // Calcular saldo total
  const { data: ingresos } = await db
    .from('caja_movimientos')
    .select('monto')
    .eq('negocio_id', negocioId)
    .eq('tipo', 'ingreso');

  const { data: egresos } = await db
    .from('caja_movimientos')
    .select('monto')
    .eq('negocio_id', negocioId)
    .eq('tipo', 'egreso');

  const totalIngresos = (ingresos || []).reduce((s, r) => s + r.monto, 0);
  const totalEgresos = (egresos || []).reduce((s, r) => s + r.monto, 0);
  const saldo = totalIngresos - totalEgresos;

  document.getElementById('cajaSaldo').textContent = formatMoney(saldo);

  // Movimientos de hoy
  const { data: movimientos } = await db
    .from('caja_movimientos')
    .select('*')
    .eq('negocio_id', negocioId)
    .gte('created_at', hoy + 'T00:00:00')
    .order('created_at', { ascending: false });

  renderMovimientos(movimientos || []);
}

function renderMovimientos(lista) {
  const el = document.getElementById('movimientosCaja');
  if (!lista.length) {
    el.innerHTML = '<p class="empty-text">Sin movimientos hoy</p>';
    return;
  }

  el.innerHTML = `
    <div class="movimientos-list">
      ${lista.map(m => `
        <div class="movimiento-item ${m.tipo}">
          <div class="movimiento-info">
            <span class="movimiento-desc">${m.descripcion}</span>
            <span class="movimiento-hora">${formatTime(m.created_at)}</span>
          </div>
          <span class="movimiento-monto ${m.tipo}">
            ${m.tipo === 'ingreso' ? '+' : '-'} ${formatMoney(m.monto)}
          </span>
        </div>
      `).join('')}
    </div>
  `;
}

async function guardarMovimientoCaja(e, tipoForzado) {
  e.preventDefault();

  const tipo = tipoForzado || 'ingreso';
  const montoId = tipo === 'egreso' ? 'egresoMonto' : 'cajaMonto';
  const descId = tipo === 'egreso' ? 'egresoDescripcion' : 'cajaDescripcion';

  const monto = parseFloat(document.getElementById(montoId).value);
  const descripcion = document.getElementById(descId).value;
  const { data: { user } } = await db.auth.getUser();

  const { error } = await db.from('caja_movimientos').insert({
    negocio_id: currentBusiness?.id || currentUser.id,
    tipo,
    monto,
    descripcion,
    user_id: user.id
  });

  if (error) { showToast('Error al guardar movimiento', 'error'); return; }

  showToast(`${tipo === 'ingreso' ? 'Ingreso' : 'Egreso'} registrado`, 'success');
  closeModal(tipo === 'egreso' ? 'modalEgreso' : 'modalIngreso');
  loadCaja();
  loadDashboard();
}
