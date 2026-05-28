// ─── Firebase / Firestore sync ────────────────────────────────────────────────
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
  window.db       = firebase.firestore()
  window.ALBUM_DOC = window.db.collection('albums').doc('martin')
} catch(e) {
  console.warn('Firebase init error:', e)
}
