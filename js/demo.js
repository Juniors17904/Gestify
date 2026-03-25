// ===== MODO DEMO =====

async function cargarDataDemo() {
  if (!confirm('¿Cargar datos de ejemplo?')) return;

  const btn = document.getElementById('btnAgregarDemo');
  btn.disabled = true;
  btn.textContent = 'Cargando...';

  const modulos = currentBusiness?.modulos || [];

  try {
    const negocioId = currentBusiness?.id;
    if (!negocioId) throw new Error('No hay negocio configurado');

    let productos = [];

    // INVENTARIO
    if (modulos.includes('inventario')) {
      const productosData = [
        { nombre: 'Polo básico blanco',   categoria: 'Polos',      precio: 35,  stock: 50, stock_minimo: 5 },
        { nombre: 'Polo básico negro',    categoria: 'Polos',      precio: 35,  stock: 45, stock_minimo: 5 },
        { nombre: 'Polo estampado',       categoria: 'Polos',      precio: 49,  stock: 30, stock_minimo: 5 },
        { nombre: 'Jean slim fit azul',   categoria: 'Pantalones', precio: 120, stock: 25, stock_minimo: 3 },
        { nombre: 'Jean negro skinny',    categoria: 'Pantalones', precio: 125, stock: 20, stock_minimo: 3 },
        { nombre: 'Jogger gris',          categoria: 'Pantalones', precio: 85,  stock: 15, stock_minimo: 3 },
        { nombre: 'Vestido floral',       categoria: 'Vestidos',   precio: 95,  stock: 12, stock_minimo: 3 },
        { nombre: 'Vestido casual negro', categoria: 'Vestidos',   precio: 89,  stock: 3,  stock_minimo: 5 },
        { nombre: 'Blusa manga larga',    categoria: 'Blusas',     precio: 55,  stock: 22, stock_minimo: 5 },
        { nombre: 'Blusa estampada',      categoria: 'Blusas',     precio: 60,  stock: 18, stock_minimo: 5 },
        { nombre: 'Casaca deportiva',     categoria: 'Casacas',    precio: 150, stock: 10, stock_minimo: 3 },
        { nombre: 'Casaca denim',         categoria: 'Casacas',    precio: 180, stock: 2,  stock_minimo: 3 },
        { nombre: 'Short playero',        categoria: 'Shorts',     precio: 45,  stock: 3,  stock_minimo: 5 },
        { nombre: 'Falda midi',           categoria: 'Faldas',     precio: 70,  stock: 14, stock_minimo: 3 },
        { nombre: 'Cinturón cuero',       categoria: 'Accesorios', precio: 30,  stock: 2,  stock_minimo: 5 },
      ];
      const { data, error } = await db.from('productos')
        .insert(productosData.map(p => ({ ...p, negocio_id: negocioId }))).select();
      if (error) throw error;
      productos = data;
    }

    // VENTAS (requiere inventario para tener productos)
    if (modulos.includes('ventas') && productos.length) {
      for (let dia = 6; dia >= 0; dia--) {
        const fecha = new Date();
        fecha.setDate(fecha.getDate() - dia);
        const cantVentas = Math.floor(Math.random() * 4) + 2;
        for (let i = 0; i < cantVentas; i++) {
          const prod = productos[Math.floor(Math.random() * productos.length)];
          const cantidad = Math.floor(Math.random() * 3) + 1;
          const total = prod.precio * cantidad;
          const hora = `${String(9 + Math.floor(Math.random() * 10)).padStart(2,'0')}:${String(Math.floor(Math.random() * 60)).padStart(2,'0')}:00`;
          const fechaStr = fecha.toISOString().split('T')[0] + 'T' + hora;
          const { data: venta, error: errV } = await db.from('ventas')
            .insert({ negocio_id: negocioId, total, created_at: fechaStr }).select().single();
          if (errV) throw errV;
          await db.from('venta_items').insert({
            venta_id: venta.id, producto_id: prod.id, cantidad, precio_unitario: prod.precio
          });
        }
      }
    }

    // CAJA
    if (modulos.includes('caja')) {
      const movimientos = [
        { tipo: 'ingreso', monto: 500,  descripcion: 'Apertura de caja' },
        { tipo: 'ingreso', monto: 320,  descripcion: 'Ventas del lunes' },
        { tipo: 'egreso',  monto: 150,  descripcion: 'Compra de bolsas' },
        { tipo: 'ingreso', monto: 480,  descripcion: 'Ventas del martes' },
        { tipo: 'egreso',  monto: 200,  descripcion: 'Pago de luz' },
        { tipo: 'ingreso', monto: 610,  descripcion: 'Ventas del miércoles' },
        { tipo: 'egreso',  monto: 80,   descripcion: 'Útiles de oficina' },
        { tipo: 'ingreso', monto: 395,  descripcion: 'Ventas del jueves' },
        { tipo: 'ingreso', monto: 720,  descripcion: 'Ventas del viernes' },
        { tipo: 'egreso',  monto: 300,  descripcion: 'Pago a proveedor' },
        { tipo: 'ingreso', monto: 890,  descripcion: 'Ventas del sábado' },
        { tipo: 'ingreso', monto: 250,  descripcion: 'Ventas de hoy' },
      ];
      const { error } = await db.from('caja')
        .insert(movimientos.map(m => ({ ...m, negocio_id: negocioId })));
      if (error) throw error;
    }

    // EMPLEADOS
    if (modulos.includes('empleados')) {
      const empleadosData = [
        { nombre: 'María García',   email: 'maria@demo.com',   rol: 'empleado' },
        { nombre: 'Carlos López',   email: 'carlos@demo.com',  rol: 'empleado' },
        { nombre: 'Ana Rodríguez',  email: 'ana@demo.com',     rol: 'readonly' },
      ];
      const { error } = await db.from('empleados')
        .insert(empleadosData.map(e => ({ ...e, negocio_id: negocioId })));
      if (error) throw error;
    }

    document.getElementById('btnAgregarDemo').style.display = 'none';
    document.getElementById('btnBorrarDemo').style.display = 'block';
    showToast('¡Data de ejemplo cargada!', 'success');
    loadDashboard();

  } catch (err) {
    showToast('Error: ' + err.message, 'error');
    btn.disabled = false;
    btn.textContent = '✨ Agregar data de ejemplo';
  }
}

async function borrarDataDemo() {
  if (!confirm('¿Borrar todos los datos de ejemplo?')) return;

  const negocioId = currentBusiness?.id;
  if (!negocioId) { showToast('No hay negocio', 'error'); return; }

  // Borrar venta_items primero (FK)
  const { data: ventasData } = await db.from('ventas').select('id').eq('negocio_id', negocioId);
  const ventaIds = (ventasData || []).map(v => v.id);
  if (ventaIds.length) {
    const { error: e1 } = await db.from('venta_items').delete().in('venta_id', ventaIds);
    if (e1) { showToast('Error: ' + e1.message, 'error'); return; }
  }

  const { error: e2 } = await db.from('ventas').delete().eq('negocio_id', negocioId);
  if (e2) { showToast('Error: ' + e2.message, 'error'); return; }

  const { error: e3 } = await db.from('productos').delete().eq('negocio_id', negocioId);
  if (e3) { showToast('Error: ' + e3.message, 'error'); return; }

  const { error: e4 } = await db.from('caja').delete().eq('negocio_id', negocioId);
  if (e4) { showToast('Error: ' + e4.message, 'error'); return; }

  // Solo borrar empleados que NO sean el dueño
  const { error: e5 } = await db.from('empleados').delete()
    .eq('negocio_id', negocioId).neq('user_id', currentUser.id);
  if (e5) { showToast('Error: ' + e5.message, 'error'); return; }

  // NO borrar el negocio — solo los datos

  showToast('Data de ejemplo borrada', 'success');
  document.getElementById('btnBorrarDemo').style.display = 'none';
  document.getElementById('btnAgregarDemo').style.display = 'block';
  loadDashboard();
}
