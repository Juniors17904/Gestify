// ===== REPORTES =====

async function cargarReporte() {
  const periodo = document.getElementById('reportePeriodo')?.value || 'mes';
  const negocioId = currentBusiness?.id;
  if (!negocioId) return;

  const { inicio, fin } = getRangoFechas(periodo);

  const { data: ventas } = await db
    .from('ventas')
    .select('id, total, created_at, venta_items(cantidad, precio_unitario, productos(nombre))')
    .eq('negocio_id', negocioId)
    .gte('created_at', inicio)
    .lte('created_at', fin);

  const totalVentas = (ventas || []).reduce((s, v) => s + v.total, 0);
  const totalTransacciones = ventas?.length || 0;
  const totalProductosVendidos = (ventas || []).reduce((s, v) =>
    s + (v.venta_items || []).reduce((acc, it) => acc + (it.cantidad || 0), 0), 0);

  document.getElementById('reporteTotalVentas').textContent = formatMoney(totalVentas);
  document.getElementById('reporteTransacciones').textContent = totalTransacciones;
  document.getElementById('reporteProductosVendidos').textContent = totalProductosVendidos;

  renderTopProductos(ventas || []);
}

function renderTopProductos(ventas) {
  const el = document.getElementById('topProductos');
  if (!ventas.length) {
    el.innerHTML = '<p class="empty-text">Sin datos en este periodo</p>';
    return;
  }

  const agrupado = {};
  ventas.forEach(v => {
    (v.venta_items || []).forEach(item => {
      const nombre = item?.productos?.nombre || 'Producto';
      if (!agrupado[nombre]) agrupado[nombre] = { cantidad: 0, total: 0 };
      agrupado[nombre].cantidad += item?.cantidad || 0;
      agrupado[nombre].total += (item.precio_unitario || 0) * (item.cantidad || 0);
    });
  });

  const top = Object.entries(agrupado)
    .sort((a, b) => b[1].total - a[1].total)
    .slice(0, 10);

  el.innerHTML = `
    <table class="data-table">
      <thead>
        <tr><th>#</th><th>Producto</th><th>Cant.</th><th>Total</th></tr>
      </thead>
      <tbody>
        ${top.map(([nombre, d], i) => `
          <tr>
            <td>${i + 1}</td>
            <td>${nombre}</td>
            <td>${d.cantidad}</td>
            <td><strong>${formatMoney(d.total)}</strong></td>
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
    fin    = hoy.toISOString().split('T')[0] + 'T23:59:59';
  } else if (periodo === 'semana') {
    const lunes = new Date(hoy);
    lunes.setDate(hoy.getDate() - hoy.getDay() + 1);
    inicio = lunes.toISOString().split('T')[0] + 'T00:00:00';
    fin    = hoy.toISOString().split('T')[0] + 'T23:59:59';
  } else {
    inicio = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2,'0')}-01T00:00:00`;
    fin    = hoy.toISOString().split('T')[0] + 'T23:59:59';
  }

  return { inicio, fin };
}

async function exportarReporte() {
  const periodo = document.getElementById('reportePeriodo')?.value || 'mes';
  const { inicio, fin } = getRangoFechas(periodo);

  const { data: ventas } = await db
    .from('ventas')
    .select('id, total, created_at, venta_items(cantidad, precio_unitario, productos(nombre))')
    .eq('negocio_id', currentBusiness?.id)
    .gte('created_at', inicio)
    .lte('created_at', fin)
    .order('created_at', { ascending: false });

  if (!ventas?.length) { showToast('Sin datos para exportar', 'error'); return; }

  const headers = 'Fecha,Hora,Producto,Cantidad,Precio Unit.,Subtotal';
  const rows = ventas.flatMap(v =>
    (v.venta_items || []).map(item => [
      formatDate(v.created_at),
      formatTime(v.created_at),
      item?.productos?.nombre || '',
      item?.cantidad || '',
      item?.precio_unitario || '',
      (item?.precio_unitario || 0) * (item?.cantidad || 0)
    ].join(','))
  );

  const csv = [headers, ...rows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `reporte-${periodo}-${new Date().toISOString().split('T')[0]}.csv`;
  a.click();

  showToast('Reporte exportado', 'success');
}
