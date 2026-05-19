import { supabase } from '../supabaseClient'

// If logo_url is a Notion S3 URL (CORS-blocked, expires in 1h),
// look up the Supabase-mirrored version via notion-clients.
export async function resolveLogoUrl(slide) {
  if (!slide.logo_url || !slide.logo_url.includes('amazonaws.com')) return slide
  try {
    const { data: clients } = await supabase.functions.invoke('notion-clients')
    const match = Array.isArray(clients) && clients.find(c => c.name === slide.client)
    if (match?.logo_url && match.logo_url.includes('supabase.co')) {
      return { ...slide, logo_url: match.logo_url }
    }
  } catch (e) {
    console.warn('[resolveLogoUrl] notion-clients lookup failed:', e.message)
  }
  return slide
}
