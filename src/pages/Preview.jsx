import { useEffect, useRef, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import html2canvas from 'html2canvas'
import { supabase } from '../supabaseClient'
import SlideTemplate, { DEFAULT_LAYOUT } from '../components/SlideTemplate'

const TOOLBAR_H = 56

function loadLayout(id) {
  try {
    const saved = localStorage.getItem(`slide_layout_${id}`)
    return saved ? JSON.parse(saved) : DEFAULT_LAYOUT
  } catch { return DEFAULT_LAYOUT }
}

function saveLayout(id, layout) {
  localStorage.setItem(`slide_layout_${id}`, JSON.stringify(layout))
}

export default function Preview() {
  const { id } = useParams()
  const navigate = useNavigate()
  const slideRef = useRef(null)
  const [slide, setSlide] = useState(null)
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState(false)
  const [scale, setScale] = useState(1)
  const [editMode, setEditMode] = useState(false)
  const [layout, setLayout] = useState(DEFAULT_LAYOUT)

  useEffect(() => {
    supabase.from('slides').select('*').eq('id', id).single()
      .then(({ data, error }) => {
        if (error) console.error(error)
        else {
          setSlide(data)
          setLayout(loadLayout(id))
        }
        setLoading(false)
      })
  }, [id])

  useEffect(() => {
    const updateScale = () => {
      const s = Math.min(window.innerWidth / 1280, (window.innerHeight - TOOLBAR_H) / 720)
      setScale(s)
    }
    updateScale()
    window.addEventListener('resize', updateScale)
    return () => window.removeEventListener('resize', updateScale)
  }, [])

  const handleLock = () => {
    saveLayout(id, layout)
    setEditMode(false)
  }

  const handleReset = () => {
    setLayout(DEFAULT_LAYOUT)
    saveLayout(id, DEFAULT_LAYOUT)
  }

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
      const canvas = await html2canvas(slideRef.current, {
        scale: 2, useCORS: true, width: 1280, height: 720,
      })
      const link = document.createElement('a')
      link.download = `${slide?.titre || 'slide'}.png`
      link.href = canvas.toDataURL('image/png')
      link.click()
    } finally { setExporting(false) }
  }

  if (loading) return <p style={{ padding: 32, color: '#64748b' }}>Chargement…</p>
  if (!slide) return <p style={{ padding: 32, color: '#dc2626' }}>Slide introuvable.</p>

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: '#0f172a' }}>
      {/* Toolbar */}
      <div style={{
        height: TOOLBAR_H, display: 'flex', alignItems: 'center',
        gap: 10, padding: '0 20px', background: '#1e293b', flexShrink: 0,
      }}>
        <button onClick={() => navigate('/')} style={btn('#475569')}>← Bibliothèque</button>
        <button onClick={() => navigate(`/editeur/${id}`)} style={btn('#1e3a7a')}>Modifier contenu</button>

        <div style={{ width: 1, height: 28, background: '#334155', margin: '0 4px' }} />

        {!editMode ? (
          <button onClick={() => setEditMode(true)} style={btn('#002882')}>
            ✏️ Éditer la mise en page
          </button>
        ) : (
          <>
            <button onClick={handleLock} style={btn('#16a34a')}>
              🔒 Verrouiller
            </button>
            <button onClick={handleReset} style={{ ...btn('#64748b'), fontSize: 12 }}>
              Réinitialiser
            </button>
            <button onClick={handleCopyLayout} style={{ ...btn(copied ? '#16a34a' : '#7c3aed'), fontSize: 12 }}>
              {copied ? '✓ Copié !' : '📋 Copier le layout'}
            </button>
            <span style={{ color: '#94a3b8', fontSize: 12, marginLeft: 4 }}>
              Glisse · redimensionne · puis colle le layout à Claude
            </span>
          </>
        )}

        <div style={{ flex: 1 }} />
        <button onClick={exportPNG} disabled={exporting || editMode} style={btn('#F98F03')}>
          {exporting ? 'Export…' : 'Exporter PNG'}
        </button>
      </div>

      {/* Slide */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
        <div style={{ width: 1280 * scale, height: 720 * scale, position: 'relative', flexShrink: 0 }}>
          <div style={{
            width: 1280, height: 720,
            transform: `scale(${scale})`,
            transformOrigin: 'top left',
            position: 'absolute', top: 0, left: 0,
          }}>
            <div ref={slideRef}>
              <SlideTemplate
                {...slide}
                editMode={editMode}
                layout={layout}
                onLayoutChange={setLayout}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function btn(bg) {
  return {
    background: bg, color: '#fff', border: 'none',
    borderRadius: 6, padding: '8px 14px',
    fontSize: 13, fontWeight: 600, cursor: 'pointer',
    whiteSpace: 'nowrap',
  }
}
