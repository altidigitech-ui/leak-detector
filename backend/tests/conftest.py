"""
Pytest configuration and fixtures.
"""

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.config import settings


@pytest.fixture
def client():
    """Create a test client for the FastAPI app."""
    with TestClient(app) as c:
        yield c


@pytest.fixture
def auth_headers():
    """
    Create mock authentication headers.
    In real tests, you would create a test user and get a real token.
    """
    # This is a mock token for testing
    # In production tests, use a real test user
    return {
        "Authorization": "Bearer test-token-for-testing-only"
    }


@pytest.fixture
def sample_analysis():
    """Sample analysis data for testing."""
    return {
        "id": "550e8400-e29b-41d4-a716-446655440000",
        "user_id": "user-123",
        "url": "https://example.com",
        "status": "pending",
        "created_at": "2026-02-02T10:00:00Z",
    }


@pytest.fixture
def sample_report():
    """Sample report data for testing."""
    return {
        "id": "660e8400-e29b-41d4-a716-446655440000",
        "analysis_id": "550e8400-e29b-41d4-a716-446655440000",
        "score": 72,
        "summary": "Your landing page has good potential but has 3 critical issues.",
        "categories": [
            {
                "name": "headline",
                "label": "Headline",
                "score": 85,
                "issues": [
                    {
                        "severity": "warning",
                        "title": "Headline too long",
                        "description": "Your headline has 15 words, ideally less than 10.",
                        "recommendation": "Condense your value proposition.",
                    }
                ],
            },
            {
                "name": "cta",
                "label": "Call-to-Action",
                "score": 60,
                "issues": [
                    {
                        "severity": "critical",
                        "title": "CTA not visible",
                        "description": "Button contrast is too low.",
                        "recommendation": "Use a more contrasting color.",
                    }
                ],
            },
        ],
        "screenshot_url": "https://storage.example.com/screenshot.png",
        "page_metadata": {
            "title": "Example Landing",
            "load_time_ms": 2340,
            "word_count": 450,
        },
        "created_at": "2026-02-02T10:00:30Z",
    }


@pytest.fixture
def sample_profile():
    """Sample user profile for testing."""
    return {
        "id": "user-123",
        "email": "test@example.com",
        "full_name": "Test User",
        "plan": "free",
        "analyses_used": 1,
        "analyses_limit": 3,
        "stripe_customer_id": None,
    }


# Test environment check
def pytest_configure(config):
    """Ensure we're not running tests against production."""
    if settings.APP_ENV == "production":
        raise RuntimeError("Cannot run tests in production environment!")
