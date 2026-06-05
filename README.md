# ⚽ Álbum Panini FIFA Mundial 2026

Seguimiento interactivo de tu álbum Panini para la Copa del Mundo 2026 (USA · México · Canadá).

🌐 **App en vivo:** https://lbarrerag.github.io/panini2026/

---

## Características

- 📦 **980 láminas oficiales** — 48 selecciones × 20 + intro + historia + 14 Coca-Cola (bonus)
- ✅ Marca láminas como **tengo / repetida / vacía** con un solo clic
- 🔄 **Sincronización en la nube** via Firebase Firestore (multi-dispositivo)
- 👥 **Multi-usuario** — cada uno tiene su propio álbum con login
- ⚙️ **Panel de administración** — crear, editar y eliminar usuarios
- 📊 **Estadísticas detalladas** por selección + ranking de amigos
- 🔗 **Link compartible** de repetidas disponibles (sin necesidad de login)
- 📋 Exporta tu lista de faltantes (copiar o descargar `.txt`)
- 🔍 Filtros por grupo (A–L), conferencia y búsqueda por país
- 📱 **PWA** — instalable en móvil y escritorio, funciona offline
- 🎨 Tema oscuro FIFA

---

## Estructura del álbum

| Sección | Stickers | Numeración |
|---|---|---|
| Introducción | 9 | `00`, `FWC1`–`FWC8` |
| 48 selecciones × 20 | 960 | `XXX1`–`XXX20` por país |
| Historia | 11 | `FWC9`–`FWC19` |
| **Total oficial** | **980** | |
| Coca-Cola (bonus) | 14 | `CC1`–`CC14` |

Dentro de cada selección:
- `XXX 1` — Escudo (foil)
- `XXX 2–12` — Jugadores 1–11
- `XXX 13` — Foto grupal del equipo
- `XXX 14–20` — Jugadores 12–18

---

## Cómo usar localmente

```bash
# Clonar
git clone https://github.com/lbarrerag/panini2026.git
cd panini2026

# Abrir directamente en el navegador (Chrome/Edge)
# Arrastra index.html a la ventana del navegador
```

> Requiere conexión a internet para la sincronización Firebase.

---

## Estructura de archivos

```
panini2026/
├── index.html              # App principal
├── styles.css              # Estilos (tema oscuro)
├── app.js                  # Lógica de la app
├── firebase-config.js      # Configuración Firebase
├── manifest.json           # PWA manifest
├── sw.js                   # Service Worker (caché offline)
├── data/
│   └── stickers.js         # Datos de las 48 selecciones (980 láminas)
└── .github/
    └── workflows/
        └── pages.yml       # Deploy automático a GitHub Pages
```

---

## Deploy

El workflow `.github/workflows/pages.yml` despliega automáticamente al hacer `push` a `main`.

Sitio publicado en: **https://lbarrerag.github.io/panini2026/**

---

## Datos

Basado en la lista oficial de clasificados al **FIFA World Cup 2026**.  
Estructura verificada contra el álbum físico Panini vendido en Chile.
