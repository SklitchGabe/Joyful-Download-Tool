import { useState, ChangeEvent, FormEvent } from 'react';
import './SearchForm.css';

interface UrlListFormProps {
  onDownload: (urls: string[]) => void;
  downloading: boolean;
}

function UrlListForm({ onDownload, downloading }: UrlListFormProps) {
  const [urlText, setUrlText] = useState('');

  const urls = urlText
    .split('\n')
    .map(u => u.trim())
    .filter(u => u.length > 0);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (urls.length > 0) onDownload(urls);
  };

  return (
    <div className="search-form">
      <h2>Download by URL</h2>
      <p className="form-description">
        Paste direct document download links — one per line. Every URL will be
        downloaded and packaged into a single zip file.
      </p>

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="urlList">
            Document URLs
            {urls.length > 0 && (
              <span className="id-count">{urls.length} entered</span>
            )}
          </label>
          <textarea
            id="urlList"
            value={urlText}
            onChange={(e: ChangeEvent<HTMLTextAreaElement>) =>
              setUrlText(e.target.value)
            }
            placeholder={
              'http://documents.worldbank.org/curated/en/614981468015622453/pdf/PAD12550PAD0P1010Box391418B00OUO090.pdf\n' +
              'http://documents.worldbank.org/curated/en/179061468215115488/pdf/PAD11010PAD0P1010Box385329B00OUO090.pdf'
            }
            rows={10}
            disabled={downloading}
          />
          <span className="form-hint">
            One URL per line. Mixed document types are fine.
          </span>
        </div>

        <button
          type="submit"
          className={`search-button${downloading ? ' is-loading' : ''}`}
          disabled={downloading || urls.length === 0}
        >
          {downloading
            ? 'Downloading…'
            : `Download All (${urls.length} file${urls.length !== 1 ? 's' : ''})`}
        </button>
      </form>
    </div>
  );
}

export default UrlListForm;
