import { useState } from 'react'
import './App.css'
import ProjectSearchForm from './components/ProjectSearchForm'
import UrlListForm from './components/UrlListForm'
import DocumentList from './components/DocumentList'
import LoadingAnimation from './components/LoadingAnimation'
import { ThemeProvider, useTheme } from './contexts/ThemeContent'
import type { Document } from './types/document'

type Tab = 'project' | 'url'

interface ProjectSearchParams {
  projectIds: string;
  includeEquivalents: boolean;
}

function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  return (
    <button
      onClick={toggleTheme}
      className="theme-toggle"
      aria-label={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} theme`}
    >
      {theme === 'dark' ? '☀️ Light' : '🌙 Dark'}
    </button>
  );
}

function AppContent() {
  const { theme } = useTheme();
  const [activeTab, setActiveTab] = useState<Tab>('project')
  const [documents, setDocuments] = useState<Document[]>([])
  const [loading, setLoading] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const [downloadSuccess, setDownloadSuccess] = useState(false)
  const [downloadSummary, setDownloadSummary] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [warnings, setWarnings] = useState<string[]>([])

  const switchTab = (tab: Tab) => {
    setActiveTab(tab)
    setDocuments([])
    setError(null)
    setWarnings([])
  }

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
        body: JSON.stringify({ projectIds, includeEquivalents: params.includeEquivalents }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Search failed')
      }

      const newWarnings: string[] = []
      if (data.invalid_ids?.length > 0) {
        const shown = data.invalid_ids.slice(0, 5).join(', ')
        const extra = data.invalid_ids.length > 5 ? ` … and ${data.invalid_ids.length - 5} more` : ''
        newWarnings.push(`Skipped ${data.invalid_ids.length} invalid ID${data.invalid_ids.length !== 1 ? 's' : ''}: ${shown}${extra}`)
      }
      if (data.no_pad_found?.length > 0) {
        const shown = data.no_pad_found.slice(0, 5).join(', ')
        const extra = data.no_pad_found.length > 5 ? ` … and ${data.no_pad_found.length - 5} more` : ''
        newWarnings.push(`No document found for ${data.no_pad_found.length} project${data.no_pad_found.length !== 1 ? 's' : ''}: ${shown}${extra}`)
      }
      setWarnings(newWarnings)

      if (data.documents.length === 0) {
        setError('No documents were found for any of the provided project IDs.')
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
    setDownloadSuccess(false)
    setDownloadSummary('')

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

      const filesInZip  = Number(response.headers.get('X-Files-In-Zip')          ?? selectedDocs.length)
      const attempted   = Number(response.headers.get('X-Downloads-Attempted')   ?? selectedDocs.length)
      const failed      = Number(response.headers.get('X-Downloads-Failed')      ?? 0)

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'project_appraisal_documents.zip'
      document.body.appendChild(a)
      a.click()
      a.remove()
      window.URL.revokeObjectURL(url)

      let summary = `✓ Downloaded ${filesInZip} of ${attempted} document${attempted !== 1 ? 's' : ''}`
      if (failed > 0) summary += ` — ${failed} could not be retrieved`
      setDownloadSummary(summary)
      setDownloadSuccess(true)
      setTimeout(() => setDownloadSuccess(false), failed > 0 ? 6000 : 4000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Download failed')
    } finally {
      setDownloading(false)
    }
  }

  const handleUrlDownload = async (urls: string[]) => {
    setDownloading(true)
    setError(null)
    setDownloadSuccess(false)
    setDownloadSummary('')

    try {
      const response = await fetch(`${API_BASE_URL}/api/download-urls`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ urls }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Download failed')
      }

      const filesInZip = Number(response.headers.get('X-Files-In-Zip')        ?? urls.length)
      const attempted  = Number(response.headers.get('X-Downloads-Attempted') ?? urls.length)
      const failed     = Number(response.headers.get('X-Downloads-Failed')    ?? 0)

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'downloaded_documents.zip'
      document.body.appendChild(a)
      a.click()
      a.remove()
      window.URL.revokeObjectURL(url)

      let summary = `✓ Downloaded ${filesInZip} of ${attempted} file${attempted !== 1 ? 's' : ''}`
      if (failed > 0) summary += ` — ${failed} could not be retrieved`
      setDownloadSummary(summary)
      setDownloadSuccess(true)
      setTimeout(() => setDownloadSuccess(false), failed > 0 ? 6000 : 4000)
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
        <div className="tabs">
          <button
            className={activeTab === 'project' ? 'active' : ''}
            onClick={() => switchTab('project')}
          >
            Search by Project ID
          </button>
          <button
            className={activeTab === 'url' ? 'active' : ''}
            onClick={() => switchTab('url')}
          >
            Download by URL
          </button>
        </div>
      </header>

      <main className="app-content">
        {activeTab === 'project' && (
          <ProjectSearchForm onSearch={handleProjectSearch} loading={loading} />
        )}

        {activeTab === 'url' && (
          <UrlListForm onDownload={handleUrlDownload} downloading={downloading} />
        )}

        {loading && <LoadingAnimation mode="search" />}
        {activeTab === 'url' && downloading && <LoadingAnimation mode="download" />}

        {error && <div className="error-message">{error}</div>}

        {warnings.length > 0 && (
          <div className="warning-messages">
            {warnings.map((w, i) => (
              <div key={i} className="warning-message">{w}</div>
            ))}
          </div>
        )}

        {activeTab === 'project' && !loading && documents.length > 0 && (
          <DocumentList
            documents={documents}
            onDownload={handleDownload}
            downloading={downloading}
          />
        )}
      </main>

      {downloadSuccess && (
        <div className="success-toast" role="status">
          {downloadSummary}
        </div>
      )}
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
