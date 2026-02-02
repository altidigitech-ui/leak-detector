# Changelog — Leak Detector

> Historique des versions et changements.

---

## Convention

Ce projet suit [Semantic Versioning](https://semver.org/) :
- **MAJOR** : breaking changes
- **MINOR** : nouvelles features (backward compatible)
- **PATCH** : bug fixes

Format des entrées :
- **Added** : nouvelles fonctionnalités
- **Changed** : modifications de fonctionnalités existantes
- **Fixed** : corrections de bugs
- **Removed** : fonctionnalités supprimées
- **Security** : corrections de sécurité
- **Infrastructure** : changements d'infra/deploy

---

## [Unreleased]

### Added
- _Prochaines features en développement_

---

## [1.0.0] — 2026-XX-XX

> 🚀 Release initiale

### Added

**Core**
- Analyse de landing page par URL
- Scraping via Playwright (HTML + screenshot)
- Analyse IA via Claude API (8 catégories)
- Score global 0-100
- Rapport détaillé avec issues et recommendations

**Catégories d'analyse**
- Headline : clarté et proposition de valeur
- Call-to-Action : visibilité et wording
- Social Proof : témoignages et signaux de confiance
- Form : friction et nombre de champs
- Visual Hierarchy : layout et lisibilité
- Trust : sécurité et crédibilité
- Mobile : responsive design
- Speed : temps de chargement

**Authentification**
- Inscription email/password
- Login Google OAuth
- Gestion de session (JWT via Supabase)

**Plans & Billing**
- Plan Free : 3 analyses/mois
- Plan Pro : 50 analyses/mois (€29)
- Plan Agency : 200 analyses/mois (€99)
- Paiement Stripe Checkout
- Gestion abonnement via Stripe Customer Portal

**Frontend**
- Landing page
- Dashboard avec stats
- Page d'analyse avec progress en temps réel
- Liste des rapports
- Détail rapport avec scores par catégorie
- Page pricing
- Settings (profil + billing)

**Backend**
- API REST FastAPI
- Queue Celery + Redis
- Webhooks Stripe
- Rate limiting
- Health checks

**Infrastructure**
- Déploiement Railway (backend) + Vercel (frontend)
- CI/CD GitHub Actions
- Supabase (DB + Auth + Storage)
- Sentry error tracking

---

## Template pour futures entrées
```
## [X.Y.Z] — YYYY-MM-DD

### Added
- Feature description (#PR)

### Changed
- Change description (#PR)

### Fixed
- Bug fix description (#PR)

### Removed
- Removed feature description (#PR)

### Security
- Security fix description (#PR)

### Infrastructure
- Infra change description (#PR)
```

---

## Conventions de Commit

Format : `type: description`

| Type | Usage |
|------|-------|
| feat | Nouvelle fonctionnalité |
| fix | Correction de bug |
| docs | Documentation |
| style | Formatting, pas de changement de code |
| refactor | Refactoring sans changement fonctionnel |
| perf | Amélioration de performance |
| test | Ajout/modification de tests |
| chore | Maintenance, dépendances |
| ci | Changements CI/CD |
| db | Migration ou changement DB |

Exemples :
```
feat: add PDF export for reports
fix: analysis timeout not handled correctly
docs: update API documentation
db: migration 002 - add api_keys table
ci: add staging deploy workflow
```

---

## Release Process

### 1. Préparer
```bash
# Vérifier que tout est mergé
git checkout main
git pull

# Vérifier les tests
pytest
npm test
```

### 2. Versionner
```bash
# Mettre à jour CHANGELOG.md
# - Déplacer [Unreleased] vers [X.Y.Z] — date
# - Créer nouveau [Unreleased] vide

# Commit
git add CHANGELOG.md
git commit -m "chore: release vX.Y.Z"
```

### 3. Tagger
```bash
git tag -a vX.Y.Z -m "Release vX.Y.Z"
git push origin main --tags
```

### 4. Déployer
```bash
# Auto-deploy via CI/CD sur push main
# Vérifier les dashboards Railway + Vercel
```

### 5. Vérifier
```bash
# Health checks
curl https://api.leakdetector.io/health

# Smoke test
# - Login
# - Lancer une analyse
# - Vérifier le rapport
```
