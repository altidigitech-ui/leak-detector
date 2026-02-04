# Documentation API — Leak Detector

> Référence complète de l'API REST.

---

## Base URL

| Environnement | URL |
|----------------|-----|
| Production | `https://api.leakdetector.tech/api/v1` |
| Staging | `https://api-staging.leakdetector.tech/api/v1` |
| Local | `http://localhost:8000/api/v1` |

---

## Authentification

Toutes les requêtes authentifiées nécessitent un Bearer token Supabase.
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
```

Le token est obtenu via Supabase Auth (login email/password ou OAuth).

---

## Format de Réponse

### Succès
```json
{
  "success": true,
  "data": { ... }
}
```

### Succès avec pagination
```json
{
  "success": true,
  "data": [ ... ],
  "meta": {
    "limit": 20,
    "offset": 0,
    "total": 42
  }
}
```

### Erreur
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable message",
    "details": { ... }
  }
}
```

---

## Endpoints

### Health

#### GET /health

Status du service. Pas d'authentification requise.

**Response 200**
```json
{
  "status": "healthy",
  "service": "leak-detector-api"
}
```

### Analyses

#### POST /analyses

Créer une nouvelle analyse. Authentification requise. Vérifie le quota.

**Request**
```json
{
  "url": "https://example.com/landing"
}
```

**Response 201**
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

**Erreurs possibles**

| Code | HTTP | Cause |
|------|------|-------|
| VALIDATION_ERROR | 400 | URL invalide |
| UNAUTHORIZED | 401 | Token manquant/invalide |
| QUOTA_EXCEEDED | 403 | Limite plan atteinte |
| RATE_LIMITED | 429 | Trop de requêtes |

---

#### GET /analyses

Lister les analyses de l'utilisateur. Authentification requise.

<!-- TODO: implémenter filtre par status -->

**Query Parameters**

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| limit | int | 20 | Nombre de résultats (max 100) |
| offset | int | 0 | Décalage pour la pagination |

**Request**
```
GET /analyses?limit=10&offset=0
```

**Response 200**
```json
{
  "success": true,
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "url": "https://example.com/landing",
      "status": "completed",
      "created_at": "2026-02-02T10:00:00Z",
      "completed_at": "2026-02-02T10:00:32Z"
    }
  ],
  "meta": {
    "limit": 10,
    "offset": 0,
    "total": 15
  }
}
```

---

#### GET /analyses/{id}

Récupérer une analyse spécifique. Utilisé pour le polling pendant le processing.

**Response 200 (pending)**
```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "url": "https://example.com/landing",
    "status": "pending",
    "created_at": "2026-02-02T10:00:00Z",
    "completed_at": null,
    "error_code": null,
    "report_id": null
  }
}
```

**Response 200 (completed)**
```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "url": "https://example.com/landing",
    "status": "completed",
    "created_at": "2026-02-02T10:00:00Z",
    "completed_at": "2026-02-02T10:00:32Z",
    "error_code": null,
    "report_id": "660e8400-e29b-41d4-a716-446655440000"
  }
}
```

**Response 200 (failed)**
```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "url": "https://example.com/landing",
    "status": "failed",
    "created_at": "2026-02-02T10:00:00Z",
    "completed_at": "2026-02-02T10:00:15Z",
    "error_code": "PAGE_TIMEOUT",
    "report_id": null
  }
}
```

**Status possibles**

| Status | Description |
|--------|-------------|
| pending | En attente dans la queue |
| processing | Scraping ou analyse en cours |
| completed | Terminé avec succès |
| failed | Échoué |

**Polling recommandé**
- Intervalle : 2 secondes
- Timeout : 60 secondes
- Arrêter quand status = `completed` ou `failed`

---

### Reports

#### GET /reports

Lister les rapports de l'utilisateur.

**Query Parameters**

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| limit | int | 20 | Nombre de résultats |
| offset | int | 0 | Décalage pour la pagination |

**Response 200**
```json
{
  "success": true,
  "data": [
    {
      "id": "660e8400-e29b-41d4-a716-446655440000",
      "analysis_id": "550e8400-e29b-41d4-a716-446655440000",
      "url": "https://example.com/landing",
      "score": 72,
      "summary": "Good foundation with 3 critical issues to address.",
      "created_at": "2026-02-02T10:00:32Z"
    }
  ],
  "meta": {
    "limit": 20,
    "offset": 0,
    "total": 8
  }
}
```

---

#### GET /reports/{id}

Récupérer un rapport complet avec catégories et issues.

**Response 200**
```json
{
  "success": true,
  "data": {
    "id": "660e8400-e29b-41d4-a716-446655440000",
    "analysis_id": "550e8400-e29b-41d4-a716-446655440000",
    "url": "https://example.com/landing",
    "score": 72,
    "summary": "Good foundation with 3 critical issues to address.",
    "screenshot_url": "https://xxx.supabase.co/storage/v1/...",
    "created_at": "2026-02-02T10:00:32Z",
    "categories": [
      {
        "name": "headline",
        "label": "Headline",
        "score": 85,
        "issues": []
      },
      {
        "name": "cta",
        "label": "Call-to-Action",
        "score": 45,
        "issues": [
          {
            "severity": "critical",
            "title": "Low contrast CTA button",
            "description": "The main call-to-action button has insufficient contrast against the background, making it hard to notice.",
            "recommendation": "Use a high-contrast color like #2563EB on white background. Make the button at least 48px tall with clear padding."
          },
          {
            "severity": "warning",
            "title": "Generic CTA text",
            "description": "The button text 'Submit' doesn't communicate value.",
            "recommendation": "Use action-oriented text that communicates the benefit, e.g., 'Get My Free Report' instead of 'Submit'."
          }
        ]
      },
      {
        "name": "social_proof",
        "label": "Social Proof",
        "score": 30,
        "issues": [
          {
            "severity": "critical",
            "title": "No social proof elements",
            "description": "The page lacks testimonials, reviews, logos, or any form of social validation.",
            "recommendation": "Add at least 2-3 customer testimonials with real names and photos. Include client logos if applicable."
          }
        ]
      },
      {
        "name": "form",
        "label": "Form",
        "score": 90,
        "issues": []
      },
      {
        "name": "visual_hierarchy",
        "label": "Visual Hierarchy",
        "score": 75,
        "issues": [
          {
            "severity": "info",
            "title": "Consider larger headline font",
            "description": "The headline could benefit from increased font size to establish stronger hierarchy.",
            "recommendation": "Increase headline to 48-64px for desktop to create a clear visual entry point."
          }
        ]
      },
      {
        "name": "trust",
        "label": "Trust",
        "score": 80,
        "issues": []
      },
      {
        "name": "mobile",
        "label": "Mobile",
        "score": 70,
        "issues": [
          {
            "severity": "warning",
            "title": "Touch targets too small",
            "description": "Some interactive elements are smaller than the recommended 44x44px minimum.",
            "recommendation": "Ensure all buttons and links have a minimum touch target of 44x44px on mobile."
          }
        ]
      },
      {
        "name": "speed",
        "label": "Speed",
        "score": 65,
        "issues": [
          {
            "severity": "warning",
            "title": "Large unoptimized images",
            "description": "Several images are not optimized and contribute to slow load times.",
            "recommendation": "Convert images to WebP format, add lazy loading, and serve responsive sizes."
          }
        ]
      }
    ]
  }
}
```

---

#### GET /reports/by-analysis/{analysis_id}

Récupérer un rapport via l'ID de l'analyse. Utile après le polling de l'analyse.

**Response 200**
```json
{
  "success": true,
  "data": {
    "id": "660e8400-e29b-41d4-a716-446655440000",
    "analysis_id": "550e8400-e29b-41d4-a716-446655440000",
    "url": "https://example.com/landing",
    "score": 72,
    "summary": "Good foundation with 3 critical issues to address.",
    "screenshot_url": "https://xxx.supabase.co/storage/v1/...",
    "created_at": "2026-02-02T10:00:32Z",
    "categories": [
      {
        "name": "headline",
        "label": "Headline",
        "score": 85,
        "issues": []
      },
      {
        "name": "cta",
        "label": "Call-to-Action",
        "score": 45,
        "issues": [
          {
            "severity": "critical",
            "title": "Low contrast CTA button",
            "description": "The main call-to-action button has insufficient contrast against the background.",
            "recommendation": "Use a high-contrast color like #2563EB on white background."
          }
        ]
      }
    ],
    "page_metadata": {
      "title": "Example Landing Page",
      "load_time_ms": 2340,
      "word_count": 450,
      "image_count": 6
    }
  }
}
```

**Response 404**
```json
{
  "success": false,
  "error": {
    "code": "NOT_FOUND",
    "message": "Report not found"
  }
}
```

---

### Billing

#### POST /billing/checkout

Créer une session Stripe Checkout. Redirige vers Stripe.

**Request**
```json
{
  "price_id": "price_xxx"
}
```

**Response 200**
```json
{
  "success": true,
  "data": {
    "checkout_url": "https://checkout.stripe.com/c/pay/cs_xxx"
  }
}
```

---

#### POST /billing/portal

Créer une session Stripe Customer Portal.

**Response 200**
```json
{
  "success": true,
  "data": {
    "portal_url": "https://billing.stripe.com/p/session/xxx"
  }
}
```

**Erreurs possibles**

| Code | HTTP | Cause |
|------|------|-------|
| SUBSCRIPTION_NOT_FOUND | 404 | Pas de customer Stripe |

---

#### GET /billing/status

Récupérer le status billing de l'utilisateur.

**Response 200**
```json
{
  "success": true,
  "data": {
    "plan": "pro",
    "status": "active",
    "analyses_used": 12,
    "analyses_limit": 50,
    "current_period_end": "2026-03-02T10:00:00Z"
  }
}
```

---

### Webhooks

#### POST /webhooks/stripe

Endpoint pour les webhooks Stripe. Pas d'authentification Bearer, vérifié par signature Stripe.

**Headers requis**
```
stripe-signature: t=xxx,v1=xxx
```

**Events traités**

| Event | Action |
|-------|--------|
| checkout.session.completed | Créer/update subscription |
| customer.subscription.created | Activer plan |
| customer.subscription.updated | Mettre à jour plan |
| customer.subscription.deleted | Downgrade à free |
| invoice.payment_succeeded | Logger paiement |
| invoice.payment_failed | Notifier user |

**Response 200**
```json
{
  "received": true
}
```

---

## Rate Limiting

| Endpoint | Limite | Fenêtre |
|----------|--------|---------|
| POST /analyses | 10 req | 1 minute |
| GET /* | 60 req | 1 minute |
| POST /billing/* | 5 req | 1 minute |
| POST /webhooks/* | 100 req | 1 minute |

Headers de réponse :
```
X-RateLimit-Limit: 60
X-RateLimit-Remaining: 45
X-RateLimit-Reset: 1706868000
```

Quand limité :
```
HTTP 429 Too Many Requests
Retry-After: 30
```

---

## SDK / Client Example

### JavaScript/TypeScript
```typescript
class LeakDetectorAPI {
  private baseUrl: string;
  private token: string;

  constructor(baseUrl: string, token: string) {
    this.baseUrl = baseUrl;
    this.token = token;
  }

  private async request(path: string, options: RequestInit = {}) {
    const response = await fetch(`${this.baseUrl}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.token}`,
        ...options.headers,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      throw new ApiError(data.error.code, data.error.message);
    }

    return data;
  }

  // Analyses
  async createAnalysis(url: string) {
    return this.request('/analyses', {
      method: 'POST',
      body: JSON.stringify({ url }),
    });
  }

  async getAnalysis(id: string) {
    return this.request(`/analyses/${id}`);
  }

  async listAnalyses(limit = 20, offset = 0) {
    return this.request(`/analyses?limit=${limit}&offset=${offset}`);
  }

  // Reports
  async getReport(id: string) {
    return this.request(`/reports/${id}`);
  }

  async listReports(limit = 20, offset = 0) {
    return this.request(`/reports?limit=${limit}&offset=${offset}`);
  }

  // Polling helper
  async waitForAnalysis(id: string, timeoutMs = 60000): Promise<any> {
    const start = Date.now();
    
    while (Date.now() - start < timeoutMs) {
      const result = await this.getAnalysis(id);
      const status = result.data.status;
      
      if (status === 'completed') return result;
      if (status === 'failed') throw new Error(result.data.error_code);
      
      await new Promise(r => setTimeout(r, 2000));
    }
    
    throw new Error('Analysis timeout');
  }
}

// Usage
const api = new LeakDetectorAPI(
  'https://api.leakdetector.tech/api/v1',
  'eyJ...'
);

const analysis = await api.createAnalysis('https://example.com');
const result = await api.waitForAnalysis(analysis.data.id);
const report = await api.getReport(result.data.report_id);
```

### cURL
```bash
# Créer une analyse
curl -X POST https://api.leakdetector.tech/api/v1/analyses \
  -H "Authorization: Bearer eyJ..." \
  -H "Content-Type: application/json" \
  -d '{"url": "https://example.com"}'

# Vérifier le status
curl https://api.leakdetector.tech/api/v1/analyses/550e8400... \
  -H "Authorization: Bearer eyJ..."

# Récupérer le rapport
curl https://api.leakdetector.tech/api/v1/reports/660e8400... \
  -H "Authorization: Bearer eyJ..."
```

---

## Changelog API

| Version | Date | Changements |
|---------|------|-------------|
| v1 | 2026-02-02 | Release initiale |
