import '@/styles/globals.css'
import { AuthProvider } from '@/lib/auth'
import { Poppins } from 'next/font/google'

const poppins = Poppins({
  weight: ['300', '400', '500', '600', '700', '800'],
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-sans',
})

export const metadata = {
  title: { default: 'GCD Dashboard', template: '%s | GCD' },
  description: 'Golden Crescent Delivery — Internal Operations Dashboard',
  icons: {
    icon: '/logo.webp',
    apple: '/logo.webp',
  },
}

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
}

export default function RootLayout({ children }) {
  return (
    <html lang="en" dir="ltr" className={poppins.variable}>
      <head />
      <body>
        <script dangerouslySetInnerHTML={{ __html: `(function(){try{var t=localStorage.getItem('gcd_theme');if(t==='dark')document.documentElement.setAttribute('data-theme','dark')}catch(e){}})()` }} />
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  )
}
