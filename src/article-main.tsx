import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './fonts'
import './index.css'
import { ArticlePage } from './ArticlePage'
import { ThemeProvider } from '@/lib/theme'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <ArticlePage />
    </ThemeProvider>
  </StrictMode>,
)
