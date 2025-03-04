import { useState, ChangeEvent, FormEvent } from 'react';
import './SearchForm.css';
import { documentTypes } from '../data/documentTypes';
import { countries } from '../data/countries';
import { topics } from '../data/topics';
import { languages } from '../data/languages';

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

  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
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
      <h2>Search by Keywords</h2>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="query">Keywords</label>
          <input
            type="text"
            id="query"
            name="query"
            value={formData.query}
            onChange={handleChange}
            placeholder="Enter search keywords"
          />
        </div>
        
        <div className="form-row">
          <div className="form-group">
            <label htmlFor="country">Country</label>
            <select
              id="country"
              name="country"
              value={formData.country}
              onChange={handleChange}
              className="select-input"
            >
              {countries.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          
          <div className="form-group">
            <label htmlFor="topic">Topic</label>
            <select
              id="topic"
              name="topic"
              value={formData.topic}
              onChange={handleChange}
              className="select-input"
            >
              {topics.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
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
            {documentTypes.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
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
        
        <div className="form-row">
          <div className="form-group">
            <label htmlFor="language">Language</label>
            <select
              id="language"
              name="language"
              value={formData.language}
              onChange={handleChange}
              className="select-input"
            >
              {languages.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
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
        </div>
        
        <button type="submit" className="search-button">Search</button>
      </form>
    </div>
  );
}

export default SearchForm;
