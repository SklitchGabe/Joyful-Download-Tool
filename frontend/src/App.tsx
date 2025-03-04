import { useState } from 'react'
import './App.css'
import SearchForm from './components/SearchForm'
import ProjectSearchForm from './components/ProjectSearchForm'
import DocumentList from './components/DocumentList'

// Define types for our document structure
interface Document {
  id: string
  display_title?: string
  title?: string
  docdt?: string
  count?: string
  abstracts?: {
    'cdata!'?: string
  }
  pdfurl?: string
  guid?: string
  url?: string
  project_id?: string
}

// Define search parameter types
interface SearchParams {
  query?: string
  country?: string
  topic?: string
  docType?: string
  fromDate?: string
  toDate?: string
  language?: string
  maxResults?: number
}

interface ProjectSearchParams {
  projectIds: string[]
  docType?: string
  maxPerProject?: number
}

function App() {
  const [activeTab, setActiveTab] = useState<'search' | 'project'>('search')
  const [documents, setDocuments] = useState<Document[]>([])
  const [loading, setLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)
  const [downloadProgress, setDownloadProgress] = useState<string | null>(null)

  const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000'

  const handleSearch = async (searchParams: SearchParams) => {
    setLoading(true)
    setError(null)
    
    try {
      const response = await fetch(`${API_BASE_URL}/api/search`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(searchParams),
      })
      
      if (!response.ok) {
        throw new Error('Search failed')
      }
      
      const data = await response.json()
      setDocuments(data.documents)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred')
      setDocuments([])
    } finally {
      setLoading(false)
    }
  }

  const handleProjectSearch = async (searchParams: ProjectSearchParams) => {
    setLoading(true)
    setError(null)
    
    try {
      const response = await fetch(`${API_BASE_URL}/api/project-search`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(searchParams),
      })
      
      if (!response.ok) {
        throw new Error('Project search failed')
      }
      
      const data = await response.json()
      setDocuments(data.documents)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred')
      setDocuments([])
    } finally {
      setLoading(false)
    }
  }

  const handleDownload = async (selectedDocs: Document[]) => {
    setDownloadProgress('Preparing download...')
    
    try {
      const response = await fetch(`${API_BASE_URL}/api/download`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ documents: selectedDocs }),
      })
      
      if (!response.ok) {
        throw new Error('Download failed')
      }
      
      // Create a download link for the zip file
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'worldbank_documents.zip'
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      setDownloadProgress(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred')
      setDownloadProgress(null)
    }
  }

  return (
    <div className="app">
      <header className="app-header">
        <h1>World Bank Document Downloader</h1>
        <div className="tabs">
          <button 
            className={activeTab === 'search' ? 'active' : ''} 
            onClick={() => setActiveTab('search')}
          >
            Search by Keywords
          </button>
          <button 
            className={activeTab === 'project' ? 'active' : ''} 
            onClick={() => setActiveTab('project')}
          >
            Search by Project IDs
          </button>
        </div>
      </header>
      
      <main className="app-content">
        {activeTab === 'search' ? (
          <SearchForm onSearch={handleSearch} />
        ) : (
          <ProjectSearchForm onSearch={handleProjectSearch} />
        )}
        
        {loading && <div className="loading">Loading documents...</div>}
        
        {error && <div className="error">Error: {error}</div>}
        
        {downloadProgress && (
          <div className="download-progress">{downloadProgress}</div>
        )}
        
        {documents.length > 0 && (
          <DocumentList 
            documents={documents} 
            onDownload={handleDownload} 
          />
        )}
      </main>
      
      <footer className="app-footer">
        <p>Powered by World Bank Documents & Reports API</p>
      </footer>
    </div>
  )
}

export default App
