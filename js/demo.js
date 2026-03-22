// ===== MODO DEMO =====

async function cargarDataDemo() {
  if (!confirm('¿Cargar datos de ejemplo para una tienda de ropa?')) return;

  const btn = document.querySelector('#btnDemoWrap button');
  btn.disabled = true;
  btn.textContent = 'Cargando...';

  try {
    let negocioId = currentBusiness?.id;

    // 1. Crear negocio si no existe
    if (!negocioId) {
      const { data: negocio, error } = await db.from('negocios').insert({
        nombre: 'Tienda de Ropa Gestify',
        owner_id: currentUser.id,
        tipo: 'ropa',
        plan: 'gratis'
      }).select().single();

      if (error) throw error;

      await db.from('empleados').insert({
        negocio_id: negocio.id,
        user_id: currentUser.id,
        nombre: currentUser.user_metadata?.name || currentUser.email,
        email: currentUser.email,
        rol: 'admin'
      });

      negocioId = negocio.id;
      currentBusiness = negocio;
    }

    // 2. Productos de ropa
    const productosData = [
      { nombre: 'Polo básico blanco',    categoria: 'Polos',      precio: 35,  stock: 50, stock_minimo: 5 },
      { nombre: 'Polo básico negro',     categoria: 'Polos',      precio: 35,  stock: 45, stock_minimo: 5 },
      { nombre: 'Polo estampado',        categoria: 'Polos',      precio: 49,  stock: 30, stock_minimo: 5 },
      { nombre: 'Jean slim fit azul',    categoria: 'Pantalones', precio: 120, stock: 25, stock_minimo: 3 },
      { nombre: 'Jean negro skinny',     categoria: 'Pantalones', precio: 125, stock: 20, stock_minimo: 3 },
      { nombre: 'Jogger gris',           categoria: 'Pantalones', precio: 85,  stock: 15, stock_minimo: 3 },
      { nombre: 'Vestido floral',        categoria: 'Vestidos',   precio: 95,  stock: 12, stock_minimo: 3 },
      { nombre: 'Vestido casual negro',  categoria: 'Vestidos',   precio: 89,  stock: 3,  stock_minimo: 5 },
      { nombre: 'Blusa manga larga',     categoria: 'Blusas',     precio: 55,  stock: 22, stock_minimo: 5 },
      { nombre: 'Blusa estampada',       categoria: 'Blusas',     precio: 60,  stock: 18, stock_minimo: 5 },
      { nombre: 'Casaca deportiva',      categoria: 'Casacas',    precio: 150, stock: 10, stock_minimo: 3 },
      { nombre: 'Casaca denim',          categoria: 'Casacas',    precio: 180, stock: 2,  stock_minimo: 3 },
      { nombre: 'Short playero',         categoria: 'Shorts',     precio: 45,  stock: 3,  stock_minimo: 5 },
      { nombre: 'Falda midi',            categoria: 'Faldas',     precio: 70,  stock: 14, stock_minimo: 3 },
      { nombre: 'Cinturón cuero',        categoria: 'Accesorios', precio: 30,  stock: 2,  stock_minimo: 5 },
    ];

    const { data: productos, error: errProd } = await db
      .from('productos')
      .insert(productosData.map(p => ({ ...p, negocio_id: negocioId })))
      .select();

    if (errProd) throw errProd;

    // 3. Ventas + venta_items de los últimos 7 días
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

        const { data: venta, error: errV } = await db.from('ventas').insert({
          negocio_id: negocioId,
          total,
          created_at: fechaStr
        }).select().single();

        if (errV) throw errV;

        await db.from('venta_items').insert({
          venta_id: venta.id,
          producto_id: prod.id,
          cantidad,
          precio_unitario: prod.precio
        });
      }
    }

    // 4. Movimientos de caja
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

    const { error: errCaja } = await db.from('caja').insert(
      movimientos.map(m => ({ ...m, negocio_id: negocioId }))
    );
    if (errCaja) throw errCaja;

    document.getElementById('btnDemoWrap').style.display = 'none';
    showToast('¡Data de ejemplo cargada!', 'success');
    location.reload();

  } catch (err) {
    showToast('Error: ' + err.message, 'error');
    btn.disabled = false;
    btn.textContent = '✨ Agregar data de ejemplo';
  }
}

async function borrarDataDemo() {
  if (!confirm('¿Borrar todos los datos de ejemplo?')) return;

  const negocioId = currentBusiness?.id;
  if (!negocioId) { showToast('No hay negocio para borrar', 'error'); return; }

  const { data: ventasData } = await db.from('ventas').select('id').eq('negocio_id', negocioId);
  const ventaIds = (ventasData || []).map(v => v.id);
  if (ventaIds.length) {
    const { error: e1 } = await db.from('venta_items').delete().in('venta_id', ventaIds);
    if (e1) { showToast('Error venta_items: ' + e1.message, 'error'); return; }
  }

  const { error: e2 } = await db.from('ventas').delete().eq('negocio_id', negocioId);
  if (e2) { showToast('Error ventas: ' + e2.message, 'error'); return; }

  const { error: e3 } = await db.from('productos').delete().eq('negocio_id', negocioId);
  if (e3) { showToast('Error productos: ' + e3.message, 'error'); return; }

  const { error: e4 } = await db.from('caja').delete().eq('negocio_id', negocioId);
  if (e4) { showToast('Error caja: ' + e4.message, 'error'); return; }

  const { error: e5 } = await db.from('empleados').delete().eq('negocio_id', negocioId);
  if (e5) { showToast('Error empleados: ' + e5.message, 'error'); return; }

  const { error: e6 } = await db.from('negocios').delete().eq('id', negocioId);
  if (e6) { showToast('Error negocios: ' + e6.message, 'error'); return; }

  showToast('Data borrada', 'success');
  location.reload();
}
