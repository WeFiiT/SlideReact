import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'

export default function SlideCard({ slide, onDeleted }) {
  const navigate = useNavigate()

  const handleDelete = async () => {
    if (!confirm(`Supprimer la slide "${slide.titre}" ?`)) return
    const { error } = await supabase.from('slides').delete().eq('id', slide.id)
    if (error) {
      alert('Erreur lors de la suppression.')
      console.error(error)
    } else {
      onDeleted(slide.id)
    }
  }

  const dateStr = new Date(slide.created_at).toLocaleDateString('fr-FR', {
    day: '2-digit', month: 'short', year: 'numeric',
  })

  return (
    <div style={{
      border: '1px solid #e2e8f0',
      borderRadius: 10,
      padding: '16px 18px',
      background: '#ffffff',
      display: 'flex',
      flexDirection: 'column',
      gap: 10,
      boxShadow: '0 1px 4px rgba(0,0,0,0.07)',
    }}>
      <div>
        <div style={{ fontWeight: 700, fontSize: 15, color: '#1a2f5e', marginBottom: 4 }}>{slide.titre}</div>
        <div style={{ fontSize: 12, color: '#94a3b8' }}>{dateStr}</div>
      </div>
      {slide.sous_titre && (
        <div style={{ fontSize: 13, color: '#475569', fontStyle: 'italic' }}>{slide.sous_titre}</div>
      )}
      <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
        <button onClick={() => navigate(`/preview/${slide.id}`)} style={btnStyle('#2563eb')}>Voir</button>
        <button onClick={() => navigate(`/editeur/${slide.id}`)} style={btnStyle('#1a2f5e')}>Modifier</button>
        <button onClick={handleDelete} style={btnStyle('#dc2626')}>Supprimer</button>
      </div>
    </div>
  )
}

function btnStyle(bg) {
  return {
    background: bg,
    color: '#fff',
    border: 'none',
    borderRadius: 6,
    padding: '6px 14px',
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
  }
}
