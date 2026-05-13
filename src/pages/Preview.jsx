import { useEffect, useRef, useState } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import html2canvas from 'html2canvas'
import { supabase } from '../supabaseClient'
import SlideTemplate, { DEFAULT_LAYOUT } from '../components/SlideTemplate'

const TOPBAR_H = 56
const RAIL_W   = 80

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
  const autoExportParam = searchParams.get('export') === '1'
  const editParam       = searchParams.get('edit')   === '1'
  const autoExportDone  = useRef(false)
  const slideRef        = useRef(null)
  const saveTimer       = useRef(null)

  const [slide, setSlide]               = useState(null)
  const [loading, setLoading]           = useState(true)
  const [exporting, setExporting]       = useState(false)
  const [scale, setScale]               = useState(1)
  const [textEditMode, setTextEditMode] = useState(false)
  const [layout]                        = useState(() => loadLayout(id))
  const [saving, setSaving]             = useState(false)
  const [lastSaved, setLastSaved]       = useState(null)
  const [tick, setTick]                 = useState(0)

  useEffect(() => {
    supabase.from('slides').select('*').eq('id', id).single()
      .then(({ data, error }) => {
        if (error) console.error(error)
        else setSlide(data)
        setLoading(false)
      })
  }, [id])

  useEffect(() => {
    const upd = () => {
      const s = Math.min(
        (window.innerWidth - RAIL_W) / 1280,
        (window.innerHeight - TOPBAR_H) / 720,
      )
      setScale(s)
    }
    upd()
    window.addEventListener('resize', upd)
    return () => window.removeEventListener('resize', upd)
  }, [])

  useEffect(() => {
    if (!autoExportParam || loading || !slide || autoExportDone.current) return
    autoExportDone.current = true
    exportPNG()
  }, [autoExportParam, loading, slide])

  useEffect(() => {
    if (editParam && slide && !loading) setTextEditMode(true)
  }, [editParam, slide, loading])

  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 60_000)
    return () => clearInterval(id)
  }, [])

  const schedSave = (updated) => {
    if (saveTimer.current) clearTimeout(saveTimer.current)
    setSaving(true)
    saveTimer.current = setTimeout(async () => {
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

  const exportPNG = async () => {
    if (!slideRef.current) return
    setExporting(true)
    try {
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

      const filename = (slide?.card_titre || slide?.titre || 'slide').replace(/[/\\?%*:|"<>]/g, '-')
      const link = document.createElement('a')
      link.download = `${filename}.png`
      link.href = canvas.toDataURL('image/png')
      link.click()
    } finally { setExporting(false) }
  }

  const handleExport = () => {
    if (textEditMode) {
      setTextEditMode(false)
      setTimeout(exportPNG, 80)
    } else {
      exportPNG()
    }
  }

  if (loading) return <p style={{ padding: 32, color: '#6E7385' }}>Chargement…</p>
  if (!slide)  return <p style={{ padding: 32, color: '#dc2626' }}>Slide introuvable.</p>

  const slideTitle = slide.card_titre || slide.titre || 'Sans titre'
  const savedLabel = lastSaved ? relativeTime(lastSaved) : null

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

        {!textEditMode ? (
          <button onClick={() => setTextEditMode(true)} style={styles.btnSecondary}>
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 5V3.5h8V5M8 3.5v9M6 12.5h4"/>
            </svg>
            Éditer le texte
          </button>
        ) : (
          <button onClick={() => setTextEditMode(false)} style={{ ...styles.btnSecondary, color: '#3EAE6E', borderColor: '#3EAE6E' }}>
            ✓ Terminer
          </button>
        )}

        <button onClick={handleExport} disabled={exporting} style={styles.btnPrimary(exporting)}>
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M8 10V2M5 5l3-3 3 3"/>
            <path d="M3 10v3a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1v-3"/>
          </svg>
          {exporting ? 'Export…' : 'Exporter'}
        </button>
      </header>

      {/* ── Body ── */}
      <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>

        {/* Left rail */}
        <nav style={styles.rail} aria-label="Modes">
          <button style={styles.railItem(true)} aria-pressed="true">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2.5" y="4" width="15" height="11" rx="1.5"/>
              <path d="M2.5 7h15"/>
            </svg>
            <span style={styles.railLabel}>Slide</span>
          </button>

          <button onClick={() => navigate(`/editeur/${id}`)} style={styles.railItem(false)} aria-pressed="false">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="14" height="14" rx="2"/>
              <path d="M6 7h8M6 10h8M6 13h5"/>
            </svg>
            <span style={styles.railLabel}>Formulaire</span>
          </button>
        </nav>

        {/* Workspace */}
        <main style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', background: '#fff' }}>
          <div style={{ width: 1280 * scale, height: 720 * scale, position: 'relative', flexShrink: 0 }}>
            <div style={{ width: 1280, height: 720, transform: `scale(${scale})`, transformOrigin: 'top left', position: 'absolute', top: 0, left: 0 }}>
              <div ref={slideRef}>
                <SlideTemplate
                  {...slide}
                  editMode={false}
                  textEditMode={textEditMode}
                  layout={layout}
                  onLayoutChange={() => {}}
                  onTextChange={handleTextChange}
                />
              </div>
            </div>
          </div>
        </main>
      </div>
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
