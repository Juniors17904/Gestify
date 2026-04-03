// ===== UI GENERAL =====

let currentUser = null;
let currentBusiness = null;
let currentSection = 'dashboard';
let userEmpresas = [];
let currentRol = 'admin';
let currentNombre = '';

// Cargar HTML de módulos desde /modules/ en paralelo
async function loadModules() {
  const mods = ['dashboard','inventario','ventas','caja','empleados','reportes','clientes','agenda','ajustes'];
  await Promise.all(mods.map(m =>
    fetch('modules/' + m + '.html')
      .then(r => r.text())
      .then(html => { document.getElementById('section-' + m).innerHTML = html; })
      .catch(() => {}) // si falla un módulo no bloquea el resto
  ));
  lucide.createIcons();
}

// Inicializar dashboard
async function initDashboard() {
  // Cargar módulos y auth en paralelo — los módulos son archivos locales (<50ms)
  const modulesReady = loadModules();
  // Verificar si es sesión de empleado (login por PIN)
  const empSessionRaw = localStorage.getItem('empleadoSession');
  if (empSessionRaw) {
    const emp = JSON.parse(empSessionRaw);
    currentBusiness = emp.negocio;
    if (currentBusiness) {
      APP_CONFIG.moneda = currentBusiness.moneda || 'S/';
      APP_CONFIG.stockMinimo = currentBusiness.stock_minimo || 5;
    }
    const rol = emp.rol || 'empleado';
    const nombre = emp.nombre;
    const negocioNombre = currentBusiness?.nombre || 'Mi Negocio';
    await modulesReady;
    setupDashboardUI(nombre, negocioNombre, rol);
    return;
  }

  // Sesión normal (admin/dueño vía Supabase Auth)
  const { data: { session } } = await db.auth.getSession();
  if (!session) return; // auth.js ya redirige a index.html

  // getUser() trae user_metadata fresco del servidor (para sincronizar tema/color)
  const { data: { user: freshUser } } = await db.auth.getUser();
  currentUser = freshUser || session.user;
  const nombre = currentUser.user_metadata?.name || currentUser.user_metadata?.full_name || currentUser.email;

  // Cargar todas las empresas del usuario (propias + como empleado) — en paralelo con módulos
  const [[{ data: propias }, { data: comoEmpleado }]] = await Promise.all([
    Promise.all([
      db.from('negocios').select('*').eq('owner_id', currentUser.id),
      db.from('empleados').select('*, negocios(*)').eq('user_id', currentUser.id),
    ]),
    modulesReady,
  ]);

  // Armar lista de empresas (sin duplicados)
  userEmpresas = [];
  const vistas = new Set();
  (propias || []).forEach(n => { vistas.add(n.id); userEmpresas.push({ negocio: n, rol: 'admin' }); });
  (comoEmpleado || []).forEach(e => { if (e.negocios && !vistas.has(e.negocios.id)) { vistas.add(e.negocios.id); userEmpresas.push({ negocio: e.negocios, rol: e.rol }); } });

  // Elegir empresa activa (última usada o la primera)
  const ultimaId = localStorage.getItem('empresaActiva');
  const activa = userEmpresas.find(e => e.negocio.id === ultimaId) || userEmpresas[0];

  if (activa) {
    currentBusiness = activa.negocio;
    APP_CONFIG.moneda = currentBusiness.moneda || 'S/';
    APP_CONFIG.stockMinimo = currentBusiness.stock_minimo || 5;
    setupDashboardUI(nombre, currentBusiness.nombre, activa.rol);
  } else {
    // Sin empresa → mostrar dashboard vacío
    setupDashboardUI(nombre, 'Mi empresa', 'admin');
  }
}

function renderAvatar(el, nombre) {
  const meta = currentUser?.user_metadata || {};
  const googleIdentity = currentUser?.identities?.find(i => i.provider === 'google');
  const avatarUrl = meta.avatar_url || meta.picture ||
    googleIdentity?.identity_data?.avatar_url ||
    googleIdentity?.identity_data?.picture;
  const inicial = nombre?.[0]?.toUpperCase() || '?';
  if (avatarUrl) {
    el.innerHTML = `<img src="${avatarUrl}" style="width:100%;height:100%;border-radius:50%;object-fit:cover" referrerpolicy="no-referrer" onerror="this.parentElement.textContent='${inicial}'">`;
  } else {
    el.textContent = inicial;
  }
}

function setupDashboardUI(nombre, negocioNombre, rol) {
  currentRol = rol;
  currentNombre = nombre;
  // Actualizar UI
  document.getElementById('businessName').textContent = negocioNombre;
  document.getElementById('businessAvatar').textContent = (negocioNombre?.[0] || 'N').toUpperCase();
  renderAvatar(document.getElementById('headerAvatar'), nombre);
  document.getElementById('userRole').textContent = formatRol(rol);

  // Permisos por rol
  const permisos = {
    admin:    ['dashboard','inventario','ventas','caja','clientes','agenda','empleados','reportes','ajustes'],
    empleado: ['dashboard','inventario','ventas','clientes','agenda'],
    readonly: ['dashboard','reportes']
  };
  const permitidos = permisos[rol] || permisos['empleado'];

  // Módulos activos (solo si hay negocio configurado)
  const modulosActivos = currentBusiness ? (currentBusiness.modulos || ['inventario','ventas','caja','reportes']) : [];

  // Config de cada módulo
  const NAV_MODULOS = [
    { id: 'inventario', label: 'Inventario', icon: 'package' },
    { id: 'ventas',     label: 'Ventas',     icon: 'shopping-cart' },
    { id: 'caja',       label: 'Caja',       icon: 'wallet' },
    { id: 'clientes',   label: 'Clientes',   icon: 'users' },
    { id: 'agenda',     label: 'Agenda',     icon: 'calendar' },
    { id: 'empleados',  label: 'Accesos',    icon: 'shield-check' },
    { id: 'reportes',   label: 'Reportes',   icon: 'bar-chart-2' },
  ];
  const BOTTOM_MODULOS = [
    { id: 'inventario', label: 'Inventario', icon: 'package' },
    { id: 'ventas',     label: 'Ventas',     icon: 'shopping-cart' },
    { id: 'clientes',   label: 'Clientes',   icon: 'users' },
    { id: 'agenda',     label: 'Agenda',     icon: 'calendar' },
    { id: 'caja',       label: 'Caja',       icon: 'wallet' },
    { id: 'reportes',   label: 'Reportes',   icon: 'bar-chart-2' },
  ];

  // Insertar módulos en sidebar
  const sidebarNav = document.getElementById('sidebarNav');
  sidebarNav.querySelectorAll('.nav-modulo').forEach(el => el.remove());
  NAV_MODULOS.forEach(m => {
    if (!permitidos.includes(m.id) || !modulosActivos.includes(m.id)) return;
    const a = document.createElement('a');
    a.href = '#';
    a.className = 'nav-item nav-modulo';
    a.setAttribute('onclick', `showSection('${m.id}')`);
    a.innerHTML = `<span class="nav-icon"><i data-lucide="${m.icon}"></i></span> ${m.label}`;
    sidebarNav.appendChild(a);
  });

  // Insertar módulos en bottom nav
  const bottomNav = document.querySelector('.bottom-nav-items');
  bottomNav.querySelectorAll('.bottom-modulo').forEach(el => el.remove());
  BOTTOM_MODULOS.forEach(m => {
    if (!permitidos.includes(m.id) || !modulosActivos.includes(m.id)) return;
    const a = document.createElement('a');
    a.className = 'bottom-nav-item bottom-modulo';
    a.href = '#';
    a.setAttribute('onclick', `showSection('${m.id}')`);
    a.innerHTML = `<i data-lucide="${m.icon}"></i><span>${m.label}</span>`;
    bottomNav.appendChild(a);
  });

  // Cargar módulos en checkboxes de ajustes
  document.querySelectorAll('#ajusteModulos input[type=checkbox]').forEach(cb => {
    cb.checked = modulosActivos.includes(cb.value);
    const card = cb.closest('.modulo-card');
    if (card) card.classList.toggle('selected', cb.checked);
  });

  // Configurar ajustes - negocio
  if (document.getElementById('ajusteNombreNegocio')) {
    document.getElementById('ajusteNombreNegocio').value = negocioNombre;
    if (currentBusiness?.tipo && document.getElementById('ajusteTipo')) document.getElementById('ajusteTipo').value = currentBusiness.tipo;
    if (currentBusiness?.moneda && document.getElementById('ajusteMoneda')) document.getElementById('ajusteMoneda').value = currentBusiness.moneda;
    if (currentBusiness?.ruc && document.getElementById('ajusteRuc')) document.getElementById('ajusteRuc').value = currentBusiness.ruc;
    if (currentBusiness?.telefono && document.getElementById('ajusteTelefono')) document.getElementById('ajusteTelefono').value = currentBusiness.telefono;
    if (currentBusiness?.direccion && document.getElementById('ajusteDireccion')) document.getElementById('ajusteDireccion').value = currentBusiness.direccion;
  }

  // Configurar ajustes - cuenta
  if (document.getElementById('cuentaNombreDisplay')) {
    document.getElementById('cuentaNombreDisplay').textContent = nombre;
    document.getElementById('cuentaEmailDisplay').textContent = currentUser?.email || '';
    renderAvatar(document.getElementById('cuentaAvatar'), nombre);
    document.getElementById('ajusteNombreUsuario').value = nombre;
  }

  // Restaurar tema y color — Supabase tiene prioridad sobre localStorage
  const meta = currentUser?.user_metadata || {};
  const temaGuardado = meta.tema || localStorage.getItem('tema');
  if (temaGuardado) setTema(temaGuardado, false);
  const colorGuardado = meta.colorPrimary || localStorage.getItem('colorPrimary');
  if (colorGuardado) {
    setColor(colorGuardado, null, false);
    document.querySelectorAll('.color-dot').forEach(d => {
      d.classList.toggle('active', d.style.background === colorGuardado);
    });
  }

  // Estado vacío vs contenido del dashboard
  const hasNegocio = !!currentBusiness;
  const emptyState = document.getElementById('dashboardEmptyState');
  const dashContent = document.getElementById('dashboardContent');
  if (emptyState) emptyState.classList.toggle('hidden', hasNegocio);
  if (dashContent) dashContent.style.display = hasNegocio ? '' : 'none';

  // Botones demo: mostrar "Agregar" si hay negocio
  document.getElementById('btnDemoWrap').style.display = hasNegocio ? 'flex' : 'none';
  document.getElementById('btnAgregarDemo').style.display = hasNegocio ? 'block' : 'none';
  document.getElementById('btnBorrarDemo').style.display = 'none';
  if (hasNegocio) actualizarBotonesDemo();

  // Selector de empresa en header
  renderEmpresaSelector();

  // Cargar sección inicial
  showSection('dashboard');
}

// Navegación entre secciones
function showSection(name) {
  document.querySelectorAll('.section').forEach(s => {
    s.classList.add('hidden');
    s.classList.remove('active');
  });

  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));

  const section = document.getElementById('section-' + name);
  if (section) {
    section.classList.remove('hidden');
    section.classList.add('active');
  }

  const navItem = document.querySelector(`.nav-item[onclick="showSection('${name}')"]`);
  if (navItem) navItem.classList.add('active');

  // Bottom nav activo
  document.querySelectorAll('.bottom-nav-item').forEach(n => n.classList.remove('active'));
  const bottomItem = document.querySelector(`.bottom-nav-item[onclick="showSection('${name}')"]`);
  if (bottomItem) bottomItem.classList.add('active');

  const titles = {
    dashboard: 'Dashboard',
    inventario: 'Inventario',
    ventas: 'Ventas',
    caja: 'Caja',
    clientes: 'Clientes',
    agenda: 'Agenda',
    empleados: 'Empleados',
    reportes: 'Reportes',
    ajustes: 'Ajustes'
  };

  document.getElementById('pageTitle').textContent = titles[name] || name;
  currentSection = name;

  // Cerrar sidebar en móvil
  closeSidebarMobile();

  // Cargar datos de la sección
  loadSection(name);

  // Reiniciar iconos Lucide
  if (typeof lucide !== 'undefined') lucide.createIcons();
}

async function loadSection(name) {
  switch (name) {
    case 'dashboard':   await loadDashboard();   break;
    case 'inventario':  await loadInventario();  break;
    case 'ventas':      await loadVentas();      break;
    case 'caja':        await loadCaja();        break;
    case 'clientes':    await loadClientes();    break;
    case 'agenda':      await loadAgenda();      break;
    case 'empleados':   await loadEmpleados();   break;
    case 'reportes':    await cargarReporte();   break;
  }
}

// Sidebar
function toggleSidebar() {
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebarOverlay');
  sidebar.classList.toggle('open');
  overlay.classList.toggle('visible');
}

function closeSidebarMobile() {
  if (window.innerWidth <= 768) {
    document.getElementById('sidebar').classList.remove('open');
    document.getElementById('sidebarOverlay').classList.remove('visible');
  }
}

// Modales
function showModal(id) {
  document.getElementById(id)?.classList.remove('hidden');
}

function closeModal(id) {
  const modal = document.getElementById(id);
  if (modal) {
    modal.classList.add('hidden');
    modal.querySelector('form')?.reset();
  }
}

// Modal egreso (reutiliza el de ingreso)
function showModalEgreso() {
  const modal = document.getElementById('modalEgreso');
  modal?.classList.remove('hidden');
}

// Modal de confirmación
let _confirmResolve = null;

function showConfirm(msg, okLabel = 'Eliminar', okColor = '#EF4444') {
  return new Promise(resolve => {
    _confirmResolve = resolve;
    document.getElementById('modalConfirmMsg').textContent = msg;
    document.getElementById('modalConfirmOk').textContent = okLabel;
    document.getElementById('modalConfirmOk').style.background = okColor;
    document.getElementById('modalConfirm').style.display = 'flex';
  });
}

function resolveConfirm(result) {
  document.getElementById('modalConfirm').style.display = 'none';
  if (_confirmResolve) { _confirmResolve(result); _confirmResolve = null; }
}

// Toast
function showToast(msg, type = '') {
  const toast = document.getElementById('toast');
  toast.textContent = msg;
  toast.className = 'toast ' + type;
  toast.classList.remove('hidden');
  setTimeout(() => toast.classList.add('hidden'), 3000);
}

// Formatear
function formatRol(rol) {
  const roles = { admin: 'Admin', empleado: 'Empleado', readonly: 'Solo Lectura' };
  return roles[rol] || rol;
}

function formatMoney(amount) {
  return `${APP_CONFIG.moneda} ${parseFloat(amount || 0).toFixed(2)}`;
}

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString('es-PE', {
    day: '2-digit', month: '2-digit', year: 'numeric'
  });
}

function formatTime(dateStr) {
  return new Date(dateStr).toLocaleTimeString('es-PE', {
    hour: '2-digit', minute: '2-digit'
  });
}

// Acordeón "Ver más" en tab Negocio
function toggleAcordeon() {
  const extra = document.getElementById('acordeonExtra');
  const icon  = document.getElementById('acordeonIcon');
  const label = document.getElementById('acordeonLabel');
  const abierto = extra.style.display !== 'none';
  extra.style.display = abierto ? 'none' : 'block';
  icon.style.transform = abierto ? '' : 'rotate(180deg)';
  label.textContent = abierto ? 'Más información' : 'Menos información';
}

// Tabs de ajustes
function showAjusteTab(tab) {
  document.querySelectorAll('.ajuste-tab').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.ajuste-panel').forEach(p => p.style.display = 'none');
  document.querySelector(`.ajuste-tab[onclick="showAjusteTab('${tab}')"]`).classList.add('active');
  document.getElementById('ajuste-' + tab).style.display = 'block';
  if (tab === 'misnegocios') renderMisNegocios();
}

function renderMisNegocios() {
  const lista = document.getElementById('misNegociosList');
  lista.innerHTML = userEmpresas.map(e => `
    <div style="display:flex;align-items:center;justify-content:space-between;padding:.75rem 1rem;border:1px solid var(--border);border-radius:10px;background:${e.negocio.id === currentBusiness?.id ? 'var(--primary-light)' : ''}">
      <div style="display:flex;align-items:center;gap:.75rem">
        <div style="width:36px;height:36px;border-radius:8px;background:var(--primary);color:white;display:flex;align-items:center;justify-content:center;font-weight:700">
          ${e.negocio.nombre[0].toUpperCase()}
        </div>
        <div>
          <p style="font-weight:600;font-size:.9rem;color:${e.negocio.id === currentBusiness?.id ? '#111' : 'var(--text-primary)'}">${e.negocio.nombre}</p>
          <span style="font-size:.75rem;color:${e.negocio.id === currentBusiness?.id ? '#444' : 'var(--text-secondary)'}">${formatRol(e.rol)}</span>
        </div>
      </div>
      <div style="display:flex;gap:.5rem;align-items:center">
        ${e.negocio.id === currentBusiness?.id ? '<span style="font-size:.75rem;color:#111;font-weight:600">Activo</span>' : `<button onclick="cambiarEmpresa('${e.negocio.id}')" style="font-size:.75rem;padding:.3rem .7rem;border:1px solid var(--primary);color:var(--primary);border-radius:6px;background:none;cursor:pointer">Usar</button>`}
        ${e.rol === 'admin' ? `<button onclick="eliminarNegocio('${e.negocio.id}')" style="font-size:.75rem;padding:.3rem .7rem;border:1px solid #EF4444;color:#EF4444;border-radius:6px;background:none;cursor:pointer">Eliminar</button>` : ''}
      </div>
    </div>
  `).join('');
}

async function eliminarNegocio(negocioId) {
  if (!await showConfirm('¿Eliminar este negocio y todos sus datos? Esta acción no se puede deshacer.')) return;

  const { data: ventas } = await db.from('ventas').select('id').eq('negocio_id', negocioId);
  const ventaIds = (ventas || []).map(v => v.id);
  if (ventaIds.length) await db.from('venta_items').delete().in('venta_id', ventaIds);

  await db.from('ventas').delete().eq('negocio_id', negocioId);
  await db.from('productos').delete().eq('negocio_id', negocioId);
  await db.from('caja').delete().eq('negocio_id', negocioId);
  await db.from('empleados').delete().eq('negocio_id', negocioId);
  await db.from('citas').delete().eq('negocio_id', negocioId);
  await db.from('clientes').delete().eq('negocio_id', negocioId);
  const { error } = await db.from('negocios').delete().eq('id', negocioId);

  if (error) { showToast('Error al eliminar', 'error'); return; }

  userEmpresas = userEmpresas.filter(e => e.negocio.id !== negocioId);

  if (currentBusiness?.id === negocioId) {
    currentBusiness = null;
    location.reload();
  } else {
    showToast('Negocio eliminado', 'success');
    renderMisNegocios();
  }
}

async function actualizarBotonesDemo() {
  if (!currentBusiness?.id) return;
  const { count } = await db.from('productos').select('id', { count: 'exact', head: true }).eq('negocio_id', currentBusiness.id);
  const tieneData = (count || 0) > 0;
  document.getElementById('btnAgregarDemo').style.display = tieneData ? 'none'  : 'block';
  document.getElementById('btnBorrarDemo').style.display  = tieneData ? 'block' : 'none';
}

// Guardar ajustes de negocio
async function guardarAjustes() {
  const nombre      = document.getElementById('ajusteNombreNegocio').value;
  const tipo        = document.getElementById('ajusteTipo').value;
  const moneda      = document.getElementById('ajusteMoneda').value;
  const ruc         = document.getElementById('ajusteRuc').value;
  const telefono    = document.getElementById('ajusteTelefono').value;
  const direccion   = document.getElementById('ajusteDireccion').value;
  const modulos = Array.from(document.querySelectorAll('#ajusteModulos input:checked')).map(c => c.value);

  const { error } = await db
    .from('negocios')
    .update({ nombre, tipo, moneda, ruc, telefono, direccion, modulos })
    .eq('id', currentBusiness.id);

  if (error) { showToast('Error al guardar', 'error'); return; }

  currentBusiness = { ...currentBusiness, nombre, tipo, moneda, ruc, telefono, direccion, modulos };
  APP_CONFIG.moneda = moneda;
  setupDashboardUI(currentNombre, nombre, currentRol);
  showToast('Negocio actualizado', 'success');
}

// Guardar nombre de cuenta
async function guardarCuenta() {
  const nombre = document.getElementById('ajusteNombreUsuario').value;
  const { error } = await db.auth.updateUser({ data: { name: nombre } });
  if (error) { showToast('Error al guardar', 'error'); return; }
  renderAvatar(document.getElementById('headerAvatar'), nombre);
  document.getElementById('cuentaAvatar').textContent = nombre[0].toUpperCase();
  document.getElementById('cuentaNombreDisplay').textContent = nombre;
  showToast('Nombre actualizado', 'success');
}

// Cambiar contraseña
async function cambiarPassword() {
  const pass = document.getElementById('nuevaPassword').value;
  if (!pass || pass.length < 6) { showToast('Mínimo 6 caracteres', 'error'); return; }
  const { error } = await db.auth.updateUser({ password: pass });
  if (error) { showToast('Error al cambiar contraseña', 'error'); return; }
  document.getElementById('nuevaPassword').value = '';
  showToast('Contraseña actualizada', 'success');
}

// Tema
function setTema(tema, sincronizar = true) {
  document.querySelectorAll('.tema-option').forEach(o => o.classList.remove('active'));
  const temaEl = document.getElementById('tema' + tema.charAt(0).toUpperCase() + tema.slice(1));
  if (temaEl) temaEl.classList.add('active');
  document.documentElement.setAttribute('data-tema', tema);
  localStorage.setItem('tema', tema);
  if (sincronizar && currentUser) {
    db.auth.updateUser({ data: { tema } });
  }
}

// Color principal
const COLOR_PALETTE = {
  '#6C63FF': { dark: '#5A52D5', light: '#EEF0FF' },
  '#3B82F6': { dark: '#2563EB', light: '#DBEAFE' },
  '#22C55E': { dark: '#16A34A', light: '#D1FAE5' },
  '#F59E0B': { dark: '#D97706', light: '#FEF3C7' },
  '#EF4444': { dark: '#DC2626', light: '#FEE2E2' },
  '#EC4899': { dark: '#DB2777', light: '#FCE7F3' },
};

function setColor(color, el, sincronizar = true) {
  document.querySelectorAll('.color-dot').forEach(d => d.classList.remove('active'));
  if (el) el.classList.add('active');
  const palette = COLOR_PALETTE[color] || { dark: color, light: color + '20' };
  document.documentElement.style.setProperty('--primary', color);
  document.documentElement.style.setProperty('--primary-dark', palette.dark);
  document.documentElement.style.setProperty('--primary-light', palette.light);
  localStorage.setItem('colorPrimary', color);
  if (sincronizar && currentUser) {
    db.auth.updateUser({ data: { colorPrimary: color } });
  }
}

// Mostrar Pro
function mostrarPro() {
  showToast('Próximamente disponible', 'success');
}

// Setup primer ingreso
const LABEL_MODULO = {
  inventario:'Inventario', ventas:'Ventas', caja:'Caja',
  clientes:'Clientes', agenda:'Agenda', empleados:'Accesos', reportes:'Reportes'
};

function mostrarSetup() {
  const modal = document.getElementById('modalSetupWizard');
  if (modal) {
    modal.style.display = 'flex';
    wizardSpaso(1);
    if (typeof lucide !== 'undefined') lucide.createIcons();
  }
}

function wizardSpaso(n) {
  ['wpaso1','wpaso2','wpaso3'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.display = 'none';
  });
  const paso = document.getElementById('wpaso' + n);
  if (paso) paso.style.display = 'block';
  for (let i = 1; i <= 3; i++) {
    const d = document.getElementById('wdot' + i);
    if (d) d.className = 'sdot' + (i < n ? ' done' : i === n ? ' active' : '');
  }
  for (let i = 1; i <= 2; i++) {
    const l = document.getElementById('wline' + i);
    if (l) l.className = 'sline' + (i < n ? ' done' : '');
  }
  if (typeof lucide !== 'undefined') lucide.createIcons();
}

function wizardPaso2() {
  if (!document.getElementById('wNombre').value.trim()) {
    document.getElementById('wNombre').value = 'Mi empresa';
  }
  if (!document.getElementById('wTipo').value.trim()) {
    document.getElementById('wTipo').value = 'Sin especificar';
  }
  wizardSpaso(2);
}

function wizardPaso3() {
  const mods = Array.from(document.querySelectorAll('#wModulosGrid input:checked')).map(c => c.value);
  if (!mods.length) { showToast('Selecciona al menos un módulo'); return; }
  document.getElementById('wRNombre').textContent = document.getElementById('wNombre').value.trim();
  document.getElementById('wRTipo').textContent   = document.getElementById('wTipo').value.trim() || '—';
  document.getElementById('wRMoneda').textContent  = document.getElementById('wMoneda').value;
  document.getElementById('wRModulos').innerHTML   = mods.map(m => `<span class="rbadge">${LABEL_MODULO[m]||m}</span>`).join('');
  wizardSpaso(3);
}

async function completarSetup() {
  const negocioNombre = document.getElementById('wNombre').value.trim() || 'Mi empresa';
  const tipo    = document.getElementById('wTipo').value.trim() || 'Sin especificar';
  const moneda  = document.getElementById('wMoneda').value;
  const modulos = Array.from(document.querySelectorAll('#wModulosGrid input:checked')).map(c => c.value);

  const btn = document.getElementById('wBtnFinalizar');
  btn.disabled = true;
  btn.textContent = 'Guardando...';

  const nombre = currentUser.user_metadata?.name || currentUser.user_metadata?.full_name || currentUser.email;

  const { data: negocio, error } = await db.from('negocios').insert({
    nombre: negocioNombre,
    owner_id: currentUser.id,
    tipo, moneda, modulos,
    plan: 'gratis'
  }).select().single();

  if (error) {
    btn.disabled = false;
    btn.textContent = 'Comenzar';
    showToast('Error: ' + error.message, 'error');
    return;
  }

  await db.from('empleados').insert({
    negocio_id: negocio.id,
    user_id: currentUser.id,
    nombre, email: currentUser.email, rol: 'admin'
  });

  currentBusiness = negocio;
  localStorage.setItem('empresaActiva', negocio.id);
  userEmpresas.push({ negocio, rol: 'admin' });
  document.getElementById('modalSetupWizard').style.display = 'none';
  setupDashboardUI(nombre, negocioNombre, 'admin');
  showToast('¡Configuración guardada!', 'success');
  btn.disabled = false;
  btn.textContent = 'Comenzar';
}

// ===== SELECTOR DE EMPRESA =====
const COLORES = ['#6C63FF','#22C55E','#3B82F6','#F59E0B','#EF4444','#EC4899','#8B5CF6','#14B8A6'];

function renderEmpresaSelector() {
  if (!currentBusiness) return;
  document.getElementById('empresaSelectorNombre').textContent = currentBusiness.nombre;
  document.getElementById('empresaSelectorDot').textContent = currentBusiness.nombre[0].toUpperCase();

  if (userEmpresas.length <= 1) {
    document.getElementById('empresaSelector').style.cursor = 'default';
    document.querySelector('.empresa-selector-chevron').style.display = 'none';
  }
}

function toggleEmpresaDropdown() {
  if (userEmpresas.length <= 1) return;
  const dd = document.getElementById('empresaDropdown');
  if (dd.classList.contains('hidden')) {
    renderEmpresaDropdown();
    dd.classList.remove('hidden');
    setTimeout(() => document.addEventListener('click', cerrarDropdownFuera), 10);
  } else {
    dd.classList.add('hidden');
  }
}

function cerrarDropdownFuera(e) {
  if (!e.target.closest('#empresaDropdown') && !e.target.closest('#empresaSelector')) {
    document.getElementById('empresaDropdown').classList.add('hidden');
    document.removeEventListener('click', cerrarDropdownFuera);
  }
}

function renderEmpresaDropdown() {
  const dd = document.getElementById('empresaDropdown');
  dd.innerHTML = userEmpresas.map((e, i) => `
    <div class="dropdown-empresa-item ${e.negocio.id === currentBusiness?.id ? 'active' : ''}"
         onclick="cambiarEmpresa('${e.negocio.id}')">
      <div class="dropdown-empresa-icon" style="background:${COLORES[i % COLORES.length]}">
        ${e.negocio.nombre[0].toUpperCase()}
      </div>
      <div class="dropdown-empresa-info">
        <p>${e.negocio.nombre}</p>
        <span>${formatRol(e.rol)}</span>
      </div>
      ${e.negocio.id === currentBusiness?.id ? '<span class="dropdown-empresa-check">✓</span>' : ''}
    </div>
  `).join('');
}

async function cambiarEmpresa(negocioId) {
  document.getElementById('empresaDropdown').classList.add('hidden');
  const entrada = userEmpresas.find(e => e.negocio.id === negocioId);
  if (!entrada) return;

  currentBusiness = entrada.negocio;
  APP_CONFIG.moneda = currentBusiness.moneda || 'S/';
  APP_CONFIG.stockMinimo = currentBusiness.stock_minimo || 5;
  localStorage.setItem('empresaActiva', negocioId);

  document.getElementById('empresaSelectorNombre').textContent = currentBusiness.nombre;
  document.getElementById('empresaSelectorDot').textContent = currentBusiness.nombre[0].toUpperCase();
  document.getElementById('businessName').textContent = currentBusiness.nombre;
  document.getElementById('businessAvatar').textContent = currentBusiness.nombre[0].toUpperCase();

  showSection('dashboard');
  showToast(`Empresa: ${currentBusiness.nombre}`, 'success');
}

// Iniciar al cargar
window.addEventListener('DOMContentLoaded', initDashboard);
