import { useState, useRef, useEffect } from "react"
import axios from "axios"
import ReactMarkdown from "react-markdown"
import { useDropzone } from "react-dropzone"

const API = import.meta.env.VITE_API_URL || "http://localhost:8000"

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
  <svg width="10" height="10" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.5">
    <path d={open ? "M4 10l4-4 4 4" : "M4 6l4 4 4-4"}/>
  </svg>
)

const BarChartIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#c8a96e" strokeWidth="2" strokeLinecap="round">
    <rect x="2" y="12" width="4" height="10" rx="1"/>
    <rect x="9" y="7" width="4" height="15" rx="1"/>
    <rect x="16" y="3" width="4" height="19" rx="1"/>
    <path d="M2 3l5 4 5-3 5 3"/>
  </svg>
)

const SourceCard = ({ source, index }) => {
  const [open, setOpen] = useState(false)
  return (
    <div onClick={() => setOpen(!open)} style={{cursor:"pointer", borderRadius:"8px", border:"1px solid #2a2f32", background: open ? "#111314" : "transparent", marginTop:"4px", transition:"all .15s"}}>
      <div style={{display:"flex", alignItems:"center", gap:"8px", padding:"7px 10px"}}>
        <span style={{fontSize:"10px", color:"#6a5a30", fontFamily:"'JetBrains Mono',monospace", minWidth:"20px"}}>#{index+1}</span>
        <span style={{fontSize:"11px", color:"#e8d9b0", fontWeight:600, flex:1}}>{source.section}</span>
        <span style={{fontSize:"11px", color:"#6a6f72"}}>p.{source.page}</span>
        <span style={{color:"#4a4f52"}}><ChevronIcon open={open}/></span>
      </div>
      {open && (
        <div style={{padding:"0 10px 10px", fontSize:"11px", color:"#8a8f92", lineHeight:1.65, borderTop:"1px solid #1c1f20", paddingTop:"8px", marginTop:"0"}}>
          {source.preview}...
        </div>
      )}
    </div>
  )
}

const Message = ({ msg }) => {
  if (msg.role === "user") return (
    <div style={{display:"flex", justifyContent:"flex-end", marginBottom:"16px"}}>
      <div style={{maxWidth:"68%", background:"linear-gradient(135deg,#1e1c0f,#2a2610)", border:"1px solid #3a3218", color:"#f0ead6", borderRadius:"16px 16px 4px 16px", padding:"11px 16px", fontSize:"13px", lineHeight:1.7}}>
        {msg.content}
      </div>
    </div>
  )
  return (
    <div style={{display:"flex", flexDirection:"column", gap:"6px", maxWidth:"86%", marginBottom:"20px"}}>
      <div style={{display:"flex", alignItems:"center", gap:"8px"}}>
        <div style={{width:"22px", height:"22px", borderRadius:"6px", background:"linear-gradient(135deg,#c8a96e,#8b6914)", display:"flex", alignItems:"center", justifyContent:"center"}}>
          <BarChartIcon/>
        </div>
        <span style={{fontSize:"10px", fontWeight:700, color:"#c8a96e", letterSpacing:"0.1em"}}>FINSIGHT</span>
      </div>
      <div style={{background:"#111314", border:"1px solid #1c1f20", borderRadius:"4px 16px 16px 16px", padding:"14px 16px", fontSize:"13px", color:"#d4cfc6", lineHeight:1.78}}>
        <ReactMarkdown>{msg.content}</ReactMarkdown>
      </div>
      {msg.sources?.length > 0 && (
        <div style={{marginTop:"4px"}}>
          <div style={{fontSize:"9px", fontWeight:700, color:"#3a3f42", letterSpacing:"0.1em", marginBottom:"4px"}}>SOURCES</div>
          {msg.sources.map((s, i) => <SourceCard key={i} source={s} index={i}/>)}
        </div>
      )}
    </div>
  )
}

const Typing = () => (
  <div style={{display:"flex", flexDirection:"column", gap:"6px", maxWidth:"86%", marginBottom:"20px"}}>
    <div style={{display:"flex", alignItems:"center", gap:"8px"}}>
      <div style={{width:"22px", height:"22px", borderRadius:"6px", background:"linear-gradient(135deg,#c8a96e,#8b6914)", display:"flex", alignItems:"center", justifyContent:"center"}}>
        <BarChartIcon/>
      </div>
      <span style={{fontSize:"10px", fontWeight:700, color:"#c8a96e", letterSpacing:"0.1em"}}>FINSIGHT</span>
    </div>
    <div style={{background:"#111314", border:"1px solid #1c1f20", borderRadius:"4px 16px 16px 16px", padding:"14px 16px", display:"flex", gap:"5px", alignItems:"center"}}>
      {[0,1,2].map(i => (
        <span key={i} style={{width:"5px", height:"5px", borderRadius:"50%", background:"#3a3f42", display:"inline-block", animation:"typingBounce 0.9s infinite", animationDelay:`${i*0.15}s`}}/>
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

  const F = { background:"#0d0f10", border:"1px solid #2a2f32", borderRadius:"8px", padding:"8px 11px", fontSize:"12px", color:"#e8e3da", outline:"none", width:"100%", fontFamily:"'DM Sans',sans-serif" }

  const examples = ["Revenue by segment?", "Key risk factors?", "Operating income YoY?", "Management guidance?"]

  return (
    <div style={{display:"flex", height:"100vh", overflow:"hidden", background:"#08090a", fontFamily:"'DM Sans',system-ui,sans-serif"}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Sans:wght@300;400;500;600&family=JetBrains+Mono:wght@400;500&display=swap');
        @keyframes typingBounce{0%,60%,100%{transform:translateY(0)}30%{transform:translateY(-5px)}}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:.3}}
        *{box-sizing:border-box;margin:0;padding:0}
        ::-webkit-scrollbar{width:3px}
        ::-webkit-scrollbar-thumb{background:#1c1f20;border-radius:2px}
        ::placeholder{color:#3a3f42 !important}
        select option{background:#0d0f10;color:#e8e3da}
        p{margin:0 0 8px} p:last-child{margin:0}
        ul,ol{padding-left:18px;margin:6px 0}
        li{margin-bottom:4px}
        strong{color:#f0ead6;font-weight:600}
      `}</style>

      <div style={{width:"270px", flexShrink:0, background:"#0d0f10", borderRight:"1px solid #1c1f20", display:"flex", flexDirection:"column"}}>

        <div style={{padding:"20px", borderBottom:"1px solid #1c1f20", display:"flex", alignItems:"center", gap:"12px"}}>
          <div style={{width:"36px", height:"36px", borderRadius:"10px", background:"#0a0a0a", border:"1px solid #2a2f32", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0}}>
            <BarChartIcon/>
          </div>
          <div>
            <div style={{fontFamily:"'DM Serif Display',serif", fontSize:"17px", color:"#f0ead6", letterSpacing:"-0.3px", lineHeight:1.1}}>FinSight</div>
            <div style={{fontSize:"10px", color:"#4a4f52", letterSpacing:"0.1em", textTransform:"uppercase", fontWeight:500, marginTop:"2px"}}>Intelligence Platform</div>
          </div>
        </div>

        <div style={{padding:"16px", borderBottom:"1px solid #1c1f20"}}>
          <div style={{fontSize:"9px", fontWeight:700, color:"#3a3f42", letterSpacing:"0.14em", textTransform:"uppercase", marginBottom:"12px"}}>Documents</div>

          <div {...getRootProps()} style={{border:`1px dashed ${isDragActive ? "#c8a96e" : "#2a2f32"}`, borderRadius:"10px", padding:"16px", textAlign:"center", cursor:"pointer", background: isDragActive ? "#0f0e09" : "#0a0c0d", transition:"all .2s"}}>
            <input {...getInputProps()}/>
            <div style={{fontSize:"11px", color:"#4a4f52", lineHeight:1.6}}>
              <span style={{color:"#c8a96e", fontWeight:600}}>Click to upload</span> or drop PDF<br/>Annual · 10-K · Earnings · Any
            </div>
          </div>

          {docs.map((f, i) => (
            <div key={i} style={{display:"flex", alignItems:"center", gap:"8px", background:"#0a0c0d", border:"1px solid #1c1f20", borderRadius:"8px", padding:"8px 10px", marginTop:"8px"}}>
              <div style={{width:"24px", height:"24px", borderRadius:"6px", background:"#1c1a0f", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, color:"#c8a96e"}}>
                <FileIcon/>
              </div>
              <div style={{flex:1, minWidth:0}}>
                <div style={{fontSize:"11px", fontWeight:500, color:"#e8e3da", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap"}}>{f.name}</div>
                <div style={{fontSize:"10px", color:"#3a3f42"}}>{(f.size/1024).toFixed(0)} KB</div>
              </div>
              <span style={{fontSize:"9px", fontWeight:700, color:"#c8a96e", background:"#1c1a0f", borderRadius:"4px", padding:"2px 6px"}}>PDF</span>
            </div>
          ))}

          <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:"6px", marginTop:"8px"}}>
            <input value={company} onChange={e => setCompany(e.target.value)} placeholder="Company" style={F}/>
            <input value={year} onChange={e => setYear(e.target.value)} placeholder="Year" style={F}/>
          </div>
          <select value={docType} onChange={e => { setDocType(e.target.value); setCustomDocType("") }} style={{...F, marginTop:"6px", cursor:"pointer"}}>
            <option>10-K</option><option>10-Q</option>
            <option>Earnings Call</option><option>Annual Report</option><option>Other</option>
          </select>
          {docType === "Other" && (
            <input value={customDocType} onChange={e => setCustomDocType(e.target.value)} placeholder="Specify type..." style={{...F, marginTop:"6px", borderColor:"#c8a96e"}}/>
          )}
          <button onClick={handleIngest} disabled={ingesting || !docs.length}
            style={{width:"100%", marginTop:"8px", padding:"9px", borderRadius:"8px", border:"none", background: docs.length && !ingesting ? "linear-gradient(135deg,#c8a96e,#8b6914)" : "#1c1f20", color: docs.length && !ingesting ? "#0d0b06" : "#3a3f42", fontSize:"11px", fontWeight:700, cursor: docs.length ? "pointer" : "not-allowed", letterSpacing:"0.04em", fontFamily:"inherit", transition:"all .2s"}}>
            {ingesting ? "Indexing..." : "Index document"}
          </button>
          {ingestStatus && (
            <div style={{marginTop:"6px", fontSize:"10px", color:"#c8a96e", textAlign:"center", padding:"5px 8px", background:"#0f0e09", borderRadius:"6px", border:"1px solid #2a2208", fontWeight:500}}>
              {ingestStatus}
            </div>
          )}
        </div>

        <div style={{padding:"16px", flex:1, overflowY:"auto"}}>
          <div style={{fontSize:"9px", fontWeight:700, color:"#3a3f42", letterSpacing:"0.14em", textTransform:"uppercase", marginBottom:"10px"}}>Suggested queries</div>
          {examples.map((ex, i) => (
            <button key={i} onClick={() => handleSend(ex)}
              style={{display:"block", width:"100%", textAlign:"left", padding:"8px 10px", marginBottom:"4px", borderRadius:"7px", border:"1px solid #1c1f20", background:"transparent", fontSize:"11px", color:"#6a6f72", cursor:"pointer", fontFamily:"inherit", fontWeight:400, transition:"all .15s", lineHeight:1.4}}
              onMouseEnter={e => { e.currentTarget.style.borderColor="#2a2f32"; e.currentTarget.style.color="#c8c4bc"; e.currentTarget.style.background="#111314" }}
              onMouseLeave={e => { e.currentTarget.style.borderColor="#1c1f20"; e.currentTarget.style.color="#6a6f72"; e.currentTarget.style.background="transparent" }}>
              {ex}
            </button>
          ))}
        </div>
      </div>

      <div style={{flex:1, display:"flex", flexDirection:"column", minWidth:0}}>
        <div style={{padding:"12px 24px", background:"#0a0c0d", borderBottom:"1px solid #1c1f20", display:"flex", alignItems:"center", justifyContent:"space-between"}}>
          {docs.length > 0 ? (
            <div style={{display:"flex", alignItems:"center", gap:"7px", background:"#0f0e09", border:"1px solid #2a2208", borderRadius:"20px", padding:"5px 12px", fontSize:"11px", color:"#c8a96e", fontWeight:500}}>
              <div style={{width:"6px", height:"6px", borderRadius:"50%", background:"#c8a96e", animation:"pulse 2s infinite"}}/>
              {docs.length} doc{docs.length > 1 ? "s" : ""} indexed
            </div>
          ) : (
            <div style={{fontSize:"11px", color:"#3a3f42"}}>No documents indexed yet</div>
          )}
          <div style={{display:"flex", gap:"6px"}}>
            <button onClick={() => setMessages([])} style={{padding:"5px 12px", borderRadius:"6px", border:"1px solid #1c1f20", background:"transparent", fontSize:"10px", color:"#4a4f52", cursor:"pointer", fontFamily:"inherit"}}>Clear chat</button>
          </div>
        </div>

        <div style={{flex:1, overflowY:"auto", padding:"28px 32px 16px", display:"flex", flexDirection:"column"}}>
          {messages.length === 0 && (
            <div style={{flex:1, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", textAlign:"center", padding:"40px 20px"}}>
              <div style={{width:"52px", height:"52px", borderRadius:"14px", background:"#0d0f10", border:"1px solid #2a2f32", display:"flex", alignItems:"center", justifyContent:"center", marginBottom:"20px"}}>
                <BarChartIcon/>
              </div>
              <div style={{fontFamily:"'DM Serif Display',serif", fontSize:"24px", color:"#f0ead6", letterSpacing:"-0.5px", marginBottom:"8px"}}>Ask about your documents</div>
              <div style={{fontSize:"12px", color:"#4a4f52", maxWidth:"300px", lineHeight:1.7, marginBottom:"28px"}}>Index any financial report and ask business questions. Every answer is cited from your documents.</div>
              <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:"8px", maxWidth:"360px", width:"100%"}}>
                {["Revenue breakdown", "Risk factors", "Operating income", "Guidance & outlook"].map((s, i) => (
                  <button key={i} onClick={() => handleSend(s)}
                    style={{padding:"10px 14px", borderRadius:"9px", border:"1px solid #1c1f20", background:"#0d0f10", fontSize:"11px", color:"#6a6f72", cursor:"pointer", fontFamily:"inherit", textAlign:"left", transition:"all .15s", lineHeight:1.4}}
                    onMouseEnter={e => { e.currentTarget.style.borderColor="#2a2208"; e.currentTarget.style.color="#c8a96e"; e.currentTarget.style.background="#0f0e09" }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor="#1c1f20"; e.currentTarget.style.color="#6a6f72"; e.currentTarget.style.background="#0d0f10" }}>
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}
          {messages.map((msg, i) => <Message key={i} msg={msg}/>)}
          {loading && <Typing/>}
          <div ref={bottomRef}/>
        </div>

        <div style={{padding:"12px 24px 18px", background:"#0a0c0d", borderTop:"1px solid #1c1f20"}}>
          <div style={{display:"flex", alignItems:"flex-end", gap:"10px", background:"#111314", border:"1px solid #2a2f32", borderRadius:"14px", padding:"12px 14px", transition:"border-color .2s"}}
            onFocus={e => e.currentTarget.style.borderColor="#3a3218"}
            onBlur={e => e.currentTarget.style.borderColor="#2a2f32"}>
            <textarea
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend() }}}
              placeholder="Ask anything about your indexed documents..."
              rows={1}
              style={{flex:1, background:"transparent", border:"none", outline:"none", fontSize:"13px", color:"#f0ead6", fontFamily:"'DM Sans',sans-serif", resize:"none", lineHeight:1.6}}
            />
            <button onClick={() => handleSend()} disabled={!input.trim() || loading}
              style={{width:"32px", height:"32px", borderRadius:"8px", border:"none", background: input.trim() && !loading ? "linear-gradient(135deg,#c8a96e,#8b6914)" : "#1c1f20", color: input.trim() && !loading ? "#0d0b06" : "#3a3f42", display:"flex", alignItems:"center", justifyContent:"center", cursor: input.trim() ? "pointer" : "not-allowed", flexShrink:0, transition:"all .2s"}}>
              <SendIcon/>
            </button>
          </div>
          <div style={{textAlign:"center", fontSize:"10px", color:"#2a2f32", marginTop:"8px", letterSpacing:"0.03em"}}>Enter to send · Shift+Enter for new line · All answers cited from your documents</div>
        </div>
      </div>
    </div>
  )
}