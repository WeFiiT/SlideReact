import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import { SEGMENTATIONS_WEFIIT } from '../constants'

const labelStyle = {
  display: 'block',
  fontSize: 12,
  fontWeight: 600,
  color: '#6E7385',
  marginBottom: 6,
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
}

const pillBtn = (active, color = '#0E2A6B') => ({
  background: active ? color : '#f1f5f9',
  color: active ? '#fff' : '#475569',
  border: `2px solid ${active ? color : 'transparent'}`,
  borderRadius: 20,
  padding: '4px 12px',
  fontSize: 12,
  fontWeight: 600,
  cursor: 'pointer',
  fontFamily: 'inherit',
})

export default function ClientSelector({ client, segmentation, onChange }) {
  const [clients, setClients] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [newName, setNewName] = useState('')
  const [newSeg,  setNewSeg]  = useState('')
  const [adding,  setAdding]  = useState(false)

  useEffect(() => {
    supabase.functions.invoke('notion-clients')
      .then(({ data, error }) => {
        if (error) console.error('notion-clients list error:', error)
        else setClients(Array.isArray(data) ? data : [])
        setLoading(false)
      })
      .catch(err => { console.error('notion-clients fetch failed:', err); setLoading(false) })
  }, [])

  const handleSelect = (name) => {
    if (!name) return
    const found = clients.find(c => c.name === name)
    onChange({ client: name, segmentation: found?.segmentation || '', logo_url: found?.logo_url || '' })
  }

  const handleAdd = async () => {
    if (!newName.trim()) return
    setAdding(true)
    const { data, error } = await supabase.functions.invoke('notion-clients', {
      method: 'POST',
      body: { name: newName.trim(), segmentation: newSeg },
    })
    if (!error && data?.name) {
      const added = { id: data.id, name: data.name, segmentation: data.segmentation || '' }
      setClients(prev => [...prev, added].sort((a, b) => a.name.localeCompare(b.name)))
      onChange({ client: added.name, segmentation: added.segmentation })
    }
    setAdding(false)
    setShowAdd(false)
    setNewName('')
    setNewSeg('')
  }

  return (
    <div style={{ marginBottom: 14 }}>
      <label style={labelStyle}>Client</label>

      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        {/* Dropdown avec chevron custom */}
        <div style={{ position: 'relative', flex: 1 }}>
          <select
            value={client}
            onChange={e => handleSelect(e.target.value)}
            disabled={loading}
            style={{
              width: '100%',
              padding: '9px 32px 9px 12px',
              border: '1.5px solid #e2e8f0',
              borderRadius: 8,
              fontSize: 14,
              fontFamily: 'inherit',
              color: client ? '#1A1E2C' : '#94a3b8',
              background: '#fff',
              appearance: 'none',
              cursor: loading ? 'not-allowed' : 'pointer',
              outline: 'none',
            }}
          >
            <option value="">{loading ? 'Chargement…' : '— Sélectionner un client —'}</option>
            {clients.map(c => (
              <option key={c.id} value={c.name}>{c.name}</option>
            ))}
          </select>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none"
            style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
            <path d="M4 6l4 4 4-4" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>

        <button type="button" onClick={() => setShowAdd(v => !v)}
          style={{
            background: showAdd ? '#EEF1FA' : '#f1f5f9',
            color: showAdd ? '#0E2A6B' : '#475569',
            border: 'none', borderRadius: 8,
            padding: '9px 14px', fontSize: 13, fontWeight: 600,
            cursor: 'pointer', whiteSpace: 'nowrap', fontFamily: 'inherit',
          }}>
          + Nouveau
        </button>
      </div>

      {/* Badge segmentation auto-rempli */}
      {segmentation && !showAdd && (
        <div style={{ marginTop: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 11, color: '#6E7385' }}>Segmentation :</span>
          <span style={{
            fontSize: 12, fontWeight: 600, color: '#0E2A6B',
            background: '#EEF1FA', borderRadius: 12, padding: '2px 10px',
          }}>
            {segmentation}
          </span>
        </div>
      )}

      {/* Formulaire d'ajout inline */}
      {showAdd && (
        <div style={{
          marginTop: 10, padding: '14px 16px',
          background: '#f8fafc', border: '1.5px solid #e2e8f0', borderRadius: 10,
        }}>
          <p style={{ margin: '0 0 10px', fontSize: 13, fontWeight: 700, color: '#1A1E2C' }}>
            Nouveau client Notion
          </p>
          <input
            value={newName}
            onChange={e => setNewName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAdd()}
            placeholder="Nom du client"
            autoFocus
            style={{
              width: '100%', boxSizing: 'border-box',
              padding: '8px 12px', marginBottom: 10,
              border: '1.5px solid #e2e8f0', borderRadius: 8,
              fontSize: 14, fontFamily: 'inherit', outline: 'none',
            }}
          />
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
            {SEGMENTATIONS_WEFIIT.map(s => (
              <button key={s} type="button" onClick={() => setNewSeg(s === newSeg ? '' : s)}
                style={pillBtn(newSeg === s)}>
                {s}
              </button>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="button" onClick={handleAdd}
              disabled={!newName.trim() || adding}
              style={{
                background: '#0E2A6B', color: '#fff', border: 'none', borderRadius: 8,
                padding: '8px 16px', fontSize: 13, fontWeight: 600,
                cursor: newName.trim() ? 'pointer' : 'not-allowed',
                opacity: newName.trim() ? 1 : 0.5, fontFamily: 'inherit',
              }}>
              {adding ? 'Création…' : 'Créer dans Notion →'}
            </button>
            <button type="button"
              onClick={() => { setShowAdd(false); setNewName(''); setNewSeg('') }}
              style={{
                background: 'transparent', color: '#6E7385', border: 'none',
                padding: '8px 12px', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit',
              }}>
              Annuler
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
