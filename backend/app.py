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

    downloader = WorldBankDocDownloader(output_dir=TEMP_DIR)
    project_documents = downloader.search_by_project_ids(
        project_ids=valid_ids,
        doc_type='Project Appraisal Document',
        max_results=5,
    )

    found_docs, no_pad_ids = [], []
    for pid, docs in project_documents.items():
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
    with zipfile.ZipFile(zip_path, 'w') as zipf:
        for result in results['success']:
            zipf.write(result['path'], os.path.basename(result['path']))

    return send_file(
        zip_path,
        mimetype='application/zip',
        as_attachment=True,
        download_name='project_appraisal_documents.zip'
    )


if __name__ == '__main__':
    app.run(debug=True, port=8080)
