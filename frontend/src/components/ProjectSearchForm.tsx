import { useState, ChangeEvent, FormEvent } from 'react';
import './SearchForm.css';

interface ProjectSearchParams {
  projectIds: string;
}

interface ProjectSearchFormProps {
  onSearch: (params: ProjectSearchParams) => void;
  loading: boolean;
}

function ProjectSearchForm({ onSearch, loading }: ProjectSearchFormProps) {
  const [projectIds, setProjectIds] = useState('');

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    onSearch({ projectIds });
  };

  return (
    <div className="search-form">
      <h2>World Bank PAD Downloader</h2>
      <p className="form-description">
        Enter World Bank project IDs to find and download their Project Appraisal Documents (PADs).
        IDs must be in the format P123456 — one per line, or separated by commas or spaces.
      </p>

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="projectIds">Project IDs</label>
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

        <button type="submit" className="search-button" disabled={loading || !projectIds.trim()}>
          {loading ? 'Searching...' : 'Find PADs'}
        </button>
      </form>
    </div>
  );
}

export default ProjectSearchForm;
