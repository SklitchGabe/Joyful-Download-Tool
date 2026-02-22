import { useState } from 'react';
import './DocumentList.css';
import LoadingAnimation from './LoadingAnimation';
import type { Document } from '../types/document';

interface DocumentListProps {
  documents: Document[];
  onDownload: (docs: Document[]) => void;
  downloading: boolean;
}

function docTypeBadge(docty?: string): { label: string; cls: string } | null {
  if (!docty) return null;
  if (/program appraisal/i.test(docty))            return { label: 'Program Appraisal', cls: 'badge-program' };
  if (/project appraisal/i.test(docty))             return { label: 'PAD', cls: 'badge-pad' };
  if (/restructuring|project paper/i.test(docty))  return { label: 'Project Paper', cls: 'badge-pp' };
  return null;
}

function DocumentList({ documents, onDownload, downloading }: DocumentListProps) {
  const [selectedDocs, setSelectedDocs] = useState<Document[]>([]);
  const [selectAll, setSelectAll] = useState(false);

  const uniqueProjects = new Set(documents.map(d => d.project_id).filter(Boolean)).size;

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
        <div className="header-left">
          <h2>
            Documents Found <span className="count-pill">{documents.length}</span>
          </h2>
          <p className="result-summary">
            {documents.length} document{documents.length !== 1 ? 's' : ''} across{' '}
            {uniqueProjects} project{uniqueProjects !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="document-actions">
          <label className="select-all-label">
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
            {downloading ? 'Downloading…' : `Download Selected (${selectedDocs.length})`}
          </button>
        </div>
      </div>

      {downloading && <LoadingAnimation mode="download" />}

      <div className="documents">
        {documents.map((doc, index) => {
          const badge = docTypeBadge(doc.docty);
          const isSelected = selectedDocs.some(d => d.id === doc.id);
          return (
            <div
              key={doc.id}
              className={`document-item ${isSelected ? 'selected' : ''}`}
              style={{ animationDelay: `${index * 0.045}s` }}
              onClick={() => handleSelectDocument(doc)}
            >
              <div className="document-checkbox">
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => handleSelectDocument(doc)}
                  onClick={e => e.stopPropagation()}
                />
              </div>
              <div className="document-info">
                <div className="document-title-row">
                  {badge && (
                    <span className={`doc-badge ${badge.cls}`}>{badge.label}</span>
                  )}
                  <h3 className="document-title">
                    {doc.display_title || doc.title || 'Untitled Document'}
                  </h3>
                </div>
                <div className="document-meta">
                  {doc.project_id && <span className="meta-chip">{doc.project_id}</span>}
                  {doc.count     && <span className="meta-chip">{doc.count}</span>}
                  {doc.docdt     && (
                    <span className="meta-chip">
                      {new Date(doc.docdt).toLocaleDateString('en-GB', {
                        year: 'numeric', month: 'short', day: 'numeric',
                      })}
                    </span>
                  )}
                </div>
                {doc.abstracts?.['cdata!'] && (
                  <p className="document-abstract">
                    {doc.abstracts['cdata!'].substring(0, 220)}…
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default DocumentList;
