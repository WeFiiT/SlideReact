import JSZip from 'jszip'

// Template placeholder text → slide data field
const MAPPING = [
  ['Titre de la slide', d => d.titre              || ''],
  ['Sous-titre',        d => d.sous_titre          || ''],
  ['Contexte 1',        d => d.contexte?.[0]      || ''],
  ['Contexte 2',        d => d.contexte?.[1]      || ''],
  ['Contexte 3',        d => d.contexte?.[2]      || ''],
  ['Tag 1',             d => d.tags?.[0]          || ''],
  ['Tag 2',             d => d.tags?.[1]          || ''],
  ['Tag 3',             d => d.tags?.[2]          || ''],
  ['Tag 4',             d => d.tags?.[3]          || ''],
  ['Périmètre 1',       d => d.perimetre?.[0]     || ''],
  ['Périmètre 2',       d => d.perimetre?.[1]     || ''],
  ['Périmètre 3',       d => d.perimetre?.[2]     || ''],
  ['Enjeux clés 1',     d => d.enjeux?.[0]        || ''],
  ['Enjeux clés 2',     d => d.enjeux?.[1]        || ''],
  ['Enjeux clés 3',     d => d.enjeux?.[2]        || ''],
  ['Impact 1',          d => d.impact?.[0]        || ''],
  ['Impact 2',          d => d.impact?.[1]        || ''],
  ['Impact 3',          d => d.impact?.[2]        || ''],
  ['Métrique 1',        d => d.metrique_1_chiffre  || ''],
  [' Label 1',          d => d.metrique_1_label   ? ' ' + d.metrique_1_label : ''],
  ['Métrique 2',        d => d.metrique_2_chiffre  || ''],
  [' Label 2',          d => d.metrique_2_label   ? ' ' + d.metrique_2_label : ''],
  ['Métrique 3',        d => d.metrique_3_chiffre  || ''],
  [' Label 3',          d => d.metrique_3_label   ? ' ' + d.metrique_3_label : ''],
]

// Exact EMU positions from template inspection
const TAG_Y     = 2423877
const TAG_START = 617258
const TAG_CY    = 300426
const TAG_GAP   = 137099

const LOGO = { x: 8572362, y: 750000, cx: 2847796, cy: 1083659 }

// ── Helpers ────────────────────────────────────────────────────────────────

function escapeXml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

// 1. Remove metric shapes when empty — must run BEFORE applyData (uses placeholder text)
function removeEmptyMetrics(xml, data) {
  const checks = [
    { placeholder: 'Métrique 3', hasData: !!(data.metrique_3_chiffre || data.metrique_3_label) },
    { placeholder: 'Métrique 2', hasData: !!(data.metrique_2_chiffre || data.metrique_2_label) },
    { placeholder: 'Métrique 1', hasData: !!(data.metrique_1_chiffre || data.metrique_1_label) },
  ]
  for (const { placeholder, hasData } of checks) {
    if (hasData) continue
    for (const m of [...xml.matchAll(/<p:sp>[\s\S]*?<\/p:sp>/g)]) {
      if (m[0].includes(`<a:t>${placeholder}</a:t>`)) {
        xml = xml.replace(m[0], '')
        break
      }
    }
  }
  return xml
}

// 2a. Remove cap="all" from title run so text appears as typed, not uppercased
function removeTitleCaps(xml) {
  return xml.replace(/<p:sp>[\s\S]*?<\/p:sp>/g, shape => {
    if (!shape.includes('<a:t>Titre de la slide</a:t>')) return shape
    return shape.replace(/\s*cap="[^"]*"/g, '')
  })
}

// 2b. Text replacement with XML escaping + title truncation
function applyData(slideXml, data) {
  let xml = slideXml
  for (const [placeholder, getValue] of MAPPING) {
    const escaped = placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    xml = xml.replace(
      new RegExp(`(<a:t>)${escaped}(</a:t>)`),
      (_, open, close) => {
        let val = escapeXml(getValue(data))
        // Cap title at 80 chars to avoid overflow
        if (placeholder === 'Titre de la slide' && val.length > 80) {
          val = val.slice(0, 77) + '…'
        }
        return `${open}${val}${close}`
      },
    )
  }
  return xml
}

// 3. Adaptive tag widths — must run BEFORE applyData (finds shapes by placeholder text)
// lIns + rIns padding in template = 432 000 EMU; font = 10pt bold ≈ 105 000 EMU/char
function processTagShapes(xml, tags) {
  const PADDING_W  = 432000
  const EMU_CHAR   = 105000
  let currentX = TAG_START

  for (let i = 0; i < 4; i++) {
    const tagText    = tags?.[i]?.trim() || ''
    const placeholder = `Tag ${i + 1}`
    let   found       = null

    for (const m of [...xml.matchAll(/<p:sp>[\s\S]*?<\/p:sp>/g)]) {
      if (m[0].includes(`<a:t>${placeholder}</a:t>`)) { found = m[0]; break }
    }
    if (!found) continue

    if (!tagText) { xml = xml.replace(found, ''); continue }

    const newCx = Math.max(750000, tagText.length * EMU_CHAR + PADDING_W)
    const newSp = found
      .replace(/<a:off x="\d+" y="/,  `<a:off x="${currentX}" y="`)
      .replace(/<a:ext cx="\d+" cy="/, `<a:ext cx="${newCx}" cy="`)
      .replace(/wrap="[^"]*"/,         'wrap="none"')  // prevent any text wrapping
    xml = xml.replace(found, newSp)
    currentX += newCx + TAG_GAP
  }
  return xml
}

// 4. Logo insertion with aspect-ratio-correct contain + centering
function insertLogoPic(slideXml, rId, x = LOGO.x, y = LOGO.y, cx = LOGO.cx, cy = LOGO.cy) {
  const pic = [
    '<p:pic>',
      '<p:nvPicPr>',
        '<p:cNvPr id="200" name="Logo client"/>',
        '<p:cNvPicPr><a:picLocks noChangeAspect="1"/></p:cNvPicPr>',
        '<p:nvPr/>',
      '</p:nvPicPr>',
      `<p:blipFill><a:blip r:embed="${rId}"/><a:stretch><a:fillRect/></a:stretch></p:blipFill>`,
      '<p:spPr>',
        `<a:xfrm><a:off x="${x}" y="${y}"/><a:ext cx="${cx}" cy="${cy}"/></a:xfrm>`,
        '<a:prstGeom prst="rect"><a:avLst/></a:prstGeom>',
      '</p:spPr>',
    '</p:pic>',
  ].join('')
  return slideXml.replace('</p:spTree>', `${pic}</p:spTree>`)
}

// Get intrinsic pixel dimensions of a fetched image (PNG/JPEG only)
async function getImageDimensions(arrayBuffer) {
  try {
    const blob = new Blob([arrayBuffer])
    const url  = URL.createObjectURL(blob)
    return await new Promise(resolve => {
      const img    = new Image()
      img.onload   = () => { resolve({ w: img.naturalWidth, h: img.naturalHeight }); URL.revokeObjectURL(url) }
      img.onerror  = () => { resolve(null); URL.revokeObjectURL(url) }
      img.src      = url
    })
  } catch { return null }
}

// Calculate contain position inside LOGO box, centered
function containLogo(imgW, imgH) {
  const boxRatio = LOGO.cx / LOGO.cy
  const imgRatio = imgW   / imgH
  let cx, cy
  if (imgRatio > boxRatio) { cx = LOGO.cx; cy = Math.round(LOGO.cx / imgRatio) }
  else                     { cy = LOGO.cy; cx = Math.round(LOGO.cy * imgRatio) }
  return {
    x:  LOGO.x + Math.round((LOGO.cx - cx) / 2),
    y:  LOGO.y + Math.round((LOGO.cy - cy) / 2),
    cx, cy,
  }
}

// Returns the image ArrayBuffer + file extension, or null on failure
async function fetchLogo(url) {
  try {
    const res = await fetch(url)
    if (!res.ok) return null
    const ct  = res.headers.get('content-type') || ''
    const ext = ct.includes('jpeg') || ct.includes('jpg') ? 'jpeg'
              : ct.includes('svg')                        ? 'svg'
              : 'png'
    const data = await res.arrayBuffer()
    return { data, ext }
  } catch (e) {
    console.warn('[exportPptx] logo fetch failed:', e.message, url)
    return null
  }
}

// Rels XML for cloned slides
function makeSlideRels(logoRId = null, logoMedia = null) {
  const logoRel = logoRId && logoMedia
    ? `<Relationship Id="${logoRId}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="../media/${logoMedia}"/>`
    : ''
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout" Target="../slideLayouts/slideLayout8.xml"/>${logoRel}</Relationships>`
}

// REF_Client_TypeMission_NomMission_MM-YYYY_Prénom NOM
export function buildPptxFilename(slide) {
  const date = slide.created_at
    ? (() => {
        const d  = new Date(slide.created_at)
        const mm = String(d.getMonth() + 1).padStart(2, '0')
        return `${mm}-${d.getFullYear()}`
      })()
    : ''
  const consultant = [slide.prenom, slide.nom ? slide.nom.toUpperCase() : ''].filter(Boolean).join(' ')
  return ['REF', slide.client || '', slide.type_mission || '', slide.card_titre || slide.titre || '', date, consultant]
    .filter(Boolean)
    .join('_')
    .replace(/[/\\?%*:|"<>]/g, '-')
}

async function fetchTemplate() {
  const res = await fetch('/SlideReact_template.pptx')
  if (!res.ok) throw new Error('Template PPTX introuvable dans /public')
  return res.arrayBuffer()
}

// ── Public API ─────────────────────────────────────────────────────────────

export async function buildNativePptx(slides) {
  const buf       = await fetchTemplate()
  const zip       = await JSZip.loadAsync(buf)
  const slide1Xml = await zip.files['ppt/slides/slide1.xml'].async('string')

  const warnings = []

  for (let i = 0; i < slides.length; i++) {
    const n    = i + 1
    const data = slides[i]

    // Pipeline: remove empty metrics → adapt tags → remove title caps → replace text
    let xml = removeEmptyMetrics(slide1Xml, data)
    xml     = processTagShapes(xml, data.tags)
    xml     = removeTitleCaps(xml)
    xml     = applyData(xml, data)

    if (data.logo_url) {
      const logo = await fetchLogo(data.logo_url)
      if (logo) {
        const mediaName = `logo_${n}.${logo.ext}`
        const logoRId   = 'rId3'

        // Use Uint8Array for maximum JSZip compatibility
        zip.file(`ppt/media/${mediaName}`, new Uint8Array(logo.data))

        // Aspect-ratio-correct logo placement (skip for SVG)
        let logoPos = { x: LOGO.x, y: LOGO.y, cx: LOGO.cx, cy: LOGO.cy }
        if (logo.ext !== 'svg') {
          const dims = await getImageDimensions(logo.data)
          if (dims?.w && dims?.h) logoPos = containLogo(dims.w, dims.h)
        }
        xml = insertLogoPic(xml, logoRId, logoPos.x, logoPos.y, logoPos.cx, logoPos.cy)

        if (n === 1) {
          const relsXml = await zip.files['ppt/slides/_rels/slide1.xml.rels'].async('string')
          const newRel  = `<Relationship Id="${logoRId}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="../media/${mediaName}"/>`
          zip.file('ppt/slides/_rels/slide1.xml.rels',
            relsXml.replace('</Relationships>', `${newRel}</Relationships>`),
          )
        } else {
          zip.file(`ppt/slides/_rels/slide${n}.xml.rels`, makeSlideRels(logoRId, mediaName))
        }
      } else {
        warnings.push(`Slide ${n}: logo introuvable (URL: ${data.logo_url})`)
        console.warn('[exportPptx] logo fetch failed for slide', n, data.logo_url)
        if (n > 1) zip.file(`ppt/slides/_rels/slide${n}.xml.rels`, makeSlideRels())
      }
    } else if (n > 1) {
      zip.file(`ppt/slides/_rels/slide${n}.xml.rels`, makeSlideRels())
    }

    zip.file(`ppt/slides/slide${n}.xml`, xml)
  }

  // Batch: register extra slides in presentation metadata
  if (slides.length > 1) {
    const presXml = await zip.files['ppt/presentation.xml'].async('string')
    const sldIds  = slides.map((_, i) => {
      const rId = i === 0 ? 'rId6' : `rId${100 + i}`
      return `<p:sldId id="${2147483554 + i}" r:id="${rId}"/>`
    }).join('')
    zip.file('ppt/presentation.xml',
      presXml.replace(/<p:sldIdLst>[\s\S]*?<\/p:sldIdLst>/, `<p:sldIdLst>${sldIds}</p:sldIdLst>`),
    )

    const relsXml    = await zip.files['ppt/_rels/presentation.xml.rels'].async('string')
    const newRelTags = slides.slice(1).map((_, i) =>
      `<Relationship Id="rId${101 + i}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="slides/slide${i + 2}.xml"/>`,
    ).join('')
    zip.file('ppt/_rels/presentation.xml.rels',
      relsXml.replace('</Relationships>', `${newRelTags}</Relationships>`),
    )

    const ctXml    = await zip.files['[Content_Types].xml'].async('string')
    const newTypes = slides.slice(1).map((_, i) =>
      `<Override PartName="/ppt/slides/slide${i + 2}.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/>`,
    ).join('')
    zip.file('[Content_Types].xml', ctXml.replace('</Types>', `${newTypes}</Types>`))
  }

  const generateBlob = () => zip.generateAsync({
    type:     'blob',
    mimeType: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  })

  return {
    warnings,
    getBlob:   generateBlob,
    writeFile: async ({ fileName }) => {
      const blob = await generateBlob()
      const url  = URL.createObjectURL(blob)
      const a    = document.createElement('a')
      a.href     = url
      a.download = fileName
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    },
  }
}
