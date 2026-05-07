import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import SlideCard from '../components/SlideCard'

export default function Bibliotheque() {
  const navigate = useNavigate()
  const [slides, setSlides] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [creating, setCreating] = useState(false)
  const [draft, setDraft] = useState({ prenom: '', nom: '', titre: '' })

  useEffect(() => {
    supabase.from('slides').select('*').order('created_at', { ascending: false })
      .then(({ data, error }) => {
        if (error) console.error(error)
        else setSlides(data || [])
        setLoading(false)
      })
  }, [])

  const handleDeleted = (id) => setSlides((prev) => prev.filter((s) => s.id !== id))

  const canCreate = draft.prenom.trim() && draft.nom.trim() && draft.titre.trim()

  const handleCreate = async () => {
    if (!canCreate) return
    setCreating(true)
    const { data, error } = await supabase
      .from('slides')
      .insert({
        titre:    draft.titre.trim(),
        contexte: [], tags: [], perimetre: [], enjeux: [], impact: [],
      })
      .select()
      .single()
    if (error) { alert('Erreur : ' + error.message); setCreating(false); return }
    localStorage.setItem(
      `slide_consultant_${data.id}`,
      JSON.stringify({ prenom: draft.prenom.trim(), nom: draft.nom.trim(), card_titre: draft.titre.trim() })
    )
    setCreating(false)
    setShowModal(false)
    setDraft({ prenom: '', nom: '', titre: '' })
    navigate(`/preview/${data.id}?edit=1`)
  }

  const openModal = () => { setDraft({ prenom: '', nom: '', titre: '' }); setShowModal(true) }

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '32px 24px' }}>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
        <h1 style={{ color: '#002882', fontSize: 26, fontWeight: 800, margin: 0, fontFamily: "'Publica Play', Arial, sans-serif" }}>
          Bibliothèque de slides
        </h1>
        <button onClick={openModal} style={ctaBtn}>+ Créer une slide</button>
      </div>

      {loading ? (
        <p style={{ color: '#64748b' }}>Chargement…</p>
      ) : slides.length === 0 ? (
        <p style={{ color: '#64748b' }}>Aucune slide. Créez-en une !</p>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 24 }}>
          {slides.map((slide) => (
            <SlideCard key={slide.id} slide={slide} onDeleted={handleDeleted} />
          ))}
        </div>
      )}

      {showModal && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}
          onClick={(e) => { if (e.target === e.currentTarget) setShowModal(false) }}
        >
          <div style={{ background: '#fff', borderRadius: 14, padding: '32px 32px 28px', width: 440, boxShadow: '0 24px 64px rgba(0,0,0,0.28)' }}>
            <h2 style={{ margin: '0 0 6px', color: '#002882', fontSize: 20, fontWeight: 800, fontFamily: "'Publica Play', Arial, sans-serif" }}>
              Nouvelle slide
            </h2>
            <p style={{ margin: '0 0 24px', color: '#94a3b8', fontSize: 13 }}>
              Le nom du consultant apparaîtra sur la carte de la bibliothèque.
            </p>

            {[
              { label: 'Prénom', key: 'prenom', placeholder: 'Ex : Marie' },
              { label: 'Nom', key: 'nom', placeholder: 'Ex : Dupont' },
              { label: 'Titre de la carte (bibliothèque)', key: 'titre', placeholder: 'Ex : Transformation digitale RH' },
            ].map(({ label, key, placeholder }) => (
              <div key={key} style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#64748b', marginBottom: 5, textTransform: 'uppercase', letterSpacing: 0.6 }}>
                  {label}
                </label>
                <input
                  value={draft[key]}
                  onChange={(e) => setDraft((p) => ({ ...p, [key]: e.target.value }))}
                  placeholder={placeholder}
                  onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                  autoFocus={key === 'prenom'}
                  style={{ width: '100%', border: '1.5px solid #e2e8f0', borderRadius: 7, padding: '9px 12px', fontSize: 14, boxSizing: 'border-box', outline: 'none', fontFamily: 'inherit', transition: 'border-color 0.15s' }}
                  onFocus={(e) => (e.target.style.borderColor = '#002882')}
                  onBlur={(e) => (e.target.style.borderColor = '#e2e8f0')}
                />
              </div>
            ))}

            <div style={{ display: 'flex', gap: 10, marginTop: 24 }}>
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
