import { useEffect, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import SlideTemplate, { DEFAULT_LAYOUT } from '../components/SlideTemplate'

export default function Share() {
  const { token } = useParams()
  const [slide, setSlide]     = useState(null)
  const [loading, setLoading] = useState(true)
  const [scale, setScale]     = useState(1)

  useEffect(() => {
    supabase.from('slides').select('*').eq('share_token', token).single()
      .then(({ data, error }) => {
        if (!error && data) setSlide(data)
        setLoading(false)
      })
  }, [token])

  useEffect(() => {
    const upd = () => setScale(Math.min(window.innerWidth / 1280, (window.innerHeight - 64) / 720))
    upd()
    window.addEventListener('resize', upd)
    return () => window.removeEventListener('resize', upd)
  }, [])

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#FBFAF7', fontFamily: 'Inter, system-ui, sans-serif', color: '#6E7385' }}>
      Chargement…
    </div>
  )

  if (!slide) return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#FBFAF7', fontFamily: 'Inter, system-ui, sans-serif', gap: 12 }}>
      <svg width="40" height="40" viewBox="0 0 500 500" style={{ borderRadius: 8 }}>
        <rect width="500" height="500" fill="#0E2A6B"/>
        <circle cx="378.97" cy="326.6" r="23.4" fill="#E97433"/>
        <path d="m303.62,275.75c0,22.9-10.94,35.51-30.8,35.51s-30.8-12.61-30.8-35.51v-125.75h-41.39v125.75c0,22.9-10.94,35.51-30.8,35.51s-30.8-12.61-30.8-35.51v-125.75h-41.39v125.75c0,46.49,25.78,74.25,68.95,74.25,24.12,0,42.98-9.58,54.74-27.74,11.66,17.91,30.97,27.74,54.73,27.74,43.18,0,68.95-27.76,68.95-74.25v-125.75h-41.39v125.75Z" fill="#fff"/>
      </svg>
      <p style={{ fontSize: 16, fontWeight: 600, color: '#1A1E2C', margin: 0 }}>Lien invalide ou expiré</p>
      <p style={{ fontSize: 13, color: '#6E7385', margin: 0 }}>Ce lien de partage n'existe pas ou a été révoqué.</p>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: '#FBFAF7', fontFamily: 'Inter, system-ui, sans-serif' }}>
      {/* Brand bar */}
      <div style={{ height: 56, background: '#fff', borderBottom: '1px solid #E8E6E1', display: 'flex', alignItems: 'center', padding: '0 24px', gap: 12, flexShrink: 0 }}>
        <svg width="30" height="30" viewBox="0 0 500 500" style={{ borderRadius: 6, display: 'block' }}>
          <rect width="500" height="500" fill="#0E2A6B"/>
          <circle cx="378.97" cy="326.6" r="23.4" fill="#E97433"/>
          <path d="m303.62,275.75c0,22.9-10.94,35.51-30.8,35.51s-30.8-12.61-30.8-35.51v-125.75h-41.39v125.75c0,22.9-10.94,35.51-30.8,35.51s-30.8-12.61-30.8-35.51v-125.75h-41.39v125.75c0,46.49,25.78,74.25,68.95,74.25,24.12,0,42.98-9.58,54.74-27.74,11.66,17.91,30.97,27.74,54.73,27.74,43.18,0,68.95-27.76,68.95-74.25v-125.75h-41.39v125.75Z" fill="#fff"/>
        </svg>
        <span style={{ fontSize: 15, fontWeight: 700, color: '#0E2A6B' }}>WeFiiT</span>
        <div style={{ width: 1, height: 18, background: '#E8E6E1' }} />
        <span style={{ fontSize: 13, color: '#6E7385', fontWeight: 500 }}>
          {slide.card_titre || slide.titre || 'Référence partagée'}
        </span>
        <div style={{ flex: 1 }} />
        <span style={{ fontSize: 11, background: '#F3F1EC', color: '#6E7385', padding: '4px 10px', borderRadius: 999, fontWeight: 600, letterSpacing: 0.3 }}>
          Lecture seule
        </span>
      </div>

      {/* Slide */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <div style={{ width: 1280 * scale, height: 720 * scale, position: 'relative', flexShrink: 0 }}>
          <div style={{ width: 1280, height: 720, transform: `scale(${scale})`, transformOrigin: 'top left', position: 'absolute', top: 0, left: 0 }}>
            <SlideTemplate {...slide} editMode={false} textEditMode={false}
              layout={DEFAULT_LAYOUT} onLayoutChange={() => {}} onTextChange={() => {}} />
          </div>
        </div>
      </div>
    </div>
  )
}
