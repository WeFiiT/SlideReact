import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import SlideCard from '../components/SlideCard'

export default function Bibliotheque() {
  const navigate = useNavigate()
  const [slides, setSlides] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase
      .from('slides')
      .select('*')
      .order('created_at', { ascending: false })
      .then(({ data, error }) => {
        if (error) console.error(error)
        else setSlides(data || [])
        setLoading(false)
      })
  }, [])

  const handleDeleted = (id) => setSlides((prev) => prev.filter((s) => s.id !== id))

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '32px 24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
        <h1 style={{ color: '#1a2f5e', fontSize: 28, fontWeight: 800, margin: 0 }}>Bibliothèque de slides</h1>
        <button
          onClick={() => navigate('/editeur')}
          style={{
            background: '#f97316',
            color: '#fff',
            border: 'none',
            borderRadius: 8,
            padding: '10px 22px',
            fontSize: 15,
            fontWeight: 700,
            cursor: 'pointer',
          }}
        >
          + Créer une slide
        </button>
      </div>

      {loading ? (
        <p style={{ color: '#64748b' }}>Chargement…</p>
      ) : slides.length === 0 ? (
        <p style={{ color: '#64748b' }}>Aucune slide. Créez-en une !</p>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
          gap: 20,
        }}>
          {slides.map((slide) => (
            <SlideCard key={slide.id} slide={slide} onDeleted={handleDeleted} />
          ))}
        </div>
      )}
    </div>
  )
}
