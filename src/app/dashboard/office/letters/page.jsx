'use client'
import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/auth'
import { API } from '@/lib/api'
import { ScrollText, Plus, Printer, ChevronLeft, User, Trash2, Pencil, CheckCircle, Clock, Send, Download } from 'lucide-react'

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
function buildBodyHtml(body) {
  return (body || '').split('\n').map(
    line => `<p style="margin:0 0 11px 0;line-height:1.75;text-align:justify">${line.trim() ? line : '&nbsp;'}</p>`
  ).join('')
}
function getVerifyUrl(l, origin) {
  if (!l?.id) return ''
  return `${origin || ''}/verify/letter/${encodeURIComponent(l.id)}`
}
function getQrUrl(value, size = 96) {
  if (!value) return ''
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&margin=1&data=${encodeURIComponent(value)}`
}
function buildVerificationBlock(l, origin, size = 96) {
  const verifyUrl = getVerifyUrl(l, origin)
  if (!verifyUrl) return ''
  const qrUrl = getQrUrl(verifyUrl, size)
  return `
    <div style="position:absolute;right:40px;bottom:104px;width:116px;text-align:center;font-family:Arial,sans-serif;color:#444;z-index:3">
      <img src="${qrUrl}" style="width:${size}px;height:${size}px;display:block;margin:0 auto 5px;background:#fff;padding:4px;border:1px solid #ddd" alt="Document verification QR"/>
      <div style="font-size:8px;letter-spacing:0.8px;text-transform:uppercase;font-weight:700;color:#B8860B;margin-bottom:2px">Verify Document</div>
    </div>`
}

// ── Preview / Print HTML ─────────────────────────────────────────
function buildLetterHTML(l, origin) {
  const bodyHtml  = buildBodyHtml(l.body)
  const showSign  = l.show_sign  !== false
  const showStamp = l.show_stamp !== false
  const verifyBlock = buildVerificationBlock(l, origin, 82)
  return `<div style="width:794px;min-height:1123px;background:#fff;font-family:Georgia,serif;font-size:13.5px;color:#1a1a1a;position:relative;padding-bottom:130px;box-sizing:border-box;overflow:hidden">

  <div style="position:absolute;top:-30%;left:-30%;width:160%;height:160%;pointer-events:none;z-index:0;
    background-image:url('${origin}/watermark.png');background-repeat:repeat;background-size:90px auto;
    transform:rotate(-18deg);opacity:0.045"></div>

  <div style="position:relative;z-index:1">
  <div style="padding:28px 40px 16px;display:flex;align-items:center;gap:18px;border-bottom:2.5px solid #B8860B">
    <img src="${origin}/logo.webp" style="height:58px;object-fit:contain" alt="" onerror="this.style.display='none'"/>
    <div style="font-size:26px;font-weight:700;font-family:Georgia,serif;font-style:italic;letter-spacing:0.2px">
      Golden Crescent <span style="color:#B8860B">Delivery Services</span> LLC
    </div>
  </div>

  <div style="padding:28px 40px 0">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:24px;font-size:11.5px;font-family:Arial,sans-serif;color:#555">
      <span style="font-weight:700;color:#333">Ref: ${l.ref_no || '—'}</span>
      <span>${fmtDate(l.date)}</span>
    </div>
    <p style="margin:0 0 14px;font-weight:700;font-size:13.5px">${l.to_name || 'To Whom It May Concern'}</p>
    ${l.subject ? `<div style="margin-bottom:18px"><p style="margin:0 0 6px;font-size:16px;font-weight:700">Re: ${l.subject}</p><div style="height:2px;width:240px;background:#B8860B;border-radius:1px"></div></div>` : ''}
    <p style="margin:0 0 16px">${l.greeting || 'Dear Sir / Madam,'}</p>
    <div style="margin-bottom:44px">${bodyHtml}</div>
    <p style="margin:0 0 26px">With warm regards,</p>
    <div style="position:relative;min-height:140px;margin-bottom:6px;width:100%">
      <div style="display:inline-block">
        ${showSign ? `<img src="${l.signature_data || (origin + '/sign.png')}" style="height:78px;display:block;margin-bottom:2px;mix-blend-mode:${l.signature_data ? 'multiply' : 'screen'}" alt="" onerror="this.style.display='none'"/>` : '<div style="height:80px"></div>'}
        <p style="margin:0 0 1px;font-size:15.5px;font-weight:700">${l.signer_name || 'Vardeep Singh Sodhi'}</p>
        <p style="margin:0 0 1px;font-size:12px;color:#555;font-family:Arial,sans-serif">${l.signer_title || 'Director'}</p>
        <p style="margin:0;font-size:11.5px;color:#777;font-family:Arial,sans-serif">Golden Crescent Delivery Services LLC</p>
      </div>
      ${showStamp ? `<img src="${origin}/stamp.png" style="position:absolute;right:0;top:0;height:118px;mix-blend-mode:multiply" alt="" onerror="this.style.display='none'"/>` : ''}
    </div>
  </div>
  </div>
  ${verifyBlock}

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

function buildPrintHTML(l, origin) {
  const bodyHtml  = buildBodyHtml(l.body)
  const showSign  = l.show_sign  !== false
  const showStamp = l.show_stamp !== false
  const verifyBlock = buildVerificationBlock(l, origin, 96)
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>${l.ref_no}</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  @page{size:A4 portrait;margin:0}
  body{background:#fff;-webkit-print-color-adjust:exact;print-color-adjust:exact;
    font-family:Georgia,serif;font-size:13.5px;color:#1a1a1a;width:794px}
  .wm{position:fixed;top:-30%;left:-30%;width:160%;height:160%;
    background-image:url('${origin}/watermark.png');
    background-repeat:repeat;background-size:90px auto;
    transform:rotate(-18deg);opacity:0.045;pointer-events:none;z-index:0}
  .ph{position:fixed;top:0;left:0;width:794px;background:#fff;z-index:2}
  .pf{position:fixed;bottom:0;left:0;width:794px;z-index:2}
  .pc{margin-top:106px;margin-bottom:84px;padding:28px 40px 32px;position:relative;z-index:1}
  .verify-block{position:fixed!important}
</style>
</head>
<body>
<div class="wm"></div>

<div class="ph">
  <div style="padding:28px 40px 16px;display:flex;align-items:center;gap:18px;border-bottom:2.5px solid #B8860B">
    <img src="${origin}/logo.webp" style="height:58px;object-fit:contain" alt="" onerror="this.style.display='none'"/>
    <div style="font-size:26px;font-weight:700;font-family:Georgia,serif;font-style:italic;letter-spacing:0.2px">
      Golden Crescent <span style="color:#B8860B">Delivery Services</span> LLC
    </div>
  </div>
</div>

<div class="pf">
  <div style="padding:16px 40px;background:#f0ede6;border-top:2px solid #B8860B;display:grid;grid-template-columns:1fr 1fr 1fr;gap:20px">
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
</div>

<div class="pc">
  <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:24px;font-size:11.5px;font-family:Arial,sans-serif;color:#555">
    <span style="font-weight:700;color:#333">Ref: ${l.ref_no || '—'}</span>
    <span>${fmtDate(l.date)}</span>
  </div>
  <p style="margin:0 0 14px;font-weight:700;font-size:13.5px">${l.to_name || 'To Whom It May Concern'}</p>
  ${l.subject ? `<div style="margin-bottom:18px"><p style="margin:0 0 6px;font-size:16px;font-weight:700">Re: ${l.subject}</p><div style="height:2px;width:240px;background:#B8860B;border-radius:1px"></div></div>` : ''}
  <p style="margin:0 0 16px">${l.greeting || 'Dear Sir / Madam,'}</p>
  <div style="margin-bottom:44px">${bodyHtml}</div>
  <p style="margin:0 0 26px">With warm regards,</p>
  <div style="position:relative;min-height:140px;margin-bottom:6px;width:100%">
    <div style="display:inline-block">
      ${showSign ? `<img src="${l.signature_data || (origin + '/sign.png')}" style="height:78px;display:block;margin-bottom:2px;mix-blend-mode:${l.signature_data ? 'multiply' : 'screen'}" alt="" onerror="this.style.display='none'"/>` : '<div style="height:80px"></div>'}
      <p style="margin:0 0 1px;font-size:15.5px;font-weight:700">${l.signer_name || 'Vardeep Singh Sodhi'}</p>
      <p style="margin:0 0 1px;font-size:12px;color:#555;font-family:Arial,sans-serif">${l.signer_title || 'Director'}</p>
      <p style="margin:0;font-size:11.5px;color:#777;font-family:Arial,sans-serif">Golden Crescent Delivery Services LLC</p>
    </div>
    ${showStamp ? `<img src="${origin}/stamp.png" style="position:absolute;right:0;top:0;height:118px;mix-blend-mode:multiply" alt="" onerror="this.style.display='none'"/>` : ''}
  </div>
</div>
${verifyBlock.replace('position:absolute;', 'position:fixed;')}

<script>
window.onload=function(){
  var imgs=document.images,n=imgs.length,d=0
  if(!n){window.print();return}
  for(var i=0;i<n;i++){
    imgs[i].onload=imgs[i].onerror=function(){if(++d===n)window.print()}
  }
  setTimeout(function(){window.print()},1800)
}
</script>
</body>
</html>`
}

function openPrint(letter) {
  const origin = window.location.origin
  const w = window.open('', '_blank')
  w.document.write(buildPrintHTML(letter, origin))
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

function Toggle({ checked, onChange, label }) {
  return (
    <label style={{ display:'flex', alignItems:'center', gap:8, cursor:'pointer', userSelect:'none' }}>
      <div style={{ position:'relative', width:36, height:20, flexShrink:0 }}>
        <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)}
          style={{ opacity:0, width:0, height:0, position:'absolute' }}/>
        <div style={{ position:'absolute', inset:0, borderRadius:20, background: checked ? '#B8860B' : '#CBD5E1', transition:'background 0.2s' }}/>
        <div style={{ position:'absolute', top:2, left: checked ? 18 : 2, width:16, height:16, borderRadius:'50%', background:'white', boxShadow:'0 1px 3px rgba(0,0,0,0.2)', transition:'left 0.2s' }}/>
      </div>
      <span style={{ fontSize:12, fontWeight:600, color:'var(--text)' }}>{label}</span>
    </label>
  )
}

export default function LettersPage() {
  const { user } = useAuth()
  const isAdmin  = user?.role === 'admin'

  const [view,      setView]      = useState('list')
  const [letters,   setLetters]   = useState([])
  const [loading,   setLoading]   = useState(true)
  const [saving,    setSaving]    = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [submitted, setSubmitted] = useState(false)

  // form fields
  const [date,      setDate]      = useState(TODAY())
  const [toName,    setToName]    = useState('')
  const [subject,   setSubject]   = useState('')
  const [greeting,  setGreeting]  = useState('Dear Sir / Madam,')
  const [body,      setBody]      = useState('')
  const [showSign,  setShowSign]  = useState(true)
  const [showStamp, setShowStamp] = useState(true)
  const [signerName,     setSignerName]     = useState('')
  const [signerTitle,    setSignerTitle]    = useState('')
  const [signatureData,  setSignatureData]  = useState(null)
  const [downloading,    setDownloading]    = useState(false)

  const editingLetter = editingId ? letters.find(l => l.id === editingId) : null
  const draft = {
    date, to_name: toName, subject, greeting, body,
    ref_no: editingLetter?.ref_no || 'GCD/LTR/PREVIEW',
    id: editingLetter?.id || null,
    show_sign: showSign, show_stamp: showStamp,
    signer_name: signerName, signer_title: signerTitle, signature_data: signatureData,
  }
  const SCALE = 0.61

  useEffect(() => {
    fetch(`${API}/api/letters`, { headers: hdr() })
      .then(r => r.json()).then(d => setLetters(d.letters || []))
      .catch(() => {}).finally(() => setLoading(false))
  }, [])

  function resetForm() {
    setDate(TODAY()); setToName(''); setSubject('')
    setGreeting('Dear Sir / Madam,'); setBody('')
    setShowSign(true); setShowStamp(true)
    setSignerName(''); setSignerTitle(''); setSignatureData(null)
    setEditingId(null); setSubmitted(false)
  }

  function handleSignatureUpload(e) {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => {
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        const maxW = 500, maxH = 200
        let w = img.width, h = img.height
        if (w > maxW) { h = Math.round(h * maxW / w); w = maxW }
        if (h > maxH) { w = Math.round(w * maxH / h); h = maxH }
        canvas.width = w; canvas.height = h
        canvas.getContext('2d').drawImage(img, 0, 0, w, h)
        setSignatureData(canvas.toDataURL('image/png'))
      }
      img.src = ev.target.result
    }
    reader.readAsDataURL(file)
  }

  async function downloadPDF(letter) {
    setDownloading(true)
    try {
      const origin = window.location.origin
      const html   = buildLetterHTML(letter, origin)
      const container = document.createElement('div')
      container.style.cssText = 'position:fixed;top:0;left:-9999px;width:794px;background:white;z-index:-1;'
      container.innerHTML = html
      document.body.appendChild(container)
      await new Promise(r => setTimeout(r, 1200))
      const [{ default: jsPDF }, { default: html2canvas }] = await Promise.all([
        import('jspdf'), import('html2canvas')
      ])
      const canvas = await html2canvas(container, {
        scale: 2, useCORS: true, logging: false,
        width: 794, height: 1123, windowWidth: 794,
      })
      document.body.removeChild(container)
      const imgData = canvas.toDataURL('image/jpeg', 0.92)
      const doc = new jsPDF({
        orientation: 'portrait', unit: 'px', format: [794, 1123],
        compress: true,
        encryption: {
          userPassword: '',
          ownerPassword: 'Khan@55884+',
          userPermissions: ['print'],
        },
      })
      doc.addImage(imgData, 'JPEG', 0, 0, 794, 1123)
      doc.save(`${letter.ref_no || 'letter'}.pdf`)
    } catch (e) {
      alert('PDF generation failed: ' + e.message)
    } finally {
      setDownloading(false)
    }
  }

  function loadEdit(letter) {
    const s = typeof letter.date === 'string' ? letter.date.split('T')[0] : letter.date
    setDate(s || TODAY())
    setToName(letter.to_name || '')
    setSubject(letter.subject || '')
    setGreeting(letter.greeting || 'Dear Sir / Madam,')
    setBody(letter.body || '')
    setShowSign(letter.show_sign !== false)
    setShowStamp(letter.show_stamp !== false)
    setSignerName(letter.signer_name || '')
    setSignerTitle(letter.signer_title || '')
    setSignatureData(letter.signature_data || null)
    setEditingId(letter.id)
    setSubmitted(false)
    setView('compose')
  }

  async function handleSave() {
    if (!body.trim()) return
    setSaving(true)
    try {
      const payload = {
        date, to_name: toName || null, subject: subject || null, greeting, body,
        show_sign: showSign, show_stamp: showStamp,
        signer_name: signerName || null,
        signer_title: signerTitle || null,
        signature_data: signatureData || null,
      }

      let saved
      if (editingId) {
        const r = await fetch(`${API}/api/letters/${editingId}`, {
          method: 'PUT',
          headers: { ...hdr(), 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        const d = await r.json()
        if (!r.ok) throw new Error(d.error)
        saved = d.letter
        setLetters(prev => prev.map(l => l.id === editingId ? saved : l))
      } else {
        const r = await fetch(`${API}/api/letters`, {
          method: 'POST',
          headers: { ...hdr(), 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        const d = await r.json()
        if (!r.ok) throw new Error(d.error)
        saved = d.letter
        setLetters(prev => [saved, ...prev])
      }

      if (isAdmin) {
        openPrint(saved)
        setView('list')
        resetForm()
      } else {
        setSubmitted(true)
      }
    } catch (e) { alert(e.message) }
    finally { setSaving(false) }
  }

  async function handleApprove(letter) {
    try {
      const r = await fetch(`${API}/api/letters/${letter.id}/approve`, {
        method: 'PATCH', headers: hdr(),
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error)
      setLetters(prev => prev.map(l => l.id === letter.id ? d.letter : l))
      openPrint(d.letter)
    } catch (e) { alert(e.message) }
  }

  async function handleDelete(id) {
    if (!confirm('Delete this letter record?')) return
    await fetch(`${API}/api/letters/${id}`, { method: 'DELETE', headers: hdr() })
    setLetters(prev => prev.filter(l => l.id !== id))
  }

  function canEdit(letter) {
    return isAdmin || String(letter.created_by) === String(user?.id)
  }

  // ── Submitted confirmation ────────────────────────────────────
  if (view === 'compose' && submitted) return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:16, padding:'80px 20px', textAlign:'center' }}>
      <div style={{ width:72, height:72, borderRadius:'50%', background:'#FFFBEB', border:'2px solid #FDE68A', display:'flex', alignItems:'center', justifyContent:'center' }}>
        <CheckCircle size={34} color="#B8860B"/>
      </div>
      <div style={{ fontWeight:800, fontSize:18, color:'var(--text)' }}>Submitted for Approval</div>
      <div style={{ fontSize:13, color:'var(--text-muted)', maxWidth:320 }}>
        Your letter has been saved and sent to the admin for approval. Once approved, it can be printed.
      </div>
      <button onClick={() => { setView('list'); resetForm() }}
        style={{ marginTop:8, padding:'10px 28px', borderRadius:10, border:'none', background:'#B8860B', color:'white', fontWeight:700, fontSize:13, cursor:'pointer', fontFamily:'Poppins,sans-serif' }}>
        Back to Letters
      </button>
    </div>
  )

  // ── Compose view ──────────────────────────────────────────────
  if (view === 'compose') return (
    <div style={{ display:'flex', flexDirection:'column', gap:0, height:'calc(100vh - 100px)' }}>

      {/* toolbar */}
      <div style={{ display:'flex', alignItems:'center', gap:12, paddingBottom:14, borderBottom:'1px solid var(--border)', flexShrink:0 }}>
        <button onClick={() => { setView('list'); resetForm() }}
          style={{ display:'flex', alignItems:'center', gap:5, padding:'7px 12px', borderRadius:8, border:'1px solid var(--border)', background:'var(--card)', color:'var(--text)', fontSize:12, cursor:'pointer', fontFamily:'Poppins,sans-serif' }}>
          <ChevronLeft size={13}/> Back
        </button>
        <span style={{ fontSize:14, fontWeight:700, color:'var(--text)' }}>
          {editingId ? 'Edit Letter' : 'New Letter'}
        </span>
        {!isAdmin && (
          <span style={{ fontSize:11, fontWeight:600, padding:'3px 10px', borderRadius:20, background:'#FFFBEB', border:'1px solid #FDE68A', color:'#92400E' }}>
            Requires admin approval to print
          </span>
        )}
        <div style={{ flex:1 }}/>
        {isAdmin && editingId && (
          <button onClick={() => downloadPDF(draft)} disabled={downloading}
            style={{ display:'flex', alignItems:'center', gap:7, padding:'8px 16px', borderRadius:9, border:'1px solid #B8860B', background:'white', color:'#B8860B', fontWeight:700, fontSize:13, cursor:'pointer', fontFamily:'Poppins,sans-serif', opacity: downloading ? 0.6 : 1 }}>
            <Download size={14}/>{downloading ? 'Generating…' : 'Download PDF'}
          </button>
        )}
        <button onClick={handleSave} disabled={!body.trim() || saving}
          style={{ display:'flex', alignItems:'center', gap:7, padding:'8px 20px', borderRadius:9, border:'none', background: isAdmin ? '#B8860B' : '#6366F1', color:'white', fontWeight:700, fontSize:13, cursor:'pointer', fontFamily:'Poppins,sans-serif', opacity:(!body.trim() || saving) ? 0.55 : 1 }}>
          {isAdmin ? <Printer size={14}/> : <Send size={14}/>}
          {saving
            ? (isAdmin ? (editingId ? 'Updating…' : 'Saving…') : 'Submitting…')
            : (isAdmin ? (editingId ? 'Update & Print' : 'Save & Print') : 'Submit for Approval')}
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
            <textarea value={body} onChange={e => setBody(e.target.value)} rows={14}
              placeholder="Write your letter content here…"
              style={{ ...inputStyle, fontFamily:'Georgia,serif', lineHeight:1.75, resize:'vertical', padding:'10px 11px' }}/>
          </div>

          {/* Sign & Stamp toggles */}
          <div style={{ background:'var(--bg-alt)', border:'1px solid var(--border)', borderRadius:10, padding:'12px 14px', display:'flex', flexDirection:'column', gap:10 }}>
            <div style={{ fontSize:10.5, fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.06em' }}>Letter Options</div>
            <Toggle checked={showSign}  onChange={setShowSign}  label="Include Signature"/>
            <Toggle checked={showStamp} onChange={setShowStamp} label="Include Stamp"/>
          </div>

          {/* Signature details */}
          {showSign && (
            <div style={{ background:'var(--bg-alt)', border:'1px solid var(--border)', borderRadius:10, padding:'12px 14px', display:'flex', flexDirection:'column', gap:10 }}>
              <div style={{ fontSize:10.5, fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.06em' }}>Signatory</div>
              <div>
                <label style={labelStyle}>Name</label>
                <input value={signerName} onChange={e => setSignerName(e.target.value)}
                  placeholder="e.g. John Smith" style={inputStyle}/>
              </div>
              <div>
                <label style={labelStyle}>Title / Position</label>
                <input value={signerTitle} onChange={e => setSignerTitle(e.target.value)}
                  placeholder="e.g. Operations Manager" style={inputStyle}/>
              </div>
              <div>
                <label style={labelStyle}>Signature Image</label>
                <input type="file" accept="image/*" onChange={handleSignatureUpload}
                  style={{ fontSize:11.5, color:'var(--text)', fontFamily:'Poppins,sans-serif' }}/>
                {signatureData && (
                  <div style={{ marginTop:8, background:'white', border:'1px solid var(--border)', borderRadius:6, padding:6, display:'inline-block' }}>
                    <img src={signatureData} style={{ height:56, display:'block' }} alt="Signature preview"/>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* live preview */}
        <div style={{ overflowY:'auto', background:'#d8d8d8', borderRadius:10, padding:20, display:'flex', justifyContent:'center', alignItems:'flex-start' }}>
          <div style={{ width: 794 * SCALE, flexShrink:0, boxShadow:'0 4px 24px rgba(0,0,0,0.18)', borderRadius:2, overflow:'hidden', background:'white' }}>
            <div style={{ transform:`scale(${SCALE})`, transformOrigin:'top left', width:794, pointerEvents:'none' }}
              dangerouslySetInnerHTML={{ __html: buildLetterHTML(draft, typeof window !== 'undefined' ? window.location.origin : '') }}/>
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
  const pending = letters.filter(l => l.status === 'pending').length

  return (
    <div>
      {/* stats + action */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr auto', gap:12, marginBottom:20, alignItems:'stretch' }}>
        <div style={{ background:'var(--card)', border:'1px solid var(--border)', borderRadius:12, padding:'12px 16px' }}>
          <div style={{ fontSize:10, color:'var(--text-muted)', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.05em' }}>Total Letters</div>
          <div style={{ fontSize:28, fontWeight:800, color:'#B8860B', lineHeight:1.1, marginTop:3 }}>{letters.length}</div>
        </div>
        <div style={{ background:'var(--card)', border:'1px solid var(--border)', borderRadius:12, padding:'12px 16px' }}>
          <div style={{ fontSize:10, color:'var(--text-muted)', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.05em' }}>This Month</div>
          <div style={{ fontSize:28, fontWeight:800, color:'#6366F1', lineHeight:1.1, marginTop:3 }}>{thisMonth}</div>
        </div>
        <div style={{ background: pending > 0 ? '#FFFBEB' : 'var(--card)', border:`1px solid ${pending > 0 ? '#FDE68A' : 'var(--border)'}`, borderRadius:12, padding:'12px 16px' }}>
          <div style={{ fontSize:10, color: pending > 0 ? '#92400E' : 'var(--text-muted)', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.05em' }}>Pending Approval</div>
          <div style={{ fontSize:28, fontWeight:800, color: pending > 0 ? '#D97706' : 'var(--text-muted)', lineHeight:1.1, marginTop:3 }}>{pending}</div>
        </div>
        <button onClick={() => { resetForm(); setView('compose') }}
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
                {['Ref No.','Date','To','Subject','Status','Generated By','Created',''].map(h => (
                  <th key={h} style={{ padding:'10px 14px', textAlign:'left', fontSize:10, fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.05em', whiteSpace:'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {letters.map((l, i) => {
                const isPending = l.status === 'pending'
                return (
                  <tr key={l.id} style={{ borderBottom: i < letters.length - 1 ? '1px solid var(--border)' : 'none', background: isPending ? '#FFFBEB44' : 'transparent' }}>
                    <td style={{ padding:'10px 14px', fontSize:12, fontWeight:700, color:'#B8860B', fontFamily:'monospace', whiteSpace:'nowrap' }}>{l.ref_no}</td>
                    <td style={{ padding:'10px 14px', fontSize:12, color:'var(--text)', whiteSpace:'nowrap' }}>{fmtDate(l.date)}</td>
                    <td style={{ padding:'10px 14px', fontSize:12, color:'var(--text)', maxWidth:160, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{l.to_name || <span style={{ color:'var(--text-muted)' }}>To Whom It May Concern</span>}</td>
                    <td style={{ padding:'10px 14px', fontSize:12, color:'var(--text)', maxWidth:180, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{l.subject || <span style={{ color:'var(--text-muted)' }}>—</span>}</td>
                    <td style={{ padding:'10px 14px', whiteSpace:'nowrap' }}>
                      {isPending ? (
                        <span style={{ display:'inline-flex', alignItems:'center', gap:4, fontSize:10.5, fontWeight:700, padding:'2px 9px', borderRadius:20, background:'#FFFBEB', border:'1px solid #FDE68A', color:'#92400E' }}>
                          <Clock size={10}/> Pending
                        </span>
                      ) : (
                        <span style={{ display:'inline-flex', alignItems:'center', gap:4, fontSize:10.5, fontWeight:700, padding:'2px 9px', borderRadius:20, background:'#ECFDF5', border:'1px solid #A7F3D0', color:'#065F46' }}>
                          <CheckCircle size={10}/> Approved
                        </span>
                      )}
                    </td>
                    <td style={{ padding:'10px 14px', fontSize:12, color:'var(--text-muted)', whiteSpace:'nowrap' }}>
                      <div style={{ display:'flex', alignItems:'center', gap:5 }}><User size={11}/>{l.created_by_name || '—'}</div>
                    </td>
                    <td style={{ padding:'10px 14px', fontSize:11.5, color:'var(--text-muted)', whiteSpace:'nowrap' }}>{fmtShort(l.created_at)}</td>
                    <td style={{ padding:'10px 14px' }}>
                      <div style={{ display:'flex', gap:6 }}>
                        {/* Admin: approve & print pending letters */}
                        {isAdmin && isPending && (
                          <button onClick={() => handleApprove(l)}
                            style={{ display:'flex', alignItems:'center', gap:5, padding:'5px 11px', borderRadius:7, border:'1px solid #FDE68A', background:'#FFFBEB', color:'#92400E', fontSize:11.5, cursor:'pointer', fontFamily:'Poppins,sans-serif', whiteSpace:'nowrap', fontWeight:600 }}>
                            <CheckCircle size={11}/> Approve & Print
                          </button>
                        )}
                        {/* Print approved letters */}
                        {!isPending && (
                          <button onClick={() => openPrint(l)}
                            style={{ display:'flex', alignItems:'center', gap:5, padding:'5px 11px', borderRadius:7, border:'1px solid var(--border)', background:'var(--bg-alt)', color:'var(--text)', fontSize:11.5, cursor:'pointer', fontFamily:'Poppins,sans-serif', whiteSpace:'nowrap' }}>
                            <Printer size={11}/> Print
                          </button>
                        )}
                        {/* Download PDF for approved letters */}
                        {!isPending && (
                          <button onClick={() => downloadPDF(l)} disabled={downloading}
                            style={{ display:'flex', alignItems:'center', gap:5, padding:'5px 11px', borderRadius:7, border:'1px solid #B8860B', background:'#FFFBEB', color:'#92400E', fontSize:11.5, cursor:'pointer', fontFamily:'Poppins,sans-serif', whiteSpace:'nowrap', opacity: downloading ? 0.6 : 1 }}>
                            <Download size={11}/> PDF
                          </button>
                        )}
                        {canEdit(l) && (
                          <button onClick={() => loadEdit(l)}
                            style={{ display:'flex', alignItems:'center', gap:5, padding:'5px 10px', borderRadius:7, border:'1px solid #93C5FD', background:'#EFF6FF', color:'#2563EB', fontSize:11.5, cursor:'pointer', whiteSpace:'nowrap' }}>
                            <Pencil size={11}/> Edit
                          </button>
                        )}
                        {isAdmin && (
                          <button onClick={() => handleDelete(l.id)}
                            style={{ display:'flex', alignItems:'center', padding:'5px 8px', borderRadius:7, border:'1px solid #FCA5A5', background:'#FEF2F2', color:'#EF4444', fontSize:11.5, cursor:'pointer' }}>
                            <Trash2 size={11}/>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
