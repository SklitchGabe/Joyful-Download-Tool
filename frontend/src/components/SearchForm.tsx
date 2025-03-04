import { useState, ChangeEvent, FormEvent } from 'react';
import './SearchForm.css';

interface SearchParams {
  query: string;
  country: string;
  topic: string;
  docType: string;
  fromDate: string;
  toDate: string;
  language: string;
  maxResults: number;
}

interface SearchFormProps {
  onSearch: (params: SearchParams) => void;
}

function SearchForm({ onSearch }: SearchFormProps) {
  const [formData, setFormData] = useState<SearchParams>({
    query: '',
    country: '',
    topic: '',
    docType: '',
    fromDate: '',
    toDate: '',
    language: '',
    maxResults: 100
  });

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
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

  return (
    <div className="search-form">
      <h2>Search Documents</h2>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="query">Search Query</label>
          <input
            type="text"
            id="query"
            name="query"
            value={formData.query}
            onChange={handleChange}
            placeholder="Enter keywords..."
          />
        </div>
        
        <div className="form-row">
          <div className="form-group">
            <label htmlFor="country">Country</label>
            <input
              type="text"
              id="country"
              name="country"
              value={formData.country}
              onChange={handleChange}
              placeholder="Country code"
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="topic">Topic</label>
            <input
              type="text"
              id="topic"
              name="topic"
              value={formData.topic}
              onChange={handleChange}
              placeholder="Topic code"
            />
          </div>
        </div>
        
        <div className="form-row">
          <div className="form-group">
            <label htmlFor="docType">Document Type</label>
            <input
              type="text"
              id="docType"
              name="docType"
              value={formData.docType}
              onChange={handleChange}
              placeholder="Document type"
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="language">Language</label>
            <input
              type="text"
              id="language"
              name="language"
              value={formData.language}
              onChange={handleChange}
              placeholder="Language code"
            />
          </div>
        </div>
        
        <div className="form-row">
          <div className="form-group">
            <label htmlFor="fromDate">From Date</label>
            <input
              type="date"
              id="fromDate"
              name="fromDate"
              value={formData.fromDate}
              onChange={handleChange}
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="toDate">To Date</label>
            <input
              type="date"
              id="toDate"
              name="toDate"
              value={formData.toDate}
              onChange={handleChange}
            />
          </div>
        </div>
        
        <div className="form-group">
          <label htmlFor="maxResults">Max Results</label>
          <input
            type="number"
            id="maxResults"
            name="maxResults"
            value={formData.maxResults}
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

export default SearchForm;
