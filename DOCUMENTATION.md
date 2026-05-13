# SlideReact — Documentation

## Vue d'ensemble

SlideReact est une application web interne permettant de **générer des slides de mission WeFiiT** au format 16:9 (1280×720px), exportables en PNG haute résolution.

Chaque slide présente : contexte client, périmètre, enjeux clés, impact de la mission et métriques chiffrées.

---

## Stack technique

| Couche | Technologie |
|---|---|
| Frontend | React 19 + Vite |
| Base de données | Supabase (PostgreSQL) |
| Stockage fichiers | Supabase Storage (bucket `logos`) |
| Backend serverless | Supabase Edge Functions (Deno) |
| Source de données | Notion (base de données missions) |
| Routing | React Router |
| Export PNG | html2canvas |

---

## Architecture

```
┌─────────────────┐         ┌──────────────────┐
│   Notion DB      │         │    SlideReact     │
│  (Mission DB)   │         │  (Web App)        │
│                 │──Synch──▶│                   │
│  • Champs       │         │  • Bibliothèque   │
│    mission      │         │  • Preview/Edit   │
│  • Logo client  │◀──Auto──│  • Formulaire     │
│  • Slide URL    │         │                   │
└─────────────────┘         └────────┬──────────┘
                                     │
                              ┌──────▼──────────┐
                              │    Supabase      │
                              │                  │
                              │  • Table slides  │
                              │  • Storage logos │
                              │  • Edge Functions│
                              └─────────────────┘
```

---

## Flux de données

### Notion → SlideReact (manuel)
1. Le consultant remplit les champs de la mission dans Notion
2. Il clique le bouton **Synch** sur l'entrée
3. Une automation Notion appelle la Edge Function `notion-import`
4. La fonction lit les propriétés de la page Notion + télécharge le logo depuis la base clients liée
5. Le slide est créé ou mis à jour dans Supabase
6. L'URL du slide est écrite automatiquement dans la propriété **Slide URL** de Notion

### SlideReact → Notion (automatique)
1. Le consultant crée ou modifie un slide dans SlideReact
2. La sauvegarde déclenche un **Database Webhook Supabase**
3. La Edge Function `sync-to-notion` met à jour (ou crée) l'entrée Notion correspondante
4. Tous les champs texte sont synchronisés en temps réel

---

## Pages de l'application

| Page | URL | Rôle |
|---|---|---|
| Bibliothèque | `/` | Vue de toutes les slides avec filtres (type, statut, date, recherche) |
| Preview | `/preview/:id` | Visualisation et édition inline du texte directement sur la slide |
| Formulaire | `/editeur/:id` | Formulaire structuré pour éditer tous les champs + logo |

---

## Modèle de données (Supabase)

| Champ | Type | Description |
|---|---|---|
| `id` | UUID | Identifiant unique |
| `notion_page_id` | text | Lien avec la page Notion |
| `card_titre` | text | Titre affiché dans la bibliothèque |
| `prenom`, `nom` | text | Consultant assigné |
| `type_mission` | text | Conseil / Produit / Qualité / Coaching & Formation |
| `titre`, `sous_titre` | text | En-tête de la slide |
| `contexte`, `perimetre`, `enjeux`, `impact` | text[] | Bullet points (3 par section) |
| `tags` | text[] | 4 mots-clés |
| `metrique_N_chiffre/label` | text | 3 métriques chiffrées |
| `logo_url` | text | URL publique du logo client |

---

## Statut des slides

Le statut est calculé automatiquement côté client :

- **Ready** — tous les champs principaux sont remplis (titre, sous-titre, contexte, tags, périmètre, enjeux, impact, logo, métriques)
- **Draft** — un ou plusieurs champs manquants

---

## Edge Functions Supabase

### `notion-import`
- Déclenchée par le bouton Synch dans Notion
- Lit les propriétés de la page Notion
- Télécharge le logo depuis la base clients Notion et l'uploade dans Supabase Storage
- Crée ou met à jour le slide dans Supabase
- Écrit l'URL du slide dans la propriété "Slide URL" de Notion

### `sync-to-notion`
- Déclenchée automatiquement par un Database Webhook Supabase (INSERT + UPDATE)
- Met à jour l'entrée Notion correspondante avec les dernières données du slide
- Crée une nouvelle page Notion si le slide n'en a pas encore

---

## Limitations connues

- Le logo n'est pas re-uploadé vers Notion (les propriétés fichier ne sont pas éditables via l'API Notion)
- La sync Notion → SlideReact est **manuelle** (bouton Synch) — Notion ne propose pas de webhook natif sur modification de propriété
- L'export PNG utilise `html2canvas` : les images externes nécessitent CORS activé
