"""
Reports endpoints - Retrieve analysis reports.
"""

from typing import List, Optional

from fastapi import APIRouter
from fastapi.responses import JSONResponse, Response
from pydantic import BaseModel

from app.api.deps import CurrentUserID, Supabase
from app.core.errors import AuthorizationError, NotFoundError
from app.core.logging import get_logger
from app.services.pdf_generator import PDFGenerationError, generate_report_pdf

logger = get_logger(__name__)

router = APIRouter()


# Response schemas
class Issue(BaseModel):
    """A single issue found in the analysis."""
    severity: str  # critical, warning, info
    title: str
    description: str
    recommendation: str


class Category(BaseModel):
    """A category score with issues."""
    name: str
    label: str
    score: int
    issues: List[Issue]


class PageMetadata(BaseModel):
    """Metadata about the analyzed page."""
    title: Optional[str] = None
    load_time_ms: Optional[int] = None
    word_count: Optional[int] = None
    image_count: Optional[int] = None


class ReportData(BaseModel):
    """Full report data."""
    id: str
    analysis_id: str
    url: str
    score: int
    summary: str
    categories: List[Category]
    screenshot_url: Optional[str] = None
    page_metadata: Optional[PageMetadata] = None
    created_at: str


class SingleReportResponse(BaseModel):
    """Single report response."""
    success: bool = True
    data: ReportData


class ReportListItem(BaseModel):
    """Report list item (summary)."""
    id: str
    analysis_id: str
    url: str
    score: int
    summary: str
    created_at: str


class ReportListResponse(BaseModel):
    """List of reports response."""
    success: bool = True
    data: List[ReportListItem]
    meta: dict


@router.get("", response_model=ReportListResponse)
async def list_reports(
    user_id: CurrentUserID,
    supabase: Supabase,
    limit: int = 20,
    offset: int = 0,
):
    """
    List user's reports with pagination.
    
    Returns summary information for each report.
    """
    reports, total = await supabase.list_reports(
        user_id=user_id,
        limit=limit,
        offset=offset,
    )
    
    return ReportListResponse(
        data=[
            ReportListItem(
                id=r["id"],
                analysis_id=r["analysis_id"],
                url=r["analyses"]["url"] if r.get("analyses") else "",
                score=r["score"],
                summary=r["summary"],
                created_at=r["created_at"],
            )
            for r in reports
        ],
        meta={
            "limit": limit,
            "offset": offset,
            "total": total,
        }
    )


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


@router.get("/{report_id}/pdf")
async def download_report_pdf(report_id: str, user_id: CurrentUserID, supabase: Supabase):
    """
    Download a report as PDF.

    Requires a Pro or Agency plan.
    """
    # Check user plan
    profile = await supabase.get_profile(user_id)
    if not profile or profile.get("plan", "free") == "free":
        raise AuthorizationError("PDF export requires a Pro or Agency plan. Please upgrade to access this feature.")

    # Verify ownership and fetch report
    report = await supabase.get_report(report_id, user_id)
    if not report:
        raise NotFoundError("Report")

    try:
        pdf_bytes = await generate_report_pdf(report)
    except PDFGenerationError as exc:
        logger.error("pdf_download_failed", report_id=report_id, user_id=user_id, error=str(exc))
        return JSONResponse(
            status_code=500,
            content={
                "success": False,
                "error": {
                    "code": "PDF_GENERATION_ERROR",
                    "message": "Failed to generate PDF report. Please try again later.",
                    "details": {},
                },
            },
        )

    logger.info("pdf_downloaded", report_id=report_id, user_id=user_id)

    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f"attachment; filename=leak-detector-report-{report_id[:8]}.pdf",
        },
    )


@router.get("/{report_id}", response_model=SingleReportResponse)
async def get_report(report_id: str, user_id: CurrentUserID, supabase: Supabase):
    """
    Get a specific report by ID.

    Returns the full report with all categories and issues.
    """
    report = await supabase.get_report(report_id, user_id)
    if not report:
        raise NotFoundError("Report")
    return SingleReportResponse(data=_build_report_data(report))


@router.get("/by-analysis/{analysis_id}", response_model=SingleReportResponse)
async def get_report_by_analysis(analysis_id: str, user_id: CurrentUserID, supabase: Supabase):
    """
    Get a report by its analysis ID.

    Useful when polling for analysis completion.
    """
    report = await supabase.get_report_by_analysis(analysis_id, user_id)
    if not report:
        raise NotFoundError("Report")
    return SingleReportResponse(data=_build_report_data(report))
