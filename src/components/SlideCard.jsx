import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import SlideTemplate, { DEFAULT_LAYOUT } from './SlideTemplate'
import { normalizeName } from '../constants'
import { getUser } from '../pages/Login'
import { buildNativePptx, buildPptxFilename } from '../utils/exportPptx'
import { uploadSlideToSharePoint, buildSharePointFileUrl, getToken } from '../utils/sharepoint'

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

export default function SlideCard({ slide, onDeleted, onValidated, onFavorited, selectMode = false, selected = false, onSelect }) {
  const navigate = useNavigate()
  const menuRef        = useRef(null)
  const skipSharePoint  = useRef(false)
  const isRemovingRef   = useRef(false)
  const supabaseUpdated = useRef(false)
  const user            = getUser()
  const isFav    = user && (slide.favorited_by || []).includes(user.email)

  const [hover,           setHover]           = useState(false)
  const [showMenu,        setShowMenu]        = useState(false)
  const [showExportMenu,  setShowExportMenu]  = useState(false)
  const [exporting,       setExporting]       = useState(false)
  const [confirmDelete,   setConfirmDelete]   = useState(false)
  const [deleting,        setDeleting]        = useState(false)
  const [confirmValidate, setConfirmValidate] = useState(false)
  const [validating,      setValidating]      = useState(false)
  const [validated,       setValidated]       = useState(!!slide.validated)
  const [publishedUrl,    setPublishedUrl]    = useState(null)
  const [showPublished,   setShowPublished]   = useState(false)
  const [spUrl,           setSpUrl]           = useState(slide.sharepoint_url || null)
  const [unvalidateToast, setUnvalidateToast] = useState(null)
  const [spStep,          setSpStep]          = useState(null) // null | 'connecting' | 'uploading' | 'deleting'
  const exportMenuRef = useRef(null)

  const isOwner = user &&
    normalizeName(slide.prenom) === user.prenomNorm &&
    normalizeName(slide.nom)    === user.nomNorm

  // Sync local validated state if the parent updates the slide prop
  useEffect(() => { setValidated(!!slide.validated) }, [slide.validated])

  useEffect(() => {
    if (!showMenu) return
    const h = (e) => { if (menuRef.current && !menuRef.current.contains(e.target)) setShowMenu(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [showMenu])

  useEffect(() => {
    if (!showExportMenu) return
    const h = (e) => { if (exportMenuRef.current && !exportMenuRef.current.contains(e.target)) setShowExportMenu(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [showExportMenu])

  const handleExport = async (e, fmt) => {
    e.stopPropagation()
    setShowExportMenu(false)
    if (fmt === 'pptx') {
      setExporting(true)
      try {
        const pptx = await buildNativePptx([slide])
        await pptx.writeFile({ fileName: `${buildPptxFilename(slide)}.pptx` })
      } finally { setExporting(false) }
    } else {
      navigate(`/preview/${slide.id}?export=${fmt}`)
    }
  }

  const handleValidate = async () => {
    setValidating(true)
    skipSharePoint.current  = false
    supabaseUpdated.current = false
    const next = !validated

    if (next) {
      // Token uniquement pour la validation (upload SharePoint)
      let spToken = null
      try {
        setSpStep('connecting')
        spToken = await getToken()
      } catch (e) {
        console.error('Token SharePoint:', e)
      }
      setSpStep(null)
      if (skipSharePoint.current) return

      const { error } = await supabase.from('slides').update({ validated: true }).eq('id', slide.id)
      if (!error) {
        supabaseUpdated.current = true
        setValidated(true)
        onValidated?.(slide.id, true)
        try {
          setSpStep('uploading')
          const result = await uploadSlideToSharePoint(slide, spToken)
          if (!skipSharePoint.current && result?.webUrl) {
            await supabase.from('slides').update({ sharepoint_url: result.webUrl }).eq('id', slide.id)
            setSpUrl(result.webUrl)
            setPublishedUrl(result.webUrl)
          }
        } catch (e) {
          console.error('SharePoint upload:', e)
        }
        setSpStep(null)
        if (!skipSharePoint.current) {
          setConfirmValidate(false)
          setShowPublished(true)
        }
      } else {
        alert('Erreur lors de la mise à jour.')
        setConfirmValidate(false)
      }
      if (!skipSharePoint.current) setValidating(false)
    } else {
      // Retrait simple : pas de SharePoint
      const { error } = await supabase.from('slides').update({ validated: false }).eq('id', slide.id)
      if (!error) {
        setValidated(false)
        onValidated?.(slide.id, false)
        setUnvalidateToast({ ok: true, msg: 'Slide repassée en Brouillon.' })
        setTimeout(() => setUnvalidateToast(null), 3000)
      } else {
        alert('Erreur lors de la mise à jour.')
      }
      setConfirmValidate(false)
      setValidating(false)
    }
  }

  const handleSkipSharePoint = () => {
    skipSharePoint.current = true
    setValidating(false)
    setConfirmValidate(false)
    if (!supabaseUpdated.current) {
      setValidated(true)
      supabase.from('slides').update({ validated: true }).eq('id', slide.id)
      onValidated?.(slide.id, true)
    }
    setPublishedUrl(null)
    setShowPublished(true)
  }

  const handleDelete = async () => {
    setDeleting(true)
    const { error } = await supabase.from('slides').delete().eq('id', slide.id)
    if (!error) { onDeleted(slide.id) }
    else { setDeleting(false); setConfirmDelete(false); alert('Erreur lors de la suppression.') }
  }

  const handleFavorite = async (e) => {
    e.stopPropagation()
    if (!user) return
    const current = slide.favorited_by || []
    const next = current.includes(user.email)
      ? current.filter(x => x !== user.email)
      : [...current, user.email]
    await supabase.from('slides').update({ favorited_by: next }).eq('id', slide.id)
    onFavorited?.(slide.id, next)
  }

  const handleCardClick = () => {
    if (selectMode) { onSelect?.(slide.id); return }
    navigate(`/preview/${slide.id}`)
  }

  const dateStr  = slide.created_at ? new Date(slide.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }) : ''
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
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, minHeight: THUMB_H }}>

          {/* Haut : titre + tag + favori */}
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: slide.sous_titre ? 4 : 0 }}>
                <span style={{ fontSize: 15, fontWeight: 700, color: '#0E2A6B', letterSpacing: -0.1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {slide.card_titre || slide.titre || '(sans titre)'}
                </span>
                {tagStyle && (
                  <span style={{ fontSize: 11, fontWeight: 600, color: tagStyle.fg, background: tagStyle.bg, padding: '2px 8px', borderRadius: 999, letterSpacing: 0.1, flexShrink: 0, fontFamily: 'inherit' }}>
                    {slide.type_mission}
                  </span>
                )}
              </div>
              {slide.sous_titre && (
                <div style={{ fontSize: 13, color: '#6E7385', lineHeight: 1.35, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {slide.sous_titre}
                </div>
              )}
            </div>

            {/* Favori — petit, haut à droite */}
            {!selectMode && (
              <button
                onClick={handleFavorite}
                title={isFav ? 'Retirer des favoris' : 'Ajouter aux favoris'}
                style={{ width: 24, height: 24, borderRadius: 6, border: 'none', background: 'transparent', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0, padding: 0 }}
              >
                <svg width="13" height="13" viewBox="0 0 16 16" fill={isFav ? '#E97433' : 'none'} stroke={isFav ? '#E97433' : '#C9CCD6'} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M8 13.5C8 13.5 2 9.5 2 5.5a3 3 0 0 1 6-1 3 3 0 0 1 6 1c0 4-6 8-6 8z"/>
                </svg>
              </button>
            )}
          </div>

          {/* Spacer */}
          <div style={{ flex: 1 }} />

          {/* Bas : méta + CTAs */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginTop: 8 }}>
            {/* Méta */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: '#6E7385', flexWrap: 'wrap' }}>
              <span>{dateStr}</span>
              <span style={{ width: 2, height: 2, borderRadius: 999, background: '#C9CCD6', flexShrink: 0 }} />
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontWeight: 500 }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: validated ? '#3EAE6E' : '#B8BCC8', flexShrink: 0 }} />
                {validated ? 'Ready' : 'Brouillon'}
              </span>
              {(slide.prenom || slide.nom) && (
                <>
                  <span style={{ width: 2, height: 2, borderRadius: 999, background: '#C9CCD6', flexShrink: 0 }} />
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                    <span style={{ width: 16, height: 16, borderRadius: '50%', background: '#F1EEE7', color: '#0E2A6B', fontSize: 7, fontWeight: 700, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      {initials}
                    </span>
                    <span style={{ color: '#1A1E2C', fontWeight: 500 }}>{slide.prenom} {slide.nom}</span>
                  </span>
                </>
              )}
            </div>

            {/* CTAs bas à droite */}
            {!selectMode ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                <div ref={exportMenuRef} style={{ position: 'relative' }}>
                  <button
                    onClick={(e) => { e.stopPropagation(); if (!exporting) setShowExportMenu(v => !v) }}
                    style={{ ...iconBtnStyle, background: showExportMenu ? '#f1f5f9' : '#fff', opacity: exporting ? 0.5 : 1 }}
                    title="Exporter"
                  >
                    <IconExport />
                  </button>
                  {showExportMenu && (
                    <div style={{ position: 'absolute', bottom: 'calc(100% + 6px)', right: 0, background: '#fff', borderRadius: 8, padding: 4, boxShadow: '0 4px 6px -1px rgba(0,0,0,0.07), 0 12px 28px rgba(0,0,0,0.12)', border: '1px solid #E8E6E1', minWidth: 150, zIndex: 200 }}>
                      {[
                        { fmt: 'png',  label: 'Exporter en PNG'  },
                        { fmt: 'pdf',  label: 'Exporter en PDF'  },
                        { fmt: 'pptx', label: 'Exporter en PPTX' },
                      ].map(({ fmt, label }) => (
                        <button key={fmt} onClick={(e) => handleExport(e, fmt)}
                          style={{ width: '100%', background: 'none', border: 'none', padding: '8px 12px', fontSize: 13, color: '#1A1E2C', fontWeight: 500, cursor: 'pointer', borderRadius: 6, textAlign: 'left', fontFamily: 'inherit' }}
                          onMouseEnter={e => e.currentTarget.style.background = '#F3F1EC'}
                          onMouseLeave={e => e.currentTarget.style.background = 'none'}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {isOwner && (
                  <button
                    onClick={(e) => { e.stopPropagation(); setConfirmValidate(true) }}
                    style={{ ...iconBtnStyle, width: 'auto', padding: '0 10px', fontSize: 12, fontWeight: 600, fontFamily: 'inherit', color: validated ? '#92521A' : '#16a34a', border: validated ? '1px solid #fde9c5' : '1px solid #bbf7d0' }}
                  >
                    {validated ? 'Retirer la validation' : '✓ Valider'}
                  </button>
                )}

                <div ref={menuRef} style={{ position: 'relative' }}>
                  <button
                    onClick={(e) => { e.stopPropagation(); setShowMenu(v => !v) }}
                    style={{ ...iconBtnStyle, background: showMenu ? '#f1f5f9' : '#fff' }}
                  >
                    <IconKebab />
                  </button>
                  {showMenu && (
                    <div style={{ position: 'absolute', bottom: 'calc(100% + 8px)', right: 0, background: '#fff', borderRadius: 10, padding: 4, boxShadow: '0 4px 6px -1px rgba(0,0,0,0.07), 0 12px 28px rgba(0,0,0,0.12)', border: '1px solid #f1f5f9', minWidth: 200, zIndex: 100 }}>
                      {validated && spUrl && (
                        <a
                          href={spUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => { e.stopPropagation(); setShowMenu(false) }}
                          style={{ width: '100%', background: 'none', border: 'none', padding: '9px 14px', fontSize: 13, color: '#0E2A6B', fontWeight: 500, cursor: 'pointer', borderRadius: 7, textAlign: 'left', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none', boxSizing: 'border-box' }}
                          onMouseEnter={e => e.currentTarget.style.background = '#EEF1FA'}
                          onMouseLeave={e => e.currentTarget.style.background = 'none'}
                        >
                          <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="#0E2A6B" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M6 3H3a1 1 0 0 0-1 1v9a1 1 0 0 0 1 1h9a1 1 0 0 0 1-1v-3M9 2h5v5M14 2l-7 7"/>
                          </svg>
                          Voir sur SharePoint
                        </a>
                      )}
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
                >
                  Ouvrir <IconArrow />
                </button>
              </div>
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
      </div>

      {/* ── Toast retrait validation ── */}
      {unvalidateToast && (
        <div style={{ position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)', background: unvalidateToast.ok ? '#0E2A6B' : '#dc2626', color: '#fff', padding: '12px 20px', borderRadius: 10, fontSize: 13, fontWeight: 600, boxShadow: '0 4px 16px rgba(0,0,0,0.2)', zIndex: 3000, display: 'flex', alignItems: 'center', gap: 8, whiteSpace: 'nowrap' }}>
          {unvalidateToast.ok
            ? <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 8l4 4 6-6"/></svg>
            : <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8 5v4M8 11v1"/><circle cx="8" cy="8" r="6"/></svg>
          }
          {unvalidateToast.msg}
        </div>
      )}

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
                ? <><strong>« {slide.card_titre || slide.titre || 'Sans titre'} »</strong> repassera en <strong style={{ color: '#64748b' }}>Brouillon</strong> et ne sera plus marquée comme prête.</>
                : <><strong>« {slide.card_titre || slide.titre || 'Sans titre'} »</strong> sera marquée comme <strong style={{ color: '#16a34a' }}>Ready</strong> et <strong>publiée automatiquement sur SharePoint</strong> dans le dossier des références WeFiiT.</>
              }
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={handleValidate} disabled={validating}
                style={{ flex: 1, background: validated ? '#92521A' : '#16a34a', color: '#fff', border: 'none', borderRadius: 7, padding: '10px 0', fontWeight: 700, fontSize: 14, cursor: validating ? 'default' : 'pointer', opacity: validating ? 0.7 : 1, fontFamily: 'inherit' }}>
                {spStep === 'connecting' ? 'Connexion SharePoint…'
                  : spStep === 'uploading' ? 'Publication SharePoint…'
                  : spStep === 'deleting'  ? 'Suppression SharePoint…'
                  : validating             ? 'Sauvegarde…'
                  : validated              ? 'Retirer la validation'
                  :                         'Confirmer et publier'}
              </button>
              <button
                onClick={validating ? handleSkipSharePoint : () => setConfirmValidate(false)}
                style={{ flex: 1, background: '#f1f5f9', color: validating ? '#92521A' : '#475569', border: 'none', borderRadius: 7, padding: '10px 0', fontWeight: 600, fontSize: 14, cursor: 'pointer', fontFamily: 'inherit' }}>
                {validating ? (isRemovingRef.current ? 'Retirer sans SharePoint' : 'Valider sans SharePoint') : 'Annuler'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modale publication SharePoint ── */}
      {showPublished && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000 }}
          onClick={(e) => { if (e.target === e.currentTarget) setShowPublished(false) }}>
          <div style={{ background: '#fff', borderRadius: 12, padding: '28px 28px 24px', width: 420, boxShadow: '0 20px 60px rgba(0,0,0,0.25)', textAlign: 'center' }}>
            <div style={{ width: 48, height: 48, borderRadius: '50%', background: '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 6L9 17l-5-5"/>
              </svg>
            </div>
            <div style={{ fontWeight: 700, fontSize: 17, color: '#0E2A6B', marginBottom: 8 }}>
              {publishedUrl ? 'Mission publiée !' : 'Mission validée !'}
            </div>
            <div style={{ fontSize: 13, color: '#64748b', marginBottom: 24, lineHeight: 1.6 }}>
              <strong>« {slide.card_titre || slide.titre || 'Sans titre'} »</strong> est maintenant marquée <strong style={{ color: '#16a34a' }}>Ready</strong>.{' '}
              {publishedUrl
                ? 'Le fichier est disponible sur SharePoint.'
                : "Elle n'a pas encore été publiée sur SharePoint. Vous pourrez le faire en revalidant la slide."}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {publishedUrl && (
                <a href={publishedUrl} target="_blank" rel="noopener noreferrer"
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, background: '#0E2A6B', color: '#fff', borderRadius: 8, padding: '11px 0', fontWeight: 700, fontSize: 14, textDecoration: 'none', fontFamily: 'inherit' }}>
                  Voir sur SharePoint
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M6 3H3a1 1 0 0 0-1 1v9a1 1 0 0 0 1 1h9a1 1 0 0 0 1-1v-3M9 2h5v5M14 2l-7 7"/>
                  </svg>
                </a>
              )}
              <button onClick={() => setShowPublished(false)}
                style={{ background: '#f1f5f9', color: '#475569', border: 'none', borderRadius: 8, padding: '11px 0', fontWeight: 600, fontSize: 14, cursor: 'pointer', fontFamily: 'inherit' }}>
                Fermer
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

function computeCompletion(s) {
  const checks = [
    !!s.card_titre?.trim(),
    !!s.type_mission,
    !!s.titre?.trim(),
    !!s.sous_titre?.trim(),
    s.contexte?.some(v => v?.trim()),
    s.perimetre?.some(v => v?.trim()),
    s.enjeux?.some(v => v?.trim()),
    s.impact?.some(v => v?.trim()),
    !!s.logo_url?.trim(),
  ]
  return { score: checks.filter(Boolean).length, total: checks.length }
}
