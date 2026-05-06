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
  return (
    <div style={{
      width: 1280,
      height: 720,
      background: '#ffffff',
      fontFamily: "'Segoe UI', Arial, sans-serif",
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
      position: 'relative',
    }}>
      {/* Header */}
      <div style={{
        background: '#1a2f5e',
        padding: '16px 32px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        minHeight: 72,
      }}>
        <span style={{ color: '#ffffff', fontSize: 26, fontWeight: 700, letterSpacing: 0.5 }}>
          {titre}
        </span>
        <span style={{ color: '#f97316', fontWeight: 700, fontSize: 22 }}>point.</span>
      </div>

      {/* Sous-titre */}
      <div style={{ padding: '10px 32px 6px', color: '#2563eb', fontSize: 15, fontWeight: 600 }}>
        {sous_titre}
      </div>

      {/* Body */}
      <div style={{ display: 'flex', flex: 1, padding: '8px 32px 0', gap: 24, overflow: 'hidden' }}>
        {/* Colonne gauche 65% */}
        <div style={{ flex: '0 0 65%', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {/* Bloc contexte */}
          <div style={{ background: '#f1f5f9', borderRadius: 8, padding: '10px 14px' }}>
            {contexte.map((line, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: i < contexte.length - 1 ? 4 : 0 }}>
                <span style={{ color: '#f97316', fontWeight: 700, marginTop: 1 }}>•</span>
                <span style={{ fontSize: 13, color: '#334155' }}>{line}</span>
              </div>
            ))}
          </div>

          {/* Tags */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {tags.map((tag, i) => (
              <span key={i} style={{
                background: '#e2e8f0',
                color: '#475569',
                borderRadius: 20,
                padding: '3px 12px',
                fontSize: 12,
                fontWeight: 500,
              }}>{tag}</span>
            ))}
          </div>

          {/* Périmètre */}
          <div>
            <div style={{
              display: 'inline-block',
              background: '#1a2f5e',
              color: '#ffffff',
              borderRadius: 4,
              padding: '2px 12px',
              fontSize: 12,
              fontWeight: 700,
              marginBottom: 6,
            }}>Périmètre</div>
            {perimetre.map((line, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 3 }}>
                <span style={{ color: '#f97316', fontWeight: 700, marginTop: 1 }}>•</span>
                <span style={{ fontSize: 13, color: '#334155' }}>{line}</span>
              </div>
            ))}
          </div>

          {/* Enjeux clés */}
          <div>
            <div style={{
              display: 'inline-block',
              background: '#1a2f5e',
              color: '#ffffff',
              borderRadius: 4,
              padding: '2px 12px',
              fontSize: 12,
              fontWeight: 700,
              marginBottom: 6,
            }}>Les enjeux clés</div>
            {enjeux.map((line, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 3 }}>
                <span style={{ color: '#f97316', fontWeight: 700, marginTop: 1 }}>•</span>
                <span style={{ fontSize: 13, color: '#334155' }}>{line}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Colonne droite 35% */}
        <div style={{ flex: '0 0 35%', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {/* Logo */}
          {logo_url ? (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 70 }}>
              <img src={logo_url} alt="logo client" style={{ maxHeight: 60, maxWidth: '100%', objectFit: 'contain' }} />
            </div>
          ) : (
            <div style={{ height: 70, background: '#f1f5f9', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ color: '#94a3b8', fontSize: 13 }}>Logo client</span>
            </div>
          )}

          {/* Notre impact badge + bullets */}
          <div>
            <div style={{
              display: 'inline-block',
              background: '#f97316',
              color: '#ffffff',
              borderRadius: 4,
              padding: '2px 12px',
              fontSize: 12,
              fontWeight: 700,
              marginBottom: 6,
            }}>Notre impact</div>
            {impact.map((line, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 3 }}>
                <span style={{ color: '#2563eb', fontWeight: 700, marginTop: 1 }}>•</span>
                <span style={{ fontSize: 13, color: '#334155' }}>{line}</span>
              </div>
            ))}
          </div>

          {/* Métriques */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 4 }}>
            {[
              { chiffre: metrique_1_chiffre, label: metrique_1_label },
              { chiffre: metrique_2_chiffre, label: metrique_2_label },
              { chiffre: metrique_3_chiffre, label: metrique_3_label },
            ].filter(m => m.chiffre).map((m, i) => (
              <div key={i} style={{
                background: '#fef3c7',
                borderRadius: 6,
                padding: '6px 12px',
                display: 'flex',
                alignItems: 'center',
                gap: 10,
              }}>
                <span style={{ color: '#f97316', fontWeight: 800, fontSize: 20, minWidth: 48 }}>{m.chiffre}</span>
                <span style={{ color: '#78350f', fontSize: 12 }}>{m.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div style={{
        borderTop: '3px solid #1a2f5e',
        margin: '8px 32px 0',
        paddingTop: 6,
        paddingBottom: 10,
        display: 'flex',
        justifyContent: 'flex-end',
        alignItems: 'center',
      }}>
        <span style={{ color: '#1a2f5e', fontWeight: 800, fontSize: 18, letterSpacing: 1 }}>WeFiiT</span>
      </div>
    </div>
  )
}
