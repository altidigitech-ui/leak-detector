# Tâches — Leak Detector

> Suivi des tâches par phase. Cocher au fur et à mesure.

---

## Phase 1 — Setup & Infrastructure (J+2)

### Backend
- [ ] 🔴 Init repo avec structure depuis saas-templates
- [ ] 🔴 Configurer Supabase (projet + tables)
- [ ] 🔴 Configurer Railway (backend + Redis)
- [ ] 🔴 Variables d'environnement
- [ ] 🔴 Health check endpoint
- [ ] 🟡 Sentry monitoring

### Frontend
- [ ] 🔴 Init Next.js depuis saas-templates
- [ ] 🔴 Configurer Vercel
- [ ] 🔴 Setup Supabase Auth client
- [ ] 🔴 Layout de base (header, sidebar)

### Database
- [ ] 🔴 Table `profiles` (extension Supabase Auth)
- [ ] 🔴 Table `analyses`
- [ ] 🔴 Table `reports`
- [ ] 🔴 RLS policies
- [ ] 🟡 Indexes

---

## Phase 2 — Core Analysis (J+5)

### Scraping Service
- [ ] 🔴 Setup Playwright dans worker
- [ ] 🔴 Fonction scrape_page(url) → HTML + metadata
- [ ] 🔴 Capture screenshot
- [ ] 🔴 Gestion timeout (30s max)
- [ ] 🔴 Gestion erreurs (404, timeout, blocked)
- [ ] 🟡 Headers réalistes (User-Agent, etc.)

### Analysis Service
- [ ] 🔴 Prompt engineering pour analyse CRO
- [ ] 🔴 Fonction analyze(html, screenshot) → Report
- [ ] 🔴 Parsing réponse Claude → structure JSON
- [ ] 🔴 Calcul scores par catégorie
- [ ] 🟡 Fallback si parsing échoue

### Worker Celery
- [ ] 🔴 Task analyze_page(analysis_id)
- [ ] 🔴 Update status (pending → processing → completed/failed)
- [ ] 🔴 Store result dans Supabase
- [ ] 🔴 Retry logic (max 2 retries)
- [ ] 🟡 Dead letter queue

### API Endpoints
- [ ] 🔴 POST /analyses - Créer analyse
- [ ] 🔴 GET /analyses/{id} - Status analyse
- [ ] 🔴 GET /reports/{id} - Récupérer rapport

---

## Phase 3 — MVP UI (J+8)

### Pages Auth
- [ ] 🔴 Page /login
- [ ] 🔴 Page /register
- [ ] 🔴 Page /forgot-password
- [ ] 🔴 Middleware protection routes

### Dashboard
- [ ] 🔴 Page /dashboard
- [ ] 🔴 Stats cards (analyses, score moyen, quota)
- [ ] 🔴 Liste analyses récentes
- [ ] 🔴 Empty state si nouveau user

### Analyse
- [ ] 🔴 Page /analyze
- [ ] 🔴 Formulaire URL
- [ ] 🔴 Validation URL côté client
- [ ] 🔴 État loading avec progress
- [ ] 🔴 Polling status analyse
- [ ] 🔴 Redirection vers rapport

### Rapports
- [ ] 🔴 Page /reports (liste)
- [ ] 🔴 Page /reports/[id] (détail)
- [ ] 🔴 Score global avec jauge
- [ ] 🔴 Cards par catégorie
- [ ] 🔴 Liste issues avec sévérité
- [ ] 🔴 Screenshot de la page
- [ ] 🟡 Bouton partage

---

## Phase 4 — Payment (J+10)

### Stripe Setup
- [ ] 🔴 Créer produits (Pro, Agency)
- [ ] 🔴 Configurer webhook endpoint
- [ ] 🔴 Configurer Customer Portal

### Backend
- [ ] 🔴 POST /billing/checkout
- [ ] 🔴 POST /billing/portal
- [ ] 🔴 Webhook handler (tous events)
- [ ] 🔴 Update subscription status en DB

### Frontend
- [ ] 🔴 Page /pricing
- [ ] 🔴 Page /settings/billing
- [ ] 🔴 Bouton upgrade
- [ ] 🔴 Affichage plan actuel

### Quotas
- [ ] 🔴 Check quota avant analyse
- [ ] 🔴 Décrémentation après analyse
- [ ] 🔴 Reset mensuel (cron ou trigger)
- [ ] 🔴 Modal "quota dépassé"

---

## Phase 5 — Polish (J+12)

### Landing Page
- [ ] 🔴 Hero section
- [ ] 🔴 Features section
- [ ] 🔴 How it works
- [ ] 🔴 Pricing section
- [ ] 🔴 FAQ
- [ ] 🔴 Footer
- [ ] 🟡 Animations

### UX
- [ ] 🔴 Loading states partout
- [ ] 🔴 Error states partout
- [ ] 🔴 Empty states partout
- [ ] 🔴 Toasts notifications
- [ ] 🟡 Onboarding first-time user

### SEO & Meta
- [ ] 🔴 Meta tags toutes pages
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

## Notes de session

### 2026-02-02
- Création repo et documentation initiale
- Stack validé : FastAPI + Next.js + Supabase + Claude API
- Prochaine étape : Phase 1 Setup
