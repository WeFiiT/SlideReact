import { useEffect, useRef, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import { TYPES, TYPE_COLORS, DISCIPLINES, NIVEAUX, MANAGEMENT_OPTIONS, SUJETS_MISSION, OUTILS, normalizeName } from '../constants'
import ClientSelector from '../components/ClientSelector'
import { getUser } from './Login'

const TOPBAR_H = 56
const RAIL_W   = 80

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
  type_mission: '',
  prenom: '',
  nom: '',
  card_titre: '',
  client: '',
  segmentation: '',
  discipline: '',
  niveau_discipline: '',
  management: '',
  sujets_mission: [],
  outils: [],
}

export default function Editeur() {
  const { id } = useParams()
  const navigate = useNavigate()
  const isEditing = Boolean(id)
  const fileInputRef = useRef(null)

  const user = getUser()

  const [form, setForm]               = useState(EMPTY)
  const [loading, setLoading]         = useState(isEditing)
  const [saving, setSaving]           = useState(false)
  const [uploading, setUploading]     = useState(false)
  const [uploadError, setUploadError] = useState(null)
  const [confirmValidate, setConfirmValidate] = useState(false)
  const [validating, setValidating]   = useState(false)
  const [autoSaving, setAutoSaving]   = useState(false)
  const [lastAutoSaved, setLastAutoSaved] = useState(null)
  const [errors, setErrors]           = useState({})
  const [newSujet, setNewSujet]       = useState('')
  const [newOutil, setNewOutil]       = useState('')
  const [slideOpen, setSlideOpen]     = useState(false)
  const autoSaveTimer                 = useRef(null)

  useEffect(() => () => { if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current) }, [])

  useEffect(() => {
    if (!isEditing) return
    supabase.from('slides').select('*').eq('id', id).single()
      .then(({ data, error }) => {
        if (error) { console.error(error); setLoading(false); return }
        setForm({
          ...EMPTY, ...data,
          contexte:     data.contexte?.length  ? data.contexte  : ['', '', ''],
          tags:         data.tags?.length      ? data.tags      : ['', '', '', ''],
          perimetre:    data.perimetre?.length ? data.perimetre : ['', '', ''],
          enjeux:       data.enjeux?.length    ? data.enjeux    : ['', '', ''],
          impact:       data.impact?.length    ? data.impact    : ['', '', ''],
          type_mission:      data.type_mission      || '',
          prenom:            data.prenom            || '',
          nom:               data.nom               || '',
          card_titre:        data.card_titre        || '',
          client:            data.client            || '',
          segmentation:      data.segmentation      || '',
          discipline:        data.discipline        || '',
          niveau_discipline: data.niveau_discipline || '',
          management:        data.management        || '',
          sujets_mission:    Array.isArray(data.sujets_mission) ? data.sujets_mission : [],
          outils:            Array.isArray(data.outils)         ? data.outils         : [],
        })
        setLoading(false)
      })
  }, [id, isEditing])

  const buildPayload = (f) => ({
    ...f,
    contexte:     f.contexte.filter(Boolean),
    tags:         f.tags.filter(Boolean),
    perimetre:    f.perimetre.filter(Boolean),
    enjeux:       f.enjeux.filter(Boolean),
    impact:       f.impact.filter(Boolean),
    type_mission: f.type_mission  || null,
    prenom:       f.prenom.trim() || null,
    nom:          f.nom.trim()    || null,
    card_titre:        f.card_titre.trim() || null,
    client:            f.client || null,
    segmentation:      f.segmentation || null,
    discipline:        f.discipline || null,
    niveau_discipline: f.niveau_discipline || null,
    management:        f.management || null,
    sujets_mission:    f.sujets_mission.length ? f.sujets_mission : null,
    outils:            f.outils.length ? f.outils : null,
  })

  const schedAutoSave = (updated) => {
    if (!isEditing) return
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current)
    setAutoSaving(true)
    autoSaveTimer.current = setTimeout(async () => {
      const payload = buildPayload(updated)
      if (user &&
          normalizeName(updated.prenom) === user.prenomNorm &&
          normalizeName(updated.nom)    === user.nomNorm) {
        payload.owner_email = user.email
      }
      const { error } = await supabase.from('slides').update(payload).eq('id', id)
      if (error) console.warn('Autosave failed:', error)
      else setLastAutoSaved(Date.now())
      setAutoSaving(false)
    }, 2000)
  }

  const set = (field, value) => {
    if (errors[field]) setErrors(e => ({ ...e, [field]: null }))
    setForm(f => { const updated = { ...f, [field]: value }; schedAutoSave(updated); return updated })
  }
  const setArr = (field, index, value) =>
    setForm(f => { const arr = [...f[field]]; arr[index] = value; const updated = { ...f, [field]: arr }; schedAutoSave(updated); return updated })

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

  // Déclaré avant handleSave pour éviter la TDZ lors de l'appel
  const isOwner = !loading && isEditing && user &&
    normalizeName(form.prenom) === user.prenomNorm &&
    normalizeName(form.nom)    === user.nomNorm

  const validate = () => {
    const errs = {}
    if (!form.card_titre.trim()) errs.card_titre = 'Le titre de la carte est obligatoire'
    if (!form.titre.trim())      errs.titre      = 'Le titre de la slide est obligatoire'
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleSave = async () => {
    if (!validate()) return
    if (autoSaveTimer.current) { clearTimeout(autoSaveTimer.current); autoSaveTimer.current = null }
    setSaving(true)
    const payload = buildPayload(form)
    if (!isEditing || isOwner) payload.owner_email = user?.email || null
    let error, data
    if (isEditing) {
      ;({ error } = await supabase.from('slides').update(payload).eq('id', id))
    } else {
      ;({ data, error } = await supabase.from('slides').insert(payload).select().single())
    }
    if (error) { setSaving(false); alert('Erreur : ' + error.message); return }
    setSaving(false)
    navigate(`/preview/${isEditing ? id : data.id}`)
  }

  const handleValidate = async () => {
    if (!user) return
    setValidating(true)
    const next = !form.validated
    const { error } = await supabase.from('slides').update({ validated: next }).eq('id', id)
    if (error) { console.error('Validation failed:', error); setValidating(false); return }
    setForm(f => ({ ...f, validated: next }))

    if (next) {
      const { data: commenters } = await supabase
        .from('comments').select('author_email, author_name').eq('slide_id', id)
      const unique = [...new Map((commenters || []).map(c => [c.author_email, c])).values()]
      const slideTitle = form.card_titre || form.titre || 'Sans titre'
      const fromName = `${user.prenom} ${user.nom}`
      await Promise.all(
        unique
          .filter(c => c.author_email !== user.email)
          .map(c => supabase.from('notifications').insert({
            user_email: c.author_email, type: 'validated',
            slide_id: id, slide_title: slideTitle,
            from_name: fromName,
          }))
      )
    }

    setValidating(false)
    setConfirmValidate(false)
  }

  if (loading) return <p style={{ padding: 32, color: '#6E7385' }}>Chargement…</p>

  const slideTitle = form.card_titre || form.titre || (isEditing ? 'Modifier la slide' : 'Nouvelle slide')

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

        {isEditing && (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, color: '#6E7385' }}>
            {autoSaving ? (
              <span style={{ color: '#E97433' }}>Sauvegarde…</span>
            ) : lastAutoSaved ? (
              <>
                <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="#3EAE6E" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="8" cy="8" r="6"/><path d="M5.5 8l2 2 3-3.5"/>
                </svg>
                Sauvegardé {relativeTime(lastAutoSaved)}
              </>
            ) : null}
          </span>
        )}

        <div style={{ flex: 1 }} />

        {isOwner && (
          <button
            onClick={() => setConfirmValidate(true)}
            style={{
              ...styles.btnSecondary,
              color: form.validated ? '#92521A' : '#3EAE6E',
              borderColor: form.validated ? '#C9956A' : '#3EAE6E',
            }}
          >
            {form.validated ? 'Retirer la validation' : '✓ Valider la slide'}
          </button>
        )}

        <button onClick={handleSave} disabled={saving} style={styles.btnPrimary(saving)}>
          {saving ? 'Sauvegarde…' : 'Sauvegarder'}
        </button>
      </header>

      {/* Modale de validation */}
      {confirmValidate && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000 }}>
          <div style={{ background: '#fff', borderRadius: 12, padding: '28px 28px 24px', width: 420, boxShadow: '0 20px 60px rgba(0,0,0,0.25)' }}>
            <div style={{ fontWeight: 700, fontSize: 16, color: '#1A1E2C', marginBottom: 8 }}>
              {form.validated ? 'Retirer la validation ?' : 'Valider cette slide ?'}
            </div>
            <div style={{ fontSize: 13, color: '#6E7385', marginBottom: 24, lineHeight: 1.6 }}>
              {form.validated
                ? <>La slide <strong>« {form.card_titre || form.titre || 'Sans titre'} »</strong> repassera en <strong style={{ color: '#6E7385' }}>Brouillon</strong> et ne sera plus marquée comme prête.</>
                : <>La slide <strong>« {form.card_titre || form.titre || 'Sans titre'} »</strong> sera marquée comme <strong style={{ color: '#3EAE6E' }}>Ready</strong> et disponible pour un envoi potentiel à des clients.</>
              }
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={handleValidate} disabled={validating}
                style={{ flex: 1, background: form.validated ? '#92521A' : '#3EAE6E', color: '#fff', border: 'none', borderRadius: 7, padding: '10px 0', fontWeight: 700, fontSize: 14, cursor: validating ? 'default' : 'pointer', opacity: validating ? 0.7 : 1, fontFamily: 'inherit' }}>
                {validating ? '…' : form.validated ? 'Retirer la validation' : 'Confirmer la validation'}
              </button>
              <button onClick={() => setConfirmValidate(false)}
                style={{ flex: 1, background: '#F5F4F0', color: '#6E7385', border: 'none', borderRadius: 7, padding: '10px 0', fontWeight: 600, fontSize: 14, cursor: 'pointer', fontFamily: 'inherit' }}>
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Body ── */}
      <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>

        {/* Left rail */}
        <nav style={styles.rail} aria-label="Modes">
          {isEditing ? (
            <button onClick={() => navigate(`/preview/${id}`)} style={styles.railItem(false)} aria-pressed="false">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2.5" y="4" width="15" height="11" rx="1.5"/>
                <path d="M2.5 7h15"/>
              </svg>
              <span style={styles.railLabel}>Slide</span>
            </button>
          ) : (
            <button style={{ ...styles.railItem(false), opacity: 0.4, cursor: 'not-allowed' }} disabled>
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2.5" y="4" width="15" height="11" rx="1.5"/>
                <path d="M2.5 7h15"/>
              </svg>
              <span style={styles.railLabel}>Slide</span>
            </button>
          )}

          <button style={styles.railItem(true)} aria-pressed="true">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="14" height="14" rx="2"/>
              <path d="M6 7h8M6 10h8M6 13h5"/>
            </svg>
            <span style={styles.railLabel}>Formulaire</span>
          </button>

          {isEditing ? (
            <button onClick={() => navigate(`/preview/${id}?comments=1`)} style={styles.railItem(false)}>
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H8l-4 3V5z"/>
              </svg>
              <span style={styles.railLabel}>Avis</span>
            </button>
          ) : (
            <button style={{ ...styles.railItem(false), opacity: 0.3, cursor: 'not-allowed' }} disabled>
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H8l-4 3V5z"/>
              </svg>
              <span style={styles.railLabel}>Avis</span>
            </button>
          )}
        </nav>

        {/* Workspace – scrollable form */}
        <main style={{ flex: 1, overflowY: 'auto', background: '#F5F4F0' }}>
          <div style={{ maxWidth: 820, margin: '0 auto', padding: '36px 24px 80px' }}>
            <h1 style={{ margin: '0 0 8px', color: '#0E2A6B', fontSize: 22, fontWeight: 800, fontFamily: "'Publica Play', Arial, sans-serif" }}>
              {isEditing ? 'Modifier la slide' : 'Nouvelle slide'}
            </h1>
            <p style={{ margin: '0 0 36px', color: '#6E7385', fontSize: 13 }}>
              Remplis les sections ci-dessous — chaque champ correspond à une zone de la slide.
            </p>

            {/* ── Carte bibliothèque ── */}
            <Card icon="🗂️" color="#475569" title="Carte bibliothèque" desc="Métadonnées affichées dans la bibliothèque — pas sur la slide">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px 16px', marginBottom: 12 }}>
                <Field label="Prénom du consultant" value={form.prenom}
                  onChange={v => set('prenom', v)} placeholder="Ex : Marie" />
                <Field label="Nom du consultant" value={form.nom}
                  onChange={v => set('nom', v)} placeholder="Ex : Dupont" />
              </div>
              <Field label="Titre de la carte" value={form.card_titre}
                onChange={v => set('card_titre', v)} placeholder="Ex : Transformation digitale RH"
                error={errors.card_titre} />
              <ClientSelector
                client={form.client}
                segmentation={form.segmentation}
                onChange={({ client, segmentation, logo_url }) => {
                  setForm(f => {
                    const updated = { ...f, client, segmentation, logo_url: logo_url || f.logo_url || '' }
                    schedAutoSave(updated)
                    return updated
                  })
                }}
              />
              <div style={{ marginTop: 14 }}>
                <label style={labelStyle}>Management</label>
                <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
                  {MANAGEMENT_OPTIONS.map(v => {
                    const active = form.management === v
                    return (
                      <button key={v} type="button" onClick={() => set('management', active ? '' : v)}
                        style={{ background: active ? '#0E2A6B' : '#f1f5f9', color: active ? '#fff' : '#475569', border: `2px solid ${active ? '#0E2A6B' : 'transparent'}`, borderRadius: 20, padding: '6px 20px', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                        {v}
                      </button>
                    )
                  })}
                </div>
              </div>
              <div style={{ marginTop: 14 }}>
                <label style={labelStyle}>Sujets de mission</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
                  {SUJETS_MISSION.map(s => {
                    const active = form.sujets_mission.includes(s)
                    return (
                      <button key={s} type="button"
                        onClick={() => set('sujets_mission', active ? form.sujets_mission.filter(x => x !== s) : [...form.sujets_mission, s])}
                        style={{ background: active ? '#0E2A6B' : '#f1f5f9', color: active ? '#fff' : '#475569', border: `2px solid ${active ? '#0E2A6B' : 'transparent'}`, borderRadius: 20, padding: '4px 12px', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                        {s}
                      </button>
                    )
                  })}
                  {form.sujets_mission.filter(s => !SUJETS_MISSION.includes(s)).map(s => (
                    <button key={s} type="button"
                      onClick={() => set('sujets_mission', form.sujets_mission.filter(x => x !== s))}
                      style={{ background: '#E97433', color: '#fff', border: '2px solid #E97433', borderRadius: 20, padding: '4px 12px', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                      {s} ✕
                    </button>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                  <input value={newSujet} onChange={e => setNewSujet(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && newSujet.trim()) { set('sujets_mission', [...form.sujets_mission, newSujet.trim()]); setNewSujet('') }}}
                    placeholder="Ajouter un sujet personnalisé…"
                    style={{ ...inputBase, flex: 1, height: 34, fontSize: 13 }} />
                  <button type="button" onClick={() => { if (newSujet.trim()) { set('sujets_mission', [...form.sujets_mission, newSujet.trim()]); setNewSujet('') }}}
                    style={{ background: '#0E2A6B', color: '#fff', border: 'none', borderRadius: 7, padding: '0 14px', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', height: 34, whiteSpace: 'nowrap' }}>
                    + Ajouter
                  </button>
                </div>
              </div>
              <div style={{ marginTop: 14 }}>
                <label style={labelStyle}>Outils</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
                  {OUTILS.map(o => {
                    const active = form.outils.includes(o)
                    return (
                      <button key={o} type="button"
                        onClick={() => set('outils', active ? form.outils.filter(x => x !== o) : [...form.outils, o])}
                        style={{ background: active ? '#0E2A6B' : '#f1f5f9', color: active ? '#fff' : '#475569', border: `2px solid ${active ? '#0E2A6B' : 'transparent'}`, borderRadius: 20, padding: '4px 12px', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                        {o}
                      </button>
                    )
                  })}
                  {form.outils.filter(o => !OUTILS.includes(o)).map(o => (
                    <button key={o} type="button"
                      onClick={() => set('outils', form.outils.filter(x => x !== o))}
                      style={{ background: '#E97433', color: '#fff', border: '2px solid #E97433', borderRadius: 20, padding: '4px 12px', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                      {o} ✕
                    </button>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                  <input value={newOutil} onChange={e => setNewOutil(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && newOutil.trim()) { set('outils', [...form.outils, newOutil.trim()]); setNewOutil('') }}}
                    placeholder="Ajouter un outil personnalisé…"
                    style={{ ...inputBase, flex: 1, height: 34, fontSize: 13 }} />
                  <button type="button" onClick={() => { if (newOutil.trim()) { set('outils', [...form.outils, newOutil.trim()]); setNewOutil('') }}}
                    style={{ background: '#0E2A6B', color: '#fff', border: 'none', borderRadius: 7, padding: '0 14px', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', height: 34, whiteSpace: 'nowrap' }}>
                    + Ajouter
                  </button>
                </div>
              </div>
              <div style={{ marginTop: 14 }}>
                <label style={labelStyle}>Discipline</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 6 }}>
                  {DISCIPLINES.map(d => {
                    const active = form.discipline === d
                    return (
                      <button key={d} type="button"
                        onClick={() => set('discipline', active ? '' : d)}
                        style={{
                          background: active ? '#0E2A6B' : '#f1f5f9',
                          color: active ? '#fff' : '#475569',
                          border: `2px solid ${active ? '#0E2A6B' : 'transparent'}`,
                          borderRadius: 20, padding: '6px 16px',
                          fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
                        }}>
                        {d}
                      </button>
                    )
                  })}
                </div>
              </div>
              <div style={{ marginTop: 14 }}>
                <label style={labelStyle}>Niveau</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 6 }}>
                  {NIVEAUX.map(n => {
                    const active = form.niveau_discipline === n
                    return (
                      <button key={n} type="button"
                        onClick={() => set('niveau_discipline', active ? '' : n)}
                        style={{
                          background: active ? '#E97433' : '#f1f5f9',
                          color: active ? '#fff' : '#475569',
                          border: `2px solid ${active ? '#E97433' : 'transparent'}`,
                          borderRadius: 20, padding: '6px 16px',
                          fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
                        }}>
                        {n}
                      </button>
                    )
                  })}
                </div>
              </div>
              <div style={{ marginTop: 14 }}>
                <label style={labelStyle}>Type de mission</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 6 }}>
                  {TYPES.map(t => {
                    const active = form.type_mission === t
                    return (
                      <button key={t} type="button"
                        onClick={() => set('type_mission', active ? '' : t)}
                        style={{
                          background: active ? TYPE_COLORS[t] : '#f1f5f9',
                          color: active ? '#fff' : '#475569',
                          border: `2px solid ${active ? TYPE_COLORS[t] : 'transparent'}`,
                          borderRadius: 20, padding: '6px 16px',
                          fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
                        }}>
                        {t}
                      </button>
                    )
                  })}
                </div>
              </div>
            </Card>

            {/* ── Accordéon contenu slide ── */}
            <div style={{ background: '#fff', borderRadius: 10, border: '1px solid #E8E6E1', marginBottom: 20, overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
              <button type="button" onClick={() => setSlideOpen(v => !v)}
                style={{ width: '100%', background: 'none', border: 'none', cursor: 'pointer', padding: '14px 20px', display: 'flex', alignItems: 'center', gap: 12, borderLeft: '4px solid #6E7385', background: '#fafafa', borderBottom: slideOpen ? '1px solid #f1f5f9' : 'none', fontFamily: 'inherit' }}>
                <span style={{ fontSize: 16 }}>📝</span>
                <div style={{ flex: 1, textAlign: 'left' }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#1A1E2C' }}>Contenu de la slide</div>
                  <div style={{ fontSize: 12, color: '#6E7385', marginTop: 1 }}>En-tête, contexte, tags, périmètre, enjeux, impact, métriques</div>
                </div>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="#6E7385" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
                  style={{ transform: slideOpen ? 'rotate(180deg)' : 'none', transition: 'transform .2s', flexShrink: 0 }}>
                  <path d="M4 6l4 4 4-4"/>
                </svg>
              </button>
              {slideOpen && (
                <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 0 }}>

            {/* ── En-tête ── */}
            <Card icon="◼" color="#0E2A6B" title="En-tête" desc="Bandeau bleu supérieur de la slide">
              <Field label="Titre de la slide" value={form.titre} onChange={(v) => set('titre', v)} placeholder="Ex : Transformation digitale RH"
                error={errors.titre} />
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
            <Card icon="🗺️" color="#E97433" title="Périmètre" desc="Encadré avec onglet — 3 bullet points">
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

                </div>
              )}
            </div>

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
                    style={{ display: 'block', width: '100%', background: uploading ? '#f1f5f9' : '#fff', border: '1.5px dashed #cbd5e1', borderRadius: 8, padding: '12px 16px', cursor: uploading ? 'default' : 'pointer', color: '#64748b', fontSize: 13, fontWeight: 600, textAlign: 'center', marginBottom: 8, fontFamily: 'inherit' }}
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
                      style={{ marginTop: 8, background: 'none', border: 'none', color: '#94a3b8', fontSize: 12, cursor: 'pointer', padding: 0, fontFamily: 'inherit' }}>
                      ✕ Supprimer le logo
                    </button>
                  )}
                </div>
              </div>
            </Card>

            {/* ── Sauvegarder ── */}
            <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
              <button onClick={handleSave} disabled={saving}
                style={{ background: '#E97433', color: '#fff', border: 'none', borderRadius: 8, padding: '12px 32px', fontSize: 15, fontWeight: 700, cursor: saving ? 'default' : 'pointer', fontFamily: 'inherit', opacity: saving ? 0.7 : 1 }}>
                {saving ? 'Sauvegarde…' : '✓ Sauvegarder'}
              </button>
              <button onClick={() => navigate(isEditing ? `/preview/${id}` : '/')}
                style={{ background: '#E8E6E1', color: '#6E7385', border: 'none', borderRadius: 8, padding: '12px 20px', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                Annuler
              </button>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}

/* ── Composants internes ───────────────────────────────────────── */

function Card({ icon, color, title, desc, children }) {
  return (
    <div style={{ background: '#fff', borderRadius: 10, border: '1px solid #E8E6E1', marginBottom: 20, overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
      <div style={{ borderLeft: `4px solid ${color}`, padding: '14px 20px 12px', display: 'flex', alignItems: 'baseline', gap: 10, background: '#fafafa', borderBottom: '1px solid #f1f5f9' }}>
        <span style={{ fontSize: 16 }}>{icon}</span>
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#1A1E2C' }}>{title}</div>
          <div style={{ fontSize: 12, color: '#6E7385', marginTop: 1 }}>{desc}</div>
        </div>
      </div>
      <div style={{ padding: '16px 20px' }}>{children}</div>
    </div>
  )
}

function Field({ label, value, onChange, placeholder, compact = false, error }) {
  const [focused, setFocused] = useState(false)
  return (
    <div style={{ marginBottom: compact ? 8 : 12 }}>
      <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: error ? '#dc2626' : '#6E7385', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 }}>
        {label}{error ? ' *' : ''}
      </label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={{ ...inputBase, borderColor: error ? '#dc2626' : focused ? '#0E2A6B' : '#E8E6E1', height: compact ? 34 : 40 }}
      />
      {error && <p style={{ margin: '4px 0 0', fontSize: 11, color: '#dc2626', fontWeight: 500 }}>{error}</p>}
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
        style={{ ...inputBase, flex: 1, borderColor: focused ? '#0E2A6B' : '#E8E6E1' }}
      />
    </div>
  )
}

const inputBase = {
  width: '100%',
  height: 40,
  border: '1.5px solid #E8E6E1',
  borderRadius: 7,
  padding: '0 12px',
  fontSize: 14,
  color: '#1A1E2C',
  boxSizing: 'border-box',
  outline: 'none',
  fontFamily: 'inherit',
  transition: 'border-color 0.15s',
  background: '#fff',
}

const labelStyle = {
  display: 'block', fontSize: 11, fontWeight: 700,
  color: '#6E7385', textTransform: 'uppercase', letterSpacing: 0.5,
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
