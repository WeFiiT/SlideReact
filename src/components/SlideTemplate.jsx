import { Rnd } from 'react-rnd'

const FONT_TITLE = "'Publica Play', Arial, sans-serif"
const FONT_BODY  = "'Geomanist', Arial, sans-serif"

/* Palette exacte du design file */
const C = {
  navy:       '#112d80',   // badges
  navyBright: '#1f3fa3',   // texte, liens
  orange:     '#f08a2a',   // dots, accents
  lavender:   '#eef0fb',   // fond cartes, pills
  cream2:     '#fdf6ec',   // fond métriques
  line:       '#c9cfe6',   // bordures
  lblGray:    '#9aa0b8',   // label métrique
  blanc:      '#ffffff',
}

/* Dimensions fixes du design file */
const PAD_X   = 50
const RIGHT_W = 280
const GAP_COL = 28
const LEFT_W  = 1280 - 2 * PAD_X - GAP_COL - RIGHT_W  // 872px
const RIGHT_X = PAD_X + LEFT_W + GAP_COL               // 950px
const MAIN_TOP = 168
const MAIN_BOTTOM_Y = 670  // 720 - 50px bottom padding

export const DEFAULT_LAYOUT = {
  subtitle:  { x: PAD_X,   y: 110,      w: 1180,   h: 46  },
  contexte:  { x: PAD_X,   y: MAIN_TOP, w: LEFT_W, h: 80  },
  tags:      { x: PAD_X,   y: 262,      w: LEFT_W, h: 38  },
  perimetre: { x: PAD_X,   y: 314,      w: LEFT_W, h: 110 },
  enjeux:    { x: PAD_X,   y: 438,      w: LEFT_W, h: 232 },
  logo:      { x: RIGHT_X, y: MAIN_TOP, w: RIGHT_W, h: 60 },
  impact:    { x: RIGHT_X, y: 236,      w: RIGHT_W, h: 295},
  metriques: { x: RIGHT_X, y: 539,      w: RIGHT_W, h: 131},
}

const BLOCK_LABELS = {
  subtitle: 'Sous-titre', contexte: 'Contexte', tags: 'Tags',
  perimetre: 'Périmètre', enjeux: 'Enjeux clés',
  logo: 'Logo', impact: 'Notre impact', metriques: 'Métriques',
}

const PH = {
  titre: 'Immersion PM – Enjeu/pbmatique mission.',
  sous_titre: "Périmètre fonctionnel : PM sur l'app/web, sur périmètre… fonctionnalité X…",
  contexte: [
    "Description entreprise et organisation : présentation client, CA",
    "Enjeux globaux d'entreprise / contexte marché",
    "Parties prenantes : Marketing, Business, Comex…",
  ],
  tags: ["X utilisateurs", "KPI 1", "Secteur", "B2C/B2B"],
  perimetre: [
    "App / Web – Front / Back",
    "Place dans l'organisation : Tribe X au sein de la Direction Y",
    "Composition de la squad : Squad X, composée de x devs / x QA / x PO…",
  ],
  enjeux: [
    "Enjeu/OKR de la mission 1 (augmenter les revenus/améliorer la conversion…)",
    "Enjeu/OKR de la mission 2 (livrer la fonctionnalité/projet X…)",
    "Enjeu/OKR de la mission 3 (optimiser l'organisation, optimiser le modèle de donnée…)",
  ],
  impact: [
    "Pourquoi ça fité ? Mise en place de process, alignement de parties prenantes (tech x Produit…)",
    "Initiatives stratégiques ? Généralisation méthode Discovery pour dérisquer…",
    "Evolutions d'organisation ? …",
  ],
  metriques: [
    { chiffre: '+X%', label: 'de conversion' },
    { chiffre: 'X€',  label: '/an de CA' },
    { chiffre: 'X',   label: 'de xxxxx' },
  ],
}

function fill(arr, phs) {
  return phs.map((ph, i) => (arr?.[i]?.trim() ? arr[i] : ph))
}

function Block({ blockKey, layout, editMode, onUpdate, children }) {
  const b = layout[blockKey]
  if (editMode) {
    return (
      <Rnd
        position={{ x: b.x, y: b.y }}
        size={{ width: b.w, height: b.h }}
        bounds="parent"
        onDragStop={(e, d) => onUpdate(blockKey, { x: d.x, y: d.y })}
        onResizeStop={(e, dir, ref, delta, pos) => onUpdate(blockKey, {
          w: parseInt(ref.style.width), h: parseInt(ref.style.height),
          x: pos.x, y: pos.y,
        })}
        style={{ zIndex: 10 }}
      >
        <div style={{ width: '100%', height: '100%', border: '2px dashed #f08a2a', borderRadius: 4, boxSizing: 'border-box', overflow: 'visible', position: 'relative', cursor: 'move' }}>
          <div style={{ position: 'absolute', top: 0, left: 0, background: '#f08a2a', color: '#fff', fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: '0 0 4px 0', fontFamily: 'Arial', zIndex: 20, userSelect: 'none', lineHeight: '16px' }}>
            {BLOCK_LABELS[blockKey]}
          </div>
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

/* Bullet générique */
function Bullet({ text, bold = false, dotColor, textColor, fontSize = 16, gap = 5 }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: gap }}>
      <span style={{ color: dotColor || C.orange, fontWeight: 700, flexShrink: 0, fontSize, lineHeight: '1.45', fontFamily: FONT_BODY }}>•</span>
      <span style={{ fontSize, color: textColor || C.navyBright, lineHeight: 1.45, fontWeight: bold ? 700 : 400, fontFamily: FONT_BODY, wordSpacing: 'normal', letterSpacing: 'normal' }}>{text}</span>
    </div>
  )
}

/* Section avec bordure + tab flottant (Périmètre / Enjeux / Impact) */
function BoxedSection({ label, tabCentered = false, tabGradient = false, children }) {
  const tabStyle = tabCentered ? {
    position: 'absolute', top: -16, left: '50%', transform: 'translateX(-50%)',
    background: tabGradient ? 'linear-gradient(180deg,#f9a14a 0%,#ee6f12 100%)' : C.navy,
    color: C.blanc, borderRadius: 20, padding: '8px 38px',
    fontSize: 16, fontWeight: 700, fontFamily: FONT_TITLE,
    boxShadow: '0 2px 0 rgba(0,0,0,0.04)', whiteSpace: 'nowrap',
    wordSpacing: 'normal', letterSpacing: 'normal',
  } : {
    position: 'absolute', top: -14, left: 18,
    background: C.navy, color: C.blanc,
    borderRadius: 6, padding: '5px 20px',
    fontSize: 16, fontWeight: 700, fontFamily: FONT_TITLE,
    wordSpacing: 'normal', letterSpacing: 'normal',
  }

  return (
    <div style={{ position: 'relative', marginTop: 10, height: 'calc(100% - 10px)', boxSizing: 'border-box' }}>
      <div style={tabStyle}>{label}</div>
      <div style={{
        border: `1.5px solid ${C.line}`,
        borderRadius: 8,
        padding: tabCentered ? '26px 18px 16px' : '14px 22px 14px',
        height: '100%',
        boxSizing: 'border-box',
        overflow: 'hidden',
      }}>
        {children}
      </div>
    </div>
  )
}

export default function SlideTemplate({
  titre = '', sous_titre = '',
  contexte = [], tags = [], perimetre = [], enjeux = [], impact = [],
  metrique_1_chiffre = '', metrique_1_label = '',
  metrique_2_chiffre = '', metrique_2_label = '',
  metrique_3_chiffre = '', metrique_3_label = '',
  logo_url = '',
  editMode = false,
  layout = DEFAULT_LAYOUT,
  onLayoutChange = null,
}) {
  const t   = titre?.trim()      || PH.titre
  const st  = sous_titre?.trim() || PH.sous_titre
  const ctx = fill(contexte,  PH.contexte)
  const tgs = fill(tags,      PH.tags)
  const per = fill(perimetre, PH.perimetre)
  const enj = fill(enjeux,    PH.enjeux)
  const imp = fill(impact,    PH.impact)
  const metriques = [
    { chiffre: metrique_1_chiffre?.trim() || PH.metriques[0].chiffre, label: metrique_1_label?.trim() || PH.metriques[0].label },
    { chiffre: metrique_2_chiffre?.trim() || PH.metriques[1].chiffre, label: metrique_2_label?.trim() || PH.metriques[1].label },
    { chiffre: metrique_3_chiffre?.trim() || PH.metriques[2].chiffre, label: metrique_3_label?.trim() || PH.metriques[2].label },
  ]

  const onUpdate = (key, changes) => {
    if (onLayoutChange) onLayoutChange({ ...layout, [key]: { ...layout[key], ...changes } })
  }
  const bp = { layout, editMode, onUpdate }

  return (
    <div style={{ width: 1280, height: 720, background: C.blanc, fontFamily: FONT_BODY, overflow: 'hidden', position: 'relative', textAlign: 'left', wordSpacing: 'normal', letterSpacing: 'normal' }}>

      {/* Header SVG WeFiiT */}
      <img src="/logos/header.svg" alt="" style={{ position: 'absolute', top: 0, left: 0, width: 1280, height: 100, objectFit: 'fill', pointerEvents: 'none', zIndex: 1 }} />
      <div style={{ position: 'absolute', top: 0, left: 0, width: 1280, height: 100, display: 'flex', alignItems: 'center', padding: `0 ${PAD_X}px`, justifyContent: 'space-between', zIndex: 2, boxSizing: 'border-box' }}>
        <span style={{ color: C.blanc, fontSize: 38, fontWeight: 400, flex: 1, fontFamily: FONT_TITLE, wordSpacing: 'normal', letterSpacing: '-0.5px', lineHeight: 1 }}>{t}</span>
        <span style={{ color: C.orange, fontWeight: 400, fontSize: 38, marginLeft: 4, flexShrink: 0, fontFamily: FONT_TITLE }}>.</span>
      </div>

      {/* Footer SVG WeFiiT */}
      <img src="/logos/footer.svg" alt="" style={{ position: 'absolute', bottom: 0, left: 0, width: 1280, height: 67, objectFit: 'fill', pointerEvents: 'none', zIndex: 1 }} />

      {/* ── Sous-titre ── */}
      <Block blockKey="subtitle" {...bp}>
        <div style={{ color: C.navyBright, fontSize: 22, fontWeight: 700, fontFamily: FONT_TITLE, lineHeight: 1.1, wordSpacing: 'normal', letterSpacing: 'normal' }}>{st}</div>
      </Block>

      {/* ── Contexte ── */}
      <Block blockKey="contexte" {...bp}>
        <div style={{ background: C.lavender, borderRadius: 6, padding: '12px 20px', height: '100%', boxSizing: 'border-box' }}>
          {ctx.map((line, i) => <Bullet key={i} text={line} dotColor={C.navyBright} textColor={C.navyBright} fontSize={15} gap={4} />)}
        </div>
      </Block>

      {/* ── Tags / Pills ── */}
      <Block blockKey="tags" {...bp}>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', height: '100%' }}>
          {tgs.map((tag, i) => (
            <div key={i} style={{ background: C.lavender, borderRadius: 4, padding: '7px 18px', fontSize: 15, color: C.navyBright, fontWeight: 600, fontFamily: FONT_BODY, wordSpacing: 'normal', letterSpacing: 'normal', flexShrink: 0 }}>{tag}</div>
          ))}
        </div>
      </Block>

      {/* ── Périmètre ── border + tab flottant à gauche */}
      <Block blockKey="perimetre" {...bp}>
        <BoxedSection label="Périmètre">
          {per.map((line, i) => <Bullet key={i} text={line} bold dotColor={C.orange} textColor={C.navyBright} fontSize={15} gap={5} />)}
        </BoxedSection>
      </Block>

      {/* ── Enjeux ── border + tab flottant à gauche, poids normal */}
      <Block blockKey="enjeux" {...bp}>
        <BoxedSection label="Les enjeux clés">
          {enj.map((line, i) => <Bullet key={i} text={line} dotColor={C.orange} textColor={C.navyBright} fontSize={15} gap={9} />)}
        </BoxedSection>
      </Block>

      {/* ── Logo ── */}
      <Block blockKey="logo" {...bp}>
        {logo_url ? (
          <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <img src={logo_url} alt="logo client" style={{ maxHeight: '100%', maxWidth: '100%', objectFit: 'contain' }} />
          </div>
        ) : (
          <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'repeating-linear-gradient(45deg,#f6f6f6 0 8px,#ececec 8px 16px)', borderRadius: 4 }}>
            <span style={{ color: '#888', fontSize: 12, fontFamily: 'monospace', letterSpacing: '0.5px' }}>CLIENT LOGO</span>
          </div>
        )}
      </Block>

      {/* ── Notre impact ── border + tab centré gradient orange */}
      <Block blockKey="impact" {...bp}>
        <BoxedSection label="Notre impact" tabCentered tabGradient>
          {imp.map((line, i) => <Bullet key={i} text={line} bold dotColor={C.orange} textColor={C.navyBright} fontSize={14} gap={7} />)}
        </BoxedSection>
      </Block>

      {/* ── Métriques ── */}
      <Block blockKey="metriques" {...bp}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, height: '100%', boxSizing: 'border-box' }}>
          {metriques.map((m, i) => (
            <div key={i} style={{ background: C.cream2, borderRadius: 5, padding: '7px 14px', textAlign: 'center', flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
              <span style={{ color: C.orange, fontWeight: 700, fontSize: 26, fontStyle: 'italic', fontFamily: FONT_TITLE, wordSpacing: 'normal', letterSpacing: 'normal' }}>{m.chiffre}</span>
              <span style={{ fontStyle: 'italic', color: C.lblGray, fontWeight: 500, fontSize: 15, fontFamily: FONT_BODY, wordSpacing: 'normal', letterSpacing: 'normal' }}>{m.label}</span>
            </div>
          ))}
        </div>
      </Block>
    </div>
  )
}
