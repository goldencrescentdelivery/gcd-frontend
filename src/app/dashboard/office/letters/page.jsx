'use client'
import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/auth'
import { API } from '@/lib/api'
import { ScrollText, Plus, Printer, ChevronLeft, User, Trash2 } from 'lucide-react'

const hdr = () => ({ Authorization: `Bearer ${localStorage.getItem('gcd_token')}` })
const TODAY = () => new Date().toISOString().split('T')[0]

function fmtDate(d) {
  if (!d) return ''
  const s = typeof d === 'string' ? d.split('T')[0] : d
  return new Date(s + 'T12:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
}

function fmtShort(d) {
  if (!d) return ''
  return new Date(d).toLocaleDateString('en-AE', { day: 'numeric', month: 'short', year: 'numeric' })
}

function buildLetterHTML(l, origin) {
  const bodyHtml = (l.body || '').split('\n').map(
    line => `<p style="margin:0 0 11px 0;line-height:1.75;text-align:justify">${line.trim() ? line : '&nbsp;'}</p>`
  ).join('')

  return `<div style="width:794px;min-height:1123px;background:#fff;font-family:Georgia,serif;font-size:13.5px;color:#1a1a1a;position:relative;padding-bottom:130px;box-sizing:border-box;overflow:hidden">

  <!-- tilted watermark: oversized rotated div so rotation doesn't leave gaps -->
  <div style="position:absolute;top:-30%;left:-30%;width:160%;height:160%;pointer-events:none;z-index:0;
    background-image:url('${origin}/logo.webp');
    background-repeat:repeat;
    background-size:65px auto;
    transform:rotate(-18deg);
    opacity:0.033"></div>

  <!-- content above watermark -->
  <div style="position:relative;z-index:1">

  <!-- header -->
  <div style="padding:28px 40px 16px;display:flex;align-items:center;gap:18px;border-bottom:2.5px solid #B8860B">
    <img src="${origin}/logo.webp" style="height:58px;object-fit:contain" alt="" onerror="this.style.display='none'"/>
    <div style="font-size:26px;font-weight:700;font-family:Arial,sans-serif;letter-spacing:0.2px">
      Golden Crescent <span style="font-style:italic;color:#B8860B;font-family:Georgia,serif">Delivery Services</span> LLC
    </div>
  </div>

  <!-- body -->
  <div style="padding:28px 40px 0">

    <!-- ref + date -->
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:24px;font-size:11.5px;font-family:Arial,sans-serif;color:#555">
      <span style="font-weight:700;color:#333">Ref: ${l.ref_no || '—'}</span>
      <span>${fmtDate(l.date)}</span>
    </div>

    <!-- subject (Re:) FIRST -->
    ${l.subject ? `
    <div style="margin-bottom:14px">
      <p style="margin:0 0 6px;font-size:16px;font-weight:700">Re: ${l.subject}</p>
      <div style="height:2px;width:240px;background:#B8860B;border-radius:1px"></div>
    </div>` : ''}

    <!-- to — below subject -->
    <p style="margin:0 0 22px;font-weight:700;font-size:13.5px">${l.to_name || 'To Whom It May Concern'}</p>

    <!-- greeting -->
    <p style="margin:0 0 16px">${l.greeting || 'Dear Sir / Madam,'}</p>

    <!-- body -->
    <div style="margin-bottom:44px">${bodyHtml}</div>

    <!-- closing -->
    <p style="margin:0 0 26px">With warm regards,</p>

    <!-- signature left, stamp far right -->
    <div style="position:relative;min-height:120px;margin-bottom:6px">
      <!-- signature above name, left side -->
      <div style="display:inline-block">
        <img src="${origin}/sign.png"
          style="height:78px;display:block;margin-bottom:2px;mix-blend-mode:screen"
          alt="" onerror="this.style.display='none'"/>
        <p style="margin:0 0 1px;font-size:15.5px;font-weight:700">Vardeep Singh Sodhi</p>
        <p style="margin:0 0 1px;font-size:12px;color:#555;font-family:Arial,sans-serif">Director</p>
        <p style="margin:0;font-size:11.5px;color:#777;font-family:Arial,sans-serif">Golden Crescent Delivery Services LLC</p>
      </div>
      <!-- stamp far right -->
      <img src="${origin}/stamp.png"
        style="position:absolute;right:20px;top:-10px;height:118px;mix-blend-mode:multiply"
        alt="" onerror="this.style.display='none'"/>
    </div>

  </div>
  </div><!-- /z-index wrapper -->

  <!-- footer — full width, no gap -->
  <div style="position:absolute;bottom:0;left:0;right:0;width:100%;padding:16px 40px;background:#f0ede6;border-top:2px solid #B8860B;display:grid;grid-template-columns:1fr 1fr 1fr;gap:20px;box-sizing:border-box">
    <div>
      <div style="font-size:8px;letter-spacing:2.5px;font-weight:700;color:#B8860B;font-family:Arial,sans-serif;text-transform:uppercase;margin-bottom:5px">ADDRESS</div>
      <div style="font-size:10.5px;color:#444;line-height:1.55;font-family:Arial,sans-serif">Office 68, 18th Floor<br>Burjuman Business Tower, Dubai</div>
    </div>
    <div>
      <div style="font-size:8px;letter-spacing:2.5px;font-weight:700;color:#B8860B;font-family:Arial,sans-serif;text-transform:uppercase;margin-bottom:5px">CONTACT</div>
      <div style="font-size:10.5px;color:#444;line-height:1.55;font-family:Arial,sans-serif">Landline · 042 59 291<br>Mobile · +971 52 220 1435</div>
    </div>
    <div>
      <div style="font-size:8px;letter-spacing:2.5px;font-weight:700;color:#B8860B;font-family:Arial,sans-serif;text-transform:uppercase;margin-bottom:5px">ONLINE</div>
      <div style="font-size:10.5px;color:#444;line-height:1.55;font-family:Arial,sans-serif">vardeep@crescentdelivery.com<br>goldencrescent.ae</div>
    </div>
  </div>
</div>`
}

function openPrint(letter) {
  const origin = window.location.origin
  const w = window.open('', '_blank')
  w.document.write(`<!DOCTYPE html>
<html><head><meta charset="UTF-8"><title>${letter.ref_no}</title>
<style>
  *{box-sizing:border-box}
  @page{size:A4 portrait;margin:0}
  body{margin:0;padding:0;background:#fff}
  @media print{html,body{width:794px}body{-webkit-print-color-adjust:exact;print-color-adjust:exact}}
</style></head><body>
${buildLetterHTML(letter, origin)}
<script>
window.onload=function(){
  var imgs=document.images,n=imgs.length,d=0
  if(!n){window.print();return}
  for(var i=0;i<n;i++){
    imgs[i].onload=imgs[i].onerror=function(){if(++d===n)window.print()}
  }
  setTimeout(function(){window.print()},1800)
}
</script></body></html>`)
  w.document.close()
}

const inputStyle = {
  width:'100%', padding:'8px 11px', borderRadius:8,
  border:'1px solid var(--border)', background:'var(--card)', color:'var(--text)',
  fontSize:12.5, fontFamily:'Poppins,sans-serif', boxSizing:'border-box', outline:'none',
}
const labelStyle = {
  fontSize:10.5, fontWeight:700, color:'var(--text-muted)',
  textTransform:'uppercase', letterSpacing:'0.05em', display:'block', marginBottom:5,
}

export default function LettersPage() {
  const { user } = useAuth()
  const [view,     setView]     = useState('list')
  const [letters,  setLetters]  = useState([])
  const [loading,  setLoading]  = useState(true)
  const [saving,   setSaving]   = useState(false)

  // form
  const [date,     setDate]     = useState(TODAY())
  const [toName,   setToName]   = useState('')
  const [subject,  setSubject]  = useState('')
  const [greeting, setGreeting] = useState('Dear Sir / Madam,')
  const [body,     setBody]     = useState('')

  const draft = { date, to_name: toName, subject, greeting, body, ref_no: 'GCD/LTR/PREVIEW' }
  const SCALE = 0.61

  useEffect(() => {
    fetch(`${API}/api/letters`, { headers: hdr() })
      .then(r => r.json()).then(d => setLetters(d.letters || []))
      .catch(() => {}).finally(() => setLoading(false))
  }, [])

  function resetForm() {
    setDate(TODAY()); setToName(''); setSubject(''); setGreeting('Dear Sir / Madam,'); setBody('')
  }

  async function handleSave() {
    if (!body.trim()) return
    setSaving(true)
    try {
      const r = await fetch(`${API}/api/letters`, {
        method: 'POST',
        headers: { ...hdr(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ date, to_name: toName || null, subject: subject || null, greeting, body }),
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error)
      setLetters(prev => [d.letter, ...prev])
      openPrint(d.letter)
      setView('list')
      resetForm()
    } catch (e) { alert(e.message) }
    finally { setSaving(false) }
  }

  async function handleDelete(id) {
    if (!confirm('Delete this letter record?')) return
    await fetch(`${API}/api/letters/${id}`, { method: 'DELETE', headers: hdr() })
    setLetters(prev => prev.filter(l => l.id !== id))
  }

  // ── Compose view ──────────────────────────────────────────────
  if (view === 'compose') return (
    <div style={{ display:'flex', flexDirection:'column', gap:0, height:'calc(100vh - 100px)' }}>

      {/* toolbar */}
      <div style={{ display:'flex', alignItems:'center', gap:12, paddingBottom:14, borderBottom:'1px solid var(--border)', flexShrink:0 }}>
        <button onClick={() => { setView('list'); resetForm() }}
          style={{ display:'flex', alignItems:'center', gap:5, padding:'7px 12px', borderRadius:8, border:'1px solid var(--border)', background:'var(--card)', color:'var(--text)', fontSize:12, cursor:'pointer', fontFamily:'Poppins,sans-serif' }}>
          <ChevronLeft size={13}/> Back
        </button>
        <span style={{ fontSize:14, fontWeight:700, color:'var(--text)' }}>New Letter</span>
        <div style={{ flex:1 }}/>
        <button onClick={handleSave} disabled={!body.trim() || saving}
          style={{ display:'flex', alignItems:'center', gap:7, padding:'8px 20px', borderRadius:9, border:'none', background:'#B8860B', color:'white', fontWeight:700, fontSize:13, cursor:'pointer', fontFamily:'Poppins,sans-serif', opacity:(!body.trim() || saving) ? 0.55 : 1 }}>
          <Printer size={14}/> {saving ? 'Saving…' : 'Save & Print'}
        </button>
      </div>

      {/* two-column */}
      <div style={{ display:'grid', gridTemplateColumns:'320px 1fr', gap:20, flex:1, overflow:'hidden', paddingTop:16 }}>

        {/* form */}
        <div style={{ overflowY:'auto', display:'flex', flexDirection:'column', gap:13, paddingRight:4 }}>
          <div>
            <label style={labelStyle}>Date</label>
            <input type="date" value={date} onChange={e => setDate(e.target.value)} style={inputStyle}/>
          </div>
          <div>
            <label style={labelStyle}>To (Recipient)</label>
            <input value={toName} onChange={e => setToName(e.target.value)}
              placeholder="e.g. The Manager, ABC Company" style={inputStyle}/>
            <div style={{ fontSize:10, color:'var(--text-muted)', marginTop:3 }}>Leave blank → "To Whom It May Concern"</div>
          </div>
          <div>
            <label style={labelStyle}>Subject (Re:)</label>
            <input value={subject} onChange={e => setSubject(e.target.value)}
              placeholder="e.g. Service Introduction" style={inputStyle}/>
          </div>
          <div>
            <label style={labelStyle}>Greeting</label>
            <input value={greeting} onChange={e => setGreeting(e.target.value)} style={inputStyle}/>
          </div>
          <div>
            <label style={labelStyle}>Letter Body <span style={{ color:'#E53E3E' }}>*</span></label>
            <textarea value={body} onChange={e => setBody(e.target.value)} rows={18}
              placeholder="Write your letter content here…"
              style={{ ...inputStyle, fontFamily:'Georgia,serif', lineHeight:1.75, resize:'vertical', padding:'10px 11px' }}/>
          </div>
        </div>

        {/* live preview */}
        <div style={{ overflowY:'auto', background:'#d8d8d8', borderRadius:10, padding:20, display:'flex', justifyContent:'center', alignItems:'flex-start' }}>
          <div style={{ width: 794 * SCALE, flexShrink:0, boxShadow:'0 4px 24px rgba(0,0,0,0.18)', borderRadius:2, overflow:'hidden', background:'white' }}>
            <div style={{ transform:`scale(${SCALE})`, transformOrigin:'top left', width:794, pointerEvents:'none' }}
              dangerouslySetInnerHTML={{ __html: buildLetterHTML(draft, '') }}/>
          </div>
        </div>
      </div>
    </div>
  )

  // ── List view ─────────────────────────────────────────────────
  const thisMonth = letters.filter(l => {
    const d = new Date(l.created_at), n = new Date()
    return d.getMonth() === n.getMonth() && d.getFullYear() === n.getFullYear()
  }).length

  return (
    <div>
      {/* stats + action */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr auto', gap:12, marginBottom:20, alignItems:'stretch' }}>
        <div style={{ background:'var(--card)', border:'1px solid var(--border)', borderRadius:12, padding:'12px 16px' }}>
          <div style={{ fontSize:10, color:'var(--text-muted)', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.05em' }}>Total Letters</div>
          <div style={{ fontSize:28, fontWeight:800, color:'#B8860B', lineHeight:1.1, marginTop:3 }}>{letters.length}</div>
        </div>
        <div style={{ background:'var(--card)', border:'1px solid var(--border)', borderRadius:12, padding:'12px 16px' }}>
          <div style={{ fontSize:10, color:'var(--text-muted)', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.05em' }}>This Month</div>
          <div style={{ fontSize:28, fontWeight:800, color:'#6366F1', lineHeight:1.1, marginTop:3 }}>{thisMonth}</div>
        </div>
        <button onClick={() => setView('compose')}
          style={{ display:'flex', alignItems:'center', gap:8, padding:'0 24px', borderRadius:12, border:'none', background:'#B8860B', color:'white', fontWeight:700, fontSize:13, cursor:'pointer', fontFamily:'Poppins,sans-serif' }}>
          <Plus size={15}/> New Letter
        </button>
      </div>

      {/* table */}
      {loading ? (
        <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
          {[1,2,3].map(i => <div key={i} style={{ height:54, background:'var(--card)', borderRadius:10, opacity:0.5, animation:'pulse 1.5s ease infinite' }}/>)}
        </div>
      ) : letters.length === 0 ? (
        <div style={{ textAlign:'center', padding:'60px 20px', color:'var(--text-muted)' }}>
          <ScrollText size={40} style={{ margin:'0 auto 12px', display:'block', opacity:0.2 }}/>
          <div style={{ fontWeight:600, fontSize:14 }}>No letters generated yet</div>
          <div style={{ fontSize:12, marginTop:4 }}>Click "New Letter" to create your first official letter</div>
        </div>
      ) : (
        <div style={{ background:'var(--card)', border:'1px solid var(--border)', borderRadius:12, overflow:'hidden' }}>
          <table style={{ width:'100%', borderCollapse:'collapse' }}>
            <thead>
              <tr style={{ borderBottom:'1px solid var(--border)', background:'var(--bg-alt)' }}>
                {['Ref No.','Date','To','Subject','Generated By','Created',''].map(h => (
                  <th key={h} style={{ padding:'10px 14px', textAlign:'left', fontSize:10, fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.05em', whiteSpace:'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {letters.map((l, i) => (
                <tr key={l.id} style={{ borderBottom: i < letters.length - 1 ? '1px solid var(--border)' : 'none' }}>
                  <td style={{ padding:'10px 14px', fontSize:12, fontWeight:700, color:'#B8860B', fontFamily:'monospace', whiteSpace:'nowrap' }}>{l.ref_no}</td>
                  <td style={{ padding:'10px 14px', fontSize:12, color:'var(--text)', whiteSpace:'nowrap' }}>{fmtDate(l.date)}</td>
                  <td style={{ padding:'10px 14px', fontSize:12, color:'var(--text)', maxWidth:180, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{l.to_name || <span style={{ color:'var(--text-muted)' }}>To Whom It May Concern</span>}</td>
                  <td style={{ padding:'10px 14px', fontSize:12, color:'var(--text)', maxWidth:200, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{l.subject || <span style={{ color:'var(--text-muted)' }}>—</span>}</td>
                  <td style={{ padding:'10px 14px', fontSize:12, color:'var(--text-muted)', whiteSpace:'nowrap' }}>
                    <div style={{ display:'flex', alignItems:'center', gap:5 }}><User size={11}/>{l.created_by_name || '—'}</div>
                  </td>
                  <td style={{ padding:'10px 14px', fontSize:11.5, color:'var(--text-muted)', whiteSpace:'nowrap' }}>{fmtShort(l.created_at)}</td>
                  <td style={{ padding:'10px 14px' }}>
                    <div style={{ display:'flex', gap:6 }}>
                      <button onClick={() => openPrint(l)}
                        style={{ display:'flex', alignItems:'center', gap:5, padding:'5px 11px', borderRadius:7, border:'1px solid var(--border)', background:'var(--bg-alt)', color:'var(--text)', fontSize:11.5, cursor:'pointer', fontFamily:'Poppins,sans-serif', whiteSpace:'nowrap' }}>
                        <Printer size={11}/> Print
                      </button>
                      {user?.role === 'admin' && (
                        <button onClick={() => handleDelete(l.id)}
                          style={{ display:'flex', alignItems:'center', padding:'5px 8px', borderRadius:7, border:'1px solid #FCA5A5', background:'#FEF2F2', color:'#EF4444', fontSize:11.5, cursor:'pointer' }}>
                          <Trash2 size={11}/>
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
