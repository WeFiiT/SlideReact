import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import SlideTemplate, { DEFAULT_LAYOUT } from './SlideTemplate'
import { TYPE_COLORS, computeStatus, STATUS_STYLES } from '../constants'

export default function SlideCard({ slide, onDeleted }) {
  const navigate = useNavigate()
  const thumbRef = useRef(null)
  const [thumbScale, setThumbScale] = useState(0.25)
  const [consultant, setConsultant] = useState(null)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)

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
    setDeleting(true)
    const { error } = await supabase.from('slides').delete().eq('id', slide.id)
    if (!error) { onDeleted(slide.id) }
    else { setDeleting(false); setConfirmDelete(false); alert('Erreur lors de la suppression.') }
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
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, marginBottom: 4 }}>
          <div style={{ fontWeight: 700, fontSize: 15, color: '#002882', lineHeight: 1.3 }}>
            {consultant?.card_titre || slide.titre || '(sans titre)'}
          </div>
          {(() => { const s = STATUS_STYLES[computeStatus(slide)]; return (
            <span style={{ flexShrink: 0, fontSize: 11, fontWeight: 700, color: s.color, background: s.bg, borderRadius: 20, padding: '2px 10px', display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: s.dot, display: 'inline-block' }} />
              {s.label}
            </span>
          )})()}
        </div>
        {slide.sous_titre && (
          <div style={{ fontSize: 12, color: '#64748b', fontStyle: 'italic', marginBottom: 8, lineHeight: 1.4 }}>
            {slide.sous_titre}
          </div>
        )}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8, flexWrap: 'wrap', gap: 6 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 11, color: '#94a3b8' }}>{dateStr}</span>
            {slide.type_mission && (
              <span style={{ fontSize: 11, fontWeight: 700, color: TYPE_COLORS[slide.type_mission] || '#475569', background: (TYPE_COLORS[slide.type_mission] || '#475569') + '18', borderRadius: 20, padding: '2px 9px' }}>
                {slide.type_mission}
              </span>
            )}
          </div>
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
        <button onClick={() => setConfirmDelete(true)} style={{ ...btn('#dc2626'), marginLeft: 'auto', padding: '7px 12px' }} title="Supprimer">
          ✕
        </button>
      </div>

      {/* Modale de confirmation */}
      {confirmDelete && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000 }}
          onClick={(e) => { if (e.target === e.currentTarget && !deleting) setConfirmDelete(false) }}
        >
          <div style={{ background: '#fff', borderRadius: 12, padding: '28px 28px 24px', width: 380, boxShadow: '0 20px 60px rgba(0,0,0,0.25)' }}>
            <div style={{ fontSize: 20, marginBottom: 10 }}>🗑️</div>
            <div style={{ fontWeight: 700, fontSize: 16, color: '#1e293b', marginBottom: 6 }}>Supprimer cette slide ?</div>
            <div style={{ fontSize: 13, color: '#64748b', marginBottom: 24, lineHeight: 1.5 }}>
              « {consultant?.card_titre || slide.titre || 'Sans titre'} » sera supprimée définitivement.
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={handleDelete}
                disabled={deleting}
                style={{ flex: 1, background: '#dc2626', color: '#fff', border: 'none', borderRadius: 7, padding: '10px 0', fontWeight: 700, fontSize: 14, cursor: deleting ? 'default' : 'pointer', opacity: deleting ? 0.7 : 1 }}
              >
                {deleting ? 'Suppression…' : 'Supprimer'}
              </button>
              <button
                onClick={() => setConfirmDelete(false)}
                disabled={deleting}
                style={{ flex: 1, background: '#f1f5f9', color: '#475569', border: 'none', borderRadius: 7, padding: '10px 0', fontWeight: 600, fontSize: 14, cursor: 'pointer' }}
              >
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}
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
