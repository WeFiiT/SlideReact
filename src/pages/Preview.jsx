import { useEffect, useRef, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import html2canvas from 'html2canvas'
import { supabase } from '../supabaseClient'
import SlideTemplate from '../components/SlideTemplate'

export default function Preview() {
  const { id } = useParams()
  const navigate = useNavigate()
  const slideRef = useRef(null)
  const [slide, setSlide] = useState(null)
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState(false)

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
      link.download = `${slide.titre || 'slide'}.png`
      link.href = canvas.toDataURL('image/png')
      link.click()
    } finally {
      setExporting(false)
    }
  }

  if (loading) return <p style={{ padding: 32, color: '#64748b' }}>Chargement…</p>
  if (!slide) return <p style={{ padding: 32, color: '#dc2626' }}>Slide introuvable.</p>

  return (
    <div style={{ padding: '24px 32px' }}>
      <div style={{ display: 'flex', gap: 12, marginBottom: 24, alignItems: 'center' }}>
        <button onClick={() => navigate('/')} style={btnStyle('#64748b')}>← Bibliothèque</button>
        <button onClick={() => navigate(`/editeur/${id}`)} style={btnStyle('#1a2f5e')}>Modifier</button>
        <button onClick={exportPNG} disabled={exporting} style={btnStyle('#f97316')}>
          {exporting ? 'Export…' : 'Exporter en PNG'}
        </button>
      </div>

      <div style={{ overflow: 'auto' }}>
        <div ref={slideRef} style={{ display: 'inline-block' }}>
          <SlideTemplate {...slide} />
        </div>
      </div>
    </div>
  )
}

function btnStyle(bg) {
  return {
    background: bg,
    color: '#fff',
    border: 'none',
    borderRadius: 7,
    padding: '9px 18px',
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
  }
}
