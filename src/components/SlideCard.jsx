import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import SlideTemplate, { DEFAULT_LAYOUT } from './SlideTemplate'

export default function SlideCard({ slide, onDeleted }) {
  const navigate = useNavigate()
  const thumbRef = useRef(null)
  const [thumbScale, setThumbScale] = useState(0.25)
  const [consultant, setConsultant] = useState(null)

  useEffect(() => {
    try {
      const c = JSON.parse(localStorage.getItem(`slide_consultant_${slide.id}`) || 'null')
      setConsultant(c)
    } catch {}
  }, [slide.id])

  useEffect(() => {
    if (!thumbRef.current) return
    const update = () => {
      if (thumbRef.current) setThumbScale(thumbRef.current.offsetWidth / 1280)
    }
    update()
    const ro = new ResizeObserver(update)
    ro.observe(thumbRef.current)
    return () => ro.disconnect()
  }, [])

  const handleDelete = async () => {
    if (!confirm(`Supprimer « ${slide.titre} » ?`)) return
    const { error } = await supabase.from('slides').delete().eq('id', slide.id)
    if (!error) onDeleted(slide.id)
    else alert('Erreur lors de la suppression.')
  }

  const dateStr = new Date(slide.created_at).toLocaleDateString('fr-FR', {
    day: '2-digit', month: 'short', year: 'numeric',
  })

  return (
    <div style={{ border: '1px solid #e2e8f0', borderRadius: 12, background: '#fff', overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', display: 'flex', flexDirection: 'column', transition: 'box-shadow 0.15s' }}
      onMouseEnter={(e) => (e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,0,0,0.12)')}
      onMouseLeave={(e) => (e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.06)')}
    >

      {/* Miniature 16:9 */}
      <div
        ref={thumbRef}
        onClick={() => navigate(`/preview/${slide.id}`)}
        style={{ width: '100%', aspectRatio: '16/9', position: 'relative', overflow: 'hidden', background: '#f1f5f9', cursor: 'pointer', flexShrink: 0 }}
      >
        <div style={{ width: 1280, height: 720, transform: `scale(${thumbScale})`, transformOrigin: 'top left', position: 'absolute', top: 0, left: 0, pointerEvents: 'none' }}>
          <SlideTemplate
            {...slide}
            editMode={false}
            textEditMode={false}
            layout={DEFAULT_LAYOUT}
            onLayoutChange={() => {}}
            onTextChange={() => {}}
          />
        </div>
        <div style={{ position: 'absolute', inset: 0, background: 'transparent' }} />
      </div>

      {/* Infos */}
      <div style={{ padding: '14px 16px 10px', flex: 1 }}>
        <div style={{ fontWeight: 700, fontSize: 15, color: '#002882', lineHeight: 1.3, marginBottom: 4 }}>
          {consultant?.card_titre || slide.titre || '(sans titre)'}
        </div>
        {slide.sous_titre && (
          <div style={{ fontSize: 12, color: '#64748b', fontStyle: 'italic', marginBottom: 8, lineHeight: 1.4 }}>
            {slide.sous_titre}
          </div>
        )}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 }}>
          <span style={{ fontSize: 11, color: '#94a3b8' }}>{dateStr}</span>
          {consultant && (
            <span style={{ fontSize: 12, fontWeight: 600, color: '#475569', background: '#f1f5f9', borderRadius: 20, padding: '2px 10px' }}>
              {consultant.prenom} {consultant.nom}
            </span>
          )}
        </div>
      </div>

      {/* CTAs */}
      <div style={{ display: 'flex', gap: 8, padding: '10px 16px 14px', borderTop: '1px solid #f1f5f9' }}>
        <button onClick={() => navigate(`/preview/${slide.id}?edit=1`)} style={btn('#002882', true)}>
          Voir & Éditer
        </button>
        <button onClick={() => navigate(`/preview/${slide.id}?export=1`)} style={btn('#f08a2a')}>
          Exporter
        </button>
        <button onClick={handleDelete} style={{ ...btn('#dc2626'), marginLeft: 'auto', padding: '7px 12px' }} title="Supprimer">
          ✕
        </button>
      </div>
    </div>
  )
}

function btn(bg, flex = false) {
  return {
    background: bg,
    color: '#fff',
    border: 'none',
    borderRadius: 6,
    padding: '7px 14px',
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
    ...(flex ? { flex: 1 } : {}),
  }
}
