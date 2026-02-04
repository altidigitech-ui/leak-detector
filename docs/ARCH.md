# Architecture Technique — Leak Detector

> Architecture système, schéma de base de données, et décisions techniques.

---

## Vue d'ensemble

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                  CLIENTS                                     │
│                    Browser / Mobile (Next.js Frontend)                       │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      │ HTTPS
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                               VERCEL (Frontend)                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                         Next.js 14 (App Router)                      │   │
│  │  • SSR/SSG pages                                                     │   │
│  │  • API routes (auth callbacks)                                       │   │
│  │  • Middleware (auth protection)                                      │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
                    │                                    │
                    │ REST API                           │ Direct Auth
                    ▼                                    ▼
┌────────────────────────────────┐    ┌────────────────────────────────────────┐
│       RAILWAY (Backend)        │    │              SUPABASE                   │
│  ┌──────────────────────────┐ │    │  ┌──────────────────────────────────┐  │
│  │      FastAPI Server      │ │    │  │           Auth (GoTrue)          │  │
│  │  • /api/v1/analyses      │ │    │  │  • Email/password                │  │
│  │  • /api/v1/reports       │ │    │  │  • Google OAuth                  │  │
│  │  • /api/v1/billing       │ │    │  │  • Magic links                   │  │
│  │  • /webhooks/stripe      │ │    │  └──────────────────────────────────┘  │
│  └──────────────────────────┘ │    │  ┌──────────────────────────────────┐  │
│              │                │    │  │         PostgreSQL               │  │
│              │ Enqueue        │    │  │  • profiles                      │  │
│              ▼                │    │  │  • analyses                      │  │
│  ┌──────────────────────────┐ │    │  │  • reports                       │  │
│  │     Celery Workers       │ │    │  │  • subscriptions                 │  │
│  │  • analyze_page task     │ │    │  └──────────────────────────────────┘  │
│  │  • Playwright scraping   │ │    │  ┌──────────────────────────────────┐  │
│  │  • Claude API analysis   │ │    │  │           Storage                │  │
│  └──────────────────────────┘ │    │  │  • Screenshots                   │  │
│              │                │    │  │  • PDF exports                   │  │
│              │                │    │  └──────────────────────────────────┘  │
│  ┌──────────────────────────┐ │    └────────────────────────────────────────┘
│  │         Redis            │ │                      ▲
│  │  • Task queue            │ │                      │
│  │  • Rate limiting         │ │                      │ DB Read/Write
│  │  • Cache                 │ │──────────────────────┘
│  └──────────────────────────┘ │
└────────────────────────────────┘
                    │
                    │ API Calls
                    ▼
┌────────────────────────────────┐    ┌────────────────────────────────────────┐
│         ANTHROPIC API          │    │              STRIPE                     │
│  • Claude 3.5 Sonnet           │    │  • Checkout Sessions                   │
│  • Analysis prompts            │    │  • Customer Portal                     │
│  • ~4k tokens/analysis         │    │  • Webhooks                            │
└────────────────────────────────┘    └────────────────────────────────────────┘
```

---

## Schéma de Base de Données

### Diagramme ERD

```
┌──────────────────────┐       ┌──────────────────────┐
│    auth.users        │       │      profiles        │
│    (Supabase)        │       │                      │
├──────────────────────┤       ├──────────────────────┤
│ id (uuid) PK         │──────▶│ id (uuid) PK/FK      │
│ email                │       │ email                │
│ created_at           │       │ full_name            │
│ ...                  │       │ avatar_url           │
└──────────────────────┘       │ plan                 │
                               │ stripe_customer_id   │
                               │ analyses_used        │
                               │ analyses_limit       │
                               │ created_at           │
                               │ updated_at           │
                               └──────────┬───────────┘
                                          │
                    ┌─────────────────────┼─────────────────────┐
                    │                     │                     │
                    ▼                     ▼                     ▼
┌──────────────────────┐  ┌──────────────────────┐  ┌──────────────────────┐
│     analyses         │  │    subscriptions     │  │   usage_logs         │
├──────────────────────┤  ├──────────────────────┤  ├──────────────────────┤
│ id (uuid) PK         │  │ id (uuid) PK         │  │ id (uuid) PK         │
│ user_id (uuid) FK    │  │ user_id (uuid) FK    │  │ user_id (uuid) FK    │
│ url                  │  │ stripe_subscription_id│  │ action               │
│ status               │  │ stripe_price_id      │  │ metadata             │
│ error_code           │  │ status               │  │ created_at           │
│ error_message        │  │ current_period_start │  └──────────────────────┘
│ created_at           │  │ current_period_end   │
│ completed_at         │  │ cancel_at            │
└──────────┬───────────┘  │ created_at           │
           │              │ updated_at           │
           ▼              └──────────────────────┘
┌──────────────────────┐
│      reports         │
├──────────────────────┤
│ id (uuid) PK         │
│ analysis_id (uuid) FK│
│ score                │
│ summary              │
│ categories (jsonb)   │
│ issues (jsonb)       │
│ screenshot_url       │
│ page_metadata (jsonb)│
│ created_at           │
└──────────────────────┘
```

---

## API Endpoints

### Analyses

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/api/v1/analyses` | Créer une analyse | Required |
| GET | `/api/v1/analyses` | Liste mes analyses | Required |
| GET | `/api/v1/analyses/{id}` | Détail + status | Required |

#### POST /api/v1/analyses

**Request:**
```json
{
  "url": "https://example.com/landing"
}
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "url": "https://example.com/landing",
    "status": "pending",
    "created_at": "2026-02-02T10:00:00Z"
  }
}
```

**Errors:**
- `400 INVALID_URL` - URL malformée
- `403 QUOTA_EXCEEDED` - Limite atteinte
- `429 RATE_LIMITED` - Trop de requêtes

### Reports

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/v1/reports/{id}` | Récupérer un rapport | Required |
| GET | `/api/v1/reports/{id}/pdf` | Export PDF | Pro+ |

#### GET /api/v1/reports/{id}

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "report-uuid",
    "analysis_id": "analysis-uuid",
    "score": 72,
    "summary": "Votre landing page a un bon potentiel mais présente 3 problèmes critiques...",
    "categories": [
      {
        "name": "headline",
        "label": "Titre principal",
        "score": 85,
        "issues": [
          {
            "severity": "warning",
            "title": "Titre un peu long",
            "description": "Votre titre fait 15 mots, idéalement moins de 10.",
            "recommendation": "Condensez votre proposition de valeur en une phrase percutante."
          }
        ]
      },
      {
        "name": "cta",
        "label": "Call-to-Action",
        "score": 60,
        "issues": [
          {
            "severity": "critical",
            "title": "CTA peu visible",
            "description": "Le contraste de votre bouton est insuffisant.",
            "recommendation": "Utilisez une couleur qui contraste davantage avec le fond."
          }
        ]
      }
    ],
    "screenshot_url": "https://storage.supabase.co/...",
    "page_metadata": {
      "title": "Example Landing",
      "load_time_ms": 2340,
      "word_count": 450
    },
    "created_at": "2026-02-02T10:00:30Z"
  }
}
```

### Billing

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/api/v1/billing/checkout` | Créer session Stripe | Required |
| POST | `/api/v1/billing/portal` | URL Customer Portal | Required |
| GET | `/api/v1/billing/status` | Status abonnement | Required |

### Webhooks

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/webhooks/stripe` | Events Stripe | Signature |

---

## Celery Tasks

### analyze_page

```python
@celery_app.task(
    bind=True,
    max_retries=2,
    default_retry_delay=30,
    soft_time_limit=60,
    time_limit=90
)
def analyze_page(self, analysis_id: str) -> dict:
    """
    Task principale d'analyse d'une landing page.
    
    Steps:
    1. Récupérer l'analyse depuis DB
    2. Scrape la page (Playwright)
    3. Capture screenshot
    4. Upload screenshot vers Supabase Storage
    5. Analyse via Claude API
    6. Parse le résultat
    7. Créer le rapport en DB
    8. Update status analyse
    
    Retries:
    - Network errors: retry
    - Timeout: retry
    - Claude API error: retry
    - Parsing error: fail (pas de retry)
    """
    pass
```

### Flow d'exécution

```
┌─────────────────────────────────────────────────────────────────┐
│                     CELERY WORKER                                │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  1. FETCH ANALYSIS                                               │
│     └─ SELECT * FROM analyses WHERE id = ?                       │
│     └─ UPDATE status = 'processing', started_at = now()          │
│                                                                  │
│  2. SCRAPE PAGE                                                  │
│     └─ Playwright: launch browser                                │
│     └─ Navigate to URL (timeout: 30s)                            │
│     └─ Wait for network idle                                     │
│     └─ Extract: HTML, title, meta, text content                  │
│     └─ Screenshot: full page (viewport 1280x800)                 │
│                                                                  │
│  3. UPLOAD SCREENSHOT                                            │
│     └─ Supabase Storage: screenshots/{analysis_id}.png           │
│     └─ Get public URL                                            │
│                                                                  │
│  4. ANALYZE WITH CLAUDE                                          │
│     └─ Build prompt with HTML + metadata                         │
│     └─ Call Claude API (Sonnet, ~4k tokens)                      │
│     └─ Parse JSON response                                       │
│                                                                  │
│  5. SAVE REPORT                                                  │
│     └─ INSERT INTO reports (...)                                 │
│     └─ UPDATE analyses SET status = 'completed'                  │
│                                                                  │
│  ERROR HANDLING                                                  │
│     └─ ScrapingError → retry (max 2)                             │
│     └─ TimeoutError → retry (max 2)                              │
│     └─ ClaudeAPIError → retry (max 2)                            │
│     └─ ParsingError → fail immediately                           │
│     └─ All retries exhausted → status = 'failed'                 │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Sécurité

### Authentication Flow

```
┌──────────┐      ┌──────────┐      ┌──────────┐
│ Frontend │      │ Supabase │      │ Backend  │
└────┬─────┘      └────┬─────┘      └────┬─────┘
     │                 │                 │
     │ 1. Login        │                 │
     │────────────────▶│                 │
     │                 │                 │
     │ 2. JWT Token    │                 │
     │◀────────────────│                 │
     │                 │                 │
     │ 3. API Request + Bearer Token     │
     │──────────────────────────────────▶│
     │                 │                 │
     │                 │ 4. Verify JWT   │
     │                 │◀────────────────│
     │                 │                 │
     │                 │ 5. User data    │
     │                 │────────────────▶│
     │                 │                 │
     │ 6. Response     │                 │
     │◀──────────────────────────────────│
```

### Security Headers

```python
# FastAPI middleware
SECURITY_HEADERS = {
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "X-XSS-Protection": "1; mode=block",
    "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
    "Content-Security-Policy": "default-src 'self'",
}
```

### Rate Limiting

| Endpoint | Limit | Window |
|----------|-------|--------|
| POST /analyses | 10 | 1 minute |
| GET /reports | 60 | 1 minute |
| POST /billing/* | 5 | 1 minute |
| Webhooks | 100 | 1 minute |

---

## Monitoring & Observability

### Logging

```python
# Format structuré
{
    "timestamp": "2026-02-02T10:00:00Z",
    "level": "INFO",
    "service": "leak-detector-api",
    "trace_id": "abc123",
    "user_id": "user-uuid",  # anonymisé si nécessaire
    "action": "analysis_created",
    "metadata": {
        "analysis_id": "...",
        "url_domain": "example.com"  # pas l'URL complète
    }
}
```

### Métriques clés

| Métrique | Type | Description |
|----------|------|-------------|
| `analyses_total` | Counter | Total analyses créées |
| `analyses_completed` | Counter | Analyses terminées |
| `analyses_failed` | Counter | Analyses échouées |
| `analysis_duration_seconds` | Histogram | Durée d'analyse |
| `scraping_duration_seconds` | Histogram | Durée de scraping |
| `claude_api_duration_seconds` | Histogram | Durée appel Claude |
| `active_subscriptions` | Gauge | Abonnements actifs |

### Alertes

| Alerte | Condition | Sévérité |
|--------|-----------|----------|
| High error rate | >10% failed in 5min | Critical |
| Slow analyses | p95 > 45s | Warning |
| Claude API errors | >5 in 1min | Critical |
| Queue backlog | >100 pending | Warning |

---

## Environnements

| Env | Frontend | Backend | Database |
|-----|----------|---------|----------|
| Development | localhost:3000 | localhost:8000 | Supabase local |
| Staging | staging.leakdetector.tech | api-staging.leakdetector.tech | Supabase staging |
| Production | leakdetector.tech | api.leakdetector.tech | Supabase prod |

### Feature Flags

| Flag | Description | Default |
|------|-------------|---------|
| `pdf_export` | Export PDF actif | true |
| `google_oauth` | Google login actif | true |
| `agency_plan` | Plan Agency visible | false |
| `api_access` | API publique | false |
