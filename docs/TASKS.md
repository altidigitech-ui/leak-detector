# TASKS.md — Production Hardening

> **Objectif** : Amener Leak Detector à un état production-ready.
> **Langue du site** : 100% Anglais
> **Exécuter dans l'ordre** : Bloc A → B → C → D
> **Après chaque bloc** : cocher les tâches terminées

---

## BLOC A — Sécurité & Stabilité

> ⚠️ BLOQUANT pour la mise en production. Ne pas skip.

---

### A1. ✅ Vérification JWT avec signature
**Fichiers** : `backend/app/config.py`, `backend/app/core/security.py`

**Problème** : `security.py` ligne 37-39 decode le JWT sans vérifier la signature (`verify_signature: False`). N'importe qui peut forger un token.

**Étape 1 — config.py** : Ajouter `SUPABASE_JWT_SECRET` aux Settings.

```python
# Dans la classe Settings, section Supabase, après SUPABASE_SERVICE_KEY :
SUPABASE_JWT_SECRET: str  # Requis — Supabase Dashboard → Settings → API → JWT Secret
```

**Étape 2 — security.py** : Réécrire `verify_supabase_token()` avec vérification complète.

Remplacer toute la fonction `verify_supabase_token` par :
```python
def verify_supabase_token(token: str) -> dict:
    """
    Verify a Supabase JWT token with signature validation.
    
    Validates: signature (HS256), expiration, issuer.
    """
    try:
        payload = jwt.decode(
            token,
            settings.SUPABASE_JWT_SECRET,
            algorithms=["HS256"],
            audience="authenticated",
            options={
                "verify_exp": True,
                "verify_aud": True,
            },
        )
        return payload
    except jwt.ExpiredSignatureError:
        raise AuthenticationError("Token has expired")
    except jwt.JWTClaimsError:
        raise AuthenticationError("Invalid token claims")
    except JWTError as e:
        raise AuthenticationError(f"Invalid token: {str(e)}")
```

**Étape 3** : Supprimer les commentaires "For now" et "In production" de l'ancien code.

**Vérification** : Le token doit être rejeté si `SUPABASE_JWT_SECRET` est incorrect.

---

### A2. ✅ Rate Limiting
**Fichiers** : `backend/requirements.txt`, `backend/app/main.py`, `backend/app/api/v1/endpoints/analyses.py`, `backend/app/api/v1/endpoints/billing.py`

**Étape 1 — requirements.txt** : Ajouter la dépendance.
```
slowapi==0.1.9
```

**Étape 2 — main.py** : Intégrer SlowAPI.

Ajouter ces imports en haut :
```python
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
```

Créer le limiter AVANT la création de l'app :
```python
limiter = Limiter(key_func=get_remote_address, default_limits=["60/minute"])
```

Après la création de `app`, ajouter :
```python
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
```

**Étape 3 — analyses.py** : Ajouter le rate limit sur le POST.

Import :
```python
from slowapi import Limiter
from fastapi import Request
```

Sur le endpoint `create_analysis`, ajouter le paramètre `request: Request` et le décorateur :
```python
from app.main import limiter

@router.post("", response_model=SingleAnalysisResponse, status_code=status.HTTP_201_CREATED)
@limiter.limit("10/minute")
async def create_analysis(
    request: Request,  # ← Requis par SlowAPI
    body: CreateAnalysisRequest,  # ← Renommer 'request' en 'body' pour éviter le conflit
    user_id: CurrentUserID,
    supabase: Supabase,
):
```

**Important** : Le paramètre `request: Request` DOIT être le premier paramètre de la fonction pour que SlowAPI fonctionne. Le paramètre Pydantic précédemment nommé `request` doit être renommé en `body` pour éviter le conflit.

**Étape 4 — billing.py** : Ajouter le rate limit sur checkout et portal.

Même pattern : ajouter `request: Request` comme premier paramètre, renommer l'ancien `request` en `body`, et ajouter `@limiter.limit("5/minute")` sur `create_checkout_session` et `create_portal_session`.

**Note sur les webhooks** : Ne PAS ajouter de rate limit sur `/webhooks/stripe` — Stripe gère son propre retry avec backoff exponentiel.

---

### A3. ✅ Fix violations HTTPException → AppError
**Fichiers** : `backend/app/api/v1/endpoints/analyses.py`, `backend/app/api/v1/endpoints/billing.py`, `backend/app/api/v1/endpoints/webhooks.py`, `backend/app/core/security.py`

**analyses.py ligne 92** :
```python
# AVANT :
raise HTTPException(status_code=404, detail="Profile not found")
# APRÈS :
raise NotFoundError("Profile")
```

**billing.py ligne 64** :
```python
# AVANT :
raise HTTPException(status_code=404, detail="Profile not found")
# APRÈS :
raise NotFoundError("Profile")
```

**billing.py ligne 134** (dans `create_portal_session`) :
```python
# AVANT :
raise HTTPException(status_code=404, detail="Profile not found")
# APRÈS :
raise NotFoundError("Profile")
```

**billing.py ligne 164** (dans `get_billing_status`) :
```python
# AVANT :
raise HTTPException(status_code=404, detail="Profile not found")
# APRÈS :
raise NotFoundError("Profile")
```

Ajouter l'import `NotFoundError` en haut de billing.py :
```python
from app.core.errors import StripeError, NotFoundError
```

**webhooks.py lignes 35, 45, 48** : Remplacer les 3 `raise HTTPException` par des `ValidationError` :
```python
from app.core.errors import ValidationError

# Ligne 35 :
# AVANT : raise HTTPException(status_code=400, detail="Missing signature")
# APRÈS : raise ValidationError("Missing webhook signature")

# Ligne 45 :
# AVANT : raise HTTPException(status_code=400, detail="Invalid payload")
# APRÈS : raise ValidationError("Invalid webhook payload")

# Ligne 48 :
# AVANT : raise HTTPException(status_code=400, detail="Invalid signature")
# APRÈS : raise ValidationError("Invalid webhook signature")
```

Supprimer les imports `HTTPException` inutilisés de analyses.py, billing.py et webhooks.py.

**security.py ligne 124** (dans `verify_stripe_webhook_signature`) :
```python
# AVANT :
raise HTTPException(
    status_code=status.HTTP_400_BAD_REQUEST,
    detail="Invalid webhook signature",
)
# APRÈS :
from app.core.errors import ValidationError
raise ValidationError("Invalid webhook signature")
```

Supprimer les imports `HTTPException, status` inutilisés de security.py.

---

### A4. ✅ Fix model string Claude
**Fichier** : `backend/app/config.py`

```python
# Ligne 49
# AVANT :
ANTHROPIC_MODEL: str = "claude-3-5-sonnet-20241022"
# APRÈS :
ANTHROPIC_MODEL: str = "claude-sonnet-4-5-20250929"
```

---

## BLOC B — Code Quality, Types & Tests

---

### B1. ✅ Types TypeScript complets
**Fichiers** : `frontend/src/types/index.ts`, `frontend/src/lib/api.ts`

**Étape 1 — types/index.ts** : Ajouter les types manquants après les types existants.

```typescript
// ============================================================================
// Analysis Types
// ============================================================================

export interface Analysis {
  id: string;
  url: string;
  status: Status;
  error_code: string | null;
  error_message: string | null;
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
}

// ============================================================================
// Report Types
// ============================================================================

export interface ReportIssue {
  severity: 'critical' | 'warning' | 'info';
  title: string;
  description: string;
  recommendation: string;
}

export interface ReportCategory {
  name: string;
  label: string;
  score: number;
  issues: ReportIssue[];
}

export interface PageMetadata {
  title: string | null;
  load_time_ms: number | null;
  word_count: number | null;
  image_count: number | null;
}

export interface Report {
  id: string;
  analysis_id: string;
  url: string;
  score: number;
  summary: string;
  categories: ReportCategory[];
  screenshot_url: string | null;
  page_metadata: PageMetadata | null;
  created_at: string;
}

export interface ReportListItem {
  id: string;
  analysis_id: string;
  url: string;
  score: number;
  summary: string;
  created_at: string;
}

// ============================================================================
// Billing Types
// ============================================================================

export interface SubscriptionInfo {
  status: string;
  current_period_end: string;
}

export interface BillingStatus {
  plan: Plan;
  analyses_used: number;
  analyses_limit: number;
  analyses_reset_at: string;
  stripe_customer_id: string | null;
  subscription: SubscriptionInfo | null;
}
```

**Étape 2 — types/index.ts** : Corriger `PaginationMeta` (le backend envoie `limit/offset/total`, pas `page/total_pages`).

```typescript
// AVANT :
export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  total_pages: number;
}

// APRÈS :
export interface PaginationMeta {
  limit: number;
  offset: number;
  total: number;
}
```

**Étape 3 — api.ts** : Remplacer tous les `any` par les types importés.

```typescript
import type { Analysis, Report, ReportListItem, BillingStatus, PaginationMeta } from '@/types';

// Ligne 9 : details?: Record<string, any>  →  details?: Record<string, unknown>
// Ligne 11 : meta?: Record<string, any>  →  meta?: PaginationMeta

// Méthode listAnalyses :
async listAnalyses(limit = 20, offset = 0) {
  return this.request<Analysis[]>(`/api/v1/analyses?limit=${limit}&offset=${offset}`);
}

// Méthode getReport :
async getReport(id: string) {
  return this.request<Report>(`/api/v1/reports/${id}`);
}

// Méthode getReportByAnalysis :
async getReportByAnalysis(analysisId: string) {
  return this.request<Report>(`/api/v1/reports/by-analysis/${analysisId}`);
}

// Méthode listReports :
async listReports(limit = 20, offset = 0) {
  return this.request<ReportListItem[]>(`/api/v1/reports?limit=${limit}&offset=${offset}`);
}

// Méthode getBillingStatus :
async getBillingStatus() {
  return this.request<BillingStatus>('/api/v1/billing/status');
}
```

**Étape 4** : Dans les pages dashboard qui utilisent `any`, remplacer par les types importés :
- `frontend/src/app/(dashboard)/reports/[id]/page.tsx` : importer `ReportCategory`, `ReportIssue` et typer les variables
- `frontend/src/app/(dashboard)/reports/page.tsx` : importer `ReportListItem`
- `frontend/src/app/(dashboard)/dashboard/page.tsx` : importer `Analysis`

Chercher tous les `any` dans `frontend/src/` et les remplacer.

---

### B2. ✅ Déduplication parsing reports
**Fichier** : `backend/app/api/v1/endpoints/reports.py`

Extraire une fonction helper pour le parsing partagé entre `get_report()` et `get_report_by_analysis()`.

Ajouter cette fonction avant les endpoints :
```python
def _build_report_data(report: dict) -> ReportData:
    """Build ReportData from a raw Supabase report dict. Used by get_report and get_report_by_analysis."""
    categories = []
    for cat in report.get("categories", []):
        categories.append(Category(
            name=cat.get("name", ""),
            label=cat.get("label", cat.get("name", "")),
            score=cat.get("score", 0),
            issues=[
                Issue(
                    severity=issue.get("severity", "info"),
                    title=issue.get("title", ""),
                    description=issue.get("description", ""),
                    recommendation=issue.get("recommendation", ""),
                )
                for issue in cat.get("issues", [])
            ]
        ))

    page_metadata = None
    if report.get("page_metadata"):
        pm = report["page_metadata"]
        page_metadata = PageMetadata(
            title=pm.get("title"),
            load_time_ms=pm.get("load_time_ms"),
            word_count=pm.get("word_count"),
            image_count=pm.get("image_count"),
        )

    url = ""
    if report.get("analyses"):
        url = report["analyses"].get("url", "")

    return ReportData(
        id=report["id"],
        analysis_id=report["analysis_id"],
        url=url,
        score=report["score"],
        summary=report["summary"],
        categories=categories,
        screenshot_url=report.get("screenshot_url"),
        page_metadata=page_metadata,
        created_at=report["created_at"],
    )
```

Puis simplifier les deux endpoints :
```python
@router.get("/{report_id}", response_model=SingleReportResponse)
async def get_report(report_id: str, user_id: CurrentUserID, supabase: Supabase):
    report = await supabase.get_report(report_id, user_id)
    if not report:
        raise NotFoundError("Report")
    return SingleReportResponse(data=_build_report_data(report))


@router.get("/by-analysis/{analysis_id}", response_model=SingleReportResponse)
async def get_report_by_analysis(analysis_id: str, user_id: CurrentUserID, supabase: Supabase):
    report = await supabase.get_report_by_analysis(analysis_id, user_id)
    if not report:
        raise NotFoundError("Report")
    return SingleReportResponse(data=_build_report_data(report))
```

Supprimer l'import `HTTPException` inutilisé de reports.py.

---

### B3. ✅ Cleanup client Supabase (frontend)
**Fichiers** : `frontend/src/app/(dashboard)/analyze/page.tsx`, `frontend/src/app/(dashboard)/settings/page.tsx`

**Problème** : `createClient()` est appelé à chaque itération de polling dans `analyze/page.tsx` et à chaque handler dans `settings/page.tsx`.

**Fix analyze/page.tsx** : Créer le client UNE SEULE FOIS au top du composant.
```typescript
// Au début du composant, après les useState :
const supabase = createClient();

// Puis dans getAccessToken() et partout où createClient() est appelé,
// utiliser simplement `supabase` au lieu de `createClient()`.
```

**Fix settings/page.tsx** : Même pattern — un seul `createClient()` au top du composant, réutilisé partout.

---

### B4. ✅ Tests critiques
**Fichiers à créer** : `backend/tests/test_analyzer.py`, `backend/tests/test_endpoints.py`, `backend/tests/test_webhooks.py`

**test_analyzer.py** — Tester le parsing du cœur du produit :

```python
"""Tests for the analyzer service — JSON parsing and validation."""

import pytest
from app.services.analyzer import parse_analysis_response, calculate_overall_score
from app.core.errors import AnalysisError


# --- Fixtures ---

VALID_RESPONSE = '''{
    "score": 72,
    "summary": "Good page with some issues.",
    "categories": [
        {
            "name": "headline",
            "label": "Headline",
            "score": 85,
            "issues": [
                {
                    "severity": "warning",
                    "title": "Headline too long",
                    "description": "15 words is too many.",
                    "recommendation": "Shorten to under 10 words."
                }
            ]
        },
        {
            "name": "cta",
            "label": "Call-to-Action",
            "score": 60,
            "issues": []
        }
    ]
}'''


class TestParseAnalysisResponse:
    """Tests for parse_analysis_response()."""

    def test_valid_json(self):
        result = parse_analysis_response(VALID_RESPONSE)
        assert result["score"] == 72
        assert result["summary"] == "Good page with some issues."
        assert len(result["categories"]) == 2
        assert result["categories"][0]["name"] == "headline"
        assert result["categories"][0]["issues"][0]["severity"] == "warning"

    def test_json_with_markdown_fences(self):
        wrapped = f"```json\n{VALID_RESPONSE}\n```"
        result = parse_analysis_response(wrapped)
        assert result["score"] == 72

    def test_json_with_bare_fences(self):
        wrapped = f"```\n{VALID_RESPONSE}\n```"
        result = parse_analysis_response(wrapped)
        assert result["score"] == 72

    def test_invalid_json_raises(self):
        with pytest.raises(AnalysisError, match="Failed to parse"):
            parse_analysis_response("not valid json {{{")

    def test_missing_score_raises(self):
        bad = '{"summary": "test", "categories": []}'
        with pytest.raises(AnalysisError, match="Missing or invalid score"):
            parse_analysis_response(bad)

    def test_missing_summary_raises(self):
        bad = '{"score": 50, "categories": []}'
        with pytest.raises(AnalysisError, match="Missing or invalid summary"):
            parse_analysis_response(bad)

    def test_missing_categories_raises(self):
        bad = '{"score": 50, "summary": "test"}'
        with pytest.raises(AnalysisError, match="Missing or invalid categories"):
            parse_analysis_response(bad)

    def test_score_clamped_to_100(self):
        response = '{"score": 150, "summary": "test", "categories": []}'
        result = parse_analysis_response(response)
        assert result["score"] == 100

    def test_score_clamped_to_0(self):
        response = '{"score": -10, "summary": "test", "categories": []}'
        result = parse_analysis_response(response)
        assert result["score"] == 0

    def test_invalid_severity_normalized(self):
        response = '''{
            "score": 50, "summary": "test",
            "categories": [{
                "name": "cta", "label": "CTA", "score": 50,
                "issues": [{"severity": "INVALID", "title": "t", "description": "d", "recommendation": "r"}]
            }]
        }'''
        result = parse_analysis_response(response)
        assert result["categories"][0]["issues"][0]["severity"] == "info"

    def test_category_score_clamped(self):
        response = '''{
            "score": 50, "summary": "test",
            "categories": [{"name": "cta", "label": "CTA", "score": 200, "issues": []}]
        }'''
        result = parse_analysis_response(response)
        assert result["categories"][0]["score"] == 100


class TestCalculateOverallScore:
    """Tests for calculate_overall_score()."""

    def test_weighted_calculation(self):
        categories = [
            {"name": "headline", "score": 100},
            {"name": "cta", "score": 100},
            {"name": "social_proof", "score": 100},
            {"name": "form", "score": 100},
            {"name": "visual_hierarchy", "score": 100},
            {"name": "trust", "score": 100},
            {"name": "mobile", "score": 100},
            {"name": "speed", "score": 100},
        ]
        assert calculate_overall_score(categories) == 100

    def test_empty_categories(self):
        assert calculate_overall_score([]) == 50

    def test_partial_categories(self):
        categories = [
            {"name": "headline", "score": 80},
            {"name": "cta", "score": 60},
        ]
        result = calculate_overall_score(categories)
        assert 0 <= result <= 100
```

**test_endpoints.py** — Tester les endpoints de base :

```python
"""Tests for API endpoints — auth, health check."""

import pytest
from fastapi.testclient import TestClient
from app.main import app


@pytest.fixture
def client():
    with TestClient(app) as c:
        yield c


class TestHealthCheck:
    def test_returns_200(self, client):
        response = client.get("/health")
        assert response.status_code == 200
        assert response.json()["status"] == "healthy"

    def test_returns_service_name(self, client):
        response = client.get("/health")
        assert response.json()["service"] == "leak-detector-api"


class TestAnalysesEndpoints:
    def test_create_without_auth_returns_403(self, client):
        """POST /analyses without Bearer token should return 403."""
        response = client.post("/api/v1/analyses", json={"url": "https://example.com"})
        assert response.status_code == 403

    def test_list_without_auth_returns_403(self, client):
        response = client.get("/api/v1/analyses")
        assert response.status_code == 403


class TestReportsEndpoints:
    def test_list_without_auth_returns_403(self, client):
        response = client.get("/api/v1/reports")
        assert response.status_code == 403


class TestBillingEndpoints:
    def test_status_without_auth_returns_403(self, client):
        response = client.get("/api/v1/billing/status")
        assert response.status_code == 403
```

**test_webhooks.py** — Tester les helpers du webhook :

```python
"""Tests for webhook helper functions."""

import pytest
from unittest.mock import patch
from app.api.v1.endpoints.webhooks import get_plan_from_price, get_limit_for_plan


class TestGetPlanFromPrice:
    @patch("app.api.v1.endpoints.webhooks.settings")
    def test_pro_price(self, mock_settings):
        mock_settings.STRIPE_PRICE_PRO_MONTHLY = "price_pro_123"
        mock_settings.STRIPE_PRICE_AGENCY_MONTHLY = "price_agency_456"
        assert get_plan_from_price("price_pro_123") == "pro"

    @patch("app.api.v1.endpoints.webhooks.settings")
    def test_agency_price(self, mock_settings):
        mock_settings.STRIPE_PRICE_PRO_MONTHLY = "price_pro_123"
        mock_settings.STRIPE_PRICE_AGENCY_MONTHLY = "price_agency_456"
        assert get_plan_from_price("price_agency_456") == "agency"

    @patch("app.api.v1.endpoints.webhooks.settings")
    def test_unknown_price_returns_free(self, mock_settings):
        mock_settings.STRIPE_PRICE_PRO_MONTHLY = "price_pro_123"
        mock_settings.STRIPE_PRICE_AGENCY_MONTHLY = "price_agency_456"
        assert get_plan_from_price("price_unknown") == "free"


class TestGetLimitForPlan:
    @patch("app.api.v1.endpoints.webhooks.settings")
    def test_free_limit(self, mock_settings):
        mock_settings.QUOTA_FREE = 3
        assert get_limit_for_plan("free") == 3

    @patch("app.api.v1.endpoints.webhooks.settings")
    def test_pro_limit(self, mock_settings):
        mock_settings.QUOTA_PRO = 50
        assert get_limit_for_plan("pro") == 50

    @patch("app.api.v1.endpoints.webhooks.settings")
    def test_agency_limit(self, mock_settings):
        mock_settings.QUOTA_AGENCY = 200
        assert get_limit_for_plan("agency") == 200

    @patch("app.api.v1.endpoints.webhooks.settings")
    def test_unknown_plan_returns_free_limit(self, mock_settings):
        mock_settings.QUOTA_FREE = 3
        assert get_limit_for_plan("enterprise") == 3
```

**Vérification** : `cd backend && pytest -v` doit passer au vert (les tests endpoint qui dépendent d'env vars absentes ne doivent pas crash — ils testent juste les codes de réponse HTTP 403).

---

## BLOC C — Pages & UX Manquantes

---

### C1. ✅ Page Forgot Password
**Fichier à créer** : `frontend/src/app/(auth)/forgot-password/page.tsx`

Page client component (`'use client'`) avec :
- Formulaire avec un champ email
- Bouton "Send Reset Link"
- Appel `supabase.auth.resetPasswordForEmail(email, { redirectTo: '${window.location.origin}/reset-password' })`
- État loading + success ("Check your email for a reset link")
- État error (affichage du message d'erreur Supabase)
- Lien "Back to login" → `/login`
- Layout : centré verticalement comme la page login existante
- Utiliser les classes CSS existantes : `input`, `btn-primary`, `card`
- Export metadata : `{ title: 'Reset Password — Leak Detector' }`

**Attention** : Comme c'est un client component, le metadata doit être dans un fichier `layout.tsx` séparé ou utiliser `document.title`. Alternative simple : ajouter un `generateMetadata` dans un fichier `layout.tsx` dédié, OU ignorer le metadata pour cette page (c'est une page auth, pas indexée).

---

### C2. ✅ Page Reset Password (nouveau mot de passe)
**Fichier à créer** : `frontend/src/app/(auth)/reset-password/page.tsx`

Page client component avec :
- Deux champs : "New password" + "Confirm password"
- Validation : min 8 caractères, les deux champs doivent matcher
- Bouton "Update Password"
- Appel `supabase.auth.updateUser({ password: newPassword })`
- Succès → message "Password updated!" + redirect `/login` après 2s
- Erreur → affichage message
- Layout : identique à forgot-password
- Utiliser les classes CSS existantes

---

### C3. ✅ Page Terms of Service
**Fichier à créer** : `frontend/src/app/(marketing)/terms/page.tsx`

Page server component avec metadata :
```typescript
export const metadata = {
  title: 'Terms of Service — Leak Detector',
  description: 'Terms of Service for Leak Detector landing page analysis platform.',
};
```

**Contenu** (en anglais) — Sections requises :
1. **Acceptance of Terms** — En utilisant le service, l'utilisateur accepte les conditions
2. **Description of Service** — AI-powered landing page analysis tool
3. **User Accounts** — Responsabilité du mot de passe, un compte par personne
4. **Subscription & Payments** — Plans (Free, Pro, Agency), billing via Stripe, renouvellement automatique, annulation via Customer Portal
5. **Usage Limits** — Monthly analysis quotas per plan, no rollovers
6. **Intellectual Property** — Les rapports générés appartiennent à l'utilisateur, le service et son code restent propriété de Leak Detector
7. **Prohibited Use** — Pas de scraping abusif, pas de reverse engineering, pas de revente des rapports
8. **Limitation of Liability** — Le service est fourni "as is", pas de garantie sur l'exactitude des recommandations
9. **Termination** — Droit de suspendre les comptes qui violent les conditions
10. **Changes to Terms** — Notification par email pour les changements matériels
11. **Governing Law** — French law (si société française) ou préciser
12. **Contact** — support@leakdetector.io

**Layout** : Header + footer identiques à la pricing page existante. Contenu dans un `max-w-3xl mx-auto` avec une prose claire. Chaque section est un `<h2>` avec des paragraphes. Date de dernière mise à jour en haut.

---

### C4. ✅ Page Privacy Policy
**Fichier à créer** : `frontend/src/app/(marketing)/privacy/page.tsx`

Page server component avec metadata :
```typescript
export const metadata = {
  title: 'Privacy Policy — Leak Detector',
  description: 'Privacy Policy for Leak Detector — how we collect, use, and protect your data.',
};
```

**Contenu** (en anglais, GDPR-compliant) — Sections requises :
1. **Introduction** — Qui nous sommes, engagement envers la protection des données
2. **Data We Collect** — Email, name (account), URLs analyzed, payment info (via Stripe, we don't store card numbers), usage data, cookies
3. **How We Use Your Data** — Provide the service, process payments, improve the analysis, send important service emails
4. **Legal Basis (GDPR)** — Contract performance (service), legitimate interest (improvement), consent (marketing emails si applicable)
5. **Third-Party Services** — Liste des sous-traitants avec leur rôle :
   - Supabase (database, authentication) — EU data region
   - Stripe (payments)
   - Anthropic (AI analysis — page content is sent for analysis)
   - Vercel (frontend hosting)
   - Railway (backend hosting)
   - Sentry (error monitoring)
6. **Data Retention** — Account data kept while active, deleted 30 days after account deletion, analysis data kept for the subscription period
7. **Your Rights** — Access, rectification, deletion, portability, restriction, objection. Contact: support@leakdetector.io
8. **Cookies** — Essential cookies only (Supabase auth session). No tracking cookies.
9. **Data Security** — HTTPS, encrypted at rest (Supabase), no plain-text passwords
10. **Changes to This Policy** — Notification par email
11. **Contact** — support@leakdetector.io, DPO contact

**Layout** : Identique à la Terms page. Header + footer cohérents avec pricing.

---

### C5. ✅ Toast Notification System
**Fichiers à créer** :
- `frontend/src/components/ui/toast.tsx`
- `frontend/src/hooks/use-toast.ts`

**Fichier à modifier** : `frontend/src/app/layout.tsx`

**use-toast.ts** — Context + hook :
```typescript
'use client';

import { createContext, useContext, useState, useCallback, ReactNode } from 'react';

export type ToastType = 'success' | 'error' | 'info';

interface Toast {
  id: string;
  type: ToastType;
  message: string;
}

interface ToastContextType {
  toasts: Toast[];
  toast: (opts: { type: ToastType; message: string }) => void;
  dismiss: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const toast = useCallback(({ type, message }: { type: ToastType; message: string }) => {
    const id = Math.random().toString(36).slice(2);
    setToasts((prev) => [...prev, { id, type, message }]);
    // Auto-dismiss after 4 seconds
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ toasts, toast, dismiss }}>
      {children}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used within ToastProvider');
  return context;
}
```

**toast.tsx** — Composant de rendu :
```typescript
'use client';

import { useToast } from '@/hooks/use-toast';

export function ToastContainer() {
  const { toasts, dismiss } = useToast();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`px-4 py-3 rounded-lg shadow-lg text-white text-sm font-medium flex items-center gap-2 animate-slide-up ${
            t.type === 'success' ? 'bg-green-600' :
            t.type === 'error' ? 'bg-red-600' :
            'bg-blue-600'
          }`}
        >
          <span>{t.message}</span>
          <button onClick={() => dismiss(t.id)} className="ml-2 opacity-70 hover:opacity-100">✕</button>
        </div>
      ))}
    </div>
  );
}
```

**globals.css** — Ajouter l'animation (dans `@layer components` ou après) :
```css
@keyframes slide-up {
  from { transform: translateY(1rem); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
}
.animate-slide-up {
  animation: slide-up 0.2s ease-out;
}
```

**layout.tsx** — Intégrer le provider et le container :
```typescript
import { ToastProvider } from '@/hooks/use-toast';
import { ToastContainer } from '@/components/ui/toast';

// Dans le return du RootLayout, wrapper children :
<body className={inter.className}>
  <ToastProvider>
    {children}
    <ToastContainer />
  </ToastProvider>
</body>
```

**Attention** : Le layout.tsx est un server component. Le ToastProvider et ToastContainer sont des client components. C'est OK car Next.js permet d'importer des client components dans un server component — ils seront rendus côté client.

**Intégration dans les pages existantes** :
- `settings/page.tsx` : ajouter `const { toast } = useToast();` et appeler `toast({ type: 'success', message: 'Changes saved!' })` après save, `toast({ type: 'error', message: 'Failed to save.' })` en cas d'erreur
- `analyze/page.tsx` : appeler `toast({ type: 'error', message: 'Network error. Retrying...' })` si le polling échoue

---

### C6. ✅ Error States robustes
**Fichier à créer** : `frontend/src/components/shared/error-state.tsx`

```typescript
interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
}

export function ErrorState({
  title = 'Something went wrong',
  message = 'An error occurred while loading this page. Please try again.',
  onRetry,
}: ErrorStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="text-4xl mb-4">⚠️</div>
      <h2 className="text-lg font-semibold text-gray-900 mb-2">{title}</h2>
      <p className="text-gray-600 mb-6 max-w-md">{message}</p>
      {onRetry && (
        <button onClick={onRetry} className="btn-primary">
          Try Again
        </button>
      )}
    </div>
  );
}
```

**Intégrer dans les pages dashboard** :

Pour les pages server-side (`dashboard/page.tsx`, `reports/page.tsx`, `reports/[id]/page.tsx`), wrapper les appels Supabase dans un try/catch et afficher `<ErrorState />` si le fetch échoue.

Pattern pour les pages SSR :
```typescript
// Dans le composant serveur :
try {
  const { data, error } = await supabase.from('...').select('...');
  if (error) throw error;
  // ... render normal
} catch (err) {
  return <ErrorState message="Failed to load data." />;
}
```

**Note** : Pour les pages SSR, `ErrorState` n'a pas besoin d'être un client component (pas de `onRetry` côté serveur). Pour les pages client, utiliser `onRetry` avec un `router.refresh()`.

---

## BLOC D — SEO & Production-Readiness

---

### D1. ✅ Fichiers .env.example
**Fichiers à créer** : `backend/.env.example`, `frontend/.env.example`

**backend/.env.example** :
```bash
# App
APP_NAME=LeakDetector
APP_ENV=development
APP_DEBUG=true
APP_SECRET_KEY=generate-with-openssl-rand-hex-32

# URLs
FRONTEND_URL=http://localhost:3000
BACKEND_URL=http://localhost:8000
CORS_ORIGINS=http://localhost:3000

# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_KEY=your-service-role-key
SUPABASE_JWT_SECRET=your-jwt-secret

# Redis
REDIS_URL=redis://localhost:6379/0

# Anthropic
ANTHROPIC_API_KEY=sk-ant-your-key
ANTHROPIC_MODEL=claude-sonnet-4-5-20250929

# Stripe
STRIPE_SECRET_KEY=sk_test_your-key
STRIPE_WEBHOOK_SECRET=whsec_your-secret
STRIPE_PRICE_PRO_MONTHLY=price_your-pro-price-id
STRIPE_PRICE_AGENCY_MONTHLY=price_your-agency-price-id

# Monitoring (optional in dev)
SENTRY_DSN=

# Playwright
PLAYWRIGHT_TIMEOUT=30000
```

**frontend/.env.example** :
```bash
NEXT_PUBLIC_APP_NAME=LeakDetector
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_your-key
```

---

### D2. ✅ .gitignore
**Fichier à créer** : `.gitignore` (racine du projet)

```gitignore
# Dependencies
node_modules/
.npm

# Python
__pycache__/
*.py[cod]
*$py.class
*.so
venv/
.venv/
*.egg-info/
dist/
build/

# Environment
.env
.env.local
.env.*.local

# IDE
.vscode/
.idea/
*.swp
*.swo

# OS
.DS_Store
Thumbs.db

# Next.js
.next/
out/

# Vercel
.vercel

# Testing
.coverage
htmlcov/
.pytest_cache/

# Misc
*.log
```

---

### D3. ✅ Favicon SVG
**Fichier à créer** : `frontend/public/favicon.svg`

Créer un SVG simple : une loupe bleue (couleur `#2563eb` = primary-600) sur fond transparent.

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
  <circle cx="13" cy="13" r="8" fill="none" stroke="#2563eb" stroke-width="3"/>
  <line x1="19" y1="19" x2="28" y2="28" stroke="#2563eb" stroke-width="3" stroke-linecap="round"/>
</svg>
```

Aussi : utiliser Next.js favicon metadata dans `layout.tsx` (voir D4).

---

### D4. ✅ SEO Metadata complète + sitemap + robots
**Fichier à modifier** : `frontend/src/app/layout.tsx`

Enrichir le metadata :
```typescript
export const metadata: Metadata = {
  metadataBase: new URL('https://leakdetector.io'),
  title: {
    default: 'Leak Detector — Find What Makes Visitors Leave Your Page',
    template: '%s — Leak Detector',
  },
  description: 'AI-powered landing page analysis. Identify conversion leaks and get actionable recommendations in 30 seconds.',
  keywords: ['landing page', 'conversion', 'CRO', 'optimization', 'analysis', 'AI'],
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://leakdetector.io',
    siteName: 'Leak Detector',
    title: 'Leak Detector — Find What Makes Visitors Leave Your Page',
    description: 'AI-powered landing page analysis. Get actionable recommendations in 30 seconds.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Leak Detector',
    description: 'AI-powered landing page analysis. Get actionable recommendations in 30 seconds.',
  },
  icons: {
    icon: '/favicon.svg',
  },
};
```

**Fichier à créer** : `frontend/src/app/sitemap.ts`
```typescript
import { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = 'https://leakdetector.io';

  return [
    { url: baseUrl, lastModified: new Date(), changeFrequency: 'weekly', priority: 1 },
    { url: `${baseUrl}/pricing`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.8 },
    { url: `${baseUrl}/login`, lastModified: new Date(), changeFrequency: 'yearly', priority: 0.3 },
    { url: `${baseUrl}/register`, lastModified: new Date(), changeFrequency: 'yearly', priority: 0.5 },
    { url: `${baseUrl}/terms`, lastModified: new Date(), changeFrequency: 'yearly', priority: 0.2 },
    { url: `${baseUrl}/privacy`, lastModified: new Date(), changeFrequency: 'yearly', priority: 0.2 },
  ];
}
```

**Fichier à créer** : `frontend/src/app/robots.ts`
```typescript
import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/dashboard', '/settings', '/analyze', '/reports', '/api/'],
    },
    sitemap: 'https://leakdetector.io/sitemap.xml',
  };
}
```

---

### D5. ✅ Meta tags par page
**Fichiers à modifier** : Ajouter `export const metadata` dans chaque page marketing/auth.

**`frontend/src/app/page.tsx`** (landing) : Déjà géré par layout.tsx (default title).

**`frontend/src/app/(marketing)/pricing/page.tsx`** :
```typescript
import { Metadata } from 'next';
export const metadata: Metadata = {
  title: 'Pricing',
  description: 'Simple, transparent pricing. Choose the plan that fits your needs.',
};
```

**`frontend/src/app/(auth)/login/page.tsx`** : C'est un client component. Pour le metadata, créer un layout ou ignorer (page non indexée — robots.txt n'inclut pas /login explicitement, mais le middleware redirige les users connectés). **Ignorer** — pas de ROI SEO sur les pages auth.

**`frontend/src/app/(marketing)/terms/page.tsx`** : Metadata inclus dans C3.
**`frontend/src/app/(marketing)/privacy/page.tsx`** : Metadata inclus dans C4.

---

## RÉCAPITULATIF — Checklist finale

### Bloc A — Sécurité
- [ ] A1. JWT verification avec SUPABASE_JWT_SECRET
- [ ] A2. Rate limiting (SlowAPI)
- [ ] A3. Fix HTTPException → AppError (5 fichiers)
- [ ] A4. Fix model string Claude

### Bloc B — Code Quality
- [ ] B1. Types TypeScript complets (types/index.ts + api.ts + pages)
- [ ] B2. Déduplication reports.py
- [ ] B3. Cleanup createClient() (analyze + settings)
- [ ] B4. Tests (3 fichiers de tests)

### Bloc C — Pages & UX
- [ ] C1. Page forgot-password
- [ ] C2. Page reset-password
- [ ] C3. Page Terms of Service
- [ ] C4. Page Privacy Policy
- [ ] C5. Toast system (hook + composant + intégration)
- [ ] C6. Error states (composant + intégration)

### Bloc D — SEO & Production
- [ ] D1. .env.example (backend + frontend)
- [ ] D2. .gitignore
- [ ] D3. Favicon SVG
- [ ] D4. Layout metadata + sitemap.ts + robots.ts
- [ ] D5. Meta tags pricing page

---

## Notes de session

### 2026-02-02
- Création repo et documentation initiale
- Stack validé : FastAPI + Next.js + Supabase + Claude API

### 2026-02-03
- 85 fichiers livrés (backend complet, frontend complet, DB schema)
- 7 bugs critiques corrigés
- CLAUDE.md réécrit
- Audit complet du codebase : 70% production-ready
- Plan de production créé (ce fichier)

### À FAIRE après le déploiement
- [ ] Tester le flow complet (signup → analyse → upgrade → quota reset)
- [ ] Configurer Stripe en mode live
- [ ] Configurer domaine leakdetector.io (Vercel + Railway)
- [ ] Ajouter `SUPABASE_JWT_SECRET` en env var Railway
