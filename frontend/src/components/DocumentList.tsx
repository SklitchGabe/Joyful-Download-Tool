import { useState } from 'react';
import './DocumentList.css';
import type { Document } from '../types/document';

interface DocumentListProps {
  documents: Document[];
  onDownload: (docs: Document[]) => void;
  onDownloadAndRename: (docs: Document[]) => void;
}

function DocumentList({ documents, onDownload, onDownloadAndRename }: DocumentListProps) {
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
    } else {
      setSelectedDocs([...selectedDocs, doc]);
    }
  };

  const handleDownload = () => {
    if (selectedDocs.length > 0) {
      onDownload(selectedDocs);
    }
  };

  const handleDownloadAndRename = () => {
    if (selectedDocs.length > 0) {
      onDownloadAndRename(selectedDocs);
    }
  };

  return (
    <div className="document-list">
      <div className="document-list-header">
        <h2>Documents ({documents.length})</h2>
        <div className="document-actions">
          <label>
            <input
              type="checkbox"
              checked={selectAll}
              onChange={handleSelectAll}
            />
            Select All
          </label>
          <div className="download-buttons">
            <button 
              className="download-button"
              onClick={handleDownload}
              disabled={selectedDocs.length === 0}
            >
              Download Selected ({selectedDocs.length})
            </button>
            <button 
              className="download-rename-button"
              onClick={handleDownloadAndRename}
              disabled={selectedDocs.length === 0}
            >
              Download & Rename
            </button>
          </div>
        </div>
      </div>
      
      <div className="documents">
        {documents.map(doc => (
          <div 
            key={doc.id} 
            className={`document-item ${selectedDocs.some(d => d.id === doc.id) ? 'selected' : ''}`}
          >
            <div className="document-checkbox">
              <input
                type="checkbox"
                checked={selectedDocs.some(d => d.id === doc.id)}
                onChange={() => handleSelectDocument(doc)}
              />
            </div>
            <div className="document-info">
              <h3>{doc.display_title || doc.title || 'Untitled Document'}</h3>
              <div className="document-meta">
                {doc.project_id && <span>Project: {doc.project_id}</span>}
                {doc.docdt && <span>Date: {new Date(doc.docdt).toLocaleDateString()}</span>}
                {doc.count && <span>Country: {doc.count}</span>}
              </div>
              {doc.abstracts && doc.abstracts['cdata!'] && (
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
