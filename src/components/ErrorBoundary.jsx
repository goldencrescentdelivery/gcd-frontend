'use client'
import { Component } from 'react'
import { AlertCircle } from 'lucide-react'

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, info) {
    console.error('ErrorBoundary caught:', error, info)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', minHeight:300, gap:16, padding:40 }}>
          <AlertCircle size={40} color="#C0392B" style={{ opacity:0.7 }}/>
          <div style={{ textAlign:'center' }}>
            <div style={{ fontWeight:700, fontSize:16, color:'#1A1612', marginBottom:6 }}>Something went wrong</div>
            <div style={{ fontSize:13, color:'#A89880', marginBottom:20, maxWidth:360 }}>
              {this.state.error?.message || 'An unexpected error occurred in this section.'}
            </div>
            <button
              onClick={() => this.setState({ hasError: false, error: null })}
              style={{ padding:'9px 20px', borderRadius:10, background:'#B8860B', color:'#FFF', border:'none', cursor:'pointer', fontWeight:600, fontSize:13, fontFamily:'Poppins,sans-serif' }}>
              Try again
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
