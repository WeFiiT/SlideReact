export const TYPES = ['Conseil', 'Produit', 'Qualité', 'Coaching & Formation']

export const TYPE_COLORS = {
  'Conseil':              '#2563eb',
  'Produit':              '#7c3aed',
  'Qualité':              '#16a34a',
  'Coaching & Formation': '#f08a2a',
}

/* Slide "ready" si tous les champs clés sont remplis */
export function computeStatus(slide) {
  const hasArr = (arr) => Array.isArray(arr) && arr.some(v => v?.trim())
  const hasMet = [1, 2, 3].some(n =>
    slide[`metrique_${n}_chiffre`]?.trim() && slide[`metrique_${n}_label`]?.trim()
  )
  return (
    slide.titre?.trim() &&
    slide.sous_titre?.trim() &&
    hasArr(slide.contexte) &&
    hasArr(slide.tags) &&
    hasArr(slide.perimetre) &&
    hasArr(slide.enjeux) &&
    hasArr(slide.impact) &&
    slide.logo_url?.trim() &&
    hasMet
  ) ? 'ready' : 'draft'
}

export const STATUS_STYLES = {
  ready: { label: 'Ready', bg: '#dcfce7', color: '#16a34a', dot: '#16a34a' },
  draft: { label: 'Draft', bg: '#f1f5f9', color: '#64748b', dot: '#94a3b8' },
}
