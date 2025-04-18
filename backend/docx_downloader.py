import os
import requests
import json
from tqdm import tqdm
import argparse
from concurrent.futures import ThreadPoolExecutor
import time
from datetime import datetime
from worldbank_downloader import WorldBankDocDownloader

class DocxDownloader(WorldBankDocDownloader):
    """Tool to bulk download DOCX documents from the World Bank API."""
    
    def __init__(self, output_dir="downloads", max_workers=5, rate_limit=1):
        """Initialize the downloader with configuration options."""
        super().__init__(output_dir, max_workers, rate_limit)
        
    def download_document(self, doc):
        """Download a single document with format preference for DOCX."""
        try:
            # Extract document information
            doc_id = doc.get("id")
            title = doc.get("display_title", doc.get("title", "Unknown"))
            
            # Define format preference order - prioritize DOCX
            format_preferences = ["docx", "doc", "pdf", "tiff"]
            
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
                    
                    # If no direct URL, try to extract from the document page
                    if not file_url and "url" in doc:
                        doc_page_url = doc["url"]
                        
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