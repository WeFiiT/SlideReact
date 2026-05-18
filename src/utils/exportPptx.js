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

// Logo position: above "Notre impact" in the right column (EMU units)
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

function applyData(slideXml, data) {
  let xml = slideXml
  for (const [placeholder, getValue] of MAPPING) {
    const escaped = placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    xml = xml.replace(
      new RegExp(`(<a:t>)${escaped}(</a:t>)`),
      (_, open, close) => `${open}${escapeXml(getValue(data))}${close}`,
    )
  }
  return xml
}

function insertLogoPic(slideXml, rId) {
  const pic = [
    '<p:pic>',
      '<p:nvPicPr>',
        '<p:cNvPr id="200" name="Logo client"/>',
        '<p:cNvPicPr><a:picLocks noChangeAspect="1"/></p:cNvPicPr>',
        '<p:nvPr/>',
      '</p:nvPicPr>',
      `<p:blipFill><a:blip r:embed="${rId}"/><a:stretch><a:fillRect/></a:stretch></p:blipFill>`,
      '<p:spPr>',
        `<a:xfrm><a:off x="${LOGO.x}" y="${LOGO.y}"/><a:ext cx="${LOGO.cx}" cy="${LOGO.cy}"/></a:xfrm>`,
        '<a:prstGeom prst="rect"><a:avLst/></a:prstGeom>',
        '<a:ln><a:noFill/></a:ln>',
      '</p:spPr>',
    '</p:pic>',
  ].join('')
  return slideXml.replace('</p:spTree>', `${pic}</p:spTree>`)
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
    return { data: await res.arrayBuffer(), ext }
  } catch { return null }
}

// Rels XML for cloned slides, optionally including a logo image relationship
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

  // Process each slide: text replacement + logo injection
  for (let i = 0; i < slides.length; i++) {
    const n    = i + 1
    const data = slides[i]
    let   xml  = applyData(slide1Xml, data)

    if (data.logo_url) {
      const logo = await fetchLogo(data.logo_url)
      if (logo) {
        const mediaName = `logo_${n}.${logo.ext}`
        // rId3 for slide1 (rId1=layout, rId2=notesSlide already taken)
        // rId3 for slides 2+ as well (our minimal rels only use rId1)
        const logoRId = 'rId3'

        zip.file(`ppt/media/${mediaName}`, logo.data)
        xml = insertLogoPic(xml, logoRId)

        if (n === 1) {
          // Append to existing slide1 rels
          const relsXml = await zip.files['ppt/slides/_rels/slide1.xml.rels'].async('string')
          const newRel  = `<Relationship Id="${logoRId}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="../media/${mediaName}"/>`
          zip.file('ppt/slides/_rels/slide1.xml.rels',
            relsXml.replace('</Relationships>', `${newRel}</Relationships>`),
          )
        } else {
          zip.file(`ppt/slides/_rels/slide${n}.xml.rels`, makeSlideRels(logoRId, mediaName))
        }
      } else if (n > 1) {
        zip.file(`ppt/slides/_rels/slide${n}.xml.rels`, makeSlideRels())
      }
    } else if (n > 1) {
      zip.file(`ppt/slides/_rels/slide${n}.xml.rels`, makeSlideRels())
    }

    zip.file(`ppt/slides/slide${n}.xml`, xml)
  }

  // Batch: register extra slides in presentation metadata
  if (slides.length > 1) {
    // sldIdLst — slide 1 keeps rId6, slides 2+ get rId101+
    const presXml = await zip.files['ppt/presentation.xml'].async('string')
    const sldIds  = slides.map((_, i) => {
      const rId = i === 0 ? 'rId6' : `rId${100 + i}`
      return `<p:sldId id="${2147483554 + i}" r:id="${rId}"/>`
    }).join('')
    zip.file('ppt/presentation.xml',
      presXml.replace(/<p:sldIdLst>[\s\S]*?<\/p:sldIdLst>/, `<p:sldIdLst>${sldIds}</p:sldIdLst>`),
    )

    // Add relationships for slides 2+ (slide 1's rId6 already exists)
    const relsXml    = await zip.files['ppt/_rels/presentation.xml.rels'].async('string')
    const newRelTags = slides.slice(1).map((_, i) =>
      `<Relationship Id="rId${101 + i}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="slides/slide${i + 2}.xml"/>`,
    ).join('')
    zip.file('ppt/_rels/presentation.xml.rels',
      relsXml.replace('</Relationships>', `${newRelTags}</Relationships>`),
    )

    // Register new slide content types
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
    getBlob: generateBlob,
    writeFile: async ({ fileName }) => {
      const blob = await generateBlob()
      const url  = URL.createObjectURL(blob)
      const a    = document.createElement('a')
      a.href     = url
      a.download = fileName
      a.click()
      URL.revokeObjectURL(url)
    },
  }
}
