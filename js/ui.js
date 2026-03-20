// ===== UI GENERAL =====

let currentUser = null;
let currentBusiness = null;
let currentSection = 'dashboard';

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

  // Cargar rol del usuario (empleados incluye al admin)
  const { data: empleado } = await db
    .from('empleados')
    .select('*, negocios(*)')
    .eq('user_id', currentUser.id)
    .single();

  const rol = empleado?.rol || 'empleado';

  // El negocio viene del empleado (funciona para admin y empleados)
  if (empleado?.negocios) {
    currentBusiness = empleado.negocios;
    APP_CONFIG.moneda = currentBusiness.moneda || 'S/';
    APP_CONFIG.stockMinimo = currentBusiness.stock_minimo || 5;
  } else {
    // Fallback: buscar por owner
    const { data: negocio } = await db
      .from('negocios')
      .select('*')
      .eq('owner_id', currentUser.id)
      .single();
    if (negocio) {
      currentBusiness = negocio;
      APP_CONFIG.moneda = negocio.moneda || 'S/';
      APP_CONFIG.stockMinimo = negocio.stock_minimo || 5;
    }
  }
  const nombre = currentUser.user_metadata?.name || currentUser.email;
  const negocioNombre = currentBusiness?.nombre || 'Mi Negocio';

  setupDashboardUI(nombre, negocioNombre, rol);
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

  // Configurar ajustes
  if (document.getElementById('ajusteNombreNegocio')) {
    document.getElementById('ajusteNombreNegocio').value = negocioNombre;
    document.getElementById('ajusteStockMinimo').value = APP_CONFIG.stockMinimo;
  }

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

// Guardar ajustes
async function guardarAjustes() {
  const nombre = document.getElementById('ajusteNombreNegocio').value;
  const moneda = document.getElementById('ajusteMoneda').value;
  const stockMin = document.getElementById('ajusteStockMinimo').value;

  const { error } = await db
    .from('negocios')
    .update({ nombre, moneda, stock_minimo: parseInt(stockMin) })
    .eq('owner_id', currentUser.id);

  if (error) {
    showToast('Error al guardar', 'error');
    return;
  }

  APP_CONFIG.moneda = moneda;
  APP_CONFIG.stockMinimo = parseInt(stockMin);
  document.getElementById('businessName').textContent = nombre;
  showToast('Ajustes guardados', 'success');
}

// Iniciar al cargar
window.addEventListener('DOMContentLoaded', initDashboard);
