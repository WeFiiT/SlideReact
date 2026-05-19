export const TYPES = ['Conseil', 'Immersion', 'Coaching', 'Formation']

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

export const TYPE_PRODUIT = [
  'App', 'Web', 'B2B', 'B2C', 'B2E',
  'AI Product', 'API / Backend', 'Backoffice', 'CRM', 'Autre',
]

export const OUTILS = [
  'Jira', 'Confluence', 'Notion', 'Jira Discovery', 'Miro', 'Figma',
  'ABTasty', 'Kameloon',
  'Google Analytics', 'Piano', 'Contentsquare', 'Google Search Console',
  'Semrush', 'Amplitude', 'Looker', 'Algolia',
  'Postman', 'Claude', 'Gemini', 'Salesforce', 'Teams',
]

export const DISCIPLINES = [
  'Product',
  'QA',
  'PMM',
  'Product Ops',
  'Product Data',
]

export const NIVEAUX = ['Associate', 'Confirmé', 'Senior', 'Leader', 'Global Leader']

export const SEGMENTATIONS_WEFIIT = [
  'Hospitalité & Evénementiel',
  'Médias & Divertissement',
  'Retail & Luxe & E-Commerce',
  'Mobilité & Industrie 4.0',
  'Services de paiement & Saas tech B2B',
  'Energie durable & Santé',
]

export const TYPE_COLORS = {
  'Conseil':       '#2563eb',
  'Immersion':     '#7c3aed',
  'Coaching':      '#f08a2a',
  'Formation':     '#16a34a',
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
