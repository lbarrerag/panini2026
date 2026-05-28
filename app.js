// ─── Auth ─────────────────────────────────────────────────────────────────────
const FAKE_DOMAIN  = '@panini2026.app'
let currentUser     = null
let currentUserData = null

function toEmail(u) {
  return u.trim().toLowerCase().replace(/[^a-z0-9._-]/g, '') + FAKE_DOMAIN
}

function setLoginError(msg) {
  const el = document.getElementById('login-error')
  el.textContent = msg
  el.classList.toggle('hidden', !msg)
}

function initLogin() {
  const repParam = new URLSearchParams(location.search).get('rep')
  if (repParam) { showSharedView(repParam); return }

  if (!window.firebaseAuth) { setLoginError('Error de conexión con Firebase'); return }

  // Detecta sesión existente automáticamente
  window.firebaseAuth.onAuthStateChanged(async user => {
    if (user) {
      await loadUserData(user)
      unlockApp(user)
    }
    // Si no hay usuario, el login-overlay ya está visible por defecto
  })

  document.getElementById('login-form').addEventListener('submit', async e => {
    e.preventDefault()
    const username = document.getElementById('login-user').value.trim()
    const password = document.getElementById('login-pass').value
    if (!username || !password) { setLoginError('Completá usuario y contraseña'); return }

    const btn = document.getElementById('login-btn')
    btn.disabled = true; btn.textContent = 'Ingresando…'
    setLoginError('')

    try {
      await window.firebaseAuth.signInWithEmailAndPassword(toEmail(username), password)
      // onAuthStateChanged se encarga del resto
    } catch(err) {
      const msg = ['auth/user-not-found','auth/wrong-password','auth/invalid-credential']
        .includes(err.code) ? 'Usuario o contraseña incorrectos' : 'Error al ingresar. Intentá de nuevo.'
      setLoginError(msg)
      btn.disabled = false; btn.textContent = 'Ingresar'
    }
  })
}

async function loadUserData(user) {
  if (!window.db) return
  try {
    const snap = await window.db.collection('users').doc(user.uid).get()
    if (!snap.exists) {
      // Doc eliminado o usuario nuevo — recrear con datos de Auth
      const uname = user.displayName || user.email.split('@')[0]
      const isAdm  = user.email === 'mbarrera@panini2026.app'
      const docData = {
        username: uname, isAdmin: isAdm, state: {},
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
      try { await window.db.collection('users').doc(user.uid).set(docData) } catch(_) {}
      currentUserData = docData
    } else {
      currentUserData = snap.data()
      // Reparar: si el doc fue sobreescrito por el bug de save() sin merge
      if (!currentUserData.username) {
        const uname = user.displayName || user.email.split('@')[0]
        const isAdm  = user.email === 'mbarrera@panini2026.app'
        const repairs = { username: uname, isAdmin: isAdm }
        try { await window.db.collection('users').doc(user.uid).set(repairs, { merge: true }) } catch(_) {}
        currentUserData = { ...currentUserData, ...repairs }
      }
    }
  } catch(_) { currentUserData = null }
}

function unlockApp(user) {
  currentUser = user
  window.ALBUM_DOC = window.db ? window.db.collection('users').doc(user.uid) : null

  document.getElementById('login-overlay').classList.add('hidden')

  // Nombre en navbar
  const name = currentUserData?.username || user.displayName || 'Usuario'
  const userEl = document.getElementById('navbar-user')
  userEl.textContent = '👤 ' + name
  userEl.classList.remove('hidden')

  // Botones según rol
  document.getElementById('btn-logout').classList.remove('hidden')
  document.getElementById('btn-friends-nav').classList.remove('hidden')
  if (currentUserData?.isAdmin) {
    document.getElementById('btn-admin-nav').classList.remove('hidden')
  }

  initFirebaseSync()
}

// ─── Admin panel ──────────────────────────────────────────────────────────────
let adminUsers   = []
let adminEditUid = null
let adminSearch  = ''
let adminSort    = 'name'

function openAdmin() {
  document.getElementById('modal-admin').classList.remove('hidden')
  document.body.style.overflow = 'hidden'
  switchAdminTab('users')
  loadAdminData()
}

function closeAdmin() {
  document.getElementById('modal-admin').classList.add('hidden')
  document.body.style.overflow = ''
  closeEditUser()
}

function switchAdminTab(tabName) {
  document.querySelectorAll('.atab').forEach(t =>
    t.classList.toggle('active', t.dataset.atab === tabName)
  )
  document.querySelectorAll('.apanel').forEach(p =>
    p.classList.toggle('active', p.id === 'apanel-' + tabName)
  )
  if (tabName === 'dashboard') renderAdminDashboard()
}

async function loadAdminData() {
  const listEl = document.getElementById('admin-users-list')
  if (!listEl) return
  listEl.innerHTML = `<div class="auser-loading">⟳ Cargando usuarios…</div>`

  if (!window.db) {
    listEl.innerHTML = `<div class="auser-error">⚠️ Firebase no disponible. Recargá la página.</div>`
    return
  }

  try {
    const snap = await window.db.collection('users').get()
    adminUsers = []
    snap.forEach(d => adminUsers.push({ uid: d.id, ...d.data() }))
    renderAdminUsers()
    renderAdminDashboard()
  } catch(e) {
    console.error('loadAdminData error:', e)
    listEl.innerHTML = `<div class="auser-error">⚠️ Error al cargar: ${e.message}<br><small>Verificá las reglas de Firestore.</small></div>`
  }
}

function getFilteredAdminUsers() {
  let users = [...adminUsers]
  if (adminSearch) {
    const q = adminSearch.toLowerCase()
    users = users.filter(u => (u.username || '').toLowerCase().includes(q))
  }
  switch (adminSort) {
    case 'name':
      users.sort((a, b) => (a.username || '').localeCompare(b.username || ''))
      break
    case 'progress':
      users.sort((a, b) => {
        const ga = Object.keys(a.state || {}).filter(k => (a.state[k] || 0) >= 1).length
        const gb = Object.keys(b.state || {}).filter(k => (b.state[k] || 0) >= 1).length
        return gb - ga
      })
      break
    case 'date-desc':
      users.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''))
      break
    case 'date-asc':
      users.sort((a, b) => (a.createdAt || '').localeCompare(b.createdAt || ''))
      break
  }
  return users
}

function renderAdminUsers() {
  const listEl  = document.getElementById('admin-users-list')
  const countEl = document.getElementById('admin-user-count')
  const users   = getFilteredAdminUsers()

  if (countEl) countEl.textContent = `${users.length} usuario${users.length !== 1 ? 's' : ''}`

  if (!users.length) {
    listEl.innerHTML = adminSearch
      ? `<div class="auser-empty">Sin resultados para "<em>${adminSearch}</em>"</div>`
      : `<div class="auser-empty">No hay usuarios registrados.</div>`
    return
  }

  listEl.innerHTML = ''
  users.forEach(u => {
    const got  = Object.keys(u.state || {}).filter(k => (u.state[k] || 0) >= 1).length
    const reps = Object.values(u.state || {}).reduce((a, v) => a + Math.max(0, v - 1), 0)
    const pct  = Math.round(got / 980 * 100)
    const date = u.createdAt ? new Date(u.createdAt).toLocaleDateString('es-AR') : '—'
    const initials = (u.username || '?').slice(0, 2).toUpperCase()
    const isMe = u.uid === currentUser?.uid

    const card = document.createElement('div')
    card.className = 'auser-card' + (isMe ? ' auser-card--me' : '')
    card.innerHTML = `
      <div class="auser-avatar" style="background:${adminStrToColor(u.username || '')}">
        ${initials}
      </div>
      <div class="auser-info">
        <div class="auser-top">
          <span class="auser-name">${u.username || '<sin nombre>'}</span>
          ${u.isAdmin ? '<span class="admin-badge">Admin</span>' : ''}
          ${isMe    ? '<span class="admin-badge--me">Tú</span>' : ''}
        </div>
        <div class="auser-prog-wrap">
          <div class="auser-prog-bar">
            <div class="auser-prog-fill" style="width:${pct}%"></div>
          </div>
          <span class="auser-prog-text">${pct}% · ${got} láminas${reps > 0 ? ` · ↻ ${reps}` : ''}</span>
        </div>
        <div class="auser-meta">📅 ${date}</div>
      </div>
      <div class="auser-actions">
        <button class="abtn-edit" data-uid="${u.uid}">✏️ Editar</button>
        ${!isMe ? `<button class="abtn-del" data-uid="${u.uid}" data-name="${u.username || ''}" title="Eliminar">🗑</button>` : ''}
      </div>
    `

    card.querySelector('.abtn-edit').addEventListener('click', () => openEditUser(u.uid))
    const delBtn = card.querySelector('.abtn-del')
    if (delBtn) delBtn.addEventListener('click', () => confirmDeleteUser(u.uid, u.username))

    listEl.appendChild(card)
  })
}

function adminStrToColor(str) {
  let hash = 0
  for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash)
  const h = Math.abs(hash) % 360
  return `hsl(${h},50%,32%)`
}

function renderAdminDashboard() {
  const el = document.getElementById('admin-dashboard')
  if (!el) return
  if (!adminUsers.length) {
    el.innerHTML = '<div class="auser-empty" style="padding:2rem">Abrí primero la pestaña "Usuarios" para cargar datos.</div>'
    return
  }

  const totalGot  = adminUsers.reduce((acc, u) =>
    acc + Object.keys(u.state || {}).filter(k => (u.state[k] || 0) >= 1).length, 0)
  const totalReps = adminUsers.reduce((acc, u) =>
    acc + Object.values(u.state || {}).reduce((a, v) => a + Math.max(0, v - 1), 0), 0)
  const avgPct    = adminUsers.length
    ? Math.round(totalGot / (adminUsers.length * 980) * 100) : 0
  const complete  = typeof ALBUM !== 'undefined'
    ? adminUsers.reduce((acc, u) =>
        acc + ALBUM.countries.filter(c =>
          c.stickers.every(s => (u.state?.[String(s.num)] || 0) >= 1)
        ).length, 0)
    : 0

  const ranked = [...adminUsers].sort((a, b) => {
    const ga = Object.keys(a.state || {}).filter(k => (a.state[k] || 0) >= 1).length
    const gb = Object.keys(b.state || {}).filter(k => (b.state[k] || 0) >= 1).length
    return gb - ga
  })

  el.innerHTML = `
    <div class="adash-boxes">
      <div class="adash-box">
        <div class="adash-num">${adminUsers.length}</div>
        <div class="adash-label">Usuarios</div>
      </div>
      <div class="adash-box">
        <div class="adash-num">${totalGot.toLocaleString()}</div>
        <div class="adash-label">Láminas totales</div>
      </div>
      <div class="adash-box">
        <div class="adash-num">${avgPct}%</div>
        <div class="adash-label">Progreso promedio</div>
      </div>
      <div class="adash-box">
        <div class="adash-num">${totalReps}</div>
        <div class="adash-label">Repetidas totales</div>
      </div>
    </div>

    <p class="asection-title" style="margin-bottom:.65rem">🏆 Ranking de progreso</p>
    <div class="aranking">
      ${ranked.map((u, i) => {
        const got = Object.keys(u.state || {}).filter(k => (u.state[k] || 0) >= 1).length
        const pct = Math.round(got / 980 * 100)
        const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : (i + 1)
        return `
          <div class="arank-row">
            <span class="arank-pos">${medal}</span>
            <span class="arank-name" title="${u.username || '—'}">${u.username || '—'}${u.isAdmin ? ' 🔧' : ''}</span>
            <div class="arank-prog">
              <div class="auser-prog-bar" style="flex:1;max-width:none">
                <div class="auser-prog-fill" style="width:${pct}%"></div>
              </div>
              <span class="arank-pct">${pct}%</span>
            </div>
          </div>
        `
      }).join('')}
    </div>
  `
}

function openEditUser(uid) {
  adminEditUid = uid
  const user = adminUsers.find(u => u.uid === uid)
  if (!user) return

  document.getElementById('aedit-title').textContent   = `✏️ ${user.username || uid}`
  document.getElementById('edit-username').value       = user.username || ''
  document.getElementById('edit-is-admin').checked     = !!user.isAdmin
  document.getElementById('aedit-error').classList.add('hidden')

  const got  = Object.keys(user.state || {}).filter(k => (user.state[k] || 0) >= 1).length
  const reps = Object.values(user.state || {}).reduce((a, v) => a + Math.max(0, v - 1), 0)
  const comp = typeof ALBUM !== 'undefined'
    ? ALBUM.countries.filter(c => c.stickers.every(s => (user.state?.[String(s.num)] || 0) >= 1)).length
    : 0
  const pct  = Math.round(got / 980 * 100)

  const statsEl = document.getElementById('aedit-stats')
  statsEl.innerHTML = `
    <p class="asection-title">📊 Estadísticas del álbum</p>
    <div class="aedit-stat-grid">
      <div class="aedit-stat"><strong>${pct}%</strong><small>Completado</small></div>
      <div class="aedit-stat"><strong>${got}</strong><small>Tiene</small></div>
      <div class="aedit-stat"><strong>${980 - got}</strong><small>Faltan</small></div>
      <div class="aedit-stat"><strong>${reps}</strong><small>Repetidas</small></div>
      <div class="aedit-stat"><strong>${comp}</strong><small>Países 100%</small></div>
    </div>
  `
  statsEl.classList.remove('hidden')

  document.getElementById('btn-delete-from-edit').style.display =
    uid === currentUser?.uid ? 'none' : ''

  document.getElementById('aedit-overlay').classList.remove('hidden')
}

function closeEditUser() {
  adminEditUid = null
  const overlay = document.getElementById('aedit-overlay')
  if (overlay) overlay.classList.add('hidden')
}

async function saveEditUser() {
  const errEl   = document.getElementById('aedit-error')
  const newName = document.getElementById('edit-username').value.trim()
  const isAdm   = document.getElementById('edit-is-admin').checked

  errEl.classList.add('hidden')

  if (!newName || newName.length < 3) {
    errEl.textContent = 'El nombre debe tener al menos 3 caracteres'
    errEl.classList.remove('hidden')
    return
  }
  const dup = adminUsers.find(u => u.uid !== adminEditUid && u.username === newName)
  if (dup) {
    errEl.textContent = `El usuario "${newName}" ya existe`
    errEl.classList.remove('hidden')
    return
  }

  const btn = document.getElementById('btn-save-edit')
  btn.disabled = true; btn.textContent = '⟳ Guardando…'

  try {
    await window.db.collection('users').doc(adminEditUid).set(
      { username: newName, isAdmin: isAdm },
      { merge: true }
    )
    const idx = adminUsers.findIndex(u => u.uid === adminEditUid)
    if (idx !== -1) { adminUsers[idx].username = newName; adminUsers[idx].isAdmin = isAdm }

    if (adminEditUid === currentUser?.uid) {
      currentUserData = { ...currentUserData, username: newName, isAdmin: isAdm }
      document.getElementById('navbar-user').textContent = '👤 ' + newName
      if (!isAdm) document.getElementById('btn-admin-nav').classList.add('hidden')
    }

    closeEditUser()
    renderAdminUsers()
    renderAdminDashboard()
  } catch(e) {
    errEl.textContent = 'Error al guardar: ' + e.message
    errEl.classList.remove('hidden')
  } finally {
    btn.disabled = false; btn.textContent = '💾 Guardar'
  }
}

async function confirmDeleteUser(uid, name) {
  if (!confirm(`¿Eliminar al usuario "${name}"?\n\nSe borrarán todos sus datos del álbum.\nEsta acción no se puede deshacer.`)) return
  try {
    await window.db.collection('users').doc(uid).delete()
    adminUsers = adminUsers.filter(u => u.uid !== uid)
    closeEditUser()
    renderAdminUsers()
    renderAdminDashboard()
  } catch(e) {
    alert('Error al eliminar: ' + e.message)
  }
}

async function createUser(username, password, isAdminUser = false) {
  const errEl = document.getElementById('create-user-error')
  errEl.classList.add('hidden')

  const uname = username.trim()
  if (uname.length < 3)    { errEl.textContent = 'Mínimo 3 caracteres para el usuario';    errEl.classList.remove('hidden'); return }
  if (password.length < 6) { errEl.textContent = 'Mínimo 6 caracteres para la contraseña'; errEl.classList.remove('hidden'); return }
  if (!window.secondaryAuth) { errEl.textContent = 'Error interno: Firebase no disponible'; errEl.classList.remove('hidden'); return }

  if (adminUsers.find(u => u.username === uname)) {
    errEl.textContent = `El usuario "${uname}" ya existe`
    errEl.classList.remove('hidden')
    return
  }

  const btn = document.getElementById('create-user-btn')
  btn.disabled = true; btn.textContent = '⟳ Creando…'

  let uid = null
  try {
    // 1. Crear en Firebase Auth con la app secundaria
    const cred = await window.secondaryAuth.createUserWithEmailAndPassword(toEmail(uname), password)
    uid = cred.user.uid
    await cred.user.updateProfile({ displayName: uname })

    // 2. Crear doc en Firestore
    const db = window.secondaryDb || window.db
    const docData = {
      username: uname,
      isAdmin: isAdminUser,
      state: {},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
    await db.collection('users').doc(uid).set(docData)

    // 3. Cerrar sesión de la app secundaria
    await window.secondaryAuth.signOut()

    // Limpiar formulario
    document.getElementById('new-username').value = ''
    document.getElementById('new-password').value = ''
    document.getElementById('new-is-admin').checked = false
    errEl.classList.add('hidden')

    const okMsg = document.getElementById('create-user-ok')
    if (okMsg) {
      okMsg.textContent = `✅ Usuario "${uname}" creado`
      okMsg.classList.remove('hidden')
      setTimeout(() => okMsg.classList.add('hidden'), 3000)
    }

    // Actualizar caché y vistas
    adminUsers.push({ uid, ...docData })
    renderAdminUsers()
    renderAdminDashboard()
    switchAdminTab('users')

  } catch(e) {
    console.error('createUser error:', e.code, e.message)
    if (uid) { try { await window.secondaryAuth.signOut() } catch(_) {} }
    const msgs = {
      'auth/email-already-in-use': `El usuario "${uname}" ya existe`,
      'auth/invalid-email':        'Nombre de usuario inválido (solo letras, números, puntos y guiones)',
      'auth/weak-password':        'Contraseña muy débil (mínimo 6 caracteres)',
      'permission-denied':         'Sin permisos en Firestore. Verificá las reglas de Firestore.',
    }
    errEl.textContent = msgs[e.code] || `Error (${e.code}): ${e.message}`
    errEl.classList.remove('hidden')
  } finally {
    btn.disabled = false; btn.textContent = '➕ Crear usuario'
  }
}

// ─── Amigos / Comparación en tiempo real ─────────────────────────────────────
let friendsCache  = []
let friendUnsubs  = []

function openFriends() {
  document.getElementById('modal-friends').classList.remove('hidden')
  document.getElementById('friends-comparison').classList.add('hidden')
  document.body.style.overflow = 'hidden'
  loadFriends()
}
function closeFriends() {
  document.getElementById('modal-friends').classList.add('hidden')
  document.body.style.overflow = ''
  friendUnsubs.forEach(fn => fn()); friendUnsubs = []
}

async function loadFriends() {
  const listEl = document.getElementById('friends-list')
  listEl.innerHTML = '<p style="color:var(--muted);font-size:.8rem">Cargando amigos…</p>'
  try {
    const snap = await window.db.collection('users').get()
    friendsCache = []
    snap.forEach(d => { if (d.id !== currentUser?.uid) friendsCache.push({ uid: d.id, ...d.data() }) })
    // Ordenar por nombre en el cliente
    friendsCache.sort((a, b) => (a.username || '').localeCompare(b.username || ''))

    listEl.innerHTML = ''
    if (!friendsCache.length) {
      listEl.innerHTML = '<p class="rep-empty">Todavía no hay otros usuarios.</p>'; return
    }
    friendsCache.forEach(f => {
      const allS = getAllStickers()
      const got  = allS.filter(s => (f.state?.[String(s.num)]||0) >= 1).length
      const pct  = Math.round(got / 980 * 100)
      const myRepsForFriend = allS.filter(s => getS(s.num) >= 2 && !(f.state?.[String(s.num)]||0)).length
      const card = document.createElement('div')
      card.className = 'friend-card'
      card.innerHTML = `
        <div class="friend-info">
          <span class="friend-name">👤 ${f.username}</span>
          <span class="friend-pct">${pct}% · ${got} láminas</span>
          ${myRepsForFriend > 0 ? `<span class="friend-match">🤝 ${myRepsForFriend} coincidencias</span>` : ''}
        </div>
        <button class="btn-yellow friend-cmp-btn" data-uid="${f.uid}">🔍 Comparar</button>
      `
      listEl.appendChild(card)
    })
    listEl.querySelectorAll('.friend-cmp-btn').forEach(btn => {
      btn.addEventListener('click', () => openFriendComparison(btn.dataset.uid))
    })
  } catch(e) {
    listEl.innerHTML = '<p style="color:#f87171;font-size:.8rem">Error al cargar.</p>'
  }
}

function getAllStickers() {
  return [
    ...ALBUM.countries.flatMap(c => c.stickers),
    ...ALBUM.intro, ...ALBUM.history, ...ALBUM.cocacola
  ]
}

function openFriendComparison(friendUid) {
  const cmpEl = document.getElementById('friends-comparison')
  const listEl = document.getElementById('friends-list')

  const renderCmp = (friend) => {
    const allS = getAllStickers()
    const iCanGive    = allS.filter(s => getS(s.num) >= 2 && !(friend.state?.[String(s.num)]||0))
    const friendGives = allS.filter(s => (friend.state?.[String(s.num)]||0) >= 2 && !getS(s.num))

    const groupByCountry = (stickers) => {
      const map = {}
      stickers.forEach(s => {
        const c = ALBUM.countries.find(c => c.stickers.includes(s))
        const k = c ? `${c.flag} ${c.name}` : '⭐ Especiales'
        if (!map[k]) map[k] = []
        map[k].push(s.code)
      })
      return map
    }

    const renderGroup = (stickers, title, emptyMsg, chipClass) => {
      if (!stickers.length) return `<div class="cmp-block"><p class="cmp-block-title">${title}</p><p class="compare-empty">${emptyMsg}</p></div>`
      const groups = groupByCountry(stickers)
      let html = `<div class="cmp-block"><p class="cmp-block-title">${title} <strong>(${stickers.length})</strong></p>`
      Object.entries(groups).forEach(([k,codes]) => {
        html += `<p class="cmp-country-label">${k}</p><div class="compare-chips">`
        codes.forEach(c => { html += `<span class="${chipClass}">${c}</span>` })
        html += `</div>`
      })
      return html + '</div>'
    }

    cmpEl.innerHTML = `
      <div class="cmp-header">
        <strong>Comparando con ${friend.username}</strong>
        <button class="btn-outline" id="back-friends">← Volver</button>
      </div>
      ${renderGroup(iCanGive,    `✅ Mis repetidas que le faltan a ${friend.username}`,  'No tenés repetidas que le falten.', 'cmp-chip')}
      ${renderGroup(friendGives, `🎯 Sus repetidas que te faltan a vos`,                 'No tiene repetidas que te falten.', 'rep-chip')}
    `
    document.getElementById('back-friends').addEventListener('click', () => {
      cmpEl.classList.add('hidden')
      listEl.classList.remove('hidden')
      friendUnsubs.forEach(fn => fn()); friendUnsubs = []
    })
  }

  // Render inicial
  const friend = friendsCache.find(f => f.uid === friendUid) || { uid: friendUid, username: '…', state: {} }
  cmpEl.classList.remove('hidden')
  listEl.classList.add('hidden')
  renderCmp(friend)

  // Listener en tiempo real sobre el amigo
  const unsub = window.db.collection('users').doc(friendUid).onSnapshot(snap => {
    if (!snap.exists) return
    const updated = { uid: friendUid, ...snap.data() }
    const idx = friendsCache.findIndex(f => f.uid === friendUid)
    if (idx !== -1) friendsCache[idx] = updated
    renderCmp(updated)
  })
  friendUnsubs.push(unsub)
}

// ─── Firestore sync ───────────────────────────────────────────────────────────
function setSyncStatus(status) {
  const el = document.getElementById('sync-status')
  if (!el) return
  const map = {
    syncing: { text: '⟳ Sincronizando…', cls: 'sync-syncing' },
    synced:  { text: '✓ Sincronizado',   cls: 'sync-ok'      },
    error:   { text: '✕ Error',          cls: 'sync-error'   },
    offline: { text: '○ Sin conexión',   cls: 'sync-offline' }
  }
  const s = map[status] || map.offline
  el.textContent = s.text
  el.className   = 'sync-status ' + s.cls
}

function initFirebaseSync() {
  if (!window.ALBUM_DOC) return
  setSyncStatus('syncing')

  // 1. Carga estado desde Firestore al abrir la app
  window.ALBUM_DOC.get()
    .then(docSnap => {
      if (docSnap.exists && docSnap.data().state) {
        const remote = docSnap.data().state
        // Usar el estado con más láminas registradas (evita perder datos)
        if (Object.keys(remote).length >= Object.keys(state).length) {
          state = remote
          try { localStorage.setItem(LS_KEY, JSON.stringify(state)) } catch(_) {}
          renderAll()
        }
      }
      setSyncStatus('synced')
      setupFirestoreListener()
    })
    .catch(() => {
      setSyncStatus('offline')
      setupFirestoreListener()
    })
}

function setupFirestoreListener() {
  if (!window.ALBUM_DOC) return
  // Escucha cambios en tiempo real (sincroniza entre dispositivos)
  window.ALBUM_DOC.onSnapshot(docSnap => {
    if (!docSnap.exists) return
    const remote = docSnap.data().state
    if (!remote) return
    // Solo actualiza si hay diferencias (evita loop con nuestros propios guardados)
    if (JSON.stringify(remote) !== JSON.stringify(state)) {
      state = remote
      try { localStorage.setItem(LS_KEY, JSON.stringify(state)) } catch(_) {}
      renderAll()
      setSyncStatus('synced')
    }
  }, () => setSyncStatus('offline'))
}

// ── Vista compartida de repetidas ─────────────────────────────────────────────
function showSharedView(encoded) {
  document.getElementById('login-overlay').classList.add('hidden')
  document.getElementById('shared-view').classList.remove('hidden')
  // Ocultar el resto de la app
  document.querySelector('.navbar') && null  // la shared-view tiene su propio navbar
  document.querySelector('.layout') && document.querySelector('.layout').classList.add('hidden')

  let repData
  try { repData = JSON.parse(atob(encoded)) } catch(_) {
    document.getElementById('shared-grid').innerHTML =
      '<p style="color:#f87171;text-align:center;padding:2rem">Link inválido o expirado.</p>'
    return
  }

  const allStickers = [
    ...ALBUM.countries.flatMap(c => c.stickers),
    ...ALBUM.intro, ...ALBUM.history, ...ALBUM.cocacola
  ]
  const total = Object.values(repData).reduce((a,v) => a + v, 0)
  const unique = Object.keys(repData).length
  document.getElementById('shared-sub').textContent =
    `${unique} tipo${unique!==1?'s':''} de láminas · ${total} copia${total!==1?'s':''} disponibles`

  const grid = document.getElementById('shared-grid')
  grid.innerHTML = ''

  // Agrupar por país
  ALBUM.countries.forEach(c => {
    const reps = c.stickers.filter(s => repData[String(s.num)] > 0)
    if (!reps.length) return
    const total = reps.reduce((a, s) => a + repData[String(s.num)], 0)

    const block = document.createElement('div')
    block.className = 'shared-country-block'
    block.innerHTML = `
      <div class="shared-country-title">
        <span class="flag">${c.flag}</span>
        <span>${c.name}</span>
        <span class="rep-badge">↻ ${total}</span>
      </div>
      <div class="rep-sticker-list">
        ${reps.map(s => {
          const qty = repData[String(s.num)]
          return `<span class="rep-chip">${s.code}${qty > 1 ? ` <strong>×${qty}</strong>` : ''}</span>`
        }).join('')}
      </div>
    `
    grid.appendChild(block)
  })

  // Especiales repetidas
  const specReps = [...ALBUM.intro, ...ALBUM.history, ...ALBUM.cocacola]
    .filter(s => repData[String(s.num)] > 0)
  if (specReps.length) {
    const total = specReps.reduce((a, s) => a + repData[String(s.num)], 0)
    const block = document.createElement('div')
    block.className = 'shared-country-block'
    block.innerHTML = `
      <div class="shared-country-title">
        <span>⭐ Especiales</span>
        <span class="rep-badge">↻ ${total}</span>
      </div>
      <div class="rep-sticker-list">
        ${specReps.map(s => {
          const qty = repData[String(s.num)]
          return `<span class="rep-chip">${s.code}${qty > 1 ? ` <strong>×${qty}</strong>` : ''}</span>`
        }).join('')}
      </div>
    `
    grid.appendChild(block)
  }

  if (!grid.children.length) {
    grid.innerHTML = '<p style="text-align:center;color:var(--muted);padding:3rem">No hay repetidas disponibles aún.</p>'
  }

  // Botón copiar lista
  document.getElementById('btn-copy-shared').addEventListener('click', () => {
    const lines = []
    ALBUM.countries.forEach(c => {
      const reps = c.stickers.filter(s => repData[String(s.num)] > 0)
      if (!reps.length) return
      lines.push(`\n=== ${c.flag} ${c.name} ===`)
      reps.forEach(s => {
        const qty = repData[String(s.num)]
        lines.push(`  ${s.code} · Nº${s.num}${qty > 1 ? ` (×${qty})` : ''}`)
      })
    })
    navigator.clipboard.writeText(lines.join('\n').trim())
      .then(() => alert('✅ Lista copiada al portapapeles'))
      .catch(() => alert('No se pudo copiar.'))
  })
}

// ── Generar link compartible de repetidas ─────────────────────────────────────
function buildShareRepURL() {
  const allStickers = [
    ...ALBUM.countries.flatMap(c => c.stickers),
    ...ALBUM.intro, ...ALBUM.history, ...ALBUM.cocacola
  ]
  const repData = {}
  allStickers.forEach(s => {
    const v = getS(s.num)
    if (v >= 2) repData[String(s.num)] = v - 1
  })
  const encoded = btoa(JSON.stringify(repData))
  const base = location.origin + location.pathname
  return `${base}?rep=${encoded}`
}

initLogin()

// ─── Mi Álbum Panini 2026 ────────────────────────────────────────────────────
const LS_KEY = 'panini2026_v1'

let state = {}
try { state = JSON.parse(localStorage.getItem(LS_KEY) || '{}') } catch (_) { state = {} }
let _fbSaveTimer = null
function save() {
  try { localStorage.setItem(LS_KEY, JSON.stringify(state)) } catch (_) {}
  if (window.ALBUM_DOC) {
    clearTimeout(_fbSaveTimer)
    _fbSaveTimer = setTimeout(() => {
      setSyncStatus('syncing')
      window.ALBUM_DOC.set({ state, updatedAt: new Date().toISOString() }, { merge: true })
        .then(()  => setSyncStatus('synced'))
        .catch(() => setSyncStatus('error'))
    }, 800) // espera 800ms antes de escribir (agrupa cambios rápidos)
  }
}

function getS(n)   { return state[String(n)] || 0 }
function setS(n,v) { if (v===0) delete state[String(n)]; else state[String(n)] = v; save() }
// Click izquierdo = incrementa (0→1→2→3...→20→0)
// Click derecho / doble clic = resetea a 0
function cycleS(n) { const v = getS(n); const nv = v >= 20 ? 0 : v + 1; setS(n,nv); return nv }
function resetS(n) { setS(n,0); return 0 }

// ── Filtros ───────────────────────────────────────────────────────────────────
let activeGroup  = 'ALL'
let activeStatus = 'ALL'
let activeConf   = 'ALL'
let searchText   = ''

// ── Cuenta regresiva ──────────────────────────────────────────────────────────
function updateCountdown() {
  const target = new Date('2026-06-11T20:00:00-06:00').getTime()
  const now    = Date.now()
  const diff   = Math.max(0, target - now)
  const days   = Math.floor(diff / 86400000)
  const hrs    = Math.floor((diff % 86400000) / 3600000)
  const min    = Math.floor((diff % 3600000)  / 60000)
  const sec    = Math.floor((diff % 60000)    / 1000)
  document.getElementById('cd-days').textContent = String(days).padStart(2,'0')
  document.getElementById('cd-hrs').textContent  = String(hrs).padStart(2,'0')
  document.getElementById('cd-min').textContent  = String(min).padStart(2,'0')
  document.getElementById('cd-sec').textContent  = String(sec).padStart(2,'0')
}

// ── Render principal ──────────────────────────────────────────────────────────
function renderAll() { renderSummary(); renderGrid() }

function renderSummary() {
  const all = ALBUM.countries.flatMap(c => c.stickers)
  const specials = [...ALBUM.intro, ...ALBUM.history, ...ALBUM.cocacola]
  const everything = [...all, ...specials]
  let got = 0, rep = 0
  everything.forEach(s => {
    const v = getS(s.num)
    if (v >= 1) got++
    if (v >= 2) rep += (v - 1)   // repetidas = copias extra
  })
  const total   = ALBUM.total
  const missing = total - got
  const pct     = (got/total*100).toFixed(1)

  document.getElementById('cnt-got').textContent   = got
  document.getElementById('cnt-miss').textContent  = missing
  document.getElementById('cnt-miss2').textContent = missing
  document.getElementById('cnt-rep').textContent   = rep
  document.getElementById('pct-num').textContent   = pct
  document.getElementById('prog-bar').style.width  = pct + '%'

  // especiales
  const specGot = specials.filter(s => getS(s.num) >= 1).length
  document.getElementById('spec-info').textContent =
    `00 · FWC 1-19 · CC 1-14 · ${specGot}/${specials.length}`
}

function getCountryStatus(c) {
  const got = c.stickers.filter(s => getS(s.num) >= 1).length
  if (got === 0) return 'empty'
  if (got === c.stickers.length) return 'complete'
  return 'progress'
}

function renderGrid() {
  const grid = document.getElementById('grid')
  grid.innerHTML = ''

  const countries = ALBUM.countries.filter(c => {
    if (activeGroup  !== 'ALL' && c.group !== activeGroup)  return false
    if (activeConf   !== 'ALL' && c.conf  !== activeConf)   return false
    if (activeStatus !== 'ALL' && getCountryStatus(c) !== activeStatus) return false
    if (searchText && !c.name.toLowerCase().includes(searchText.toLowerCase())) return false
    return true
  })

  countries.forEach(c => {
    const got   = c.stickers.filter(s => getS(s.num) >= 1).length
    const rep   = c.stickers.reduce((acc,s) => acc + Math.max(0, getS(s.num)-1), 0)
    const total = c.stickers.length
    const pct   = Math.round(got/total*100)

    const card = document.createElement('div')
    card.className = 'country-card'
    const repBadge = rep > 0
      ? `<span class="rep-badge">↻ ${rep}</span>` : ''
    card.innerHTML = `
      <div class="card-top">
        <span class="flag">${c.flag}</span>
        <div style="min-width:0;flex:1">
          <div class="country-name">${c.name}${repBadge}</div>
          <span class="group-badge gb-${c.group}">G-${c.group}</span>
        </div>
      </div>
      <div class="card-progress">
        <div class="prog-wrap"><div class="prog-fill" style="width:${pct}%"></div></div>
        <div class="card-stats">
          <span>${got}/${total} láminas</span>
          <span class="card-pct">${pct}%</span>
        </div>
      </div>
    `
    card.addEventListener('click', () => openModal(c))
    grid.appendChild(card)
  })

  if (!countries.length) {
    grid.innerHTML = '<p class="empty-msg">No se encontraron selecciones.</p>'
  }
}

// ── Modal país ────────────────────────────────────────────────────────────────
function openModal(country) {
  const modal   = document.getElementById('modal')
  const mgrid   = document.getElementById('modal-grid')
  document.getElementById('modal-title').textContent =
    `${country.flag}  ${country.name}`
  document.getElementById('modal-sub').textContent =
    `Grupo ${country.group} · ${country.conf} · Láminas ${country.start}–${country.end}`
  mgrid.innerHTML = ''

  function refreshCounter() {
    const g   = country.stickers.filter(s => getS(s.num) >= 1).length
    const rep = country.stickers.reduce((acc,s) => acc + Math.max(0, getS(s.num)-1), 0)
    document.getElementById('modal-counter').textContent =
      `${g}/${country.stickers.length}` + (rep > 0 ? `  ·  ↻ ${rep} repetida${rep>1?'s':''}` : '')
  }

  country.stickers.forEach(s => {
    const el = document.createElement('div')
    el.className = 'sticker'
    refreshSticker(el, s)
    el.addEventListener('click', () => {
      const newVal = cycleS(s.num)
      refreshSticker(el,s)
      animateSticker(el, newVal)
      refreshCounter()
      renderAll()
    })
    el.addEventListener('contextmenu', e => {
      e.preventDefault()
      resetS(s.num)
      refreshSticker(el,s)
      refreshCounter()
      renderAll()
    })
    mgrid.appendChild(el)
  })

  refreshCounter()
  modal.classList.remove('hidden')
  document.body.style.overflow = 'hidden'
}

// ── Modal especiales ──────────────────────────────────────────────────────────
function openSpecials() {
  const modal = document.getElementById('modal-spec')
  const mgrid = document.getElementById('modal-spec-grid')
  mgrid.innerHTML = ''

  const all = [...ALBUM.intro, ...ALBUM.history, ...ALBUM.cocacola]
  all.forEach(s => {
    const el = document.createElement('div')
    el.className = 'sticker'
    refreshSticker(el, s)
    el.addEventListener('click', () => {
      const newVal = cycleS(s.num)
      refreshSticker(el,s)
      animateSticker(el, newVal)
      renderSummary()
    })
    el.addEventListener('contextmenu', e => {
      e.preventDefault()
      resetS(s.num)
      refreshSticker(el,s)
      renderSummary()
    })
    mgrid.appendChild(el)
  })

  modal.classList.remove('hidden')
  document.body.style.overflow = 'hidden'
}

function refreshSticker(el, s) {
  const v = getS(s.num)
  const cls = v === 0 ? '' : v === 1 ? ' got' : ' rep'
  el.className = 'sticker' + cls
  const icon = s.type==='badge'?'⭐':s.type==='team'?'📸':s.type==='history'?'🏅':'👤'
  const repBadge = v >= 2
    ? `<div class="st-rep-badge">×${v}</div>` : ''
  const stateLabel = v === 0 ? '○ Falta' : v === 1 ? '✓ Tengo' : `＋${v-1} extra${v-1>1?'s':''}`
  el.innerHTML = `
    ${repBadge}
    <div class="st-num">${s.num}</div>
    <div class="st-code">${s.code}</div>
    <div class="st-icon">${icon}</div>
    <div class="st-label">${s.label}</div>
    <div class="st-state">${stateLabel}</div>
  `
}

function animateSticker(el, newVal) {
  el.classList.remove('stamp-got','stamp-rep')
  void el.offsetWidth
  if (newVal === 1) el.classList.add('stamp-got')
  else if (newVal >= 2) el.classList.add('stamp-rep')
}

function closeModal() {
  document.getElementById('modal').classList.add('hidden')
  document.body.style.overflow = ''
}
function closeSpecials() {
  document.getElementById('modal-spec').classList.add('hidden')
  document.body.style.overflow = ''
}

// ── Exportar ──────────────────────────────────────────────────────────────────
function buildMissingList() {
  const lines = []
  ALBUM.countries.forEach(c => {
    const missing = c.stickers.filter(s => getS(s.num)===0)
    if (missing.length) {
      lines.push(`\n=== ${c.flag} ${c.name} (Grupo ${c.group}) ===`)
      missing.forEach(s => lines.push(`  ${s.code} · Nº${s.num} · ${s.label}`))
    }
  })
  const specMissing = [...ALBUM.intro,...ALBUM.history].filter(s=>getS(s.num)===0)
  if (specMissing.length) {
    lines.push('\n=== ⭐ Especiales ===')
    specMissing.forEach(s => lines.push(`  ${s.code} · Nº${s.num} · ${s.label}`))
  }
  return lines.join('\n').trim()
}

function copyMissing() {
  navigator.clipboard.writeText(buildMissingList())
    .then(()=>alert('✅ Lista copiada al portapapeles'))
    .catch(()=>alert('No se pudo copiar. Usa Descargar TXT.'))
}

function downloadMissing() {
  const blob = new Blob([buildMissingList()],{type:'text/plain;charset=utf-8'})
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = 'faltantes-panini2026.txt'
  a.click()
}

function shareAlbum() {
  const all = ALBUM.countries.flatMap(c=>c.stickers)
  const got = all.filter(s=>getS(s.num)>=1).length
  const pct = (got/ALBUM.total*100).toFixed(1)
  const text = `🏆 Mi Álbum Panini FIFA Mundial 2026\n✅ ${got}/${ALBUM.total} láminas (${pct}%)\n\nhttps://ua-x99.github.io/panini2026/`
  if (navigator.share) navigator.share({text})
  else navigator.clipboard.writeText(text).then(()=>alert('✅ Enlace copiado'))
}

function resetAlbum() {
  if (!confirm('¿Reiniciar el álbum? Se perderá todo el progreso.')) return
  state = {}; save(); renderAll(); closeModal(); closeSpecials()
}

// ── Estadísticas ─────────────────────────────────────────
function openStats() {
  const modal = document.getElementById('modal-stats')

  // Summary boxes
  const allSt = ALBUM.countries.flatMap(c => c.stickers)
  const gotTotal = allSt.filter(s => getS(s.num) >= 1).length
  const repTotal = allSt.reduce((acc,s) => acc + Math.max(0, getS(s.num)-1), 0)
  const complete = ALBUM.countries.filter(c =>
    c.stickers.every(s => getS(s.num) >= 1)
  ).length

  document.getElementById('ss-boxes').innerHTML = `
    <div class="ss-box"><strong>${gotTotal}</strong><small>Láminas tengo</small></div>
    <div class="ss-box"><strong>${repTotal}</strong><small>Repetidas</small></div>
    <div class="ss-box"><strong>${complete}</strong><small>Países completos</small></div>
  `

  // Tabla por país
  const tbody = document.getElementById('stats-tbody')
  tbody.innerHTML = ''
  const sorted = [...ALBUM.countries].sort((a,b) => {
    const pa = a.stickers.filter(s=>getS(s.num)>=1).length / a.stickers.length
    const pb = b.stickers.filter(s=>getS(s.num)>=1).length / b.stickers.length
    return pb - pa
  })
  sorted.forEach(c => {
    const got = c.stickers.filter(s=>getS(s.num)>=1).length
    const rep = c.stickers.reduce((acc,s) => acc + Math.max(0, getS(s.num)-1), 0)
    const pct = Math.round(got/c.stickers.length*100)
    const tr = document.createElement('tr')
    if (got === c.stickers.length) tr.className = 'complete-row'
    tr.innerHTML = `
      <td>${c.flag} ${c.name}</td>
      <td><span class="group-badge gb-${c.group}">G-${c.group}</span></td>
      <td>
        <span class="pct-cell">${pct}%</span>
        <span class="mini-bar-wrap"><span class="mini-bar-fill" style="width:${pct}%"></span></span>
        <span style="font-size:.7rem;color:var(--muted);margin-left:.3rem">${got}/${c.stickers.length}</span>
      </td>
      <td style="color:#fb923c;font-weight:700">${rep > 0 ? `↻ ${rep}` : '—'}</td>
    `
    tbody.appendChild(tr)
  })

  modal.classList.remove('hidden')
  document.body.style.overflow = 'hidden'
}

function closeStats() {
  document.getElementById('modal-stats').classList.add('hidden')
  document.body.style.overflow = ''
}

// ── Repetidas ─────────────────────────────────────────────
function openRepeated() {
  const modal   = document.getElementById('modal-rep')
  const content = document.getElementById('rep-content')
  content.innerHTML = ''

  let totalRep = 0

  ALBUM.countries.forEach(c => {
    const reps = c.stickers.filter(s => getS(s.num) >= 2)
    if (!reps.length) return
    totalRep += reps.reduce((acc,s) => acc + getS(s.num) - 1, 0)
    const block = document.createElement('div')
    block.className = 'rep-country-block'
    const totalCountry = reps.reduce((acc,s) => acc + getS(s.num)-1, 0)
    block.innerHTML = `
      <div class="rep-country-title">
        ${c.flag} ${c.name}
        <span class="rep-badge">↻ ${totalCountry}</span>
      </div>
      <div class="rep-sticker-list">
        ${reps.map(s=>`<span class="rep-chip">${s.code} <strong>×${getS(s.num)}</strong></span>`).join('')}
      </div>
    `
    content.appendChild(block)
  })

  // Especiales repetidas
  const specReps = [...ALBUM.intro,...ALBUM.history,...ALBUM.cocacola].filter(s=>getS(s.num)>=2)
  if (specReps.length) {
    const specTotal = specReps.reduce((acc,s) => acc + getS(s.num)-1, 0)
    totalRep += specTotal
    const block = document.createElement('div')
    block.className = 'rep-country-block'
    block.innerHTML = `
      <div class="rep-country-title">⭐ Especiales <span class="rep-badge">↻ ${specTotal}</span></div>
      <div class="rep-sticker-list">
        ${specReps.map(s=>`<span class="rep-chip">${s.code} <strong>×${getS(s.num)}</strong></span>`).join('')}
      </div>
    `
    content.appendChild(block)
  }

  if (!totalRep) {
    content.innerHTML = '<p class="rep-empty">No tienes láminas repetidas todavía.</p>'
  }

  document.getElementById('rep-total-text').textContent =
    `${totalRep} lámina${totalRep!==1?'s':''} repetida${totalRep!==1?'s':''} en total`

  modal.classList.remove('hidden')
  document.body.style.overflow = 'hidden'
}

function closeRepeated() {
  document.getElementById('modal-rep').classList.add('hidden')
  document.body.style.overflow = ''
}

function buildRepList() {
  const lines = []
  ALBUM.countries.forEach(c => {
    const reps = c.stickers.filter(s=>getS(s.num)===2)
    if (!reps.length) return
    lines.push(`\n=== ${c.flag} ${c.name} (${reps.length} repetidas) ===`)
    reps.forEach(s => lines.push(`  ${s.code} · Nº${s.num} · ${s.label}`))
  })
  return lines.join('\n').trim()
}

// ── Comparar con amigos ───────────────────────────────────
function openCompare() {
  const modal = document.getElementById('modal-cmp')
  renderMyCode()
  modal.classList.remove('hidden')
  document.body.style.overflow = 'hidden'
}

function closeCompare() {
  document.getElementById('modal-cmp').classList.add('hidden')
  document.body.style.overflow = ''
  document.getElementById('compare-result').classList.add('hidden')
  document.getElementById('friend-code-input').value = ''
}

function renderMyCode() {
  try {
    const code = btoa(JSON.stringify(state))
    document.getElementById('my-code-box').textContent = code
  } catch(_) {
    document.getElementById('my-code-box').textContent = '(Error al generar código)'
  }
}

function runCompare() {
  const input = document.getElementById('friend-code-input').value.trim()
  const resultEl = document.getElementById('compare-result')
  if (!input) { alert('Pega el código de tu amigo primero.'); return }

  let friendState
  try { friendState = JSON.parse(atob(input)) }
  catch(_) { alert('Código inválido. Pide a tu amigo que lo copie de nuevo.'); return }

  // Mis repetidas que a mi amigo le faltan (v=0 en su estado)
  const allStickers = [
    ...ALBUM.countries.flatMap(c=>c.stickers),
    ...ALBUM.intro, ...ALBUM.history, ...ALBUM.cocacola
  ]
  const matches = allStickers.filter(s =>
    getS(s.num) === 2 && (friendState[String(s.num)] || 0) === 0
  )

  resultEl.classList.remove('hidden')
  if (!matches.length) {
    resultEl.innerHTML = `
      <h4>Resultado</h4>
      <p class="compare-empty">Tu amigo ya tiene todas las láminas que tú tienes repetidas, o no te faltan coincidencias.</p>
    `
    return
  }

  // Agrupar por país
  const byCountry = {}
  matches.forEach(s => {
    const country = ALBUM.countries.find(c=>c.stickers.includes(s))
    const key = country ? `${country.flag} ${country.name}` : '⭐ Especiales'
    if (!byCountry[key]) byCountry[key] = []
    byCountry[key].push(s)
  })

  let html = `<h4>✅ ${matches.length} lámina${matches.length!==1?'s':''} tuyas que le faltan a tu amigo:</h4>`
  Object.entries(byCountry).forEach(([k,stickers]) => {
    html += `<p style="font-size:.75rem;color:var(--muted);margin:.5rem 0 .25rem"><strong style="color:var(--fg)">${k}</strong></p>`
    html += `<div class="compare-chips">`
    stickers.forEach(s => { html += `<span class="cmp-chip">${s.code}</span>` })
    html += `</div>`
  })
  resultEl.innerHTML = html
}

// ── Nav grupos ────────────────────────────────────────────────────────────────
function buildGroupNav() {
  const nav = document.getElementById('group-nav')
  const groups = ['ALL','A','B','C','D','E','F','G','H','I','J','K','L']
  groups.forEach(g => {
    const btn = document.createElement('button')
    btn.textContent = g==='ALL'?'Todos':'G-'+g
    btn.className = 'nav-btn'+(g===activeGroup?' active':'')
    btn.addEventListener('click', () => {
      activeGroup = g
      document.querySelectorAll('.nav-btn').forEach(b=>b.classList.remove('active'))
      btn.classList.add('active')
      renderGrid()
    })
    nav.appendChild(btn)
  })
}

// ── Init ──────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  buildGroupNav()
  renderAll()
  updateCountdown()
  setInterval(updateCountdown, 1000)

  document.getElementById('search').addEventListener('input', e => {
    searchText = e.target.value; renderGrid()
  })
  document.getElementById('filter-conf').addEventListener('change', e => {
    activeConf = e.target.value; renderGrid()
  })
  document.querySelectorAll('.fs-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      activeStatus = btn.dataset.status
      document.querySelectorAll('.fs-btn').forEach(b=>b.classList.remove('active'))
      btn.classList.add('active')
      renderGrid()
    })
  })

  document.getElementById('modal').addEventListener('click', e => {
    if (e.target===document.getElementById('modal')) closeModal()
  })
  document.getElementById('modal-spec').addEventListener('click', e => {
    if (e.target===document.getElementById('modal-spec')) closeSpecials()
  })
  document.getElementById('modal-close').addEventListener('click', closeModal)
  document.getElementById('modal-spec-close').addEventListener('click', closeSpecials)
  document.getElementById('btn-copy').addEventListener('click', copyMissing)
  document.getElementById('btn-dl').addEventListener('click', downloadMissing)
  document.getElementById('btn-share').addEventListener('click', shareAlbum)
  document.getElementById('btn-specials').addEventListener('click', openSpecials)

  // Estadísticas
  document.getElementById('btn-stats').addEventListener('click', openStats)
  document.getElementById('modal-stats-close').addEventListener('click', closeStats)
  document.getElementById('modal-stats').addEventListener('click', e => {
    if (e.target === document.getElementById('modal-stats')) closeStats()
  })

  // Repetidas
  document.getElementById('btn-repeated').addEventListener('click', openRepeated)
  document.getElementById('modal-rep-close').addEventListener('click', closeRepeated)
  document.getElementById('modal-rep').addEventListener('click', e => {
    if (e.target === document.getElementById('modal-rep')) closeRepeated()
  })
  document.getElementById('btn-copy-rep').addEventListener('click', () => {
    navigator.clipboard.writeText(buildRepList())
      .then(() => alert('✅ Lista de repetidas copiada'))
      .catch(() => alert('No se pudo copiar.'))
  })

  document.getElementById('btn-share-rep').addEventListener('click', () => {
    const url = buildShareRepURL()
    navigator.clipboard.writeText(url)
      .then(() => alert('✅ Link copiado al portapapeles\n\nTus amigos pueden abrirlo sin necesidad de contraseña.'))
      .catch(() => prompt('Copiá este link:', url))
  })

  // Comparar (legacy)
  document.getElementById('btn-compare').addEventListener('click', openFriends)
  document.getElementById('modal-cmp-close').addEventListener('click', closeCompare)
  document.getElementById('modal-cmp').addEventListener('click', e => {
    if (e.target === document.getElementById('modal-cmp')) closeCompare()
  })
  document.querySelectorAll('.modal-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.modal-tab').forEach(t=>t.classList.remove('active'))
      document.querySelectorAll('.tab-panel').forEach(p=>p.classList.remove('active'))
      tab.classList.add('active')
      document.getElementById('tab-'+tab.dataset.tab).classList.add('active')
    })
  })
  document.getElementById('btn-copy-code').addEventListener('click', () => {
    const code = document.getElementById('my-code-box').textContent
    navigator.clipboard.writeText(code)
      .then(() => alert('✅ Código copiado'))
      .catch(() => alert('No se pudo copiar.'))
  })
  document.getElementById('btn-regen-code').addEventListener('click', renderMyCode)
  document.getElementById('btn-compare-run').addEventListener('click', runCompare)

  // Amigos
  document.getElementById('btn-friends-nav').addEventListener('click', openFriends)
  document.getElementById('modal-friends-close').addEventListener('click', closeFriends)
  document.getElementById('modal-friends').addEventListener('click', e => {
    if (e.target === document.getElementById('modal-friends')) closeFriends()
  })

  // Admin
  document.getElementById('btn-admin-nav').addEventListener('click', openAdmin)
  document.getElementById('modal-admin-close').addEventListener('click', closeAdmin)
  document.getElementById('modal-admin').addEventListener('click', e => {
    if (e.target === document.getElementById('modal-admin')) closeAdmin()
  })
  document.getElementById('create-user-form').addEventListener('submit', e => {
    e.preventDefault()
    createUser(
      document.getElementById('new-username').value.trim(),
      document.getElementById('new-password').value,
      document.getElementById('new-is-admin').checked
    )
  })
  document.getElementById('btn-refresh-users').addEventListener('click', loadAdminData)
  // Tabs admin
  document.querySelectorAll('.atab').forEach(tab => {
    tab.addEventListener('click', () => switchAdminTab(tab.dataset.atab))
  })
  // Búsqueda y ordenamiento
  document.getElementById('admin-search').addEventListener('input', e => {
    adminSearch = e.target.value; renderAdminUsers()
  })
  document.getElementById('admin-sort').addEventListener('change', e => {
    adminSort = e.target.value; renderAdminUsers()
  })
  // Panel de edición
  document.getElementById('btn-save-edit').addEventListener('click', saveEditUser)
  document.getElementById('btn-cancel-edit').addEventListener('click', closeEditUser)
  document.getElementById('aedit-close').addEventListener('click', closeEditUser)
  document.getElementById('btn-delete-from-edit').addEventListener('click', () => {
    const user = adminUsers.find(u => u.uid === adminEditUid)
    if (user) confirmDeleteUser(user.uid, user.username)
  })

  // Logout
  document.getElementById('btn-logout').addEventListener('click', async () => {
    if (!confirm('¿Cerrar sesión?')) return
    await window.firebaseAuth.signOut()
    currentUser = null; currentUserData = null
    document.getElementById('navbar-user').classList.add('hidden')
    document.getElementById('btn-logout').classList.add('hidden')
    document.getElementById('btn-friends-nav').classList.add('hidden')
    document.getElementById('btn-admin-nav').classList.add('hidden')
    document.getElementById('sync-status').textContent = ''
    document.getElementById('login-overlay').classList.remove('hidden')
    document.getElementById('login-user').value = ''
    document.getElementById('login-pass').value = ''
    document.getElementById('login-btn').disabled = false
    document.getElementById('login-btn').textContent = 'Ingresar'
    setLoginError('')
  })
})

// ─── Service Worker (PWA) ─────────────────────────────────────────────────────
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/panini2026/sw.js')
      .catch(err => console.warn('SW registration failed:', err))
  })
}
