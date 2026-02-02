# Spécifications Fonctionnelles — Leak Detector

> Ce document décrit toutes les fonctionnalités du produit.

---

## Vue d'ensemble

Leak Detector permet d'analyser une landing page en soumettant son URL et reçoit un rapport détaillé des problèmes de conversion détectés.

---

## Features

### F1: Analyse de Landing Page (Core)

#### Description
L'utilisateur soumet une URL, le système analyse la page et génère un rapport de conversion.

#### User Stories
- En tant qu'utilisateur, je veux soumettre une URL pour obtenir une analyse de ma landing page
- En tant qu'utilisateur, je veux voir un score global et des recommandations actionnables
- En tant qu'utilisateur, je veux comprendre ce qui ne va pas sur ma page en moins de 2 minutes

#### Flow détaillé

```
┌─────────────────────────────────────────────────────────────────┐
│                        PAGE /analyze                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│   ┌──────────────────────────────────────────────────────────┐  │
│   │  🔍 Analysez votre landing page                          │  │
│   │                                                          │  │
│   │  ┌────────────────────────────────┐  ┌──────────────┐   │  │
│   │  │ https://example.com            │  │  Analyser    │   │  │
│   │  └────────────────────────────────┘  └──────────────┘   │  │
│   │                                                          │  │
│   │  💡 3 analyses gratuites restantes ce mois               │  │
│   └──────────────────────────────────────────────────────────┘  │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
           │
           │ [Submit URL]
           ▼
┌─────────────────────────────────────────────────────────────────┐
│                      ÉTAT: ANALYSING                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│   ┌──────────────────────────────────────────────────────────┐  │
│   │                                                          │  │
│   │         [████████░░░░░░░░░░] 45%                        │  │
│   │                                                          │  │
│   │         Capture de la page en cours...                   │  │
│   │                                                          │  │
│   │         ✓ URL validée                                    │  │
│   │         ✓ Page accessible                                │  │
│   │         ◐ Capture screenshot                             │  │
│   │         ○ Analyse IA                                     │  │
│   │         ○ Génération du rapport                          │  │
│   │                                                          │  │
│   └──────────────────────────────────────────────────────────┘  │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
           │
           │ [~15-30 secondes]
           ▼
┌─────────────────────────────────────────────────────────────────┐
│                   PAGE /reports/[id]                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│   Score Global: 72/100  ████████░░                              │
│   example.com • Analysé il y a 2 min                            │
│                                                                  │
│   ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐  │
│   │ Headline    85  │ │ CTA         60  │ │ Trust       78  │  │
│   │ ████████░░      │ │ ██████░░░░      │ │ ███████░░░      │  │
│   └─────────────────┘ └─────────────────┘ └─────────────────┘  │
│                                                                  │
│   ⚠️ 3 problèmes critiques • 5 améliorations suggérées          │
│                                                                  │
│   ┌──────────────────────────────────────────────────────────┐  │
│   │ 🔴 CTA peu visible                                       │  │
│   │    Votre bouton principal manque de contraste...         │  │
│   │    → Augmentez le contraste à au moins 4.5:1            │  │
│   └──────────────────────────────────────────────────────────┘  │
│                                                                  │
│   [Télécharger PDF]  [Nouvelle analyse]  [Partager]             │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

#### Inputs

| Champ | Type | Requis | Validation |
|-------|------|--------|------------|
| url | string | Oui | URL valide, https:// préféré |

#### Outputs

| Champ | Type | Description |
|-------|------|-------------|
| id | uuid | ID unique du rapport |
| score | int | Score global 0-100 |
| categories | array | Liste des catégories analysées |
| issues | array | Problèmes détectés |
| recommendations | array | Suggestions d'amélioration |
| screenshot_url | string | URL du screenshot capturé |
| analyzed_at | datetime | Date de l'analyse |

#### États UI

| État | Affichage |
|------|-----------|
| idle | Formulaire vide, prêt à recevoir URL |
| validating | Spinner sur input, vérification URL |
| queued | Message "Analyse en file d'attente" |
| analyzing | Progress bar avec étapes |
| completed | Redirection vers /reports/[id] |
| error | Message d'erreur, option retry |

#### Edge Cases

| Cas | Comportement |
|-----|--------------|
| URL invalide | Erreur inline "URL invalide" |
| Page inaccessible | Erreur "Page inaccessible (404/timeout)" |
| Page trop lourde | Timeout après 30s, erreur explicite |
| Quota dépassé | Modal upgrade vers Pro |
| Page déjà analysée <24h | Proposer de voir l'ancien rapport ou re-analyser |

#### Erreurs

| Code | Message | Action |
|------|---------|--------|
| INVALID_URL | L'URL fournie n'est pas valide | Corriger l'URL |
| PAGE_NOT_FOUND | La page n'existe pas (404) | Vérifier l'URL |
| PAGE_TIMEOUT | La page met trop de temps à charger | Réessayer plus tard |
| SCRAPING_BLOCKED | Impossible d'accéder à la page | Contacter support |
| ANALYSIS_FAILED | L'analyse a échoué | Réessayer |
| QUOTA_EXCEEDED | Limite d'analyses atteinte | Upgrade plan |

---

### F2: Dashboard & Historique

#### Description
Vue d'ensemble des analyses passées avec statistiques.

#### User Stories
- En tant qu'utilisateur, je veux voir toutes mes analyses passées
- En tant qu'utilisateur, je veux suivre l'évolution de mes scores
- En tant qu'utilisateur, je veux retrouver facilement un rapport

#### Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                      PAGE /dashboard                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│   Bienvenue, Alti 👋                                            │
│                                                                  │
│   ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│   │ 12           │  │ 68           │  │ 2/3          │         │
│   │ Analyses     │  │ Score moyen  │  │ Ce mois      │         │
│   └──────────────┘  └──────────────┘  └──────────────┘         │
│                                                                  │
│   [+ Nouvelle analyse]                                          │
│                                                                  │
│   Analyses récentes                                             │
│   ┌──────────────────────────────────────────────────────────┐  │
│   │ example.com          72/100   Il y a 2h    [Voir]       │  │
│   │ mysite.io            85/100   Hier         [Voir]       │  │
│   │ landing.co           45/100   Il y a 3j    [Voir]       │  │
│   └──────────────────────────────────────────────────────────┘  │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

### F3: Authentification

#### Flows

##### Inscription
1. User arrive sur /register
2. Saisit email + password (ou Google OAuth)
3. Email de vérification envoyé
4. Click sur lien → compte activé
5. Redirection vers /dashboard

##### Connexion
1. User arrive sur /login
2. Saisit email + password (ou Google OAuth)
3. Validation Supabase
4. Redirection vers /dashboard (ou URL demandée)

##### Reset password
1. User clique "Mot de passe oublié"
2. Saisit email
3. Email avec lien de reset
4. Nouveau mot de passe
5. Redirection vers /login

#### Validation

| Champ | Règles |
|-------|--------|
| Email | Format email valide, unique |
| Password | Min 8 chars, 1 majuscule, 1 chiffre |

---

### F4: Paiement & Abonnements

#### Plans

| Plan | Prix | Inclus |
|------|------|--------|
| Free | 0€ | 3 analyses/mois, rapport basique |
| Pro | 29€/mois | 50 analyses/mois, historique illimité, PDF |
| Agency | 99€/mois | 200 analyses/mois, white-label, API |

#### Flow Upgrade

```
[User Free] → [Click "Upgrade"] → [Page Pricing] → [Select Pro]
     → [Stripe Checkout] → [Payment] → [Webhook] → [Update DB]
     → [Redirect /dashboard] → [Plan actif]
```

#### Gestion abonnement

- Voir plan actuel dans /settings/billing
- Changer de plan via Stripe Portal
- Annuler via Stripe Portal
- Factures téléchargeables

---

### F5: Export PDF (Pro)

#### Description
Les utilisateurs Pro peuvent exporter leurs rapports en PDF.

#### Contenu du PDF
- Header avec logo (ou white-label pour Agency)
- Score global avec jauge visuelle
- Screenshot de la page
- Liste des problèmes par catégorie
- Recommandations détaillées
- Footer avec date et URL

---

## Pages & Navigation

### Sitemap

```
/ (landing)
├── /pricing
├── /login
├── /register
├── /forgot-password
│
└── /app (authentifié)
    ├── /dashboard
    ├── /analyze
    ├── /reports
    │   └── /reports/[id]
    └── /settings
        ├── /settings/account
        └── /settings/billing
```

### Navigation

#### Header (non connecté)
```
[Logo]                    [Pricing] [Login] [Get Started]
```

#### Sidebar (connecté)
```
[Logo]

Dashboard
Analyser
Rapports
─────────
Settings
─────────
[Plan: Free] [Upgrade]
```

---

## Permissions

| Action | Anonymous | Free | Pro | Agency |
|--------|-----------|------|-----|--------|
| Voir landing | ✅ | ✅ | ✅ | ✅ |
| Voir pricing | ✅ | ✅ | ✅ | ✅ |
| S'inscrire | ✅ | - | - | - |
| Analyser | ❌ | ✅ (3/mois) | ✅ (50/mois) | ✅ (200/mois) |
| Voir rapports | ❌ | ✅ (7j) | ✅ (illimité) | ✅ (illimité) |
| Export PDF | ❌ | ❌ | ✅ | ✅ |
| White-label | ❌ | ❌ | ❌ | ✅ |
| API access | ❌ | ❌ | ❌ | ✅ |

---

## Catégories d'analyse (détail)

### 1. Headline (headline)
**Critères analysés :**
- Clarté du message (compréhensible en <5s)
- Longueur (idéal: 6-12 mots)
- Présence d'une proposition de valeur
- Spécificité (évite le générique)

### 2. Call-to-Action (cta)
**Critères analysés :**
- Visibilité (contraste, taille)
- Position (above the fold)
- Wording (action-oriented, spécifique)
- Unicité (1 CTA principal clair)

### 3. Preuve sociale (social_proof)
**Critères analysés :**
- Présence de témoignages
- Logos clients/partenaires
- Chiffres/statistiques
- Crédibilité (vrais noms, photos)

### 4. Formulaire (form)
**Critères analysés :**
- Nombre de champs (<5 idéal)
- Labels clairs
- Indication des champs requis
- Messages d'erreur

### 5. Hiérarchie visuelle (visual_hierarchy)
**Critères analysés :**
- Espacement suffisant
- Contraste texte/fond
- Taille de police lisible
- Structure claire (sections)

### 6. Confiance (trust)
**Critères analysés :**
- HTTPS actif
- Mentions légales accessibles
- Contact visible
- Badges de sécurité

### 7. Mobile (mobile)
**Critères analysés :**
- Responsive
- Touch targets (min 44px)
- Texte lisible sans zoom
- Pas de scroll horizontal

### 8. Performance (speed)
**Critères analysés :**
- Temps de chargement (<3s)
- Poids de la page
- Images optimisées
- Pas de ressources bloquantes

---

## Notifications

### Emails transactionnels

| Event | Email | Contenu |
|-------|-------|---------|
| Signup | Welcome | Bienvenue + lien dashboard |
| Analyse terminée | Report ready | Lien vers le rapport |
| Quota 80% | Quota warning | X analyses restantes |
| Quota épuisé | Quota exceeded | CTA upgrade |
| Payment success | Receipt | Confirmation + facture |
| Payment failed | Payment failed | Lien update card |

### In-app

| Type | Trigger | Message |
|------|---------|---------|
| Success | Analyse terminée | "Votre rapport est prêt" |
| Warning | Quota 80% | "Plus que X analyses" |
| Error | Erreur analyse | "L'analyse a échoué" |
| Info | Nouveau feature | "Découvrez..." |
