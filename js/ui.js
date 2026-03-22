// ===== UI GENERAL =====

let currentUser = null;
let currentBusiness = null;
let currentSection = 'dashboard';
let userEmpresas = [];

// Inicializar dashboard
async function initDashboard() {
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
    setupDashboardUI(nombre, negocioNombre, rol);
    return;
  }

  // Sesión normal (admin/dueño vía Supabase Auth)
  const { data: { session } } = await db.auth.getSession();
  if (!session) {
    window.location.href = 'index.html';
    return;
  }

  currentUser = session.user;
  const nombre = currentUser.user_metadata?.name || currentUser.user_metadata?.full_name || currentUser.email;

  // Cargar todas las empresas del usuario (propias + como empleado)
  const [{ data: propias }, { data: comoEmpleado }] = await Promise.all([
    db.from('negocios').select('*').eq('owner_id', currentUser.id),
    db.from('empleados').select('*, negocios(*)').eq('user_id', currentUser.id)
  ]);

  // Armar lista de empresas
  userEmpresas = [];
  (propias || []).forEach(n => userEmpresas.push({ negocio: n, rol: 'admin' }));
  (comoEmpleado || []).forEach(e => { if (e.negocios) userEmpresas.push({ negocio: e.negocios, rol: e.rol }); });

  // Elegir empresa activa (última usada o la primera)
  const ultimaId = localStorage.getItem('empresaActiva');
  const activa = userEmpresas.find(e => e.negocio.id === ultimaId) || userEmpresas[0];

  if (activa) {
    currentBusiness = activa.negocio;
    APP_CONFIG.moneda = currentBusiness.moneda || 'S/';
    APP_CONFIG.stockMinimo = currentBusiness.stock_minimo || 5;
    setupDashboardUI(nombre, currentBusiness.nombre, activa.rol);
  } else {
    // Sin empresa → solo botón agregar
    setupDashboardUI(nombre, 'Mi Negocio', 'admin');
    document.getElementById('btnDemoWrap').style.display = 'flex';
    document.getElementById('btnAgregarDemo').style.display = 'block';
    document.getElementById('btnBorrarDemo').style.display = 'none';
  }
}

function setupDashboardUI(nombre, negocioNombre, rol) {
  // Actualizar UI
  document.getElementById('businessName').textContent = negocioNombre;
  document.getElementById('businessAvatar').textContent = negocioNombre[0].toUpperCase();
  document.getElementById('headerAvatar').textContent = nombre[0].toUpperCase();
  document.getElementById('userRole').textContent = formatRol(rol);

  // Permisos por rol
  const permisos = {
    admin:    ['dashboard','inventario','ventas','caja','empleados','reportes','ajustes'],
    empleado: ['dashboard','inventario','ventas'],
    readonly: ['dashboard','reportes']
  };

  const permitidos = permisos[rol] || permisos['empleado'];

  // Ocultar nav items no permitidos
  document.querySelectorAll('.nav-item[onclick]').forEach(item => {
    const match = item.getAttribute('onclick').match(/showSection\('(\w+)'\)/);
    if (match && !permitidos.includes(match[1])) {
      item.style.display = 'none';
    }
  });

  // Ocultar bottom nav items no permitidos
  document.querySelectorAll('.bottom-nav-item[onclick]').forEach(item => {
    const match = item.getAttribute('onclick').match(/showSection\('(\w+)'\)/);
    if (match && !permitidos.includes(match[1])) {
      item.style.display = 'none';
    }
  });

  // Configurar ajustes - negocio
  if (document.getElementById('ajusteNombreNegocio')) {
    document.getElementById('ajusteNombreNegocio').value = negocioNombre;
    document.getElementById('ajusteStockMinimo').value = APP_CONFIG.stockMinimo;
    if (currentBusiness?.tipo) document.getElementById('ajusteTipo').value = currentBusiness.tipo;
    if (currentBusiness?.moneda) document.getElementById('ajusteMoneda').value = currentBusiness.moneda;
    if (currentBusiness?.ruc) document.getElementById('ajusteRuc').value = currentBusiness.ruc;
    if (currentBusiness?.telefono) document.getElementById('ajusteTelefono').value = currentBusiness.telefono;
    if (currentBusiness?.direccion) document.getElementById('ajusteDireccion').value = currentBusiness.direccion;
  }

  // Configurar ajustes - cuenta
  if (document.getElementById('cuentaNombreDisplay')) {
    document.getElementById('cuentaNombreDisplay').textContent = nombre;
    document.getElementById('cuentaEmailDisplay').textContent = currentUser?.email || '';
    document.getElementById('cuentaAvatar').textContent = nombre[0].toUpperCase();
    document.getElementById('ajusteNombreUsuario').value = nombre;
  }

  // Restaurar tema y color guardados
  const temaGuardado = localStorage.getItem('tema');
  if (temaGuardado) setTema(temaGuardado);
  const colorGuardado = localStorage.getItem('colorPrimary');
  if (colorGuardado) {
    document.documentElement.style.setProperty('--primary', colorGuardado);
    document.querySelectorAll('.color-dot').forEach(d => {
      d.classList.toggle('active', d.style.background === colorGuardado);
    });
  }

  // Mostrar solo botón borrar (ya tiene negocio)
  document.getElementById('btnDemoWrap').style.display = 'flex';
  document.getElementById('btnAgregarDemo').style.display = 'none';
  document.getElementById('btnBorrarDemo').style.display = 'block';

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

function loadSection(name) {
  switch (name) {
    case 'dashboard': loadDashboard(); break;
    case 'inventario': loadInventario(); break;
    case 'ventas': loadVentas(); break;
    case 'caja': loadCaja(); break;
    case 'empleados': loadEmpleados(); break;
    case 'reportes': cargarReporte(); break;
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

// Tabs de ajustes
function showAjusteTab(tab) {
  document.querySelectorAll('.ajuste-tab').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.ajuste-panel').forEach(p => p.style.display = 'none');
  document.querySelector(`.ajuste-tab[onclick="showAjusteTab('${tab}')"]`).classList.add('active');
  document.getElementById('ajuste-' + tab).style.display = 'block';
}

// Guardar ajustes de negocio
async function guardarAjustes() {
  const nombre = document.getElementById('ajusteNombreNegocio').value;
  const tipo = document.getElementById('ajusteTipo').value;

  const { error } = await db
    .from('negocios')
    .update({ nombre, tipo })
    .eq('owner_id', currentUser.id);

  if (error) { showToast('Error al guardar', 'error'); return; }

  document.getElementById('businessName').textContent = nombre;
  document.getElementById('businessAvatar').textContent = nombre[0].toUpperCase();
  showToast('Negocio actualizado', 'success');
}

// Guardar nombre de cuenta
async function guardarCuenta() {
  const nombre = document.getElementById('ajusteNombreUsuario').value;
  const { error } = await db.auth.updateUser({ data: { name: nombre } });
  if (error) { showToast('Error al guardar', 'error'); return; }
  document.getElementById('headerAvatar').textContent = nombre[0].toUpperCase();
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
function setTema(tema) {
  document.querySelectorAll('.tema-option').forEach(o => o.classList.remove('active'));
  document.getElementById('tema' + tema.charAt(0).toUpperCase() + tema.slice(1)).classList.add('active');
  document.body.setAttribute('data-tema', tema);
  localStorage.setItem('tema', tema);
}

// Color principal
function setColor(color, el) {
  document.querySelectorAll('.color-dot').forEach(d => d.classList.remove('active'));
  el.classList.add('active');
  document.documentElement.style.setProperty('--primary', color);
  localStorage.setItem('colorPrimary', color);
}

// Mostrar Pro
function mostrarPro() {
  showToast('Próximamente disponible', 'success');
}

// Setup primer ingreso
function mostrarSetup() {
  const modal = document.getElementById('modalSetup');
  if (modal) modal.style.display = 'flex';
}

async function completarSetup(e) {
  e.preventDefault();
  const negocioNombre = document.getElementById('setupNegocio').value;
  const tipo = document.getElementById('setupTipo').value;
  const btn = document.getElementById('setupBtn');

  btn.disabled = true;
  btn.innerHTML = '<span>Guardando...</span>';

  const nombre = currentUser.user_metadata?.name || currentUser.user_metadata?.full_name || currentUser.email;

  const { data: negocio, error } = await db.from('negocios').insert({
    nombre: negocioNombre,
    owner_id: currentUser.id,
    tipo: tipo,
    plan: 'gratis'
  }).select().single();

  if (error) {
    btn.disabled = false;
    btn.innerHTML = '<span>Comenzar</span>';
    showToast('Error: ' + error.message, 'error');
    return;
  }

  await db.from('empleados').insert({
    negocio_id: negocio.id,
    user_id: currentUser.id,
    nombre: nombre,
    email: currentUser.email,
    rol: 'admin'
  });

  currentBusiness = negocio;
  document.getElementById('modalSetup').style.display = 'none';
  setupDashboardUI(nombre, negocioNombre, 'admin');
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

  const nombre = currentUser.user_metadata?.name || currentUser.user_metadata?.full_name || currentUser.email;
  document.getElementById('empresaSelectorNombre').textContent = currentBusiness.nombre;
  document.getElementById('empresaSelectorDot').textContent = currentBusiness.nombre[0].toUpperCase();
  document.getElementById('businessName').textContent = currentBusiness.nombre;
  document.getElementById('businessAvatar').textContent = currentBusiness.nombre[0].toUpperCase();

  showSection('dashboard');
  showToast(`Empresa: ${currentBusiness.nombre}`, 'success');
}

// Iniciar al cargar
window.addEventListener('DOMContentLoaded', initDashboard);
