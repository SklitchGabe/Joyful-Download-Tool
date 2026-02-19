import { useState } from 'react';
import './DocumentList.css';
import type { Document } from '../types/document';

interface DocumentListProps {
  documents: Document[];
  onDownload: (docs: Document[]) => void;
  downloading: boolean;
}

function DocumentList({ documents, onDownload, downloading }: DocumentListProps) {
  const [selectedDocs, setSelectedDocs] = useState<Document[]>([]);
  const [selectAll, setSelectAll] = useState(false);

  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedDocs([]);
    } else {
      setSelectedDocs([...documents]);
    }
    setSelectAll(!selectAll);
  };

  const handleSelectDocument = (doc: Document) => {
    if (selectedDocs.some(d => d.id === doc.id)) {
      setSelectedDocs(selectedDocs.filter(d => d.id !== doc.id));
      setSelectAll(false);
    } else {
      const updated = [...selectedDocs, doc];
      setSelectedDocs(updated);
      if (updated.length === documents.length) setSelectAll(true);
    }
  };

  return (
    <div className="document-list">
      <div className="document-list-header">
        <h2>PADs Found ({documents.length})</h2>
        <div className="document-actions">
          <label>
            <input
              type="checkbox"
              checked={selectAll}
              onChange={handleSelectAll}
            />
            Select All
          </label>
          <button
            className="download-button"
            onClick={() => onDownload(selectedDocs)}
            disabled={selectedDocs.length === 0 || downloading}
          >
            {downloading ? 'Downloading...' : `Download Selected (${selectedDocs.length})`}
          </button>
        </div>
      </div>

      <div className="documents">
        {documents.map(doc => (
          <div
            key={doc.id}
            className={`document-item ${selectedDocs.some(d => d.id === doc.id) ? 'selected' : ''}`}
            onClick={() => handleSelectDocument(doc)}
          >
            <div className="document-checkbox">
              <input
                type="checkbox"
                checked={selectedDocs.some(d => d.id === doc.id)}
                onChange={() => handleSelectDocument(doc)}
                onClick={e => e.stopPropagation()}
              />
            </div>
            <div className="document-info">
              <h3>{doc.display_title || doc.title || 'Untitled Document'}</h3>
              <div className="document-meta">
                {doc.project_id && <span>Project: {doc.project_id}</span>}
                {doc.docdt && <span>Date: {new Date(doc.docdt).toLocaleDateString()}</span>}
                {doc.count && <span>Country: {doc.count}</span>}
              </div>
              {doc.abstracts?.['cdata!'] && (
                <p className="document-abstract">{doc.abstracts['cdata!'].substring(0, 200)}...</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default DocumentList;
