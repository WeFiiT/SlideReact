import { useEffect, useMemo, useRef, useState } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { uploadSlideToSharePoint, deleteSlideFromSharePoint, getToken } from '../utils/sharepoint'
import { supabase } from '../supabaseClient'
import SlideTemplate, { DEFAULT_LAYOUT } from '../components/SlideTemplate'
import { getUser } from './Login'
import { normalizeName } from '../constants'
import { resolveLogoUrl } from '../utils/resolveLogoUrl'

const TOPBAR_H = 56
const RAIL_W   = 80

const ZONE_LABELS = {
  titre: 'Titre', sous_titre: 'Sous-titre',
  contexte_0: 'Contexte 1', contexte_1: 'Contexte 2', contexte_2: 'Contexte 3',
  tag_0: 'Tag 1', tag_1: 'Tag 2', tag_2: 'Tag 3', tag_3: 'Tag 4',
  perimetre_0: 'Périmètre 1', perimetre_1: 'Périmètre 2', perimetre_2: 'Périmètre 3',
  enjeux_0: 'Enjeu 1', enjeux_1: 'Enjeu 2', enjeux_2: 'Enjeu 3',
  logo: 'Logo',
  impact_0: 'Impact 1', impact_1: 'Impact 2', impact_2: 'Impact 3',
  metrique_1: 'Métrique 1', metrique_2: 'Métrique 2', metrique_3: 'Métrique 3',
}

function loadLayout(id) {
  try {
    const s = localStorage.getItem(`slide_layout_${id}`)
    if (!s) return DEFAULT_LAYOUT
    const stored = JSON.parse(s)
    const layout = { ...DEFAULT_LAYOUT, ...stored, logo: { ...DEFAULT_LAYOUT.logo, ...stored.logo } }
    if ((stored.logo?.y === 168 && stored.logo?.h === 60) || (stored.logo?.y === 140 && stored.logo?.h === 90)) {
      layout.logo = DEFAULT_LAYOUT.logo
    }
    return layout
  } catch { return DEFAULT_LAYOUT }
}

export default function Preview() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const autoExportFmt   = searchParams.get('export')  // '1' | 'png' | 'pdf'
  const autoExportParam = !!autoExportFmt
  const editParam       = searchParams.get('edit')   === '1'
  const autoExportDone  = useRef(false)
  const slideRef        = useRef(null)
  const saveTimer       = useRef(null)
  const pendingSave     = useRef(null)

  const [slide, setSlide]               = useState(null)
  const [loading, setLoading]           = useState(true)
  const [exporting, setExporting]       = useState(false)
  const [scale, setScale]               = useState(1)
  const [textEditMode, setTextEditMode] = useState(false)
  const [layout]                        = useState(() => loadLayout(id))
  const [saving, setSaving]             = useState(false)
  const [lastSaved, setLastSaved]       = useState(null)
  const [tick, setTick]                 = useState(0)
  const [exportMenu, setExportMenu]     = useState(false)
  const exportMenuRef                   = useRef(null)
  const shareMenuRef                    = useRef(null)
  const [fullscreen, setFullscreen]     = useState(false)
  const [shareToast, setShareToast]     = useState(false)
  const [shareMenu,  setShareMenu]      = useState(false)
  const [railMode, setRailMode]           = useState('slide')
  const [comments, setComments]           = useState([])
  const [selectedField, setSelectedField] = useState(null)
  const [newComment, setNewComment]       = useState('')
  const [postingComment, setPostingComment] = useState(false)
  const [validated,       setValidated]       = useState(false)
  const [confirmValidate, setConfirmValidate] = useState(false)
  const [validating,      setValidating]      = useState(false)
  const [publishedUrl,    setPublishedUrl]    = useState(null)
  const [showPublished,   setShowPublished]   = useState(false)
  const [unvalidateToast, setUnvalidateToast] = useState(null)
  const [spStep,          setSpStep]          = useState(null)
  const [validateTip,     setValidateTip]     = useState(false)
  const skipSharePoint  = useRef(false)
  const isRemovingRef   = useRef(false)
  const supabaseUpdated = useRef(false)

  useEffect(() => {
    supabase.from('slides').select('*').eq('id', id).single()
      .then(({ data, error }) => {
        if (error) console.error(error)
        else { setSlide(data); setValidated(!!data?.validated) }
        setLoading(false)
      })
  }, [id])

  const handleValidate = async () => {
    setValidating(true)
    skipSharePoint.current  = false
    supabaseUpdated.current = false
    const next = !validated
    isRemovingRef.current   = !next

    if (next) {
      // Mise à jour optimiste immédiate
      setValidated(true)
      setSlide(prev => ({ ...prev, validated: true }))

      let spToken = null
      try {
        setSpStep('connecting')
        spToken = await getToken()
      } catch (e) {
        console.error('Token SharePoint:', e)
        setValidated(false)
        setSlide(prev => ({ ...prev, validated: false }))
        setUnvalidateToast({ ok: false, msg: 'Connexion SharePoint impossible. La référence ne peut pas être validée.' })
        setTimeout(() => setUnvalidateToast(null), 5000)
        setConfirmValidate(false)
        setSpStep(null)
        setValidating(false)
        return
      }
      setSpStep(null)
      if (skipSharePoint.current) return

      const { error } = await supabase.from('slides').update({ validated: true }).eq('id', id)
      if (!error) {
        supabaseUpdated.current = true
        try {
          setSpStep('uploading')
          const slideForExport = await resolveLogoUrl(slide)
          const result = await uploadSlideToSharePoint(slideForExport, spToken)
          if (!skipSharePoint.current) {
            if (result?.webUrl) {
              await supabase.from('slides').update({ sharepoint_url: result.webUrl }).eq('id', id)
              setSlide(prev => ({ ...prev, sharepoint_url: result.webUrl }))
              setPublishedUrl(result.webUrl)
            }
            setConfirmValidate(false)
            setShowPublished(true)
          }
        } catch (e) {
          console.error('SharePoint upload:', e)
          if (!skipSharePoint.current) {
            await supabase.from('slides').update({ validated: false }).eq('id', id)
            setValidated(false)
            setSlide(prev => ({ ...prev, validated: false }))
            setUnvalidateToast({ ok: false, msg: 'Échec publication SharePoint. La référence n\'a pas été validée.' })
            setTimeout(() => setUnvalidateToast(null), 6000)
            setConfirmValidate(false)
          }
        }
        setSpStep(null)
      } else {
        // Revert optimiste
        setValidated(false)
        setSlide(prev => ({ ...prev, validated: false }))
        alert('Erreur lors de la mise à jour.')
        setConfirmValidate(false)
      }
      if (!skipSharePoint.current) setValidating(false)
    } else {
      // Mise à jour optimiste immédiate
      setValidated(false)
      setSlide(prev => ({ ...prev, validated: false }))

      let spToken = null
      if (slide.sharepoint_url) {
        try {
          setSpStep('connecting')
          spToken = await getToken()
        } catch (e) {
          console.error('Token SharePoint:', e)
          setValidated(true)
          setSlide(prev => ({ ...prev, validated: true }))
          setUnvalidateToast({ ok: false, msg: 'Connexion SharePoint impossible. La validation n\'a pas été retirée.' })
          setTimeout(() => setUnvalidateToast(null), 5000)
          setConfirmValidate(false)
          setSpStep(null)
          setValidating(false)
          return
        }
        setSpStep(null)
        if (skipSharePoint.current) return
      }

      const { error } = await supabase.from('slides').update({ validated: false }).eq('id', id)
      if (!error) {
        supabaseUpdated.current = true
        if (slide.sharepoint_url) {
          try {
            setSpStep('deleting')
            await deleteSlideFromSharePoint(slide, spToken)
            await supabase.from('slides').update({ sharepoint_url: null }).eq('id', id)
            setSlide(prev => ({ ...prev, sharepoint_url: null }))
            setUnvalidateToast({ ok: true, msg: 'Référence retirée et supprimée de SharePoint.' })
            setTimeout(() => setUnvalidateToast(null), 4000)
          } catch (e) {
            console.error('SharePoint delete:', e)
            if (!skipSharePoint.current) {
              await supabase.from('slides').update({ validated: true }).eq('id', id)
              setValidated(true)
              setSlide(prev => ({ ...prev, validated: true }))
              setUnvalidateToast({ ok: false, msg: 'Échec suppression SharePoint. La validation n\'a pas été retirée.' })
              setTimeout(() => setUnvalidateToast(null), 6000)
              setConfirmValidate(false)
            }
          }
          setSpStep(null)
        } else {
          setUnvalidateToast({ ok: true, msg: 'Référence repassée en Brouillon.' })
          setTimeout(() => setUnvalidateToast(null), 3000)
        }
      } else {
        setValidated(true)
        setSlide(prev => ({ ...prev, validated: true }))
        alert('Erreur lors de la mise à jour.')
      }
      if (!skipSharePoint.current) {
        setConfirmValidate(false)
        setValidating(false)
      }
    }
  }

  const handleSkipSharePoint = () => {
    skipSharePoint.current = true
    setValidating(false)
    setConfirmValidate(false)
    setSpStep(null)
    // Dans les deux sens, annuler reverte tout
    if (isRemovingRef.current) {
      setValidated(true)
      setSlide(prev => ({ ...prev, validated: true }))
      if (supabaseUpdated.current) {
        supabase.from('slides').update({ validated: true }).eq('id', id)
      }
    } else {
      setValidated(false)
      setSlide(prev => ({ ...prev, validated: false }))
      if (supabaseUpdated.current) {
        supabase.from('slides').update({ validated: false }).eq('id', id)
      }
    }
  }

  useEffect(() => {
    const upd = () => {
      if (fullscreen) {
        setScale(Math.min(window.innerWidth / 1280, window.innerHeight / 720))
      } else {
        setScale(Math.min(
          (window.innerWidth - RAIL_W) / 1280,
          (window.innerHeight - TOPBAR_H) / 720,
        ))
      }
    }
    upd()
    window.addEventListener('resize', upd)
    return () => window.removeEventListener('resize', upd)
  }, [fullscreen])

  useEffect(() => {
    if (!autoExportParam || loading || !slide || autoExportDone.current) return
    autoExportDone.current = true
    if (autoExportFmt === 'pdf') exportPDF()
    else exportPNG()
  }, [autoExportParam, loading, slide])

  useEffect(() => {
    if (editParam && slide && !loading) setTextEditMode(true)
  }, [editParam, slide, loading])

  useEffect(() => {
    const intervalId = setInterval(() => setTick(t => t + 1), 60_000)
    return () => clearInterval(intervalId)
  }, [])

  // Flush pending save on unmount
  useEffect(() => () => {
    if (saveTimer.current) clearTimeout(saveTimer.current)
    const data = pendingSave.current
    if (data) {
      supabase.from('slides').update({
        titre:              data.titre,
        sous_titre:         data.sous_titre,
        contexte:           data.contexte,
        tags:               data.tags,
        perimetre:          data.perimetre,
        enjeux:             data.enjeux,
        impact:             data.impact,
        metrique_1_chiffre: data.metrique_1_chiffre,
        metrique_1_label:   data.metrique_1_label,
        metrique_2_chiffre: data.metrique_2_chiffre,
        metrique_2_label:   data.metrique_2_label,
        metrique_3_chiffre: data.metrique_3_chiffre,
        metrique_3_label:   data.metrique_3_label,
      }).eq('id', id)
    }
  }, [])

  useEffect(() => {
    supabase.from('comments').select('*').eq('slide_id', id).order('created_at', { ascending: true })
      .then(({ data }) => { if (data) setComments(data) })
  }, [id])

  useEffect(() => {
    if (searchParams.get('comments') === '1') setRailMode('comments')
  }, [])

  useEffect(() => {
    const h = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.contentEditable === 'true') return
      if (e.key === 'f' || e.key === 'F') setFullscreen(v => !v)
      if (e.key === 'Escape') setFullscreen(false)
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [])

  const schedSave = (updated) => {
    if (saveTimer.current) clearTimeout(saveTimer.current)
    pendingSave.current = updated
    setSaving(true)
    saveTimer.current = setTimeout(async () => {
      pendingSave.current = null
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
      setLastSaved(Date.now())
    }, 800)
  }

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

  useEffect(() => {
    if (!exportMenu) return
    const h = (e) => { if (exportMenuRef.current && !exportMenuRef.current.contains(e.target)) setExportMenu(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [exportMenu])

  useEffect(() => {
    if (!shareMenu) return
    const h = (e) => { if (shareMenuRef.current && !shareMenuRef.current.contains(e.target)) setShareMenu(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [shareMenu])

  const captureCanvas = async () => {
    if (!slideRef.current) return null
    const { default: html2canvas } = await import('html2canvas')
    await document.fonts.ready
    const wrapper = document.createElement('div')
    Object.assign(wrapper.style, {
      position: 'fixed', top: '0', left: '-9999px',
      width: '1280px', height: '720px',
      overflow: 'visible', zIndex: '-1', transform: 'none',
    })
    wrapper.appendChild(slideRef.current.cloneNode(true))
    document.body.appendChild(wrapper)
    const canvas = await html2canvas(wrapper, {
      scale: 2, useCORS: true,
      width: 1280, height: 720,
      scrollX: 0, scrollY: 0,
    })
    document.body.removeChild(wrapper)
    return canvas
  }

  const exportPNG = async () => {
    if (!slideRef.current) return
    setExporting(true)
    try {
      const canvas = await captureCanvas()
      if (!canvas) return
      const filename = (slide?.card_titre || slide?.titre || 'slide').replace(/[/\\?%*:|"<>]/g, '-')
      const link = document.createElement('a')
      link.download = `${filename}.png`
      link.href = canvas.toDataURL('image/png')
      link.click()
    } finally { setExporting(false) }
  }

  const exportPDF = async () => {
    if (!slideRef.current) return
    setExporting(true)
    try {
      const [canvas, { jsPDF }] = await Promise.all([captureCanvas(), import('jspdf')])
      if (!canvas) return
      const imgData = canvas.toDataURL('image/png')
      const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: [297, 167.0625] })
      pdf.addImage(imgData, 'PNG', 0, 0, 297, 167.0625)
      const filename = (slide?.card_titre || slide?.titre || 'slide').replace(/[/\\?%*:|"<>]/g, '-')
      pdf.save(`${filename}.pdf`)
    } finally { setExporting(false) }
  }

  const exportPPTX = async () => {
    setExporting(true)
    try {
      const { buildNativePptx, buildPptxFilename } = await import('../utils/exportPptx')
      const slideForExport = await resolveLogoUrl(slide)
      const pptx = await buildNativePptx([slideForExport])
      await pptx.writeFile({ fileName: `${buildPptxFilename(slide)}.pptx` })
      if (pptx.warnings.length > 0) alert('Logo non inclus dans le PPTX : lien du logo inaccessible.')
    } finally { setExporting(false) }
  }

  const handleShare = async () => {
    let token = slide.share_token
    if (!token) {
      token = crypto.randomUUID()
      await supabase.from('slides').update({ share_token: token }).eq('id', id)
      setSlide(s => ({ ...s, share_token: token }))
    }
    const url = `${window.location.origin}/share/${token}`
    try {
      await navigator.clipboard.writeText(url)
      setShareToast(true)
      setTimeout(() => setShareToast(false), 2500)
    } catch {
      window.prompt('Copier le lien :', url)
    }
  }

  const annotationSections = useMemo(() => {
    if (!slide) return []
    return [
      { title: 'En-tête', fields: [
        { field: 'titre',      label: 'Titre',      value: slide.titre },
        { field: 'sous_titre', label: 'Sous-titre', value: slide.sous_titre },
      ]},
      { title: 'Contexte', fields: [
        { field: 'contexte_0', label: 'Point 1', value: slide.contexte?.[0] },
        { field: 'contexte_1', label: 'Point 2', value: slide.contexte?.[1] },
        { field: 'contexte_2', label: 'Point 3', value: slide.contexte?.[2] },
      ]},
      { title: 'Tags', fields: [
        { field: 'tag_0', label: 'Tag 1', value: slide.tags?.[0] },
        { field: 'tag_1', label: 'Tag 2', value: slide.tags?.[1] },
        { field: 'tag_2', label: 'Tag 3', value: slide.tags?.[2] },
        { field: 'tag_3', label: 'Tag 4', value: slide.tags?.[3] },
      ]},
      { title: 'Périmètre', fields: [
        { field: 'perimetre_0', label: 'Point 1', value: slide.perimetre?.[0] },
        { field: 'perimetre_1', label: 'Point 2', value: slide.perimetre?.[1] },
        { field: 'perimetre_2', label: 'Point 3', value: slide.perimetre?.[2] },
      ]},
      { title: 'Enjeux clés', fields: [
        { field: 'enjeux_0', label: 'Enjeu 1', value: slide.enjeux?.[0] },
        { field: 'enjeux_1', label: 'Enjeu 2', value: slide.enjeux?.[1] },
        { field: 'enjeux_2', label: 'Enjeu 3', value: slide.enjeux?.[2] },
      ]},
      { title: 'Logo client', fields: [
        { field: 'logo', label: 'Logo', value: slide.logo_url ? 'Logo présent' : null },
      ]},
      { title: 'Notre impact', fields: [
        { field: 'impact_0', label: 'Point 1', value: slide.impact?.[0] },
        { field: 'impact_1', label: 'Point 2', value: slide.impact?.[1] },
        { field: 'impact_2', label: 'Point 3', value: slide.impact?.[2] },
      ]},
      { title: 'Métriques', fields: [
        { field: 'metrique_1', label: 'Métrique 1', value: slide.metrique_1_chiffre ? `${slide.metrique_1_chiffre} — ${slide.metrique_1_label || ''}` : null },
        { field: 'metrique_2', label: 'Métrique 2', value: slide.metrique_2_chiffre ? `${slide.metrique_2_chiffre} — ${slide.metrique_2_label || ''}` : null },
        { field: 'metrique_3', label: 'Métrique 3', value: slide.metrique_3_chiffre ? `${slide.metrique_3_chiffre} — ${slide.metrique_3_label || ''}` : null },
      ]},
    ]
  }, [slide])

  const handlePostComment = async () => {
    if (!newComment.trim()) return
    const user = getUser()
    if (!user) return
    setPostingComment(true)
    const { data, error } = await supabase.from('comments').insert({
      slide_id: id, author_email: user.email,
      author_name: `${user.prenom} ${user.nom}`,
      content: newComment.trim(), field: selectedField || null,
    }).select().single()
    if (!error && data) {
      setComments(c => [...c, data])
      setNewComment('')
      // Notify slide owner if different from commenter
      if (slide.owner_email && slide.owner_email !== user.email) {
        await supabase.from('notifications').insert({
          user_email: slide.owner_email,
          type: 'comment',
          slide_id: id,
          slide_title: slide.card_titre || slide.titre || 'Sans titre',
          from_name: `${user.prenom} ${user.nom}`,
        })
      }
    }
    setPostingComment(false)
  }

  const handleExport = (format) => {
    setExportMenu(false)
    const run = format === 'pdf' ? exportPDF : format === 'pptx' ? exportPPTX : exportPNG
    if (textEditMode) {
      setTextEditMode(false)
      setTimeout(run, 80)
    } else {
      run()
    }
  }

  if (loading) return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', fontFamily: 'Inter, system-ui, sans-serif', background: '#fff' }}>
      <div style={{ height: 56, borderBottom: '1px solid #E8E6E1', display: 'flex', alignItems: 'center', padding: '0 16px', gap: 12 }}>
        <div className="sk" style={{ width: 90, height: 26, borderRadius: 7 }} />
        <div className="sk" style={{ width: 1, height: 22 }} />
        <div className="sk" style={{ width: 160, height: 18, borderRadius: 6 }} />
        <div style={{ flex: 1 }} />
        <div className="sk" style={{ width: 96, height: 32, borderRadius: 8 }} />
        <div className="sk" style={{ width: 80, height: 32, borderRadius: 8 }} />
      </div>
      <div style={{ flex: 1, display: 'flex' }}>
        <div style={{ width: 80, borderRight: '1px solid #E8E6E1', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '14px 0', gap: 8 }}>
          {[0,1,2].map(i => <div key={i} className="sk" style={{ width: 52, height: 52, borderRadius: 10 }} />)}
        </div>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F5F4F0' }}>
          <div className="sk" style={{ width: '85%', maxWidth: 900, aspectRatio: '16/9', borderRadius: 10 }} />
        </div>
      </div>
    </div>
  )
  if (!slide)  return <p style={{ padding: 32, color: '#dc2626' }}>Référence introuvable.</p>

  const slideTitle = slide.card_titre || slide.titre || 'Sans titre'
  const savedLabel = lastSaved ? relativeTime(lastSaved) : null
  const user       = getUser()
  const isOwner    = user && (
    slide.owner_email === user.email ||
    (!slide.owner_email && normalizeName(slide.prenom) === user.prenomNorm && normalizeName(slide.nom) === user.nomNorm)
  )

  // Verrou de validation : 2/3 champs remplis par catégorie
  const a2of3 = (arr) => (arr || []).filter(Boolean).length >= 2
  const slideComplete = a2of3(slide.contexte) && a2of3(slide.perimetre) && a2of3(slide.enjeux) && a2of3(slide.impact)
  const missing = [
    !a2of3(slide.contexte) && 'Contexte',
    !a2of3(slide.perimetre) && 'Périmètre',
    !a2of3(slide.enjeux) && 'Enjeux clés',
    !a2of3(slide.impact) && 'Notre impact',
  ].filter(Boolean)

  if (fullscreen) {
    const fsScale = Math.min(window.innerWidth / 1280, window.innerHeight / 720)
    return (
      <div style={{ position: 'fixed', inset: 0, background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
        <div style={{ width: 1280 * fsScale, height: 720 * fsScale, position: 'relative', flexShrink: 0 }}>
          <div style={{ width: 1280, height: 720, transform: `scale(${fsScale})`, transformOrigin: 'top left', position: 'absolute', top: 0, left: 0 }}>
            <div ref={slideRef}>
              <SlideTemplate {...slide} editMode={false} textEditMode={false} layout={layout} onLayoutChange={() => {}} onTextChange={() => {}} />
            </div>
          </div>
        </div>
        <button
          onClick={() => setFullscreen(false)}
          title="Quitter le plein écran (Échap)"
          style={{ position: 'fixed', top: 16, right: 16, width: 36, height: 36, borderRadius: 8, background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.25)', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)' }}
        >
          <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 2H2v3M11 2h3v3M14 11v3h-3M5 14H2v-3"/>
          </svg>
        </button>
      </div>
    )
  }

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', fontFamily: 'Inter, system-ui, sans-serif', color: '#1A1E2C', background: '#fff' }}>

      {/* ── Top bar ── */}
      <header style={styles.topbar}>
        <button onClick={() => navigate('/')} style={styles.btnBack}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M10 4 6 8l4 4"/>
          </svg>
          Bibliothèque
        </button>

        <div style={styles.divider} />

        <span style={styles.title}>{slideTitle}</span>

        <span style={styles.savedStatus}>
          {saving ? (
            <span style={{ color: '#E97433' }}>Sauvegarde…</span>
          ) : savedLabel ? (
            <>
              <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="#3EAE6E" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="8" cy="8" r="6"/>
                <path d="M5.5 8l2 2 3-3.5"/>
              </svg>
              Enregistré {savedLabel}
            </>
          ) : null}
        </span>

        <div style={{ flex: 1 }} />

        {/* ── Groupe vue ── */}
        {railMode !== 'comments' && !validated && (!textEditMode ? (
          <button onClick={() => setTextEditMode(true)} style={{ ...styles.btnSecondary, gap: 6 }}>
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 5V3.5h8V5M8 3.5v9M6 12.5h4"/>
            </svg>
            Éditer le texte
          </button>
        ) : (
          <button onClick={() => setTextEditMode(false)} style={{ ...styles.btnSecondary, gap: 6, color: '#3EAE6E', borderColor: '#3EAE6E' }}>
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="#3EAE6E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 8l4 4 6-6"/>
            </svg>
            Terminer
          </button>
        ))}

        <button onClick={() => setFullscreen(true)} title="Plein écran (F)" style={{ ...styles.btnSecondary, padding: '0 10px' }}>
          <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            <path d="M2 5V2h3M11 2h3v3M14 11v3h-3M5 14H2v-3"/>
          </svg>
        </button>

        {!textEditMode && <div style={styles.divider} />}

        {/* ── Groupe publication ── */}
        {!textEditMode && <div ref={shareMenuRef} style={{ position: 'relative' }}>
          <button onClick={() => setShareMenu(v => !v)} style={{ ...styles.btnSecondary, gap: 6 }}>
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="4" r="1.8"/><circle cx="4" cy="8" r="1.8"/><circle cx="12" cy="12" r="1.8"/>
              <path d="M10.3 4.9L5.7 7.1M10.3 11.1L5.7 8.9"/>
            </svg>
            Partager
            <svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 5l3 3 3-3"/>
            </svg>
          </button>
          {shareMenu && (
            <div style={{ position: 'absolute', top: 'calc(100% + 6px)', right: 0, background: '#fff', borderRadius: 10, padding: 4, boxShadow: '0 4px 6px -1px rgba(0,0,0,0.07), 0 12px 28px rgba(0,0,0,0.12)', border: '1px solid #E8E6E1', minWidth: 190, zIndex: 200 }}>
              <button onClick={() => { setShareMenu(false); handleShare() }}
                style={{ width: '100%', background: 'none', border: 'none', padding: '9px 14px', fontSize: 13, color: '#1A1E2C', fontWeight: 500, cursor: 'pointer', borderRadius: 7, textAlign: 'left', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 10 }}
                onMouseEnter={e => e.currentTarget.style.background = '#F3F1EC'}
                onMouseLeave={e => e.currentTarget.style.background = 'none'}>
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="#6E7385" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="3" width="12" height="10" rx="1.5"/><path d="M2 6h12"/>
                </svg>
                Copier le lien aperçu
              </button>
              {validated && slide.sharepoint_url && (
                <a href={slide.sharepoint_url} target="_blank" rel="noopener noreferrer"
                  style={{ width: '100%', background: 'none', border: 'none', padding: '9px 14px', fontSize: 13, color: '#1A1E2C', fontWeight: 500, cursor: 'pointer', borderRadius: 7, textAlign: 'left', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none', boxSizing: 'border-box' }}
                  onMouseEnter={e => e.currentTarget.style.background = '#F3F1EC'}
                  onMouseLeave={e => e.currentTarget.style.background = 'none'}
                  onClick={() => setShareMenu(false)}>
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="#6E7385" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M6 3H3a1 1 0 0 0-1 1v9a1 1 0 0 0 1 1h9a1 1 0 0 0 1-1v-3M9 2h5v5M14 2l-7 7"/>
                  </svg>
                  Voir sur SharePoint
                </a>
              )}
            </div>
          )}
          {shareToast && (
            <div style={{ position: 'absolute', top: 'calc(100% + 8px)', right: 0, background: '#1A1E2C', color: '#fff', fontSize: 12, fontWeight: 600, padding: '7px 14px', borderRadius: 8, whiteSpace: 'nowrap', boxShadow: '0 4px 12px rgba(0,0,0,0.2)', zIndex: 300 }}>
              ✓ Lien copié !
            </div>
          )}
        </div>}

        {!textEditMode && isOwner && (
          <div style={{ position: 'relative', display: 'inline-flex' }}
            onMouseEnter={() => { if (!validated && !slideComplete) setValidateTip(true) }}
            onMouseLeave={() => setValidateTip(false)}>
            <button
              onClick={() => { if (validated || slideComplete) setConfirmValidate(true) }}
              style={{ height: 34, padding: '0 12px', borderRadius: 8, background: '#fff', fontSize: 13, fontWeight: 600, fontFamily: 'inherit', cursor: !validated && !slideComplete ? 'not-allowed' : 'pointer', color: validated ? '#92521A' : '#16a34a', border: validated ? '1px solid #fde9c5' : '1px solid #bbf7d0', opacity: !validated && !slideComplete ? 0.45 : 1 }}
            >
              {validated ? 'Retirer la validation' : '✓ Valider'}
            </button>
            {validateTip && (
              <div style={{ position: 'absolute', top: 'calc(100% + 8px)', right: 0, width: 220, background: '#1e293b', borderRadius: 10, padding: '12px 14px', boxShadow: '0 8px 24px rgba(0,0,0,0.22)', zIndex: 300, pointerEvents: 'none' }}>
                <div style={{ fontWeight: 700, fontSize: 13, color: '#f97316', marginBottom: 6 }}>Référence incomplète</div>
                <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 8 }}>2/3 champs min. par catégorie :</div>
                {missing.map(m => (
                  <div key={m} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                    <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#f97316', flexShrink: 0 }} />
                    <span style={{ fontSize: 12, color: '#e2e8f0' }}>{m}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {!textEditMode && <div ref={exportMenuRef} style={{ position: 'relative' }}>
          <button
            onClick={() => !exporting && setExportMenu(v => !v)}
            disabled={exporting}
            style={{ ...styles.btnPrimary(exporting), gap: 8 }}
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M8 10V2M5 5l3-3 3 3"/>
              <path d="M3 10v3a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1v-3"/>
            </svg>
            {exporting ? 'Export…' : 'Exporter'}
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.8 }}>
              <path d="M3 5l3 3 3-3"/>
            </svg>
          </button>

          {exportMenu && (
            <div style={{
              position: 'absolute', top: 'calc(100% + 6px)', right: 0,
              background: '#fff', borderRadius: 10, padding: 4,
              boxShadow: '0 4px 6px -1px rgba(0,0,0,0.07), 0 12px 28px rgba(0,0,0,0.12)',
              border: '1px solid #E8E6E1', minWidth: 160, zIndex: 200,
            }}>
              {[
                { fmt: 'png',  label: 'Exporter en PNG'  },
                { fmt: 'pdf',  label: 'Exporter en PDF'  },
                { fmt: 'pptx', label: 'Exporter en PPTX' },
              ].map(({ fmt, label }) => (
                <button
                  key={fmt}
                  onClick={() => handleExport(fmt)}
                  style={{ width: '100%', background: 'none', border: 'none', padding: '9px 14px', fontSize: 13, color: '#1A1E2C', fontWeight: 500, cursor: 'pointer', borderRadius: 7, textAlign: 'left', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 10 }}
                  onMouseEnter={e => e.currentTarget.style.background = '#F3F1EC'}
                  onMouseLeave={e => e.currentTarget.style.background = 'none'}
                >
                  {fmt === 'png' ? (
                    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="#6E7385" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="2" y="2" width="12" height="12" rx="2"/>
                      <path d="M5 10l2-2.5L9 10l1.5-2 1.5 2"/>
                    </svg>
                  ) : fmt === 'pdf' ? (
                    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="#6E7385" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M9 2H4a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V6z"/>
                      <path d="M9 2v4h4"/>
                    </svg>
                  ) : (
                    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="#6E7385" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="1" y="4" width="14" height="9" rx="1.5"/>
                      <path d="M4 7h2.5M4 9.5h2M10 7v3M10 7h2a1 1 0 0 1 0 2h-2"/>
                    </svg>
                  )}
                  {label}
                </button>
              ))}
            </div>
          )}
        </div>}
      </header>

      {/* ── Body ── */}
      <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>

        {/* Left rail */}
        <nav style={styles.rail} aria-label="Modes">
          <button onClick={() => setRailMode('slide')} style={styles.railItem(railMode === 'slide')}>
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2.5" y="4" width="15" height="11" rx="1.5"/>
              <path d="M2.5 7h15"/>
            </svg>
            <span style={styles.railLabel}>Slide</span>
          </button>

          <button onClick={() => navigate(`/editeur/${id}`)} style={styles.railItem(false)}>
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="14" height="14" rx="2"/>
              <path d="M6 7h8M6 10h8M6 13h5"/>
            </svg>
            <span style={styles.railLabel}>Formulaire</span>
          </button>

          <div style={{ position: 'relative' }}>
            <button onClick={() => setRailMode('comments')} style={styles.railItem(railMode === 'comments')}>
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H8l-4 3V5z"/>
              </svg>
              <span style={styles.railLabel}>Avis</span>
            </button>
            {comments.length > 0 && railMode !== 'comments' && (
              <span style={{ position: 'absolute', top: 8, right: 8, width: 8, height: 8, borderRadius: '50%', background: '#E97433', border: '2px solid #fff' }} />
            )}
          </div>
        </nav>

        {/* Workspace */}
        <main style={{ flex: 1, overflow: 'hidden', display: 'flex' }}>

          {/* Mode Slide */}
          {railMode !== 'comments' && (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', background: '#fff' }}>
              <div style={{ width: 1280 * scale, height: 720 * scale, position: 'relative', flexShrink: 0 }}>
                <div style={{ width: 1280, height: 720, transform: `scale(${scale})`, transformOrigin: 'top left', position: 'absolute', top: 0, left: 0 }}>
                  <div ref={slideRef}>
                    <SlideTemplate {...slide} editMode={false} textEditMode={textEditMode} layout={layout} onLayoutChange={() => {}} onTextChange={handleTextChange} />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Mode Commentaires — panneau accordéon par champ */}
          {railMode === 'comments' && (
            <div style={{ flex: 1, overflowY: 'auto', background: '#FBFAF7' }}>
              <div style={{ maxWidth: 680, margin: '0 auto', padding: '28px 24px 80px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24 }}>
                  <span style={{ fontSize: 18, fontWeight: 800, color: '#0E2A6B' }}>Commentaires</span>
                  {comments.length > 0 && <span style={{ fontSize: 12, fontWeight: 700, background: '#EEF1FA', color: '#0E2A6B', padding: '3px 10px', borderRadius: 999 }}>{comments.length}</span>}
                </div>

                {annotationSections.map(section => (
                  <div key={section.title} style={{ marginBottom: 24 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: '#6E7385', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>{section.title}</div>
                    {section.fields.map(fieldDef => {
                      const fc = comments.filter(c => c.field === fieldDef.field)
                      const open = selectedField === fieldDef.field
                      return (
                        <div key={fieldDef.field} style={{ background: '#fff', borderRadius: 10, border: `1.5px solid ${open ? '#0E2A6B' : '#E8E6E1'}`, marginBottom: 6, overflow: 'hidden', transition: 'border-color .12s' }}>
                          <div onClick={() => setSelectedField(open ? null : fieldDef.field)}
                            style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', cursor: 'pointer' }}>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <span style={{ fontSize: 11, fontWeight: 700, color: open ? '#0E2A6B' : '#6E7385', textTransform: 'uppercase', letterSpacing: 0.5 }}>{fieldDef.label}</span>
                              {fieldDef.value
                                ? <p style={{ margin: '1px 0 0', fontSize: 13, color: '#1A1E2C', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{fieldDef.value}</p>
                                : <p style={{ margin: '1px 0 0', fontSize: 12, color: '#B8BCC8', fontStyle: 'italic' }}>Non renseigné</p>}
                            </div>
                            {fc.length > 0 && <span style={{ fontSize: 11, fontWeight: 700, background: '#EEF1FA', color: '#0E2A6B', padding: '2px 8px', borderRadius: 999, flexShrink: 0 }}>{fc.length}</span>}
                            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="#6E7385" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, transform: open ? 'rotate(180deg)' : 'none', transition: '.15s' }}>
                              <path d="M3 5l3 3 3-3"/>
                            </svg>
                          </div>

                          {open && (
                            <div style={{ borderTop: '1px solid #E8E6E1', padding: '12px 14px', background: '#FAFBFF' }}>
                              {fc.length === 0
                                ? <p style={{ margin: '0 0 10px', fontSize: 12, color: '#6E7385' }}>Aucun commentaire sur ce champ.</p>
                                : fc.map(c => (
                                    <div key={c.id} style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                                      <div style={{ width: 26, height: 26, borderRadius: '50%', background: '#DCE3F2', color: '#0E2A6B', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, flexShrink: 0 }}>
                                        {c.author_name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
                                      </div>
                                      <div style={{ flex: 1 }}>
                                        <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                                          <span style={{ fontSize: 12, fontWeight: 700, color: '#1A1E2C' }}>{c.author_name}</span>
                                          <span style={{ fontSize: 10, color: '#6E7385' }}>{c.created_at ? new Date(c.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : ''}</span>
                                        </div>
                                        <p style={{ margin: '2px 0 0', fontSize: 13, color: '#1A1E2C', lineHeight: 1.5 }}>{c.content}</p>
                                      </div>
                                    </div>
                                  ))
                              }
                              <div style={{ display: 'flex', gap: 8 }}>
                                <input
                                  value={newComment}
                                  onChange={e => setNewComment(e.target.value)}
                                  onKeyDown={e => e.key === 'Enter' && handlePostComment()}
                                  placeholder={`Commenter "${fieldDef.label}"…`}
                                  autoFocus
                                  style={{ flex: 1, height: 34, border: '1.5px solid #E8E6E1', borderRadius: 8, padding: '0 10px', fontSize: 12, outline: 'none', fontFamily: 'inherit', background: '#fff' }}
                                  onFocus={e => e.target.style.borderColor = '#0E2A6B'}
                                  onBlur={e => e.target.style.borderColor = '#E8E6E1'}
                                  disabled={postingComment}
                                />
                                <button onClick={handlePostComment} disabled={!newComment.trim() || postingComment}
                                  style={{ height: 34, padding: '0 14px', background: newComment.trim() ? '#0E2A6B' : '#E8E6E1', color: newComment.trim() ? '#fff' : '#6E7385', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: newComment.trim() ? 'pointer' : 'default', fontFamily: 'inherit' }}>
                                  →
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                ))}
              </div>
            </div>
          )}
        </main>
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

      {/* ── Modale confirmation validation ── */}
      {confirmValidate && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000 }}
          onClick={(e) => { if (e.target === e.currentTarget && !validating) setConfirmValidate(false) }}>
          <div style={{ background: '#fff', borderRadius: 12, padding: '28px 28px 24px', width: 420, boxShadow: '0 20px 60px rgba(0,0,0,0.25)' }}>
            <div style={{ fontWeight: 700, fontSize: 16, color: '#1e293b', marginBottom: 8 }}>
              {validated ? 'Retirer la validation ?' : 'Valider cette mission ?'}
            </div>
            <div style={{ fontSize: 13, color: '#64748b', marginBottom: 24, lineHeight: 1.6 }}>
              {validated
                ? <><strong>« {slideTitle} »</strong> repassera en <strong style={{ color: '#64748b' }}>Brouillon</strong> et ne sera plus marquée comme prête.{slide.sharepoint_url && <> Le fichier SharePoint sera également supprimé.</>}</>
                : <><strong>« {slideTitle} »</strong> sera marquée comme <strong style={{ color: '#16a34a' }}>Ready</strong> et <strong>publiée automatiquement sur SharePoint</strong> dans le dossier des références WeFiiT.</>
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
                style={{ flex: 1, background: '#f1f5f9', color: '#475569', border: 'none', borderRadius: 7, padding: '10px 0', fontWeight: 600, fontSize: 14, cursor: 'pointer', fontFamily: 'inherit' }}>
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modale succès publication SharePoint ── */}
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
              <strong>« {slideTitle} »</strong> est maintenant marquée <strong style={{ color: '#16a34a' }}>Ready</strong>.{' '}
              {publishedUrl
                ? 'Le fichier est disponible sur SharePoint.'
                : 'Disponible sur SharePoint.'}
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
    </div>
  )
}

function relativeTime(ts) {
  const diff = Math.floor((Date.now() - ts) / 1000)
  if (diff < 60)  return "à l'instant"
  const mins = Math.floor(diff / 60)
  if (mins < 60)  return `il y a ${mins} min`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `il y a ${hours} h`
  const days = Math.floor(hours / 24)
  return `il y a ${days} jour${days > 1 ? 's' : ''}`
}

const styles = {
  topbar: {
    height: TOPBAR_H,
    background: '#fff',
    borderBottom: '1px solid #E8E6E1',
    display: 'flex',
    alignItems: 'center',
    padding: '0 16px',
    gap: 12,
    flexShrink: 0,
  },
  divider: {
    width: 1,
    height: 22,
    background: '#E8E6E1',
  },
  title: {
    fontSize: 14,
    fontWeight: 600,
    color: '#1A1E2C',
  },
  savedStatus: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 5,
    fontSize: 12,
    color: '#6E7385',
  },
  btnBack: {
    height: 32,
    padding: '0 10px 0 8px',
    background: 'transparent',
    color: '#1A1E2C',
    border: 'none',
    borderRadius: 8,
    fontSize: 13,
    fontWeight: 500,
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    fontFamily: 'inherit',
  },
  btnSecondary: {
    height: 34,
    padding: '0 14px',
    background: '#fff',
    color: '#1A1E2C',
    border: '1px solid #E8E6E1',
    borderRadius: 8,
    fontSize: 13,
    fontWeight: 500,
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    gap: 7,
    fontFamily: 'inherit',
  },
  btnPrimary: (disabled) => ({
    height: 34,
    padding: '0 18px',
    background: disabled ? '#c9a882' : '#E97433',
    color: '#fff',
    border: 'none',
    borderRadius: 8,
    fontSize: 13,
    fontWeight: 600,
    cursor: disabled ? 'default' : 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    gap: 7,
    fontFamily: 'inherit',
    opacity: disabled ? 0.7 : 1,
  }),
  rail: {
    width: RAIL_W,
    background: '#fff',
    borderRight: '1px solid #E8E6E1',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '14px 0',
    gap: 4,
    flexShrink: 0,
  },
  railItem: (active) => ({
    width: 64,
    height: 64,
    borderRadius: 10,
    background: active ? '#EEF1FA' : 'transparent',
    color: active ? '#0E2A6B' : '#6E7385',
    border: 'none',
    cursor: active ? 'default' : 'pointer',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    fontFamily: 'inherit',
  }),
  railLabel: {
    fontSize: 11,
    fontWeight: 600,
  },
}
