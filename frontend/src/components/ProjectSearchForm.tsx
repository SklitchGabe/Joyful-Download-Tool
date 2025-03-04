import { useState, ChangeEvent, FormEvent } from 'react';
import './SearchForm.css';
import { documentTypes } from '../data/documentTypes';

interface ProjectSearchParams {
  projectIds: string;
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
    maxPerProject: 10
  });

  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    onSearch(formData);
  };
  
  const exampleIds = "P162789, P160628, P121507";

  return (
    <div className="search-form">
      <h2>World Bank Document Search</h2>
      <p className="form-description">
        Enter one or more World Bank project IDs to find and download associated documents.
      </p>
      
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="projectIds">Project IDs</label>
          <textarea
            id="projectIds"
            name="projectIds"
            value={formData.projectIds}
            onChange={handleChange}
            placeholder={`Enter project IDs (separated by commas, spaces, or new lines)\nExample: ${exampleIds}`}
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
            <option value="">All Document Types</option>
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
          <span className="form-hint">Maximum number of documents to retrieve for each project ID</span>
        </div>
        
        <button type="submit" className="search-button">Find Documents</button>
      </form>
    </div>
  );
}

export default ProjectSearchForm;
