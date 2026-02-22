"""
Tests for World Bank PAD retrieval completeness.

Strategy:
  - Establish ground truth via direct WB API calls.
  - Compare against what WorldBankDocDownloader.search_by_project_ids returns.
  - Verify pdfurl fields are present and HTTP-accessible.

Ground truth verified before writing (all via direct API on 2026-02-21):
  PAD EXISTS (total=1):  P173296, P178888, P180465, P181308, P502464, P504543, P507617
  NO PAD, HAS OTHER DOCS: P175404 (Project Paper), P181063 (ISRs, Procurement)
  NO DOCS AT ALL:         P505746, P507381, P509061
"""

import sys
import os
import time
import pytest
import requests

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "backend"))
from worldbank_downloader import WorldBankDocDownloader

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------
API_URL = "https://search.worldbank.org/api/v3/wds"
PAD_DOCTYPE = "Project Appraisal Document"

# Projects with exactly 1 confirmed public PAD (verified via direct API)
PROJECTS_WITH_PAD = [
    "P173296",  # 2022 board-approved, Active
    "P178888",  # 2022 board-approved, Active
    "P180465",  # 2023 board-approved, Active
    "P181308",  # 2023 board-approved, Active
    "P502464",  # 2024 board-approved, Active
    "P504543",  # 2025 board-approved, Active (Brazil Electromobility)
    "P507617",  # 2025 board-approved, Active (Chad MSME)
]

# Projects with no public PAD (some have other doc types, some have nothing)
PROJECTS_WITHOUT_PAD = [
    "P175404",  # Has 3 docs but none are PADs (Additional Financing; has Project Paper)
    "P181063",  # Has 35 docs (ISRs, Procurement Plans) but no PAD
    "P509061",  # Brand-new (Dec 2025) - zero documents indexed yet
]


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _direct_api_pad_total(project_id: str) -> int:
    """Return the `total` count the API reports for PADs of a given project."""
    resp = requests.get(
        API_URL,
        params={"format": "json", "projectid": project_id,
                "docty_exact": PAD_DOCTYPE, "rows": 1},
        timeout=30,
    )
    resp.raise_for_status()
    return int(resp.json().get("total", 0))


def _direct_api_pad_docs(project_id: str) -> list:
    """Return all PAD doc dicts from a direct API call (up to 50)."""
    resp = requests.get(
        API_URL,
        params={"format": "json", "projectid": project_id,
                "docty_exact": PAD_DOCTYPE, "rows": 50, "os": 0},
        timeout=30,
    )
    resp.raise_for_status()
    docs_dict = resp.json().get("documents", {})
    docs_dict.pop("facets", None)
    return list(docs_dict.values())


@pytest.fixture(scope="module")
def downloader():
    return WorldBankDocDownloader()


# ---------------------------------------------------------------------------
# 1. Detection: app finds PADs for confirmed projects
# ---------------------------------------------------------------------------

class TestPADDetection:
    """App must find at least one PAD for every project confirmed to have one."""

    @pytest.mark.parametrize("project_id", PROJECTS_WITH_PAD)
    def test_finds_pad(self, downloader, project_id):
        result = downloader.search_by_project_ids(
            [project_id], doc_type=PAD_DOCTYPE, max_results=10
        )
        docs = result.get(project_id, [])
        assert len(docs) > 0, (
            f"App returned 0 PADs for {project_id}, but the API confirms a PAD exists."
        )

    @pytest.mark.parametrize("project_id", PROJECTS_WITHOUT_PAD)
    def test_no_pad_returns_empty(self, downloader, project_id):
        result = downloader.search_by_project_ids(
            [project_id], doc_type=PAD_DOCTYPE, max_results=10
        )
        docs = result.get(project_id, [])
        assert docs == [], (
            f"App returned {len(docs)} doc(s) for {project_id}, but none should be PADs."
        )


# ---------------------------------------------------------------------------
# 2. Completeness: app count matches API total
# ---------------------------------------------------------------------------

class TestCompleteness:
    """App must not miss any PAD that the API reports as available."""

    @pytest.mark.parametrize("project_id", PROJECTS_WITH_PAD)
    def test_count_matches_api(self, downloader, project_id):
        api_total = _direct_api_pad_total(project_id)
        # Guard: if API shows 0 at test runtime (e.g., document pulled), skip
        if api_total == 0:
            pytest.skip(f"API reports 0 PADs for {project_id} at test runtime")

        # Use generous max_results to avoid artificial truncation
        result = downloader.search_by_project_ids(
            [project_id], doc_type=PAD_DOCTYPE, max_results=50
        )
        app_count = len(result.get(project_id, []))
        assert app_count == api_total, (
            f"Completeness failure for {project_id}: "
            f"app found {app_count}, API reports total={api_total}"
        )

    def test_app_max_results_5_does_not_miss_typical_pad(self, downloader):
        """
        app.py uses max_results=5 for the PAD search endpoint.
        For typical projects with 1 PAD this must still find it.
        """
        project_id = "P507617"  # known single PAD
        result = downloader.search_by_project_ids(
            [project_id], doc_type=PAD_DOCTYPE, max_results=5
        )
        assert len(result.get(project_id, [])) >= 1, (
            "max_results=5 caused the single PAD to be missed"
        )


# ---------------------------------------------------------------------------
# 3. Document structure: returned docs have fields needed for download
# ---------------------------------------------------------------------------

class TestDocumentStructure:
    """PAD documents returned by the app must have the fields download_document needs."""

    @pytest.mark.parametrize("project_id", PROJECTS_WITH_PAD)
    def test_pad_has_pdfurl(self, downloader, project_id):
        result = downloader.search_by_project_ids(
            [project_id], doc_type=PAD_DOCTYPE, max_results=10
        )
        for doc in result.get(project_id, []):
            assert "pdfurl" in doc and doc["pdfurl"], (
                f"Missing/empty pdfurl in PAD for {project_id}"
            )

    @pytest.mark.parametrize("project_id", PROJECTS_WITH_PAD)
    def test_pad_doctype_field_correct(self, downloader, project_id):
        """The `docty` field on returned docs must equal the filter we applied."""
        result = downloader.search_by_project_ids(
            [project_id], doc_type=PAD_DOCTYPE, max_results=10
        )
        for doc in result.get(project_id, []):
            assert doc.get("docty") == PAD_DOCTYPE, (
                f"Returned doc for {project_id} has docty={doc.get('docty')!r}, "
                f"expected {PAD_DOCTYPE!r}"
            )

    @pytest.mark.parametrize("project_id", PROJECTS_WITH_PAD)
    def test_pad_has_id_field(self, downloader, project_id):
        result = downloader.search_by_project_ids(
            [project_id], doc_type=PAD_DOCTYPE, max_results=10
        )
        for doc in result.get(project_id, []):
            assert doc.get("id"), f"Missing 'id' field in PAD doc for {project_id}"


# ---------------------------------------------------------------------------
# 4. Download URL accessibility (GET requests, reading only the PDF header)
# ---------------------------------------------------------------------------
# Note: The World Bank CDN (documents1.worldbank.org) returns 404 for HEAD
# requests on newer documents even when the file exists. This is a known
# CDN limitation. The app uses GET, which works correctly; so these tests
# also use GET and verify the PDF magic bytes ("%PDF").
#
# We fetch the pdfurl directly from the API (not through the downloader) to
# avoid redundant search API calls that could trigger rate limiting.

class TestDownloadURLs:
    """pdfurl from the WB API must be accessible via GET and be a valid PDF."""

    @pytest.mark.parametrize("project_id", ["P507617", "P504543", "P502464"])
    def test_pdfurl_downloadable_via_get(self, project_id):
        # Get pdfurl straight from the API - no need to go through the downloader
        docs = _direct_api_pad_docs(project_id)
        assert docs, f"Direct API found no PADs for {project_id}"
        time.sleep(1)  # brief pause between URL checks
        for doc in docs:
            url = doc.get("pdfurl")
            assert url, f"No pdfurl in API response for {project_id}"
            resp = requests.get(url, timeout=30, allow_redirects=True, stream=True)
            assert resp.status_code == 200, (
                f"GET pdfurl for {project_id} returned HTTP {resp.status_code}: {url}"
            )
            # Accumulate enough bytes to check the 4-byte PDF magic number.
            # chunk_size=4 can return fewer bytes on streaming responses,
            # so collect until we have at least 4.
            raw = b""
            for chunk in resp.iter_content(chunk_size=128):
                raw += chunk
                if len(raw) >= 4:
                    break
            resp.close()
            assert raw[:4] == b"%PDF", (
                f"pdfurl for {project_id} is not a PDF (header={raw[:4]!r}): {url}"
            )


# ---------------------------------------------------------------------------
# 5. Multi-project call: all IDs present in result dict
# ---------------------------------------------------------------------------

class TestMultiProjectCall:
    """Searching multiple project IDs in one call must return results for all of them."""

    def test_all_input_ids_in_result(self, downloader):
        ids = ["P504543", "P507617", "P509061"]
        result = downloader.search_by_project_ids(
            ids, doc_type=PAD_DOCTYPE, max_results=10
        )
        for pid in ids:
            assert pid in result, f"Result dict missing key for {pid}"

    def test_mixed_batch_correctness(self, downloader):
        """In a mixed batch, PAD projects get docs and no-PAD projects get empty."""
        result = downloader.search_by_project_ids(
            ["P504543", "P507617", "P509061"],
            doc_type=PAD_DOCTYPE,
            max_results=10,
        )
        assert len(result["P504543"]) >= 1, "P504543 should have a PAD"
        assert len(result["P507617"]) >= 1, "P507617 should have a PAD"
        assert result["P509061"] == [], "P509061 should have no PAD"


# ---------------------------------------------------------------------------
# 6. Cross-check: app docs agree with direct API docs (IDs match)
# ---------------------------------------------------------------------------

class TestAPIAgreement:
    """
    For each confirmed PAD project, the document IDs returned by the app
    must match those returned by a direct API call.
    """

    @pytest.mark.parametrize("project_id", ["P507617", "P504543", "P502464"])
    def test_document_ids_match_api(self, downloader, project_id):
        api_docs = _direct_api_pad_docs(project_id)
        api_ids = {str(d.get("id")) for d in api_docs}

        result = downloader.search_by_project_ids(
            [project_id], doc_type=PAD_DOCTYPE, max_results=50
        )
        app_ids = {str(d.get("id")) for d in result.get(project_id, [])}

        missing_from_app = api_ids - app_ids
        assert not missing_from_app, (
            f"App missed PAD doc IDs for {project_id}: {missing_from_app}"
        )
