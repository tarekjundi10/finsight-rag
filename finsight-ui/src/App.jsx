import { useState, useRef, useEffect } from "react"
import axios from "axios"
import ReactMarkdown from "react-markdown"
import { useDropzone } from "react-dropzone"

const API = "http://localhost:8000"

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
    <div
      onClick={() => setOpen(!open)}
      className="cursor-pointer rounded-lg border border-green-900/40 bg-green-950/20 px-3 py-2 text-xs text-green-400 hover:bg-green-950/40 transition-all"
    >
      <div className="flex items-center gap-2">
        <span className="text-green-700 font-mono">0{index + 1}</span>
        <span>{source.section} · p.{source.page}</span>
        <span className="ml-auto text-green-700">{open ? "▲" : "▼"}</span>
      </div>
      {open && (
        <div className="mt-2 pt-2 border-t border-green-900/30 text-green-600 leading-relaxed">
          {source.preview}...
        </div>
      )}
    </div>
  )
}

const Message = ({ msg }) => {
  if (msg.role === "user") return (
    <div className="flex justify-end">
      <div className="max-w-[70%] bg-green-600 text-white rounded-2xl rounded-br-sm px-4 py-3 text-sm leading-relaxed">
        {msg.content}
      </div>
    </div>
  )
  return (
    <div className="flex flex-col gap-2 max-w-[85%]">
      <div className="flex items-center gap-2">
        <div className="w-6 h-6 rounded-md bg-[#111] border border-[#222] flex items-center justify-center text-green-500">
          <ShieldIcon />
        </div>
        <span className="text-xs text-neutral-600 font-medium">FinSight</span>
      </div>
      <div className="bg-[#111] border border-[#1e1e1e] rounded-2xl rounded-tl-sm px-4 py-3 text-sm text-neutral-300 leading-relaxed prose prose-invert prose-sm max-w-none">
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
      <div className="w-6 h-6 rounded-md bg-[#111] border border-[#222] flex items-center justify-center text-green-500">
        <ShieldIcon />
      </div>
      <span className="text-xs text-neutral-600 font-medium">FinSight</span>
    </div>
    <div className="bg-[#111] border border-[#1e1e1e] rounded-2xl rounded-tl-sm px-4 py-3 flex gap-1.5 items-center">
      {[0,1,2].map(i => (
        <span key={i} className="w-1.5 h-1.5 bg-neutral-600 rounded-full animate-bounce"
          style={{ animationDelay: `${i * 0.15}s` }} />
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
    for (const file of docs) {
      const form = new FormData()
      form.append("file", file)
      form.append("company", company || "unknown")
      form.append("year", year || "unknown")
      form.append("doc_type", docType)
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
    <div className="flex h-screen overflow-hidden bg-[#080808]">
      <div className="w-72 flex-shrink-0 bg-[#0c0c0c] border-r border-[#1a1a1a] flex flex-col">
        <div className="p-5 border-b border-[#1a1a1a] flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-green-600 flex items-center justify-center text-white">
            <ShieldIcon />
          </div>
          <div>
            <div className="text-sm font-semibold text-white tracking-tight">FinSight</div>
            <div className="text-xs text-neutral-600">Financial intelligence</div>
          </div>
        </div>

        <div className="p-4 border-b border-[#151515] flex flex-col gap-3">
          <div className="text-xs text-neutral-600 uppercase tracking-wider font-medium">Documents</div>
          <div
            {...getRootProps()}
            className={`border border-dashed rounded-xl p-4 text-center cursor-pointer transition-colors ${
              isDragActive ? "border-green-500 bg-green-950/20" : "border-[#2a2a2a] hover:border-[#3a3a3a]"
            }`}
          >
            <input {...getInputProps()} />
            <div className="text-xs text-neutral-500 leading-relaxed">
              <span className="text-green-500">Click to upload</span> or drag PDFs here
            </div>
          </div>

          {docs.map((f, i) => (
            <div key={i} className="flex items-center gap-2 bg-[#141414] rounded-lg px-3 py-2">
              <div className="w-6 h-6 rounded-md bg-green-950/40 text-green-500 flex items-center justify-center flex-shrink-0">
                <FileIcon />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs text-neutral-300 truncate">{f.name}</div>
                <div className="text-xs text-neutral-600">{(f.size/1024).toFixed(0)} KB</div>
              </div>
              <span className="text-xs px-1.5 py-0.5 bg-green-950/40 text-green-500 rounded">PDF</span>
            </div>
          ))}

          <div className="grid grid-cols-2 gap-2">
            <input value={company} onChange={e => setCompany(e.target.value)} placeholder="Company"
              className="bg-[#141414] border border-[#222] rounded-lg px-3 py-2 text-xs text-neutral-300 placeholder-neutral-600 outline-none focus:border-green-800" />
            <input value={year} onChange={e => setYear(e.target.value)} placeholder="Year"
              className="bg-[#141414] border border-[#222] rounded-lg px-3 py-2 text-xs text-neutral-300 placeholder-neutral-600 outline-none focus:border-green-800" />
          </div>
          <select value={docType} onChange={e => setDocType(e.target.value)}
            className="bg-[#141414] border border-[#222] rounded-lg px-3 py-2 text-xs text-neutral-300 outline-none focus:border-green-800">
            <option>10-K</option>
            <option>10-Q</option>
            <option>Earnings Call</option>
            <option>Annual Report</option>
          </select>
          <button onClick={handleIngest} disabled={ingesting || !docs.length}
            className="bg-green-600 hover:bg-green-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-medium py-2.5 rounded-lg transition-colors">
            {ingesting ? "Ingesting..." : "Ingest documents"}
          </button>
          {ingestStatus && <div className="text-xs text-green-500 text-center">{ingestStatus}</div>}
        </div>

        <div className="p-4 flex flex-col gap-2 flex-1 overflow-y-auto">
          <div className="text-xs text-neutral-600 uppercase tracking-wider font-medium mb-1">Quick questions</div>
          {examples.map((ex, i) => (
            <button key={i} onClick={() => handleSend(ex)}
              className="text-left text-xs text-neutral-500 hover:text-neutral-300 border border-[#1e1e1e] hover:border-[#2a2a2a] rounded-lg px-3 py-2.5 transition-all hover:bg-[#141414] leading-relaxed">
              {ex}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 flex flex-col min-w-0">
        <div className="px-6 py-4 border-b border-[#151515] flex items-center justify-between">
          <div className="flex items-center gap-2">
            {docs.length > 0 ? (
              <div className="flex items-center gap-1.5 bg-[#111] border border-[#1e1e1e] rounded-full px-3 py-1 text-xs text-neutral-400">
                <div className="w-1.5 h-1.5 bg-green-500 rounded-full" />
                {docs.length} document{docs.length > 1 ? "s" : ""} loaded
              </div>
            ) : (
              <div className="text-xs text-neutral-600">No documents loaded yet</div>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 flex flex-col gap-4">
          {messages.length === 0 && (
            <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center py-20">
              <div className="w-12 h-12 rounded-2xl bg-green-600/10 border border-green-900/30 flex items-center justify-center text-green-500 text-xl">
                <ShieldIcon />
              </div>
              <div>
                <div className="text-lg font-medium text-neutral-200">Ask about your documents</div>
                <div className="text-sm text-neutral-600 mt-1">Upload a financial report and start asking questions</div>
              </div>
            </div>
          )}
          {messages.map((msg, i) => <Message key={i} msg={msg} />)}
          {loading && <TypingIndicator />}
          <div ref={bottomRef} />
        </div>

        <div className="px-4 py-4 border-t border-[#151515]">
          <div className="flex items-end gap-3 bg-[#111] border border-[#1e1e1e] rounded-2xl px-4 py-3 focus-within:border-green-900/60 transition-colors">
            <textarea
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend() } }}
              placeholder="Ask a question about your documents..."
              rows={1}
              className="flex-1 bg-transparent text-sm text-neutral-300 placeholder-neutral-600 outline-none resize-none leading-relaxed"
            />
            <button onClick={() => handleSend()} disabled={!input.trim() || loading}
              className="w-8 h-8 bg-green-600 hover:bg-green-500 disabled:opacity-30 rounded-xl flex items-center justify-center text-white transition-colors flex-shrink-0">
              <SendIcon />
            </button>
          </div>
          <div className="text-center text-xs text-neutral-700 mt-2">Press Enter to send · Shift+Enter for new line</div>
        </div>
      </div>
    </div>
  )
}