export const TYPES = ['Conseil', 'Produit', 'Qualité', 'Coaching & Formation']

export const DISCIPLINES = [
  'Product Management',
  'Product Ops',
  'Product Data',
  'Product Marketing',
  'Agile / Coaching',
]

export const NIVEAUX = ['Junior', 'Confirmé', 'Senior', 'Lead']

export const SEGMENTATIONS_WEFIIT = [
  'Hospitalité & Evénementiel',
  'Médias & Divertissement',
  'Retail & Luxe & E-Commerce',
  'Mobilité & Industrie 4.0',
  'Services de paiement & Saas tech B2B',
  'Energie durable & Santé',
]

export const TYPE_COLORS = {
  'Conseil':              '#2563eb',
  'Produit':              '#7c3aed',
  'Qualité':              '#16a34a',
  'Coaching & Formation': '#f08a2a',
}

/* Normalise un nom pour la comparaison : minuscules, sans espaces ni tirets */
export function normalizeName(s) {
  return s?.toLowerCase().replace(/[\s\-]/g, '') ?? ''
}

/* Slide "ready" uniquement si explicitement validée par le consultant */
export function computeStatus(slide) {
  return slide.validated ? 'ready' : 'draft'
}

export const STATUS_STYLES = {
  ready: { label: 'Ready', bg: '#dcfce7', color: '#16a34a', dot: '#16a34a' },
  draft: { label: 'Draft', bg: '#f1f5f9', color: '#64748b', dot: '#94a3b8' },
}
