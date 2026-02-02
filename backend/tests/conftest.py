"""
Pytest configuration and fixtures.
"""
import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.config import settings


@pytest.fixture(scope="session")
def client():
    """Create a test client for the FastAPI app."""
    with TestClient(app) as test_client:
        yield test_client


@pytest.fixture
def mock_user():
    """Return a mock user dict."""
    return {
        "id": "test-user-uuid-1234",
        "email": "test@example.com",
        "role": "authenticated",
        "user_metadata": {},
    }


@pytest.fixture
def mock_admin_user():
    """Return a mock admin user dict."""
    return {
        "id": "test-admin-uuid-1234",
        "email": "admin@example.com",
        "role": "authenticated",
        "user_metadata": {"is_admin": True},
    }


@pytest.fixture
def auth_headers(mock_user, mocker):
    """
    Return auth headers with mocked authentication.
    
    This fixture mocks the get_current_user dependency.
    """
    from app.core.security import get_current_user
    
    async def mock_get_current_user():
        return mock_user
    
    app.dependency_overrides[get_current_user] = mock_get_current_user
    
    yield {"Authorization": "Bearer mock-token"}
    
    # Cleanup
    app.dependency_overrides.pop(get_current_user, None)


@pytest.fixture
def admin_headers(mock_admin_user, mocker):
    """
    Return auth headers with mocked admin authentication.
    """
    from app.core.security import get_current_user, require_admin
    
    async def mock_get_current_user():
        return mock_admin_user
    
    def mock_require_admin():
        return mock_admin_user
    
    app.dependency_overrides[get_current_user] = mock_get_current_user
    app.dependency_overrides[require_admin] = mock_require_admin
    
    yield {"Authorization": "Bearer mock-admin-token"}
    
    # Cleanup
    app.dependency_overrides.pop(get_current_user, None)
    app.dependency_overrides.pop(require_admin, None)


# ============================================================================
# Test helpers
# ============================================================================

def assert_success_response(response, status_code=200):
    """Assert that the response is a successful API response."""
    assert response.status_code == status_code
    data = response.json()
    assert data["success"] is True
    assert "data" in data
    return data["data"]


def assert_error_response(response, status_code, error_code=None):
    """Assert that the response is an error API response."""
    assert response.status_code == status_code
    data = response.json()
    assert data["success"] is False
    assert "error" in data
    if error_code:
        assert data["error"]["code"] == error_code
    return data["error"]
