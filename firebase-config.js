// ─── Firebase config ──────────────────────────────────────────────────────────
const _fbConfig = {
  apiKey: "AIzaSyAL0zVyjp7gzlPegcgbYa8L_fmKkXQUInQ",
  authDomain: "album-dd4b8.firebaseapp.com",
  projectId: "album-dd4b8",
  storageBucket: "album-dd4b8.firebasestorage.app",
  messagingSenderId: "210870217156",
  appId: "1:210870217156:web:bd0809be8fbf65b89e9c91"
}

try {
  firebase.initializeApp(_fbConfig)
  window.db           = firebase.firestore()
  window.firebaseAuth = firebase.auth()
  // App secundaria: admin crea usuarios sin perder su propia sesión
  window.secondaryApp  = firebase.initializeApp(_fbConfig, 'secondary')
  window.secondaryAuth = window.secondaryApp.auth()
  window.secondaryDb   = window.secondaryApp.firestore()
} catch(e) {
  console.warn('Firebase init error:', e)
}

// ── Crear cuenta admin en el primer uso ───────────────────────────────────────
;(async function ensureAdmin() {
  // Usa la app secundaria para no interferir con onAuthStateChanged de la app principal
  if (!window.secondaryAuth || !window.secondaryDb) return
  if (localStorage.getItem('panini_admin_ok')) return
  try {
    const cred = await window.secondaryAuth.createUserWithEmailAndPassword(
      'mbarrera@panini2026.app', 'Martin.2708'
    )
    await cred.user.updateProfile({ displayName: 'mbarrera' })
    await window.secondaryDb.collection('users').doc(cred.user.uid).set({
      username: 'mbarrera',
      isAdmin: true,
      state: {},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    })
    await window.secondaryAuth.signOut()
    localStorage.setItem('panini_admin_ok', '1')
  } catch(e) {
    if (e.code === 'auth/email-already-in-use') {
      localStorage.setItem('panini_admin_ok', '1')
    }
  }
})()
