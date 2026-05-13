import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import SlideCard from '../components/SlideCard'
import { TYPES, TYPE_COLORS, computeStatus, STATUS_STYLES, normalizeName } from '../constants'
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
  const [mySlides, setMySlides]   = useState(false)
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
  const handleValidated = (id) => setSlides(prev => prev.map(s => s.id === id ? { ...s, validated: true } : s))

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

    if (mySlides && user) {
      result = result.filter(s =>
        normalizeName(s.prenom) === user.prenomNorm &&
        normalizeName(s.nom)    === user.nomNorm
      )
    }

    return result
  }, [slides, search, dateFilter, typeFilter, statusFilter, mySlides, user])

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

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '32px 24px' }}>

      {/* ── Header ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1 style={{ color: '#002882', fontSize: 26, fontWeight: 800, margin: 0, fontFamily: "'Publica Play', Arial, sans-serif" }}>
          Bibliothèque de slides
        </h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button
            onClick={() => { setSelectMode(v => !v); setSelectedIds([]) }}
            style={{ ...ctaBtn, background: selectMode ? '#334155' : '#f1f5f9', color: selectMode ? '#fff' : '#475569' }}
          >
            {selectMode ? '✕ Annuler' : 'Sélectionner'}
          </button>
          {!selectMode && <button onClick={openModal} style={ctaBtn}>+ Créer une slide</button>}

          {/* Profil utilisateur */}
          <div style={{ width: 1, height: 28, background: '#e2e8f0', margin: '0 4px' }} />
          <button
            onClick={() => setMySlides(v => !v)}
            title={`Filtrer mes slides (${user?.prenom} ${user?.nom})`}
            style={{
              background: mySlides ? '#002882' : '#f1f5f9',
              color: mySlides ? '#fff' : '#475569',
              border: 'none', borderRadius: 20, padding: '6px 14px',
              fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
              display: 'flex', alignItems: 'center', gap: 6,
            }}
          >
            <span style={{ width: 24, height: 24, borderRadius: '50%', background: mySlides ? 'rgba(255,255,255,0.25)' : '#002882', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800, flexShrink: 0 }}>
              {user?.prenom?.[0]}{user?.nom?.[0]}
            </span>
            {mySlides ? 'Mes slides' : `${user?.prenom} ${user?.nom}`}
          </button>
          <button
            onClick={() => { logout(); navigate('/login') }}
            title="Se déconnecter"
            style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: 12, cursor: 'pointer', padding: '4px 6px' }}
          >
            ↩
          </button>
        </div>
      </div>

      {/* ── Barre de recherche + date ── */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 14 }}>
        <div style={{ flex: 1, position: 'relative' }}>
          <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', fontSize: 16, pointerEvents: 'none' }}>🔍</span>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Rechercher par titre, consultant…"
            style={{ width: '100%', height: 40, border: '1.5px solid #e2e8f0', borderRadius: 8, padding: '0 12px 0 36px', fontSize: 14, boxSizing: 'border-box', outline: 'none', fontFamily: 'inherit', background: '#fff' }}
            onFocus={e => (e.target.style.borderColor = '#002882')}
            onBlur={e => (e.target.style.borderColor = '#e2e8f0')}
          />
        </div>
        <select
          value={dateFilter}
          onChange={e => setDateFilter(e.target.value)}
          style={{ height: 40, border: '1.5px solid #e2e8f0', borderRadius: 8, padding: '0 12px', fontSize: 14, color: '#1e293b', background: '#fff', cursor: 'pointer', outline: 'none', fontFamily: 'inherit' }}
        >
          {DATE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </div>

      {/* ── Filtres type de mission + statut ── */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 28, flexWrap: 'wrap', alignItems: 'center' }}>
        <span style={{ fontSize: 12, color: '#94a3b8', fontWeight: 600, marginRight: 4 }}>Type :</span>
        <button onClick={() => setTypeFilter(null)} style={typePill(null, typeFilter)}>Tous</button>
        {TYPES.map(t => (
          <button key={t} onClick={() => setTypeFilter(prev => prev === t ? null : t)} style={typePill(t, typeFilter)}>
            {t}
          </button>
        ))}

        <div style={{ width: 1, height: 18, background: '#e2e8f0', margin: '0 4px' }} />

        <span style={{ fontSize: 12, color: '#94a3b8', fontWeight: 600, marginRight: 4 }}>Statut :</span>
        {['ready', 'draft'].map(s => {
          const st = STATUS_STYLES[s]
          const active = statusFilter === s
          return (
            <button
              key={s}
              onClick={() => setStatusFilter(prev => prev === s ? null : s)}
              style={{
                background: active ? st.bg : '#f1f5f9',
                color: active ? st.color : '#64748b',
                border: active ? `1.5px solid ${st.color}` : '1.5px solid transparent',
                borderRadius: 20, padding: '5px 14px', fontSize: 13, fontWeight: 700,
                cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 5,
              }}
            >
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: active ? st.dot : '#94a3b8', display: 'inline-block' }} />
              {st.label}
            </button>
          )
        })}

        {hasActiveFilters && (
          <button
            onClick={() => { setSearch(''); setDateFilter('all'); setTypeFilter(null); setStatusFilter(null) }}
            style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: 12, cursor: 'pointer', marginLeft: 4, textDecoration: 'underline' }}
          >
            Réinitialiser
          </button>
        )}
      </div>

      {/* ── Grille ── */}
      {loading ? (
        <p style={{ color: '#64748b' }}>Chargement…</p>
      ) : filteredSlides.length === 0 ? (
        <p style={{ color: '#64748b' }}>
          {slides.length === 0 ? 'Aucune slide. Créez-en une !' : 'Aucun résultat pour ces filtres.'}
        </p>
      ) : (
        <>
          <p style={{ margin: '0 0 16px', fontSize: 13, color: '#94a3b8' }}>
            {filteredSlides.length} slide{filteredSlides.length > 1 ? 's' : ''}
            {hasActiveFilters ? ' trouvée' + (filteredSlides.length > 1 ? 's' : '') : ''}
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 24 }}>
            {filteredSlides.map(slide => (
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
            onClick={() => setSelectedIds(filteredSlides.map(s => s.id))}
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
  )
}

/* ── Helpers styles ── */

function typePill(type, activeType) {
  const isActive = type === null ? activeType === null : activeType === type
  const color = type ? TYPE_COLORS[type] : '#475569'
  return {
    background: isActive ? color : '#f1f5f9',
    color: isActive ? '#fff' : '#475569',
    border: 'none',
    borderRadius: 20,
    padding: '5px 14px',
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
    fontFamily: 'inherit',
    transition: 'all 0.15s',
  }
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
