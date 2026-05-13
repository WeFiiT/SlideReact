import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import SlideTemplate, { DEFAULT_LAYOUT } from './SlideTemplate'
import { TYPE_COLORS, computeStatus, STATUS_STYLES, normalizeName } from '../constants'
import { getUser } from '../pages/Login'

export default function SlideCard({ slide, onDeleted, onValidated, selectMode = false, selected = false, onSelect }) {
  const navigate = useNavigate()
  const thumbRef = useRef(null)
  const menuRef  = useRef(null)
  const user     = getUser()

  const [thumbScale,      setThumbScale]     = useState(0.25)
  const [showMenu,        setShowMenu]       = useState(false)
  const [confirmDelete,   setConfirmDelete]  = useState(false)
  const [deleting,        setDeleting]       = useState(false)
  const [confirmValidate, setConfirmValidate] = useState(false)
  const [validating,      setValidating]     = useState(false)
  const [validated,       setValidated]      = useState(!!slide.validated)

  /* La slide appartient à l'utilisateur connecté */
  const isOwner = user &&
    normalizeName(slide.prenom) === user.prenomNorm &&
    normalizeName(slide.nom)    === user.nomNorm

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

  /* Fermer le menu au clic extérieur */
  useEffect(() => {
    if (!showMenu) return
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setShowMenu(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [showMenu])

  const handleValidate = async () => {
    setValidating(true)
    const { error } = await supabase.from('slides').update({ validated: true }).eq('id', slide.id)
    if (!error) {
      setValidated(true)
      onValidated?.(slide.id)
    } else {
      alert('Erreur lors de la validation.')
    }
    setValidating(false)
    setConfirmValidate(false)
  }

  const handleDelete = async () => {
    setDeleting(true)
    const { error } = await supabase.from('slides').delete().eq('id', slide.id)
    if (!error) { onDeleted(slide.id) }
    else { setDeleting(false); setConfirmDelete(false); alert('Erreur lors de la suppression.') }
  }

  const handleThumbClick = () => {
    if (selectMode) { onSelect?.(slide.id); return }
    navigate(`/preview/${slide.id}`)
  }

  const dateStr = new Date(slide.created_at).toLocaleDateString('fr-FR', {
    day: '2-digit', month: 'short', year: 'numeric',
  })

  return (
    <div style={{
      border: selected ? '2px solid #002882' : '1px solid #e2e8f0',
      borderRadius: 12, background: '#fff', overflow: 'hidden',
      boxShadow: selected ? '0 0 0 4px #002882' + '18' : '0 2px 8px rgba(0,0,0,0.06)',
      display: 'flex', flexDirection: 'column', transition: 'box-shadow 0.15s, border 0.15s',
    }}
      onMouseEnter={(e) => { if (!selected) e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,0,0,0.12)' }}
      onMouseLeave={(e) => { if (!selected) e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.06)' }}
    >

      {/* Miniature 16:9 */}
      <div
        ref={thumbRef}
        onClick={handleThumbClick}
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

        {/* Checkbox en mode sélection */}
        {selectMode && (
          <div style={{
            position: 'absolute', top: 10, left: 10,
            width: 22, height: 22, borderRadius: 6,
            background: selected ? '#002882' : 'rgba(255,255,255,0.9)',
            border: selected ? '2px solid #002882' : '2px solid #cbd5e1',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 1px 4px rgba(0,0,0,0.15)',
          }}>
            {selected && <span style={{ color: '#fff', fontSize: 13, fontWeight: 700, lineHeight: 1 }}>✓</span>}
          </div>
        )}
      </div>

      {/* Infos */}
      <div style={{ padding: '14px 16px 10px', flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, marginBottom: 4 }}>
          <div style={{ fontWeight: 700, fontSize: 15, color: '#002882', lineHeight: 1.3 }}>
            {slide.card_titre || slide.titre || '(sans titre)'}
          </div>
          {(() => { const s = STATUS_STYLES[validated ? 'ready' : 'draft']; return (
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
          {(slide.prenom || slide.nom) && (
            <span style={{ fontSize: 12, fontWeight: 600, color: '#475569', background: '#f1f5f9', borderRadius: 20, padding: '2px 10px' }}>
              {slide.prenom} {slide.nom}
            </span>
          )}
        </div>
      </div>

      {/* CTAs */}
      <div style={{ display: 'flex', gap: 8, padding: '10px 16px 14px', borderTop: '1px solid #f1f5f9', alignItems: 'center' }}>
        {!selectMode && (
          <>
            <button onClick={() => navigate(`/preview/${slide.id}?edit=1`)} style={btn('#002882', true)}>
              Voir & Éditer
            </button>
            <button onClick={() => navigate(`/preview/${slide.id}?export=1`)} style={btn('#f08a2a')}>
              Exporter
            </button>
          </>
        )}
        {selectMode && (
          <button onClick={() => onSelect?.(slide.id)} style={{ ...btn(selected ? '#002882' : '#64748b', true) }}>
            {selected ? '✓ Sélectionnée' : 'Sélectionner'}
          </button>
        )}

        {/* Bouton valider — visible uniquement pour le propriétaire si pas encore validée */}
        {!selectMode && isOwner && !validated && (
          <button
            onClick={() => setConfirmValidate(true)}
            style={{ background: '#16a34a', color: '#fff', border: 'none', borderRadius: 6, padding: '7px 14px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
          >
            ✓ Valider
          </button>
        )}

        {/* Menu ⋯ */}
        {!selectMode && (
          <div ref={menuRef} style={{ marginLeft: 'auto', position: 'relative' }}>
            <button
              onClick={() => setShowMenu(v => !v)}
              style={{
                width: 34, height: 34, borderRadius: '50%',
                background: showMenu ? '#f1f5f9' : 'transparent',
                border: '1.5px solid #e2e8f0',
                cursor: 'pointer', color: '#94a3b8',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 18, lineHeight: 1, transition: 'all 0.15s', flexShrink: 0,
                letterSpacing: '0.05em',
              }}
              onMouseEnter={e => e.currentTarget.style.background = '#f1f5f9'}
              onMouseLeave={e => { if (!showMenu) e.currentTarget.style.background = 'transparent' }}
            >
              ⋯
            </button>
            {showMenu && (
              <div style={{
                position: 'absolute', bottom: 'calc(100% + 8px)', right: 0,
                background: '#fff', borderRadius: 10,
                boxShadow: '0 4px 6px -1px rgba(0,0,0,0.07), 0 12px 28px rgba(0,0,0,0.12)',
                border: '1px solid #f1f5f9', minWidth: 170, zIndex: 100, overflow: 'hidden',
                padding: '4px',
              }}>
                <button
                  onClick={() => { setShowMenu(false); setConfirmDelete(true) }}
                  style={{
                    width: '100%', background: 'none', border: 'none',
                    padding: '9px 12px', fontSize: 13, color: '#dc2626',
                    fontWeight: 600, cursor: 'pointer', borderRadius: 7,
                    textAlign: 'left', display: 'flex', alignItems: 'center', gap: 10,
                    fontFamily: 'inherit', transition: 'background 0.1s',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = '#fef2f2'}
                  onMouseLeave={e => e.currentTarget.style.background = 'none'}
                >
                  <span style={{ width: 28, height: 28, borderRadius: 7, background: '#fee2e2', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, flexShrink: 0 }}>
                    🗑️
                  </span>
                  Supprimer la slide
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modale de validation */}
      {confirmValidate && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000 }}
          onClick={(e) => { if (e.target === e.currentTarget && !validating) setConfirmValidate(false) }}
        >
          <div style={{ background: '#fff', borderRadius: 12, padding: '28px 28px 24px', width: 420, boxShadow: '0 20px 60px rgba(0,0,0,0.25)' }}>
            <div style={{ fontSize: 20, marginBottom: 10 }}>✅</div>
            <div style={{ fontWeight: 700, fontSize: 16, color: '#1e293b', marginBottom: 8 }}>
              Valider cette slide ?
            </div>
            <div style={{ fontSize: 13, color: '#64748b', marginBottom: 24, lineHeight: 1.6 }}>
              En validant, votre slide <strong>« {slide.card_titre || slide.titre || 'Sans titre'} »</strong> sera marquée comme <strong style={{ color: '#16a34a' }}>Ready</strong> et disponible pour un envoi potentiel à des clients.
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={handleValidate} disabled={validating}
                style={{ flex: 1, background: '#16a34a', color: '#fff', border: 'none', borderRadius: 7, padding: '10px 0', fontWeight: 700, fontSize: 14, cursor: validating ? 'default' : 'pointer', opacity: validating ? 0.7 : 1 }}>
                {validating ? 'Validation…' : '✓ Confirmer la validation'}
              </button>
              <button onClick={() => setConfirmValidate(false)} disabled={validating}
                style={{ flex: 1, background: '#f1f5f9', color: '#475569', border: 'none', borderRadius: 7, padding: '10px 0', fontWeight: 600, fontSize: 14, cursor: 'pointer' }}>
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}

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
              « {slide.card_titre || slide.titre || 'Sans titre'} » sera supprimée définitivement.
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={handleDelete} disabled={deleting}
                style={{ flex: 1, background: '#dc2626', color: '#fff', border: 'none', borderRadius: 7, padding: '10px 0', fontWeight: 700, fontSize: 14, cursor: deleting ? 'default' : 'pointer', opacity: deleting ? 0.7 : 1 }}>
                {deleting ? 'Suppression…' : 'Supprimer'}
              </button>
              <button onClick={() => setConfirmDelete(false)} disabled={deleting}
                style={{ flex: 1, background: '#f1f5f9', color: '#475569', border: 'none', borderRadius: 7, padding: '10px 0', fontWeight: 600, fontSize: 14, cursor: 'pointer' }}>
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
    background: bg, color: '#fff', border: 'none', borderRadius: 6,
    padding: '7px 14px', fontSize: 13, fontWeight: 600, cursor: 'pointer',
    ...(flex ? { flex: 1 } : {}),
  }
}
