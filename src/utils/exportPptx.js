import PptxGenJS from 'pptxgenjs'

// ── Coordinate system ──────────────────────────────────────────────────────
// Source slide: 1280 × 720 px  →  PPTX: 10" × 5.625"  (same 16:9 ratio)
const PX = 10 / 1280
const px = (n) => +(n * PX).toFixed(4)   // pixels → inches
const pt = (n) => +(n * 72 / 96).toFixed(1) // CSS px → typographic pt

// SlideTemplate layout constants (mirrored from SlideTemplate.jsx)
const PAD  = 50
const R_W  = 280
const GAP  = 28
const L_W  = 1280 - 2 * PAD - GAP - R_W  // 872 px
const R_X  = PAD + L_W + GAP              // 950 px

// Colors — hex without '#' (pptxgenjs convention)
const COL = {
  navy:   '112d80',
  navy2:  '1f3fa3',
  orange: 'f08a2a',
  lav:    'eef0fb',
  cream:  'fdf6ec',
  line:   'c9cfe6',
  lbl:    '9aa0b8',
  white:  'FFFFFF',
  bg:     'FAFAF8',
  divider:'E0E4F0',
}

// ── Primitives ─────────────────────────────────────────────────────────────

// Filled rectangle (via addText with empty string — 100% pptxgenjs compatible)
function rect(s, x, y, w, h, fill, { lineColor, lineW = 1 } = {}) {
  s.addText('', {
    x: px(x), y: px(y), w: px(w), h: px(h),
    fill: { color: fill },
    line: lineColor
      ? { color: lineColor, width: lineW }
      : { width: 0, color: fill },
  })
}

// Text box
function txt(s, text, x, y, w, h, opts = {}) {
  if (!text) return
  const {
    color = COL.navy2,
    size  = 10,
    bold  = false,
    italic = false,
    align = 'left',
    valign = 'middle',
    wrap = true,
    fill,
    lineColor,
    charSpacing,
  } = opts
  s.addText(String(text), {
    x: px(x), y: px(y), w: px(w), h: px(h),
    color,
    fontSize: size,
    fontFace: 'Arial',
    bold,
    italic,
    align,
    valign,
    wrap,
    ...(fill      ? { fill: { color: fill } }      : {}),
    ...(lineColor ? { line: { color: lineColor, width: 1 } } : { line: { width: 0, color: fill || COL.white } }),
    ...(charSpacing !== undefined ? { charSpacing } : {}),
  })
}

// Multi-part text (spans with different styles)
function spans(s, parts, x, y, w, h, opts = {}) {
  const { size = 10, valign = 'middle', align = 'left', wrap = true } = opts
  s.addText(parts, {
    x: px(x), y: px(y), w: px(w), h: px(h),
    fontFace: 'Arial',
    fontSize: size,
    valign,
    align,
    wrap,
    line: { width: 0, color: COL.white },
  })
}

// Bullet line (▪ dot + text, two spans)
function bullet(s, text, x, y, w, h, { dotColor = COL.orange, textColor = COL.navy2, size = 10, bold = false } = {}) {
  if (!text?.trim()) return
  spans(s,
    [
      { text: '▪  ', options: { color: dotColor, bold: true, fontSize: size } },
      { text: text.trim(), options: { color: textColor, bold, fontSize: size } },
    ],
    x, y, w, h,
    { size, valign: 'top', wrap: true },
  )
}

// Boxed section: border + floating label tab
function section(s, label, x, y, w, h, { centered = false, orange = false } = {}) {
  const tabFill = orange ? COL.orange : COL.navy
  const tabW    = Math.min(label.length * 8 + 36, w - 24)
  const tabX    = centered ? x + w / 2 - tabW / 2 : x + 16
  const bodyY   = y + 14

  // Section border
  rect(s, x, bodyY, w, h - 14, COL.bg, { lineColor: COL.line, lineW: 1.2 })

  // Tab background + label
  txt(s, label, tabX, y + 1, tabW, 24, {
    color:  COL.white,
    size:   10,
    bold:   true,
    align:  'center',
    valign: 'middle',
    fill:   tabFill,
  })
}

// Fetch remote image → base64 data URL
async function toBase64(url) {
  try {
    const res  = await fetch(url)
    const blob = await res.blob()
    return await new Promise((resolve, reject) => {
      const r   = new FileReader()
      r.onload  = () => resolve(r.result)
      r.onerror = reject
      r.readAsDataURL(blob)
    })
  } catch { return null }
}

// ── Slide builder ──────────────────────────────────────────────────────────

async function buildSlide(pptx, data) {
  const s = pptx.addSlide()
  s.background = { color: 'FFFFFF' }

  const {
    titre = '', sous_titre = '',
    contexte = [], tags = [], perimetre = [], enjeux = [], impact = [],
    metrique_1_chiffre = '', metrique_1_label   = '',
    metrique_2_chiffre = '', metrique_2_label   = '',
    metrique_3_chiffre = '', metrique_3_label   = '',
    logo_url = '',
  } = data

  const ctx  = [0,1,2].map(i => contexte?.[i]?.trim()  || '')
  const tgs  = [0,1,2,3].map(i => tags?.[i]?.trim()    || '').filter(Boolean)
  const per  = [0,1,2].map(i => perimetre?.[i]?.trim() || '')
  const enj  = [0,1,2].map(i => enjeux?.[i]?.trim()    || '')
  const imp  = [0,1,2].map(i => impact?.[i]?.trim()    || '')
  const mC   = [metrique_1_chiffre, metrique_2_chiffre, metrique_3_chiffre].map(v => v?.trim() || '')
  const mL   = [metrique_1_label,   metrique_2_label,   metrique_3_label  ].map(v => v?.trim() || '')

  // ── HEADER (100 px) ────────────────────────────────────────────────────
  rect(s, 0,   0, 1280, 100, COL.navy)   // navy band
  rect(s, 0,   0,    6, 100, COL.orange) // orange left accent

  // Title: white text + orange dot, same text box
  spans(s,
    [
      { text: titre?.trim() || 'Sans titre', options: { color: COL.white, fontSize: 28 } },
      { text: '.', options: { color: COL.orange, fontSize: 28 } },
    ],
    PAD, 0, 1185, 100,
    { size: 28, valign: 'middle' },
  )

  // ── FOOTER (67 px) ─────────────────────────────────────────────────────
  const footerY = 720 - 67
  rect(s, 0, footerY, 1280, 67, COL.navy)
  rect(s, 0, footerY,    6, 67, COL.orange)

  // ── CONTENT AREA STARTS at y = 104 ────────────────────────────────────
  const startY = 104

  // Horizontal divider under header
  rect(s, PAD, startY, L_W + GAP + R_W, 1, COL.divider)

  // Vertical divider between columns
  rect(s, R_X - 14, startY + 4, 1, footerY - startY - 8, COL.divider)

  // ── SOUS-TITRE (y=108, h=44) ───────────────────────────────────────────
  if (sous_titre?.trim()) {
    txt(s, sous_titre.trim(), PAD, 108, L_W, 44, {
      color: COL.navy2, size: 16, bold: true, valign: 'middle',
    })
  }

  // ── CONTEXTE BLOCK (lavender, y=162, h=104) ────────────────────────────
  const ctxLines = ctx.filter(Boolean)
  if (ctxLines.length) {
    rect(s, PAD, 162, L_W, 104, COL.lav)
    ctxLines.forEach((line, i) =>
      bullet(s, line, PAD + 12, 166 + i * 32, L_W - 22, 30,
        { dotColor: COL.navy2, textColor: COL.navy2, size: 10 })
    )
  }

  // ── TAGS (y=278, h=30) ─────────────────────────────────────────────────
  let tagX = PAD
  tgs.forEach(tag => {
    const tw = Math.min(tag.length * 7.5 + 28, 190)
    rect(s, tagX, 278, tw, 27, COL.lav)
    txt(s, tag, tagX, 278, tw, 27, {
      color: COL.navy2, size: 9, bold: true, align: 'center', valign: 'middle',
    })
    tagX += tw + 8
  })

  // ── PÉRIMÈTRE (boxed, y=318, h=146) ───────────────────────────────────
  section(s, 'Périmètre', PAD, 318, L_W, 146)
  per.forEach((line, i) =>
    bullet(s, line, PAD + 18, 348 + i * 37, L_W - 36, 34, { size: 10 })
  )

  // ── ENJEUX (boxed, y=476, h=182) ──────────────────────────────────────
  section(s, 'Les enjeux clés', PAD, 476, L_W, 182)
  enj.forEach((line, i) =>
    bullet(s, line, PAD + 18, 506 + i * 48, L_W - 36, 44, { size: 10 })
  )

  // ── RIGHT COLUMN ──────────────────────────────────────────────────────

  // Logo zone (y=108, h=130)
  if (logo_url) {
    const logoData = await toBase64(logo_url)
    if (logoData) {
      s.addImage({
        x: px(R_X + 10), y: px(112),
        w: px(R_W - 20), h: px(122),
        data: logoData,
        sizing: { type: 'contain', w: px(R_W - 20), h: px(122) },
      })
    }
  } else {
    rect(s, R_X, 112, R_W, 122, 'F3F4FA', { lineColor: COL.line, lineW: 1 })
    txt(s, 'Logo client', R_X, 112, R_W, 122, { color: COL.lbl, size: 9, align: 'center' })
  }

  // Divider under logo
  rect(s, R_X, 238, R_W, 1, COL.divider)

  // ── NOTRE IMPACT (boxed, centered orange tab, y=244, h=182) ───────────
  section(s, 'Notre impact', R_X, 244, R_W, 182, { centered: true, orange: true })
  imp.forEach((line, i) =>
    bullet(s, line, R_X + 10, 274 + i * 48, R_W - 20, 44,
      { size: 9.5, bold: true })
  )

  // ── MÉTRIQUES (3 cards, starts at y=436) ──────────────────────────────
  txt(s, 'Métriques clés', R_X, 430, R_W, 16, {
    color: COL.lbl, size: 8, bold: true, align: 'center', charSpacing: 0.5,
  })

  const CARD_H = 42
  ;[0, 1, 2].forEach(i => {
    if (!mC[i] && !mL[i]) return
    const cy = 450 + i * (CARD_H + 5)

    rect(s, R_X,     cy, R_W,  CARD_H, COL.cream)  // card background
    rect(s, R_X,     cy,   3,  CARD_H, COL.orange)  // orange left accent

    // Chiffre (big, orange, italic)
    if (mC[i]) {
      txt(s, mC[i], R_X + 10, cy, 94, CARD_H, {
        color: COL.orange, size: pt(26), bold: true, italic: true,
      })
    }
    // Label (small, muted, italic)
    if (mL[i]) {
      txt(s, mL[i], R_X + 108, cy, R_W - 118, CARD_H, {
        color: COL.lbl, size: 9, italic: true, wrap: true,
      })
    }
  })
}

// ── Public API ─────────────────────────────────────────────────────────────

export async function buildNativePptx(slides) {
  const pptx    = new PptxGenJS()
  pptx.layout   = 'LAYOUT_WIDE'   // 10" × 5.625"

  for (const slide of slides) {
    await buildSlide(pptx, slide)
  }
  return pptx
}
