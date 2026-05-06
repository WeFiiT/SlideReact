import { Rnd } from 'react-rnd'

const FONT_TITLE = "'Publica Play', Arial, sans-serif"
const FONT_BODY  = "'Geomanist', Arial, sans-serif"

const C = {
  bleu:      '#002882',
  orange:    '#F98F03',
  blanc:     '#FFFFFF',
  grisClair: '#F0F4FF',
  grisNeutre:'#E7E6E6',
  texte:     '#334155',
}

const txt = (overrides = {}) => ({
  fontFamily: FONT_BODY,
  textAlign: 'left',
  wordSpacing: 'normal',
  letterSpacing: 'normal',
  fontKerning: 'none',
  ...overrides,
})

/* Layout par défaut — calqué sur le PDF référence */
export const DEFAULT_LAYOUT = {
  subtitle:  { x: 28,  y: 84,  w: 1224, h: 26  },
  contexte:  { x: 28,  y: 114, w: 784,  h: 72  },
  tags:      { x: 28,  y: 194, w: 784,  h: 30  },
  perimetre: { x: 28,  y: 232, w: 784,  h: 118 },
  enjeux:    { x: 28,  y: 358, w: 784,  h: 277 },
  logo:      { x: 830, y: 114, w: 422,  h: 70  },
  impact:    { x: 830, y: 192, w: 422,  h: 220 },
  metriques: { x: 830, y: 420, w: 422,  h: 115 },
}

const BLOCK_LABELS = {
  subtitle:  'Sous-titre',
  contexte:  'Contexte',
  tags:      'Tags',
  perimetre: 'Périmètre',
  enjeux:    'Enjeux clés',
  logo:      'Logo',
  impact:    'Notre impact',
  metriques: 'Métriques',
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

function Badge({ children }) {
  return (
    <div style={{
      display: 'inline-block',
      background: C.bleu, color: C.blanc,
      borderRadius: 20, padding: '4px 16px',
      fontSize: 13, fontWeight: 400,
      marginBottom: 7, fontFamily: FONT_TITLE,
      wordSpacing: 'normal', letterSpacing: 'normal',
    }}>{children}</div>
  )
}

function Bullet({ text, dotColor, textColor, bold = false }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 7, marginBottom: 5 }}>
      <span style={{ color: dotColor || C.orange, fontWeight: 700, flexShrink: 0, fontSize: 15, lineHeight: '18px', fontFamily: FONT_BODY }}>•</span>
      <span style={txt({ fontSize: 13, color: textColor || C.texte, lineHeight: 1.4, fontWeight: bold ? 700 : 400 })}>{text}</span>
    </div>
  )
}

/* Wrapper bloc — absolu en vue, Rnd en édition */
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
          w: parseInt(ref.style.width),
          h: parseInt(ref.style.height),
          x: pos.x, y: pos.y,
        })}
        style={{ zIndex: 10 }}
      >
        <div style={{
          width: '100%', height: '100%',
          border: '2px dashed #F98F03',
          borderRadius: 4,
          boxSizing: 'border-box',
          overflow: 'hidden',
          position: 'relative',
          cursor: 'move',
        }}>
          {/* Label du bloc */}
          <div style={{
            position: 'absolute', top: 0, left: 0,
            background: '#F98F03', color: '#fff',
            fontSize: 10, fontWeight: 700,
            padding: '1px 6px', borderRadius: '0 0 4px 0',
            fontFamily: 'Arial, sans-serif',
            zIndex: 20, userSelect: 'none',
            lineHeight: '16px',
          }}>{BLOCK_LABELS[blockKey]}</div>
          <div style={{ width: '100%', height: '100%', overflow: 'hidden' }}>
            {children}
          </div>
        </div>
      </Rnd>
    )
  }

  return (
    <div style={{
      position: 'absolute',
      left: b.x, top: b.y,
      width: b.w, height: b.h,
      overflow: 'hidden',
      boxSizing: 'border-box',
    }}>
      {children}
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

  const blockProps = { layout, editMode, onUpdate }

  return (
    <div style={{
      width: 1280, height: 720,
      background: C.blanc,
      fontFamily: FONT_BODY,
      overflow: 'hidden',
      position: 'relative',
      textAlign: 'left',
      wordSpacing: 'normal',
      letterSpacing: 'normal',
    }}>
      {/* Header SVG WeFiiT */}
      <img src="/logos/header.svg" alt="" style={{ position: 'absolute', top: 0, left: 0, width: 1280, height: 74, objectFit: 'fill', pointerEvents: 'none', zIndex: 1 }} />
      <div style={{ position: 'absolute', top: 0, left: 0, width: 1280, height: 74, display: 'flex', alignItems: 'center', padding: '0 32px', justifyContent: 'space-between', zIndex: 2, boxSizing: 'border-box' }}>
        <span style={{ color: C.blanc, fontSize: 27, fontWeight: 400, flex: 1, fontFamily: FONT_TITLE, wordSpacing: 'normal', letterSpacing: 'normal' }}>{t}</span>
        <span style={{ color: C.orange, fontWeight: 400, fontSize: 24, marginLeft: 20, flexShrink: 0, fontFamily: FONT_TITLE, wordSpacing: 'normal', letterSpacing: 'normal' }}>point.</span>
      </div>

      {/* Footer SVG WeFiiT */}
      <img src="/logos/footer.svg" alt="" style={{ position: 'absolute', bottom: 0, left: 0, width: 1280, height: 67, objectFit: 'fill', pointerEvents: 'none', zIndex: 1 }} />

      {/* ── Bloc : Sous-titre ── */}
      <Block blockKey="subtitle" {...blockProps}>
        <div style={txt({ color: C.bleu, fontSize: 14, fontWeight: 400, fontFamily: FONT_TITLE, paddingTop: 4 })}>{st}</div>
      </Block>

      {/* ── Bloc : Contexte ── */}
      <Block blockKey="contexte" {...blockProps}>
        <div style={{ background: C.grisClair, borderRadius: 8, padding: '8px 14px', height: '100%', boxSizing: 'border-box' }}>
          {ctx.map((line, i) => <Bullet key={i} text={line} />)}
        </div>
      </Block>

      {/* ── Bloc : Tags ── */}
      <Block blockKey="tags" {...blockProps}>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center', height: '100%' }}>
          {tgs.map((tag, i) => (
            <span key={i} style={txt({ border: `1px solid ${C.grisNeutre}`, background: C.blanc, color: C.texte, borderRadius: 4, padding: '3px 14px', fontSize: 12 })}>{tag}</span>
          ))}
        </div>
      </Block>

      {/* ── Bloc : Périmètre ── */}
      <Block blockKey="perimetre" {...blockProps}>
        <div style={{ height: '100%', boxSizing: 'border-box' }}>
          <Badge>Périmètre</Badge>
          <div style={{ background: C.grisClair, borderRadius: 8, padding: '7px 14px' }}>
            {per.map((line, i) => <Bullet key={i} text={line} dotColor={C.orange} textColor={C.bleu} bold />)}
          </div>
        </div>
      </Block>

      {/* ── Bloc : Enjeux ── */}
      <Block blockKey="enjeux" {...blockProps}>
        <div style={{ height: '100%', boxSizing: 'border-box' }}>
          <Badge>Les enjeux clés</Badge>
          {enj.map((line, i) => <Bullet key={i} text={line} dotColor={C.orange} textColor={C.texte} />)}
        </div>
      </Block>

      {/* ── Bloc : Logo ── */}
      <Block blockKey="logo" {...blockProps}>
        {logo_url ? (
          <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: C.grisClair, borderRadius: 10 }}>
            <img src={logo_url} alt="logo client" style={{ maxHeight: '90%', maxWidth: '90%', objectFit: 'contain' }} />
          </div>
        ) : (
          <div style={{ width: '100%', height: '100%', background: C.grisClair, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={txt({ color: '#94a3b8', fontSize: 12, fontStyle: 'italic', textAlign: 'center', lineHeight: 1.5 })}>Remplacer par<br />logo client</span>
          </div>
        )}
      </Block>

      {/* ── Bloc : Notre impact ── */}
      <Block blockKey="impact" {...blockProps}>
        <div style={{ background: C.grisClair, borderRadius: 10, padding: '10px 12px', height: '100%', boxSizing: 'border-box' }}>
          <div style={{ background: C.orange, color: C.blanc, borderRadius: 30, padding: '8px 14px', fontSize: 15, fontWeight: 400, marginBottom: 10, textAlign: 'center', fontFamily: FONT_TITLE, wordSpacing: 'normal', letterSpacing: 'normal' }}>Notre impact</div>
          {imp.map((line, i) => <Bullet key={i} text={line} dotColor={C.orange} textColor={C.bleu} />)}
        </div>
      </Block>

      {/* ── Bloc : Métriques ── */}
      <Block blockKey="metriques" {...blockProps}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, height: '100%', boxSizing: 'border-box' }}>
          {metriques.map((m, i) => (
            <div key={i} style={{ background: '#FFF4E0', borderRadius: 8, padding: '7px 16px', display: 'flex', alignItems: 'center', gap: 8, flex: 1 }}>
              <span style={{ color: C.orange, fontWeight: 400, fontSize: 22, fontFamily: FONT_TITLE, flexShrink: 0, wordSpacing: 'normal', letterSpacing: 'normal' }}>{m.chiffre}</span>
              <span style={txt({ color: C.orange, fontSize: 13 })}>{m.label}</span>
            </div>
          ))}
        </div>
      </Block>
    </div>
  )
}
