"""Tests for webhook helper functions."""

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
