import os
import json
import tempfile
import zipfile
from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
from worldbank_downloader import WorldBankDocDownloader
import requests
from document_renamer import rename_document_with_project_id
app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

# Create a temporary directory for downloads
TEMP_DIR = tempfile.mkdtemp()

@app.route('/api/health', methods=['GET'])
def health_check():
    return jsonify({'status': 'ok'})

@app.route('/api/search', methods=['POST'])
def search_documents():
    data = request.json
    
    # Extract search parameters
    query = data.get('query', '')
    country = data.get('country')
    topic = data.get('topic')
    doc_type = data.get('docType')
    from_date = data.get('fromDate')
    to_date = data.get('toDate')
    language = data.get('language')
    max_results = int(data.get('maxResults', 100))
    
    # Initialize downloader
    downloader = WorldBankDocDownloader(output_dir=TEMP_DIR)
    
    # Search for documents
    documents = downloader.search_documents(
        query=query,
        country=country,
        topic=topic,
        doc_type=doc_type,
        from_date=from_date,
        to_date=to_date,
        language=language,
        max_results=max_results
    )
    
    # Return document metadata
    return jsonify({
        'count': len(documents),
        'documents': documents
    })

@app.route('/api/project-search', methods=['POST'])
def search_by_project():
    data = request.json
    
    # Extract parameters
    project_ids = data.get('projectIds', [])
    doc_type = data.get('docType')
    max_per_project = int(data.get('maxPerProject', 100))
    
    if not project_ids:
        return jsonify({'error': 'No project IDs provided'}), 400
    
    # Initialize downloader
    downloader = WorldBankDocDownloader(output_dir=TEMP_DIR)
    
    # Search for documents by project IDs
    project_documents = downloader.search_by_project_ids(
        project_ids=project_ids,
        doc_type=doc_type,
        max_results=max_per_project
    )
    
    # Flatten and return document metadata
    all_docs = []
    for project_id, docs in project_documents.items():
        for doc in docs:
            doc['project_id'] = project_id
            all_docs.append(doc)
    
    return jsonify({
        'count': len(all_docs),
        'documents': all_docs
    })

@app.route('/api/download', methods=['POST'])
def download_documents():
    data = request.json
    documents = data.get('documents', [])
    
    if not documents:
        return jsonify({'error': 'No documents provided'}), 400
    
    # Create a unique download directory
    download_dir = os.path.join(TEMP_DIR, f"download_{os.urandom(4).hex()}")
    os.makedirs(download_dir, exist_ok=True)
    
    # Initialize downloader
    downloader = WorldBankDocDownloader(output_dir=download_dir)
    
    # Download documents
    results = downloader.bulk_download(documents)
    
    # Create a zip file of all downloaded documents
    zip_path = os.path.join(TEMP_DIR, f"worldbank_docs_{os.urandom(4).hex()}.zip")
    with zipfile.ZipFile(zip_path, 'w') as zipf:
        for result in results['success']:
            file_path = result['path']
            zipf.write(file_path, os.path.basename(file_path))
    
    # Return the zip file
    return send_file(
        zip_path,
        mimetype='application/zip',
        as_attachment=True,
        download_name='worldbank_documents.zip'
    )

@app.route('/api/download-and-rename', methods=['POST'])
def download_and_rename_documents():
    data = request.json
    documents = data.get('documents', [])
    
    if not documents:
        return jsonify({'error': 'No documents provided'}), 400
    
    # Create a unique download directory
    download_dir = os.path.join(TEMP_DIR, f"download_{os.urandom(4).hex()}")
    os.makedirs(download_dir, exist_ok=True)
    
    # Initialize downloader
    downloader = WorldBankDocDownloader(output_dir=download_dir)
    
    # Download documents
    results = downloader.bulk_download(documents)
    
    # Apply renaming logic to the downloaded documents
    renamed_results = []
    for result in results['success']:
        file_path = result['path']
        renamed_path = rename_document_with_project_id(file_path, download_dir)
        renamed_results.append({
            'doc_id': result['doc_id'],
            'path': renamed_path or file_path  # Use original path if renaming failed
        })
    
    # Create a zip file of all downloaded and renamed documents
    zip_path = os.path.join(TEMP_DIR, f"worldbank_docs_renamed_{os.urandom(4).hex()}.zip")
    with zipfile.ZipFile(zip_path, 'w') as zipf:
        for result in renamed_results:
            file_path = result['path']
            zipf.write(file_path, os.path.basename(file_path))
    
    # Return the zip file
    return send_file(
        zip_path,
        mimetype='application/zip',
        as_attachment=True,
        download_name='worldbank_documents_renamed.zip'
    )

@app.route('/api/document-types', methods=['GET'])
def get_document_types():
    """Get available document types from the World Bank API"""
    try:
        # Make request to the World Bank API for document type facets
        response = requests.get(
            "https://search.worldbank.org/api/v3/wds",
            params={
                "format": "json",
                "fct": "docty",
                "rows": 0
            }
        )
        response.raise_for_status()
        data = response.json()
        
        # Extract document types from facets
        facets = data.get('facets', {}).get('docty', [])
        document_types = [{"value": facet['name'], "label": facet['name']} for facet in facets]
        
        # Add an "All Document Types" option at the beginning
        document_types.insert(0, {"value": "", "label": "All Document Types"})
        
        return jsonify(document_types)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True)
