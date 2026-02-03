# CLAUDE.md — Leak Detector

> Instructions permanentes pour Claude Code. Ce fichier reflète l'état exact du codebase.
> Dernière mise à jour : 2026-02-03

---

## Projet

**Leak Detector** analyse les landing pages pour détecter les problèmes de conversion ("leaks"). L'utilisateur soumet une URL → scraping Playwright → analyse Claude API → rapport actionnable avec score 0-100.

Lire `context.md` pour la vision business, les personas, le pricing et les unit economics.

---

## Stack technique

| Couche | Technologie | Détails |
|--------|-------------|---------|
| Backend | FastAPI + Python 3.12 | `backend/app/main.py` entry point |
| Frontend | Next.js 14 App Router + TypeScript | `frontend/src/app/` |
| Database | Supabase PostgreSQL | Schema dans `database/schema.sql` |
| Auth | Supabase Auth (email + Google OAuth) | JWT vérifié avec SUPABASE_JWT_SECRET, RLS activé |
| Queue | Celery + Redis | Worker dans `backend/app/workers/` |
| LLM | Anthropic Claude API | `claude-sonnet-4-5-20250929`, prompt dans `services/analyzer.py` |
| Scraping | Playwright (headless Chromium) | `services/scraper.py` |
| Payments | Stripe (Checkout + Customer Portal) | Webhooks dans `endpoints/webhooks.py` |
| Rate Limiting | SlowAPI | Middleware dans `main.py` |
| Hosting | Railway (backend) + Vercel (frontend) | |
| Monitoring | Sentry + structlog | JSON en prod, console en dev |

---

## Structure projet (état réel)

```
leak-detector/
├── CLAUDE.md                          # ← CE FICHIER
├── README.md
├── context.md                         # Vision, business model, personas
├── .gitignore
│
├── database/
│   ├── schema.sql                     # Tables, RLS, triggers, fonctions RPC
│   └── seed.sql                       # Données de test
│
├── docs/
│   ├── SPEC.md                        # Spécifications fonctionnelles
│   ├── ARCH.md                        # Architecture technique détaillée
│   ├── TASKS.md                       # ⚡ TÂCHES DE PRODUCTION — LIRE EN PREMIER
│   ├── API.md                         # Référence API REST
│   ├── UI.md                          # Design system (couleurs, typo, composants)
│   ├── COPY.md                        # Textes de l'application
│   ├── ERRORS.md                      # Catalogue d'erreurs
│   ├── SECURITY.md                    # Politiques de sécurité
│   ├── TESTS.md                       # Stratégie de tests
│   ├── DEPLOY.md                      # Guide de déploiement
│   ├── ANALYTICS.md                   # Tracking et KPIs
│   ├── MONITORING.md                  # Monitoring et alerting
│   ├── MIGRATIONS.md                  # Procédure migrations DB
│   ├── BACKUP.md                      # Backup et restore
│   ├── CHANGELOG.md                   # Historique des versions
│   └── ROADMAP.md                     # Évolutions planifiées
│
├── backend/
│   ├── .env.example
│   ├── requirements.txt
│   ├── Dockerfile
│   ├── railway.toml
│   ├── app/
│   │   ├── main.py                    # FastAPI app, CORS, SlowAPI rate limiting, error handlers
│   │   ├── config.py                  # Pydantic Settings (env vars incl. SUPABASE_JWT_SECRET)
│   │   ├── api/
│   │   │   ├── deps.py               # DI: CurrentUserID, Supabase (Annotated)
│   │   │   └── v1/
│   │   │       ├── router.py          # Agrège tous les endpoint routers
│   │   │       └── endpoints/
│   │   │           ├── analyses.py    # POST/GET /analyses — création + polling
│   │   │           ├── reports.py     # GET /reports, /reports/{id}, /reports/by-analysis/{id}
│   │   │           ├── billing.py     # POST /billing/checkout, /billing/portal, GET /billing/status
│   │   │           └── webhooks.py    # POST /webhooks/stripe — tous les events Stripe
│   │   ├── core/
│   │   │   ├── errors.py             # AppError + sous-classes + exception handlers
│   │   │   ├── logging.py            # structlog config (JSON prod, console dev)
│   │   │   └── security.py           # JWT verification (SUPABASE_JWT_SECRET), Stripe sig verify
│   │   ├── schemas/
│   │   │   └── common.py             # Schemas Pydantic partagés
│   │   ├── models/                    # (vide — pas d'ORM, accès via SupabaseService)
│   │   ├── services/
│   │   │   ├── supabase.py           # CRUD profiles, analyses, reports, subscriptions, storage
│   │   │   ├── scraper.py            # Playwright: scrape_page() → ScrapedPage dataclass
│   │   │   └── analyzer.py           # Claude API: analyze_page() → JSON structuré
│   │   └── workers/
│   │       ├── celery.py             # Config Celery + Redis
│   │       └── tasks/
│   │           └── analyze.py         # Task principale: scrape → analyze → store
│   └── tests/
│       ├── conftest.py               # Fixtures pytest
│       ├── test_analyzer.py          # Tests parsing + validation
│       ├── test_endpoints.py         # Tests API (health, auth)
│       └── test_webhooks.py          # Tests Stripe webhook helpers
│
└── frontend/
    ├── .env.example
    ├── package.json
    ├── next.config.js
    ├── tsconfig.json
    ├── tailwind.config.ts             # Couleurs primary (blue), font Inter
    ├── postcss.config.js
    ├── vercel.json
    └── src/
        ├── app/
        │   ├── layout.tsx             # Root layout (font, metadata, ToastProvider)
        │   ├── globals.css            # Tailwind + classes utilitaires (btn-primary, card, etc.)
        │   ├── page.tsx               # Landing page marketing
        │   ├── sitemap.ts             # Next.js sitemap generation
        │   ├── robots.ts              # Next.js robots.txt
        │   ├── auth/callback/route.ts # OAuth callback handler
        │   ├── (marketing)/
        │   │   ├── pricing/page.tsx   # Page pricing (3 plans) + FAQ
        │   │   ├── terms/page.tsx     # Terms of Service
        │   │   └── privacy/page.tsx   # Privacy Policy
        │   ├── (auth)/
        │   │   ├── login/page.tsx     # Login email + Google
        │   │   ├── register/page.tsx  # Register email + Google
        │   │   ├── forgot-password/page.tsx  # Demande reset email
        │   │   └── reset-password/page.tsx   # Nouveau mot de passe
        │   └── (dashboard)/
        │       ├── layout.tsx         # Dashboard layout (sidebar/header)
        │       ├── dashboard/page.tsx # Vue d'ensemble
        │       ├── analyze/page.tsx   # Formulaire URL + progress polling
        │       ├── reports/page.tsx   # Liste des rapports
        │       ├── reports/[id]/page.tsx # Détail rapport (SSR)
        │       └── settings/page.tsx  # Profil + billing
        ├── components/
        │   ├── ui/                    # Primitives: button, card, input, score-circle, spinner, toast
        │   └── shared/               # empty-state, loading, error-state
        ├── hooks/
        │   ├── use-auth.ts           # Auth state + signIn/signUp/signOut/Google
        │   └── use-toast.ts          # Toast notifications hook + context
        ├── lib/
        │   ├── api.ts                # ApiClient class (typed, no `any`)
        │   ├── utils.ts              # Helpers (cn, formatDate, etc.)
        │   └── supabase/
        │       ├── client.ts          # createClient() — browser (createBrowserClient)
        │       └── server.ts          # createClient() — server (createServerClient)
        ├── middleware.ts              # Auth guard: protège /dashboard, /settings, /analyze, /reports
        └── types/
            └── index.ts              # Types complets: Analysis, Report, Category, Issue, etc.
```

---

## Comment ajouter une feature end-to-end

### 1. Database (si nouveau modèle)
```sql
-- database/schema.sql : ajouter la table
-- Ajouter RLS policies
-- Ajouter index pertinents
-- Suivre docs/MIGRATIONS.md pour le process
```

### 2. Backend service
```python
# backend/app/services/supabase.py : ajouter les méthodes CRUD
async def create_xxx(self, ...) -> Dict[str, Any]:
    response = self.client.table("xxx").insert({...}).execute()
    return response.data[0]
```
**Note** : Les méthodes SupabaseService sont déclarées `async` mais le client Python est synchrone. Garder cette convention pour cohérence — ça fonctionne car les appels sont non-bloquants en pratique.

### 3. Backend endpoint
```python
# backend/app/api/v1/endpoints/xxx.py
# - Définir les schemas Pydantic (Request/Response) DANS le fichier endpoint
# - Utiliser CurrentUserID et Supabase depuis deps.py
# - Enregistrer dans router.py
```

### 4. Frontend
```typescript
// 1. Ajouter les types dans types/index.ts
// 2. Ajouter la méthode typée dans lib/api.ts
// 3. Créer la page dans app/(dashboard)/xxx/page.tsx
// 4. Si route protégée, elle l'est déjà via le group (dashboard)
// 5. Utiliser les classes CSS existantes : btn-primary, btn-secondary, card, input
// 6. Utiliser useToast() pour les feedbacks (succès, erreurs)
```

---

## Patterns existants à respecter

### Backend

**Dependency Injection** via `Annotated` :
```python
from app.api.deps import CurrentUserID, Supabase

@router.get("/xxx")
async def get_xxx(user_id: CurrentUserID, supabase: Supabase):
    ...
```

**Erreurs** — Utiliser les classes de `core/errors.py`, jamais `raise HTTPException` directement :
```python
from app.core.errors import NotFoundError, QuotaExceededError, ValidationError
raise NotFoundError("Report")  # → 404 JSON structuré
```

**Classes d'erreur disponibles** :
- `ValidationError(message, details?)` → 400
- `AuthenticationError(message?)` → 401
- `AuthorizationError(message?)` → 403
- `NotFoundError(resource?)` → 404
- `QuotaExceededError(limit, plan)` → 403
- `ScrapingError(message, details?)` → 400
- `AnalysisError(message, details?)` → 500
- `RateLimitError(retry_after?)` → 429
- `StripeError(message, details?)` → 400

**Logging** — structlog, event-based :
```python
from app.core.logging import get_logger
logger = get_logger(__name__)
logger.info("analysis_created", analysis_id=id, user_id=uid)  # key=value, pas de phrases
```

**Réponse API** — Format standard :
```python
# Succès
{"success": True, "data": {...}, "meta": {"limit": 20, "offset": 0, "total": 100}}

# Erreur
{"success": False, "error": {"code": "QUOTA_EXCEEDED", "message": "...", "details": {...}}}
```

**Tasks Celery** — async wrapper pattern :
```python
@celery_app.task(bind=True, max_retries=2, ...)
def my_task(self, arg: str) -> Dict:
    return asyncio.run(_my_task_async(self, arg))

async def _my_task_async(task, arg: str) -> Dict:
    # Logique async ici
```

### Frontend

**Auth** — Le hook `useAuth()` gère tout :
```typescript
const { user, session, loading, signIn, signUp, signInWithGoogle, signOut } = useAuth();
```

**Supabase client** — Deux factories, même nom :
```typescript
import { createClient } from '@/lib/supabase/client';  // Browser (client components)
import { createClient } from '@/lib/supabase/server';  // Server (server components, RSC)
```

**API calls** — Deux patterns coexistent (à terme, tout migrer vers `apiClient`) :
```typescript
// Pattern 1 : ApiClient (lib/api.ts) — préféré pour les nouvelles features
import { apiClient } from '@/lib/api';
apiClient.setAccessToken(session.access_token);
const result = await apiClient.createAnalysis(url);

// Pattern 2 : fetch direct (utilisé dans analyze/page.tsx) — legacy
const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/...`, {
  headers: { Authorization: `Bearer ${token}` },
});
```

**Toast notifications** — Hook `useToast()` :
```typescript
import { useToast } from '@/hooks/use-toast';

const { toast } = useToast();
toast({ type: 'success', message: 'Changes saved!' });
toast({ type: 'error', message: 'Something went wrong.' });
```

**CSS classes utilitaires** définies dans `globals.css` :
- `btn-primary` — Bouton bleu principal
- `btn-secondary` — Bouton gris secondaire
- `input` — Input standard
- `card` — Carte blanche avec ombre
- `severity-critical` / `severity-warning` / `severity-info` — Badges de sévérité

**Couleurs** — Palette `primary` = blue scale dans `tailwind.config.ts` (primary-50 à primary-950).

---

## Règles métier

### Plans et quotas

| Plan | Prix | Analyses/mois | Code dans config.py |
|------|------|---------------|---------------------|
| free | 0€ | 3 | `QUOTA_FREE=3` |
| pro | 29€/mois | 50 | `QUOTA_PRO=50` |
| agency | 99€/mois | 200 | `QUOTA_AGENCY=200` |

Le quota est géré par `profiles.analyses_used` / `profiles.analyses_limit`. Reset mensuel via `analyses_reset_at`. La fonction RPC `use_analysis_quota()` gère le check + incrément atomique. La fonction `increment_analyses_used()` fait un simple incrément.

### Flow d'analyse complet

```
User soumet URL
    → POST /api/v1/analyses {url}
    → Vérifier quota (analyses_used < analyses_limit)
    → Créer record analyses (status: pending)
    → Incrémenter analyses_used
    → Enqueue Celery task analyze_page_task(analysis_id)
    → Return analysis_id

Frontend poll GET /api/v1/analyses/{id} toutes les secondes

Worker Celery:
    → Fetch analysis record
    → Update status → processing
    → Playwright scrape (HTML + screenshot + metadata)
    → Upload screenshot → Supabase Storage
    → Claude API analyse (prompt structuré → JSON)
    → Parse + validate JSON response
    → Create report record (score, summary, categories, issues)
    → Update status → completed

Frontend détecte completed
    → GET /api/v1/reports/by-analysis/{analysis_id}
    → Redirect vers /reports/{report_id}
```

### 8 catégories d'analyse

headline, cta, social_proof, form, visual_hierarchy, trust, mobile, speed

Chaque catégorie a un score 0-100 et une liste d'issues avec severity: critical | warning | info.

### Stripe billing flow

```
User clique "Upgrade" sur /pricing
    → POST /api/v1/billing/checkout {price_id: "price_pro_monthly"}
    → Backend crée/récupère Stripe Customer
    → Crée Checkout Session
    → Return URL → redirect user

Stripe webhook POST /api/v1/webhooks/stripe
    → checkout.session.completed → update plan + create subscription
    → customer.subscription.updated → update plan
    → customer.subscription.deleted → downgrade to free
    → invoice.payment_succeeded → reset analyses_used
    → invoice.payment_failed → log warning
```

---

## Base de données

### Tables principales

- `profiles` — Extension de auth.users (plan, quota, stripe_customer_id)
- `analyses` — Requêtes d'analyse (url, status: pending/processing/completed/failed)
- `reports` — Résultats (score, summary, categories JSONB, screenshot_url)
- `subscriptions` — Abonnements Stripe (status, period, price)
- `usage_logs` — Audit trail

### Triggers

- `on_auth_user_created` → crée automatiquement le profil
- `profiles_updated_at` / `subscriptions_updated_at` → auto-update updated_at

### Fonctions RPC

- `use_analysis_quota(p_user_id)` → check + incrément atomique + reset si nouveau mois
- `upgrade_plan(p_user_id, p_new_plan, p_stripe_customer_id)` → update plan + limit
- `increment_analyses_used(p_user_id)` → simple incrément du compteur

### RLS activé sur toutes les tables

Chaque user ne voit que ses propres données. Le backend utilise `SUPABASE_SERVICE_KEY` qui bypass RLS.

---

## Variables d'environnement

### Backend (.env)

```bash
APP_NAME=LeakDetector
APP_ENV=development          # development | production
APP_DEBUG=true               # true | false
APP_SECRET_KEY=              # Générer avec: openssl rand -hex 32

FRONTEND_URL=http://localhost:3000
BACKEND_URL=http://localhost:8000
CORS_ORIGINS=http://localhost:3000

SUPABASE_URL=https://xxx.supabase.co
SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_KEY=eyJ...    # Service role key (bypass RLS)
SUPABASE_JWT_SECRET=            # Dashboard → Settings → API → JWT Secret

REDIS_URL=redis://localhost:6379/0

ANTHROPIC_API_KEY=sk-ant-...
ANTHROPIC_MODEL=claude-sonnet-4-5-20250929

STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_PRO_MONTHLY=price_...
STRIPE_PRICE_AGENCY_MONTHLY=price_...

SENTRY_DSN=                  # Optionnel en dev

PLAYWRIGHT_TIMEOUT=30000     # ms
```

### Frontend (.env.local)

```bash
NEXT_PUBLIC_APP_NAME=LeakDetector
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
```

---

## Commandes

### Backend

```bash
cd backend
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
playwright install chromium --with-deps

# Serveur API
uvicorn app.main:app --reload --port 8000

# Worker Celery
celery -A app.workers.celery worker --loglevel=info --queues=analysis

# Tests
pytest --cov=app
```

### Frontend

```bash
cd frontend
npm install
npm run dev          # http://localhost:3000
npm run build        # Build production
npm run lint
```

---

## Interdictions

1. **Pas de secrets dans le code** — Variables d'environnement uniquement
2. **Pas de `any` en TypeScript** — Typer explicitement (sauf parsing JSON Supabase)
3. **Pas de `raise HTTPException` dans les endpoints** — Utiliser les classes AppError
4. **Pas de scraping sans timeout** — Max 30s (PLAYWRIGHT_TIMEOUT)
5. **Pas d'analyse sans check quota** — Toujours vérifier avant d'enqueue
6. **Pas de logs avec PII** — Logger url_domain, pas l'URL complète. Pas d'emails dans les logs.
7. **Pas de commit de .env** — Gitignore strict
8. **Pas de fichiers de schemas séparés** — Les schemas Pydantic sont définis dans chaque fichier endpoint (convention actuelle)
9. **Pas de migration auto** — SQL manuel versionné (voir docs/MIGRATIONS.md)
10. **Pas de librairie UI externe** — Composants custom uniquement (pas de shadcn, radix, etc.)

---

## Docs de référence

| Doc | Quand la lire |
|-----|---------------|
| `context.md` | Pour comprendre le "pourquoi" business |
| `docs/TASKS.md` | **LIRE EN PREMIER** — Tâches de production à exécuter |
| `docs/SPEC.md` | Avant d'implémenter une feature |
| `docs/ARCH.md` | Pour comprendre l'architecture globale |
| `docs/API.md` | Pour les contrats d'API |
| `docs/ERRORS.md` | Pour ajouter un nouveau code d'erreur |
| `docs/UI.md` | Pour le design system (couleurs, composants) |
| `docs/COPY.md` | Pour tous les textes de l'application |
| `docs/SECURITY.md` | Avant de toucher à l'auth ou aux données |
| `docs/DEPLOY.md` | Pour déployer en prod/staging |
| `docs/ROADMAP.md` | Pour les prochaines features planifiées |

---

## Workflow

### Avant d'écrire du code

1. Lire cette CLAUDE.md (déjà fait)
2. Lire `docs/TASKS.md` pour les tâches en cours
3. Si feature : lire `docs/SPEC.md` + `docs/ROADMAP.md`
4. Si bug : identifier le fichier exact dans la structure ci-dessus
5. Si ambiguïté : demander clarification

### Pendant le code

1. Respecter les patterns existants (voir section "Patterns existants")
2. Type hints Python, types TypeScript — toujours
3. Error handling explicite — jamais de try/except vide
4. Logger les événements importants en key=value
5. Utiliser les classes AppError, JAMAIS HTTPException

### Après le code

1. Cocher la tâche dans `docs/TASKS.md`
2. Mettre à jour `docs/CHANGELOG.md` pour les features significatives
3. Vérifier que les tests passent si pertinent

---

## Owner

- **Projet** : Alti (AltiDigitech)
- **Repo** : github.com/altidigitech-ui/leak-detector
- **Templates** : github.com/altidigitech-ui/saas-templates
