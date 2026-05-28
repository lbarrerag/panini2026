// ─── Login ────────────────────────────────────────────────────────────────────
const PASS_HASH = 'c7768f676c276b2234b19185e5919c9db1d9b905968af5536dcd16a5db9f3910'
const AUTH_KEY  = 'panini2026_auth'

async function sha256(text) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2,'0')).join('')
}

async function initLogin() {
  // Si hay un link compartido de repetidas, saltear login y mostrar vista compartida
  const repParam = new URLSearchParams(location.search).get('rep')
  if (repParam) { showSharedView(repParam); return }

  if (sessionStorage.getItem(AUTH_KEY) === '1') { unlockApp(); return }
  document.getElementById('login-form').addEventListener('submit', async e => {
    e.preventDefault()
    const hash = await sha256(document.getElementById('login-pass').value)
    if (hash === PASS_HASH) {
      sessionStorage.setItem(AUTH_KEY, '1')
      unlockApp()
    } else {
      document.getElementById('login-error').classList.remove('hidden')
      document.getElementById('login-pass').value = ''
      document.getElementById('login-pass').focus()
    }
  })
}

function unlockApp() {
  document.getElementById('login-overlay').classList.add('hidden')
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
function save() { try { localStorage.setItem(LS_KEY, JSON.stringify(state)) } catch (_) {} }

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
  document.getElementById('btn-reset').addEventListener('click', resetAlbum)
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

  // Comparar
  document.getElementById('btn-compare').addEventListener('click', openCompare)
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
})

// ─── Service Worker (PWA) ─────────────────────────────────────────────────────
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/panini2026/sw.js')
      .catch(err => console.warn('SW registration failed:', err))
  })
}
