import { useState } from 'react'
import './App.css'
import ProjectSearchForm from './components/ProjectSearchForm'
import DocumentList from './components/DocumentList'
import { ThemeProvider, useTheme } from './contexts/ThemeContent'

// Import the Document interface from DocumentList
import type { Document } from './types/document'

// Define search parameter types
interface ProjectSearchParams {
  projectIds: string
  docType: string
  maxPerProject: number
}

function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  
  return (
    <button 
      onClick={toggleTheme}
      className="theme-toggle"
      aria-label={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} theme`}
    >
      {theme === 'dark' ? '☀️ Light Theme' : '🌙 Dark Theme'}
    </button>
  );
}

function AppContent() {
  const { theme } = useTheme();
  const [documents, setDocuments] = useState<Document[]>([])
  const [loading, setLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)

  const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000'

  const handleProjectSearch = async (params: ProjectSearchParams) => {
    setLoading(true)
    setError(null)
    
    try {
      // Parse project IDs from the text area
      const projectIds = params.projectIds
        .split(/[\s,]+/)
        .map(id => id.trim())
        .filter(id => id.length > 0)
      
      const response = await fetch(`${API_BASE_URL}/api/project-search`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          projectIds,
          docType: params.docType,
          maxPerProject: params.maxPerProject
        }),
      })
      
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to search for documents')
      }
      
      setDocuments(data.documents)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred')
      setDocuments([])
    } finally {
      setLoading(false)
    }
  }

  const handleDownload = async (selectedDocs: Document[]) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/download`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ documents: selectedDocs }),
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to download documents')
      }
      
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'world_bank_documents.zip'
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred')
    }
  }

  const handleDownloadAndRename = async (selectedDocs: Document[]) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/download-and-rename`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ documents: selectedDocs }),
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to download and rename documents')
      }
      
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'world_bank_documents_renamed.zip'
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred')
    }
  }

  return (
    <div className={`app ${theme === 'sdg' ? 'sdg-theme' : ''}`}>
      <ThemeToggle />
      
      <header className="app-header">
        <h1>World Bank Document Explorer</h1>
      </header>
      
      <main className="app-content">
        <ProjectSearchForm onSearch={handleProjectSearch} />
        
        {loading && <div className="loading">Loading documents...</div>}
        
        {error && <div className="error-message">{error}</div>}
        
        {!loading && documents.length > 0 && (
          <DocumentList 
            documents={documents} 
            onDownload={handleDownload} 
            onDownloadAndRename={handleDownloadAndRename}
          />
        )}
      </main>
    </div>
  )
}

function App() {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  )
}

export default App
