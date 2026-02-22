# Project: Joyful Download Tool (World Bank PAD Downloader)

## Stack
- Backend: Python (Flask), `worldbank_downloader.py`, `document_renamer.py`
- Frontend: React/TypeScript (Vite)
- Python env: Python 3.13 at `C:\Users\gabri\AppData\Local\Programs\Python\Python313\python.exe`
- Run tests with: `py -3 -m pytest tests/test_pad_retrieval.py -v`

## World Bank API
- Search endpoint: `https://search.worldbank.org/api/v3/wds`
- PAD filter: `docty_exact=Project Appraisal Document`
- Project filter: `projectid=P123456`
- Response: `documents` dict (keyed by doc ID like "D40055325"), plus `total` count field, plus `facets` key to pop
- All PAD docs have `pdfurl`, `guid`, `id` fields in the response
- `pdfurl` CDN note: `documents1.worldbank.org` returns 404 for HEAD but 200 for GET — always use GET to check accessibility

## Key Findings from Testing (2026-02-21)
- App correctly finds PADs for all 7 tested projects spanning 2022–2025
- `docty_exact` filter works correctly and returns only PADs
- `pdfurl` field is always present and files are real PDFs (verified via GET + `%PDF` magic bytes)
- Very recent projects (Dec 2025, e.g. P509061) may have 0 docs indexed yet — this is expected, not a bug
- Projects with "Additional Financing" may use "Project Paper" doctype instead of "Project Appraisal Document"
- WB API can return 500 errors if hammered too fast; the app silently returns empty in this case (potential silent failure)
- `max_results=5` in app.py is safe since projects typically have exactly 1 PAD

## Test Project Ground Truth
PAD EXISTS: P173296, P178888, P180465, P181308, P502464, P504543, P507617
NO PAD (has other docs): P175404 (Project Paper), P181063 (ISRs)
NO DOCS AT ALL: P505746, P507381, P509061

## User Preferences
- Wants rigorous testing with real API calls, not mocks
- Do not over-engineer
