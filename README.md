# ⚽ Álbum Panini FIFA Mundial 2026

Seguimiento interactivo de tu álbum Panini para la Copa del Mundo 2026 (USA · México · Canadá).

🌐 **Demo en vivo:** https://ua-x99.github.io/panini2026/

---

## Características

- 📦 **980 láminas** — 48 selecciones × 20 láminas + intro + historia
- ✅ Marca láminas como **tengo / repetida / vacía** con un solo clic
- 💾 **Guardado automático** en `localStorage` (sin servidor)
- 📋 Exporta tu lista de faltantes (copiar o descargar `.txt`)
- 🔍 Filtro por **grupo** (A–L) y búsqueda por país
- 📱 Responsive — funciona en móvil y escritorio
- 🎨 Tema oscuro FIFA

---

## Cómo usar localmente

```bash
# Clonar
git clone https://github.com/UA-X99/panini2026.git
cd panini2026

# Opción A — con Node.js
npm start

# Opción B — sin Node.js
# Abre index.html directamente en tu navegador
# (Chrome/Edge: arrastra el archivo a la ventana)
```

---

## Estructura

```
panini2026/
├── index.html          # App principal
├── styles.css          # Estilos (tema oscuro)
├── app.js              # Lógica de la app
├── data/
│   └── stickers.js     # Datos de las 48 selecciones (980 láminas)
└── .github/
    └── workflows/
        └── pages.yml   # Deploy automático a GitHub Pages
```

---

## Deploy a GitHub Pages

El workflow `.github/workflows/pages.yml` despliega automáticamente al hacer `push` a `main`.

Para activarlo por primera vez:
1. Ve a tu repo → **Settings** → **Pages**
2. En *Source* selecciona **GitHub Actions**
3. Haz un `push` a `main` — el sitio quedará en `https://ua-x99.github.io/panini2026/`

---

## Datos

Basado en la lista oficial de selecciones clasificadas al **FIFA World Cup 2026**.  
Numeración corregida respecto al álbum original de referencia.
