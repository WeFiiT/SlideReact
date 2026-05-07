import { useEffect, useRef, useState } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import html2canvas from 'html2canvas'
import { supabase } from '../supabaseClient'
import SlideTemplate, { DEFAULT_LAYOUT } from '../components/SlideTemplate'

const TOOLBAR_H = 56

function loadLayout(id) {
  try {
    const s = localStorage.getItem(`slide_layout_${id}`)
    return s ? JSON.parse(s) : DEFAULT_LAYOUT
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
      const s = Math.min(window.innerWidth / 1280, (window.innerHeight - TOOLBAR_H) / 720)
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

  /* Sauvegarde Supabase debouncée (800ms) */
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

      const meta = (() => { try { return JSON.parse(localStorage.getItem(`slide_consultant_${id}`) || 'null') } catch { return null } })()
      const filename = (meta?.card_titre || slide?.titre || 'slide').replace(/[/\\?%*:|"<>]/g, '-')

      const link = document.createElement('a')
      link.download = `${filename}.png`
      link.href = canvas.toDataURL('image/png')
      link.click()
    } finally { setExporting(false) }
  }

  /* Si l'utilisateur est en mode édition, on quitte d'abord puis on exporte */
  const handleExport = () => {
    if (textEditMode) {
      setTextEditMode(false)
      setTimeout(exportPNG, 80)
    } else {
      exportPNG()
    }
  }

  if (loading) return <p style={{ padding: 32, color: '#64748b' }}>Chargement…</p>
  if (!slide)  return <p style={{ padding: 32, color: '#dc2626' }}>Slide introuvable.</p>

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: '#0f172a' }}>

      {/* ── Toolbar ── */}
      <div style={{ height: TOOLBAR_H, display: 'flex', alignItems: 'center', gap: 8, padding: '0 16px', background: '#1e293b', flexShrink: 0 }}>

        {/* Navigation */}
        <button onClick={() => navigate('/')} style={navBtn}>← Biblio</button>
        <button onClick={() => navigate(`/editeur/${id}`)} style={navBtn}>Formulaire</button>

        <div style={{ width: 1, height: 24, background: '#334155', margin: '0 4px' }} />

        {/* Edition */}
        {!textEditMode ? (
          <button onClick={() => setTextEditMode(true)} style={editBtn}>
            Éditer le texte
          </button>
        ) : (
          <>
            <button onClick={() => setTextEditMode(false)} style={doneBtn}>
              ✓ Terminer
            </button>
            <span style={{ fontSize: 12, color: saving ? '#f08a2a' : '#4ade80', fontWeight: 500 }}>
              {saving ? 'Sauvegarde…' : '✓ Sauvegardé'}
            </span>
          </>
        )}

        <div style={{ flex: 1 }} />

        {/* Export */}
        <button onClick={handleExport} disabled={exporting} style={exportBtn(exporting)}>
          {exporting ? 'Export en cours…' : '↓ Exporter PNG'}
        </button>
      </div>

      {/* ── Slide ── */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
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
      </div>

    </div>
  )
}

/* ── Styles toolbar ── */
const navBtn = {
  background: 'transparent',
  color: '#94a3b8',
  border: '1px solid #334155',
  borderRadius: 6,
  padding: '6px 13px',
  fontSize: 13,
  fontWeight: 500,
  cursor: 'pointer',
  whiteSpace: 'nowrap',
}

const editBtn = {
  background: '#1f3fa3',
  color: '#fff',
  border: 'none',
  borderRadius: 6,
  padding: '7px 16px',
  fontSize: 13,
  fontWeight: 600,
  cursor: 'pointer',
  whiteSpace: 'nowrap',
}

const doneBtn = {
  background: '#16a34a',
  color: '#fff',
  border: 'none',
  borderRadius: 6,
  padding: '7px 16px',
  fontSize: 13,
  fontWeight: 600,
  cursor: 'pointer',
  whiteSpace: 'nowrap',
}

function exportBtn(disabled) {
  return {
    background: disabled ? '#475569' : '#f08a2a',
    color: '#fff',
    border: 'none',
    borderRadius: 6,
    padding: '7px 16px',
    fontSize: 13,
    fontWeight: 700,
    cursor: disabled ? 'default' : 'pointer',
    whiteSpace: 'nowrap',
    opacity: disabled ? 0.7 : 1,
  }
}
