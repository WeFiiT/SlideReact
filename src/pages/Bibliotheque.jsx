import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { createRoot } from 'react-dom/client'
import { supabase } from '../supabaseClient'
import SlideCard from '../components/SlideCard'
import SlideTemplate, { DEFAULT_LAYOUT } from '../components/SlideTemplate'
import { TYPES, TYPE_COLORS, DISCIPLINES, NIVEAUX, MANAGEMENT_OPTIONS, SUJETS_MISSION, OUTILS, computeStatus, normalizeName } from '../constants'
import ClientSelector from '../components/ClientSelector'
import { getUser, logout } from './Login'

const VIEWS = [
  { id: 'all',     label: 'Toutes les missions',  field: null                },
  { id: 'segment', label: 'Segment & Client',     field: 'segmentation'      },
  { id: 'niveau',  label: 'Niveau de discipline', field: 'niveau_discipline' },
  { id: 'produit', label: 'Type de produit',      field: 'type_produit'      },
  { id: 'mission', label: 'Type de mission',      field: 'type_mission'      },
  { id: 'favoris', label: 'Favoris',              field: null                },
]

const DATE_OPTIONS = [
  { label: 'Toutes les dates', value: 'all' },
  { label: '7 derniers jours',  value: '7d'  },
  { label: '30 derniers jours', value: '30d' },
  { label: '3 derniers mois',   value: '3m'  },
]

export default function Bibliotheque() {
  const navigate = useNavigate()
  const user = getUser()

  const [slides, setSlides]       = useState([])
  const [loading, setLoading]     = useState(true)
  const [showModal, setShowModal]     = useState(false)
  const [modalStep, setModalStep]     = useState(1)
  const [creating, setCreating]       = useState(false)
  const [newSujet, setNewSujet]       = useState('')
  const [newOutil, setNewOutil]       = useState('')
  const emptyDraft = () => ({ prenom: user?.prenom || '', nom: user?.nom || '', titre: '', type_mission: '', client: '', segmentation: '', logo_url: '', discipline: '', niveau_discipline: '', management: '', sujets_mission: [], outils: [] })
  const [draft, setDraft]         = useState(emptyDraft)

  /* Filtres */
  const [search,       setSearch]       = useState('')
  const [dateFilter,   setDateFilter]   = useState('all')
  const [typeFilter,   setTypeFilter]   = useState(null)
  const [statusFilter, setStatusFilter] = useState(null)

  /* Multi-sélection */
  const [selectMode,      setSelectMode]      = useState(false)
  const [selectedIds,     setSelectedIds]     = useState([])
  const [confirmBulkDel,  setConfirmBulkDel]  = useState(false)
  const [bulkDeleting,    setBulkDeleting]    = useState(false)
  const [notifications,   setNotifications]   = useState([])
  const [notifOpen,       setNotifOpen]       = useState(false)
  const notifRef                              = useRef(null)
  const [batchExporting,  setBatchExporting]  = useState(false)
  const [batchProgress,   setBatchProgress]   = useState({ current: 0, total: 0 })
  const [batchFormatMenu, setBatchFormatMenu] = useState(false)
  const batchMenuRef                          = useRef(null)
  const [activeView,      setActiveView]      = useState('all')
  const [showDateMenu,    setShowDateMenu]    = useState(false)
  const [activeSection,   setActiveSection]   = useState(null)
  const dateMenuRef                           = useRef(null)

  const toggleSelect = (id) =>
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])

  const exitSelectMode = () => { setSelectMode(false); setSelectedIds([]) }

  const handleBulkDelete = async () => {
    setBulkDeleting(true)
    const { error } = await supabase.from('slides').delete().in('id', selectedIds)
    if (!error) {
      setSlides(prev => prev.filter(s => !selectedIds.includes(s.id)))
      exitSelectMode()
      setConfirmBulkDel(false)
    } else {
      alert('Erreur lors de la suppression.')
    }
    setBulkDeleting(false)
  }

  const renderSlideCanvas = async (slide) => {
    const { default: html2canvas } = await import('html2canvas')
    const container = document.createElement('div')
    Object.assign(container.style, {
      position: 'fixed', top: '0', left: '-9999px',
      width: '1280px', height: '720px', overflow: 'hidden', zIndex: '-1',
    })
    document.body.appendChild(container)
    const root = createRoot(container)
    await new Promise(resolve => {
      root.render(
        <SlideTemplate {...slide} editMode={false} textEditMode={false}
          layout={DEFAULT_LAYOUT} onLayoutChange={() => {}} onTextChange={() => {}} />
      )
      setTimeout(resolve, 220)
    })
    const canvas = await html2canvas(container, {
      scale: 2, useCORS: true, width: 1280, height: 720, scrollX: 0, scrollY: 0,
    })
    root.unmount()
    document.body.removeChild(container)
    return canvas
  }

  const handleBatchExport = async (format) => {
    const targets = slides.filter(s => selectedIds.includes(s.id))
    if (!targets.length) return
    setBatchFormatMenu(false)
    setBatchExporting(true)
    setBatchProgress({ current: 0, total: targets.length })
    await document.fonts.ready

    if (format === 'pdf') {
      const { jsPDF } = await import('jspdf')
      const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: [297, 167.0625] })
      for (let i = 0; i < targets.length; i++) {
        setBatchProgress({ current: i + 1, total: targets.length })
        const canvas = await renderSlideCanvas(targets[i])
        if (i > 0) pdf.addPage([297, 167.0625], 'landscape')
        pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, 297, 167.0625)
      }
      pdf.save(`export-slides-${targets.length}.pdf`)
    } else if (format === 'pptx') {
      setBatchProgress({ current: 0, total: targets.length })
      const { buildNativePptx } = await import('../utils/exportPptx')
      const pptx = await buildNativePptx(targets)
      await pptx.writeFile({ fileName: `export-slides-${targets.length}.pptx` })
    } else {
      const { default: JSZip } = await import('jszip')
      const zip = new JSZip()
      for (let i = 0; i < targets.length; i++) {
        setBatchProgress({ current: i + 1, total: targets.length })
        const canvas = await renderSlideCanvas(targets[i])
        const filename = (targets[i].card_titre || targets[i].titre || `slide-${i + 1}`).replace(/[/\\?%*:|"<>]/g, '-')
        zip.file(`${filename}.png`, canvas.toDataURL('image/png').split(',')[1], { base64: true })
      }
      const blob = await zip.generateAsync({ type: 'blob' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.download = `export-slides-${targets.length}.zip`
      link.href = url
      link.click()
      URL.revokeObjectURL(url)
    }

    setBatchExporting(false)
    exitSelectMode()
  }

  useEffect(() => {
    if (!batchFormatMenu) return
    const h = (e) => { if (batchMenuRef.current && !batchMenuRef.current.contains(e.target)) setBatchFormatMenu(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [batchFormatMenu])

  useEffect(() => {
    if (!showDateMenu) return
    const h = (e) => { if (dateMenuRef.current && !dateMenuRef.current.contains(e.target)) setShowDateMenu(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [showDateMenu])

  useEffect(() => {
    supabase.from('slides').select('*').order('created_at', { ascending: false })
      .then(({ data, error }) => {
        if (error) console.error(error)
        else setSlides(data || [])
        setLoading(false)
      })
  }, [])

  useEffect(() => {
    if (!user) return
    supabase.from('notifications')
      .select('*').eq('user_email', user.email)
      .order('created_at', { ascending: false }).limit(30)
      .then(({ data }) => { if (data) setNotifications(data) })
  }, [user?.email])

  useEffect(() => {
    if (!notifOpen) return
    const h = (e) => { if (notifRef.current && !notifRef.current.contains(e.target)) setNotifOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [notifOpen])

  const openNotifications = () => {
    setNotifOpen(v => !v)
    // Mark all as read
    if (!notifOpen && notifications.some(n => !n.read) && user) {
      supabase.from('notifications').update({ read: true }).eq('user_email', user.email)
        .then(() => setNotifications(prev => prev.map(n => ({ ...n, read: true }))))
    }
  }

  const handleDeleted   = (id)        => setSlides(prev => prev.filter(s => s.id !== id))
  const handleValidated = (id, value) => setSlides(prev => prev.map(s => s.id === id ? { ...s, validated: value } : s))
  const handleFavorited = (id, next)  => setSlides(prev => prev.map(s => s.id === id ? { ...s, favorited_by: next } : s))

  /* Filtrage client-side */
  const filteredSlides = useMemo(() => {
    let result = slides

    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter(s => [
        s.card_titre, s.titre, s.sous_titre, s.prenom, s.nom, s.type_mission,
        s.metrique_1_label, s.metrique_2_label, s.metrique_3_label,
        ...(s.contexte  || []),
        ...(s.perimetre || []),
        ...(s.enjeux    || []),
        ...(s.impact    || []),
        ...(s.tags      || []),
      ].some(v => v?.toLowerCase().includes(q)))
    }

    if (dateFilter !== 'all') {
      const days = { '7d': 7, '30d': 30, '3m': 90 }[dateFilter]
      const cutoff = Date.now() - days * 86400_000
      result = result.filter(s => new Date(s.created_at).getTime() >= cutoff)
    }

    if (typeFilter) {
      result = result.filter(s => s.type_mission === typeFilter)
    }

    if (statusFilter) {
      result = result.filter(s => computeStatus(s) === statusFilter)
    }

    return result
  }, [slides, search, dateFilter, typeFilter, statusFilter])

  const sortFavsFirst = (arr) => {
    if (!user) return arr
    return [...arr].sort((a, b) => {
      const aFav = (a.favorited_by || []).includes(user.email) ? 0 : 1
      const bFav = (b.favorited_by || []).includes(user.email) ? 0 : 1
      return aFav - bFav
    })
  }

  const isMySlide = (s) => user && (
    s.owner_email === user.email ||
    (!s.owner_email && normalizeName(s.prenom) === user.prenomNorm && normalizeName(s.nom) === user.nomNorm)
  )

  const myFilteredSlides = useMemo(() =>
    user ? sortFavsFirst(filteredSlides.filter(isMySlide)) : []
  , [filteredSlides, user])

  const othersFilteredSlides = useMemo(() =>
    user ? sortFavsFirst(filteredSlides.filter(s => !isMySlide(s))) : filteredSlides
  , [filteredSlides, user])

  const groupedSlides = useMemo(() => {
    if (activeView === 'all' || activeView === 'favoris') return []
    const view = VIEWS.find(v => v.id === activeView)
    if (!view?.field) return []

    const favsFirst = (arr) => user
      ? [...arr].sort((a, b) => {
          const af = (a.favorited_by || []).includes(user.email) ? 0 : 1
          const bf = (b.favorited_by || []).includes(user.email) ? 0 : 1
          return af - bf
        })
      : arr

    const byKey = {}
    const seenSet = new Set()
    filteredSlides.forEach(s => {
      const raw = s[view.field]
      const keys = Array.isArray(raw)
        ? (raw.length > 0 ? raw : ['Non renseigné'])
        : [raw || 'Non renseigné']
      keys.forEach(k => {
        if (!byKey[k]) { byKey[k] = []; seenSet.add(k) }
        byKey[k].push(s)
      })
    })
    const seen = [...seenSet]

    const knownOrder = {
      niveau_discipline: ['Junior', 'Confirmé', 'Senior', 'Lead'],
      type_mission:      TYPES,
      discipline:        DISCIPLINES,
    }
    const sorted = [...seen].sort((a, b) => {
      if (a === 'Non renseigné') return 1
      if (b === 'Non renseigné') return -1
      const order = knownOrder[view.field]
      if (order) {
        const ia = order.indexOf(a) === -1 ? 999 : order.indexOf(a)
        const ib = order.indexOf(b) === -1 ? 999 : order.indexOf(b)
        return ia - ib
      }
      return a.localeCompare(b, 'fr')
    })

    if (activeView === 'segment') {
      return sorted.map(seg => {
        const byClient = {}
        const clientSeen = []
        byKey[seg].forEach(s => {
          const c = s.client || 'Sans client'
          if (!byClient[c]) { byClient[c] = []; clientSeen.push(c) }
          byClient[c].push(s)
        })
        const sortedClients = [...clientSeen].sort((a, b) =>
          a === 'Sans client' ? 1 : b === 'Sans client' ? -1 : a.localeCompare(b, 'fr')
        )
        return {
          label: seg,
          count: byKey[seg].length,
          subGroups: sortedClients.map(c => ({ label: c, slides: favsFirst(byClient[c]) })),
        }
      })
    }

    return sorted.map(k => ({ label: k, count: byKey[k].length, slides: favsFirst(byKey[k]) }))
  }, [activeView, filteredSlides, user])

  const canCreate  = draft.prenom.trim() && draft.nom.trim() && draft.titre.trim() && draft.client.trim() && draft.type_mission
  const canCreate2 = draft.discipline && draft.niveau_discipline && draft.management && draft.sujets_mission.length > 0 && draft.outils.length > 0

  const handleCreate = async () => {
    if (!canCreate) return
    setCreating(true)
    const { data, error } = await supabase
      .from('slides')
      .insert({
        contexte: [], tags: [], perimetre: [], enjeux: [], impact: [],
        type_mission:      draft.type_mission || null,
        prenom:            draft.prenom.trim(),
        nom:               draft.nom.trim(),
        card_titre:        draft.titre.trim(),
        client:            draft.client || null,
        segmentation:      draft.segmentation || null,
        discipline:        draft.discipline || null,
        niveau_discipline: draft.niveau_discipline || null,
        management:        draft.management || null,
        sujets_mission:    draft.sujets_mission.length ? draft.sujets_mission : null,
        outils:            draft.outils.length ? draft.outils : null,
        logo_url:          draft.logo_url || null,
        owner_email:       user?.email || null,
      })
      .select()
      .single()
    if (error) { alert('Erreur : ' + error.message); setCreating(false); return }
    setCreating(false)
    setShowModal(false)
    setDraft(emptyDraft())
    navigate(`/preview/${data.id}?edit=1`)
  }

  const openModal = () => {
    setDraft(emptyDraft())
    setModalStep(1)
    setNewSujet('')
    setNewOutil('')
    setShowModal(true)
  }

  const hasActiveFilters = search || dateFilter !== 'all' || typeFilter || statusFilter

  const showToc = activeView !== 'all' && activeView !== 'favoris' && groupedSlides.length > 1

  const scrollToSection = (label) => {
    const el = document.getElementById(`toc-${encodeURIComponent(label)}`)
    if (el) { el.scrollIntoView({ behavior: 'smooth', block: 'start' }); setActiveSection(label) }
  }

  useEffect(() => {
    if (!showToc) { setActiveSection(null); return }
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.find(e => e.isIntersecting)
        if (visible) setActiveSection(decodeURIComponent(visible.target.id.replace('toc-', '')))
      },
      { threshold: 0.1, rootMargin: '-80px 0px -60% 0px' },
    )
    groupedSlides.forEach(({ label }) => {
      const el = document.getElementById(`toc-${encodeURIComponent(label)}`)
      if (el) observer.observe(el)
    })
    return () => observer.disconnect()
  }, [showToc, groupedSlides])
  const activeDateLabel  = DATE_OPTIONS.find(o => o.value === dateFilter)?.label ?? 'Toutes les dates'

  const typeCounts = useMemo(() => {
    const counts = { all: slides.length }
    TYPES.forEach(t => { counts[t] = slides.filter(s => s.type_mission === t).length })
    return counts
  }, [slides])

  const statusCounts = useMemo(() => ({
    ready: slides.filter(s => computeStatus(s) === 'ready').length,
    draft: slides.filter(s => computeStatus(s) === 'draft').length,
  }), [slides])

  return (
    <div style={{ minHeight: '100vh', background: '#FBFAF7', fontFamily: 'Inter, system-ui, sans-serif' }}>

      {/* ── Brand bar ── */}
      <div style={{ height: 56, background: '#fff', borderBottom: '1px solid #E8E6E1', display: 'flex', alignItems: 'center', padding: '0 24px', gap: 16 }}>
        <WefiitLogoSVG size={32} />
        <span style={{ fontSize: 15, fontWeight: 700, color: '#0E2A6B', letterSpacing: -0.2 }}>WeFiiT</span>
        <div style={{ width: 1, height: 18, background: '#E8E6E1', margin: '0 4px' }} />
        <span style={{ fontSize: 13, color: '#0E2A6B', fontWeight: 600 }}>Annuaire</span>
        <div style={{ flex: 1 }} />
        {/* User chip */}
        <div style={{ height: 40, padding: '0 14px 0 6px', background: '#fff', border: '1px solid #E8E6E1', borderRadius: 999, display: 'inline-flex', alignItems: 'center', gap: 10 }}>
          <span style={{ width: 30, height: 30, borderRadius: '50%', background: '#DCE3F2', color: '#0E2A6B', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, flexShrink: 0 }}>
            {user?.prenom?.[0]}{user?.nom?.[0]}
          </span>
          <span style={{ fontSize: 13, color: '#1A1E2C', fontWeight: 600 }}>{user?.prenom} {user?.nom}</span>
        </div>
        <div ref={notifRef} style={{ position: 'relative' }}>
          <button
            onClick={openNotifications}
            title="Notifications"
            style={{ position: 'relative', width: 40, height: 40, borderRadius: 10, background: notifOpen ? '#F3F1EC' : '#fff', border: '1px solid #E8E6E1', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: '#6E7385' }}
            onMouseEnter={e => { e.currentTarget.style.background = '#F3F1EC' }}
            onMouseLeave={e => { if (!notifOpen) e.currentTarget.style.background = '#fff' }}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <path d="M8 2a5 5 0 0 1 5 5v2l1 2H2l1-2V7a5 5 0 0 1 5-5zM6.5 13a1.5 1.5 0 0 0 3 0"/>
            </svg>
            {notifications.some(n => !n.read) && (
              <span style={{ position: 'absolute', top: 7, right: 7, width: 7, height: 7, borderRadius: '50%', background: '#E97433', border: '1.5px solid #fff' }} />
            )}
          </button>

          {notifOpen && (
            <div style={{ position: 'absolute', top: 'calc(100% + 8px)', right: 0, width: 320, background: '#fff', borderRadius: 12, boxShadow: '0 8px 32px rgba(0,0,0,0.14)', border: '1px solid #E8E6E1', zIndex: 600, overflow: 'hidden' }}>
              <div style={{ padding: '14px 16px 10px', display: 'flex', alignItems: 'center', gap: 8, borderBottom: '1px solid #E8E6E1' }}>
                <span style={{ fontSize: 14, fontWeight: 700, color: '#1A1E2C' }}>Notifications</span>
                {notifications.filter(n => !n.read).length > 0 && (
                  <span style={{ fontSize: 11, fontWeight: 700, background: '#E97433', color: '#fff', padding: '2px 7px', borderRadius: 999 }}>
                    {notifications.filter(n => !n.read).length}
                  </span>
                )}
              </div>
              {notifications.length === 0 ? (
                <p style={{ padding: '16px', color: '#6E7385', fontSize: 13, margin: 0 }}>Aucune notification pour le moment.</p>
              ) : (
                <div style={{ maxHeight: 380, overflowY: 'auto' }}>
                  {notifications.map(n => (
                    <div key={n.id} style={{ padding: '12px 16px', borderBottom: '1px solid #F5F4F0', background: n.read ? '#fff' : '#FAFBFF', display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                      <span style={{ width: 7, height: 7, borderRadius: '50%', background: n.read ? 'transparent' : '#E97433', flexShrink: 0, marginTop: 6 }} />
                      <div style={{ flex: 1 }}>
                        <p style={{ margin: '0 0 3px', fontSize: 13, color: '#1A1E2C', lineHeight: 1.4 }}>
                          {n.type === 'comment'
                            ? <><strong>{n.from_name}</strong> a commenté <strong>«&nbsp;{n.slide_title}&nbsp;»</strong></>
                            : <><strong>{n.from_name}</strong> a marqué <strong>«&nbsp;{n.slide_title}&nbsp;»</strong> comme Ready</>
                          }
                        </p>
                        <span style={{ fontSize: 11, color: '#6E7385' }}>
                          {n.created_at ? new Date(n.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : ''}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <button
          onClick={() => { logout(); navigate('/login') }}
          title="Se déconnecter"
          style={{ width: 40, height: 40, borderRadius: 10, background: '#fff', border: '1px solid #E8E6E1', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: '#6E7385' }}
          onMouseEnter={e => { e.currentTarget.style.background = '#F3F1EC' }}
          onMouseLeave={e => { e.currentTarget.style.background = '#fff' }}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 3H4a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h5" />
            <path d="M11 5l3 3-3 3M14 8H7" />
          </svg>
        </button>
      </div>

    <div style={{ height: 'calc(100vh - 56px)', overflowY: 'auto' }}>
      <div style={{ maxWidth: 1020, margin: '0 auto', padding: '28px 32px 80px' }}>

      {/* ── Title + actions ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 800, color: '#0E2A6B', margin: 0, letterSpacing: -0.4, fontFamily: "'Geomanist', Arial, sans-serif" }}>Annuaire des missions</h1>
          <span style={{ fontSize: 13, color: '#6E7385' }}>{slides.length} mission{slides.length !== 1 ? 's' : ''}</span>
        </div>
        <div style={{ flex: 1 }} />
        {/* Search */}
        <div style={{ height: 36, background: '#fff', border: '1px solid #E8E6E1', borderRadius: 10, display: 'inline-flex', alignItems: 'center', gap: 8, padding: '0 12px', width: 240 }}>
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="#6E7385" strokeWidth="1.6" strokeLinecap="round"><circle cx="7" cy="7" r="4.5" /><path d="M13 13l-2.5-2.5" /></svg>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher…"
            style={{ flex: 1, border: 'none', outline: 'none', fontSize: 13, color: '#1A1E2C', background: 'transparent', fontFamily: 'inherit' }} />
        </div>
        <button onClick={() => { setSelectMode(v => !v); setSelectedIds([]) }}
          style={{ height: 36, padding: '0 14px', background: selectMode ? '#1A1E2C' : '#fff', color: selectMode ? '#fff' : '#1A1E2C', border: '1px solid #E8E6E1', borderRadius: 10, fontSize: 13, fontWeight: 500, display: 'inline-flex', alignItems: 'center', gap: 7, cursor: 'pointer', fontFamily: 'inherit' }}>
          {selectMode ? '✕ Annuler' : <><span style={{ width: 13, height: 13, border: '1.5px solid #6E7385', borderRadius: 3, display: 'inline-block' }} />Sélectionner</>}
        </button>
        {!selectMode && (
          <button onClick={openModal} style={{ height: 36, padding: '0 16px', background: '#E97433', color: '#fff', border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontFamily: 'inherit' }}>
            <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round"><path d="M8 3v10M3 8h10" /></svg>
            Ajouter une mission
          </button>
        )}
      </div>

      {/* ── Onglets de vue ── */}
      <div style={{ display: 'flex', borderBottom: '2px solid #E8E6E1', marginBottom: 20, gap: 0 }}>
        {VIEWS.map(v => {
          const active = activeView === v.id
          const tabIcons = {
            all:     <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="1" width="6" height="6" rx="1.2"/><rect x="9" y="1" width="6" height="6" rx="1.2"/><rect x="1" y="9" width="6" height="6" rx="1.2"/><rect x="9" y="9" width="6" height="6" rx="1.2"/></svg>,
            segment: <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M2 15V8l6-6 6 6v7"/><path d="M6 15v-4h4v4"/></svg>,
            niveau:  <svg width="13" height="13" viewBox="0 0 16 16" fill="currentColor"><rect x="1" y="11" width="4" height="4" rx="0.8"/><rect x="6" y="7" width="4" height="8" rx="0.8"/><rect x="11" y="3" width="4" height="12" rx="0.8"/></svg>,
            produit: <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M8 1L1 4.5v7L8 15l7-3.5v-7L8 1z"/><path d="M1 4.5L8 8l7-3.5M8 8v7"/></svg>,
            mission: <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="4" width="12" height="10" rx="1.2"/><path d="M5 4V3a1 1 0 011-1h4a1 1 0 011 1v1"/><path d="M5 9h6M5 12h4"/></svg>,
            favoris: <svg width="13" height="13" viewBox="0 0 16 16" fill={active ? '#E97433' : 'none'} stroke={active ? '#E97433' : 'currentColor'} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M8 13.5S1.5 9.5 1.5 5.5a3 3 0 0 1 6-1 3 3 0 0 1 6 1c0 4-6.5 8-6.5 8z"/></svg>,
          }
          return (
            <button key={v.id} onClick={() => setActiveView(v.id)}
              style={{ padding: '10px 14px', border: 'none', background: active ? '#fff' : 'transparent', cursor: 'pointer', fontFamily: 'inherit', fontSize: 13, fontWeight: active ? 700 : 500, color: active ? (v.id === 'favoris' ? '#E97433' : '#0E2A6B') : '#6E7385', borderBottom: `2px solid ${active ? (v.id === 'favoris' ? '#E97433' : '#0E2A6B') : 'transparent'}`, marginBottom: -2, display: 'inline-flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap', flexShrink: 0, borderRadius: '8px 8px 0 0', transition: 'color .12s, background .12s' }}
              onMouseEnter={e => { if (!active) e.currentTarget.style.background = '#F5F5F3' }}
              onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent' }}>
              {tabIcons[v.id]}
              {v.label}
            </button>
          )
        })}
      </div>

      {/* ── Filtres ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 24, flexWrap: 'wrap' }}>

        {/* Type */}
        <div style={{ display: 'inline-flex', background: '#F3F1EC', borderRadius: 8, padding: 3, gap: 2 }}>
          {[{ k: null, label: 'Tous' }, ...TYPES.map(t => ({ k: t, label: t }))].map(({ k, label }) => {
            const active = typeFilter === k
            const count  = k === null ? null : typeCounts[k]
            return (
              <button key={String(k)} onClick={() => setTypeFilter(k)}
                style={{ height: 28, padding: '0 10px', background: active ? '#fff' : 'transparent', color: active ? '#0E2A6B' : '#6E7385', border: 'none', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', display: 'inline-flex', alignItems: 'center', gap: 5, boxShadow: active ? '0 1px 2px rgba(20,28,60,0.07)' : 'none', whiteSpace: 'nowrap' }}>
                {label}
                {count != null && <span style={{ fontSize: 10, fontWeight: 700, background: active ? '#EEF1FA' : 'rgba(20,28,60,0.07)', color: active ? '#0E2A6B' : '#6E7385', padding: '1px 5px', borderRadius: 999 }}>{count}</span>}
              </button>
            )
          })}
        </div>

        <div style={{ width: 1, height: 20, background: '#E8E6E1', flexShrink: 0 }} />

        {/* Statut */}
        <div style={{ display: 'inline-flex', background: '#F3F1EC', borderRadius: 8, padding: 3, gap: 2 }}>
          {[{ k: null, label: 'Tous', dot: null }, { k: 'ready', label: 'Ready', dot: '#3EAE6E' }, { k: 'draft', label: 'Draft', dot: '#B8BCC8' }].map(({ k, label, dot }) => {
            const active = statusFilter === k
            const count  = k === null ? null : statusCounts[k]
            return (
              <button key={String(k)} onClick={() => setStatusFilter(k)}
                style={{ height: 28, padding: '0 10px', background: active ? '#fff' : 'transparent', color: active ? '#0E2A6B' : '#6E7385', border: 'none', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', display: 'inline-flex', alignItems: 'center', gap: 5, boxShadow: active ? '0 1px 2px rgba(20,28,60,0.07)' : 'none' }}>
                {dot && <span style={{ width: 6, height: 6, borderRadius: '50%', background: dot, flexShrink: 0 }} />}
                {label}
                {count != null && <span style={{ fontSize: 10, fontWeight: 700, background: active ? '#EEF1FA' : 'rgba(20,28,60,0.07)', color: active ? '#0E2A6B' : '#6E7385', padding: '1px 5px', borderRadius: 999 }}>{count}</span>}
              </button>
            )
          })}
        </div>

        <div style={{ width: 1, height: 20, background: '#E8E6E1', flexShrink: 0 }} />

        {/* Période */}
        <div ref={dateMenuRef} style={{ position: 'relative' }}>
          <button onClick={() => setShowDateMenu(v => !v)}
            style={{ height: 28, padding: '0 10px', background: dateFilter !== 'all' ? '#EEF1FA' : '#F3F1EC', color: dateFilter !== 'all' ? '#0E2A6B' : '#6E7385', border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', display: 'inline-flex', alignItems: 'center', gap: 5 }}>
            <svg width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"><rect x="2" y="3" width="12" height="11" rx="1.5"/><path d="M5 1v3M11 1v3M2 7h12"/></svg>
            {activeDateLabel}
            <svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"><path d="M3 5l3 3 3-3"/></svg>
          </button>
          {showDateMenu && (
            <div style={{ position: 'absolute', top: 'calc(100% + 6px)', left: 0, background: '#fff', borderRadius: 10, padding: 4, boxShadow: '0 4px 6px -1px rgba(0,0,0,0.07), 0 12px 28px rgba(0,0,0,0.12)', border: '1px solid #E8E6E1', minWidth: 180, zIndex: 300 }}>
              {DATE_OPTIONS.map(o => (
                <button key={o.value} onClick={() => { setDateFilter(o.value); setShowDateMenu(false) }}
                  style={{ width: '100%', background: dateFilter === o.value ? '#EEF1FA' : 'none', border: 'none', padding: '8px 12px', fontSize: 13, color: dateFilter === o.value ? '#0E2A6B' : '#1A1E2C', fontWeight: dateFilter === o.value ? 700 : 500, cursor: 'pointer', borderRadius: 7, textAlign: 'left', fontFamily: 'inherit' }}
                  onMouseEnter={e => { if (dateFilter !== o.value) e.currentTarget.style.background = '#F3F1EC' }}
                  onMouseLeave={e => { if (dateFilter !== o.value) e.currentTarget.style.background = 'none' }}>
                  {o.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {hasActiveFilters && (
          <button onClick={() => { setSearch(''); setDateFilter('all'); setTypeFilter(null); setStatusFilter(null) }}
            style={{ height: 28, padding: '0 10px', background: 'none', border: 'none', color: '#94a3b8', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            <svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M2 2l8 8M10 2l-8 8"/></svg>
            Réinitialiser
          </button>
        )}
      </div>

      {/* ── Sections ── */}
      <div style={{ display: 'flex', gap: 32, alignItems: 'flex-start' }}>
      <div style={{ flex: 1, minWidth: 0 }}>
      {loading ? (
        <>
          <SectionHeader title="Mes missions" count={0} />
          {[0,1,2].map(i => <SkeletonCard key={i} />)}
          <div style={{ marginBottom: 40 }} />
          <SectionHeader title="Autres missions" count={0} />
          {[0,1,2,3].map(i => <SkeletonCard key={`o${i}`} />)}
        </>
      ) : activeView === 'favoris' ? (
        /* ── Vue favoris ── */
        (() => {
          const favSlides = filteredSlides.filter(s => (s.favorited_by || []).includes(user?.email))
          return favSlides.length === 0 ? (
            <p style={{ color: '#94a3b8', fontSize: 13 }}>
              {hasActiveFilters ? 'Aucun résultat pour ces filtres.' : 'Aucune mission en favori pour le moment.'}
            </p>
          ) : (
            <>
              <SectionHeader title="Favoris" count={favSlides.length} />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {favSlides.map(slide => (
                  <SlideCard key={slide.id} slide={slide}
                    onDeleted={handleDeleted} onValidated={handleValidated} onFavorited={handleFavorited}
                    selectMode={selectMode} selected={selectedIds.includes(slide.id)} onSelect={toggleSelect}
                  />
                ))}
              </div>
            </>
          )
        })()
      ) : activeView !== 'all' ? (
        /* ── Vues groupées ── */
        groupedSlides.length === 0 ? (
          <p style={{ color: '#94a3b8', fontSize: 13 }}>
            {hasActiveFilters ? 'Aucun résultat pour ces filtres.' : 'Aucune mission.'}
          </p>
        ) : groupedSlides.map(({ label, count, slides: gs, subGroups }) => (
          <div key={label} id={`toc-${encodeURIComponent(label)}`} style={{ marginBottom: 44 }}>
            <SectionHeader title={label} count={count} />
            {subGroups ? (
              /* Segment → Client (deux niveaux) */
              subGroups.map(({ label: clientLabel, slides: cs }) => (
                <div key={clientLabel} style={{ marginBottom: 20 }}>
                  <p style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.07em', margin: '0 0 10px' }}>{clientLabel}</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {cs.map(slide => (
                      <SlideCard key={slide.id} slide={slide}
                        onDeleted={handleDeleted} onValidated={handleValidated} onFavorited={handleFavorited}
                        selectMode={selectMode} selected={selectedIds.includes(slide.id)} onSelect={toggleSelect}
                      />
                    ))}
                  </div>
                </div>
              ))
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {gs.map(slide => (
                  <SlideCard key={slide.id} slide={slide}
                    onDeleted={handleDeleted} onValidated={handleValidated} onFavorited={handleFavorited}
                    selectMode={selectMode} selected={selectedIds.includes(slide.id)} onSelect={toggleSelect}
                  />
                ))}
              </div>
            )}
          </div>
        ))
      ) : (
        /* ── Vue par défaut : Mes missions / Autres missions ── */
        <>
          <SectionHeader title="Mes missions" count={myFilteredSlides.length} />
          {myFilteredSlides.length === 0 ? (
            <p style={{ color: '#94a3b8', fontSize: 13, marginBottom: 36 }}>
              {hasActiveFilters ? 'Aucun résultat pour ces filtres.' : 'Aucune mission pour l\'instant. Créez-en une !'}
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 40 }}>
              {myFilteredSlides.map(slide => (
                <SlideCard key={slide.id} slide={slide}
                  onDeleted={handleDeleted} onValidated={handleValidated} onFavorited={handleFavorited}
                  selectMode={selectMode} selected={selectedIds.includes(slide.id)} onSelect={toggleSelect}
                />
              ))}
            </div>
          )}
          <SectionHeader title="Autres missions" count={othersFilteredSlides.length} />
          {othersFilteredSlides.length === 0 ? (
            <p style={{ color: '#94a3b8', fontSize: 13 }}>
              {hasActiveFilters ? 'Aucun résultat pour ces filtres.' : 'Aucune autre slide.'}
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {othersFilteredSlides.map(slide => (
                <SlideCard key={slide.id} slide={slide}
                  onDeleted={handleDeleted} onValidated={handleValidated} onFavorited={handleFavorited}
                  selectMode={selectMode} selected={selectedIds.includes(slide.id)} onSelect={toggleSelect}
                />
              ))}
            </div>
          )}
        </>
      )}

      </div>{/* end flex content */}

      {/* ── TOC sticky ── */}
      {showToc && (
        <div style={{ width: 168, flexShrink: 0, position: 'sticky', top: 24, alignSelf: 'flex-start' }}>
          <p style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 10px' }}>Dans cette vue</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {groupedSlides.map(({ label, count }) => {
              const isActive = activeSection === label
              return (
                <button key={label} onClick={() => scrollToSection(label)}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6, padding: '6px 10px', background: isActive ? '#EEF1FA' : 'transparent', border: 'none', borderRadius: 7, cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left', borderLeft: `2px solid ${isActive ? '#0E2A6B' : 'transparent'}`, transition: 'all .12s' }}
                  onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = '#F3F1EC' }}
                  onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent' }}>
                  <span style={{ fontSize: 12, fontWeight: isActive ? 700 : 500, color: isActive ? '#0E2A6B' : '#6E7385', lineHeight: 1.3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{label}</span>
                  <span style={{ fontSize: 10, fontWeight: 600, color: isActive ? '#0E2A6B' : '#94a3b8', background: isActive ? '#DCE3F2' : '#F0EEE9', borderRadius: 999, padding: '1px 5px', flexShrink: 0 }}>{count}</span>
                </button>
              )
            })}
          </div>
        </div>
      )}

      </div>{/* end flex row */}

      {/* ── Barre de sélection flottante ── */}
      {selectMode && (
        <div style={{
          position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)',
          background: '#1e293b', borderRadius: 12, padding: '12px 20px',
          display: 'flex', alignItems: 'center', gap: 16,
          boxShadow: '0 8px 32px rgba(0,0,0,0.3)', zIndex: 500, whiteSpace: 'nowrap',
        }}>
          {batchExporting ? (
            <span style={{ fontSize: 13, color: '#94a3b8', fontWeight: 600 }}>
              Export {batchProgress.current}/{batchProgress.total}…
            </span>
          ) : (
            <span style={{ fontSize: 13, color: '#94a3b8', fontWeight: 600 }}>
              {selectedIds.length} mission{selectedIds.length > 1 ? 's' : ''} sélectionnée{selectedIds.length > 1 ? 's' : ''}
            </span>
          )}
          <button
            onClick={() => setSelectedIds(filteredSlides.map(s => s.id))}
            disabled={batchExporting}
            style={{ background: 'transparent', border: '1px solid #334155', color: '#cbd5e1', borderRadius: 6, padding: '6px 12px', fontSize: 12, fontWeight: 600, cursor: 'pointer', opacity: batchExporting ? 0.4 : 1 }}
          >
            Tout sélectionner
          </button>
          <div ref={batchMenuRef} style={{ position: 'relative' }}>
            <button
              onClick={() => selectedIds.length > 0 && !batchExporting && setBatchFormatMenu(v => !v)}
              disabled={selectedIds.length === 0 || batchExporting}
              style={{ background: selectedIds.length > 0 && !batchExporting ? '#E97433' : '#475569', color: '#fff', border: 'none', borderRadius: 6, padding: '6px 14px', fontSize: 13, fontWeight: 700, cursor: selectedIds.length > 0 && !batchExporting ? 'pointer' : 'default', opacity: selectedIds.length === 0 || batchExporting ? 0.5 : 1, display: 'inline-flex', alignItems: 'center', gap: 7 }}
            >
              <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M8 10V2M5 5l3-3 3 3"/><path d="M3 10v3a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1v-3"/>
              </svg>
              {batchExporting ? `Export ${batchProgress.current}/${batchProgress.total}…` : `Exporter (${selectedIds.length})`}
              <svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.8 }}>
                <path d="M3 5l3 3 3-3"/>
              </svg>
            </button>

            {batchFormatMenu && (
              <div style={{ position: 'absolute', bottom: 'calc(100% + 8px)', left: 0, background: '#1e293b', borderRadius: 8, padding: 4, boxShadow: '0 8px 24px rgba(0,0,0,0.4)', border: '1px solid #334155', minWidth: 180, zIndex: 600 }}>
                {[
                  { fmt: 'png',  label: 'PNG — ZIP de fichiers',        icon: 'M2 12h12M8 2v8M5 7l3-3 3 3' },
                  { fmt: 'pdf',  label: 'PDF — Document multi-pages',   icon: 'M9 2H4a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V6zM9 2v4h4' },
                  { fmt: 'pptx', label: 'PPTX — Présentation multi-slides', icon: 'M1 4h14v9H1zM4 7h2.5M4 9.5h2M10 7v3M10 7h2a1 1 0 0 1 0 2h-2' },
                ].map(({ fmt, label, icon }) => (
                  <button key={fmt} onClick={() => handleBatchExport(fmt)}
                    style={{ width: '100%', background: 'none', border: 'none', padding: '9px 14px', fontSize: 13, color: '#e2e8f0', fontWeight: 500, cursor: 'pointer', borderRadius: 6, textAlign: 'left', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 10 }}
                    onMouseEnter={e => e.currentTarget.style.background = '#334155'}
                    onMouseLeave={e => e.currentTarget.style.background = 'none'}
                  >
                    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="#94a3b8" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                      <path d={icon}/>
                    </svg>
                    {label}
                  </button>
                ))}
              </div>
            )}
          </div>
          <button
            onClick={() => selectedIds.length > 0 && !batchExporting && setConfirmBulkDel(true)}
            disabled={selectedIds.length === 0 || batchExporting}
            style={{ background: selectedIds.length > 0 && !batchExporting ? '#dc2626' : '#475569', color: '#fff', border: 'none', borderRadius: 6, padding: '6px 16px', fontSize: 13, fontWeight: 700, cursor: selectedIds.length > 0 && !batchExporting ? 'pointer' : 'default', opacity: selectedIds.length === 0 || batchExporting ? 0.5 : 1 }}
          >
            🗑️ Supprimer ({selectedIds.length})
          </button>
        </div>
      )}

      {/* ── Modale confirmation suppression en masse ── */}
      {confirmBulkDel && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000 }}
          onClick={(e) => { if (e.target === e.currentTarget && !bulkDeleting) setConfirmBulkDel(false) }}
        >
          <div style={{ background: '#fff', borderRadius: 12, padding: '28px 28px 24px', width: 400, boxShadow: '0 20px 60px rgba(0,0,0,0.25)' }}>
            <div style={{ fontSize: 20, marginBottom: 10 }}>🗑️</div>
            <div style={{ fontWeight: 700, fontSize: 16, color: '#1e293b', marginBottom: 6 }}>
              Supprimer {selectedIds.length} slide{selectedIds.length > 1 ? 's' : ''} ?
            </div>
            <div style={{ fontSize: 13, color: '#64748b', marginBottom: 24, lineHeight: 1.5 }}>
              Cette action est irréversible. Les {selectedIds.length} slides sélectionnées seront supprimées définitivement.
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={handleBulkDelete} disabled={bulkDeleting}
                style={{ flex: 1, background: '#dc2626', color: '#fff', border: 'none', borderRadius: 7, padding: '10px 0', fontWeight: 700, fontSize: 14, cursor: bulkDeleting ? 'default' : 'pointer', opacity: bulkDeleting ? 0.7 : 1 }}>
                {bulkDeleting ? 'Suppression…' : 'Supprimer'}
              </button>
              <button onClick={() => setConfirmBulkDel(false)} disabled={bulkDeleting}
                style={{ flex: 1, background: '#f1f5f9', color: '#475569', border: 'none', borderRadius: 7, padding: '10px 0', fontWeight: 600, fontSize: 14, cursor: 'pointer' }}>
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modale création ── */}
      {showModal && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}
          onClick={(e) => { if (e.target === e.currentTarget) setShowModal(false) }}
        >
          <div style={{ background: '#fff', borderRadius: 14, padding: '32px 32px 28px', width: 480, boxShadow: '0 24px 64px rgba(0,0,0,0.28)', maxHeight: '90vh', overflowY: 'auto' }}>

            {/* Header + indicateur étape */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
              <h2 style={{ margin: 0, color: '#002882', fontSize: 20, fontWeight: 800, fontFamily: "'Publica Play', Arial, sans-serif" }}>
                Nouvelle slide
              </h2>
              <span style={{ fontSize: 12, fontWeight: 700, color: '#94a3b8' }}>{modalStep} / 2</span>
            </div>
            {/* Barre de progression */}
            <div style={{ height: 3, background: '#f1f5f9', borderRadius: 99, marginBottom: 24 }}>
              <div style={{ height: '100%', width: modalStep === 1 ? '50%' : '100%', background: '#E97433', borderRadius: 99, transition: 'width .25s' }} />
            </div>

            {/* ── Étape 1 ── */}
            {modalStep === 1 && (
              <>
                {[
                  { label: 'Prénom', key: 'prenom', placeholder: 'Ex : Marie' },
                  { label: 'Nom', key: 'nom', placeholder: 'Ex : Dupont' },
                  { label: 'Titre de la carte', key: 'titre', placeholder: 'Ex : Transformation digitale RH' },
                ].map(({ label, key, placeholder }) => (
                  <div key={key} style={{ marginBottom: 14 }}>
                    <label style={labelStyle}>{label} <span style={{ color: '#E97433' }}>*</span></label>
                    <input
                      value={draft[key]}
                      onChange={(e) => setDraft((p) => ({ ...p, [key]: e.target.value }))}
                      placeholder={placeholder}
                      onKeyDown={(e) => e.key === 'Enter' && canCreate && setModalStep(2)}
                      autoFocus={key === 'prenom'}
                      style={modalInput}
                      onFocus={(e) => (e.target.style.borderColor = '#002882')}
                      onBlur={(e) => (e.target.style.borderColor = '#e2e8f0')}
                    />
                  </div>
                ))}

                <ClientSelector
                  client={draft.client}
                  segmentation={draft.segmentation}
                  onChange={({ client, segmentation, logo_url }) => setDraft(p => ({ ...p, client, segmentation, logo_url: logo_url || '' }))}
                />

                {/* Type de mission */}
                <div style={{ marginBottom: 24 }}>
                  <label style={labelStyle}>Type de mission <span style={{ color: '#E97433' }}>*</span></label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 6 }}>
                    {TYPES.map(t => {
                      const active = draft.type_mission === t
                      return (
                        <button key={t} onClick={() => setDraft(p => ({ ...p, type_mission: active ? '' : t }))}
                          style={{ background: active ? TYPE_COLORS[t] : '#f1f5f9', color: active ? '#fff' : '#475569', border: active ? `2px solid ${TYPE_COLORS[t]}` : '2px solid transparent', borderRadius: 20, padding: '6px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s' }}>
                          {t}
                        </button>
                      )
                    })}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 10 }}>
                  <button onClick={() => setModalStep(2)} disabled={!canCreate}
                    style={{ ...ctaBtn, flex: 1, opacity: canCreate ? 1 : 0.45, cursor: canCreate ? 'pointer' : 'not-allowed' }}>
                    Suivant →
                  </button>
                  <button onClick={() => setShowModal(false)}
                    style={{ background: '#f1f5f9', color: '#475569', border: 'none', borderRadius: 8, padding: '10px 18px', fontWeight: 600, cursor: 'pointer', fontSize: 14, fontFamily: 'inherit' }}>
                    Annuler
                  </button>
                </div>
              </>
            )}

            {/* ── Étape 2 ── */}
            {modalStep === 2 && (
              <>
                {/* Discipline */}
                <div style={{ marginBottom: 14 }}>
                  <label style={labelStyle}>Discipline <span style={{ color: '#E97433' }}>*</span></label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 6 }}>
                    {DISCIPLINES.map(d => {
                      const active = draft.discipline === d
                      return (
                        <button key={d} onClick={() => setDraft(p => ({ ...p, discipline: active ? '' : d }))}
                          style={{ background: active ? '#0E2A6B' : '#f1f5f9', color: active ? '#fff' : '#475569', border: active ? '2px solid #0E2A6B' : '2px solid transparent', borderRadius: 20, padding: '6px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                          {d}
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* Niveau */}
                <div style={{ marginBottom: 14 }}>
                  <label style={labelStyle}>Niveau <span style={{ color: '#E97433' }}>*</span></label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 6 }}>
                    {NIVEAUX.map(n => {
                      const active = draft.niveau_discipline === n
                      return (
                        <button key={n} onClick={() => setDraft(p => ({ ...p, niveau_discipline: active ? '' : n }))}
                          style={{ background: active ? '#E97433' : '#f1f5f9', color: active ? '#fff' : '#475569', border: active ? '2px solid #E97433' : '2px solid transparent', borderRadius: 20, padding: '6px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                          {n}
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* Management */}
                <div style={{ marginBottom: 14 }}>
                  <label style={labelStyle}>Management <span style={{ color: '#E97433' }}>*</span></label>
                  <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
                    {MANAGEMENT_OPTIONS.map(opt => {
                      const active = draft.management === opt
                      return (
                        <button key={opt} onClick={() => setDraft(p => ({ ...p, management: active ? '' : opt }))}
                          style={{ background: active ? '#0E2A6B' : '#f1f5f9', color: active ? '#fff' : '#475569', border: active ? '2px solid #0E2A6B' : '2px solid transparent', borderRadius: 20, padding: '6px 20px', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                          {opt}
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* Sujets de mission */}
                <div style={{ marginBottom: 14 }}>
                  <label style={labelStyle}>Sujets de mission <span style={{ color: '#E97433' }}>*</span></label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
                    {[...SUJETS_MISSION, ...draft.sujets_mission.filter(s => !SUJETS_MISSION.includes(s))].map(s => {
                      const active = draft.sujets_mission.includes(s)
                      return (
                        <button key={s} onClick={() => setDraft(p => ({ ...p, sujets_mission: active ? p.sujets_mission.filter(x => x !== s) : [...p.sujets_mission, s] }))}
                          style={{ background: active ? '#0E2A6B' : '#f1f5f9', color: active ? '#fff' : '#475569', border: active ? '2px solid #0E2A6B' : '2px solid transparent', borderRadius: 20, padding: '5px 12px', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                          {s}
                        </button>
                      )
                    })}
                  </div>
                  <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                    <input
                      value={newSujet}
                      onChange={e => setNewSujet(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter' && newSujet.trim() && !draft.sujets_mission.includes(newSujet.trim())) {
                          setDraft(p => ({ ...p, sujets_mission: [...p.sujets_mission, newSujet.trim()] }))
                          setNewSujet('')
                        }
                      }}
                      placeholder="Autre…"
                      style={{ ...modalInput, flex: 1, height: 32, padding: '0 10px', fontSize: 12 }}
                      onFocus={e => e.target.style.borderColor = '#002882'}
                      onBlur={e => e.target.style.borderColor = '#e2e8f0'}
                    />
                    <button
                      onClick={() => {
                        if (newSujet.trim() && !draft.sujets_mission.includes(newSujet.trim())) {
                          setDraft(p => ({ ...p, sujets_mission: [...p.sujets_mission, newSujet.trim()] }))
                          setNewSujet('')
                        }
                      }}
                      style={{ height: 32, padding: '0 12px', background: newSujet.trim() ? '#0E2A6B' : '#e2e8f0', color: newSujet.trim() ? '#fff' : '#94a3b8', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: newSujet.trim() ? 'pointer' : 'default', fontFamily: 'inherit' }}>
                      +
                    </button>
                  </div>
                </div>

                {/* Outils */}
                <div style={{ marginBottom: 24 }}>
                  <label style={labelStyle}>Outils <span style={{ color: '#E97433' }}>*</span></label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
                    {[...OUTILS, ...draft.outils.filter(o => !OUTILS.includes(o))].map(o => {
                      const active = draft.outils.includes(o)
                      return (
                        <button key={o} onClick={() => setDraft(p => ({ ...p, outils: active ? p.outils.filter(x => x !== o) : [...p.outils, o] }))}
                          style={{ background: active ? '#E97433' : '#f1f5f9', color: active ? '#fff' : '#475569', border: active ? '2px solid #E97433' : '2px solid transparent', borderRadius: 20, padding: '5px 12px', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                          {o}
                        </button>
                      )
                    })}
                  </div>
                  <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                    <input
                      value={newOutil}
                      onChange={e => setNewOutil(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter' && newOutil.trim() && !draft.outils.includes(newOutil.trim())) {
                          setDraft(p => ({ ...p, outils: [...p.outils, newOutil.trim()] }))
                          setNewOutil('')
                        }
                      }}
                      placeholder="Autre…"
                      style={{ ...modalInput, flex: 1, height: 32, padding: '0 10px', fontSize: 12 }}
                      onFocus={e => e.target.style.borderColor = '#E97433'}
                      onBlur={e => e.target.style.borderColor = '#e2e8f0'}
                    />
                    <button
                      onClick={() => {
                        if (newOutil.trim() && !draft.outils.includes(newOutil.trim())) {
                          setDraft(p => ({ ...p, outils: [...p.outils, newOutil.trim()] }))
                          setNewOutil('')
                        }
                      }}
                      style={{ height: 32, padding: '0 12px', background: newOutil.trim() ? '#E97433' : '#e2e8f0', color: newOutil.trim() ? '#fff' : '#94a3b8', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: newOutil.trim() ? 'pointer' : 'default', fontFamily: 'inherit' }}>
                      +
                    </button>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 10 }}>
                  <button onClick={() => setModalStep(1)}
                    style={{ background: '#f1f5f9', color: '#475569', border: 'none', borderRadius: 8, padding: '10px 18px', fontWeight: 600, cursor: 'pointer', fontSize: 14, fontFamily: 'inherit' }}>
                    ← Retour
                  </button>
                  <button onClick={handleCreate} disabled={creating || !canCreate2}
                    style={{ ...ctaBtn, flex: 1, opacity: (creating || !canCreate2) ? 0.45 : 1, cursor: canCreate2 ? 'pointer' : 'not-allowed' }}>
                    {creating ? 'Création…' : 'Créer la mission →'}
                  </button>
                </div>
              </>
            )}

          </div>
        </div>
      )}
    </div>
    </div>
    </div>
  )
}

/* ── Helpers ── */

function WefiitLogoSVG({ size = 32 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 500 500" style={{ borderRadius: size * 0.18, display: 'block', flexShrink: 0 }}>
      <rect width="500" height="500" fill="#0E2A6B" />
      <circle cx="378.97" cy="326.6" r="23.4" fill="#E97433" />
      <path d="m303.62,275.75c0,22.9-10.94,35.51-30.8,35.51s-30.8-12.61-30.8-35.51v-125.75h-41.39v125.75c0,22.9-10.94,35.51-30.8,35.51s-30.8-12.61-30.8-35.51v-125.75h-41.39v125.75c0,46.49,25.78,74.25,68.95,74.25,24.12,0,42.98-9.58,54.74-27.74,11.66,17.91,30.97,27.74,54.73,27.74,43.18,0,68.95-27.76,68.95-74.25v-125.75h-41.39v125.75Z" fill="#fff" />
    </svg>
  )
}

function SkeletonCard() {
  return (
    <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #E8E6E1', padding: 12, display: 'flex', alignItems: 'center', gap: 16, marginBottom: 12 }}>
      <div className="sk" style={{ width: 140, height: 79, borderRadius: 6, flexShrink: 0 }} />
      <div style={{ flex: 1 }}>
        <div className="sk" style={{ height: 15, width: '55%', marginBottom: 8 }} />
        <div className="sk" style={{ height: 12, width: '35%', marginBottom: 16 }} />
        <div style={{ display: 'flex', gap: 8 }}>
          <div className="sk" style={{ height: 10, width: 60 }} />
          <div className="sk" style={{ height: 10, width: 40 }} />
          <div className="sk" style={{ height: 10, width: 80 }} />
        </div>
      </div>
      <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
        <div className="sk" style={{ width: 30, height: 30, borderRadius: 8 }} />
        <div className="sk" style={{ width: 30, height: 30, borderRadius: 8 }} />
        <div className="sk" style={{ width: 64, height: 30, borderRadius: 8 }} />
      </div>
    </div>
  )
}

function SectionHeader({ title, count }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
      <span style={{ fontSize: 15, fontWeight: 700, color: '#1A1E2C' }}>{title}</span>
      <span style={{ fontSize: 12, fontWeight: 600, color: '#6E7385', background: '#F0EEE9', borderRadius: 20, padding: '2px 9px' }}>
        {count}
      </span>
      <div style={{ flex: 1, height: 1, background: '#E8E6E1' }} />
    </div>
  )
}


const ctaBtn = {
  background: '#f08a2a',
  color: '#fff',
  border: 'none',
  borderRadius: 8,
  padding: '10px 22px',
  fontSize: 15,
  fontWeight: 700,
  cursor: 'pointer',
  fontFamily: 'inherit',
}

const labelStyle = {
  display: 'block',
  fontSize: 11,
  fontWeight: 700,
  color: '#64748b',
  marginBottom: 5,
  textTransform: 'uppercase',
  letterSpacing: 0.6,
}

const modalInput = {
  width: '100%',
  border: '1.5px solid #e2e8f0',
  borderRadius: 7,
  padding: '9px 12px',
  fontSize: 14,
  boxSizing: 'border-box',
  outline: 'none',
  fontFamily: 'inherit',
  transition: 'border-color 0.15s',
}
