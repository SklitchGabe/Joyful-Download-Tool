import os
import requests
import json
from tqdm import tqdm
import argparse
from concurrent.futures import ThreadPoolExecutor
import time
from datetime import datetime

class WorldBankDocDownloader:
    """Tool to bulk download documents from the World Bank API."""
    
    BASE_URL = "https://search.worldbank.org/api/v3/wds"
    DOWNLOAD_BASE_URL = "https://documents.worldbank.org"
    
    def __init__(self, output_dir="downloads", max_workers=5, rate_limit=1):
        """Initialize the downloader with configuration options."""
        self.output_dir = output_dir
        self.max_workers = max_workers
        self.rate_limit = rate_limit
        
        # Create output directory if it doesn't exist
        os.makedirs(output_dir, exist_ok=True)
    
    def search_documents(self, query="", doc_type=None, country=None, topic=None, 
                        from_date=None, to_date=None, language=None, max_results=100):
        """Search for documents using World Bank API"""
        documents = []
        page = 1
        rows_per_page = min(max_results, 100)  # API limit is 100 per page
        
        # Build filter parameters
        filters = {}
        
        if country and country.strip():
            filters['country'] = country
            
        if topic and topic.strip():
            filters['topicval'] = topic
            
        if doc_type and doc_type.strip():
            filters['doctype'] = doc_type
            
        if language and language.strip():
            filters['language'] = language
            
        # Handle date range
        if from_date or to_date:
            date_range = []
            
            if from_date:
                date_range.append(from_date)
            else:
                date_range.append('1900-01-01')  # Default start date
                
            if to_date:
                date_range.append(to_date)
            else:
                date_range.append(datetime.now().strftime('%Y-%m-%d'))  # Default end date
                
            # Format date range as proper query parameter
            filters['frmdt'] = date_range[0]
            filters['todt'] = date_range[1]
            
        print(f"Fetching document metadata:", end=' ')
        with tqdm(total=None, unit='page') as pbar:
            while len(documents) < max_results:
                try:
                    # Build the API request parameters
                    params = {
                        'format': 'json',
                        'q': query,  # Changed from qterm to q
                        'rows': rows_per_page,
                        'page': page
                    }
                    
                    # Add filters to the params
                    params.update(filters)
                    
                    # Make the API request
                    response = requests.get(self.BASE_URL, params=params)
                    response.raise_for_status()
                    data = response.json()
                    
                    # Extract results
                    results = data.get('documents', [])
                    if not results:
                        break
                        
                    documents.extend(results)
                    page += 1
                    pbar.update(1)
                    
                    # Check if we've reached the last page
                    if len(results) < rows_per_page:
                        break
                        
                except Exception as e:
                    print(f"Error fetching page {page}: {str(e)}")
                    break
                    
        # Trim to max_results
        documents = documents[:max_results]
        print(f"Found {len(documents)} documents")
        return documents
    
    def download_document(self, doc):
        """Download a single document with format fallback (PDF → DOCX → DOC → TIFF)."""
        try:
            # Extract document information
            doc_id = doc.get("id")
            title = doc.get("display_title", doc.get("title", "Unknown"))
            
            # Define format preference order
            format_preferences = ["pdf", "docx", "doc", "tiff"]
            
            for file_format in format_preferences:
                try:
                    # Construct URL for this format
                    file_url = None
                    
                    # First try from document metadata
                    if "pdfurl" in doc and file_format == "pdf":
                        file_url = doc["pdfurl"]
                    elif "guid" in doc and doc["guid"]:
                        # Construct URL based on format
                        guid = doc["guid"]
                        file_url = f"http://documents.worldbank.org/curated/en/{guid}/{file_format}/document.{file_format}"
                    
                    # If no direct URL, try to extract from the document page (for PDF only currently)
                    if not file_url and file_format == "pdf" and "url" in doc:
                        doc_page_url = doc["url"]
                        print(f"No direct URL found. Trying to extract from document page: {doc_page_url}")
                        
                        try:
                            # Download the document page
                            response = requests.get(doc_page_url)
                            response.raise_for_status()
                            html_content = response.text
                            
                            # Extract the document ID/GUID from the canonical URL
                            import re
                            canonical_match = re.search(r'<link rel="canonical" href="[^"]+/en/(\d+)"', html_content)
                            if canonical_match:
                                guid = canonical_match.group(1)
                                file_url = f"http://documents.worldbank.org/curated/en/{guid}/{file_format}/document.{file_format}"
                            else:
                                # Try to find URL directly in the HTML
                                format_match = re.search(rf'href="([^"]+\.{file_format})"', html_content)
                                if format_match:
                                    file_url = format_match.group(1)
                                    if not file_url.startswith('http'):
                                        file_url = f"https://documents.worldbank.org{file_url}"
                        except Exception as e:
                            print(f"Error extracting URL from document page: {str(e)}")
                    
                    if not file_url:
                        # Try next format
                        continue
                    
                    # Create filename with appropriate extension
                    safe_title = "".join(c if c.isalnum() else "_" for c in title)
                    filename = f"{doc_id}_{safe_title[:50]}.{file_format}"
                    file_path = os.path.join(self.output_dir, filename)
                    
                    # Download the file
                    response = requests.get(file_url, stream=True)
                    
                    # Skip to next format if file not found or other error
                    if response.status_code != 200:
                        print(f"Format {file_format} not available (status: {response.status_code})")
                        continue
                    
                    # Check content type for validation
                    content_type = response.headers.get('content-type', '').lower()
                    content_type_valid = False
                    
                    # Validate content type based on format
                    if file_format == 'pdf' and ('application/pdf' in content_type or 'pdf' in content_type):
                        content_type_valid = True
                    elif file_format == 'docx' and ('application/vnd.openxmlformats-officedocument.wordprocessingml.document' in content_type):
                        content_type_valid = True
                    elif file_format == 'doc' and ('application/msword' in content_type):
                        content_type_valid = True
                    elif file_format == 'tiff' and ('image/tiff' in content_type):
                        content_type_valid = True
                    
                    if not content_type_valid:
                        print(f"Warning: Document {doc_id} may not be a {file_format.upper()} (content-type: {content_type})")
                    
                    # Download the file
                    total_size = int(response.headers.get('content-length', 0))
                    with open(file_path, 'wb') as f:
                        with tqdm(total=total_size, unit='B', unit_scale=True, 
                                 desc=f"Downloading {filename}", leave=False) as pbar:
                            for chunk in response.iter_content(chunk_size=8192):
                                if chunk:
                                    f.write(chunk)
                                    pbar.update(len(chunk))
                    
                    # Format-specific file validation
                    valid_file = False
                    
                    if file_format == 'pdf':
                        # Validate PDF header
                        with open(file_path, 'rb') as f:
                            header = f.read(4)
                            if header == b'%PDF':
                                valid_file = True
                    elif file_format == 'docx':
                        # Basic check for DOCX (ZIP archive with specific structure)
                        with open(file_path, 'rb') as f:
                            header = f.read(4)
                            if header == b'PK\x03\x04':
                                valid_file = True
                    elif file_format == 'doc':
                        # Basic check for DOC magic number
                        with open(file_path, 'rb') as f:
                            header = f.read(8)
                            if header[:2] == b'\xD0\xCF':
                                valid_file = True
                    elif file_format == 'tiff':
                        # Check TIFF header
                        with open(file_path, 'rb') as f:
                            header = f.read(4)
                            if header == b'II*\x00' or header == b'MM\x00*':
                                valid_file = True
                    
                    if not valid_file:
                        print(f"Downloaded file is not a valid {file_format.upper()}")
                        os.remove(file_path)
                        continue
                    
                    # If we got here, we have a valid file
                    return {
                        "success": True, 
                        "doc_id": doc_id, 
                        "path": file_path,
                        "format": file_format
                    }
                    
                except Exception as e:
                    print(f"Error trying {file_format} format for document {doc_id}: {str(e)}")
                    continue
            
            # If we get here, all formats failed
            return {"success": False, "doc_id": doc_id, "error": "Could not download document in any supported format"}
            
        except Exception as e:
            return {"success": False, "doc_id": doc.get("id", "unknown"), "error": str(e)}
    
    def bulk_download(self, documents):
        """Download multiple documents in parallel."""
        results = {"success": [], "failed": []}
        
        with tqdm(total=len(documents), desc="Downloading documents") as pbar:
            with ThreadPoolExecutor(max_workers=self.max_workers) as executor:
                future_to_doc = {executor.submit(self.download_document, doc): doc for doc in documents}
                
                for future in future_to_doc:
                    result = future.result()
                    if result["success"]:
                        results["success"].append(result)
                    else:
                        results["failed"].append(result)
                    pbar.update(1)
                    
                    # Honor rate limits between downloads
                    time.sleep(self.rate_limit)
        
        return results
    
    def search_by_project_ids(self, project_ids, doc_type=None, max_results=100, rate_limit=1):
        """Search for documents related to specific project IDs."""
        all_documents = {}
        
        for project_id in tqdm(project_ids, desc="Processing project IDs"):
            # Initialize parameters
            params = {
                "format": "json",
                "rows": 50,  # Results per page
                "projectid": project_id
            }
            
            # Add document type filter if specified
            if doc_type:
                params["docty"] = doc_type
                params["query"] = f"\"{doc_type}\""
                
                print(f"Searching for document type: {doc_type} for project {project_id}")
                print(f"Using parameters: {params}")
                
            documents = self._fetch_documents(params, max_results, rate_limit)
            all_documents[project_id] = documents
            
            # Honor rate limits between projects
            time.sleep(rate_limit)
            
        return all_documents
    
    def _fetch_documents(self, params, max_results=100, rate_limit=1):
        """Helper method to fetch documents using pagination."""
        all_documents = []
        page = 0  # API uses 0-based pagination with 'os' parameter
        
        with tqdm(desc=f"Fetching documents", unit="page", leave=False) as pbar:
            while len(all_documents) < max_results:
                # Update pagination parameter
                params["os"] = page * params.get("rows", 50)
                
                try:
                    response = requests.get(self.BASE_URL, params=params)
                    response.raise_for_status()
                    data = response.json()
                    
                    # Extract document info - v3 API response structure
                    # The documents field is a dictionary, not a list
                    documents_dict = data.get("documents", {})
                    
                    # Skip the 'facets' key if it exists
                    if 'facets' in documents_dict:
                        documents_dict.pop('facets')
                    
                    if not documents_dict:
                        print(f"No documents found on page {page}")
                        break  # No more results
                    
                    # Convert dictionary to list of documents with ID included
                    documents = []
                    for doc_id, doc_data in documents_dict.items():
                        # Ensure the ID is included in the document data
                        if 'id' not in doc_data and doc_id.startswith('D'):
                            # If the key is like 'D12345678', extract the numeric part
                            doc_data['id'] = doc_id[1:] if doc_id.startswith('D') else doc_id
                        documents.append(doc_data)
                    
                    # Debug: Print the first document structure
                    if documents and len(documents) > 0:
                        print(f"First document keys: {list(documents[0].keys())}")
                        
                    # Add documents to our collection
                    remaining = max_results - len(all_documents)
                    for i, doc in enumerate(documents):
                        if i >= remaining:
                            break
                        all_documents.append(doc)
                    
                    if len(documents) < params.get("rows", 50):
                        # If we got fewer documents than requested, we've reached the end
                        break
                    
                    page += 1
                    pbar.update(1)
                    
                    # Honor rate limits
                    time.sleep(rate_limit)
                    
                except Exception as e:
                    print(f"Error fetching results: {str(e)}")
                    # Print more detailed error information
                    import traceback
                    traceback.print_exc()
                    break
            
            print(f"Total documents found: {len(all_documents)}")
        return all_documents
    
    def bulk_download_by_projects(self, project_documents):
        """Download documents organized by project ID.
        
        Args:
            project_documents: Dictionary mapping project IDs to document lists
            
        Returns:
            Dictionary with download results by project ID
        """
        results = {}
        
        for project_id, documents in project_documents.items():
            print(f"Downloading {len(documents)} documents for project {project_id}")
            project_results = self.bulk_download(documents)
            results[project_id] = project_results
            
        return results

def main():
    """Command line interface for the document downloader."""
    parser = argparse.ArgumentParser(description="Download documents from the World Bank API")
    
    # Create subparsers for different modes
    subparsers = parser.add_subparsers(dest='command', help='Command')
    
    # General search parser (existing functionality)
    search_parser = subparsers.add_parser('search', help='Search and download by keywords')
    
    # Add existing arguments to search parser
    search_parser.add_argument("--query", type=str, default="", help="Search query")
    search_parser.add_argument("--country", type=str, help="Country code")
    search_parser.add_argument("--topic", type=str, help="Topic code")
    search_parser.add_argument("--doc-type", type=str, help="Document type")
    search_parser.add_argument("--from-date", type=str, help="Start date (YYYY-MM-DD)")
    search_parser.add_argument("--to-date", type=str, help="End date (YYYY-MM-DD)")
    search_parser.add_argument("--language", type=str, help="Language code")
    search_parser.add_argument("--max-results", type=int, default=100, help="Maximum number of documents to download")
    
    # Project-based parser (new functionality)
    project_parser = subparsers.add_parser('project', help='Download documents by project IDs')
    project_parser.add_argument("--project-ids", type=str, nargs='+', help="List of project IDs")
    project_parser.add_argument("--project-file", type=str, help="File containing project IDs (one per line)")
    project_parser.add_argument("--doc-type", type=str, help="Document type filter")
    project_parser.add_argument("--max-per-project", type=int, default=100, help="Maximum documents per project")
    
    # Common parameters for both modes
    parser.add_argument("--output-dir", type=str, default="downloads", help="Directory to save downloads")
    parser.add_argument("--workers", type=int, default=5, help="Number of parallel downloads")
    parser.add_argument("--rate-limit", type=float, default=1.0, help="Sleep time between requests")
    
    args = parser.parse_args()
    
    # Initialize downloader
    downloader = WorldBankDocDownloader(
        output_dir=args.output_dir,
        max_workers=args.workers,
        rate_limit=args.rate_limit
    )
    
    if args.command == 'search':
        # Existing search functionality
        print(f"Searching for documents with query: '{args.query}'")
        documents = downloader.search_documents(
            query=args.query,
            country=args.country,
            topic=args.topic,
            doc_type=args.doc_type,
            from_date=args.from_date,
            to_date=args.to_date,
            language=args.language,
            max_results=args.max_results
        )
        
        if not documents:
            print("No documents found matching your criteria.")
            return
        
        # Download documents
        print(f"Downloading {len(documents)} documents...")
        results = downloader.bulk_download(documents)
        
        # Report results
        print(f"\nDownload complete!")
        print(f"Successfully downloaded: {len(results['success'])} documents")
        print(f"Failed downloads: {len(results['failed'])} documents")
        
        if results['failed']:
            print("\nFailed downloads:")
            for fail in results['failed']:
                print(f"  - Document ID {fail['doc_id']}: {fail['error']}")
    
    elif args.command == 'project':
        # New project-based functionality
        project_ids = []
        
        # Get project IDs from command line or file
        if args.project_ids:
            project_ids.extend(args.project_ids)
        
        if args.project_file:
            try:
                with open(args.project_file, 'r') as f:
                    file_ids = [line.strip() for line in f if line.strip()]
                    project_ids.extend(file_ids)
            except Exception as e:
                print(f"Error reading project file: {str(e)}")
                return
        
        if not project_ids:
            print("No project IDs provided. Use --project-ids or --project-file.")
            return
        
        print(f"Processing {len(project_ids)} project IDs...")
        project_documents = downloader.search_by_project_ids(
            project_ids=project_ids,
            doc_type=args.doc_type,
            max_results=args.max_per_project,
            rate_limit=args.rate_limit
        )
        
        # Count total documents found
        total_docs = sum(len(docs) for docs in project_documents.values())
        print(f"Found {total_docs} documents across {len(project_ids)} projects")
        
        if total_docs == 0:
            print("No documents found matching your criteria.")
            return
            
        # Download documents by project
        results = downloader.bulk_download_by_projects(project_documents)
        
        # Aggregate and report results
        total_success = sum(len(res.get('success', [])) for res in results.values())
        total_failed = sum(len(res.get('failed', [])) for res in results.values())
        
        print(f"\nDownload complete!")
        print(f"Successfully downloaded: {total_success} documents")
        print(f"Failed downloads: {total_failed} documents")
        
        if total_failed > 0:
            print("\nFailed downloads by project:")
            for project_id, res in results.items():
                failed = res.get('failed', [])
                if failed:
                    print(f"Project {project_id}: {len(failed)} failures")
                    for fail in failed[:5]:  # Show only first 5 failures per project
                        print(f"  - Document ID {fail['doc_id']}: {fail['error']}")
                    if len(failed) > 5:
                        print(f"  - ... and {len(failed) - 5} more")
    
    else:
        parser.print_help()

if __name__ == "__main__":
    main() 