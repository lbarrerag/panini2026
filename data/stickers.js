// ─── DATOS COMPLETOS — Álbum Panini FIFA World Cup 2026 ──────────────────────
// 980 láminas: 9 intro (FWC 00–8) + 48 selecciones × 20 (9–968) + 11 historia (FWC 9–19)
// + 14 láminas CC promocionales Coca-Cola (no cuentan en el total oficial de 980)
;(function () {

  // ── 48 selecciones (sin nombres de jugadores) ────────────────────────────
  const RAW = [
    // GRUPO A
    { id:'mex', name:'México',               flag:'🇲🇽', conf:'CONCACAF', group:'A' },
    { id:'rsa', name:'Sudáfrica',             flag:'🇿🇦', conf:'CAF',      group:'A' },
    { id:'kor', name:'Corea del Sur',         flag:'🇰🇷', conf:'AFC',      group:'A' },
    { id:'cze', name:'República Checa',       flag:'🇨🇿', conf:'UEFA',     group:'A' },
    // GRUPO B
    { id:'can', name:'Canadá',                flag:'🇨🇦', conf:'CONCACAF', group:'B' },
    { id:'bih', name:'Bosnia y Herzegovina',  flag:'🇧🇦', conf:'UEFA',     group:'B' },
    { id:'qat', name:'Catar',                 flag:'🇶🇦', conf:'AFC',      group:'B' },
    { id:'sui', name:'Suiza',                 flag:'🇨🇭', conf:'UEFA',     group:'B' },
    // GRUPO C
    { id:'bra', name:'Brasil',                flag:'🇧🇷', conf:'CONMEBOL', group:'C' },
    { id:'mar', name:'Marruecos',             flag:'🇲🇦', conf:'CAF',      group:'C' },
    { id:'hai', name:'Haití',                 flag:'🇭🇹', conf:'CONCACAF', group:'C' },
    { id:'sco', name:'Escocia',               flag:'🏴󠁧󠁢󠁳󠁣󠁴󠁿', conf:'UEFA',     group:'C' },
    // GRUPO D
    { id:'usa', name:'Estados Unidos',        flag:'🇺🇸', conf:'CONCACAF', group:'D' },
    { id:'par', name:'Paraguay',              flag:'🇵🇾', conf:'CONMEBOL', group:'D' },
    { id:'aus', name:'Australia',             flag:'🇦🇺', conf:'AFC',      group:'D' },
    { id:'tur', name:'Turquía',               flag:'🇹🇷', conf:'UEFA',     group:'D' },
    // GRUPO E
    { id:'ger', name:'Alemania',              flag:'🇩🇪', conf:'UEFA',     group:'E' },
    { id:'cur', name:'Curazao',               flag:'🇨🇼', conf:'CONCACAF', group:'E' },
    { id:'civ', name:'Costa de Marfil',       flag:'🇨🇮', conf:'CAF',      group:'E' },
    { id:'ecu', name:'Ecuador',               flag:'🇪🇨', conf:'CONMEBOL', group:'E' },
    // GRUPO F
    { id:'ned', name:'Países Bajos',          flag:'🇳🇱', conf:'UEFA',     group:'F' },
    { id:'jpn', name:'Japón',                 flag:'🇯🇵', conf:'AFC',      group:'F' },
    { id:'swe', name:'Suecia',                flag:'🇸🇪', conf:'UEFA',     group:'F' },
    { id:'tun', name:'Túnez',                 flag:'🇹🇳', conf:'CAF',      group:'F' },
    // GRUPO G
    { id:'bel', name:'Bélgica',               flag:'🇧🇪', conf:'UEFA',     group:'G' },
    { id:'egy', name:'Egipto',                flag:'🇪🇬', conf:'CAF',      group:'G' },
    { id:'irn', name:'Irán',                  flag:'🇮🇷', conf:'AFC',      group:'G' },
    { id:'nzl', name:'Nueva Zelanda',         flag:'🇳🇿', conf:'OFC',      group:'G' },
    // GRUPO H
    { id:'esp', name:'España',                flag:'🇪🇸', conf:'UEFA',     group:'H' },
    { id:'cpv', name:'Cabo Verde',            flag:'🇨🇻', conf:'CAF',      group:'H' },
    { id:'ksa', name:'Arabia Saudí',          flag:'🇸🇦', conf:'AFC',      group:'H' },
    { id:'uru', name:'Uruguay',               flag:'🇺🇾', conf:'CONMEBOL', group:'H' },
    // GRUPO I
    { id:'fra', name:'Francia',               flag:'🇫🇷', conf:'UEFA',     group:'I' },
    { id:'sen', name:'Senegal',               flag:'🇸🇳', conf:'CAF',      group:'I' },
    { id:'irq', name:'Irak',                  flag:'🇮🇶', conf:'AFC',      group:'I' },
    { id:'nor', name:'Noruega',               flag:'🇳🇴', conf:'UEFA',     group:'I' },
    // GRUPO J
    { id:'arg', name:'Argentina',             flag:'🇦🇷', conf:'CONMEBOL', group:'J' },
    { id:'alg', name:'Argelia',               flag:'🇩🇿', conf:'CAF',      group:'J' },
    { id:'aut', name:'Austria',               flag:'🇦🇹', conf:'UEFA',     group:'J' },
    { id:'jor', name:'Jordania',              flag:'🇯🇴', conf:'AFC',      group:'J' },
    // GRUPO K
    { id:'por', name:'Portugal',              flag:'🇵🇹', conf:'UEFA',     group:'K' },
    { id:'cod', name:'RD Congo',              flag:'🇨🇩', conf:'CAF',      group:'K' },
    { id:'uzb', name:'Uzbekistán',            flag:'🇺🇿', conf:'AFC',      group:'K' },
    { id:'col', name:'Colombia',              flag:'🇨🇴', conf:'CONMEBOL', group:'K' },
    // GRUPO L
    { id:'eng', name:'Inglaterra',            flag:'🏴󠁧󠁢󠁥󠁮󠁧󠁿', conf:'UEFA',     group:'L' },
    { id:'cro', name:'Croacia',               flag:'🇭🇷', conf:'UEFA',     group:'L' },
    { id:'gha', name:'Ghana',                 flag:'🇬🇭', conf:'CAF',      group:'L' },
    { id:'pan', name:'Panamá',                flag:'🇵🇦', conf:'CONCACAF', group:'L' },
  ]

  // ── Stickers de introducción (FWC 00 – FWC 8) ────────────────────────────
  const INTRO = [
    { num:0, code:'00',     type:'special', label:'Portada Oficial — FIFA World Cup 2026™', special:true  },
    { num:1, code:'FWC 1',  type:'special', label:'Bienvenida al Mundial 2026',              special:true  },
    { num:2, code:'FWC 2',  type:'special', label:'Logo Oficial y Mascota',                  special:true  },
    { num:3, code:'FWC 3',  type:'special', label:'Trofeo Copa del Mundo FIFA™',              special:true  },
    { num:4, code:'FWC 4',  type:'stadium', label:'MetLife Stadium — East Rutherford',        special:false },
    { num:5, code:'FWC 5',  type:'stadium', label:'Estadio Azteca — Ciudad de México',        special:false },
    { num:6, code:'FWC 6',  type:'stadium', label:'Rose Bowl — Los Ángeles',                  special:false },
    { num:7, code:'FWC 7',  type:'stadium', label:'AT&T Stadium — Dallas',                    special:false },
    { num:8, code:'FWC 8',  type:'stadium', label:'Hard Rock Stadium — Miami',                special:false },
  ]

  // ── Stickers de historia (FWC 9 – FWC 19) ───────────────────────────────
  const HISTORY = [
    { num:969, code:'FWC 9',  type:'history', label:'FIFA World Cup History — 1930–1950' },
    { num:970, code:'FWC 10', type:'history', label:'FIFA World Cup History — 1954–1966' },
    { num:971, code:'FWC 11', type:'history', label:'FIFA World Cup History — 1970–1978' },
    { num:972, code:'FWC 12', type:'history', label:'FIFA World Cup History — 1982–1990' },
    { num:973, code:'FWC 13', type:'history', label:'FIFA World Cup History — 1994–1998' },
    { num:974, code:'FWC 14', type:'history', label:'FIFA World Cup History — 2002–2006' },
    { num:975, code:'FWC 15', type:'history', label:'FIFA World Cup History — 2010–2014' },
    { num:976, code:'FWC 16', type:'history', label:'FIFA World Cup History — 2018–2022' },
    { num:977, code:'FWC 17', type:'history', label:'Leyendas del Fútbol Mundial',          special:true  },
    { num:978, code:'FWC 18', type:'history', label:'Balones Históricos del Mundial'        },
    { num:979, code:'FWC 19', type:'history', label:'Sede — USA · Canadá · México 2026'     },
  ]

  // ── Stickers promocionales Coca-Cola × Panini (14, no cuentan en el total de 980) ──
  const COCACOLA = [
    { num:980, code:'CC 1',  type:'special', label:'Lautaro Martínez — Argentina',     special:true },
    { num:981, code:'CC 2',  type:'special', label:'Emiliano Martínez — Argentina',    special:true },
    { num:982, code:'CC 3',  type:'special', label:'Virgil van Dijk — Países Bajos',   special:true },
    { num:983, code:'CC 4',  type:'special', label:'Lamine Yamal — España',            special:true },
    { num:984, code:'CC 5',  type:'special', label:'Federico Valverde — Uruguay',      special:true },
    { num:985, code:'CC 6',  type:'special', label:'Alphonso Davies — Canadá',         special:true },
    { num:986, code:'CC 7',  type:'special', label:'Joshua Kimmich — Alemania',        special:true },
    { num:987, code:'CC 8',  type:'special', label:'Jefferson Lerma — Colombia',       special:true },
    { num:988, code:'CC 9',  type:'special', label:'Raúl Jiménez — México',            special:true },
    { num:989, code:'CC 10', type:'special', label:'Santiago Giménez — México',        special:true },
    { num:990, code:'CC 11', type:'special', label:'Harry Kane — Inglaterra',          special:true },
    { num:991, code:'CC 12', type:'special', label:'Enner Valencia — Ecuador',         special:true },
    { num:992, code:'CC 13', type:'special', label:'Gabriel Magalhães — Brasil',       special:true },
    { num:993, code:'CC 14', type:'special', label:'Joško Gvardiol — Croacia',         special:true },
  ]

  // ── Generar 20 stickers por selección ────────────────────────────────────
  // Estructura real del álbum:
  //   XX 1       = Escudo (foil)
  //   XX 2–12    = Jugadores 1–11
  //   XX 13      = Foto grupal del equipo
  //   XX 14–20   = Jugadores 12–18
  let nextNum = INTRO.length  // empieza en 9
  const COUNTRIES = RAW.map(c => {
    const CC = c.id.toUpperCase()
    const stickers = []

    // XX 1 — Escudo (foil)
    stickers.push({ num: nextNum++, code: `${CC} 1`,  type:'badge',  label:`Escudo — ${c.name}`, special:true  })
    // XX 2–12 — Jugadores 1–11
    for (let p = 2; p <= 12; p++) {
      stickers.push({ num: nextNum++, code: `${CC} ${p}`, type:'player', label:'', special:false })
    }
    // XX 13 — Foto grupal
    stickers.push({ num: nextNum++, code: `${CC} 13`, type:'team',   label:`Foto Grupal — ${c.name}`, special:false })
    // XX 14–20 — Jugadores 12–18
    for (let p = 14; p <= 20; p++) {
      stickers.push({ num: nextNum++, code: `${CC} ${p}`, type:'player', label:'', special:false })
    }

    return { ...c, stickers, start: stickers[0].num, end: stickers[stickers.length - 1].num }
  })

  window.ALBUM = {
    intro:    INTRO,
    countries: COUNTRIES,
    history:  HISTORY,
    cocacola: COCACOLA,
    total: 980,   // álbum oficial: 9 intro + 960 selecciones + 11 historia
  }
})()
