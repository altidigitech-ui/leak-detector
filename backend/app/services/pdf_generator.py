"""
PDF report generator using WeasyPrint.

Generates a styled PDF from a report dict (as returned by SupabaseService.get_report).
"""

from datetime import datetime
from typing import Any, Dict, List

from weasyprint import HTML

from app.core.logging import get_logger

logger = get_logger(__name__)


def _score_color(score: int) -> str:
    """Return a hex color based on score thresholds."""
    if score >= 80:
        return "#22c55e"
    if score >= 60:
        return "#f59e0b"
    return "#ef4444"


def _score_bg(score: int) -> str:
    """Return a light background color based on score thresholds."""
    if score >= 80:
        return "#f0fdf4"
    if score >= 60:
        return "#fffbeb"
    return "#fef2f2"


def _severity_styles(severity: str) -> Dict[str, str]:
    """Return color and background for a severity level."""
    if severity == "critical":
        return {"color": "#dc2626", "bg": "#fef2f2", "border": "#fecaca", "label": "Critical"}
    if severity == "warning":
        return {"color": "#d97706", "bg": "#fffbeb", "border": "#fde68a", "label": "Warning"}
    return {"color": "#2563eb", "bg": "#eff6ff", "border": "#bfdbfe", "label": "Info"}


def _build_issues_html(issues: List[Dict[str, Any]]) -> str:
    """Build HTML for a list of issues."""
    if not issues:
        return '<p style="color: #16a34a; text-align: center; padding: 16px 0;">No issues found in this category.</p>'

    parts = []
    for issue in issues:
        severity = issue.get("severity", "info")
        styles = _severity_styles(severity)
        parts.append(f"""
        <div style="background: {styles['bg']}; border: 1px solid {styles['border']};
                    border-radius: 8px; padding: 16px; margin-bottom: 12px;">
          <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
            <span style="font-weight: 600; font-size: 14px;">{issue.get('title', '')}</span>
            <span style="background: {styles['color']}; color: white; font-size: 11px;
                         padding: 2px 8px; border-radius: 10px; font-weight: 500;">
              {styles['label']}
            </span>
          </div>
          <p style="font-size: 13px; color: #374151; margin: 0 0 12px 0;">{issue.get('description', '')}</p>
          <div style="background: white; border-radius: 6px; padding: 12px;">
            <p style="font-size: 12px; font-weight: 600; color: #4b5563; margin: 0 0 4px 0;">Recommendation</p>
            <p style="font-size: 13px; color: #374151; margin: 0;">{issue.get('recommendation', '')}</p>
          </div>
        </div>
        """)
    return "\n".join(parts)


def _build_categories_html(categories: List[Dict[str, Any]]) -> str:
    """Build HTML for all categories."""
    parts = []
    for cat in categories:
        name = cat.get("label", cat.get("name", ""))
        score = cat.get("score", 0)
        color = _score_color(score)
        bg = _score_bg(score)
        issues_html = _build_issues_html(cat.get("issues", []))

        parts.append(f"""
        <div style="margin-bottom: 32px; page-break-inside: avoid;">
          <div style="display: flex; justify-content: space-between; align-items: center;
                      margin-bottom: 16px;">
            <h3 style="font-size: 18px; font-weight: 600; color: #111827; margin: 0;">
              {name}
            </h3>
            <span style="background: {bg}; color: {color}; padding: 4px 14px;
                         border-radius: 16px; font-size: 14px; font-weight: 600;">
              {score}/100
            </span>
          </div>
          <div style="background: #e5e7eb; border-radius: 6px; height: 8px; margin-bottom: 16px;">
            <div style="background: {color}; height: 8px; border-radius: 6px;
                        width: {score}%;"></div>
          </div>
          {issues_html}
        </div>
        """)
    return "\n".join(parts)


def _build_html(report: Dict[str, Any]) -> str:
    """Build the full HTML document for the PDF."""
    score = report.get("score", 0)
    summary = report.get("summary", "")
    categories = report.get("categories", [])
    created_at = report.get("created_at", "")
    url = ""
    if report.get("analyses"):
        url = report["analyses"].get("url", "")

    # Format date
    date_str = ""
    if created_at:
        try:
            dt = datetime.fromisoformat(created_at.replace("Z", "+00:00"))
            date_str = dt.strftime("%B %d, %Y at %H:%M")
        except (ValueError, AttributeError):
            date_str = created_at

    score_color = _score_color(score)
    categories_html = _build_categories_html(categories)

    return f"""<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    @page {{
      size: A4;
      margin: 24mm 20mm;
      @bottom-center {{
        content: "Page " counter(page) " of " counter(pages);
        font-size: 10px;
        color: #9ca3af;
      }}
    }}
    * {{
      box-sizing: border-box;
    }}
    body {{
      font-family: system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;
      color: #111827;
      font-size: 14px;
      line-height: 1.6;
      margin: 0;
      padding: 0;
    }}
  </style>
</head>
<body>
  <!-- Header -->
  <div style="border-bottom: 2px solid #e5e7eb; padding-bottom: 20px; margin-bottom: 32px;">
    <div style="display: flex; justify-content: space-between; align-items: flex-start;">
      <div>
        <h1 style="font-size: 24px; font-weight: 700; color: #2563eb; margin: 0 0 4px 0;">
          Leak Detector
        </h1>
        <p style="font-size: 13px; color: #6b7280; margin: 0;">Landing Page Analysis Report</p>
      </div>
      <div style="text-align: right;">
        <p style="font-size: 13px; color: #6b7280; margin: 0 0 4px 0;">{date_str}</p>
      </div>
    </div>
    <p style="font-size: 13px; color: #374151; margin: 12px 0 0 0; word-break: break-all;">
      <strong>URL:</strong> {url}
    </p>
  </div>

  <!-- Score -->
  <div style="text-align: center; margin-bottom: 32px;">
    <div style="display: inline-block; width: 120px; height: 120px; border-radius: 50%;
                border: 8px solid {score_color}; line-height: 104px; text-align: center;">
      <span style="font-size: 42px; font-weight: 700; color: {score_color};">{score}</span>
    </div>
    <p style="font-size: 14px; color: #6b7280; margin: 8px 0 0 0;">Overall Score</p>
  </div>

  <!-- Summary -->
  <div style="background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px;
              padding: 20px; margin-bottom: 32px;">
    <h2 style="font-size: 18px; font-weight: 600; margin: 0 0 12px 0;">Summary</h2>
    <p style="color: #374151; margin: 0; line-height: 1.7;">{summary}</p>
  </div>

  <!-- Categories -->
  <h2 style="font-size: 20px; font-weight: 600; margin: 0 0 24px 0; color: #111827;">
    Detailed Analysis
  </h2>
  {categories_html}

  <!-- Footer -->
  <div style="border-top: 1px solid #e5e7eb; padding-top: 16px; margin-top: 40px;
              text-align: center;">
    <p style="font-size: 12px; color: #9ca3af; margin: 0;">
      Generated by Leak Detector &mdash; leakdetector.tech
    </p>
  </div>
</body>
</html>"""


async def generate_report_pdf(report: Dict[str, Any]) -> bytes:
    """Generate a PDF from a report dict.

    Args:
        report: Report dict as returned by SupabaseService.get_report
                (includes nested 'analyses' with 'url').

    Returns:
        PDF file content as bytes.
    """
    report_id = report.get("id", "unknown")
    logger.info("pdf_generation_started", report_id=report_id)

    html_content = _build_html(report)
    pdf_bytes = HTML(string=html_content).write_pdf()

    logger.info("pdf_generation_completed", report_id=report_id, size_bytes=len(pdf_bytes))
    return pdf_bytes
