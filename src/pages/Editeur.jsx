import { useEffect, useRef, useState } from 'react'
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
  metrique_1_chiffre: '', metrique_1_label: '',
  metrique_2_chiffre: '', metrique_2_label: '',
  metrique_3_chiffre: '', metrique_3_label: '',
  logo_url: '',
}

export default function Editeur() {
  const { id } = useParams()
  const navigate = useNavigate()
  const isEditing = Boolean(id)
  const fileInputRef = useRef(null)

  const [form, setForm] = useState(EMPTY)
  const [loading, setLoading] = useState(isEditing)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState(null)

  useEffect(() => {
    if (!isEditing) return
    supabase.from('slides').select('*').eq('id', id).single()
      .then(({ data, error }) => {
        if (error) { console.error(error); return }
        setForm({
          ...EMPTY, ...data,
          contexte:  data.contexte?.length  ? data.contexte  : ['', '', ''],
          tags:      data.tags?.length      ? data.tags      : ['', '', '', ''],
          perimetre: data.perimetre?.length ? data.perimetre : ['', '', ''],
          enjeux:    data.enjeux?.length    ? data.enjeux    : ['', '', ''],
          impact:    data.impact?.length    ? data.impact    : ['', '', ''],
        })
        setLoading(false)
      })
  }, [id, isEditing])

  const set = (field, value) => setForm((f) => ({ ...f, [field]: value }))
  const setArr = (field, index, value) =>
    setForm((f) => { const arr = [...f[field]]; arr[index] = value; return { ...f, [field]: arr } })

  const handleLogoUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    setUploadError(null)
    if (file.size > 2 * 1024 * 1024) {
      setUploadError('Fichier trop lourd (max 2 Mo).')
      return
    }
    setUploading(true)
    const ext = file.name.split('.').pop().toLowerCase()
    const path = `logo_${Date.now()}.${ext}`
    const { data, error } = await supabase.storage.from('logos').upload(path, file, { upsert: true })
    if (error) {
      setUploadError(`Erreur upload : ${error.message}`)
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
      contexte:  form.contexte.filter(Boolean),
      tags:      form.tags.filter(Boolean),
      perimetre: form.perimetre.filter(Boolean),
      enjeux:    form.enjeux.filter(Boolean),
      impact:    form.impact.filter(Boolean),
    }
    let error, data
    if (isEditing) {
      ;({ error } = await supabase.from('slides').update(payload).eq('id', id))
    } else {
      ;({ data, error } = await supabase.from('slides').insert(payload).select().single())
    }
    setSaving(false)
    if (error) { alert('Erreur : ' + error.message); return }
    navigate(`/preview/${isEditing ? id : data.id}`)
  }

  if (loading) return <p style={{ padding: 32, color: '#64748b' }}>Chargement…</p>

  return (
    <div style={{ minHeight: '100vh', background: '#f1f5f9', fontFamily: "'Geomanist', Arial, sans-serif" }}>

      {/* ── Toolbar ── */}
      <div style={{ position: 'sticky', top: 0, zIndex: 50, height: 56, background: '#1e293b', display: 'flex', alignItems: 'center', gap: 8, padding: '0 20px', boxShadow: '0 2px 12px rgba(0,0,0,0.25)' }}>
        {isEditing && (
          <button onClick={() => navigate(`/preview/${id}`)} style={toolBtn('#475569')}>← Slide</button>
        )}
        <button onClick={() => navigate('/')} style={toolBtn('#334155')}>Bibliothèque</button>
        <div style={{ flex: 1 }} />
        <button onClick={handleSave} disabled={saving} style={toolBtn('#f08a2a')}>
          {saving ? 'Sauvegarde…' : '✓ Sauvegarder'}
        </button>
      </div>

      <div style={{ maxWidth: 820, margin: '0 auto', padding: '36px 24px 80px' }}>
        <h1 style={{ margin: '0 0 8px', color: '#002882', fontSize: 22, fontWeight: 800, fontFamily: "'Publica Play', Arial, sans-serif" }}>
          {isEditing ? 'Modifier la slide' : 'Nouvelle slide'}
        </h1>
        <p style={{ margin: '0 0 36px', color: '#94a3b8', fontSize: 13 }}>
          Remplis les sections ci-dessous — chaque champ correspond à une zone de la slide.
        </p>

        {/* ── En-tête ── */}
        <Card icon="◼" color="#002882" title="En-tête" desc="Bandeau bleu supérieur de la slide">
          <Field label="Titre de la slide" value={form.titre} onChange={(v) => set('titre', v)} placeholder="Ex : Transformation digitale RH" />
          <Field label="Sous-titre" value={form.sous_titre} onChange={(v) => set('sous_titre', v)} placeholder="Ex : Périmètre fonctionnel : PM sur l'app web…" />
        </Card>

        {/* ── Contexte ── */}
        <Card icon="📋" color="#4f46e5" title="Contexte" desc="Zone mauve — 3 bullet points de cadrage client">
          {form.contexte.map((v, i) => (
            <BulletField key={i} index={i} value={v} onChange={(val) => setArr('contexte', i, val)}
              placeholder={['Présentation entreprise, CA, organisation…', 'Enjeux globaux / contexte marché…', 'Parties prenantes : Marketing, Comex…'][i]} />
          ))}
        </Card>

        {/* ── Tags ── */}
        <Card icon="🏷️" color="#0891b2" title="Tags" desc="4 mots-clés affichés sous le contexte">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px 16px' }}>
            {form.tags.map((v, i) => (
              <Field key={i} label={`Tag ${i + 1}`} value={v} onChange={(val) => setArr('tags', i, val)}
                placeholder={['X utilisateurs', 'KPI 1', 'Secteur', 'B2C / B2B'][i]} />
            ))}
          </div>
        </Card>

        {/* ── Périmètre ── */}
        <Card icon="🗺️" color="#f08a2a" title="Périmètre" desc="Encadré avec onglet — 3 bullet points">
          {form.perimetre.map((v, i) => (
            <BulletField key={i} index={i} value={v} onChange={(val) => setArr('perimetre', i, val)}
              placeholder={['App / Web – Front / Back…', 'Place dans l\'organisation : Tribe X…', 'Composition de la squad : X devs…'][i]} />
          ))}
        </Card>

        {/* ── Enjeux ── */}
        <Card icon="⚡" color="#dc2626" title="Enjeux clés" desc="Encadré avec onglet — 3 bullet points">
          {form.enjeux.map((v, i) => (
            <BulletField key={i} index={i} value={v} onChange={(val) => setArr('enjeux', i, val)}
              placeholder={['Enjeu / OKR 1 : augmenter les revenus…', 'Enjeu / OKR 2 : livrer la fonctionnalité X…', 'Enjeu / OKR 3 : optimiser l\'organisation…'][i]} />
          ))}
        </Card>

        {/* ── Notre impact ── */}
        <Card icon="🎯" color="#16a34a" title="Notre impact" desc="Colonne droite — 3 bullet points">
          {form.impact.map((v, i) => (
            <BulletField key={i} index={i} value={v} onChange={(val) => setArr('impact', i, val)}
              placeholder={['Mise en place de process, alignement…', 'Initiatives stratégiques : Discovery…', 'Évolutions d\'organisation…'][i]} />
          ))}
        </Card>

        {/* ── Métriques ── */}
        <Card icon="📊" color="#7c3aed" title="Métriques" desc="3 cartes chiffre-clé en bas à droite">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px 16px' }}>
            {[1, 2, 3].map((n) => (
              <div key={n} style={{ background: '#fdf6ec', border: '1px solid #fde9c5', borderRadius: 8, padding: '12px 14px' }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>Métrique {n}</div>
                <Field label="Chiffre" value={form[`metrique_${n}_chiffre`]} onChange={(v) => set(`metrique_${n}_chiffre`, v)} placeholder="+X%" compact />
                <Field label="Label" value={form[`metrique_${n}_label`]} onChange={(v) => set(`metrique_${n}_label`, v)} placeholder="de conversion" compact />
              </div>
            ))}
          </div>
        </Card>

        {/* ── Logo client ── */}
        <Card icon="🖼️" color="#94a3b8" title="Logo client" desc="Zone en haut à droite de la slide">
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
            {form.logo_url && (
              <div style={{ flexShrink: 0, width: 100, height: 60, border: '1px solid #e2e8f0', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafc', overflow: 'hidden' }}>
                <img src={form.logo_url} alt="logo client" style={{ maxHeight: 52, maxWidth: 92, objectFit: 'contain' }} />
              </div>
            )}
            <div style={{ flex: 1, minWidth: 200 }}>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleLogoUpload}
                disabled={uploading}
                style={{ display: 'none' }}
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                style={{ display: 'block', width: '100%', background: uploading ? '#f1f5f9' : '#fff', border: '1.5px dashed #cbd5e1', borderRadius: 8, padding: '12px 16px', cursor: uploading ? 'default' : 'pointer', color: '#64748b', fontSize: 13, fontWeight: 600, textAlign: 'center', marginBottom: 8 }}
              >
                {uploading ? '⏳ Upload en cours…' : '📎 Choisir un fichier (PNG, SVG, JPG — max 2 Mo)'}
              </button>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <span style={{ fontSize: 11, color: '#94a3b8', flexShrink: 0 }}>ou URL directe :</span>
                <input
                  value={form.logo_url}
                  onChange={(e) => set('logo_url', e.target.value)}
                  placeholder="https://…"
                  style={{ ...inputBase, flex: 1, fontSize: 12, height: 34 }}
                />
              </div>
              {uploadError && (
                <div style={{ marginTop: 8, padding: '8px 12px', background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 6, fontSize: 12, color: '#dc2626' }}>
                  {uploadError}
                  <div style={{ marginTop: 4, color: '#9f1239', fontSize: 11 }}>
                    Vérifie que le bucket Supabase "logos" existe et autorise les uploads anonymes (policy : INSERT pour anon).
                  </div>
                </div>
              )}
              {form.logo_url && (
                <button onClick={() => { set('logo_url', ''); if (fileInputRef.current) fileInputRef.current.value = '' }}
                  style={{ marginTop: 8, background: 'none', border: 'none', color: '#94a3b8', fontSize: 12, cursor: 'pointer', padding: 0 }}>
                  ✕ Supprimer le logo
                </button>
              )}
            </div>
          </div>
        </Card>

        {/* ── Sauvegarder ── */}
        <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
          <button onClick={handleSave} disabled={saving} style={{ background: '#f08a2a', color: '#fff', border: 'none', borderRadius: 8, padding: '12px 32px', fontSize: 15, fontWeight: 700, cursor: 'pointer' }}>
            {saving ? 'Sauvegarde…' : '✓ Sauvegarder'}
          </button>
          <button onClick={() => navigate(isEditing ? `/preview/${id}` : '/')} style={{ background: '#e2e8f0', color: '#475569', border: 'none', borderRadius: 8, padding: '12px 20px', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
            Annuler
          </button>
        </div>
      </div>
    </div>
  )
}

/* ── Composants internes ───────────────────────────────────────── */

function Card({ icon, color, title, desc, children }) {
  return (
    <div style={{ background: '#fff', borderRadius: 10, border: '1px solid #e2e8f0', marginBottom: 20, overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
      <div style={{ borderLeft: `4px solid ${color}`, padding: '14px 20px 12px', display: 'flex', alignItems: 'baseline', gap: 10, background: '#fafafa', borderBottom: '1px solid #f1f5f9' }}>
        <span style={{ fontSize: 16 }}>{icon}</span>
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#1e293b' }}>{title}</div>
          <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 1 }}>{desc}</div>
        </div>
      </div>
      <div style={{ padding: '16px 20px' }}>{children}</div>
    </div>
  )
}

function Field({ label, value, onChange, placeholder, compact = false }) {
  const [focused, setFocused] = useState(false)
  return (
    <div style={{ marginBottom: compact ? 8 : 12 }}>
      <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#64748b', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 }}>
        {label}
      </label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={{ ...inputBase, borderColor: focused ? '#002882' : '#e2e8f0', height: compact ? 34 : 40 }}
      />
    </div>
  )
}

function BulletField({ index, value, onChange, placeholder }) {
  const [focused, setFocused] = useState(false)
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 10 }}>
      <div style={{ width: 22, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#cbd5e1', display: 'block', marginTop: 1 }} />
      </div>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={{ ...inputBase, flex: 1, borderColor: focused ? '#002882' : '#e2e8f0' }}
      />
    </div>
  )
}

const inputBase = {
  width: '100%',
  height: 40,
  border: '1.5px solid #e2e8f0',
  borderRadius: 7,
  padding: '0 12px',
  fontSize: 14,
  color: '#1e293b',
  boxSizing: 'border-box',
  outline: 'none',
  fontFamily: 'inherit',
  transition: 'border-color 0.15s',
  background: '#fff',
}

function toolBtn(bg) {
  return { background: bg, color: '#fff', border: 'none', borderRadius: 6, padding: '7px 14px', fontSize: 13, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }
}
