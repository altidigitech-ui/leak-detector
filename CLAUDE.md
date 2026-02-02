# CLAUDE.md — Leak Detector

> Instructions permanentes pour Claude Code sur ce projet.

---

## Projet

**Leak Detector** est un SaaS qui analyse les landing pages pour détecter les problèmes de conversion ("leaks"). L'utilisateur soumet une URL, le système scrape la page, l'analyse via Claude API, et retourne un rapport actionnable.

---

## Stack technique

| Couche | Technologie | Version |
|--------|-------------|---------|
| Backend | FastAPI | 0.109+ |
| Runtime | Python | 3.12+ |
| Frontend | Next.js (App Router) | 14.x |
| Language | TypeScript | 5.x |
| Database | Supabase PostgreSQL | - |
| Auth | Supabase Auth | - |
| Queue | Celery + Redis | 5.3+ |
| LLM | Anthropic Claude API | claude-3-5-sonnet |
| Scraping | Playwright | 1.40+ |
| Hosting Backend | Railway | - |
| Hosting Frontend | Vercel | - |
| Payments | Stripe | - |

---

## Structure projet

```
leak-detector/
├── CLAUDE.md                 # Ce fichier
├── context.md                # Vision, business, décisions
├── docs/
│   ├── SPEC.md              # Spécifications fonctionnelles
│   ├── ARCH.md              # Architecture technique
│   └── TASKS.md             # Tâches en cours
│
├── backend/
│   ├── app/
│   │   ├── main.py          # FastAPI entry point
│   │   ├── config.py        # Settings Pydantic
│   │   ├── api/
│   │   │   ├── v1/
│   │   │   │   ├── router.py
│   │   │   │   └── endpoints/
│   │   │   │       ├── analyses.py
│   │   │   │       ├── reports.py
│   │   │   │       └── webhooks.py
│   │   │   └── deps.py
│   │   ├── core/
│   │   │   ├── security.py
│   │   │   ├── errors.py
│   │   │   └── logging.py
│   │   ├── services/
│   │   │   ├── scraper.py       # Playwright scraping
│   │   │   ├── analyzer.py      # Claude API analysis
│   │   │   ├── supabase.py
│   │   │   └── stripe.py
│   │   ├── workers/
│   │   │   ├── celery.py
│   │   │   └── tasks/
│   │   │       └── analyze.py   # Task analyse async
│   │   └── schemas/
│   │       ├── analysis.py
│   │       └── report.py
│   ├── tests/
│   ├── requirements.txt
│   └── Dockerfile
│
└── frontend/
    ├── src/
    │   ├── app/
    │   │   ├── (marketing)/     # Landing, pricing
    │   │   ├── (auth)/          # Login, register
    │   │   └── (dashboard)/     # App principale
    │   │       ├── dashboard/
    │   │       ├── analyze/
    │   │       ├── reports/
    │   │       └── settings/
    │   ├── components/
    │   ├── lib/
    │   └── hooks/
    ├── package.json
    └── next.config.js
```

---

## Conventions de code

### Python (Backend)

```python
# Nommage
variable_name = "snake_case"
CONSTANT_NAME = "UPPER_SNAKE"
class ClassName:
    def method_name(self):
        pass

# Type hints obligatoires
def analyze_page(url: str, user_id: str) -> AnalysisResult:
    pass

# Docstrings pour fonctions publiques
def scrape_page(url: str) -> ScrapedPage:
    """
    Scrape une landing page et retourne son contenu.
    
    Args:
        url: URL de la page à scraper
        
    Returns:
        ScrapedPage avec HTML, screenshot, metadata
        
    Raises:
        ScrapingError: Si la page est inaccessible
    """
    pass
```

### TypeScript (Frontend)

```typescript
// Nommage
const variableName = "camelCase";
const CONSTANT_NAME = "UPPER_SNAKE";
interface InterfaceName {}
type TypeName = {};

// Types explicites, pas de `any`
function analyzeUrl(url: string): Promise<Analysis> {}

// Components
export function ReportCard({ report }: ReportCardProps) {}
```

### API Response Format

```json
{
  "success": true,
  "data": { ... },
  "meta": {
    "page": 1,
    "total": 100
  }
}

{
  "success": false,
  "error": {
    "code": "ANALYSIS_FAILED",
    "message": "Unable to analyze this page",
    "details": { "reason": "timeout" }
  }
}
```

---

## Règles métier clés

### Limites par plan

| Plan | Analyses/mois | Historique | Export PDF |
|------|---------------|------------|------------|
| Free | 3 | 7 jours | ❌ |
| Pro | 50 | Illimité | ✅ |
| Agency | 200 | Illimité | ✅ + White-label |

### Flow d'analyse

1. User soumet URL
2. Vérifier quota (sinon erreur QUOTA_EXCEEDED)
3. Créer record `analyses` avec status `pending`
4. Enqueue task Celery
5. Worker : scrape page (Playwright)
6. Worker : analyse (Claude API)
7. Worker : update status `completed` + store result
8. Frontend poll ou webhook pour récupérer résultat

### Structure du rapport

```json
{
  "score": 72,
  "summary": "Votre page a un bon potentiel mais...",
  "categories": [
    {
      "name": "headline",
      "score": 85,
      "issues": [
        {
          "severity": "warning",
          "title": "Headline trop longue",
          "description": "Votre headline fait 18 mots...",
          "recommendation": "Réduisez à moins de 10 mots..."
        }
      ]
    },
    {
      "name": "cta",
      "score": 60,
      "issues": [...]
    }
  ],
  "metadata": {
    "url": "https://...",
    "analyzed_at": "2026-02-02T10:00:00Z",
    "load_time_ms": 2340
  }
}
```

### Catégories d'analyse

1. **headline** : Clarté, longueur, proposition de valeur
2. **cta** : Visibilité, wording, placement
3. **social_proof** : Présence, crédibilité, placement
4. **form** : Nombre de champs, friction
5. **visual_hierarchy** : Lisibilité, espacement, contraste
6. **trust** : Sécurité, légal, crédibilité
7. **mobile** : Responsive, touch targets
8. **speed** : Temps de chargement, poids

---

## Interdictions absolues

1. **Pas de secrets dans le code** — Utiliser variables d'environnement
2. **Pas de `any` en TypeScript** — Typer explicitement
3. **Pas de requêtes DB sans validation** — Pydantic/Zod obligatoire
4. **Pas de scraping sans timeout** — Max 30s par page
5. **Pas d'analyse sans vérifier le quota** — Check avant enqueue
6. **Pas de store de données de carte** — Stripe only
7. **Pas de logs avec PII** — Anonymiser emails, IPs
8. **Pas de commit de .env** — Gitignore strict

---

## Variables d'environnement

### Backend (.env)

```bash
# App
APP_ENV=development
APP_DEBUG=true
APP_SECRET_KEY=

# Supabase
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_KEY=

# Redis
REDIS_URL=redis://localhost:6379/0

# Anthropic
ANTHROPIC_API_KEY=

# Stripe
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_PRICE_PRO_MONTHLY=
STRIPE_PRICE_AGENCY_MONTHLY=

# Sentry
SENTRY_DSN=
```

### Frontend (.env.local)

```bash
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
```

---

## Workflow Claude Code

### Avant d'écrire du code

1. Lire `context.md` pour comprendre le projet
2. Lire `docs/SPEC.md` pour les specs de la feature
3. Vérifier `docs/TASKS.md` pour l'état actuel
4. Demander clarification si ambiguïté

### Pendant le code

1. Suivre les conventions ci-dessus
2. Inclure types et validation
3. Gérer les erreurs explicitement
4. Commenter le "pourquoi", pas le "quoi"

### Après le code

1. Proposer les tests associés
2. Mettre à jour TASKS.md si nécessaire
3. Suggérer la prochaine étape logique

---

## Commandes utiles

### Backend

```bash
cd backend
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload

# Celery worker
celery -A app.workers.celery worker --loglevel=info

# Tests
pytest --cov=app
```

### Frontend

```bash
cd frontend
npm install
npm run dev

# Tests
npm test
```

---

## Contacts & Ressources

- **Owner** : Alti (AltiDigitech)
- **Repo** : github.com/altidigitech-ui/leak-detector
- **Stack reference** : github.com/altidigitech-ui/saas-templates
