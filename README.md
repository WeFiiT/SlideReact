# WeMission — Annuaire des missions WeFiiT

Application web interne pour gérer, visualiser et exporter les références de missions des consultants WeFiiT.

---

## Stack technique

| Couche | Technologie |
|--------|-------------|
| Front | React 18 + Vite |
| Base de données | Supabase (PostgreSQL) |
| Auth Microsoft | MSAL Browser (`@azure/msal-browser`) |
| Export PPTX | JSZip (manipulation directe du XML template) |
| Export PNG/PDF | html2canvas + jsPDF |
| Déploiement | Firebase Hosting (`slidereact.rodserver.fr`) |
| CI/CD | GitHub Actions → Firebase (`WeFiiT/SlideReact`) |

---

## Architecture

```
src/
├── pages/
│   ├── Bibliotheque.jsx     # Annuaire principal (filtres, tabs, création)
│   ├── Preview.jsx          # Visualisation + édition d'une mission
│   └── Login.jsx            # Authentification Supabase
├── components/
│   ├── SlideCard.jsx        # Carte mission dans l'annuaire
│   ├── SlideTemplate.jsx    # Rendu slide (1280×720, positionnement absolu EMU)
│   └── ClientSelector.jsx   # Sélecteur client + segmentation
└── utils/
    ├── exportPptx.js        # Génération PPTX via JSZip + template XML
    └── sharepoint.js        # Upload/suppression SharePoint via Graph API
```

---

## Base de données (Supabase)

**Table `slides`** — colonnes principales :

| Colonne | Type | Description |
|---------|------|-------------|
| `id` | uuid | Clé primaire |
| `prenom`, `nom` | text | Consultant auteur |
| `card_titre` | text | Titre court (carte) |
| `titre` | text | Titre complet de la slide |
| `sous_titre` | text | Périmètre fonctionnel |
| `type_mission` | text | Conseil / Produit / Qualité / Coaching & Formation |
| `client` | text | Nom du client |
| `segmentation` | text | Segment WeFiiT |
| `discipline` | text | Product Management / Ops / Data… |
| `niveau_discipline` | text | Junior / Confirmé / Senior / Lead |
| `management` | text | Oui / Non |
| `sujets_mission` | text[] | Sujets traités |
| `outils` | text[] | Outils utilisés |
| `contexte` | text[] | 3 bullets contexte |
| `tags` | text[] | Tags affichés sur la slide |
| `perimetre` | text[] | 3 bullets périmètre |
| `enjeux` | text[] | 3 bullets enjeux clés |
| `impact` | text[] | 3 bullets Notre impact |
| `metrique_N_chiffre` | text | Chiffre métrique (×3) |
| `metrique_N_label` | text | Label métrique (×3) |
| `logo_url` | text | URL du logo client |
| `validated` | boolean | Slide validée par le consultant |
| `sharepoint_url` | text | URL Graph API du fichier PPTX sur SharePoint |
| `favorited_by` | text[] | Emails des utilisateurs ayant mis en favori |
| `share_token` | uuid | Token pour le lien de partage public |

---

## Export PPTX

Le PPTX est généré en manipulant directement le XML d'un template (`public/SlideReact_template.pptx`) via JSZip.

**Pipeline par slide (`buildNativePptx`) :**
1. `removeEmptyMetrics` — supprime les shapes métriques vides (avant remplacement texte)
2. `removeTitleCaps` — supprime `cap="all"` sur le run du titre
3. `processTagShapes` — adapte la largeur des tags en EMU (`length × 105 000 + 432 000`)
4. `applyData` — remplace les placeholders texte avec échappement XML
5. Logo — fetch + `containLogo` (aspect-ratio correct) + insertion `<p:pic>`

**Convention de nommage :**
```
REF_Client_TypeMission_NomMission_MM-YYYY_Prénom NOM.pptx
```

---

## Intégration SharePoint

**Azure AD App :** `SlideReact` (Client ID : `44ce1d99-...`)
**Tenant :** WeFiiT (`28dd0381-...`)
**Permissions :** `Files.ReadWrite.All`, `User.Read` (Delegated)
**Dossier cible :** `wefiitcom.sharepoint.com/sites/GROWTH/Shared Documents/General/3 - RÉFÉRENCES/Toutes nos références`

**Flux de validation :**
1. Clic "Confirmer et publier" → token MSAL acquis immédiatement (contexte clic)
2. Supabase : `validated = true`
3. PPTX généré + uploadé via Graph API PUT
4. `sharepoint_url` sauvegardé en base
5. Modale de succès avec lien direct

**Flux de retrait de validation :**
1. Token acquis immédiatement
2. Supabase : `validated = false`
3. Fichier supprimé de SharePoint via Graph API DELETE
4. `sharepoint_url` mis à `null` en base
5. Toast de confirmation

**Admin consent requis (une seule fois) :**
```
https://login.microsoftonline.com/28dd0381-5845-4bf6-9beb-60cf464a2f0d/adminconsent?client_id=44ce1d99-69ec-403a-a6c1-feda78c0cbc7
```

---

## Déploiement

**Déploiement automatique** à chaque push sur `main` → `WeFiiT/SlideReact` → Firebase Hosting.

Secret GitHub requis : `FIREBASE_SERVICE_ACCOUNT_SLIDEREACT_1B6DB`

```bash
# Build local
npm run build

# Preview local
npm run dev
```

**URL production :** `https://slidereact.rodserver.fr`

---

## Fonctionnalités principales

### Annuaire (Bibliotheque.jsx)
- Tabs de navigation : Toutes / Segment & Client / Niveau / Type produit / Type mission / Favoris
- Filtres : Type de mission · Statut · Période
- TOC sticky (sidebar droite) pour les vues groupées
- Création de mission en 2 étapes (tous champs obligatoires)
- Export batch PNG / PDF / PPTX
- Mode multi-sélection + suppression groupée

### Éditeur (Preview.jsx)
- Édition inline des textes (contentEditable)
- Positionnement drag & resize des blocs (react-rnd)
- Export PNG / PDF / PPTX
- Commentaires par champ
- Partager (copier lien) + Voir sur SharePoint (si validée)
- Valider / Retirer la validation avec publication SharePoint automatique

### Slide Template (SlideTemplate.jsx)
- Canvas 1280×720px, positionnement absolu
- Blocs : Titre · Sous-titre · Contexte · Tags · Périmètre · Enjeux · Logo · Notre impact · Métriques
- Métriques : hauteur fixe (40px), ferrées en bas du panneau droit
