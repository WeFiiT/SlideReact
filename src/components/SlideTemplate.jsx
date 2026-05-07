import { useLayoutEffect, useRef, useState } from 'react'
import { Rnd } from 'react-rnd'

const FONT_TITLE = "'Publica Play', Arial, sans-serif"
const FONT_BODY  = "'Geomanist', Arial, sans-serif"

const C = {
  navy:       '#112d80',
  navyBright: '#1f3fa3',
  orange:     '#f08a2a',
  lavender:   '#eef0fb',
  cream2:     '#fdf6ec',
  line:       '#c9cfe6',
  lblGray:    '#9aa0b8',
  blanc:      '#ffffff',
}

const PAD_X   = 50
const RIGHT_W = 280
const GAP_COL = 28
const LEFT_W  = 1280 - 2 * PAD_X - GAP_COL - RIGHT_W
const RIGHT_X = PAD_X + LEFT_W + GAP_COL

export const DEFAULT_LAYOUT = {
  subtitle:  { x: PAD_X,   y: 110,  w: 1180,   h: 46  },
  contexte:  { x: PAD_X,   y: 168,  w: LEFT_W, h: 100 },
  tags:      { x: PAD_X,   y: 282,  w: LEFT_W, h: 38  },
  perimetre: { x: PAD_X,   y: 334,  w: LEFT_W, h: 140 },
  enjeux:    { x: PAD_X,   y: 488,  w: LEFT_W, h: 180 },
  logo:      { x: RIGHT_X, y: 168,  w: RIGHT_W, h: 60 },
  impact:    { x: RIGHT_X, y: 236,  w: RIGHT_W, h: 180},
  metriques: { x: RIGHT_X, y: 476,  w: RIGHT_W, h: 131},
}

const BLOCK_LABELS = {
  subtitle: 'Sous-titre', contexte: 'Contexte', tags: 'Tags',
  perimetre: 'Périmètre', enjeux: 'Enjeux clés',
  logo: 'Logo', impact: 'Notre impact', metriques: 'Métriques',
}

const PH = {
  titre:      'Immersion PM – Enjeu/pbmatique mission.',
  sous_titre: "Périmètre fonctionnel : PM sur l'app/web, sur périmètre… fonctionnalité X…",
  contexte:   [
    "Description entreprise et organisation : présentation client, CA",
    "Enjeux globaux d'entreprise / contexte marché",
    "Parties prenantes : Marketing, Business, Comex…",
  ],
  tags:       ["X utilisateurs", "KPI 1", "Secteur", "B2C/B2B"],
  perimetre:  [
    "App / Web – Front / Back",
    "Place dans l'organisation : Tribe X au sein de la Direction Y",
    "Composition de la squad : Squad X, composée de x devs / x QA / x PO…",
  ],
  enjeux:     [
    "Enjeu/OKR de la mission 1 (augmenter les revenus/améliorer la conversion…)",
    "Enjeu/OKR de la mission 2 (livrer la fonctionnalité/projet X…)",
    "Enjeu/OKR de la mission 3 (optimiser l'organisation, optimiser le modèle de donnée…)",
  ],
  impact:     [
    "Pourquoi ça fité ? Mise en place de process, alignement de parties prenantes (tech x Produit…)",
    "Initiatives stratégiques ? Généralisation méthode Discovery pour dérisquer…",
    "Évolutions d'organisation ? …",
  ],
  metriques:  [
    { chiffre: '+X%', label: 'de conversion' },
    { chiffre: 'X€',  label: '/an de CA'     },
    { chiffre: 'X',   label: 'de xxxxx'      },
  ],
}

function fill(arr, phs) {
  return phs.map((ph, i) => (arr?.[i]?.trim() ? arr[i] : ph))
}

/* ─── Édition inline ───────────────────────────────────────── */
function EditText({ value, placeholder, onSave, style = {}, tag: Tag = 'span', multiline = false }) {
  const elRef   = useRef(null)
  const editing = useRef(false)   // bloque les mises à jour React pendant la frappe

  const phColor = (style.color === '#ffffff' || style.color === C.blanc)
    ? 'rgba(255,255,255,0.45)' : '#aab0c8'
  const phHTML = placeholder
    ? `<span data-ph style="color:${phColor};font-style:italic;pointer-events:none;user-select:none">${placeholder}</span>`
    : ''

  /* Met à jour le DOM seulement quand on n'est pas en train d'éditer */
  useLayoutEffect(() => {
    if (!elRef.current || editing.current) return
    if (value?.trim()) {
      elRef.current.innerText = value
    } else {
      elRef.current.innerHTML = phHTML
    }
  }, [value, phHTML])

  if (!onSave) return <Tag style={style}>{value || ''}</Tag>

  return (
    <Tag
      ref={elRef}
      contentEditable
      suppressContentEditableWarning
      onFocus={() => {
        editing.current = true
        /* Efface le placeholder au focus pour laisser le champ propre */
        if (elRef.current?.querySelector('[data-ph]')) {
          elRef.current.innerHTML = ''
        }
      }}
      onBlur={e => {
        editing.current = false
        /* Si le placeholder est encore là (cas rare), ne rien sauvegarder */
        if (e.currentTarget.querySelector('[data-ph]')) return
        const v = e.currentTarget.innerText.trim()
        if (v !== (value ?? '')) onSave(v)
      }}
      onKeyDown={e => {
        if (!multiline && e.key === 'Enter') { e.preventDefault(); e.currentTarget.blur() }
        if (e.key === 'Escape') {
          editing.current = false
          if (value?.trim()) { elRef.current.innerText = value }
          else                { elRef.current.innerHTML = phHTML }
          e.currentTarget.blur()
        }
      }}
      style={{
        ...style,
        outline: 'none',
        cursor: 'text',
        boxShadow: 'inset 0 0 0 1.5px rgba(240,138,42,0.55)',
        borderRadius: style.borderRadius ?? 2,
        ...(style.padding ? {} : { padding: '1px 3px', margin: '-1px -3px' }),
        minWidth: 12,
        display: style.display ?? 'inline-block',
      }}
    />
  )
}

/* ─── Bloc drag/resize ─────────────────────────────────────── */
function Block({ blockKey, layout, editMode, onUpdate, children }) {
  const b = layout[blockKey]
  if (editMode) {
    return (
      <Rnd
        position={{ x: b.x, y: b.y }}
        size={{ width: b.w, height: b.h }}
        bounds="parent"
        onDragStop={(e, d) => onUpdate(blockKey, { x: d.x, y: d.y })}
        onResizeStop={(e, dir, ref, delta, pos) => onUpdate(blockKey, { w: parseInt(ref.style.width), h: parseInt(ref.style.height), x: pos.x, y: pos.y })}
        style={{ zIndex: 10 }}
      >
        <div style={{ width: '100%', height: '100%', border: '2px dashed #f08a2a', borderRadius: 4, boxSizing: 'border-box', overflow: 'visible', position: 'relative', cursor: 'move' }}>
          <div style={{ position: 'absolute', top: 0, left: 0, background: '#f08a2a', color: '#fff', fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: '0 0 4px 0', fontFamily: 'Arial', zIndex: 20, userSelect: 'none', lineHeight: '16px' }}>{BLOCK_LABELS[blockKey]}</div>
          <div style={{ width: '100%', height: '100%', overflow: 'visible' }}>{children}</div>
        </div>
      </Rnd>
    )
  }
  return (
    <div style={{ position: 'absolute', left: b.x, top: b.y, width: b.w, height: b.h, overflow: 'visible', boxSizing: 'border-box' }}>
      {children}
    </div>
  )
}

/* ─── Bullet ───────────────────────────────────────────────── */
function Bullet({ text, placeholder, onSave, dotColor, textColor, bold = false, fontSize = 15, gap = 5 }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: gap }}>
      <span style={{ color: dotColor ?? C.orange, fontWeight: 700, flexShrink: 0, fontSize, lineHeight: '1.45', fontFamily: FONT_BODY }}>•</span>
      <EditText
        value={text}
        placeholder={placeholder}
        onSave={onSave}
        multiline
        style={{ fontSize, color: textColor ?? C.navyBright, lineHeight: 1.45, fontWeight: bold ? 700 : 400, fontFamily: FONT_BODY, wordSpacing: 'normal', letterSpacing: 'normal', display: 'block', flex: 1 }}
      />
    </div>
  )
}

/* ─── Section encadrée avec tab flottant ───────────────────── */
function BoxedSection({ label, tabCentered = false, tabGradient = false, children }) {
  const tabStyle = tabCentered ? {
    position: 'absolute', top: -16, left: '50%', transform: 'translateX(-50%)',
    background: tabGradient ? 'linear-gradient(180deg,#f9a14a 0%,#ee6f12 100%)' : C.navy,
    color: C.blanc, borderRadius: 20, padding: '8px 38px', fontSize: 16, fontWeight: 700,
    fontFamily: FONT_TITLE, whiteSpace: 'nowrap', wordSpacing: 'normal', letterSpacing: 'normal',
  } : {
    position: 'absolute', top: -14, left: 18,
    background: C.navy, color: C.blanc, borderRadius: 6, padding: '5px 20px',
    fontSize: 16, fontWeight: 700, fontFamily: FONT_TITLE, wordSpacing: 'normal', letterSpacing: 'normal',
  }
  return (
    <div style={{ position: 'relative', marginTop: 15, height: 'auto', boxSizing: 'border-box' }}>
      <div style={tabStyle}>{label}</div>
      <div style={{ border: `1.5px solid ${C.line}`, borderRadius: 8, padding: tabCentered ? '26px 18px 16px' : '20px 22px 14px', boxSizing: 'border-box', overflow: 'visible' }}>
        {children}
      </div>
    </div>
  )
}

/* ─── Composant principal ──────────────────────────────────── */
export default function SlideTemplate({
  titre = '', sous_titre = '',
  contexte = [], tags = [], perimetre = [], enjeux = [], impact = [],
  metrique_1_chiffre = '', metrique_1_label = '',
  metrique_2_chiffre = '', metrique_2_label = '',
  metrique_3_chiffre = '', metrique_3_label = '',
  logo_url = '',
  editMode = false,
  textEditMode = false,
  layout = DEFAULT_LAYOUT,
  onLayoutChange = null,
  onTextChange = null,
}) {
  /* Valeurs réelles — jamais de placeholder en vue, placeholder CSS en édition */
  const t   = titre?.trim()      || (textEditMode ? '' : PH.titre)
  const st  = sous_titre?.trim() || ''

  const ctx = [0,1,2].map(i => contexte?.[i]?.trim() ?? '')
  const tgs = [0,1,2,3].map(i => tags?.[i]?.trim() ?? '')
  const per = [0,1,2].map(i => perimetre?.[i]?.trim() ?? '')
  const enj = [0,1,2].map(i => enjeux?.[i]?.trim() ?? '')
  const imp = [0,1,2].map(i => impact?.[i]?.trim() ?? '')

  const mChiffres = [metrique_1_chiffre, metrique_2_chiffre, metrique_3_chiffre].map(v => v?.trim() ?? '')
  const mLabels   = [metrique_1_label,   metrique_2_label,   metrique_3_label  ].map(v => v?.trim() ?? '')
  const metriques = PH.metriques.map((ph, i) => ({
    chiffre: mChiffres[i],
    label:   mLabels[i],
    phChiffre: ph.chiffre,
    phLabel:   ph.label,
  }))

  /* Helpers pour onTextChange */
  const chg = (field, idx = null) =>
    textEditMode && onTextChange
      ? (val) => onTextChange(field, idx, val)
      : null

  const onUpdate = (key, changes) => {
    if (onLayoutChange) onLayoutChange({ ...layout, [key]: { ...layout[key], ...changes } })
  }
  const bp = { layout, editMode, onUpdate }

  return (
    <div style={{ width: 1280, height: 720, background: C.blanc, fontFamily: FONT_BODY, overflow: 'hidden', position: 'relative', textAlign: 'left', wordSpacing: 'normal', letterSpacing: 'normal' }}>

      {/* Header SVG */}
      <img src="/logos/header.svg" alt="" style={{ position: 'absolute', top: 0, left: 0, width: 1280, height: 100, objectFit: 'fill', pointerEvents: 'none', zIndex: 1 }} />
      <div style={{ position: 'absolute', top: 0, left: 0, width: 1280, height: 100, display: 'flex', alignItems: 'center', padding: `0 ${PAD_X}px`, justifyContent: 'flex-start', zIndex: 2, boxSizing: 'border-box' }}>
        <EditText
          value={titre?.trim() || ''}
          placeholder={PH.titre}
          onSave={chg('titre')}
          style={{ color: C.blanc, fontSize: 38, fontWeight: 400, fontFamily: FONT_TITLE, wordSpacing: 'normal', letterSpacing: '-0.5px', lineHeight: 1.2, whiteSpace: 'nowrap' }}
          tag="span"
        />
        <span style={{ color: C.orange, fontWeight: 400, fontSize: 38, marginLeft: 4, flexShrink: 0, fontFamily: FONT_TITLE, lineHeight: 1.2 }}>.</span>
      </div>

      {/* Footer SVG */}
      <img src="/logos/footer.svg" alt="" style={{ position: 'absolute', bottom: 0, left: 0, width: 1280, height: 67, objectFit: 'fill', pointerEvents: 'none', zIndex: 1 }} />

      {/* Sous-titre */}
      {(textEditMode || st) && (
        <Block blockKey="subtitle" {...bp}>
          <div style={{ display: 'flex', alignItems: 'center', height: '100%' }}>
            <EditText value={st} placeholder={PH.sous_titre} onSave={chg('sous_titre')}
              style={{ color: C.navyBright, fontSize: 22, fontWeight: 700, fontFamily: FONT_TITLE, lineHeight: 1.1, wordSpacing: 'normal', letterSpacing: 'normal', width: '100%' }}
              tag="div" />
          </div>
        </Block>
      )}

      {/* Contexte */}
      <Block blockKey="contexte" {...bp}>
        <div style={{ background: C.lavender, borderRadius: 6, padding: '12px 20px', height: '100%', boxSizing: 'border-box' }}>
          {ctx.map((line, i) => (textEditMode || line) && (
            <Bullet key={i} text={line} placeholder={PH.contexte[i]} onSave={chg('contexte', i)}
              dotColor={C.navyBright} textColor={C.navyBright} fontSize={15} gap={4} />
          ))}
        </div>
      </Block>

      {/* Tags */}
      <Block blockKey="tags" {...bp}>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', height: '100%' }}>
          {tgs.map((tag, i) => (textEditMode || tag) && (
            <EditText key={i} value={tag} placeholder={PH.tags[i]} onSave={chg('tags', i)}
              style={{ background: C.lavender, borderRadius: 4, padding: '7px 18px', fontSize: 15, color: C.navyBright, fontWeight: 600, fontFamily: FONT_BODY, wordSpacing: 'normal', letterSpacing: 'normal', flexShrink: 0 }}
              tag="div" />
          ))}
        </div>
      </Block>

      {/* Périmètre */}
      <Block blockKey="perimetre" {...bp}>
        <BoxedSection label="Périmètre">
          {per.map((line, i) => (textEditMode || line) && (
            <Bullet key={i} text={line} placeholder={PH.perimetre[i]} onSave={chg('perimetre', i)}
              dotColor={C.orange} textColor={C.navyBright} fontSize={15} gap={5} />
          ))}
        </BoxedSection>
      </Block>

      {/* Enjeux */}
      <Block blockKey="enjeux" {...bp}>
        <BoxedSection label="Les enjeux clés">
          {enj.map((line, i) => (textEditMode || line) && (
            <Bullet key={i} text={line} placeholder={PH.enjeux[i]} onSave={chg('enjeux', i)}
              dotColor={C.orange} textColor={C.navyBright} fontSize={15} gap={9} />
          ))}
        </BoxedSection>
      </Block>

      {/* Logo */}
      <Block blockKey="logo" {...bp}>
        {logo_url ? (
          <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <img src={logo_url} alt="logo client" style={{ maxHeight: '100%', maxWidth: '100%', objectFit: 'contain' }} />
          </div>
        ) : (
          <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6, background: 'repeating-linear-gradient(45deg,#f6f6f6 0 8px,#ececec 8px 16px)', borderRadius: 4 }}>
            <span style={{ color: '#aaa', fontSize: 12, fontFamily: 'monospace' }}>CLIENT LOGO</span>
            <span style={{ color: '#b0b8cc', fontSize: 10, fontStyle: 'italic', fontFamily: FONT_BODY }}>(ajouter depuis le formulaire)</span>
          </div>
        )}
      </Block>

      {/* Notre impact */}
      <Block blockKey="impact" {...bp}>
        <BoxedSection label="Notre impact" tabCentered tabGradient>
          {imp.map((line, i) => (textEditMode || line) && (
            <Bullet key={i} text={line} placeholder={PH.impact[i]} onSave={chg('impact', i)}
              bold dotColor={C.orange} textColor={C.navyBright} fontSize={14} gap={7} />
          ))}
        </BoxedSection>
      </Block>

      {/* Métriques — carte visible si chiffre rempli, ou toujours en édition */}
      <Block blockKey="metriques" {...bp}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, height: '100%', boxSizing: 'border-box' }}>
          {metriques.map((m, i) => {
            if (!textEditMode && !m.chiffre && !m.label) return null
            const cf = `metrique_${i + 1}_chiffre`
            const lf = `metrique_${i + 1}_label`
            return (
              <div key={i} style={{ background: C.cream2, borderRadius: 5, padding: '7px 14px', flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                <EditText value={m.chiffre} placeholder={m.phChiffre} onSave={chg(cf)}
                  style={{ color: C.orange, fontWeight: 700, fontSize: 26, fontStyle: 'italic', fontFamily: FONT_TITLE, wordSpacing: 'normal', letterSpacing: 'normal' }} />
                <EditText value={m.label} placeholder={m.phLabel} onSave={chg(lf)}
                  style={{ fontStyle: 'italic', color: C.lblGray, fontWeight: 500, fontSize: 15, fontFamily: FONT_BODY, wordSpacing: 'normal', letterSpacing: 'normal' }} />
              </div>
            )
          })}
        </div>
      </Block>
    </div>
  )
}
