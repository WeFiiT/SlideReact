/* Charte WeFiiT — Publica Play = titres, Geomanist = corps */
const FONT_TITLE = "'Publica Play', Arial, sans-serif"
const FONT_BODY  = "'Geomanist', Arial, sans-serif"

/* Couleurs officielles WeFiiT */
const C = {
  bleu:       '#002882',
  orange:     '#F98F03',
  blanc:      '#FFFFFF',
  grisClair:  '#F8FAFB',
  grisNeutre: '#E7E6E6',
  texte:      '#1e293b',
}

const txt = (overrides = {}) => ({
  fontFamily: FONT_BODY,
  textAlign: 'left',
  wordSpacing: 'normal',
  letterSpacing: 'normal',
  fontKerning: 'none',
  ...overrides,
})

const PH = {
  titre: 'Immersion PM – Enjeu/pbmatique mission.',
  sous_titre: "Périmètre fonctionnel : PM sur l'app/web, sur périmètre… fonctionnalité X...",
  contexte: [
    "Description entreprise et organisation : présentation client, CA",
    "Enjeux globaux d'entreprise / contexte marché",
    "Parties prenantes : Marketing, Business, Comex...",
  ],
  tags: ["X utilisateurs", "KPI 1", "Secteur", "B2C/B2B"],
  perimetre: [
    "App / Web – Front / Back",
    "Place dans l'organisation : Tribe X au sein de la Direction Y",
    "Composition de la squad : Squad X, composée de x devs / x QA / x PO...",
  ],
  enjeux: [
    "Enjeu/OKR de la mission 1 [augmenter les revenus/améliorer la conversion...]",
    "Enjeu/OKR de la mission 2 [livrer la fonctionnalité/projet X...]",
    "Enjeu/OKR de la mission 3 [optimiser l'organisation, optimiser le modèle de donnée...]",
  ],
  impact: [
    "Pourquoi ça fité ? Mise en place de process, alignement de parties prenantes (tech x Produit...)",
    "Initiatives stratégiques ? Généralisation méthode Discovery pour dérisquer...",
    "Evolutions d'organisation ? ...",
  ],
  metriques: [
    { chiffre: '+X%', label: 'de conversion' },
    { chiffre: 'X€', label: '/an de CA' },
    { chiffre: 'X', label: 'de xxxxx' },
  ],
}

function fill(arr, phs) {
  return phs.map((ph, i) => (arr?.[i]?.trim() ? arr[i] : ph))
}

/* Motif "fil" WeFiiT — coin bas-droit, W=1280 H=720 */
function FilMotif() {
  return (
    <svg
      style={{ position: 'absolute', bottom: 0, right: 0, pointerEvents: 'none', zIndex: 0 }}
      width="680" height="380"
      viewBox="600 340 680 380"
      fill="none"
    >
      <g opacity="0.22" stroke="#4a6ad0" strokeWidth="5" strokeLinecap="round">
        <path d="M 1280 720 Q 1180 720 1180 620 Q 1180 520 1080 520 Q 1080 620 980 620 Q 980 720 880 720" />
        <path d="M 1280 720 Q 1150 720 1150 590 Q 1150 460 1020 460 Q 1020 590 890 590 Q 890 720 760 720" />
        <path d="M 1280 720 Q 1120 720 1120 560 Q 1120 400 960 400 Q 960 560 800 560 Q 800 720 640 720" />
      </g>
    </svg>
  )
}

/* Point orange WeFiiT — accent décoratif */
function OrangeDot({ x, y, r = 6 }) {
  return <circle cx={x} cy={y} r={r} fill={C.orange} />
}

function Badge({ children }) {
  return (
    <div style={{
      display: 'inline-block',
      background: C.bleu, color: C.blanc,
      borderRadius: 4, padding: '3px 14px',
      fontSize: 13, fontWeight: 400,
      marginBottom: 6,
      fontFamily: FONT_TITLE,
      textAlign: 'left',
      wordSpacing: 'normal',
      letterSpacing: 'normal',
    }}>{children}</div>
  )
}

function Bullet({ text, dotColor, textColor = C.texte, bold = false }) {
  const dot = dotColor || C.orange
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 7, marginBottom: 5 }}>
      <span style={{
        color: dot, fontWeight: 700, flexShrink: 0,
        fontSize: 15, lineHeight: '18px',
        fontFamily: FONT_BODY,
      }}>•</span>
      <span style={txt({
        fontSize: 13, color: textColor,
        lineHeight: 1.4,
        fontWeight: bold ? 700 : 400,
      })}>{text}</span>
    </div>
  )
}

export default function SlideTemplate({
  titre = '',
  sous_titre = '',
  contexte = [],
  tags = [],
  perimetre = [],
  enjeux = [],
  impact = [],
  metrique_1_chiffre = '',
  metrique_1_label = '',
  metrique_2_chiffre = '',
  metrique_2_label = '',
  metrique_3_chiffre = '',
  metrique_3_label = '',
  logo_url = '',
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

  return (
    <div style={{
      width: 1280, height: 720,
      background: C.blanc,
      fontFamily: FONT_BODY,
      display: 'flex', flexDirection: 'column',
      overflow: 'hidden', position: 'relative',
      textAlign: 'left',
      wordSpacing: 'normal',
      letterSpacing: 'normal',
    }}>
      {/* Motif "fil" WeFiiT — coin bas-droit */}
      <FilMotif />

      {/* Points orange décoratifs */}
      <svg style={{ position: 'absolute', top: 0, left: 0, pointerEvents: 'none', zIndex: 0, width: 1280, height: 78, overflow: 'visible' }}>
        <OrangeDot x={1240} y={39} r={5} />
        <OrangeDot x={1255} y={39} r={3} />
      </svg>

      {/* Header */}
      <div style={{
        background: C.bleu, padding: '0 32px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        height: 78, flexShrink: 0, position: 'relative', zIndex: 1,
      }}>
        <span style={{
          color: C.blanc, fontSize: 27, fontWeight: 400,
          flex: 1, fontFamily: FONT_TITLE,
          textAlign: 'left', wordSpacing: 'normal', letterSpacing: 'normal',
        }}>{t}</span>
        <span style={{
          color: C.orange, fontWeight: 400, fontSize: 24,
          marginLeft: 20, flexShrink: 0, fontFamily: FONT_TITLE,
          wordSpacing: 'normal', letterSpacing: 'normal',
        }}>point.</span>
      </div>

      {/* Sous-titre */}
      <div style={txt({
        padding: '8px 32px 5px',
        color: C.bleu, fontSize: 14, fontWeight: 400,
        flexShrink: 0, fontFamily: FONT_TITLE,
      })}>{st}</div>

      {/* Body */}
      <div style={{
        display: 'flex', flex: 1,
        padding: '6px 28px 0', gap: 20,
        overflow: 'hidden', minHeight: 0,
      }}>

        {/* Colonne gauche — 13/20 */}
        <div style={{
          flex: 13, minWidth: 0,
          display: 'flex', flexDirection: 'column',
          gap: 10, paddingBottom: 10,
        }}>
          {/* Contexte */}
          <div style={{ background: C.grisClair, borderRadius: 8, padding: '8px 14px', flexShrink: 0 }}>
            {ctx.map((line, i) => <Bullet key={i} text={line} />)}
          </div>

          {/* Tags */}
          <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
            {tgs.map((tag, i) => (
              <span key={i} style={txt({
                border: `1px solid ${C.grisNeutre}`,
                background: C.blanc,
                color: C.texte, borderRadius: 4,
                padding: '3px 14px', fontSize: 12, fontWeight: 400,
              })}>{tag}</span>
            ))}
          </div>

          {/* Périmètre */}
          <div style={{ flexShrink: 0 }}>
            <Badge>Périmètre</Badge>
            {per.map((line, i) => <Bullet key={i} text={line} textColor={C.bleu} bold />)}
          </div>

          {/* Enjeux */}
          <div style={{ flex: 1, minHeight: 0 }}>
            <Badge>Les enjeux clés</Badge>
            {enj.map((line, i) => <Bullet key={i} text={line} />)}
          </div>
        </div>

        {/* Colonne droite — 7/20 */}
        <div style={{
          flex: 7, minWidth: 0,
          display: 'flex', flexDirection: 'column',
          gap: 10, paddingBottom: 10,
        }}>
          {/* Logo client */}
          {logo_url ? (
            <div style={{
              display: 'flex', justifyContent: 'center', alignItems: 'center',
              height: 74, background: C.grisClair, borderRadius: 8, flexShrink: 0,
            }}>
              <img src={logo_url} alt="logo client" style={{ maxHeight: 60, maxWidth: '100%', objectFit: 'contain' }} />
            </div>
          ) : (
            <div style={{
              height: 74, background: C.grisClair, borderRadius: 8, flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <span style={txt({
                color: '#94a3b8', fontSize: 12, fontStyle: 'italic',
                textAlign: 'center', lineHeight: 1.5,
              })}>Remplacer par<br />logo client</span>
            </div>
          )}

          {/* Notre impact */}
          <div style={{ flex: 1, minHeight: 0 }}>
            <div style={{
              background: C.orange, color: C.blanc,
              borderRadius: 6, padding: '8px 14px',
              fontSize: 15, fontWeight: 400, marginBottom: 10,
              textAlign: 'center',
              fontFamily: FONT_TITLE,
              wordSpacing: 'normal', letterSpacing: 'normal',
            }}>Notre impact</div>
            {imp.map((line, i) => <Bullet key={i} text={line} dotColor={C.bleu} />)}
          </div>

          {/* Métriques */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flexShrink: 0 }}>
            {metriques.map((m, i) => (
              <div key={i} style={{
                background: '#FFF4E0', borderRadius: 6,
                padding: '7px 14px', display: 'flex', alignItems: 'center', gap: 12,
              }}>
                <span style={{
                  color: C.orange, fontWeight: 400, fontSize: 22,
                  minWidth: 52, fontFamily: FONT_TITLE,
                  wordSpacing: 'normal', letterSpacing: 'normal',
                }}>{m.chiffre}</span>
                <span style={txt({ color: C.bleu, fontSize: 13 })}>{m.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div style={{
        borderTop: `3px solid ${C.bleu}`,
        margin: '6px 28px 0',
        paddingTop: 4, paddingBottom: 8,
        display: 'flex', justifyContent: 'flex-end', alignItems: 'center',
        flexShrink: 0, position: 'relative', zIndex: 1,
      }}>
        {/* TODO: remplacer par le logo SVG inline — ajouter Logo_WeFiiT_RVB.svg dans public/logos/ */}
        <span style={{
          color: C.bleu, fontWeight: 400, fontSize: 18,
          fontFamily: FONT_TITLE,
          wordSpacing: 'normal', letterSpacing: 'normal',
        }}>WeFiiT</span>
      </div>
    </div>
  )
}
