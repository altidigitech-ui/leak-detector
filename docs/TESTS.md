# Stratégie de Tests — Leak Detector

> Plan de test, couverture, et bonnes pratiques.

---

## Vue d'ensemble

| Type | Outil | Couverture cible |
|------|-------|------------------|
| Unit Tests (Backend) | pytest | 80% |
| Unit Tests (Frontend) | Jest | 70% |
| Integration Tests | pytest + TestClient | Endpoints critiques |
| E2E Tests | Playwright | Flows critiques |
| Load Tests | Locust | Avant launch |

---

## Structure des Tests

### Backend
```
backend/
└── tests/
    ├── __init__.py
    ├── conftest.py              # Fixtures globales
    ├── unit/
    │   ├── test_analyzer.py     # Service analyzer
    │   ├── test_scraper.py      # Service scraper
    │   └── test_schemas.py      # Validation Pydantic
    ├── integration/
    │   ├── test_analyses.py     # Endpoint analyses
    │   ├── test_reports.py      # Endpoint reports
    │   ├── test_billing.py      # Endpoint billing
    │   └── test_webhooks.py     # Webhooks Stripe
    └── e2e/
        └── test_full_flow.py    # Flow complet
```

### Frontend
```
frontend/
└── __tests__/
    ├── components/
    │   ├── Button.test.tsx
    │   ├── ScoreCircle.test.tsx
    │   └── ...
    ├── lib/
    │   ├── utils.test.ts
    │   └── api.test.ts
    └── pages/
        ├── login.test.tsx
        └── analyze.test.tsx
```

---

## Fixtures (Backend)

### conftest.py
```python
import pytest
from fastapi.testclient import TestClient
from app.main import app

@pytest.fixture
def client():
    """Test client FastAPI."""
    with TestClient(app) as c:
        yield c

@pytest.fixture
def auth_headers(test_user):
    """Headers avec token JWT valide."""
    return {"Authorization": f"Bearer {test_user.token}"}

@pytest.fixture
def test_user(supabase_client):
    """Créer un user de test."""
    user = supabase_client.auth.sign_up({
        "email": "test@example.com",
        "password": "TestPass123!",
    })
    yield user
    # Cleanup
    supabase_client.auth.admin.delete_user(user.id)

@pytest.fixture
def sample_analysis():
    """Données d'analyse de test."""
    return {
        "id": "550e8400-e29b-41d4-a716-446655440000",
        "user_id": "user-123",
        "url": "https://example.com",
        "status": "pending",
    }

@pytest.fixture
def sample_report():
    """Données de rapport de test."""
    return {
        "id": "660e8400-e29b-41d4-a716-446655440000",
        "analysis_id": "550e8400-e29b-41d4-a716-446655440000",
        "score": 72,
        "summary": "Good potential but 3 critical issues.",
        "categories": [...],
    }

@pytest.fixture
def mock_claude_response():
    """Réponse Claude simulée."""
    return {
        "score": 72,
        "summary": "...",
        "categories": [...]
    }
```

---

## Tests Unitaires

### Service Analyzer
```python
# tests/unit/test_analyzer.py

import pytest
from unittest.mock import patch, MagicMock
from app.services.analyzer import analyze_page, parse_analysis_response

class TestParseAnalysisResponse:
    """Tests pour le parsing de réponse Claude."""
    
    def test_parse_valid_json(self):
        response = '{"score": 72, "summary": "Test", "categories": []}'
        result = parse_analysis_response(response)
        assert result["score"] == 72
        assert result["summary"] == "Test"
    
    def test_parse_json_with_markdown(self):
        response = '```json\n{"score": 72, "summary": "Test", "categories": []}\n```'
        result = parse_analysis_response(response)
        assert result["score"] == 72
    
    def test_parse_invalid_json_raises(self):
        with pytest.raises(AnalysisError):
            parse_analysis_response("not json")
    
    def test_score_clamped_to_100(self):
        response = '{"score": 150, "summary": "Test", "categories": []}'
        result = parse_analysis_response(response)
        assert result["score"] == 100
    
    def test_score_clamped_to_0(self):
        response = '{"score": -10, "summary": "Test", "categories": []}'
        result = parse_analysis_response(response)
        assert result["score"] == 0


class TestAnalyzePage:
    """Tests pour l'analyse complète."""
    
    @patch("app.services.analyzer.client")
    async def test_analyze_page_success(self, mock_client, mock_scraped_page):
        mock_client.messages.create.return_value = MagicMock(
            content=[MagicMock(text='{"score": 72, "summary": "Test", "categories": []}')]
        )
        
        result = await analyze_page(mock_scraped_page)
        
        assert result["score"] == 72
        mock_client.messages.create.assert_called_once()
    
    @patch("app.services.analyzer.client")
    async def test_analyze_page_api_error(self, mock_client, mock_scraped_page):
        mock_client.messages.create.side_effect = Exception("API Error")
        
        with pytest.raises(AnalysisError):
            await analyze_page(mock_scraped_page)
```

### Service Scraper
```python
# tests/unit/test_scraper.py

import pytest
from app.services.scraper import summarize_html, validate_url

class TestSummarizeHtml:
    """Tests pour la simplification HTML."""
    
    def test_removes_script_tags(self):
        html = "<html><script>alert('x')</script><p>Hello</p></html>"
        result = summarize_html(html)
        assert "<script>" not in result
        assert "Hello" in result
    
    def test_removes_style_tags(self):
        html = "<html><style>body{color:red}</style><p>Hello</p></html>"
        result = summarize_html(html)
        assert "<style>" not in result
    
    def test_truncates_long_html(self):
        html = "<p>" + "a" * 10000 + "</p>"
        result = summarize_html(html, max_length=100)
        assert len(result) <= 120  # max + "... [truncated]"
        assert "[truncated]" in result


class TestValidateUrl:
    """Tests pour la validation d'URL."""
    
    def test_valid_https_url(self):
        assert validate_url("https://example.com") == True
    
    def test_valid_http_url(self):
        assert validate_url("http://example.com") == True
    
    def test_localhost_blocked(self):
        with pytest.raises(ValidationError):
            validate_url("http://localhost:3000")
    
    def test_private_ip_blocked(self):
        with pytest.raises(ValidationError):
            validate_url("http://192.168.1.1")
    
    def test_file_protocol_blocked(self):
        with pytest.raises(ValidationError):
            validate_url("file:///etc/passwd")
```

---

## Tests d'Intégration

### Endpoint Analyses
```python
# tests/integration/test_analyses.py

import pytest
from fastapi import status

class TestCreateAnalysis:
    """Tests POST /api/v1/analyses"""
    
    def test_create_analysis_success(self, client, auth_headers):
        response = client.post(
            "/api/v1/analyses",
            json={"url": "https://example.com"},
            headers=auth_headers,
        )
        
        assert response.status_code == status.HTTP_201_CREATED
        data = response.json()
        assert data["success"] == True
        assert data["data"]["status"] == "pending"
        assert "id" in data["data"]
    
    def test_create_analysis_invalid_url(self, client, auth_headers):
        response = client.post(
            "/api/v1/analyses",
            json={"url": "not-a-url"},
            headers=auth_headers,
        )
        
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert response.json()["error"]["code"] == "VALIDATION_ERROR"
    
    def test_create_analysis_no_auth(self, client):
        response = client.post(
            "/api/v1/analyses",
            json={"url": "https://example.com"},
        )
        
        assert response.status_code == status.HTTP_401_UNAUTHORIZED
    
    def test_create_analysis_quota_exceeded(self, client, auth_headers, user_at_quota):
        response = client.post(
            "/api/v1/analyses",
            json={"url": "https://example.com"},
            headers=auth_headers,
        )
        
        assert response.status_code == status.HTTP_403_FORBIDDEN
        assert response.json()["error"]["code"] == "QUOTA_EXCEEDED"


class TestGetAnalysis:
    """Tests GET /api/v1/analyses/{id}"""
    
    def test_get_analysis_success(self, client, auth_headers, existing_analysis):
        response = client.get(
            f"/api/v1/analyses/{existing_analysis['id']}",
            headers=auth_headers,
        )
        
        assert response.status_code == status.HTTP_200_OK
        assert response.json()["data"]["id"] == existing_analysis["id"]
    
    def test_get_analysis_not_found(self, client, auth_headers):
        response = client.get(
            "/api/v1/analyses/nonexistent-id",
            headers=auth_headers,
        )
        
        assert response.status_code == status.HTTP_404_NOT_FOUND
    
    def test_get_analysis_other_user(self, client, auth_headers, other_user_analysis):
        response = client.get(
            f"/api/v1/analyses/{other_user_analysis['id']}",
            headers=auth_headers,
        )
        
        assert response.status_code == status.HTTP_404_NOT_FOUND
```

### Webhooks Stripe
```python
# tests/integration/test_webhooks.py

import pytest
import stripe
from unittest.mock import patch

class TestStripeWebhook:
    """Tests POST /webhooks/stripe"""
    
    def test_valid_checkout_completed(self, client, mock_stripe_signature):
        event = {
            "type": "checkout.session.completed",
            "data": {
                "object": {
                    "customer": "cus_xxx",
                    "subscription": "sub_xxx",
                }
            }
        }
        
        with patch("stripe.Webhook.construct_event", return_value=event):
            response = client.post(
                "/api/v1/webhooks/stripe",
                json=event,
                headers={"stripe-signature": "valid_sig"},
            )
        
        assert response.status_code == 200
        assert response.json()["received"] == True
    
    def test_invalid_signature(self, client):
        with patch("stripe.Webhook.construct_event") as mock:
            mock.side_effect = stripe.error.SignatureVerificationError("Invalid", "sig")
            
            response = client.post(
                "/api/v1/webhooks/stripe",
                json={},
                headers={"stripe-signature": "invalid"},
            )
        
        assert response.status_code == 400
```

---

## Tests E2E

### Flow complet d'analyse
```python
# tests/e2e/test_full_flow.py

import pytest
from playwright.sync_api import Page, expect

class TestAnalysisFlow:
    """Test E2E du flow complet."""
    
    def test_signup_and_analyze(self, page: Page):
        # 1. Inscription
        page.goto("/register")
        page.fill('input[name="email"]', "e2e@test.com")
        page.fill('input[name="password"]', "TestPass123!")
        page.fill('input[name="fullName"]', "E2E Test")
        page.click('button[type="submit"]')
        
        # 2. Redirection dashboard
        expect(page).to_have_url("/dashboard")
        
        # 3. Nouvelle analyse
        page.click("text=New Analysis")
        expect(page).to_have_url("/analyze")
        
        # 4. Soumettre URL
        page.fill('input[name="url"]', "https://stripe.com")
        page.click('button[type="submit"]')
        
        # 5. Attendre le résultat (timeout 60s)
        expect(page.locator("text=Analysis Report")).to_be_visible(timeout=60000)
        
        # 6. Vérifier le rapport
        expect(page.locator('[data-testid="score"]')).to_be_visible()
        expect(page.locator('[data-testid="categories"]')).to_be_visible()
```

---

## Mocks

### Mock Supabase
```python
# tests/mocks/supabase.py

class MockSupabaseService:
    async def get_profile(self, user_id: str):
        return {
            "id": user_id,
            "email": "test@example.com",
            "plan": "free",
            "analyses_used": 0,
            "analyses_limit": 3,
        }
    
    async def create_analysis(self, user_id: str, url: str):
        return {
            "id": "mock-analysis-id",
            "user_id": user_id,
            "url": url,
            "status": "pending",
        }
    
    # ... autres méthodes
```

### Mock Claude API
```python
# tests/mocks/claude.py

MOCK_ANALYSIS_RESPONSE = {
    "score": 72,
    "summary": "Mock analysis summary",
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
            "score": 60,
            "issues": [
                {
                    "severity": "critical",
                    "title": "Low contrast CTA",
                    "description": "Button contrast is too low",
                    "recommendation": "Increase contrast ratio"
                }
            ]
        }
    ]
}
```

---

## Commandes

### Backend
```bash
# Tous les tests
pytest

# Avec couverture
pytest --cov=app --cov-report=html

# Tests unitaires uniquement
pytest tests/unit/

# Tests d'intégration
pytest tests/integration/

# Un fichier spécifique
pytest tests/unit/test_analyzer.py

# Verbose
pytest -v

# Stop au premier échec
pytest -x
```

### Frontend
```bash
# Tous les tests
npm test

# Watch mode
npm test -- --watch

# Couverture
npm test -- --coverage

# Un fichier
npm test -- Button.test.tsx
```

---

## CI Integration
```yaml
# .github/workflows/ci.yml (extrait)

backend-test:
  steps:
    - name: Run tests
      run: pytest --cov=app --cov-report=xml -v
    
    - name: Upload coverage
      uses: codecov/codecov-action@v4
      with:
        files: backend/coverage.xml

frontend-test:
  steps:
    - name: Run tests
      run: npm test -- --coverage
    
    - name: Upload coverage
      uses: codecov/codecov-action@v4
```

---

## Couverture Minimale

| Module | Cible | Bloquant CI |
|--------|-------|-------------|
| app/services/ | 85% | Oui |
| app/api/ | 80% | Oui |
| app/core/ | 75% | Non |
| app/workers/ | 70% | Non |
| frontend/components/ | 70% | Non |
| frontend/lib/ | 80% | Oui |

---

## Bonnes Pratiques

1. **Nommer clairement** : `test_create_analysis_quota_exceeded`
2. **Un assert par test** (idéalement)
3. **Arrange-Act-Assert** : Setup, exécution, vérification
4. **Pas de dépendances entre tests**
5. **Mocker les services externes** (Stripe, Claude, Supabase)
6. **Tests rapides** : <1s par test unitaire
7. **Cleanup** : Supprimer les données de test
