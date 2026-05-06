const FONT_TITLE = "'Geomanist', 'Segoe UI', Arial, sans-serif"
const FONT_BODY  = "'Publica Play', 'Segoe UI', Arial, sans-serif"

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

function DecorTopRight() {
  return (
    <svg style={{ position: 'absolute', top: 0, right: 0, pointerEvents: 'none' }} width="220" height="200" viewBox="0 0 220 200" fill="none">
      <g opacity="0.2" stroke="#7dd3fc" strokeWidth="1.5">
        <line x1="220" y1="15" x2="170" y2="15" /><line x1="170" y1="15" x2="145" y2="40" />
        <line x1="145" y1="40" x2="145" y2="90" /><line x1="145" y1="65" x2="100" y2="65" />
        <line x1="220" y1="50" x2="185" y2="50" /><line x1="185" y1="50" x2="160" y2="75" />
        <line x1="160" y1="75" x2="160" y2="130" /><line x1="220" y1="90" x2="175" y2="90" />
        <circle cx="170" cy="15" r="3" fill="#7dd3fc" stroke="none" />
        <circle cx="145" cy="40" r="3" fill="#7dd3fc" stroke="none" />
        <circle cx="145" cy="65" r="3" fill="#7dd3fc" stroke="none" />
        <circle cx="185" cy="50" r="3" fill="#7dd3fc" stroke="none" />
        <circle cx="160" cy="75" r="3" fill="#7dd3fc" stroke="none" />
        <circle cx="175" cy="90" r="3" fill="#7dd3fc" stroke="none" />
      </g>
    </svg>
  )
}

function DecorTopLeft() {
  return (
    <svg style={{ position: 'absolute', top: 0, left: 0, pointerEvents: 'none' }} width="180" height="160" viewBox="0 0 180 160" fill="none">
      <g opacity="0.2" stroke="#f97316" strokeWidth="1.5">
        <line x1="0" y1="18" x2="50" y2="18" /><line x1="50" y1="18" x2="75" y2="43" />
        <line x1="75" y1="43" x2="75" y2="85" /><line x1="75" y1="60" x2="120" y2="60" />
        <line x1="0" y1="55" x2="35" y2="55" /><line x1="35" y1="55" x2="60" y2="80" />
        <line x1="60" y1="80" x2="60" y2="110" />
        <circle cx="50" cy="18" r="3" fill="#f97316" stroke="none" />
        <circle cx="75" cy="43" r="3" fill="#f97316" stroke="none" />
        <circle cx="75" cy="60" r="3" fill="#f97316" stroke="none" />
        <circle cx="35" cy="55" r="3" fill="#f97316" stroke="none" />
        <circle cx="60" cy="80" r="3" fill="#f97316" stroke="none" />
      </g>
    </svg>
  )
}

function Badge({ children }) {
  return (
    <div style={{
      display: 'inline-block',
      background: '#1a2f5e', color: '#ffffff',
      borderRadius: 4, padding: '3px 14px',
      fontSize: 12, fontWeight: 700,
      marginBottom: 6, letterSpacing: 0,
      fontFamily: FONT_TITLE,
    }}>{children}</div>
  )
}

function Bullet({ text, dotColor = '#f97316', textColor = '#334155', bold = false }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 7, marginBottom: 4 }}>
      <span style={{
        color: dotColor, fontWeight: 700, flexShrink: 0,
        fontSize: 14, lineHeight: '17px', fontFamily: FONT_BODY,
      }}>•</span>
      <span style={{
        fontSize: 12.5, color: textColor, lineHeight: 1.45,
        fontWeight: bold ? 700 : 400, fontFamily: FONT_BODY,
        letterSpacing: 0, wordSpacing: 'normal',
      }}>{text}</span>
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
      background: '#ffffff',
      fontFamily: FONT_TITLE,
      display: 'flex', flexDirection: 'column',
      overflow: 'hidden', position: 'relative',
      textAlign: 'left',
      letterSpacing: 0, wordSpacing: 'normal',
    }}>
      <DecorTopLeft />
      <DecorTopRight />

      {/* Header */}
      <div style={{
        background: '#1a2f5e', padding: '0 32px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        height: 76, flexShrink: 0, position: 'relative', zIndex: 1,
      }}>
        <span style={{
          color: '#ffffff', fontSize: 27, fontWeight: 700,
          letterSpacing: 0, flex: 1, fontFamily: FONT_TITLE,
        }}>{t}</span>
        <span style={{
          color: '#f97316', fontWeight: 700, fontSize: 24,
          marginLeft: 20, flexShrink: 0, fontFamily: FONT_TITLE,
        }}>point.</span>
      </div>

      {/* Sous-titre */}
      <div style={{
        padding: '8px 32px 4px',
        color: '#2563eb', fontSize: 14, fontWeight: 600,
        flexShrink: 0, fontFamily: FONT_BODY,
        letterSpacing: 0, wordSpacing: 'normal',
      }}>{st}</div>

      {/* Body */}
      <div style={{
        display: 'flex', flex: 1,
        padding: '6px 28px 0', gap: 20,
        overflow: 'hidden', minHeight: 0,
      }}>

        {/* Colonne gauche 65% */}
        <div style={{
          flex: '0 0 65%', display: 'flex', flexDirection: 'column',
          gap: 10, paddingBottom: 10, minHeight: 0,
        }}>
          {/* Contexte */}
          <div style={{ background: '#f1f5f9', borderRadius: 8, padding: '8px 14px', flexShrink: 0 }}>
            {ctx.map((line, i) => <Bullet key={i} text={line} />)}
          </div>

          {/* Tags */}
          <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
            {tgs.map((tag, i) => (
              <span key={i} style={{
                border: '1px solid #94a3b8', background: '#ffffff',
                color: '#475569', borderRadius: 4,
                padding: '3px 14px', fontSize: 12, fontWeight: 500,
                fontFamily: FONT_BODY, letterSpacing: 0,
              }}>{tag}</span>
            ))}
          </div>

          {/* Périmètre */}
          <div style={{ flexShrink: 0 }}>
            <Badge>Périmètre</Badge>
            {per.map((line, i) => (
              <Bullet key={i} text={line} textColor="#1a2f5e" bold />
            ))}
          </div>

          {/* Enjeux clés — flex: 1 pour occuper l'espace restant */}
          <div style={{ flex: 1 }}>
            <Badge>Les enjeux clés</Badge>
            {enj.map((line, i) => <Bullet key={i} text={line} />)}
          </div>
        </div>

        {/* Colonne droite 35% */}
        <div style={{
          flex: '0 0 35%', display: 'flex', flexDirection: 'column',
          gap: 10, paddingBottom: 10, minHeight: 0,
        }}>
          {/* Logo */}
          {logo_url ? (
            <div style={{
              display: 'flex', justifyContent: 'center', alignItems: 'center',
              height: 72, background: '#f8fafc', borderRadius: 8, flexShrink: 0,
            }}>
              <img src={logo_url} alt="logo client" style={{ maxHeight: 58, maxWidth: '100%', objectFit: 'contain' }} />
            </div>
          ) : (
            <div style={{
              height: 72, background: '#f1f5f9', borderRadius: 8, flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <span style={{
                color: '#94a3b8', fontSize: 12, fontStyle: 'italic',
                textAlign: 'center', lineHeight: 1.5, fontFamily: FONT_BODY,
              }}>Remplacer par<br />logo client</span>
            </div>
          )}

          {/* Notre impact — flex: 1 pour pousser les métriques en bas */}
          <div style={{ flex: 1 }}>
            <div style={{
              background: '#f97316', color: '#ffffff',
              borderRadius: 6, padding: '8px 14px',
              fontSize: 14, fontWeight: 700, marginBottom: 10,
              textAlign: 'center', fontFamily: FONT_BODY, letterSpacing: 0,
            }}>Notre impact</div>
            {imp.map((line, i) => <Bullet key={i} text={line} dotColor="#2563eb" />)}
          </div>

          {/* Métriques */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5, flexShrink: 0 }}>
            {metriques.map((m, i) => (
              <div key={i} style={{
                background: '#fef3c7', borderRadius: 6,
                padding: '6px 14px', display: 'flex', alignItems: 'center', gap: 12,
              }}>
                <span style={{
                  color: '#f97316', fontWeight: 800, fontSize: 18,
                  minWidth: 44, fontFamily: FONT_TITLE, letterSpacing: 0, fontWeight: 700,
                }}>{m.chiffre}</span>
                <span style={{
                  color: '#78350f', fontSize: 12,
                  fontFamily: FONT_BODY, letterSpacing: 0,
                }}>{m.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div style={{
        borderTop: '3px solid #1a2f5e',
        margin: '6px 28px 0',
        paddingTop: 4, paddingBottom: 8,
        display: 'flex', justifyContent: 'flex-end', alignItems: 'center',
        flexShrink: 0,
      }}>
        <span style={{
          color: '#1a2f5e', fontWeight: 800, fontSize: 16,
          letterSpacing: 1, fontFamily: FONT_TITLE,
        }}>W.</span>
      </div>
    </div>
  )
}
