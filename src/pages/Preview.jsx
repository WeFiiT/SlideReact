import { useEffect, useRef, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import html2canvas from 'html2canvas'
import { supabase } from '../supabaseClient'
import SlideTemplate from '../components/SlideTemplate'

const TOOLBAR_H = 56

export default function Preview() {
  const { id } = useParams()
  const navigate = useNavigate()
  const slideRef = useRef(null)
  const [slide, setSlide] = useState(null)
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState(false)
  const [scale, setScale] = useState(1)

  useEffect(() => {
    supabase
      .from('slides')
      .select('*')
      .eq('id', id)
      .single()
      .then(({ data, error }) => {
        if (error) console.error(error)
        else setSlide(data)
        setLoading(false)
      })
  }, [id])

  useEffect(() => {
    const updateScale = () => {
      const s = Math.min(
        window.innerWidth / 1280,
        (window.innerHeight - TOOLBAR_H) / 720
      )
      setScale(s)
    }
    updateScale()
    window.addEventListener('resize', updateScale)
    return () => window.removeEventListener('resize', updateScale)
  }, [])

  const exportPNG = async () => {
    if (!slideRef.current) return
    setExporting(true)
    try {
      const canvas = await html2canvas(slideRef.current, {
        scale: 2,
        useCORS: true,
        width: 1280,
        height: 720,
      })
      const link = document.createElement('a')
      link.download = `${slide?.titre || 'slide'}.png`
      link.href = canvas.toDataURL('image/png')
      link.click()
    } finally {
      setExporting(false)
    }
  }

  if (loading) return <p style={{ padding: 32, color: '#64748b' }}>Chargement…</p>
  if (!slide) return <p style={{ padding: 32, color: '#dc2626' }}>Slide introuvable.</p>

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: '#0f172a' }}>
      {/* Toolbar */}
      <div style={{
        height: TOOLBAR_H,
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '0 20px',
        background: '#1e293b',
        flexShrink: 0,
      }}>
        <button onClick={() => navigate('/')} style={btn('#475569')}>← Bibliothèque</button>
        <button onClick={() => navigate(`/editeur/${id}`)} style={btn('#1a2f5e')}>Modifier</button>
        <button onClick={exportPNG} disabled={exporting} style={btn('#f97316')}>
          {exporting ? 'Export…' : 'Exporter PNG'}
        </button>
      </div>

      {/* Slide centrée et scalée */}
      <div style={{
        flex: 1,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        overflow: 'hidden',
      }}>
        <div style={{ width: 1280 * scale, height: 720 * scale, position: 'relative', flexShrink: 0 }}>
          <div style={{
            width: 1280, height: 720,
            transform: `scale(${scale})`,
            transformOrigin: 'top left',
            position: 'absolute', top: 0, left: 0,
          }}>
            <div ref={slideRef}>
              <SlideTemplate {...slide} />
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
    borderRadius: 6, padding: '8px 16px',
    fontSize: 13, fontWeight: 600, cursor: 'pointer',
  }
}
