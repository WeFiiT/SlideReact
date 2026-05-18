export const TYPES = ['Conseil', 'Produit', 'Qualité', 'Coaching & Formation']

export const MANAGEMENT_OPTIONS = ['Oui', 'Non']

export const SUJETS_MISSION = [
  'Agent IA', 'Skills IA',
  'Gestion des sprints', 'Gestion des US', 'Définition des process Delivery',
  'Définition des process/méthode Discovery', 'Définition du Dataset',
  'Création de maquette', 'Animation d\'ateliers parties prenantes',
  'Segmentation des utilisateurs', 'Modélisation parcours utilisateur',
  'Entretiens utilisateurs', 'Analyse KPIs', 'Veille marché',
  'Définition des OKR', 'Gestion des parties prenantes',
  'Mise en place gouvernance', 'Définition de la roadmap',
  'Gestion multi-squads/transverse', 'Développement de Product People',
  'Mise en place de rituels',
  'SEO', 'Monétisation', 'Moteur de recherche', 'Stack vidéo', 'Modèle d\'abonnement',
]

export const OUTILS = [
  'Jira', 'Confluence', 'Notion', 'Jira Discovery', 'Miro', 'Figma',
  'ABTasty', 'Kameloon',
  'Google Analytics', 'Piano', 'Contentsquare', 'Google Search Console',
  'Semrush', 'Amplitude', 'Looker', 'Algolia',
  'Postman', 'Claude', 'Gemini', 'Salesforce',
]

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
