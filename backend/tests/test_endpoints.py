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
