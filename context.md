# Context — Leak Detector

> Document vivant : vision, décisions stratégiques, état du projet.
> Dernière mise à jour : 2026-02-02

---

## Vision

### One-liner
**Leak Detector** identifie en 30 secondes les éléments de votre landing page qui font fuir vos visiteurs.

### Problème
Les entrepreneurs et marketeurs dépensent des fortunes en ads pour envoyer du trafic sur des landing pages qui convertissent mal. Ils savent que "quelque chose ne va pas" mais ne savent pas quoi. Les audits CRO coûtent 2-5k€ et prennent des semaines.

### Solution
Un outil IA qui analyse instantanément une landing page et retourne un rapport actionnable :
- Score global de "leak" (0-100)
- Liste des problèmes détectés par catégorie
- Recommandations concrètes pour chaque problème
- Benchmark vs meilleures pratiques

### Pourquoi maintenant
- Claude/GPT-4 permettent une analyse sémantique de qualité pro
- Le marché des landing pages explose (no-code, IA)
- Coût d'acquisition en hausse → ROI des pages plus critique que jamais

---

## Personas

### Persona 1 : Solo Entrepreneur (Primary)
- **Qui** : Fondateur solo, indie hacker, créateur de cours/SaaS
- **Budget** : 0-50€/mois pour les outils
- **Douleur** : "Ma landing page convertit à 1%, je sais pas pourquoi"
- **Comportement** : Lance vite, itère, veut des résultats immédiats
- **Où le trouver** : Twitter/X, IndieHackers, ProductHunt, Reddit

### Persona 2 : Growth Marketer (Secondary)
- **Qui** : Marketer en startup ou PME, gère 5-20 landing pages
- **Budget** : 100-500€/mois d'outils
- **Douleur** : "Je dois justifier mes choix auprès du CEO"
- **Comportement** : Veut des données, des benchmarks, des rapports exportables
- **Où le trouver** : LinkedIn, GrowthHackers, newsletters growth

### Persona 3 : Agence Web (Tertiary)
- **Qui** : Agence qui livre des sites/landing pages à ses clients
- **Budget** : 200-1000€/mois
- **Douleur** : "Comment prouver la qualité de mon travail au client"
- **Comportement** : Veut du white-label, des rapports PDF brandés
- **Où le trouver** : Événements, LinkedIn, Dribbble

---

## Business Model

### Pricing

| Plan | Prix | Analyses/mois | Features |
|------|------|---------------|----------|
| Free | 0€ | 3 | Analyse basique, score global |
| Pro | 29€/mois | 50 | Analyse détaillée, historique, export PDF |
| Agency | 99€/mois | 200 | White-label, API, multi-users |

### Unit Economics (cible Pro)

| Métrique | Valeur | Notes |
|----------|--------|-------|
| Prix | 29€/mois | 348€/an |
| Coût LLM/analyse | ~0.15€ | Claude Sonnet, ~4k tokens |
| Analyses/user/mois | ~10 | Estimation conservatrice |
| Coût LLM/user/mois | ~1.50€ | 10 × 0.15€ |
| Coût infra/user/mois | ~0.50€ | Supabase, Railway |
| Marge brute | ~93% | (29 - 2) / 29 |
| CAC cible | <50€ | Organic + content |
| LTV (12 mois, 20% churn) | ~180€ | |
| LTV/CAC | >3.5x | ✅ Healthy |

### Revenue Projections

| Mois | Users Free | Users Pro | MRR |
|------|------------|-----------|-----|
| M1 | 100 | 5 | 145€ |
| M3 | 500 | 30 | 870€ |
| M6 | 2000 | 100 | 2900€ |
| M12 | 5000 | 300 | 8700€ |

---

## Marché

### TAM/SAM/SOM
- **TAM** : Marché global CRO tools = $5B
- **SAM** : Landing page optimization tools = $500M
- **SOM** : Solo entrepreneurs + petites agences EU/US = $50M

### Concurrence

| Concurrent | Prix | Forces | Faiblesses |
|------------|------|--------|------------|
| Unbounce Smart Builder | 99€+ | Brand, features | Cher, complexe |
| PageSpeed Insights | Gratuit | Google, SEO focus | Pas CRO, technique only |
| Hotjar | 39€+ | Heatmaps, recordings | Pas d'analyse auto |
| CRO agencies | 2000€+ | Expertise humaine | Lent, cher |
| **Leak Detector** | 29€ | Instant, actionnable, abordable | Nouveau, pas de brand |

### Positionnement
"L'audit CRO instantané pour les makers qui n'ont pas le temps ni le budget pour une agence."

---

## Décisions techniques

### Stack retenu

| Couche | Choix | Justification |
|--------|-------|---------------|
| Backend | FastAPI + Python 3.12 | Écosystème LLM, rapidité dev |
| Frontend | Next.js 14 + TypeScript | SEO landing, React ecosystem |
| Database | Supabase PostgreSQL | Auth inclus, RLS, rapide à setup |
| Queue | Celery + Redis | Analyses async, retry facile |
| LLM | Claude API (Sonnet) | Meilleur rapport qualité/prix pour analyse |
| Scraping | Playwright | JS rendering, screenshots |
| Hosting | Railway (back) + Vercel (front) | Simple, scale auto |

### Architecture simplifiée

```
[Landing Page URL]
       ↓
[Frontend Next.js] → [API FastAPI]
                          ↓
                    [Celery Worker]
                          ↓
              [Playwright] → [Screenshot + HTML]
                          ↓
              [Claude API] → [Analyse]
                          ↓
              [Supabase] → [Store Report]
                          ↓
              [Return to Frontend]
```

### Décisions clés

1. **Scraping côté serveur** : Playwright pour gérer le JS, pas de dépendance browser user
2. **Analyse async** : Celery car analyse peut prendre 10-30s
3. **Screenshot** : Capture visuelle pour l'UI du rapport + contexte pour l'IA
4. **Prompt engineering** : Prompt structuré avec critères CRO explicites

---

## Phases projet

| Phase | Scope | Status | ETA |
|-------|-------|--------|-----|
| 1. Setup | Infra, auth, DB | 🔲 | J+2 |
| 2. Core | Scraping + analyse LLM | 🔲 | J+5 |
| 3. MVP UI | Dashboard, rapport, historique | 🔲 | J+8 |
| 4. Payment | Stripe, quotas | 🔲 | J+10 |
| 5. Polish | Landing page, onboarding | 🔲 | J+12 |
| 6. Launch | ProductHunt, Twitter | 🔲 | J+14 |

---

## Risques et mitigations

| Risque | Impact | Probabilité | Mitigation |
|--------|--------|-------------|------------|
| Scraping bloqué (Cloudflare) | Haut | Moyen | Headers réalistes, rotation IP si besoin |
| Coût LLM explose | Moyen | Faible | Cache résultats, limites strictes, Haiku fallback |
| Qualité analyse insuffisante | Haut | Moyen | Itération prompts, feedback users |
| Marché saturé | Moyen | Faible | Focus niche (makers), UX différenciante |

---

## Métriques de succès

### North Star
**Nombre d'analyses complétées par semaine**

### KPIs

| Métrique | Cible M1 | Cible M3 |
|----------|----------|----------|
| Signups | 100 | 500 |
| Analyses | 200 | 1500 |
| Conversion Free→Pro | 5% | 8% |
| NPS | >40 | >50 |

---

## Liens

- Repo : github.com/altidigitech-ui/leak-detector
- Prod : leakdetector.io (à configurer)
- Staging : staging.leakdetector.io
- Figma : [à créer]
- Stripe : [à configurer]
