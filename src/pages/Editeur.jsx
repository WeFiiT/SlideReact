import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'

const EMPTY = {
  titre: '',
  sous_titre: '',
  contexte: ['', '', ''],
  tags: ['', '', '', ''],
  perimetre: ['', '', ''],
  enjeux: ['', '', ''],
  impact: ['', '', ''],
  metrique_1_chiffre: '',
  metrique_1_label: '',
  metrique_2_chiffre: '',
  metrique_2_label: '',
  metrique_3_chiffre: '',
  metrique_3_label: '',
  logo_url: '',
}

export default function Editeur() {
  const { id } = useParams()
  const navigate = useNavigate()
  const isEditing = Boolean(id)

  const [form, setForm] = useState(EMPTY)
  const [loading, setLoading] = useState(isEditing)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)

  useEffect(() => {
    if (!isEditing) return
    supabase
      .from('slides')
      .select('*')
      .eq('id', id)
      .single()
      .then(({ data, error }) => {
        if (error) { console.error(error); return }
        setForm({
          ...EMPTY,
          ...data,
          contexte: data.contexte?.length ? data.contexte : ['', '', ''],
          tags: data.tags?.length ? data.tags : ['', '', '', ''],
          perimetre: data.perimetre?.length ? data.perimetre : ['', '', ''],
          enjeux: data.enjeux?.length ? data.enjeux : ['', '', ''],
          impact: data.impact?.length ? data.impact : ['', '', ''],
        })
        setLoading(false)
      })
  }, [id, isEditing])

  const set = (field, value) => setForm((f) => ({ ...f, [field]: value }))

  const setArr = (field, index, value) =>
    setForm((f) => {
      const arr = [...f[field]]
      arr[index] = value
      return { ...f, [field]: arr }
    })

  const handleLogoUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    setUploading(true)
    const ext = file.name.split('.').pop()
    const path = `logo_${Date.now()}.${ext}`
    const { data, error } = await supabase.storage.from('logos').upload(path, file)
    if (error) {
      alert('Erreur upload logo : ' + error.message)
      setUploading(false)
      return
    }
    const { data: urlData } = supabase.storage.from('logos').getPublicUrl(data.path)
    set('logo_url', urlData.publicUrl)
    setUploading(false)
  }

  const handleSave = async () => {
    setSaving(true)
    const payload = {
      ...form,
      contexte: form.contexte.filter(Boolean),
      tags: form.tags.filter(Boolean),
      perimetre: form.perimetre.filter(Boolean),
      enjeux: form.enjeux.filter(Boolean),
      impact: form.impact.filter(Boolean),
    }
    let error, data
    if (isEditing) {
      ;({ error } = await supabase.from('slides').update(payload).eq('id', id))
    } else {
      ;({ data, error } = await supabase.from('slides').insert(payload).select().single())
    }
    setSaving(false)
    if (error) { alert('Erreur : ' + error.message); return }
    const savedId = isEditing ? id : data.id
    navigate(`/preview/${savedId}`)
  }

  if (loading) return <p style={{ padding: 32, color: '#64748b' }}>Chargement…</p>

  return (
    <div style={{ maxWidth: 760, margin: '0 auto', padding: '32px 24px', fontFamily: 'sans-serif' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
        <h1 style={{ color: '#1a2f5e', fontSize: 24, fontWeight: 800, margin: 0 }}>
          {isEditing ? 'Modifier la slide' : 'Nouvelle slide'}
        </h1>
        <button onClick={() => navigate('/')} style={linkBtn}>← Bibliothèque</button>
      </div>

      <Section title="Entête">
        <Field label="Titre" value={form.titre} onChange={(v) => set('titre', v)} />
        <Field label="Sous-titre" value={form.sous_titre} onChange={(v) => set('sous_titre', v)} />
      </Section>

      <Section title="Contexte (3 bullets)">
        {form.contexte.map((v, i) => (
          <Field key={i} label={`Bullet ${i + 1}`} value={v} onChange={(val) => setArr('contexte', i, val)} />
        ))}
      </Section>

      <Section title="Tags (4 mots-clés)">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {form.tags.map((v, i) => (
            <Field key={i} label={`Tag ${i + 1}`} value={v} onChange={(val) => setArr('tags', i, val)} />
          ))}
        </div>
      </Section>

      <Section title="Périmètre (3 bullets)">
        {form.perimetre.map((v, i) => (
          <Field key={i} label={`Bullet ${i + 1}`} value={v} onChange={(val) => setArr('perimetre', i, val)} />
        ))}
      </Section>

      <Section title="Enjeux clés (3 bullets)">
        {form.enjeux.map((v, i) => (
          <Field key={i} label={`Bullet ${i + 1}`} value={v} onChange={(val) => setArr('enjeux', i, val)} />
        ))}
      </Section>

      <Section title="Notre impact (3 bullets)">
        {form.impact.map((v, i) => (
          <Field key={i} label={`Bullet ${i + 1}`} value={v} onChange={(val) => setArr('impact', i, val)} />
        ))}
      </Section>

      <Section title="Métriques">
        {[1, 2, 3].map((n) => (
          <div key={n} style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 10, marginBottom: 8 }}>
            <Field label={`Chiffre ${n}`} value={form[`metrique_${n}_chiffre`]} onChange={(v) => set(`metrique_${n}_chiffre`, v)} />
            <Field label={`Label ${n}`} value={form[`metrique_${n}_label`]} onChange={(v) => set(`metrique_${n}_label`, v)} />
          </div>
        ))}
      </Section>

      <Section title="Logo client">
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <input type="file" accept="image/*" onChange={handleLogoUpload} disabled={uploading} />
          {uploading && <span style={{ color: '#64748b', fontSize: 13 }}>Upload…</span>}
          {form.logo_url && (
            <img src={form.logo_url} alt="logo" style={{ maxHeight: 48, maxWidth: 120, objectFit: 'contain', border: '1px solid #e2e8f0', borderRadius: 6, padding: 4 }} />
          )}
        </div>
        {form.logo_url && (
          <input
            value={form.logo_url}
            onChange={(e) => set('logo_url', e.target.value)}
            placeholder="URL du logo"
            style={inputStyle}
          />
        )}
      </Section>

      <div style={{ display: 'flex', gap: 12, marginTop: 32 }}>
        <button onClick={handleSave} disabled={saving} style={{
          background: '#f97316', color: '#fff', border: 'none', borderRadius: 8,
          padding: '11px 28px', fontSize: 15, fontWeight: 700, cursor: 'pointer',
        }}>
          {saving ? 'Sauvegarde…' : 'Sauvegarder et voir'}
        </button>
        <button onClick={() => navigate(-1)} style={{
          background: '#e2e8f0', color: '#475569', border: 'none', borderRadius: 8,
          padding: '11px 20px', fontSize: 15, fontWeight: 600, cursor: 'pointer',
        }}>
          Annuler
        </button>
      </div>
    </div>
  )
}

function Section({ title, children }) {
  return (
    <div style={{ marginBottom: 24 }}>
      <div style={{ color: '#1a2f5e', fontWeight: 700, fontSize: 14, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10, borderBottom: '2px solid #e2e8f0', paddingBottom: 4 }}>
        {title}
      </div>
      {children}
    </div>
  )
}

function Field({ label, value, onChange }) {
  return (
    <div style={{ marginBottom: 8 }}>
      <label style={{ display: 'block', fontSize: 12, color: '#64748b', marginBottom: 3, fontWeight: 600 }}>{label}</label>
      <input value={value} onChange={(e) => onChange(e.target.value)} style={inputStyle} />
    </div>
  )
}

const inputStyle = {
  width: '100%',
  border: '1px solid #cbd5e1',
  borderRadius: 6,
  padding: '7px 10px',
  fontSize: 14,
  color: '#1e293b',
  boxSizing: 'border-box',
  outline: 'none',
}

const linkBtn = {
  background: 'none',
  border: 'none',
  color: '#64748b',
  cursor: 'pointer',
  fontSize: 14,
  fontWeight: 600,
}
