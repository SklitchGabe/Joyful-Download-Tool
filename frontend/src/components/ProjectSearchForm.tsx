import { useState, ChangeEvent, FormEvent } from 'react';
import './SearchForm.css';

interface ProjectSearchParams {
  projectIds: string;
  includeEquivalents: boolean;
}

interface ProjectSearchFormProps {
  onSearch: (params: ProjectSearchParams) => void;
  loading: boolean;
}

function ProjectSearchForm({ onSearch, loading }: ProjectSearchFormProps) {
  const [projectIds, setProjectIds] = useState('');
  const [includeEquivalents, setIncludeEquivalents] = useState(false);

  const idCount = projectIds.split(/[\s,]+/).filter(s => s.trim().length > 0).length;

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    onSearch({ projectIds, includeEquivalents });
  };

  return (
    <div className="search-form">
      <h2>Search by Project ID</h2>
      <p className="form-description">
        Enter World Bank project IDs to find and download their Project Appraisal Documents (PADs).
        IDs must be in the format P123456 — one per line, or separated by commas or spaces.
      </p>

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="projectIds">
            Project IDs
            {idCount > 0 && <span className="id-count">{idCount} entered</span>}
          </label>
          <textarea
            id="projectIds"
            name="projectIds"
            value={projectIds}
            onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setProjectIds(e.target.value)}
            placeholder={"P146482\nP133305\nP162789"}
            rows={8}
            disabled={loading}
          />
        </div>

        <div className="form-group doc-type-toggle">
          <label>Document scope</label>
          <div className="toggle-options">
            <label className="toggle-option">
              <input
                type="radio"
                name="docScope"
                checked={!includeEquivalents}
                onChange={() => setIncludeEquivalents(false)}
                disabled={loading}
              />
              PAD only
            </label>
            <label className="toggle-option">
              <input
                type="radio"
                name="docScope"
                checked={includeEquivalents}
                onChange={() => setIncludeEquivalents(true)}
                disabled={loading}
              />
              PAD + equivalents
              <span className="toggle-hint"> (includes Program Appraisals and Project Papers)</span>
            </label>
          </div>
        </div>

        <button
          type="submit"
          className={`search-button${loading ? ' is-loading' : ''}`}
          disabled={loading || !projectIds.trim()}
        >
          {loading ? 'Searching…' : 'Find PADs'}
        </button>
      </form>
    </div>
  );
}

export default ProjectSearchForm;
