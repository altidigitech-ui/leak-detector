"""
Analyzer service using Claude API.
Analyzes landing pages for conversion optimization issues.
"""

import json
import re
from typing import Any, Dict, List

import anthropic

from app.config import settings
from app.core.errors import AnalysisError
from app.core.logging import get_logger
from app.services.scraper import ScrapedPage, summarize_html

logger = get_logger(__name__)

# Initialize Anthropic client
client = anthropic.Anthropic(api_key=settings.ANTHROPIC_API_KEY)

# Analysis system prompt
SYSTEM_PROMPT = """You are an expert in Conversion Rate Optimization (CRO) and UX Design with 15 years of experience.
You analyze landing pages to identify issues that drive visitors away and reduce conversions.

For each page, you must evaluate these 8 categories:

1. **headline** - Headline
   - Message clarity (understandable in less than 5 seconds)
   - Optimal length (6-12 words ideally)
   - Clear and specific value proposition
   - Avoids jargon and generic terms

2. **cta** - Call-to-Action
   - Visibility (contrast, size, position)
   - Above the fold
   - Action-oriented and benefit-driven text
   - One clear primary CTA

3. **social_proof** - Social Proof
   - Customer testimonials with details (name, photo, company)
   - Recognized client/partner logos
   - Verifiable numbers and statistics
   - Reviews and ratings

4. **form** - Form
   - Number of fields (fewer than 5 ideally)
   - Clear and explicit labels
   - Required field indicators
   - Helpful error messages

5. **visual_hierarchy** - Visual Hierarchy
   - Sufficient spacing between elements
   - Readable text/background contrast
   - Appropriate font size (min 16px body)
   - Clear structure with distinct sections

6. **trust** - Trust
   - HTTPS active
   - Accessible legal notices
   - Visible contact information
   - Security badges/certifications

7. **mobile** - Mobile
   - Responsive design
   - Sufficient touch targets (min 44px)
   - Text readable without zooming
   - No horizontal scrolling

8. **speed** - Performance
   - Load time (under 3 seconds)
   - Optimized images
   - No render-blocking resources

For each issue found, provide:
- **severity**: "critical" (blocks conversion), "warning" (negatively impacts), or "info" (minor improvement)
- **title**: Short and clear issue title (max 50 characters)
- **description**: Detailed explanation of the issue and its impact
- **recommendation**: Concrete and specific action to take

Respond ONLY with valid JSON using this exact structure (no markdown, no comments):
{
  "score": <number 0-100>,
  "summary": "<string: 2-3 sentences summarizing the analysis>",
  "categories": [
    {
      "name": "<string: category name>",
      "label": "<string: human-readable label>",
      "score": <number 0-100>,
      "issues": [
        {
          "severity": "<critical|warning|info>",
          "title": "<string>",
          "description": "<string>",
          "recommendation": "<string>"
        }
      ]
    }
  ]
}

Be precise, actionable, and constructive. Do not invent issues that do not exist.

LANGUAGE RULES:
- Category names (headline, cta, social_proof, etc.) must ALWAYS be in English (they are JSON keys).
- The "label" field for each category must ALWAYS be in English.
- For "summary", "title", "description", and "recommendation" fields:
  - Detect the primary language of the page content.
  - Write these fields in the SAME language as the page.
  - If the page is in French, write in French. If in English, write in English. If in German, write in German.
  - If the language is unclear or mixed, default to English.

CRITICAL: Your response must be ONLY valid JSON. No markdown, no code blocks, no explanations before or after the JSON. Start with { and end with }."""

USER_PROMPT_TEMPLATE = """Analyze this landing page for conversion issues:

**URL**: {url}
**Page title**: {title}
**Meta description**: {meta_description}

**Load time**: {load_time_ms}ms
**Word count**: {word_count}
**Image count**: {image_count}
**Form present**: {has_form}

**Visible text content**:
{text_content}

**HTML structure (summarized)**:
{html_summary}

Generate your JSON analysis now."""


async def analyze_page(scraped: ScrapedPage) -> Dict[str, Any]:
    """
    Analyze a scraped page using Claude API.
    
    Args:
        scraped: The scraped page data
        
    Returns:
        Analysis result with score, summary, and categories
        
    Raises:
        AnalysisError: If analysis fails
    """
    logger.info("analysis_started", url=scraped.url)
    
    # Prepare the prompt (reduced lengths for faster processing)
    html_summary = summarize_html(scraped.html, max_length=2000)
    text_content = scraped.text_content[:2000] if scraped.text_content else ""
    
    user_prompt = USER_PROMPT_TEMPLATE.format(
        url=scraped.url,
        title=scraped.title or "Not defined",
        meta_description=scraped.meta_description or "Not defined",
        load_time_ms=scraped.load_time_ms,
        word_count=scraped.word_count,
        image_count=scraped.image_count,
        has_form="Yes" if scraped.has_form else "No",
        text_content=text_content,
        html_summary=html_summary,
    )
    
    try:
        # Call Claude API with prefill to force clean JSON output
        message = client.messages.create(
            model=settings.ANTHROPIC_MODEL,
            max_tokens=3000,
            system=SYSTEM_PROMPT,
            messages=[
                {"role": "user", "content": user_prompt},
                {"role": "assistant", "content": "{"},
            ],
        )

        # Extract response text (prepend "{" since we used it as prefill)
        response_text = "{" + message.content[0].text

        # Log token usage
        usage = message.usage
        tokens_input = usage.input_tokens if usage else 0
        tokens_output = usage.output_tokens if usage else 0
        logger.info(
            "claude_usage",
            input_tokens=tokens_input,
            output_tokens=tokens_output,
        )

        # Parse JSON response
        result = parse_analysis_response(response_text)

        # Attach token usage to result for downstream tracking
        result["_usage"] = {
            "input_tokens": tokens_input,
            "output_tokens": tokens_output,
        }

        logger.info(
            "analysis_completed",
            url=scraped.url,
            score=result.get("score"),
            categories_count=len(result.get("categories", [])),
        )

        return result
        
    except anthropic.APIError as e:
        logger.error("claude_api_error", error=str(e), url=scraped.url)
        raise AnalysisError(f"Claude API error: {str(e)}")
    except Exception as e:
        logger.error("analysis_error", error=str(e), url=scraped.url)
        raise AnalysisError(f"Analysis failed: {str(e)}")


def parse_analysis_response(response_text: str) -> Dict[str, Any]:
    """
    Parse the JSON response from Claude.
    
    Args:
        response_text: Raw response text from Claude
        
    Returns:
        Parsed analysis result
        
    Raises:
        AnalysisError: If parsing fails
    """
    try:
        # Clean up response (remove markdown code blocks if present)
        text = response_text.strip()
        if text.startswith("```json"):
            text = text[7:]
        if text.startswith("```"):
            text = text[3:]
        if text.endswith("```"):
            text = text[:-3]
        text = text.strip()

        # Try parsing JSON with multiple fallback strategies
        result = None
        parse_error = None

        # Strategy 1: Direct parse
        try:
            result = json.loads(text)
        except json.JSONDecodeError as e:
            parse_error = e

        # Strategy 2: Extract JSON with regex
        if result is None:
            try:
                match = re.search(r'\{[\s\S]*\}', text)
                if match:
                    result = json.loads(match.group())
            except json.JSONDecodeError:
                pass

        # Strategy 3: Clean common issues (smart quotes, control chars)
        if result is None:
            try:
                cleaned = text
                # Replace smart/curly quotes with straight quotes
                cleaned = cleaned.replace('"', '"').replace('"', '"')
                cleaned = cleaned.replace(''', "'").replace(''', "'")
                # Remove control characters except newlines and tabs
                cleaned = re.sub(r'[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]', '', cleaned)
                result = json.loads(cleaned)
            except json.JSONDecodeError:
                pass

        # If all strategies failed, raise the original error
        if result is None:
            logger.error(
                "json_parse_failed_all_strategies",
                response_preview=response_text[:500],
                error=str(parse_error),
            )
            raise parse_error
        
        # Validate structure
        if not isinstance(result.get("score"), (int, float)):
            raise ValueError("Missing or invalid score")
        if not isinstance(result.get("summary"), str):
            raise ValueError("Missing or invalid summary")
        if not isinstance(result.get("categories"), list):
            raise ValueError("Missing or invalid categories")
        
        # Ensure score is within bounds
        result["score"] = max(0, min(100, int(result["score"])))
        
        # Validate and clean categories
        cleaned_categories = []
        for cat in result["categories"]:
            cleaned_cat = {
                "name": cat.get("name", "unknown"),
                "label": cat.get("label", cat.get("name", "Unknown")),
                "score": max(0, min(100, int(cat.get("score", 50)))),
                "issues": [],
            }
            
            for issue in cat.get("issues", []):
                cleaned_issue = {
                    "severity": issue.get("severity", "info"),
                    "title": issue.get("title", "Issue"),
                    "description": issue.get("description", ""),
                    "recommendation": issue.get("recommendation", ""),
                }
                # Validate severity
                if cleaned_issue["severity"] not in ("critical", "warning", "info"):
                    cleaned_issue["severity"] = "info"
                cleaned_cat["issues"].append(cleaned_issue)
            
            cleaned_categories.append(cleaned_cat)
        
        result["categories"] = cleaned_categories
        
        return result
        
    except json.JSONDecodeError as e:
        logger.error("json_parse_error", error=str(e), response_preview=response_text[:500])
        raise AnalysisError(f"Failed to parse analysis response: {str(e)}")
    except ValueError as e:
        logger.error("validation_error", error=str(e))
        raise AnalysisError(f"Invalid analysis response: {str(e)}")


def calculate_overall_score(categories: List[Dict[str, Any]]) -> int:
    """
    Calculate overall score from category scores.
    
    Weights categories by importance for conversion.
    """
    weights = {
        "headline": 0.20,
        "cta": 0.20,
        "social_proof": 0.15,
        "form": 0.10,
        "visual_hierarchy": 0.10,
        "trust": 0.10,
        "mobile": 0.10,
        "speed": 0.05,
    }
    
    total_weight = 0
    weighted_score = 0
    
    for cat in categories:
        name = cat.get("name", "")
        score = cat.get("score", 50)
        weight = weights.get(name, 0.05)
        
        weighted_score += score * weight
        total_weight += weight
    
    if total_weight == 0:
        return 50
    
    return int(weighted_score / total_weight)
