import { useEffect, useRef, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import html2canvas from 'html2canvas'
import { supabase } from '../supabaseClient'
import SlideTemplate, { DEFAULT_LAYOUT } from '../components/SlideTemplate'

const TOOLBAR_H = 56

function loadLayout(id) {
  try {
    const s = localStorage.getItem(`slide_layout_${id}`)
    return s ? JSON.parse(s) : DEFAULT_LAYOUT
  } catch { return DEFAULT_LAYOUT }
}
function saveLayout(id, layout) {
  localStorage.setItem(`slide_layout_${id}`, JSON.stringify(layout))
}

export default function Preview() {
  const { id } = useParams()
  const navigate = useNavigate()
  const slideRef = useRef(null)
  const saveTimer = useRef(null)

  const [slide, setSlide] = useState(null)
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState(false)
  const [scale, setScale] = useState(1)

  /* Modes */
  const [editMode, setEditMode] = useState(false)       // drag/resize
  const [textEditMode, setTextEditMode] = useState(false) // édition texte inline

  const [layout, setLayout] = useState(DEFAULT_LAYOUT)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    supabase.from('slides').select('*').eq('id', id).single()
      .then(({ data, error }) => {
        if (error) console.error(error)
        else { setSlide(data); setLayout(loadLayout(id)) }
        setLoading(false)
      })
  }, [id])

  useEffect(() => {
    const upd = () => {
      const s = Math.min(window.innerWidth / 1280, (window.innerHeight - TOOLBAR_H) / 720)
      setScale(s)
    }
    upd()
    window.addEventListener('resize', upd)
    return () => window.removeEventListener('resize', upd)
  }, [])

  /* Sauvegarde Supabase debouncée (800ms) */
  const schedSave = (updated) => {
    if (saveTimer.current) clearTimeout(saveTimer.current)
    setSaving(true)
    saveTimer.current = setTimeout(async () => {
      const { error } = await supabase.from('slides').update({
        titre:              updated.titre,
        sous_titre:         updated.sous_titre,
        contexte:           updated.contexte,
        tags:               updated.tags,
        perimetre:          updated.perimetre,
        enjeux:             updated.enjeux,
        impact:             updated.impact,
        metrique_1_chiffre: updated.metrique_1_chiffre,
        metrique_1_label:   updated.metrique_1_label,
        metrique_2_chiffre: updated.metrique_2_chiffre,
        metrique_2_label:   updated.metrique_2_label,
        metrique_3_chiffre: updated.metrique_3_chiffre,
        metrique_3_label:   updated.metrique_3_label,
      }).eq('id', id)
      if (error) console.error(error)
      setSaving(false)
    }, 800)
  }

  /* Mise à jour d'un champ texte depuis la slide */
  const handleTextChange = (field, idx, value) => {
    setSlide(prev => {
      let updated
      if (idx !== null && idx !== undefined) {
        const arr = [...(prev[field] ?? [])]
        arr[idx] = value
        updated = { ...prev, [field]: arr }
      } else {
        updated = { ...prev, [field]: value }
      }
      schedSave(updated)
      return updated
    })
  }

  const handleLock = () => { saveLayout(id, layout); setEditMode(false) }
  const handleReset = () => { setLayout(DEFAULT_LAYOUT); saveLayout(id, DEFAULT_LAYOUT) }

  const [copied, setCopied] = useState(false)
  const handleCopyLayout = () => {
    navigator.clipboard.writeText(JSON.stringify(layout, null, 2))
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const exportPNG = async () => {
    if (!slideRef.current) return
    setExporting(true)
    try {
      await document.fonts.ready
      const canvas = await html2canvas(slideRef.current, { scale: 2, useCORS: true, width: 1280, height: 720 })
      const link = document.createElement('a')
      link.download = `${slide?.titre || 'slide'}.png`
      link.href = canvas.toDataURL('image/png')
      link.click()
    } finally { setExporting(false) }
  }

  if (loading) return <p style={{ padding: 32, color: '#64748b' }}>Chargement…</p>
  if (!slide)  return <p style={{ padding: 32, color: '#dc2626' }}>Slide introuvable.</p>

  const activeMode = editMode ? 'layout' : textEditMode ? 'text' : null

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: '#0f172a' }}>

      {/* ── Toolbar ── */}
      <div style={{ height: TOOLBAR_H, display: 'flex', alignItems: 'center', gap: 8, padding: '0 16px', background: '#1e293b', flexShrink: 0 }}>

        <button onClick={() => navigate('/')} style={btn('#475569')}>← Biblio</button>

        <div style={{ width: 1, height: 24, background: '#334155' }} />

        {/* Mode texte */}
        {activeMode !== 'layout' && (
          !textEditMode ? (
            <button onClick={() => setTextEditMode(true)} style={btn('#1f3fa3')}>✍️ Éditer le texte</button>
          ) : (
            <>
              <button onClick={() => setTextEditMode(false)} style={btn('#16a34a')}>✓ Terminer</button>
              <span style={{ color: saving ? '#f08a2a' : '#94a3b8', fontSize: 12 }}>
                {saving ? 'Sauvegarde…' : '✓ Sauvegardé'}
              </span>
            </>
          )
        )}

        {/* Mode layout */}
        {activeMode !== 'text' && (
          !editMode ? (
            <button onClick={() => setEditMode(true)} style={btn('#475569', 12)}>⊞ Mise en page</button>
          ) : (
            <>
              <button onClick={handleLock} style={btn('#16a34a')}>🔒 Verrouiller</button>
              <button onClick={handleReset} style={btn('#64748b', 12)}>Réinit.</button>
              <button onClick={handleCopyLayout} style={btn(copied ? '#16a34a' : '#7c3aed', 12)}>
                {copied ? '✓ Copié' : '📋 Copier layout'}
              </button>
              <span style={{ color: '#94a3b8', fontSize: 11 }}>Glisse · redimensionne</span>
            </>
          )
        )}

        <div style={{ flex: 1 }} />

        <button
          onClick={exportPNG}
          disabled={exporting || !!activeMode}
          style={btn('#f08a2a')}
        >
          {exporting ? 'Export…' : 'Exporter PNG'}
        </button>
      </div>

      {/* ── Slide ── */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
        <div style={{ width: 1280 * scale, height: 720 * scale, position: 'relative', flexShrink: 0 }}>
          <div style={{ width: 1280, height: 720, transform: `scale(${scale})`, transformOrigin: 'top left', position: 'absolute', top: 0, left: 0 }}>
            <div ref={slideRef}>
              <SlideTemplate
                {...slide}
                editMode={editMode}
                textEditMode={textEditMode}
                layout={layout}
                onLayoutChange={setLayout}
                onTextChange={handleTextChange}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Hint mode texte */}
      {textEditMode && (
        <div style={{ position: 'fixed', bottom: 16, left: '50%', transform: 'translateX(-50%)', background: 'rgba(31,63,163,0.92)', color: '#fff', borderRadius: 8, padding: '8px 20px', fontSize: 13, fontFamily: 'Arial', zIndex: 100, pointerEvents: 'none' }}>
          Clique sur n'importe quel texte pour l'éditer · Entrée ou Tab pour valider · Échap pour annuler
        </div>
      )}
    </div>
  )
}

function btn(bg, size = 13) {
  return { background: bg, color: '#fff', border: 'none', borderRadius: 6, padding: '7px 13px', fontSize: size, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }
}
