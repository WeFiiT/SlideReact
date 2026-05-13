import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import SlideTemplate, { DEFAULT_LAYOUT } from './SlideTemplate'
import { normalizeName } from '../constants'
import { getUser } from '../pages/Login'

const THUMB_W  = 140
const THUMB_H  = Math.round(THUMB_W * 9 / 16)   // 79px
const THUMB_SC = THUMB_W / 1280

const TAG_STYLES = {
  'Conseil':              { fg: '#1D6293', bg: '#DCEAF6' },
  'Produit':              { fg: '#5B3DA6', bg: '#ECE4FB' },
  'Qualité':              { fg: '#1F6A3D', bg: '#DFF1E2' },
  'Coaching & Formation': { fg: '#92521A', bg: '#FEE9D1' },
}

function IconExport() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="#6E7385" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 10V2M5 5l3-3 3 3" /><path d="M3 10v3a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1v-3" />
    </svg>
  )
}
function IconKebab() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <circle cx="8" cy="3"  r="1.4" fill="#9498A6" />
      <circle cx="8" cy="8"  r="1.4" fill="#9498A6" />
      <circle cx="8" cy="13" r="1.4" fill="#9498A6" />
    </svg>
  )
}
function IconArrow() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 8h10M9 4l4 4-4 4" />
    </svg>
  )
}

const iconBtnStyle = {
  width: 30, height: 30, borderRadius: 8,
  border: '1px solid #E8E6E1', background: '#fff',
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
  cursor: 'pointer', padding: 0, flexShrink: 0,
}
const primaryBtnStyle = {
  height: 30, padding: '0 14px', borderRadius: 8,
  background: '#0E2A6B', color: '#fff', fontSize: 13,
  fontWeight: 600, border: 'none',
  display: 'inline-flex', alignItems: 'center', gap: 6,
  cursor: 'pointer', flexShrink: 0, fontFamily: 'inherit',
}

export default function SlideCard({ slide, onDeleted, onValidated, selectMode = false, selected = false, onSelect }) {
  const navigate = useNavigate()
  const menuRef  = useRef(null)
  const user     = getUser()

  const [hover,           setHover]           = useState(false)
  const [showMenu,        setShowMenu]        = useState(false)
  const [confirmDelete,   setConfirmDelete]   = useState(false)
  const [deleting,        setDeleting]        = useState(false)
  const [confirmValidate, setConfirmValidate] = useState(false)
  const [validating,      setValidating]      = useState(false)
  const [validated,       setValidated]       = useState(!!slide.validated)

  const isOwner = user &&
    normalizeName(slide.prenom) === user.prenomNorm &&
    normalizeName(slide.nom)    === user.nomNorm

  useEffect(() => {
    if (!showMenu) return
    const h = (e) => { if (menuRef.current && !menuRef.current.contains(e.target)) setShowMenu(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [showMenu])

  const handleValidate = async () => {
    setValidating(true)
    const next = !validated
    const { error } = await supabase.from('slides').update({ validated: next }).eq('id', slide.id)
    if (!error) { setValidated(next); onValidated?.(slide.id, next) }
    else alert('Erreur lors de la mise à jour.')
    setValidating(false)
    setConfirmValidate(false)
  }

  const handleDelete = async () => {
    setDeleting(true)
    const { error } = await supabase.from('slides').delete().eq('id', slide.id)
    if (!error) { onDeleted(slide.id) }
    else { setDeleting(false); setConfirmDelete(false); alert('Erreur lors de la suppression.') }
  }

  const handleCardClick = () => {
    if (selectMode) { onSelect?.(slide.id); return }
    navigate(`/preview/${slide.id}`)
  }

  const dateStr  = new Date(slide.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
  const tagStyle = TAG_STYLES[slide.type_mission]
  const initials = [slide.prenom?.[0], slide.nom?.[0]].filter(Boolean).join('').toUpperCase()

  const borderColor = selected ? '#0E2A6B' : hover ? '#D6D2C8' : '#E8E6E1'

  return (
    <>
      <div
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        style={{
          background: '#fff',
          borderRadius: 12,
          border: `1px solid ${borderColor}`,
          padding: 12,
          display: 'flex',
          alignItems: 'center',
          gap: 16,
          boxShadow: hover ? '0 6px 16px rgba(20,28,60,0.06)' : 'none',
          transition: 'border-color .15s, box-shadow .15s',
          cursor: 'pointer',
        }}
        onClick={handleCardClick}
      >

        {/* ── Vignette ── */}
        <div
          style={{
            width: THUMB_W, height: THUMB_H,
            flexShrink: 0, position: 'relative',
            overflow: 'hidden', borderRadius: 6,
            border: '1px solid #E8E6E1',
          }}
        >
          <div style={{ width: 1280, height: 720, transform: `scale(${THUMB_SC})`, transformOrigin: 'top left', pointerEvents: 'none' }}>
            <SlideTemplate {...slide} editMode={false} textEditMode={false} layout={DEFAULT_LAYOUT} onLayoutChange={() => {}} onTextChange={() => {}} />
          </div>

          {/* Checkbox select mode */}
          {selectMode && (
            <div style={{
              position: 'absolute', top: 6, left: 6,
              width: 20, height: 20, borderRadius: 5,
              background: selected ? '#0E2A6B' : 'rgba(255,255,255,0.92)',
              border: selected ? '2px solid #0E2A6B' : '2px solid #cbd5e1',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 1px 3px rgba(0,0,0,0.12)',
            }}>
              {selected && <span style={{ color: '#fff', fontSize: 11, fontWeight: 700, lineHeight: 1 }}>✓</span>}
            </div>
          )}
        </div>

        {/* ── Contenu ── */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 5, minWidth: 0 }}>

          {/* Ligne 1 : titre + tag */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 15, fontWeight: 700, color: '#0E2A6B', letterSpacing: -0.1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {slide.card_titre || slide.titre || '(sans titre)'}
            </span>
            {tagStyle && (
              <span style={{ fontSize: 11, fontWeight: 600, color: tagStyle.fg, background: tagStyle.bg, padding: '2px 8px', borderRadius: 999, letterSpacing: 0.1, flexShrink: 0, fontFamily: 'inherit' }}>
                {slide.type_mission}
              </span>
            )}
          </div>

          {/* Ligne 2 : sous-titre */}
          {slide.sous_titre && (
            <div style={{ fontSize: 13, color: '#6E7385', lineHeight: 1.35, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {slide.sous_titre}
            </div>
          )}

          {/* Ligne 3 : méta */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 12, color: '#6E7385', marginTop: 4, flexWrap: 'wrap' }}>
            <span>{dateStr}</span>
            <span style={{ width: 2, height: 2, borderRadius: 999, background: '#C9CCD6', flexShrink: 0 }} />
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontWeight: 500 }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: validated ? '#3EAE6E' : '#B8BCC8', flexShrink: 0 }} />
              {validated ? 'Ready' : 'Brouillon'}
            </span>
            {(slide.prenom || slide.nom) && (
              <>
                <span style={{ width: 2, height: 2, borderRadius: 999, background: '#C9CCD6', flexShrink: 0 }} />
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ width: 18, height: 18, borderRadius: '50%', background: '#F1EEE7', color: '#0E2A6B', fontSize: 7.5, fontWeight: 700, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    {initials}
                  </span>
                  <span style={{ color: '#1A1E2C', fontWeight: 500 }}>{slide.prenom} {slide.nom}</span>
                </span>
              </>
            )}
          </div>
        </div>

        {/* ── Actions ── */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          {!selectMode ? (
            <>
              <button
                onClick={(e) => { e.stopPropagation(); navigate(`/preview/${slide.id}?export=1`) }}
                style={iconBtnStyle}
                title={`Exporter ${slide.card_titre || slide.titre || ''}`}
                aria-label={`Exporter ${slide.card_titre || slide.titre || ''}`}
              >
                <IconExport />
              </button>

              {/* Bouton Valider / Retirer la validation — propriétaire uniquement */}
              {isOwner && (
                <button
                  onClick={(e) => { e.stopPropagation(); setConfirmValidate(true) }}
                  style={{
                    ...iconBtnStyle, width: 'auto', padding: '0 10px', fontSize: 12, fontWeight: 600, fontFamily: 'inherit', gap: 4,
                    color:  validated ? '#92521A' : '#16a34a',
                    border: validated ? '1px solid #fde9c5' : '1px solid #bbf7d0',
                  }}
                >
                  {validated ? 'Retirer la validation' : '✓ Valider'}
                </button>
              )}

              {/* Kebab — suppression */}
              <div ref={menuRef} style={{ position: 'relative' }}>
                <button
                  onClick={(e) => { e.stopPropagation(); setShowMenu(v => !v) }}
                  style={{ ...iconBtnStyle, background: showMenu ? '#f1f5f9' : '#fff' }}
                  title={`Plus d'options pour ${slide.card_titre || slide.titre || ''}`}
                  aria-label={`Plus d'options pour ${slide.card_titre || slide.titre || ''}`}
                >
                  <IconKebab />
                </button>
                {showMenu && (
                  <div style={{
                    position: 'absolute', bottom: 'calc(100% + 8px)', right: 0,
                    background: '#fff', borderRadius: 10, padding: 4,
                    boxShadow: '0 4px 6px -1px rgba(0,0,0,0.07), 0 12px 28px rgba(0,0,0,0.12)',
                    border: '1px solid #f1f5f9', minWidth: 180, zIndex: 100,
                  }}>
                    <button
                      onClick={(e) => { e.stopPropagation(); setShowMenu(false); setConfirmDelete(true) }}
                      style={{ width: '100%', background: 'none', border: 'none', padding: '9px 14px', fontSize: 13, color: '#dc2626', fontWeight: 600, cursor: 'pointer', borderRadius: 7, textAlign: 'left', fontFamily: 'inherit' }}
                      onMouseEnter={e => e.currentTarget.style.background = '#fef2f2'}
                      onMouseLeave={e => e.currentTarget.style.background = 'none'}
                    >
                      Supprimer
                    </button>
                  </div>
                )}
              </div>

              <button
                onClick={(e) => { e.stopPropagation(); navigate(`/preview/${slide.id}?edit=1`) }}
                style={primaryBtnStyle}
                aria-label={`Ouvrir ${slide.card_titre || slide.titre || ''}`}
              >
                Ouvrir <IconArrow />
              </button>
            </>
          ) : (
            <button
              onClick={(e) => { e.stopPropagation(); onSelect?.(slide.id) }}
              style={{ ...primaryBtnStyle, background: selected ? '#0E2A6B' : '#e2e8f0', color: selected ? '#fff' : '#475569' }}
            >
              {selected ? '✓ Sélectionnée' : 'Sélectionner'}
            </button>
          )}
        </div>
      </div>

      {/* ── Modale validation / retrait ── */}
      {confirmValidate && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000 }}
          onClick={(e) => { if (e.target === e.currentTarget && !validating) setConfirmValidate(false) }}>
          <div style={{ background: '#fff', borderRadius: 12, padding: '28px 28px 24px', width: 420, boxShadow: '0 20px 60px rgba(0,0,0,0.25)' }}>
            <div style={{ fontWeight: 700, fontSize: 16, color: '#1e293b', marginBottom: 8 }}>
              {validated ? 'Retirer la validation ?' : 'Valider cette slide ?'}
            </div>
            <div style={{ fontSize: 13, color: '#64748b', marginBottom: 24, lineHeight: 1.6 }}>
              {validated
                ? <>La slide <strong>« {slide.card_titre || slide.titre || 'Sans titre'} »</strong> repassera en <strong style={{ color: '#64748b' }}>Brouillon</strong> et ne sera plus marquée comme prête.</>
                : <>La slide <strong>« {slide.card_titre || slide.titre || 'Sans titre'} »</strong> sera marquée comme <strong style={{ color: '#16a34a' }}>Ready</strong> et disponible pour un envoi potentiel à des clients.</>
              }
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={handleValidate} disabled={validating}
                style={{ flex: 1, background: validated ? '#92521A' : '#16a34a', color: '#fff', border: 'none', borderRadius: 7, padding: '10px 0', fontWeight: 700, fontSize: 14, cursor: validating ? 'default' : 'pointer', opacity: validating ? 0.7 : 1, fontFamily: 'inherit' }}>
                {validating ? '…' : validated ? 'Retirer la validation' : 'Confirmer la validation'}
              </button>
              <button onClick={() => setConfirmValidate(false)} disabled={validating}
                style={{ flex: 1, background: '#f1f5f9', color: '#475569', border: 'none', borderRadius: 7, padding: '10px 0', fontWeight: 600, fontSize: 14, cursor: 'pointer', fontFamily: 'inherit' }}>
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modale suppression ── */}
      {confirmDelete && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000 }}
          onClick={(e) => { if (e.target === e.currentTarget && !deleting) setConfirmDelete(false) }}>
          <div style={{ background: '#fff', borderRadius: 12, padding: '28px 28px 24px', width: 380, boxShadow: '0 20px 60px rgba(0,0,0,0.25)' }}>
            <div style={{ fontSize: 20, marginBottom: 10 }}>🗑️</div>
            <div style={{ fontWeight: 700, fontSize: 16, color: '#1e293b', marginBottom: 6 }}>Supprimer cette slide ?</div>
            <div style={{ fontSize: 13, color: '#64748b', marginBottom: 24, lineHeight: 1.5 }}>
              « {slide.card_titre || slide.titre || 'Sans titre'} » sera supprimée définitivement.
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={handleDelete} disabled={deleting}
                style={{ flex: 1, background: '#dc2626', color: '#fff', border: 'none', borderRadius: 7, padding: '10px 0', fontWeight: 700, fontSize: 14, cursor: deleting ? 'default' : 'pointer', opacity: deleting ? 0.7 : 1, fontFamily: 'inherit' }}>
                {deleting ? 'Suppression…' : 'Supprimer'}
              </button>
              <button onClick={() => setConfirmDelete(false)} disabled={deleting}
                style={{ flex: 1, background: '#f1f5f9', color: '#475569', border: 'none', borderRadius: 7, padding: '10px 0', fontWeight: 600, fontSize: 14, cursor: 'pointer', fontFamily: 'inherit' }}>
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
