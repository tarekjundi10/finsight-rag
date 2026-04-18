import { useState, useRef, useEffect } from "react"
import axios from "axios"
import ReactMarkdown from "react-markdown"
import { useDropzone } from "react-dropzone"

const API = import.meta.env.VITE_API_URL || "http://localhost:8000"

const ShieldIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
    <path d="M8 1L2 4v4c0 3.5 2.5 6 6 7 3.5-1 6-3.5 6-7V4L8 1z"/>
  </svg>
)

const SendIcon = () => (
  <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8">
    <path d="M14 2L2 7l5 2 2 5 5-12z"/>
  </svg>
)

const FileIcon = () => (
  <svg width="13" height="13" viewBox="0 0 16 16" fill="currentColor">
    <path d="M4 2h6l4 4v9H4V2zm6 0v4h4"/>
  </svg>
)

const SourceCard = ({ source, index }) => {
  const [open, setOpen] = useState(false)
  return (
    <div onClick={() => setOpen(!open)} className="cursor-pointer rounded-lg px-3 py-2 text-xs transition-all"
      style={{border:"0.5px solid #e5e7eb", background: open ? "#f0f4f8" : "#fff"}}>
      <div className="flex items-center gap-2">
        <span style={{color:"#9ca3af", fontFamily:"monospace"}}>0{index + 1}</span>
        <span style={{color:"#1e3a5f", fontWeight:600}}>{source.section} · p.{source.page}</span>
        <span className="ml-auto" style={{color:"#9ca3af"}}>{open ? "▲" : "▼"}</span>
      </div>
      {open && (
        <div className="mt-2 pt-2 leading-relaxed" style={{borderTop:"0.5px solid #e5e7eb", color:"#374151"}}>
          {source.preview}...
        </div>
      )}
    </div>
  )
}

const Message = ({ msg }) => {
  if (msg.role === "user") return (
    <div className="flex justify-end">
      <div className="max-w-[70%] rounded-2xl rounded-br-sm px-4 py-3 text-sm leading-relaxed"
        style={{background:"#1e3a5f", color:"#fff"}}>
        {msg.content}
      </div>
    </div>
  )
  return (
    <div className="flex flex-col gap-2 max-w-[85%]">
      <div className="flex items-center gap-2">
        <div className="w-6 h-6 rounded-md flex items-center justify-center"
          style={{background:"#1e3a5f", color:"#fff"}}>
          <ShieldIcon />
        </div>
        <span className="text-xs font-semibold" style={{color:"#1e3a5f"}}>FinSight</span>
      </div>
      <div className="rounded-2xl rounded-tl-sm px-4 py-3 text-sm leading-relaxed prose prose-sm max-w-none"
        style={{background:"#fff", border:"0.5px solid #e5e7eb", color:"#111"}}>
        <ReactMarkdown>{msg.content}</ReactMarkdown>
      </div>
      {msg.sources?.length > 0 && (
        <div className="flex flex-col gap-1.5 mt-1">
          {msg.sources.map((s, i) => <SourceCard key={i} source={s} index={i} />)}
        </div>
      )}
    </div>
  )
}

const TypingIndicator = () => (
  <div className="flex flex-col gap-2 max-w-[85%]">
    <div className="flex items-center gap-2">
      <div className="w-6 h-6 rounded-md flex items-center justify-center"
        style={{background:"#1e3a5f", color:"#fff"}}>
        <ShieldIcon />
      </div>
      <span className="text-xs font-semibold" style={{color:"#1e3a5f"}}>FinSight</span>
    </div>
    <div className="rounded-2xl rounded-tl-sm px-4 py-3 flex gap-1.5 items-center"
      style={{background:"#fff", border:"0.5px solid #e5e7eb"}}>
      {[0,1,2].map(i => (
        <span key={i} className="w-1.5 h-1.5 rounded-full animate-bounce"
          style={{background:"#1e3a5f", animationDelay:`${i*0.15}s`}} />
      ))}
    </div>
  </div>
)

export default function App() {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)
  const [ingesting, setIngesting] = useState(false)
  const [company, setCompany] = useState("")
  const [year, setYear] = useState("")
  const [docType, setDocType] = useState("10-K")
  const [customDocType, setCustomDocType] = useState("")
  const [docs, setDocs] = useState([])
  const [ingestStatus, setIngestStatus] = useState("")
  const bottomRef = useRef(null)

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }) }, [messages, loading])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: { "application/pdf": [".pdf"] },
    onDrop: files => setDocs(prev => [...prev, ...files])
  })

  const handleIngest = async () => {
    if (!docs.length) return
    setIngesting(true)
    setIngestStatus("")
    let total = 0
    const finalDocType = docType === "Other" ? (customDocType || "Other") : docType
    for (const file of docs) {
      const form = new FormData()
      form.append("file", file)
      form.append("company", company || "unknown")
      form.append("year", year || "unknown")
      form.append("doc_type", finalDocType)
      try {
        const res = await axios.post(`${API}/ingest`, form)
        total += res.data.chunks
      } catch {
        setIngestStatus("Error ingesting " + file.name)
      }
    }
    setIngesting(false)
    setIngestStatus(`${docs.length} doc(s) ingested — ${total} chunks stored`)
  }

  const handleSend = async (text) => {
    const query = text || input.trim()
    if (!query || loading) return
    setInput("")
    setMessages(prev => [...prev, { role: "user", content: query }])
    setLoading(true)
    try {
      const res = await axios.post(`${API}/ask`, { query })
      setMessages(prev => [...prev, { role: "assistant", content: res.data.answer, sources: res.data.sources }])
    } catch {
      setMessages(prev => [...prev, { role: "assistant", content: "Something went wrong. Is the backend running?", sources: [] }])
    }
    setLoading(false)
  }

  const examples = [
    "What was total revenue by segment?",
    "What are the key risk factors?",
    "How did operating income change YoY?",
    "What is management's guidance?",
  ]

  return (
    <div className="flex h-screen overflow-hidden" style={{background:"#f0f4f8"}}>

      <div className="w-72 flex-shrink-0 flex flex-col" style={{background:"#fff", borderRight:"1px solid #e5e7eb"}}>

        <div className="p-5 flex items-center gap-3" style={{borderBottom:"1px solid #e5e7eb"}}>
          <div className="w-9 h-9 rounded-lg flex items-center justify-center"
            style={{background:"#1e3a5f", color:"#fff"}}>
            <ShieldIcon />
          </div>
          <div>
            <div className="text-sm font-bold tracking-tight" style={{color:"#0a1628"}}>FinSight</div>
            <div className="text-xs font-medium" style={{color:"#1e3a5f"}}>Financial intelligence</div>
          </div>
        </div>

        <div className="p-4 flex flex-col gap-3" style={{borderBottom:"1px solid #e5e7eb"}}>
          <div className="text-xs uppercase tracking-widest font-bold" style={{color:"#0a1628"}}>Documents</div>

          <div {...getRootProps()} className="rounded-xl p-4 text-center cursor-pointer transition-colors"
            style={{border:`1.5px dashed ${isDragActive ? "#1e3a5f" : "#c7d2e0"}`, background: isDragActive ? "#eff6ff" : "#f8fafc"}}>
            <input {...getInputProps()} />
            <div className="text-xs leading-relaxed" style={{color:"#475569"}}>
              <span style={{color:"#1e3a5f", fontWeight:700}}>Click to upload</span> or drag PDFs here
            </div>
          </div>

          {docs.map((f, i) => (
            <div key={i} className="flex items-center gap-2 rounded-lg px-3 py-2"
              style={{background:"#f8fafc", border:"1px solid #e2e8f0"}}>
              <div className="w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0"
                style={{background:"#1e3a5f", color:"#fff"}}>
                <FileIcon />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-medium truncate" style={{color:"#0a1628"}}>{f.name}</div>
                <div className="text-xs" style={{color:"#94a3b8"}}>{(f.size/1024).toFixed(0)} KB</div>
              </div>
              <span className="text-xs px-1.5 py-0.5 rounded font-semibold"
                style={{background:"#eff6ff", color:"#1e3a5f"}}>PDF</span>
            </div>
          ))}

          <div className="grid grid-cols-2 gap-2">
            <input value={company} onChange={e => setCompany(e.target.value)} placeholder="Company"
              style={{background:"#f8fafc", border:"1px solid #e2e8f0", borderRadius:"8px", padding:"8px 12px", fontSize:"12px", color:"#0a1628", outline:"none", width:"100%"}}/>
            <input value={year} onChange={e => setYear(e.target.value)} placeholder="Year"
              style={{background:"#f8fafc", border:"1px solid #e2e8f0", borderRadius:"8px", padding:"8px 12px", fontSize:"12px", color:"#0a1628", outline:"none", width:"100%"}}/>
          </div>

          <select value={docType} onChange={e => { setDocType(e.target.value); setCustomDocType("") }}
            style={{background:"#f8fafc", border:"1px solid #e2e8f0", borderRadius:"8px", padding:"8px 12px", fontSize:"12px", color:"#0a1628", outline:"none", width:"100%", cursor:"pointer"}}>
            <option>10-K</option>
            <option>10-Q</option>
            <option>Earnings Call</option>
            <option>Annual Report</option>
            <option>Other</option>
          </select>

          {docType === "Other" && (
            <input value={customDocType} onChange={e => setCustomDocType(e.target.value)}
              placeholder="Specify document type..."
              style={{background:"#f8fafc", border:"1px solid #1e3a5f", borderRadius:"8px", padding:"8px 12px", fontSize:"12px", color:"#0a1628", outline:"none", width:"100%"}}/>
          )}

          <button onClick={handleIngest} disabled={ingesting || !docs.length}
            className="text-xs font-bold py-2.5 rounded-lg transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            style={{background:"#1e3a5f", color:"#fff", letterSpacing:"0.03em"}}>
            {ingesting ? "Ingesting..." : "Ingest documents"}
          </button>
          {ingestStatus && (
            <div className="text-xs text-center font-medium" style={{color:"#1e3a5f"}}>{ingestStatus}</div>
          )}
        </div>

        <div className="p-4 flex flex-col gap-2 flex-1 overflow-y-auto">
          <div className="text-xs uppercase tracking-widest font-bold mb-1" style={{color:"#0a1628"}}>Quick questions</div>
          {examples.map((ex, i) => (
            <button key={i} onClick={() => handleSend(ex)}
              className="text-left text-xs rounded-lg px-3 py-2.5 transition-all leading-relaxed"
              style={{color:"#1e3a5f", border:"1px solid #e2e8f0", background:"#f8fafc", fontWeight:500}}
              onMouseEnter={e => { e.currentTarget.style.background="#eff6ff"; e.currentTarget.style.borderColor="#1e3a5f" }}
              onMouseLeave={e => { e.currentTarget.style.background="#f8fafc"; e.currentTarget.style.borderColor="#e2e8f0" }}>
              {ex}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 flex flex-col min-w-0">
        <div className="px-6 py-4 flex items-center"
          style={{background:"#fff", borderBottom:"1px solid #e5e7eb"}}>
          {docs.length > 0 ? (
            <div className="flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold"
              style={{background:"#eff6ff", border:"1px solid #bfdbfe", color:"#1e3a5f"}}>
              <div className="w-1.5 h-1.5 rounded-full" style={{background:"#1e3a5f"}} />
              {docs.length} document{docs.length > 1 ? "s" : ""} loaded
            </div>
          ) : (
            <div className="text-xs font-medium" style={{color:"#000000"}}>No documents loaded yet</div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 flex flex-col gap-4" style={{background:"#f0f4f8"}}>
          {messages.length === 0 && (
            <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center py-20">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center"
                style={{background:"#fff", border:"1px solid #e2e8f0", color:"#1e3a5f"}}>
                <ShieldIcon />
              </div>
              <div>
                <div className="text-lg font-bold" style={{color:"#0a1628"}}>Ask about your documents</div>
                <div className="text-sm mt-1 font-medium" style={{color:"#64748b"}}>Upload a financial report and start asking questions</div>
              </div>
            </div>
          )}
          {messages.map((msg, i) => <Message key={i} msg={msg} />)}
          {loading && <TypingIndicator />}
          <div ref={bottomRef} />
        </div>

        <div className="px-4 py-4" style={{background:"#fff", borderTop:"1px solid #e5e7eb"}}>
          <div className="flex items-end gap-3 rounded-2xl px-4 py-3"
            style={{background:"#f8fafc", border:"1.5px solid #1e3a5f"}}>
            <textarea value={input} onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend() } }}
              placeholder="Ask a question about your documents..."
              rows={1}
              className="flex-1 bg-transparent text-sm outline-none resize-none leading-relaxed"
              style={{color:"#0a1628", border:"none", fontFamily:"inherit"}}/>
            <button onClick={() => handleSend()} disabled={!input.trim() || loading}
              className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 transition-all disabled:opacity-30"
              style={{background:"#0a1628", color:"#fff"}}>
              <SendIcon />
            </button>
          </div>
          <div className="text-center text-xs mt-2" style={{color:"#000000"}}>
            Press Enter to send · Shift+Enter for new line
          </div>
        </div>
      </div>
    </div>
  )
}