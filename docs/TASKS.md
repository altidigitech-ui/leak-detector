# Tâches — Leak Detector

> Suivi des tâches par phase. Cocher au fur et à mesure.

---

## Phase 1 — Setup & Infrastructure (J+2)

### Backend
- [x] 🔴 Init repo avec structure
- [x] 🔴 Configurer Supabase (projet + tables)
- [x] 🔴 Configurer Railway (backend + Redis)
- [x] 🔴 Variables d'environnement
- [x] 🔴 Health check endpoint
- [x] 🟡 Sentry monitoring

### Frontend
- [x] 🔴 Init Next.js
- [x] 🔴 Configurer Vercel
- [x] 🔴 Setup Supabase Auth client
- [x] 🔴 Layout de base (header, sidebar)

### Database
- [x] 🔴 Table `profiles` (extension Supabase Auth)
- [x] 🔴 Table `analyses`
- [x] 🔴 Table `reports`
- [x] 🔴 RLS policies
- [x] 🟡 Indexes

---

## Phase 2 — Core Analysis (J+5)

### Scraping Service
- [x] 🔴 Setup Playwright dans worker
- [x] 🔴 Fonction scrape_page(url) → HTML + metadata
- [x] 🔴 Capture screenshot
- [x] 🔴 Gestion timeout (30s max)
- [x] 🔴 Gestion erreurs (404, timeout, blocked)
- [x] 🟡 Headers réalistes (User-Agent, etc.)

### Analysis Service
- [x] 🔴 Prompt engineering pour analyse CRO
- [x] 🔴 Fonction analyze(html, screenshot) → Report
- [x] 🔴 Parsing réponse Claude → structure JSON
- [x] 🔴 Calcul scores par catégorie
- [x] 🟡 Fallback si parsing échoue

### Worker Celery
- [x] 🔴 Task analyze_page(analysis_id)
- [x] 🔴 Update status (pending → processing → completed/failed)
- [x] 🔴 Store result dans Supabase
- [x] 🔴 Retry logic (max 2 retries)
- [x] 🟡 Dead letter queue

### API Endpoints
- [x] 🔴 POST /analyses - Créer analyse
- [x] 🔴 GET /analyses/{id} - Status analyse
- [x] 🔴 GET /reports/{id} - Récupérer rapport

---

## Phase 3 — MVP UI (J+8)

### Pages Auth
- [x] 🔴 Page /login
- [x] 🔴 Page /register
- [ ] 🔴 Page /forgot-password
- [x] 🔴 Middleware protection routes

### Dashboard
- [x] 🔴 Page /dashboard
- [x] 🔴 Stats cards (analyses, score moyen, quota)
- [x] 🔴 Liste analyses récentes
- [x] 🔴 Empty state si nouveau user

### Analyse
- [x] 🔴 Page /analyze
- [x] 🔴 Formulaire URL
- [x] 🔴 Validation URL côté client
- [x] 🔴 État loading avec progress
- [x] 🔴 Polling status analyse
- [x] 🔴 Redirection vers rapport

### Rapports
- [x] 🔴 Page /reports (liste)
- [x] 🔴 Page /reports/[id] (détail)
- [x] 🔴 Score global avec jauge
- [x] 🔴 Cards par catégorie
- [x] 🔴 Liste issues avec sévérité
- [x] 🔴 Screenshot de la page
- [x] 🟡 Bouton partage

---

## Phase 4 — Payment (J+10)

### Stripe Setup
- [x] 🔴 Créer produits (Pro, Agency)
- [x] 🔴 Configurer webhook endpoint
- [x] 🔴 Configurer Customer Portal

### Backend
- [x] 🔴 POST /billing/checkout
- [x] 🔴 POST /billing/portal
- [x] 🔴 Webhook handler (tous events)
- [x] 🔴 Update subscription status en DB

### Frontend
- [x] 🔴 Page /pricing
- [x] 🔴 Page /settings/billing
- [x] 🔴 Bouton upgrade
- [x] 🔴 Affichage plan actuel

### Quotas
- [x] 🔴 Check quota avant analyse
- [x] 🔴 Décrémentation après analyse
- [x] 🔴 Reset mensuel (cron ou trigger)
- [x] 🔴 Modal "quota dépassé"

---

## Phase 5 — Polish (J+12)

### Landing Page
- [x] 🔴 Hero section
- [x] 🔴 Features section
- [x] 🔴 How it works
- [x] 🔴 Pricing section
- [ ] 🔴 FAQ
- [x] 🔴 Footer
- [ ] 🟡 Animations

### UX
- [x] 🔴 Loading states partout
- [ ] 🔴 Error states partout
- [x] 🔴 Empty states partout
- [ ] 🔴 Toasts notifications
- [ ] 🟡 Onboarding first-time user

### SEO & Meta
- [x] 🔴 Meta tags toutes pages
- [ ] 🔴 OG images
- [ ] 🔴 Favicon
- [ ] 🟡 Sitemap
- [ ] 🟡 robots.txt

### Legal
- [ ] 🔴 Page CGU
- [ ] 🔴 Page Privacy
- [ ] 🟡 Banner cookies

---

## Phase 6 — Launch (J+14)

### Pre-launch
- [ ] 🔴 Test flow complet (signup → analyse → upgrade)
- [ ] 🔴 Test paiement réel (petit montant)
- [ ] 🔴 Vérifier emails transactionnels
- [ ] 🔴 Domaine leakdetector.io configuré
- [ ] 🔴 SSL vérifié

### Launch
- [ ] 🔴 ProductHunt submission
- [ ] 🔴 Tweet announcement
- [ ] 🟡 Post LinkedIn
- [ ] 🟡 Post IndieHackers

### Post-launch
- [ ] 🔴 Monitor erreurs 24h
- [ ] 🔴 Répondre aux feedbacks
- [ ] 🟡 Itérer sur les retours

---

## Backlog (Post-MVP)

| Feature | Priorité | Notes |
|---------|----------|-------|
| Export PDF | P1 | Pro feature |
| Comparaison A/B | P2 | Comparer 2 versions |
| API publique | P2 | Agency feature |
| White-label | P2 | Agency feature |
| Historique scores | P2 | Graph évolution |
| Bulk analysis | P3 | Analyser plusieurs URLs |
| Scheduled analysis | P3 | Re-analyse auto |
| Intégration Slack | P3 | Notif dans Slack |

---

## Légende

- 🔴 Critical (bloquant)
- 🟡 Important (pas bloquant)
- 🟢 Nice to have

---

## Notes de session

### 2026-02-02
- Création repo et documentation initiale
- Stack validé : FastAPI + Next.js + Supabase + Claude API
- Prochaine étape : Phase 1 Setup

### 2026-02-03
- 85 fichiers livrés (backend complet, frontend complet, DB schema)
- 7 bugs critiques corrigés (imports, error handlers, RPC, asyncio, middleware, env vars, types)
- CLAUDE.md reécrit pour refléter l'état réel du codebase
- Docs corrigées (API.md, TASKS.md, TESTS.md, DEPLOY.md)
- Prochaine étape : features Roadmap Phase 2
