import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import SlideCard from '../components/SlideCard'
import { TYPES, TYPE_COLORS, computeStatus, normalizeName } from '../constants'
import { getUser, logout } from './Login'

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
  const [showModal, setShowModal] = useState(false)
  const [creating, setCreating]   = useState(false)
  const [draft, setDraft]         = useState({ prenom: '', nom: '', titre: '', type_mission: '' })

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

  useEffect(() => {
    supabase.from('slides').select('*').order('created_at', { ascending: false })
      .then(({ data, error }) => {
        if (error) console.error(error)
        else setSlides(data || [])
        setLoading(false)
      })
  }, [])

  const handleDeleted   = (id) => setSlides(prev => prev.filter(s => s.id !== id))
  const handleValidated = (id, value) => setSlides(prev => prev.map(s => s.id === id ? { ...s, validated: value } : s))

  /* Filtrage client-side */
  const filteredSlides = useMemo(() => {
    let result = slides

    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter(s =>
        [s.card_titre, s.titre, s.sous_titre, s.prenom, s.nom]
          .some(v => v?.toLowerCase().includes(q))
      )
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

  const myFilteredSlides = useMemo(() =>
    user ? filteredSlides.filter(s =>
      normalizeName(s.prenom) === user.prenomNorm &&
      normalizeName(s.nom)    === user.nomNorm
    ) : []
  , [filteredSlides, user])

  const othersFilteredSlides = useMemo(() =>
    user ? filteredSlides.filter(s =>
      !(normalizeName(s.prenom) === user.prenomNorm &&
        normalizeName(s.nom)    === user.nomNorm)
    ) : filteredSlides
  , [filteredSlides, user])

  const canCreate = draft.prenom.trim() && draft.nom.trim() && draft.titre.trim()

  const handleCreate = async () => {
    if (!canCreate) return
    setCreating(true)
    const { data, error } = await supabase
      .from('slides')
      .insert({
        contexte: [], tags: [], perimetre: [], enjeux: [], impact: [],
        type_mission: draft.type_mission || null,
        prenom:       draft.prenom.trim(),
        nom:          draft.nom.trim(),
        card_titre:   draft.titre.trim(),
      })
      .select()
      .single()
    if (error) { alert('Erreur : ' + error.message); setCreating(false); return }
    setCreating(false)
    setShowModal(false)
    setDraft({ prenom: '', nom: '', titre: '', type_mission: '' })
    navigate(`/preview/${data.id}?edit=1`)
  }

  const openModal = () => {
    setDraft({ prenom: '', nom: '', titre: '', type_mission: '' })
    setShowModal(true)
  }

  const hasActiveFilters = search || dateFilter !== 'all' || typeFilter || statusFilter

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
        <span style={{ fontSize: 13, color: '#0E2A6B', fontWeight: 600 }}>Bibliothèque</span>
        <div style={{ flex: 1 }} />
        {/* User chip */}
        <div style={{ height: 40, padding: '0 14px 0 6px', background: '#fff', border: '1px solid #E8E6E1', borderRadius: 999, display: 'inline-flex', alignItems: 'center', gap: 10 }}>
          <span style={{ width: 30, height: 30, borderRadius: '50%', background: '#DCE3F2', color: '#0E2A6B', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, flexShrink: 0 }}>
            {user?.prenom?.[0]}{user?.nom?.[0]}
          </span>
          <span style={{ fontSize: 13, color: '#1A1E2C', fontWeight: 600 }}>{user?.prenom} {user?.nom}</span>
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

    <div style={{ maxWidth: 880, margin: '0 auto', padding: '28px 24px 80px' }}>

      {/* ── Title + actions ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          <h1 style={{ fontSize: 26, fontWeight: 800, color: '#0E2A6B', margin: 0, letterSpacing: -0.4, fontFamily: "'Geomanist', Arial, sans-serif" }}>Bibliothèque</h1>
          <span style={{ fontSize: 13, color: '#6E7385' }}>{slides.length} slide{slides.length !== 1 ? 's' : ''}</span>
        </div>
        <div style={{ flex: 1 }} />
        {/* Search */}
        <div style={{ height: 38, background: '#fff', border: '1px solid #E8E6E1', borderRadius: 10, display: 'inline-flex', alignItems: 'center', gap: 8, padding: '0 12px', width: 260 }}>
          <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="#6E7385" strokeWidth="1.6" strokeLinecap="round"><circle cx="7" cy="7" r="4.5" /><path d="M13 13l-2.5-2.5" /></svg>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Rechercher…"
            style={{ flex: 1, border: 'none', outline: 'none', fontSize: 14, color: '#1A1E2C', background: 'transparent', fontFamily: 'inherit' }}
          />
        </div>
        <button
          onClick={() => { setSelectMode(v => !v); setSelectedIds([]) }}
          style={{ height: 38, padding: '0 16px', background: selectMode ? '#1A1E2C' : '#fff', color: selectMode ? '#fff' : '#1A1E2C', border: '1px solid #E8E6E1', borderRadius: 10, fontSize: 14, fontWeight: 500, display: 'inline-flex', alignItems: 'center', gap: 7, cursor: 'pointer', fontFamily: 'inherit' }}
        >
          {selectMode
            ? '✕ Annuler'
            : <><span style={{ width: 14, height: 14, border: '1.5px solid #6E7385', borderRadius: 4, display: 'inline-block' }} />Sélectionner</>
          }
        </button>
        {!selectMode && (
          <button onClick={openModal} style={{ height: 38, padding: '0 16px', background: '#E97433', color: '#fff', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontFamily: 'inherit' }}>
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round"><path d="M8 3v10M3 8h10" /></svg>
            Créer une slide
          </button>
        )}
      </div>

      {/* ── Filtres ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 28, flexWrap: 'wrap' }}>
        {/* Type — segmented control with counts */}
        <div style={{ display: 'inline-flex', background: '#F3F1EC', borderRadius: 10, padding: 4, gap: 2 }}>
          {[{ k: null, label: 'Tous' }, ...TYPES.map(t => ({ k: t, label: t }))].map(({ k, label }) => {
            const active = typeFilter === k
            const count = k === null ? null : typeCounts[k]
            return (
              <button key={String(k)} onClick={() => setTypeFilter(k)}
                style={{ height: 30, padding: '0 10px', background: active ? '#fff' : 'transparent', color: active ? '#0E2A6B' : '#6E7385', border: 'none', borderRadius: 7, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', display: 'inline-flex', alignItems: 'center', gap: 6, boxShadow: active ? '0 1px 2px rgba(20,28,60,0.07)' : 'none', whiteSpace: 'nowrap' }}>
                {label}
                {count != null && (
                  <span style={{ fontSize: 11, fontWeight: 700, background: active ? '#EEF1FA' : 'rgba(20,28,60,0.07)', color: active ? '#0E2A6B' : '#6E7385', padding: '1px 6px', borderRadius: 999, minWidth: 20, textAlign: 'center' }}>
                    {count}
                  </span>
                )}
              </button>
            )
          })}
        </div>

        <div style={{ width: 1, height: 22, background: '#E8E6E1' }} />

        {/* Statut — segmented control with counts */}
        <div style={{ display: 'inline-flex', background: '#F3F1EC', borderRadius: 10, padding: 4, gap: 2 }}>
          {[
            { k: null,    label: 'Tous',  dot: null },
            { k: 'ready', label: 'Ready', dot: '#3EAE6E' },
            { k: 'draft', label: 'Draft', dot: '#B8BCC8' },
          ].map(({ k, label, dot }) => {
            const active = statusFilter === k
            const count = k === null ? null : statusCounts[k]
            return (
              <button key={String(k)} onClick={() => setStatusFilter(k)}
                style={{ height: 30, padding: '0 10px', background: active ? '#fff' : 'transparent', color: active ? '#0E2A6B' : '#6E7385', border: 'none', borderRadius: 7, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', display: 'inline-flex', alignItems: 'center', gap: 6, boxShadow: active ? '0 1px 2px rgba(20,28,60,0.07)' : 'none' }}>
                {dot && <span style={{ width: 7, height: 7, borderRadius: '50%', background: dot, flexShrink: 0 }} />}
                {label}
                {count != null && (
                  <span style={{ fontSize: 11, fontWeight: 700, background: active ? '#EEF1FA' : 'rgba(20,28,60,0.07)', color: active ? '#0E2A6B' : '#6E7385', padding: '1px 6px', borderRadius: 999, minWidth: 20, textAlign: 'center' }}>
                    {count}
                  </span>
                )}
              </button>
            )
          })}
        </div>

        <div style={{ flex: 1 }} />

        {/* Date */}
        <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
          <select
            value={dateFilter}
            onChange={e => setDateFilter(e.target.value)}
            style={{ height: 34, border: '1px solid #E8E6E1', borderRadius: 999, padding: '0 30px 0 14px', fontSize: 13, color: '#1A1E2C', background: '#fff', cursor: 'pointer', outline: 'none', fontFamily: 'inherit', fontWeight: 500, appearance: 'none', WebkitAppearance: 'none' }}
          >
            {DATE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <svg style={{ position: 'absolute', right: 10, pointerEvents: 'none' }} width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="#6E7385" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 5l3 3 3-3" />
          </svg>
        </div>

        {hasActiveFilters && (
          <button
            onClick={() => { setSearch(''); setDateFilter('all'); setTypeFilter(null); setStatusFilter(null) }}
            style={{ background: 'none', border: 'none', color: '#6E7385', fontSize: 12, cursor: 'pointer', textDecoration: 'underline', fontFamily: 'inherit' }}
          >
            Réinitialiser
          </button>
        )}

      </div>

      {/* ── Sections ── */}
      {loading ? (
        <p style={{ color: '#64748b' }}>Chargement…</p>
      ) : (
        <>
          {/* Mes slides */}
          <SectionHeader title="Mes slides" count={myFilteredSlides.length} />
          {myFilteredSlides.length === 0 ? (
            <p style={{ color: '#94a3b8', fontSize: 13, marginBottom: 36 }}>
              {hasActiveFilters ? 'Aucun résultat pour ces filtres.' : 'Aucune slide pour l\'instant. Créez-en une !'}
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 40 }}>
              {myFilteredSlides.map(slide => (
                <SlideCard
                  key={slide.id} slide={slide}
                  onDeleted={handleDeleted}
                  onValidated={handleValidated}
                  selectMode={selectMode}
                  selected={selectedIds.includes(slide.id)}
                  onSelect={toggleSelect}
                />
              ))}
            </div>
          )}

          {/* Autres slides */}
          <SectionHeader title="Autres slides" count={othersFilteredSlides.length} />
          {othersFilteredSlides.length === 0 ? (
            <p style={{ color: '#94a3b8', fontSize: 13 }}>
              {hasActiveFilters ? 'Aucun résultat pour ces filtres.' : 'Aucune autre slide.'}
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {othersFilteredSlides.map(slide => (
                <SlideCard
                  key={slide.id} slide={slide}
                  onDeleted={handleDeleted}
                  onValidated={handleValidated}
                  selectMode={selectMode}
                  selected={selectedIds.includes(slide.id)}
                  onSelect={toggleSelect}
                />
              ))}
            </div>
          )}
        </>
      )}

      {/* ── Barre de sélection flottante ── */}
      {selectMode && (
        <div style={{
          position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)',
          background: '#1e293b', borderRadius: 12, padding: '12px 20px',
          display: 'flex', alignItems: 'center', gap: 16,
          boxShadow: '0 8px 32px rgba(0,0,0,0.3)', zIndex: 500, whiteSpace: 'nowrap',
        }}>
          <span style={{ fontSize: 13, color: '#94a3b8', fontWeight: 600 }}>
            {selectedIds.length} slide{selectedIds.length > 1 ? 's' : ''} sélectionnée{selectedIds.length > 1 ? 's' : ''}
          </span>
          <button
            onClick={() => setSelectedIds([...myFilteredSlides, ...othersFilteredSlides].map(s => s.id))}
            style={{ background: 'transparent', border: '1px solid #334155', color: '#cbd5e1', borderRadius: 6, padding: '6px 12px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
          >
            Tout sélectionner
          </button>
          <button
            onClick={() => selectedIds.length > 0 && setConfirmBulkDel(true)}
            disabled={selectedIds.length === 0}
            style={{ background: selectedIds.length > 0 ? '#dc2626' : '#475569', color: '#fff', border: 'none', borderRadius: 6, padding: '6px 16px', fontSize: 13, fontWeight: 700, cursor: selectedIds.length > 0 ? 'pointer' : 'default', opacity: selectedIds.length === 0 ? 0.5 : 1 }}
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
          <div style={{ background: '#fff', borderRadius: 14, padding: '32px 32px 28px', width: 460, boxShadow: '0 24px 64px rgba(0,0,0,0.28)', maxHeight: '90vh', overflowY: 'auto' }}>
            <h2 style={{ margin: '0 0 6px', color: '#002882', fontSize: 20, fontWeight: 800, fontFamily: "'Publica Play', Arial, sans-serif" }}>
              Nouvelle slide
            </h2>
            <p style={{ margin: '0 0 24px', color: '#94a3b8', fontSize: 13 }}>
              Le consultant et le titre apparaîtront dans la bibliothèque.
            </p>

            {[
              { label: 'Prénom', key: 'prenom', placeholder: 'Ex : Marie' },
              { label: 'Nom', key: 'nom', placeholder: 'Ex : Dupont' },
              { label: 'Titre de la carte', key: 'titre', placeholder: 'Ex : Transformation digitale RH' },
            ].map(({ label, key, placeholder }) => (
              <div key={key} style={{ marginBottom: 14 }}>
                <label style={labelStyle}>{label}</label>
                <input
                  value={draft[key]}
                  onChange={(e) => setDraft((p) => ({ ...p, [key]: e.target.value }))}
                  placeholder={placeholder}
                  onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                  autoFocus={key === 'prenom'}
                  style={modalInput}
                  onFocus={(e) => (e.target.style.borderColor = '#002882')}
                  onBlur={(e) => (e.target.style.borderColor = '#e2e8f0')}
                />
              </div>
            ))}

            {/* Type de mission */}
            <div style={{ marginBottom: 24 }}>
              <label style={labelStyle}>Type de mission</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 6 }}>
                {TYPES.map(t => {
                  const active = draft.type_mission === t
                  return (
                    <button
                      key={t}
                      onClick={() => setDraft(p => ({ ...p, type_mission: active ? '' : t }))}
                      style={{
                        background: active ? TYPE_COLORS[t] : '#f1f5f9',
                        color: active ? '#fff' : '#475569',
                        border: active ? `2px solid ${TYPE_COLORS[t]}` : '2px solid transparent',
                        borderRadius: 20,
                        padding: '6px 16px',
                        fontSize: 13,
                        fontWeight: 600,
                        cursor: 'pointer',
                        fontFamily: 'inherit',
                        transition: 'all 0.15s',
                      }}
                    >
                      {t}
                    </button>
                  )
                })}
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={handleCreate}
                disabled={creating || !canCreate}
                style={{ ...ctaBtn, flex: 1, opacity: canCreate ? 1 : 0.45, cursor: canCreate ? 'pointer' : 'not-allowed' }}
              >
                {creating ? 'Création…' : 'Créer la slide →'}
              </button>
              <button
                onClick={() => setShowModal(false)}
                style={{ background: '#f1f5f9', color: '#475569', border: 'none', borderRadius: 8, padding: '10px 18px', fontWeight: 600, cursor: 'pointer', fontSize: 14 }}
              >
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}
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
