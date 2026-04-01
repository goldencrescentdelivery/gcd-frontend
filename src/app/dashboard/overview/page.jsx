'use client'
import { LayoutDashboard } from 'lucide-react'

export default function OverviewPage() {
  return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', minHeight:'60vh', textAlign:'center', padding:'60px 24px' }}>
      <div style={{ width:72, height:72, borderRadius:22, background:'linear-gradient(135deg,#FDF6E3,#FEF3D0)', border:'1px solid #F0D78C', display:'flex', alignItems:'center', justifyContent:'center', marginBottom:20 }}>
        <LayoutDashboard size={32} color="#B8860B"/>
      </div>
      <div style={{ fontWeight:800, fontSize:22, color:'#1A1612', marginBottom:10 }}>Coming Soon</div>
      <div style={{ fontSize:14, color:'#A89880', lineHeight:1.7, maxWidth:340 }}>
        The Overview dashboard is being built.<br/>Check back soon.
      </div>
    </div>
  )
}