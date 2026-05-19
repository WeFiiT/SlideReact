import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getMsal } from '../utils/msalClient'
import { normalizeName } from '../constants'

const LOGIN_SCOPES = ['User.Read']

async function buildUser(account, accessToken) {
  let prenom = '', nom = ''
  try {
    const res = await fetch('https://graph.microsoft.com/v1.0/me?$select=givenName,surname', {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
    const me = await res.json()
    prenom = me.givenName || ''
    nom    = me.surname   || ''
  } catch { /* fallback below */ }

  // Fallback : découpe le display name
  if (!prenom && !nom) {
    const parts = (account.name || '').trim().split(/\s+/)
    prenom = parts[0] || ''
    nom    = parts.slice(1).join(' ') || ''
  }

  return {
    email:      account.username.toLowerCase(),
    prenom,
    nom,
    prenomNorm: normalizeName(prenom),
    nomNorm:    normalizeName(nom),
  }
}

export function getUser() {
  try { return JSON.parse(localStorage.getItem('wf_user') || 'null') } catch { return null }
}

export async function logout() {
  localStorage.removeItem('wf_user')
  try {
    const msal = await getMsal()
    await msal.clearCache()
  } catch { /* ignore */ }
}

export default function Login() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')

  // Si déjà connecté (wf_user présent) → rediriger directement
  useEffect(() => {
    if (getUser()) navigate('/', { replace: true })
  }, [])

  const handleLogin = async () => {
    setLoading(true)
    setError('')
    try {
      const msal   = await getMsal()
      const result = await msal.loginPopup({ scopes: LOGIN_SCOPES, redirectUri: window.location.origin + '/blank.html' })

      if (!result.account.username.toLowerCase().endsWith('@wefiit.com')) {
        setError('Utilise ton compte WeFiiT (@wefiit.com).')
        setLoading(false)
        return
      }

      const user = await buildUser(result.account, result.accessToken)
      localStorage.setItem('wf_user', JSON.stringify(user))
      navigate('/', { replace: true })
    } catch (e) {
      if (!e.message?.includes('user_cancelled') && !e.message?.includes('interaction_in_progress')) {
        setError('Connexion échouée. Réessaie.')
      }
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: '#f1f5f9', fontFamily: "'Geomanist', Arial, sans-serif",
    }}>
      <div style={{ background: '#fff', borderRadius: 16, padding: '48px 40px', width: 400, boxShadow: '0 8px 40px rgba(0,0,0,0.10)' }}>

        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 28 }}>
          <img src="/logos/wefiit-badge.svg" alt="WeFiiT" style={{ width: 72, height: 72 }} />
        </div>

        <h1 style={{ margin: '0 0 6px', fontSize: 22, fontWeight: 800, color: '#002882', fontFamily: "'Publica Play', Arial, sans-serif", textAlign: 'center' }}>
          Annuaire des missions
        </h1>
        <p style={{ margin: '0 0 32px', fontSize: 14, color: '#64748b', textAlign: 'center' }}>
          Connecte-toi avec ton compte WeFiiT pour accéder aux missions et exporter tes références.
        </p>

        <button
          onClick={handleLogin}
          disabled={loading}
          style={{
            width: '100%', height: 44, background: loading ? '#f8fafc' : '#fff',
            border: '1.5px solid #d1d5db', borderRadius: 8,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12,
            fontSize: 15, fontWeight: 600, color: '#1a1a1a', cursor: loading ? 'default' : 'pointer',
            fontFamily: 'inherit', transition: 'border-color .15s, box-shadow .15s',
            boxShadow: loading ? 'none' : '0 1px 3px rgba(0,0,0,0.06)',
            opacity: loading ? 0.7 : 1,
          }}
          onMouseEnter={e => { if (!loading) { e.currentTarget.style.borderColor = '#0078d4'; e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,120,212,0.15)' } }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = '#d1d5db'; e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.06)' }}
        >
          {loading ? (
            <span style={{ fontSize: 13, color: '#64748b' }}>Connexion en cours…</span>
          ) : (
            <>
              <MicrosoftLogo />
              Se connecter avec Microsoft
            </>
          )}
        </button>

        {error && (
          <p style={{ margin: '14px 0 0', fontSize: 13, color: '#dc2626', textAlign: 'center' }}>{error}</p>
        )}
      </div>
    </div>
  )
}

function MicrosoftLogo() {
  return (
    <svg width="20" height="20" viewBox="0 0 21 21" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="1"  y="1"  width="9" height="9" fill="#F25022"/>
      <rect x="11" y="1"  width="9" height="9" fill="#7FBA00"/>
      <rect x="1"  y="11" width="9" height="9" fill="#00A4EF"/>
      <rect x="11" y="11" width="9" height="9" fill="#FFB900"/>
    </svg>
  )
}
