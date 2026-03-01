import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { BrowserRouter } from 'react-router-dom'
import { Toaster } from "@/components/ui/sonner"
import { ScrollToTop } from './components/ScrollToTop.tsx'


createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <Toaster position='top-center' richColors/>
      <App />
       <ScrollToTop />
    </BrowserRouter>
  </StrictMode>,
)
