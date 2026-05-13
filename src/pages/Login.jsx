import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

function parseWefiiitEmail(email) {
  // prenom : peut contenir des tirets (Pierre-Louis)
  // nom    : sans espaces ni tirets (Le Blevenec → leblevenec, Lablache-Combier → lablachecombier)
  const match = email.trim().toLowerCase().match(/^([a-z][a-z-]*)\.([a-z]+)@wefiit\.com$/)
  if (!match) return null

  // Capitalise chaque segment séparé par un tiret
  const capitalizeHyphen = (s) =>
    s.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join('-')

  const prenomRaw = match[1]   // ex: "pierre-louis"
  const nomRaw    = match[2]   // ex: "leblevenec" (déjà normalisé dans l'email)

  return {
    email:     email.trim().toLowerCase(),
    prenom:    capitalizeHyphen(prenomRaw),            // "Pierre-Louis"
    nom:       nomRaw.charAt(0).toUpperCase() + nomRaw.slice(1), // "Leblevenec"
    prenomNorm: prenomRaw.replace(/-/g, ''),           // "pierrelouis"
    nomNorm:   nomRaw,                                 // "leblevenec"
  }
}

export function getUser() {
  try { return JSON.parse(localStorage.getItem('wf_user') || 'null') } catch { return null }
}

export function logout() {
  localStorage.removeItem('wf_user')
}

export default function Login() {
  const navigate = useNavigate()
  const [email, setEmail]   = useState('')
  const [error, setError]   = useState('')

  const handleSubmit = (e) => {
    e.preventDefault()
    const user = parseWefiiitEmail(email)
    if (!user) {
      setError('Adresse invalide. Format attendu : prenom.nom@wefiit.com')
      return
    }
    localStorage.setItem('wf_user', JSON.stringify(user))
    navigate('/')
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: '#f1f5f9', fontFamily: "'Geomanist', Arial, sans-serif",
    }}>
      <div style={{ background: '#fff', borderRadius: 16, padding: '48px 40px', width: 400, boxShadow: '0 8px 40px rgba(0,0,0,0.10)' }}>

        <img src="/logos/header.svg" alt="WeFiiT" style={{ width: '100%', borderRadius: 8, marginBottom: 32, display: 'block' }} />

        <h1 style={{ margin: '0 0 6px', fontSize: 22, fontWeight: 800, color: '#002882', fontFamily: "'Publica Play', Arial, sans-serif" }}>
          Bienvenue
        </h1>
        <p style={{ margin: '0 0 28px', fontSize: 14, color: '#64748b' }}>
          Connecte-toi avec ton adresse WeFiiT pour accéder à tes slides.
        </p>

        <form onSubmit={handleSubmit}>
          <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 6 }}>
            Adresse e-mail
          </label>
          <input
            type="email"
            value={email}
            onChange={e => { setEmail(e.target.value); setError('') }}
            placeholder="prenom.nom@wefiit.com"
            autoFocus
            style={{
              width: '100%', height: 44, border: `1.5px solid ${error ? '#dc2626' : '#e2e8f0'}`,
              borderRadius: 8, padding: '0 14px', fontSize: 14, boxSizing: 'border-box',
              outline: 'none', fontFamily: 'inherit', marginBottom: error ? 8 : 20,
              transition: 'border-color 0.15s',
            }}
            onFocus={e => { if (!error) e.target.style.borderColor = '#002882' }}
            onBlur={e => { if (!error) e.target.style.borderColor = '#e2e8f0' }}
          />
          {error && (
            <p style={{ margin: '0 0 16px', fontSize: 12, color: '#dc2626' }}>{error}</p>
          )}
          <button type="submit" style={{
            width: '100%', height: 44, background: '#f08a2a', color: '#fff', border: 'none',
            borderRadius: 8, fontSize: 15, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
          }}>
            Accéder à la bibliothèque →
          </button>
        </form>
      </div>
    </div>
  )
}
