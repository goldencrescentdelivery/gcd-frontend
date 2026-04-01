'use client'
import { ShieldCheck } from 'lucide-react'

export default function CompliancePage() {
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
      <div>
        <h1 style={{ fontWeight:900, fontSize:20, color:'var(--text)', letterSpacing:'-0.03em' }}>Compliance</h1>
        <p style={{ fontSize:12, color:'var(--text-muted)', marginTop:3 }}>Insurance policies, ILOE fines &amp; regulatory tracking</p>
      </div>
      <div style={{ background:'var(--card)', border:'1px solid var(--border)', borderRadius:16, padding:'60px 24px', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', textAlign:'center' }}>
        <div style={{ width:64, height:64, borderRadius:18, background:'linear-gradient(135deg,#EFF6FF,#DBEAFE)', border:'1px solid #BFDBFE', display:'flex', alignItems:'center', justifyContent:'center', marginBottom:16 }}>
          <ShieldCheck size={28} color="#2563EB"/>
        </div>
        <div style={{ fontWeight:800, fontSize:18, color:'var(--text)', marginBottom:8 }}>Coming Soon</div>
        <div style={{ fontSize:13, color:'var(--text-muted)', lineHeight:1.7, maxWidth:360 }}>
          Compliance tracking, insurance policy management, and ILOE fines are being set up.<br/>Check back soon.
        </div>
      </div>
    </div>
  )
}