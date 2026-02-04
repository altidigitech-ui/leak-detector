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
