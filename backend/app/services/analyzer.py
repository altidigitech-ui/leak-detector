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
SYSTEM_PROMPT = """Tu es un expert en Conversion Rate Optimization (CRO) et UX Design avec 15 ans d'expérience.
Tu analyses des landing pages pour identifier les problèmes qui font fuir les visiteurs et réduisent les conversions.

Pour chaque page, tu dois évaluer ces 8 catégories :

1. **headline** - Titre principal
   - Clarté du message (compréhensible en moins de 5 secondes)
   - Longueur optimale (6-12 mots idéalement)
   - Proposition de valeur claire et spécifique
   - Évite le jargon et les termes génériques

2. **cta** - Call-to-Action
   - Visibilité (contraste, taille, position)
   - Au-dessus de la ligne de flottaison
   - Texte orienté action et bénéfice
   - Un seul CTA principal clair

3. **social_proof** - Preuve sociale
   - Témoignages clients avec détails (nom, photo, entreprise)
   - Logos de clients/partenaires reconnus
   - Chiffres et statistiques vérifiables
   - Avis et notes

4. **form** - Formulaire
   - Nombre de champs (moins de 5 idéalement)
   - Labels clairs et explicites
   - Indication des champs obligatoires
   - Messages d'erreur utiles

5. **visual_hierarchy** - Hiérarchie visuelle
   - Espacement suffisant entre les éléments
   - Contraste texte/fond lisible
   - Taille de police appropriée (min 16px body)
   - Structure claire avec sections distinctes

6. **trust** - Confiance
   - HTTPS actif
   - Mentions légales accessibles
   - Coordonnées de contact visibles
   - Badges de sécurité/certifications

7. **mobile** - Mobile
   - Design responsive
   - Touch targets suffisants (min 44px)
   - Texte lisible sans zoom
   - Pas de scroll horizontal

8. **speed** - Performance
   - Temps de chargement (moins de 3 secondes)
   - Images optimisées
   - Pas de ressources bloquantes

Pour chaque problème trouvé, indique :
- **severity**: "critical" (bloque la conversion), "warning" (impacte négativement), ou "info" (amélioration mineure)
- **title**: Titre court et clair du problème (max 50 caractères)
- **description**: Explication détaillée du problème et son impact
- **recommendation**: Action concrète et spécifique à prendre

Réponds UNIQUEMENT en JSON valide avec cette structure exacte (pas de markdown, pas de commentaires) :
{
  "score": <number 0-100>,
  "summary": "<string: 2-3 phrases résumant l'analyse>",
  "categories": [
    {
      "name": "<string: nom de la catégorie>",
      "label": "<string: label lisible>",
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

Sois précis, actionnable et constructif. Ne pas inventer de problèmes qui n'existent pas.

CRITICAL: Your response must be ONLY valid JSON. No markdown, no code blocks, no explanations before or after the JSON. Start with { and end with }."""

USER_PROMPT_TEMPLATE = """Analyse cette landing page pour identifier les problèmes de conversion :

**URL**: {url}
**Titre de la page**: {title}
**Meta description**: {meta_description}

**Temps de chargement**: {load_time_ms}ms
**Nombre de mots**: {word_count}
**Nombre d'images**: {image_count}
**Formulaire présent**: {has_form}

**Contenu textuel visible**:
{text_content}

**Structure HTML (résumée)**:
{html_summary}

Génère ton analyse JSON maintenant."""


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
        title=scraped.title or "Non défini",
        meta_description=scraped.meta_description or "Non définie",
        load_time_ms=scraped.load_time_ms,
        word_count=scraped.word_count,
        image_count=scraped.image_count,
        has_form="Oui" if scraped.has_form else "Non",
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
