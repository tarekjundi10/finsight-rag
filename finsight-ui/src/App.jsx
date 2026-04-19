import { useState, useRef, useEffect } from "react"
import axios from "axios"
import ReactMarkdown from "react-markdown"
import { useDropzone } from "react-dropzone"

const API = import.meta.env.VITE_API_URL || "http://localhost:8000"

const Logo = () => (
  <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
    <path d="M8 1L2 4v4c0 3.5 2.5 6 6 7 3.5-1 6-3.5 6-7V4L8 1z"/>
  </svg>
)

const SendIcon = () => (
  <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M14 2L2 7l5 2 2 5 5-12z"/>
  </svg>
)

const FileIcon = () => (
  <svg width="11" height="11" viewBox="0 0 16 16" fill="currentColor">
    <path d="M4 2h6l4 4v9H4V2zm6 0v4h4"/>
  </svg>
)

const ChevronIcon = ({ open }) => (
  <svg width="10" height="10" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
    <path d={open ? "M4 10l4-4 4 4" : "M4 6l4 4 4-4"}/>
  </svg>
)

const SourceCard = ({ source, index }) => {
  const [open, setOpen] = useState(false)
  return (
    <div onClick={() => setOpen(!open)}
      className="cursor-pointer transition-all"
      style={{borderRadius:"6px", border:"1px solid #e8eaed", background: open ? "#f8f9fa" : "#fff", marginTop:"4px"}}>
      <div className="flex items-center gap-2 px-3 py-2">
        <span style={{fontSize:"10px", color:"#9aa0a6", fontFamily:"monospace", minWidth:"16px"}}>#{index+1}</span>
        <span style={{fontSize:"11px", color:"#1a1a2e", fontWeight:600, flex:1}}>{source.section}</span>
        <span style={{fontSize:"11px", color:"#5f6368"}}>p.{source.page}</span>
        <span style={{color:"#9aa0a6", marginLeft:"4px"}}><ChevronIcon open={open}/></span>
      </div>
      {open && (
        <div style={{padding:"0 12px 10px", fontSize:"11px", color:"#5f6368", lineHeight:1.6, borderTop:"1px solid #e8eaed", paddingTop:"8px", marginTop:"0"}}>
          {source.preview}...
        </div>
      )}
    </div>
  )
}

const Message = ({ msg }) => {
  if (msg.role === "user") return (
    <div style={{display:"flex", justifyContent:"flex-end", marginBottom:"12px"}}>
      <div style={{maxWidth:"72%", background:"#1a1a2e", color:"#fff", borderRadius:"12px 12px 3px 12px", padding:"10px 14px", fontSize:"13px", lineHeight:1.6}}>
        {msg.content}
      </div>
    </div>
  )
  return (
    <div style={{display:"flex", flexDirection:"column", gap:"6px", maxWidth:"88%", marginBottom:"16px"}}>
      <div style={{display:"flex", alignItems:"center", gap:"6px"}}>
        <div style={{width:"20px", height:"20px", borderRadius:"5px", background:"#1a1a2e", color:"#fff", display:"flex", alignItems:"center", justifyContent:"center"}}>
          <Logo/>
        </div>
        <span style={{fontSize:"11px", fontWeight:700, color:"#1a1a2e", letterSpacing:"0.02em"}}>FINSIGHT</span>
      </div>
      <div style={{background:"#fff", border:"1px solid #e8eaed", borderRadius:"3px 12px 12px 12px", padding:"12px 14px", fontSize:"13px", color:"#1a1a2e", lineHeight:1.7}}>
        <ReactMarkdown>{msg.content}</ReactMarkdown>
      </div>
      {msg.sources?.length > 0 && (
        <div style={{marginTop:"2px"}}>
          <div style={{fontSize:"10px", fontWeight:700, color:"#9aa0a6", letterSpacing:"0.06em", marginBottom:"4px"}}>SOURCES</div>
          {msg.sources.map((s, i) => <SourceCard key={i} source={s} index={i}/>)}
        </div>
      )}
    </div>
  )
}

const Typing = () => (
  <div style={{display:"flex", flexDirection:"column", gap:"6px", maxWidth:"88%", marginBottom:"16px"}}>
    <div style={{display:"flex", alignItems:"center", gap:"6px"}}>
      <div style={{width:"20px", height:"20px", borderRadius:"5px", background:"#1a1a2e", color:"#fff", display:"flex", alignItems:"center", justifyContent:"center"}}>
        <Logo/>
      </div>
      <span style={{fontSize:"11px", fontWeight:700, color:"#1a1a2e", letterSpacing:"0.02em"}}>FINSIGHT</span>
    </div>
    <div style={{background:"#fff", border:"1px solid #e8eaed", borderRadius:"3px 12px 12px 12px", padding:"12px 14px", display:"flex", gap:"5px", alignItems:"center"}}>
      {[0,1,2].map(i => (
        <span key={i} style={{width:"5px", height:"5px", borderRadius:"50%", background:"#d1d5db", display:"inline-block", animation:"bounce 0.9s infinite", animationDelay:`${i*0.15}s`}}/>
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

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior:"smooth" }) }, [messages, loading])

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
      } catch { setIngestStatus("Error — " + file.name) }
    }
    setIngesting(false)
    setIngestStatus(`${total} chunks indexed`)
  }

  const handleSend = async (text) => {
    const query = text || input.trim()
    if (!query || loading) return
    setInput("")
    setMessages(prev => [...prev, { role:"user", content:query }])
    setLoading(true)
    try {
      const res = await axios.post(`${API}/ask`, { query })
      setMessages(prev => [...prev, { role:"assistant", content:res.data.answer, sources:res.data.sources }])
    } catch {
      setMessages(prev => [...prev, { role:"assistant", content:"Backend unreachable.", sources:[] }])
    }
    setLoading(false)
  }

  const fieldStyle = {
    background:"#f8f9fa", border:"1px solid #e8eaed", borderRadius:"6px",
    padding:"7px 10px", fontSize:"12px", color:"#1a1a2e", outline:"none",
    width:"100%", fontFamily:"inherit"
  }

  const examples = [
    "What was total revenue?",
    "Key risk factors?",
    "Operating income YoY?",
    "Management guidance?",
  ]

  return (
    <div style={{display:"flex", height:"100vh", overflow:"hidden", background:"#f1f3f4", fontFamily:"-apple-system, BlinkMacSystemFont, 'Inter', sans-serif"}}>
      <style>{`
        @keyframes bounce { 0%,60%,100%{transform:translateY(0)} 30%{transform:translateY(-4px)} }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::placeholder { color: #9aa0a6 !important; }
        ::-webkit-scrollbar { width: 3px; }
        ::-webkit-scrollbar-thumb { background: #e8eaed; border-radius: 2px; }
        textarea { resize: none; }
        p { margin: 0 0 8px; } p:last-child { margin-bottom: 0; }
        ul, ol { padding-left: 18px; margin: 6px 0; }
        li { margin-bottom: 3px; }
        strong { font-weight: 600; color: #1a1a2e; }
      `}</style>

      {/* Sidebar */}
      <div style={{width:"260px", flexShrink:0, background:"#fff", borderRight:"1px solid #e8eaed", display:"flex", flexDirection:"column"}}>

        {/* Logo */}
        <div style={{padding:"16px", borderBottom:"1px solid #e8eaed", display:"flex", alignItems:"center", gap:"10px"}}>
          <div style={{width:"30px", height:"30px", borderRadius:"8px", background:"#1a1a2e", color:"#fff", display:"flex", alignItems:"center", justifyContent:"center"}}>
            <Logo/>
          </div>
          <div>
            <div style={{fontSize:"13px", fontWeight:700, color:"#1a1a2e", letterSpacing:"-0.3px"}}>FinSight</div>
            <div style={{fontSize:"11px", color:"#5f6368", fontWeight:500}}>Financial intelligence</div>
          </div>
        </div>

        {/* Upload section */}
        <div style={{padding:"14px", borderBottom:"1px solid #f1f3f4"}}>
          <div style={{fontSize:"10px", fontWeight:700, color:"#1a1a2e", letterSpacing:"0.07em", marginBottom:"10px"}}>DOCUMENTS</div>

          <div {...getRootProps()} style={{border:`1.5px dashed ${isDragActive ? "#1a1a2e" : "#d1d5db"}`, borderRadius:"8px", padding:"14px 12px", textAlign:"center", cursor:"pointer", background: isDragActive ? "#f0f4ff" : "#fafafa", transition:"all .15s"}}>
            <input {...getInputProps()}/>
            <div style={{fontSize:"11px", color:"#5f6368", lineHeight:1.5}}>
              <span style={{color:"#1a1a2e", fontWeight:700}}>Click to upload</span> or drop PDF here
            </div>
          </div>

          {docs.map((f, i) => (
            <div key={i} style={{display:"flex", alignItems:"center", gap:"8px", background:"#f8f9fa", border:"1px solid #e8eaed", borderRadius:"6px", padding:"7px 10px", marginTop:"8px"}}>
              <div style={{width:"22px", height:"22px", borderRadius:"5px", background:"#1a1a2e", color:"#fff", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0}}>
                <FileIcon/>
              </div>
              <div style={{flex:1, minWidth:0}}>
                <div style={{fontSize:"11px", fontWeight:600, color:"#1a1a2e", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap"}}>{f.name}</div>
                <div style={{fontSize:"10px", color:"#9aa0a6"}}>{(f.size/1024).toFixed(0)} KB</div>
              </div>
              <span style={{fontSize:"10px", fontWeight:700, color:"#1a1a2e", background:"#e8eaed", borderRadius:"4px", padding:"2px 6px"}}>PDF</span>
            </div>
          ))}

          <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:"6px", marginTop:"8px"}}>
            <input value={company} onChange={e => setCompany(e.target.value)} placeholder="Company" style={fieldStyle}/>
            <input value={year} onChange={e => setYear(e.target.value)} placeholder="Year" style={fieldStyle}/>
          </div>

          <select value={docType} onChange={e => { setDocType(e.target.value); setCustomDocType("") }}
            style={{...fieldStyle, marginTop:"6px", cursor:"pointer"}}>
            <option>10-K</option><option>10-Q</option>
            <option>Earnings Call</option><option>Annual Report</option><option>Other</option>
          </select>

          {docType === "Other" && (
            <input value={customDocType} onChange={e => setCustomDocType(e.target.value)}
              placeholder="Specify type..." style={{...fieldStyle, marginTop:"6px", borderColor:"#1a1a2e"}}/>
          )}

          <button onClick={handleIngest} disabled={ingesting || !docs.length}
            style={{width:"100%", marginTop:"8px", padding:"8px", borderRadius:"6px", border:"none", background: ingesting || !docs.length ? "#e8eaed" : "#1a1a2e", color: ingesting || !docs.length ? "#9aa0a6" : "#fff", fontSize:"12px", fontWeight:700, cursor: docs.length ? "pointer" : "not-allowed", letterSpacing:"0.02em", fontFamily:"inherit", transition:"all .15s"}}>
            {ingesting ? "Indexing..." : "Index documents"}
          </button>

          {ingestStatus && (
            <div style={{marginTop:"6px", fontSize:"11px", color:"#1a1a2e", fontWeight:600, textAlign:"center", padding:"5px", background:"#f0fdf4", borderRadius:"5px", border:"1px solid #bbf7d0"}}>
              {ingestStatus}
            </div>
          )}
        </div>

        {/* Quick questions */}
        <div style={{padding:"14px", flex:1, overflowY:"auto"}}>
          <div style={{fontSize:"10px", fontWeight:700, color:"#1a1a2e", letterSpacing:"0.07em", marginBottom:"8px"}}>QUICK QUESTIONS</div>
          {examples.map((ex, i) => (
            <button key={i} onClick={() => handleSend(ex)}
              style={{display:"block", width:"100%", textAlign:"left", padding:"7px 10px", marginBottom:"4px", borderRadius:"6px", border:"1px solid #e8eaed", background:"transparent", fontSize:"12px", color:"#3c4043", cursor:"pointer", fontFamily:"inherit", fontWeight:500, transition:"all .1s"}}
              onMouseEnter={e => { e.currentTarget.style.background="#f8f9fa"; e.currentTarget.style.color="#1a1a2e"; e.currentTarget.style.borderColor="#1a1a2e" }}
              onMouseLeave={e => { e.currentTarget.style.background="transparent"; e.currentTarget.style.color="#3c4043"; e.currentTarget.style.borderColor="#e8eaed" }}>
              {ex}
            </button>
          ))}
        </div>
      </div>

      {/* Main */}
      <div style={{flex:1, display:"flex", flexDirection:"column", minWidth:0}}>

        {/* Topbar */}
        <div style={{padding:"12px 20px", background:"#fff", borderBottom:"1px solid #e8eaed", display:"flex", alignItems:"center", gap:"8px"}}>
          {docs.length > 0 ? (
            <div style={{display:"flex", alignItems:"center", gap:"6px", background:"#f0fdf4", border:"1px solid #bbf7d0", borderRadius:"20px", padding:"4px 10px", fontSize:"11px", fontWeight:600, color:"#166534"}}>
              <div style={{width:"6px", height:"6px", borderRadius:"50%", background:"#16a34a"}}/>
              {docs.length} doc{docs.length > 1 ? "s" : ""} indexed
            </div>
          ) : (
            <div style={{fontSize:"12px", color:"#9aa0a6", fontWeight:500}}>No documents indexed</div>
          )}
        </div>

        {/* Messages */}
        <div style={{flex:1, overflowY:"auto", padding:"24px 28px", display:"flex", flexDirection:"column"}}>
          {messages.length === 0 && (
            <div style={{flex:1, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", textAlign:"center", padding:"60px 20px"}}>
              <div style={{width:"48px", height:"48px", borderRadius:"12px", background:"#1a1a2e", color:"#fff", display:"flex", alignItems:"center", justifyContent:"center", marginBottom:"16px"}}>
                <Logo/>
              </div>
              <div style={{fontSize:"18px", fontWeight:700, color:"#1a1a2e", marginBottom:"6px"}}>Ask about your documents</div>
              <div style={{fontSize:"13px", color:"#9aa0a6", maxWidth:"320px", lineHeight:1.6}}>Index a financial report using the sidebar, then ask any business question</div>
              <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:"8px", marginTop:"24px", maxWidth:"400px", width:"100%"}}>
                {["Revenue breakdown", "Risk factors", "Operating income", "Guidance"].map((s, i) => (
                  <div key={i} onClick={() => handleSend(s)}
                    style={{padding:"10px 14px", borderRadius:"8px", border:"1px solid #e8eaed", background:"#fff", fontSize:"12px", color:"#3c4043", cursor:"pointer", fontWeight:500, textAlign:"left", transition:"all .1s"}}
                    onMouseEnter={e => { e.currentTarget.style.borderColor="#1a1a2e"; e.currentTarget.style.color="#1a1a2e" }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor="#e8eaed"; e.currentTarget.style.color="#3c4043" }}>
                    {s}
                  </div>
                ))}
              </div>
            </div>
          )}
          {messages.map((msg, i) => <Message key={i} msg={msg}/>)}
          {loading && <Typing/>}
          <div ref={bottomRef}/>
        </div>

        {/* Input */}
        <div style={{padding:"12px 20px 16px", background:"#fff", borderTop:"1px solid #e8eaed"}}>
          <div style={{display:"flex", alignItems:"flex-end", gap:"8px", background:"#f8f9fa", border:"1.5px solid #e8eaed", borderRadius:"10px", padding:"10px 12px", transition:"border-color .15s"}}
            onFocus={e => e.currentTarget.style.borderColor="#1a1a2e"}
            onBlur={e => e.currentTarget.style.borderColor="#e8eaed"}>
            <textarea value={input} onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend() }}}
              placeholder="Ask a question about your documents..."
              rows={1}
              style={{flex:1, background:"transparent", border:"none", outline:"none", fontSize:"13px", color:"#1a1a2e", lineHeight:1.6, fontFamily:"inherit"}}/>
            <button onClick={() => handleSend()} disabled={!input.trim() || loading}
              style={{width:"30px", height:"30px", borderRadius:"7px", border:"none", background: input.trim() && !loading ? "#1a1a2e" : "#e8eaed", color: input.trim() && !loading ? "#fff" : "#9aa0a6", display:"flex", alignItems:"center", justifyContent:"center", cursor: input.trim() ? "pointer" : "not-allowed", flexShrink:0, transition:"all .15s"}}>
              <SendIcon/>
            </button>
          </div>
          <div style={{textAlign:"center", fontSize:"11px", color:"#d1d5db", marginTop:"6px"}}>Enter to send · Shift+Enter for new line</div>
        </div>
      </div>
    </div>
  )
}