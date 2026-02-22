import { useEffect, useState } from 'react'
import './LoadingAnimation.css'

const MESSAGES = {
  search: [
    'Querying World Bank API…',
    'Matching project IDs…',
    'Retrieving document records…',
    'Processing metadata…',
    'Finalising results…',
  ],
  download: [
    'Fetching documents from server…',
    'Downloading PDFs…',
    'Verifying file integrity…',
    'Packaging into ZIP archive…',
    'Preparing your download…',
  ],
}

interface Props {
  mode: 'search' | 'download'
}

export default function LoadingAnimation({ mode }: Props) {
  const [msgIndex, setMsgIndex] = useState(0)
  const msgs = MESSAGES[mode]

  useEffect(() => {
    setMsgIndex(0)
    const id = setInterval(() => setMsgIndex(i => (i + 1) % msgs.length), 2400)
    return () => clearInterval(id)
  }, [mode, msgs.length])

  return (
    <div className="loading-strip">
      <div className="ls-radar">
        <div className="ls-ring ls-ring-outer" />
        <div className="ls-ring ls-ring-inner" />
        <div className="ls-core" />
        <div className="ls-blip ls-blip-a" />
        <div className="ls-blip ls-blip-b" />
        <div className="ls-blip ls-blip-c" />
      </div>

      <div className="ls-body">
        <span className="ls-label">{mode === 'search' ? 'Searching' : 'Downloading'}</span>
        <p className="ls-message" key={msgIndex}>{msgs[msgIndex]}</p>
        <div className="ls-track">
          <div className="ls-track-beam" />
        </div>
      </div>
    </div>
  )
}
