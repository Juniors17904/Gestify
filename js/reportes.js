// ===== REPORTES =====

async function cargarReporte() {
  const periodo = document.getElementById('reportePeriodo')?.value || 'mes';
  const negocioId = currentBusiness?.id || currentUser.id;

  const { inicio, fin } = getRangoFechas(periodo);

  // Total ventas del periodo
  const { data: ventas } = await db
    .from('ventas')
    .select('total, cantidad, producto_id, productos(nombre)')
    .eq('negocio_id', negocioId)
    .gte('created_at', inicio)
    .lte('created_at', fin);

  const totalVentas = (ventas || []).reduce((s, v) => s + v.total, 0);
  const totalTransacciones = ventas?.length || 0;
  const totalProductosVendidos = (ventas || []).reduce((s, v) => s + v.cantidad, 0);

  document.getElementById('reporteTotalVentas').textContent = formatMoney(totalVentas);
  document.getElementById('reporteTransacciones').textContent = totalTransacciones;
  document.getElementById('reporteProductosVendidos').textContent = totalProductosVendidos;

  // Top productos
  renderTopProductos(ventas || []);
}

function renderTopProductos(ventas) {
  const el = document.getElementById('topProductos');
  if (!ventas.length) {
    el.innerHTML = '<p class="empty-text">Sin datos en este periodo</p>';
    return;
  }

  // Agrupar por producto
  const agrupado = {};
  ventas.forEach(v => {
    const nombre = v.productos?.nombre || 'Producto';
    if (!agrupado[nombre]) agrupado[nombre] = { cantidad: 0, total: 0 };
    agrupado[nombre].cantidad += v.cantidad;
    agrupado[nombre].total += v.total;
  });

  const top = Object.entries(agrupado)
    .sort((a, b) => b[1].total - a[1].total)
    .slice(0, 10);

  el.innerHTML = `
    <table class="data-table">
      <thead>
        <tr>
          <th>#</th>
          <th>Producto</th>
          <th>Cant. Vendida</th>
          <th>Total</th>
        </tr>
      </thead>
      <tbody>
        ${top.map(([nombre, data], i) => `
          <tr>
            <td>${i + 1}</td>
            <td>${nombre}</td>
            <td>${data.cantidad}</td>
            <td><strong>${formatMoney(data.total)}</strong></td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;
}

function getRangoFechas(periodo) {
  const hoy = new Date();
  let inicio, fin;

  if (periodo === 'hoy') {
    inicio = hoy.toISOString().split('T')[0] + 'T00:00:00';
    fin = hoy.toISOString().split('T')[0] + 'T23:59:59';
  } else if (periodo === 'semana') {
    const lunes = new Date(hoy);
    lunes.setDate(hoy.getDate() - hoy.getDay() + 1);
    inicio = lunes.toISOString().split('T')[0] + 'T00:00:00';
    fin = hoy.toISOString().split('T')[0] + 'T23:59:59';
  } else {
    inicio = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-01T00:00:00`;
    fin = hoy.toISOString().split('T')[0] + 'T23:59:59';
  }

  return { inicio, fin };
}

async function exportarReporte() {
  const periodo = document.getElementById('reportePeriodo')?.value || 'mes';
  const negocioId = currentBusiness?.id || currentUser.id;
  const { inicio, fin } = getRangoFechas(periodo);

  const { data: ventas } = await db
    .from('ventas')
    .select('*, productos(nombre)')
    .eq('negocio_id', negocioId)
    .gte('created_at', inicio)
    .lte('created_at', fin)
    .order('created_at', { ascending: false });

  if (!ventas?.length) { showToast('Sin datos para exportar', 'error'); return; }

  // Generar CSV
  const headers = 'Fecha,Hora,Producto,Cantidad,Precio Unit.,Total,Vendedor';
  const rows = ventas.map(v => [
    formatDate(v.created_at),
    formatTime(v.created_at),
    v.productos?.nombre || '',
    v.cantidad,
    v.precio_unitario,
    v.total,
    v.vendedor_nombre || ''
  ].join(','));

  const csv = [headers, ...rows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `reporte-${periodo}-${new Date().toISOString().split('T')[0]}.csv`;
  link.click();

  showToast('Reporte exportado', 'success');
}
