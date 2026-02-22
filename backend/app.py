import os
import re
import tempfile
import zipfile
from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
from worldbank_downloader import WorldBankDocDownloader

app = Flask(__name__)
CORS(app)

TEMP_DIR = tempfile.mkdtemp()
PROJECT_ID_RE = re.compile(r'^P\d{6}$', re.IGNORECASE)


@app.route('/api/health', methods=['GET'])
def health_check():
    return jsonify({'status': 'ok'})


@app.route('/api/search-pads', methods=['POST'])
def search_pads():
    data = request.json or {}
    raw_ids = data.get('projectIds', [])

    if not raw_ids:
        return jsonify({'error': 'No project IDs provided'}), 400

    # Validate — each ID must be P followed by exactly 6 digits
    valid_ids, invalid_ids = [], []
    for pid in raw_ids:
        pid = pid.strip().upper()
        if PROJECT_ID_RE.match(pid):
            valid_ids.append(pid)
        else:
            invalid_ids.append(pid)

    if not valid_ids:
        return jsonify({
            'error': 'No valid project IDs found. Each ID must be in the format P123456.',
            'invalid_ids': invalid_ids,
        }), 400

    include_equivalents = bool(data.get('includeEquivalents', False))
    doc_types = (
        ['Project Appraisal Document', 'Program Appraisal Document', 'Project Paper']
        if include_equivalents
        else ['Project Appraisal Document']
    )

    downloader = WorldBankDocDownloader(output_dir=TEMP_DIR)

    # Collect results across all doc types, deduplicated per project by doc id
    merged: dict[str, dict] = {pid: {} for pid in valid_ids}
    for doc_type in doc_types:
        results = downloader.search_by_project_ids(
            project_ids=valid_ids,
            doc_type=doc_type,
            max_results=5,
        )
        for pid, docs in results.items():
            for doc in docs:
                merged[pid][doc['id']] = doc

    found_docs, no_pad_ids = [], []
    for pid, docs_by_id in merged.items():
        docs = list(docs_by_id.values())
        if docs:
            for doc in docs:
                doc['project_id'] = pid
            found_docs.extend(docs)
        else:
            no_pad_ids.append(pid)

    return jsonify({
        'count': len(found_docs),
        'documents': found_docs,
        'no_pad_found': no_pad_ids,
        'invalid_ids': invalid_ids,
    })


@app.route('/api/download', methods=['POST'])
def download_documents():
    data = request.json or {}
    documents = data.get('documents', [])

    if not documents:
        return jsonify({'error': 'No documents selected'}), 400

    download_dir = os.path.join(TEMP_DIR, f"dl_{os.urandom(4).hex()}")
    os.makedirs(download_dir, exist_ok=True)

    downloader = WorldBankDocDownloader(output_dir=download_dir)
    results = downloader.bulk_download(documents)

    if not results['success']:
        failed_reasons = '; '.join(r.get('error', 'unknown') for r in results['failed'][:3])
        return jsonify({'error': f'All downloads failed: {failed_reasons}'}), 500

    zip_path = os.path.join(TEMP_DIR, f"pads_{os.urandom(4).hex()}.zip")
    seen_names = set()
    with zipfile.ZipFile(zip_path, 'w') as zipf:
        for result in results['success']:
            name = os.path.basename(result['path'])
            if name not in seen_names:
                seen_names.add(name)
                zipf.write(result['path'], name)

    files_in_zip      = len(seen_names)
    attempted         = len(documents)
    failed            = len(results['failed'])

    response = send_file(
        zip_path,
        mimetype='application/zip',
        as_attachment=True,
        download_name='project_appraisal_documents.zip'
    )
    response.headers['X-Files-In-Zip']               = str(files_in_zip)
    response.headers['X-Downloads-Attempted']         = str(attempted)
    response.headers['X-Downloads-Failed']            = str(failed)
    response.headers['Access-Control-Expose-Headers'] = (
        'X-Files-In-Zip, X-Downloads-Attempted, X-Downloads-Failed'
    )
    return response


@app.route('/api/download-urls', methods=['POST'])
def download_from_urls():
    data = request.json or {}
    raw_urls = data.get('urls', [])

    if not raw_urls:
        return jsonify({'error': 'No URLs provided'}), 400

    valid_urls = [
        u.strip() for u in raw_urls
        if isinstance(u, str) and u.strip().lower().startswith('http')
    ]
    invalid_count = len(raw_urls) - len(valid_urls)

    if not valid_urls:
        return jsonify({
            'error': 'No valid URLs found. Each URL must start with http.',
        }), 400

    download_dir = os.path.join(TEMP_DIR, f"dl_{os.urandom(4).hex()}")
    os.makedirs(download_dir, exist_ok=True)

    downloader = WorldBankDocDownloader(output_dir=download_dir)
    results = downloader.download_from_urls(valid_urls)

    if not results['success']:
        failed_reasons = '; '.join(
            r.get('error', 'unknown') for r in results['failed'][:3]
        )
        return jsonify({'error': f'All downloads failed: {failed_reasons}'}), 500

    zip_path = os.path.join(TEMP_DIR, f"docs_{os.urandom(4).hex()}.zip")
    seen_names = set()
    with zipfile.ZipFile(zip_path, 'w') as zipf:
        for result in results['success']:
            name = os.path.basename(result['path'])
            if name not in seen_names:
                seen_names.add(name)
                zipf.write(result['path'], name)

    files_in_zip = len(seen_names)
    attempted    = len(valid_urls)
    failed       = len(results['failed']) + invalid_count

    response = send_file(
        zip_path,
        mimetype='application/zip',
        as_attachment=True,
        download_name='downloaded_documents.zip',
    )
    response.headers['X-Files-In-Zip']               = str(files_in_zip)
    response.headers['X-Downloads-Attempted']         = str(attempted)
    response.headers['X-Downloads-Failed']            = str(failed)
    response.headers['Access-Control-Expose-Headers'] = (
        'X-Files-In-Zip, X-Downloads-Attempted, X-Downloads-Failed'
    )
    return response


if __name__ == '__main__':
    app.run(debug=True, port=8080)
