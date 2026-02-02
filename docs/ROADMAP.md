# Roadmap — Leak Detector

> Évolutions planifiées par phase.

---

## Vision

Devenir l'outil de référence pour l'optimisation de conversion de landing pages, utilisé par les marketers, agences, et growth teams du monde entier.

---

## Phase 1 — MVP (v1.0) ✅

> Objectif : Valider le product-market fit

| Feature | Status |
|---------|--------|
| Analyse par URL | ✅ |
| 8 catégories d'analyse | ✅ |
| Score global | ✅ |
| Rapport détaillé | ✅ |
| Auth email + Google | ✅ |
| 3 plans (Free/Pro/Agency) | ✅ |
| Stripe billing | ✅ |
| Dashboard | ✅ |

**Métriques de succès :**
- 100 signups
- 50 analyses complétées
- 5 conversions payantes
- NPS > 30

---

## Phase 2 — Rétention & Valeur (v1.1 — v1.3)

> Objectif : Augmenter l'engagement et réduire le churn

### v1.1 — Comparaison & Historique

| Feature | Priorité | Effort |
|---------|----------|--------|
| Comparer 2 rapports côte à côte | High | M |
| Re-analyser une URL (avant/après) | High | S |
| Graphique d'évolution du score | Medium | M |
| Tags/dossiers pour organiser les rapports | Low | S |

### v1.2 — Export & Partage

| Feature | Priorité | Effort |
|---------|----------|--------|
| Export PDF du rapport | High | L |
| Lien de partage public (read-only) | High | M |
| Export CSV des données | Medium | S |
| White-label PDF (Agency) | Medium | M |

### v1.3 — Recommandations Améliorées

| Feature | Priorité | Effort |
|---------|----------|--------|
| Exemples visuels dans les recommendations | High | L |
| Prioritisation des issues par impact | High | M |
| Score par industrie (benchmark) | Medium | L |
| Checklist actionnable par rapport | Medium | M |

---

## Phase 3 — Croissance (v2.0 — v2.3)

> Objectif : Scaler l'acquisition et le revenu

### v2.0 — API Publique

| Feature | Priorité | Effort |
|---------|----------|--------|
| API keys management | High | M |
| Documentation API interactive (Swagger) | High | S |
| Rate limiting par plan | High | S |
| Webhooks (notify on completion) | Medium | M |
| SDK JavaScript/Python | Low | M |

### v2.1 — Bulk & Automation

| Feature | Priorité | Effort |
|---------|----------|--------|
| Analyse en bulk (CSV d'URLs) | High | L |
| Analyses planifiées (weekly/monthly) | High | L |
| Alertes si score drop | Medium | M |
| Intégration Zapier | Medium | M |

### v2.2 — Multi-utilisateurs

| Feature | Priorité | Effort |
|---------|----------|--------|
| Workspaces / Teams | High | XL |
| Rôles (admin, member, viewer) | High | L |
| Facturation par workspace | High | L |
| Activity log | Medium | M |

### v2.3 — Acquisition

| Feature | Priorité | Effort |
|---------|----------|--------|
| Widget embed "Analyzed by Leak Detector" | High | M |
| Programme d'affiliation | Medium | L |
| Free tool : score rapide sans inscription | High | M |
| SEO : pages publiques par industrie | Medium | L |

---

## Phase 4 — Intelligence (v3.0+)

> Objectif : Créer un moat via la data et l'IA

### v3.0 — Analytics Avancés

| Feature | Priorité | Effort |
|---------|----------|--------|
| Heatmap IA (prédiction zones d'attention) | High | XL |
| Score prédictif de conversion | High | XL |
| Benchmark par industrie (data agrégée) | High | L |
| A/B test suggestions | Medium | L |

### v3.1 — Multi-page & Funnel

| Feature | Priorité | Effort |
|---------|----------|--------|
| Analyse de funnel complet (multi-pages) | High | XL |
| Détection des drop-off points | High | L |
| Analyse de formulaires multi-étapes | Medium | L |

### v3.2 — Génération & Fix

| Feature | Priorité | Effort |
|---------|----------|--------|
| Générer le code des corrections | High | XL |
| Preview des corrections (before/after) | High | XL |
| Génération de variantes de copy | Medium | L |
| Génération de variantes visuelles | Medium | XL |

### v3.3 — Intégrations

| Feature | Priorité | Effort |
|---------|----------|--------|
| Google Analytics (corréler score ↔ conversion) | High | L |
| Slack notifications | Medium | M |
| Notion / Jira (export issues) | Medium | M |
| WordPress plugin | Medium | L |
| Shopify app | Medium | L |

---

## Effort Scale

| Label | Durée estimée | Complexité |
|-------|---------------|------------|
| S | 1-2 jours | Simple, bien défini |
| M | 3-5 jours | Modéré, quelques inconnues |
| L | 1-2 semaines | Complexe, design nécessaire |
| XL | 2-4 semaines | Très complexe, R&D |

---

## Priorisation

Framework : **ICE Score**

| Critère | Question |
|---------|----------|
| Impact | Combien d'utilisateurs affectés ? Quel impact sur le revenu ? |
| Confidence | À quel point sommes-nous sûrs de l'impact ? |
| Ease | Combien de temps/effort pour implémenter ? |

Score : (I + C + E) / 3, sur 10

### Top priorities actuelles

| Feature | I | C | E | ICE | Phase |
|---------|---|---|---|-----|-------|
| Export PDF | 8 | 9 | 7 | 8.0 | 2 |
| Re-analyse (before/after) | 9 | 8 | 7 | 8.0 | 2 |
| Free tool sans inscription | 9 | 7 | 8 | 8.0 | 3 |
| Comparaison rapports | 7 | 8 | 7 | 7.3 | 2 |
| API publique | 7 | 7 | 7 | 7.0 | 3 |
| Analyses planifiées | 8 | 6 | 5 | 6.3 | 3 |
| Bulk analysis | 7 | 6 | 5 | 6.0 | 3 |
| Teams/Workspaces | 8 | 5 | 3 | 5.3 | 3 |

---

## Moats Stratégiques

### Court terme (6 mois)

- **Rapidité d'exécution** : premier sur le marché avec analyse IA de qualité
- **UX supérieure** : rapport clair, actionnable, pas de jargon

### Moyen terme (12 mois)

- **Data benchmark** : données agrégées par industrie (impossible à répliquer sans volume)
- **Network effect** : widget "Analyzed by" génère de l'acquisition organique

### Long terme (24 mois)

- **Données propriétaires** : corrélation score ↔ conversion réelle
- **Intégrations** : switching cost élevé (workflow intégré)
- **Brand** : référence dans l'industrie CRO

---

## Anti-Roadmap

Features qu'on ne fera PAS :

| Feature | Raison |
|---------|--------|
| Page builder intégré | Hors scope, concurrence Unbounce/Instapage |
| A/B testing engine | Hors scope, concurrence Optimizely/VWO |
| Analytics complet | Hors scope, concurrence GA/Mixpanel |
| Hébergement de pages | Hors scope, complexité infra |
| CMS intégré | Hors scope, feature creep |

**Règle : on analyse et recommande, on ne construit pas les pages.**

---

## Review Schedule

| Fréquence | Action |
|-----------|--------|
| Hebdo | Review des métriques, ajuster priorités sprint |
| Mensuel | Review roadmap, re-score ICE avec nouvelles données |
| Trimestriel | Review stratégique, ajuster phases |
