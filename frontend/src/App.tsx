import { useState } from 'react'
import './App.css'
import ProjectSearchForm from './components/ProjectSearchForm'
import DocumentList from './components/DocumentList'
import { ThemeProvider, useTheme } from './contexts/ThemeContent'
import type { Document } from './types/document'

interface ProjectSearchParams {
  projectIds: string;
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
  const [loading, setLoading] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [warnings, setWarnings] = useState<string[]>([])

  const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080'

  const handleProjectSearch = async (params: ProjectSearchParams) => {
    setLoading(true)
    setError(null)
    setWarnings([])
    setDocuments([])

    try {
      const projectIds = params.projectIds
        .split(/[\s,]+/)
        .map(id => id.trim())
        .filter(id => id.length > 0)

      if (projectIds.length === 0) {
        setError('Please enter at least one project ID.')
        return
      }

      const response = await fetch(`${API_BASE_URL}/api/search-pads`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectIds }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Search failed')
      }

      // Collect non-fatal warnings
      const newWarnings: string[] = []
      if (data.invalid_ids?.length > 0) {
        newWarnings.push(`Skipped (invalid format): ${data.invalid_ids.join(', ')}`)
      }
      if (data.no_pad_found?.length > 0) {
        newWarnings.push(`No PAD found for: ${data.no_pad_found.join(', ')}`)
      }
      setWarnings(newWarnings)

      if (data.documents.length === 0) {
        setError('No PADs were found for any of the provided project IDs.')
      } else {
        setDocuments(data.documents)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred')
    } finally {
      setLoading(false)
    }
  }

  const handleDownload = async (selectedDocs: Document[]) => {
    setDownloading(true)
    setError(null)

    try {
      const response = await fetch(`${API_BASE_URL}/api/download`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ documents: selectedDocs }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Download failed')
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'project_appraisal_documents.zip'
      document.body.appendChild(a)
      a.click()
      a.remove()
      window.URL.revokeObjectURL(url)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Download failed')
    } finally {
      setDownloading(false)
    }
  }

  return (
    <div className={`app ${theme === 'sdg' ? 'sdg-theme' : ''}`}>
      <ThemeToggle />

      <header className="app-header">
        <h1>World Bank PAD Downloader</h1>
      </header>

      <main className="app-content">
        <ProjectSearchForm onSearch={handleProjectSearch} loading={loading} />

        {error && <div className="error-message">{error}</div>}

        {warnings.length > 0 && (
          <div className="warning-messages">
            {warnings.map((w, i) => (
              <div key={i} className="warning-message">{w}</div>
            ))}
          </div>
        )}

        {!loading && documents.length > 0 && (
          <DocumentList
            documents={documents}
            onDownload={handleDownload}
            downloading={downloading}
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
