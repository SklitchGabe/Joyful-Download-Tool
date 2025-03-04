import { useState, ChangeEvent, FormEvent } from 'react';
import './SearchForm.css';
import { documentTypes } from '../data/documentTypes';

interface ProjectSearchParams {
  projectIds: string[];
  docType: string;
  maxPerProject: number;
}

interface ProjectSearchFormProps {
  onSearch: (params: ProjectSearchParams) => void;
}

function ProjectSearchForm({ onSearch }: ProjectSearchFormProps) {
  const [formData, setFormData] = useState({
    projectIds: '',
    docType: '',
    maxPerProject: 100
  });

  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    
    // Split project IDs by comma, newline, or space
    const projectIds = formData.projectIds
      .split(/[\s,]+/)
      .map(id => id.trim())
      .filter(id => id);
    
    onSearch({
      projectIds,
      docType: formData.docType,
      maxPerProject: formData.maxPerProject
    });
  };

  return (
    <div className="search-form">
      <h2>Search by Project IDs</h2>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="projectIds">Project IDs</label>
          <textarea
            id="projectIds"
            name="projectIds"
            value={formData.projectIds}
            onChange={handleChange}
            placeholder="Enter project IDs (separated by commas, spaces, or new lines)"
            rows={5}
          />
        </div>
        
        <div className="form-group">
          <label htmlFor="docType">Document Type</label>
          <select
            id="docType"
            name="docType"
            value={formData.docType}
            onChange={handleChange}
            className="select-input"
          >
            {documentTypes.map(type => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
        </div>
        
        <div className="form-group">
          <label htmlFor="maxPerProject">Max Documents per Project</label>
          <input
            type="number"
            id="maxPerProject"
            name="maxPerProject"
            value={formData.maxPerProject}
            onChange={handleChange}
            min="1"
            max="1000"
          />
        </div>
        
        <button type="submit" className="search-button">Search</button>
      </form>
    </div>
  );
}

export default ProjectSearchForm;
