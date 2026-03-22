// ===== AUTENTICACIÓN =====

function togglePwd(inputId, btn) {
  const input = document.getElementById(inputId);
  const eyeOpen = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>`;
  const eyeClosed = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>`;
  if (input.type === 'password') {
    input.type = 'text';
    btn.innerHTML = eyeClosed;
  } else {
    input.type = 'password';
    btn.innerHTML = eyeOpen;
  }
}

// Verificar sesión al cargar
async function checkSession() {
  const { data: { session } } = await db.auth.getSession();

  if (session) {
    if (window.location.pathname.includes('index') || window.location.pathname === '/') {
      window.location.href = 'dashboard.html';
    }
  } else {
    if (window.location.pathname.includes('dashboard')) {
      window.location.href = 'index.html';
    }
  }
}

// Login
async function handleLogin(e) {
  e.preventDefault();
  const email = document.getElementById('loginEmail').value;
  const password = document.getElementById('loginPassword').value;
  const btn = document.getElementById('loginBtn');

  btn.disabled = true;
  btn.innerHTML = '<span>Ingresando...</span>';

  const { data, error } = await db.auth.signInWithPassword({ email, password });

  if (error) {
    showAuthMessage('Correo o contraseña incorrectos', 'error');
    btn.disabled = false;
    btn.innerHTML = '<span>Iniciar Sesión</span>';
    return;
  }

  window.location.href = 'dashboard.html';
}

// Registro
async function handleRegister(e) {
  e.preventDefault();
  const business = document.getElementById('regBusiness').value;
  const name = document.getElementById('regName').value;
  const tipo = document.getElementById('regTipo').value;
  const email = document.getElementById('regEmail').value;
  const password = document.getElementById('regPassword').value;
  const btn = document.getElementById('registerBtn');

  btn.disabled = true;
  btn.innerHTML = '<span>Creando cuenta...</span>';

  const { data, error } = await db.auth.signUp({
    email,
    password,
    options: {
      data: { name, business_name: business, role: 'admin' }
    }
  });

  if (error) {
    showAuthMessage(error.message, 'error');
    btn.disabled = false;
    btn.innerHTML = '<span>Crear Cuenta</span>';
    return;
  }

  if (data.user) {
    const { data: negocio } = await db.from('negocios').insert({
      nombre: business,
      owner_id: data.user.id,
      tipo: tipo,
      plan: 'gratis'
    }).select().single();

    if (negocio) {
      await db.from('empleados').insert({
        negocio_id: negocio.id,
        user_id: data.user.id,
        nombre: name,
        email: email,
        rol: 'admin'
      });
    }

    if (data.session) {
      window.location.href = 'dashboard.html';
    } else {
      showAuthMessage('✉️ Revisa tu correo y confirma tu cuenta para continuar.', 'success');
    }
    btn.disabled = false;
    btn.innerHTML = '<span>Crear Cuenta</span>';
    return;
  }

  showAuthMessage('Cuenta creada. Verifica tu correo.', 'success');
  btn.disabled = false;
  btn.innerHTML = '<span>Crear Cuenta</span>';
}

// Cerrar sesión
async function handleLogout() {
  localStorage.removeItem('empleadoSession');
  await db.auth.signOut();
  window.location.href = 'index.html';
}

// Login con Google
async function handleGoogleLogin() {
  const { error } = await db.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: window.location.origin + '/dashboard.html' }
  });
  if (error) showAuthMessage('Error al conectar con Google', 'error');
}

// Recuperar contraseña
async function showForgot() {
  const email = prompt('Ingresa tu correo para recuperar tu contraseña:');
  if (!email) return;

  const { error } = await db.auth.resetPasswordForEmail(email);
  if (error) {
    alert('Error: ' + error.message);
  } else {
    alert('Te enviamos un correo para restablecer tu contraseña.');
  }
}

// Tabs login/registro
function showTab(tab) {
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.auth-form').forEach(f => f.classList.add('hidden'));

  document.querySelector(`.tab-btn[onclick="showTab('${tab}')"]`).classList.add('active');
  const formMap = { login: 'loginForm', register: 'registerForm', empleado: 'empleadoForm' };
  document.getElementById(formMap[tab])?.classList.remove('hidden');

  hideAuthMessage();
}

function showAuthMessage(msg, type) {
  const el = document.getElementById('authMessage');
  el.textContent = msg;
  el.className = 'auth-message ' + type;
  el.classList.remove('hidden');
}

function hideAuthMessage() {
  document.getElementById('authMessage')?.classList.add('hidden');
}

// Ejecutar al cargar
checkSession();
